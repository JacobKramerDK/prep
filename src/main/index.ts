import { app, BrowserWindow, ipcMain, dialog, shell, session } from 'electron'
import path from 'path'
import os from 'os'
import * as fs from 'fs/promises'

// Load environment variables in development and production
// This allows users to create a .env file to override bundled credentials
try {
  require('dotenv').config()
} catch (error) {
  // dotenv not available or .env file doesn't exist - use bundled credentials
}

import { VaultManager } from './services/vault-manager'
import { CalendarManager } from './services/calendar-manager'
import { CalendarSyncScheduler } from './services/calendar-sync-scheduler'
import { SettingsManager } from './services/settings-manager'
import { MeetingDetector } from './services/meeting-detector'
import { OpenAIService } from './services/openai-service'
import { ContextRetrievalService } from './services/context-retrieval-service'
import { AudioRecordingService } from './services/audio-recording-service'
import { TranscriptionService } from './services/transcription-service'
import { PlatformDetector } from './services/platform-detector'
import { Debug } from '../shared/utils/debug'
import { CalendarSelectionSettings } from '../shared/types/calendar-selection'
import { BriefGenerationRequest, BriefGenerationStatus } from '../shared/types/brief'
import { contextRetrievalResultToIPC } from '../shared/types/context'
import { calendarSyncStatusToIPC, calendarSyncResultToIPC } from '../shared/types/calendar-sync'
import { appleCalendarStatusToIPC } from '../shared/types/apple-calendar'
import { RelevanceWeights } from '../shared/types/relevance-weights'
import { VaultIndexingStatus } from '../shared/types/vault-status'
import { NotificationService } from './services/notification-service'

const isDevelopment = process.env.NODE_ENV === 'development'
const platformDetector = new PlatformDetector()
const vaultManager = new VaultManager()
const notificationService = new NotificationService()
const calendarManager = new CalendarManager(notificationService)
const calendarSyncScheduler = new CalendarSyncScheduler(calendarManager)
const meetingDetector = new MeetingDetector(calendarManager)
const settingsManager = new SettingsManager()
const contextRetrievalService = new ContextRetrievalService()
const audioRecordingService = new AudioRecordingService()
let openaiService: OpenAIService | null = null
let transcriptionService: TranscriptionService | null = null
let mainWindow: BrowserWindow | null = null

// Add global indexing status tracking
let currentIndexingStatus: VaultIndexingStatus = { isIndexing: false }

// Initialize debug mode from settings
const debugMode = settingsManager.getDebugMode()
if (debugMode) {
  settingsManager.setDebugMode(true) // This will initialize file logging
}

// Connect the context retrieval service to use the vault manager's indexer
const connectServices = () => {
  const vaultIndexer = vaultManager.getVaultIndexer()
  contextRetrievalService.setVaultIndexer(vaultIndexer)
}

// Initialize OpenAI service with stored API key or environment variable
const initializeOpenAIService = async (): Promise<void> => {
  try {
    let apiKey = await settingsManager.getOpenAIApiKey()
    
    // Fallback to environment variable if no stored key
    if (!apiKey && process.env.OPENAI_API_KEY) {
      apiKey = process.env.OPENAI_API_KEY
      console.log('Using OpenAI API key from environment variable')
    }
    
    if (apiKey) {
      openaiService = new OpenAIService(apiKey)
      // Initialize transcription service when OpenAI service is available
      transcriptionService = new TranscriptionService(audioRecordingService, openaiService)
      await transcriptionService.initialize() // Initialize async components
      
      // Set up chunk progress event listener
      transcriptionService.on('chunkProgress', (progress) => {
        if (mainWindow) {
          mainWindow.webContents.send('transcription:chunkProgress', progress)
        }
      })
    }
  } catch (error) {
    console.error('Failed to initialize OpenAI service:', error instanceof Error ? error.message : 'Unknown error')
    // Continue without OpenAI service - user can configure it later in settings
    openaiService = null
    transcriptionService = null
  }
}

// Initialize services and connect them
const initializeServices = async (): Promise<void> => {
  connectServices()
  await initializeOpenAIService()
  setupDisplayMediaHandler()
  await loadExistingVault()
}

// Setup display media handler for system audio capture
const setupDisplayMediaHandler = (): void => {
  session.defaultSession.setDisplayMediaRequestHandler((request, callback) => {
    Debug.log('Display media request received:', request)
    // Grant access to system audio (loopback)
    callback({ 
      audio: 'loopback'
    })
  })
}

// Load and index existing vault if one was previously configured
const loadExistingVault = async (): Promise<void> => {
  try {
    currentIndexingStatus = { isIndexing: true }
    const vaultPath = await settingsManager.getVaultPath()
    if (vaultPath) {
      console.log(`Loading existing vault: ${vaultPath}`)
      
      // Validate vault path still exists
      try {
        const stats = await fs.stat(vaultPath)
        if (!stats.isDirectory()) {
          console.warn(`Stored vault path is not a directory: ${vaultPath}`)
          await settingsManager.setVaultPath(null) // Clear invalid path
          currentIndexingStatus = { isIndexing: false }
          return
        }
      } catch (error) {
        console.warn(`Stored vault path no longer exists: ${vaultPath}`)
        await settingsManager.setVaultPath(null) // Clear invalid path
        currentIndexingStatus = { isIndexing: false }
        return
      }
      
      await vaultManager.scanVault(vaultPath)
      console.log(`Vault loaded and indexed successfully`)
    }
    currentIndexingStatus = { isIndexing: false }
  } catch (error) {
    console.warn('Failed to load existing vault on startup:', error instanceof Error ? error.message : 'Unknown error')
    currentIndexingStatus = { isIndexing: false }
    // Don't fail app startup if vault loading fails - user can reconfigure
  }
}

const createWindow = (): void => {
  // Use PNG for better cross-platform compatibility
  const iconPath = path.join(process.cwd(), 'build', 'icon.png')

  if (settingsManager.getDebugMode()) {
    console.log('Icon path:', iconPath)
    console.log('Icon exists:', require('fs').existsSync(iconPath))
  }

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    icon: iconPath,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    show: true // Show immediately
  })

  // Set the main window in the notification service
  notificationService.setMainWindow(mainWindow)
  
  // Set up callback to invalidate meeting cache when calendar events are updated
  notificationService.setCalendarEventsUpdatedCallback((data) => {
    meetingDetector.invalidateCache()
    Debug.log(`[MAIN] Meeting detector cache invalidated after calendar events updated: ${data.eventCount} events from ${data.source}`)
  })

  // Try to set dock icon on macOS with error handling
  if (process.platform === 'darwin' && require('fs').existsSync(iconPath)) {
    try {
      app.dock?.setIcon(iconPath)
    } catch (error) {
      if (settingsManager.getDebugMode()) {
        console.log('Could not set dock icon:', error instanceof Error ? error.message : error)
      }
    }
  }

  // Load the app
  if (isDevelopment) {
    mainWindow.loadURL('http://localhost:5173')
    // Only open DevTools if explicitly requested
    if (process.env.OPEN_DEVTOOLS === 'true') {
      mainWindow.webContents.openDevTools()
    }
  } else {
    // Load production build - go up from dist/main/src/main to dist/renderer
    const rendererPath = path.join(__dirname, '..', '..', '..', 'renderer', 'index.html')
    mainWindow.loadFile(rendererPath)
  }

  // Handle window closed
  mainWindow.on('closed', () => {
    // Dereference the window object
    mainWindow = null
    // Clear the notification service reference
    notificationService.setMainWindow(null as any)
  })
}

// This method will be called when Electron has finished initialization
app.whenReady().then(async () => {
  try {
    // Initialize services first, then create window
    await initializeServices()
    createWindow()
  } catch (error) {
    console.error('App initialization failed:', error instanceof Error ? error.message : 'Unknown error')
    // Still create window even if initialization fails - user can reconfigure
    createWindow()
  }

  app.on('activate', () => {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

// Quit when all windows are closed, except on macOS
app.on('window-all-closed', () => {
  if (!platformDetector.isMacOS()) {
    app.quit()
  }
})

// Security: Prevent new window creation
app.on('web-contents-created', (_, contents) => {
  contents.setWindowOpenHandler(() => {
    return { action: 'deny' }
  })
})

// Basic IPC handler for testing
ipcMain.handle('app:getVersion', () => {
  return app.getVersion()
})

// Platform detection IPC handler
ipcMain.handle('platform:getPlatformInfo', () => {
  return platformDetector.getPlatformInfo()
})

// Context and vault status IPC handlers (needed early for app initialization)
ipcMain.handle('context:isIndexed', async () => {
  return contextRetrievalService.isIndexed()
})

ipcMain.handle('context:getIndexedFileCount', async () => {
  return contextRetrievalService.getIndexedFileCount()
})

ipcMain.handle('vault:getPath', async () => {
  return await settingsManager.getVaultPath()
})

ipcMain.handle('vault:getIndexingStatus', async () => {
  return currentIndexingStatus
})

// Vault IPC handlers
ipcMain.handle('vault:select', async () => {
  // Start in typical Obsidian vault locations
  const defaultPath = process.platform === 'darwin' 
    ? path.join(os.homedir(), 'Documents')
    : os.homedir()
    
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory'],
    title: 'Select Obsidian Vault Directory',
    defaultPath
  })
  
  if (result.canceled || result.filePaths.length === 0) {
    throw new Error('No directory selected')
  }
  
  return result.filePaths[0]
})

ipcMain.handle('vault:scan', async (_, vaultPath: string) => {
  if (!vaultPath || typeof vaultPath !== 'string') {
    throw new Error('Invalid vault path')
  }
  
  return await vaultManager.scanVault(vaultPath)
})

ipcMain.handle('vault:search', async (_, query: string) => {
  if (!query || typeof query !== 'string') {
    throw new Error('Invalid search query')
  }
  
  return await vaultManager.searchFiles(query)
})

ipcMain.handle('vault:readFile', async (_, filePath: string) => {
  if (!filePath || typeof filePath !== 'string') {
    throw new Error('Invalid file path')
  }
  
  return await vaultManager.readFile(filePath)
})

ipcMain.handle('vault:refresh', async () => {
  const vaultPath = await settingsManager.getVaultPath()
  if (!vaultPath) {
    throw new Error('No vault configured')
  }
  
  return await vaultManager.scanVault(vaultPath)
})

ipcMain.handle('vault:disconnect', async () => {
  return await vaultManager.disconnectVault()
})

// Calendar IPC handlers
ipcMain.handle('calendar:extractEvents', async (_, selectedCalendarNames?: string[]) => {
  return await calendarManager.extractAppleScriptEvents(selectedCalendarNames)
})

ipcMain.handle('calendar:parseICS', async (_, filePath: string) => {
  if (!filePath || typeof filePath !== 'string') {
    throw new Error('Invalid file path')
  }
  return await calendarManager.parseICSFile(filePath)
})

ipcMain.handle('calendar:getEvents', async () => {
  return await calendarManager.getEvents()
})

ipcMain.handle('calendar:clearEvents', async () => {
  return await calendarManager.clearEvents()
})

ipcMain.handle('calendar:invalidateCache', async () => {
  return await calendarManager.invalidateCache()
})

ipcMain.handle('calendar:isAppleScriptSupported', async () => {
  return calendarManager.isAppleScriptSupported()
})

ipcMain.handle('calendar:selectICSFile', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile'],
    title: 'Select ICS Calendar File',
    filters: [
      { name: 'Calendar Files', extensions: ['ics'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  })
  
  if (result.canceled || result.filePaths.length === 0) {
    throw new Error('No file selected')
  }
  
  return result.filePaths[0]
})

ipcMain.handle('calendar:discoverCalendars', async () => {
  return await calendarManager.discoverCalendars()
})

ipcMain.handle('calendar:getSelectedCalendars', async () => {
  return await settingsManager.getCalendarSelection()
})

ipcMain.handle('calendar:updateSelectedCalendars', async (_, settings: Partial<CalendarSelectionSettings>) => {
  return await settingsManager.updateCalendarSelection(settings)
})

// Apple Calendar IPC handlers
ipcMain.handle('calendar:getAppleCalendarStatus', async () => {
  const status = await calendarManager.getAppleCalendarStatus()
  return appleCalendarStatusToIPC(status)
})

ipcMain.handle('calendar:getAppleCalendarPermissionState', async () => {
  return await calendarManager.getAppleCalendarPermissionState()
})

ipcMain.handle('calendar:isAppleCalendarAvailable', async () => {
  return calendarManager.isAppleCalendarAvailable()
})

ipcMain.handle('calendar:updateAppleCalendarSelection', async (_, selectedCalendarNames: string[]) => {
  return await calendarManager.updateAppleCalendarSelection(selectedCalendarNames)
})

ipcMain.handle('calendar:extractAppleCalendarEvents', async () => {
  return await calendarManager.extractAppleCalendarEvents()
})

// Calendar sync scheduler IPC handlers
ipcMain.handle('calendar:getSyncStatus', async () => {
  return calendarSyncStatusToIPC(await calendarSyncScheduler.getStatus())
})

ipcMain.handle('calendar:performManualSync', async () => {
  return calendarSyncResultToIPC(await calendarSyncScheduler.performManualSync())
})

ipcMain.handle('calendar:startDailySync', async () => {
  return await calendarSyncScheduler.startDailySync()
})

ipcMain.handle('calendar:stopDailySync', async () => {
  return await calendarSyncScheduler.stopDailySync()
})

// Google Calendar IPC handlers
ipcMain.handle('calendar:authenticateGoogle', async () => {
  const authUrl = await calendarManager.authenticateGoogleCalendar()
  
  // Open the auth URL in the system browser
  const { shell } = require('electron')
  await shell.openExternal(authUrl)
  
  return authUrl
})

ipcMain.handle('calendar:getGoogleEvents', async () => {
  const result = await calendarManager.getGoogleCalendarEvents()
  // Only invalidate cache if we actually got new events
  if (result.events.length > 0) {
    meetingDetector.invalidateCache()
    Debug.log('[MAIN] Meeting detector cache invalidated after Google Calendar sync with new events')
  }
  return result
})

ipcMain.handle('calendar:isGoogleConnected', async () => {
  return await calendarManager.isGoogleCalendarConnected()
})

ipcMain.handle('calendar:disconnectGoogle', async () => {
  return await calendarManager.disconnectGoogleCalendar()
})

ipcMain.handle('calendar:getGoogleUserInfo', async () => {
  return await calendarManager.getGoogleCalendarUserInfo()
})

// Multi-account Google Calendar IPC handlers
ipcMain.handle('calendar:getConnectedGoogleAccounts', async () => {
  return await calendarManager.getConnectedGoogleAccounts()
})

ipcMain.handle('calendar:disconnectGoogleAccount', async (_, accountEmail: string) => {
  const result = await calendarManager.disconnectGoogleAccount(accountEmail)
  
  // Invalidate meeting cache if account was successfully disconnected
  if (result.success) {
    meetingDetector.invalidateCache()
    Debug.log(`[MAIN] Meeting detector cache invalidated after disconnecting account ${accountEmail}`)
  }
  
  return result
})

ipcMain.handle('calendar:getMultiAccountGoogleCalendarState', async () => {
  return await calendarManager.getMultiAccountGoogleCalendarState()
})

// Google credential management IPC handlers
ipcMain.handle('settings:getGoogleClientId', async () => {
  try {
    return await settingsManager.getGoogleClientId()
  } catch (error) {
    console.error('Failed to get Google Client ID:', error)
    return null
  }
})

ipcMain.handle('settings:setGoogleClientId', async (_, clientId: string | null) => {
  try {
    await settingsManager.setGoogleClientId(clientId)
    // Update OAuth manager with new credentials if both are available
    const clientSecret = await settingsManager.getGoogleClientSecret()
    if (clientId && clientSecret) {
      await calendarManager.updateGoogleCredentials(clientId, clientSecret)
    }
  } catch (error) {
    console.error('Failed to set Google Client ID:', error)
    throw error
  }
})

ipcMain.handle('settings:getGoogleClientSecret', async () => {
  try {
    return await settingsManager.getGoogleClientSecret()
  } catch (error) {
    console.error('Failed to get Google Client Secret:', error)
    return null
  }
})

ipcMain.handle('settings:setGoogleClientSecret', async (_, clientSecret: string | null) => {
  try {
    await settingsManager.setGoogleClientSecret(clientSecret)
    // Update OAuth manager with new credentials if both are available
    const clientId = await settingsManager.getGoogleClientId()
    if (clientId && clientSecret) {
      await calendarManager.updateGoogleCredentials(clientId, clientSecret)
    }
  } catch (error) {
    console.error('Failed to set Google Client Secret:', error)
    throw error
  }
})

ipcMain.handle('settings:validateGoogleCredentials', async (_, clientId: string, clientSecret: string) => {
  try {
    const isValidId = settingsManager.validateGoogleClientIdFormat(clientId)
    const isValidSecret = settingsManager.validateGoogleClientSecretFormat(clientSecret)
    return isValidId && isValidSecret
  } catch (error) {
    console.error('Failed to validate Google credentials:', error)
    return false
  }
})

// Calendar sync IPC handlers
ipcMain.handle('calendar:startAutoSync', async () => {
  await calendarSyncScheduler.startDailySync()
  return true
})

ipcMain.handle('calendar:getAutoSyncStatus', async () => {
  const status = await calendarSyncScheduler.getStatus()
  return calendarSyncStatusToIPC(status)
})

// Meeting IPC handlers
ipcMain.handle('meeting:getTodaysMeetings', async () => {
  return await meetingDetector.getTodaysMeetings()
})

ipcMain.handle('meeting:hasTodaysMeetings', async () => {
  return await meetingDetector.hasTodaysMeetings()
})

ipcMain.handle('meeting:invalidateCache', async () => {
  return meetingDetector.invalidateCache()
})

// Brief generation IPC handlers
ipcMain.handle('brief:generate', async (_, request: BriefGenerationRequest) => {
  try {
    if (!openaiService || !openaiService.isConfigured()) {
      return {
        success: false,
        error: 'OpenAI API key not configured. Please set your API key in settings to generate meeting briefs.'
      }
    }

    // Get the meeting details
    const todaysMeetings = await meetingDetector.getTodaysMeetings()
    const meeting = todaysMeetings.meetings.find(m => m.id === request.meetingId)
    
    if (!meeting) {
      return {
        success: false,
        error: 'Meeting not found. Please refresh the meeting list and try again.'
      }
    }

    // Enhance request with context if enabled and available
    let enhancedRequest = { ...request }
    
    if (request.includeContext !== false && contextRetrievalService.isIndexed()) {
      try {
        const contextResult = await contextRetrievalService.findRelevantContext(meeting)
        if (contextResult.matches.length > 0) {
          enhancedRequest = {
            ...request,
            includeContext: true,
            contextMatches: contextResult.matches
          }
        }
      } catch (contextError) {
        console.warn('Context retrieval failed, proceeding without context:', contextError)
        // Continue with brief generation without context
      }
    }

    // Get the selected model
    const selectedModel = await settingsManager.getOpenAIModel()
    console.log('Generating brief with model:', selectedModel)
    
    const brief = await openaiService.generateMeetingBrief(enhancedRequest, meeting, selectedModel)
    
    return {
      success: true,
      brief
    }
  } catch (error) {
    console.error('Brief generation error:', error)
    
    // Provide user-friendly error messages
    let errorMessage = 'Unknown error occurred while generating meeting brief.'
    
    if (error instanceof Error) {
      errorMessage = error.message
      
      // Add helpful context for common issues
      if (errorMessage.includes('API key')) {
        errorMessage += ' You can update your API key in the settings.'
      } else if (errorMessage.includes('quota') || errorMessage.includes('billing')) {
        errorMessage += ' Please check your OpenAI account billing and usage.'
      } else if (errorMessage.includes('rate limit')) {
        errorMessage += ' Please wait a moment before trying again.'
      } else if (errorMessage.includes('model')) {
        errorMessage += ' You can change the model in settings.'
      }
    }
    
    return {
      success: false,
      error: errorMessage
    }
  }
})

ipcMain.handle('brief:getStatus', async (_, meetingId: string) => {
  // For now, return idle status - could be enhanced with actual status tracking
  return BriefGenerationStatus.IDLE
})

// Settings IPC handlers for OpenAI API key
ipcMain.handle('settings:getOpenAIApiKey', async () => {
  return await settingsManager.getOpenAIApiKey()
})

ipcMain.handle('settings:setOpenAIApiKey', async (_, apiKey: string | null) => {
  await settingsManager.setOpenAIApiKey(apiKey)
  
  // Reinitialize OpenAI service with new key
  if (apiKey) {
    openaiService = new OpenAIService(apiKey)
    transcriptionService = new TranscriptionService(audioRecordingService, openaiService)
    
    // Set up chunk progress event listener
    transcriptionService.on('chunkProgress', (progress) => {
      if (mainWindow) {
        mainWindow.webContents.send('transcription:chunkProgress', progress)
      }
    })
  } else {
    openaiService = null
    transcriptionService = null
  }
})

ipcMain.handle('settings:validateOpenAIApiKey', async (_, apiKey: string) => {
  if (!settingsManager.validateApiKeyFormat(apiKey)) {
    return false
  }
  
  const testService = new OpenAIService(apiKey)
  return await testService.validateApiKey(apiKey)
})

ipcMain.handle('settings:getOpenAIModel', async () => {
  return await settingsManager.getOpenAIModel()
})

ipcMain.handle('settings:setOpenAIModel', async (_, model: string) => {
  return await settingsManager.setOpenAIModel(model)
})

ipcMain.handle('settings:getAvailableModels', async (_, apiKey: string) => {
  const testService = new OpenAIService(apiKey)
  return await testService.getAvailableModels(apiKey)
})

// Relevance weights IPC handlers
ipcMain.handle('settings:getRelevanceWeights', async () => {
  return await settingsManager.getRelevanceWeights()
})

ipcMain.handle('settings:setRelevanceWeights', async (_, weights: RelevanceWeights) => {
  await settingsManager.setRelevanceWeights(weights)
})

// Debug mode IPC handlers
ipcMain.handle('settings:getDebugMode', async () => {
  return settingsManager.getDebugMode()
})

ipcMain.handle('settings:setDebugMode', async (_, enabled: boolean) => {
  settingsManager.setDebugMode(enabled)
})

ipcMain.handle('settings:getDebugLogPath', async () => {
  return settingsManager.getDebugLogPath()
})

ipcMain.handle('settings:openDebugLogFolder', async () => {
  const logPath = settingsManager.getDebugLogPath()
  const logDir = path.dirname(logPath)
  shell.openPath(logDir)
})

ipcMain.handle('get-prompt-template', async () => {
  try {
    return settingsManager.getPromptTemplate()
  } catch (error) {
    console.error('Failed to get prompt template:', error)
    throw error
  }
})

ipcMain.handle('set-prompt-template', async (_, template: string) => {
  try {
    settingsManager.setPromptTemplate(template)
    return { success: true }
  } catch (error) {
    console.error('Failed to set prompt template:', error)
    throw error
  }
})

ipcMain.handle('clear-prompt-template', async () => {
  try {
    settingsManager.clearPromptTemplate()
    return { success: true }
  } catch (error) {
    console.error('Failed to clear prompt template:', error)
    throw error
  }
})

// Context retrieval IPC handlers
ipcMain.handle('context:findRelevant', async (_, meetingId: string) => {
  try {
    // Get the meeting from the meeting detector
    const todaysMeetings = await meetingDetector.getTodaysMeetings()
    const meeting = todaysMeetings.meetings.find(m => m.id === meetingId)
    
    if (!meeting) {
      throw new Error('Meeting not found')
    }
    
    const result = await contextRetrievalService.findRelevantContext(meeting)
    return contextRetrievalResultToIPC(result)
  } catch (error) {
    console.error('Context retrieval failed:', error)
    throw new Error(`Context retrieval failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
})

// Enhanced context retrieval with user input
ipcMain.handle('context:findRelevantEnhanced', async (_, meetingId: string, additionalContext?: {
  meetingPurpose?: string
  keyTopics?: string[]
  additionalNotes?: string
}) => {
  try {
    const todaysMeetings = await meetingDetector.getTodaysMeetings()
    const meeting = todaysMeetings.meetings.find(m => m.id === meetingId)
    
    if (!meeting) {
      throw new Error('Meeting not found')
    }
    
    // Create enhanced meeting object with user input
    const enhancedMeeting = {
      ...meeting,
      description: [
        meeting.description,
        additionalContext?.meetingPurpose,
        additionalContext?.keyTopics?.join(' '),
        additionalContext?.additionalNotes
      ].filter(Boolean).join(' ')
    }
    
    const result = await contextRetrievalService.findRelevantContext(enhancedMeeting)
    return contextRetrievalResultToIPC(result)
  } catch (error) {
    console.error('Enhanced context retrieval failed:', error)
    throw new Error(`Enhanced context retrieval failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
})

// Obsidian brief saving IPC handlers
ipcMain.handle('obsidian:selectBriefFolder', async () => {
  // Start in current vault directory if available, otherwise Documents
  const currentVaultPath = await settingsManager.getVaultPath()
  const defaultPath = currentVaultPath || (process.platform === 'darwin' 
    ? path.join(os.homedir(), 'Documents')
    : os.homedir())
    
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory'],
    title: 'Select Obsidian Brief Folder',
    defaultPath
  })
  
  if (result.canceled || result.filePaths.length === 0) {
    return null
  }
  
  return result.filePaths[0]
})

ipcMain.handle('obsidian:getBriefFolder', async () => {
  return settingsManager.getObsidianBriefFolder()
})

ipcMain.handle('obsidian:setBriefFolder', async (_, folderPath: string | null) => {
  return settingsManager.setObsidianBriefFolder(folderPath)
})

ipcMain.handle('obsidian:saveBrief', async (_, briefContent: string, meetingTitle: string, meetingId: string) => {
  try {
    Debug.log('[OBSIDIAN-SAVE] Starting brief save to Obsidian folder')
    const briefFolder = settingsManager.getObsidianBriefFolder()
    if (!briefFolder) {
      throw new Error('No Obsidian brief folder configured')
    }

    Debug.log('[OBSIDIAN-SAVE] Using brief folder:', briefFolder)

    // Validate path safety using robust validation
    if (!ObsidianBriefUtils.validateSafePath(briefFolder)) {
      throw new Error('Invalid folder path: unsafe path detected')
    }

    const normalizedFolder = path.resolve(briefFolder)

    // Generate filename with date and sanitized title
    const dateStr = new Date().toISOString().split('T')[0]
    const sanitizedTitle = sanitizeFileName(meetingTitle || 'Untitled Meeting', platformDetector.isWindows())
    let fileName = `${dateStr} - Meeting Brief - ${sanitizedTitle}.md`
    
    // Handle filename conflicts by appending counter
    let filePath = path.join(normalizedFolder, fileName)
    let counter = 2
    while (await fileExists(filePath)) {
      const baseName = `${dateStr} - Meeting Brief - ${sanitizedTitle} (${counter})`
      fileName = `${baseName}.md`
      filePath = path.join(normalizedFolder, fileName)
      counter++
    }

    Debug.log('[OBSIDIAN-SAVE] Generated file path:', filePath)

    // Create Obsidian-compatible markdown content with frontmatter
    const frontmatter = [
      '---',
      `title: "${escapeYamlString(meetingTitle || 'Untitled Meeting')}"`,
      `date: ${new Date().toISOString()}`,
      `meeting-id: ${escapeYamlString(meetingId)}`,
      `type: meeting-brief`,
      `generated-by: prep-app`,
      '---',
      ''
    ].join('\n')

    const fullContent = frontmatter + briefContent

    // Ensure directory exists and write file
    await fs.mkdir(normalizedFolder, { recursive: true })
    await fs.writeFile(filePath, fullContent, 'utf8')

    Debug.log('[OBSIDIAN-SAVE] Successfully saved brief to:', filePath)
    return { success: true, filePath }
  } catch (error) {
    Debug.error('[OBSIDIAN-SAVE] Failed to save brief:', error instanceof Error ? error.message : 'Unknown error')
    console.error('Failed to save brief to Obsidian:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
})

// Helper functions for file operations
namespace ObsidianBriefUtils {
  /** Maximum filename length for cross-platform compatibility */
  const MAX_FILENAME_LENGTH = 200

  /**
   * Validates that a folder path is safe and doesn't contain path traversal attempts
   * @param folderPath The folder path to validate
   * @returns true if path is safe, false otherwise
   */
  export function validateSafePath(folderPath: string): boolean {
    try {
      // Normalize and resolve the path
      const normalizedPath = path.resolve(folderPath)
      
      // Check for common path traversal patterns in the original path
      const dangerousPatterns = [
        /\.\.[\/\\]/,     // Parent directory references with separators
        /[\/\\]\.\.[\/\\]/, // Parent directory references in middle of path
        /[\/\\]\.\.$/,    // Parent directory references at end
        /^\.\.[\/\\]/,    // Parent directory references at start
        /^\.\.$/,         // Standalone parent directory
        /\0/,             // Null bytes
      ]
      
      // Check original path for dangerous patterns
      if (dangerousPatterns.some(pattern => pattern.test(folderPath))) {
        return false
      }
      
      // Additional Windows-specific checks
      if (process.platform === 'win32') {
        const windowsForbidden = /[<>:"|?*]/
        const windowsReserved = /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i
        
        if (windowsForbidden.test(folderPath) || windowsReserved.test(path.basename(folderPath))) {
          return false
        }
      }
      
      // Ensure the resolved path doesn't try to access system-critical directories
      const criticalPaths = [
        '/etc',        // System config (Unix)
        '/bin',        // System binaries (Unix)
        '/sbin',       // System admin binaries (Unix)
        '/boot',       // Boot files (Unix)
        'C:\\Windows', // Windows system (if on Windows)
        'C:\\System32', // Windows system32 (if on Windows)
      ]
      
      // Only block if trying to access critical system paths
      const isCriticalPath = criticalPaths.some(criticalPath => {
        const resolvedCritical = path.resolve(criticalPath)
        return normalizedPath.startsWith(resolvedCritical)
      })
      
      if (isCriticalPath) {
        return false
      }
      
      return true
    } catch (error) {
      // If path resolution fails, consider it unsafe
      return false
    }
  }

  /**
   * Sanitizes a filename for cross-platform compatibility
   * @param name The original filename
   * @param isWindows Whether running on Windows (more restrictive rules)
   * @returns Sanitized filename safe for filesystem
   */
  export function sanitizeFileName(name: string, isWindows: boolean): string {
    if (isWindows) {
      // Windows has more restrictive filename rules
      return name.replace(/[<>:"/\\|?*]/g, '_').trim().substring(0, MAX_FILENAME_LENGTH)
    }
    // macOS/Linux - less restrictive but still safe
    return name.replace(/[/\\:]/g, '_').trim().substring(0, MAX_FILENAME_LENGTH)
  }

  /**
   * Checks if a file exists at the given path
   * @param filePath Path to check
   * @returns Promise resolving to true if file exists
   */
  export async function fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath)
      return true
    } catch {
      return false
    }
  }

  /**
   * Escapes special characters in strings for YAML frontmatter
   * @param str String to escape
   * @returns YAML-safe string
   */
  export function escapeYamlString(str: string): string {
    return str.replace(/"/g, '\\"').replace(/\\/g, '\\\\')
  }
}

// Use the utility functions
const { sanitizeFileName, fileExists, escapeYamlString } = ObsidianBriefUtils

// Transcription IPC handlers
ipcMain.handle('transcription:startRecording', async () => {
  try {
    if (!transcriptionService) {
      throw new Error('Transcription service not available. Please configure OpenAI API key.')
    }
    await transcriptionService.startRecording()
    Debug.log('Recording started via IPC')
  } catch (error) {
    Debug.error('Failed to start recording:', error)
    throw error
  }
})

ipcMain.handle('transcription:sendAudioData', async (_, audioData: ArrayBuffer) => {
  try {
    if (audioRecordingService) {
      audioRecordingService.addAudioData(audioData)
    }
  } catch (error) {
    Debug.error('Failed to add audio data:', error)
    throw error
  }
})

ipcMain.handle('transcription:stopAndTranscribe', async (_, model?: string) => {
  try {
    if (!transcriptionService) {
      throw new Error('Transcription service not available. Please configure OpenAI API key.')
    }
    const result = await transcriptionService.stopRecordingAndTranscribe(model)
    Debug.log('Recording stopped and transcribed via IPC:', result.id)
    return result
  } catch (error) {
    Debug.error('Failed to stop recording and transcribe:', error)
    throw error
  }
})

ipcMain.handle('transcription:getStatus', async () => {
  try {
    if (!transcriptionService) {
      return { isRecording: false }
    }
    return transcriptionService.getRecordingStatus()
  } catch (error) {
    Debug.error('Failed to get recording status:', error)
    throw error
  }
})

ipcMain.handle('transcription:transcribeFile', async (_, filePath: string, model?: string) => {
  try {
    if (!transcriptionService) {
      throw new Error('Transcription service not available. Please configure OpenAI API key.')
    }
    return await transcriptionService.transcribeFile(filePath, model)
  } catch (error) {
    Debug.error('Failed to transcribe file:', error)
    throw error
  }
})

// Transcription settings IPC handlers
ipcMain.handle('transcription:getModel', async () => {
  return settingsManager.getTranscriptionModel()
})

ipcMain.handle('transcription:setModel', async (_, model: string) => {
  return settingsManager.setTranscriptionModel(model)
})

ipcMain.handle('transcription:getFolder', async () => {
  return settingsManager.getTranscriptFolder()
})

ipcMain.handle('transcription:setFolder', async (_, folderPath: string | null) => {
  return settingsManager.setTranscriptFolder(folderPath)
})

// Recording file cleanup settings
ipcMain.handle('transcription:getCleanupRecordingFiles', async () => {
  return settingsManager.getCleanupRecordingFiles()
})

ipcMain.handle('transcription:setCleanupRecordingFiles', async (_, enabled: boolean) => {
  return settingsManager.setCleanupRecordingFiles(enabled)
})

ipcMain.handle('transcription:selectFolder', async () => {
  const currentVaultPath = await settingsManager.getVaultPath()
  const defaultPath = currentVaultPath || (process.platform === 'darwin' 
    ? path.join(os.homedir(), 'Documents')
    : os.homedir())
    
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory'],
    title: 'Select Transcript Folder',
    defaultPath
  })
  
  if (result.canceled || result.filePaths.length === 0) {
    return null
  }
  
  return result.filePaths[0]
})

ipcMain.handle('transcription:saveToObsidian', async (_, transcriptContent: string, meetingTitle: string, transcriptionId: string) => {
  try {
    Debug.log('[TRANSCRIPT-SAVE] Starting transcript save to Obsidian folder')
    const transcriptFolder = settingsManager.getTranscriptFolder()
    if (!transcriptFolder) {
      throw new Error('No transcript folder configured')
    }

    Debug.log('[TRANSCRIPT-SAVE] Using transcript folder:', transcriptFolder)

    // Validate path safety using robust validation
    if (!ObsidianBriefUtils.validateSafePath(transcriptFolder)) {
      throw new Error('Invalid folder path: unsafe path detected')
    }

    const normalizedFolder = path.resolve(transcriptFolder)

    // Generate filename with date and sanitized title
    const dateStr = new Date().toISOString().split('T')[0]
    const timeStr = new Date().toISOString().split('T')[1].split('.')[0].replace(/:/g, '-')
    const sanitizedTitle = ObsidianBriefUtils.sanitizeFileName(meetingTitle || 'Untitled Meeting', platformDetector.isWindows())
    let fileName = `${dateStr}_${timeStr} - Transcript - ${sanitizedTitle}.md`
    
    // Handle filename conflicts by appending counter
    let filePath = path.join(normalizedFolder, fileName)
    let counter = 2
    while (await ObsidianBriefUtils.fileExists(filePath)) {
      const baseName = `${dateStr}_${timeStr} - Transcript - ${sanitizedTitle} (${counter})`
      fileName = `${baseName}.md`
      filePath = path.join(normalizedFolder, fileName)
      counter++
    }

    Debug.log('[TRANSCRIPT-SAVE] Generated file path:', filePath)

    // Create Obsidian-compatible markdown content with frontmatter
    const frontmatter = [
      '---',
      `title: "${ObsidianBriefUtils.escapeYamlString(meetingTitle || 'Untitled Meeting')}"`,
      `date: ${new Date().toISOString()}`,
      `transcription-id: ${ObsidianBriefUtils.escapeYamlString(transcriptionId)}`,
      `type: meeting-transcript`,
      `generated-by: prep-app`,
      '---',
      ''
    ].join('\n')

    const fullContent = frontmatter + transcriptContent

    // Ensure directory exists and write file
    await fs.mkdir(normalizedFolder, { recursive: true })
    await fs.writeFile(filePath, fullContent, 'utf8')

    Debug.log('[TRANSCRIPT-SAVE] Successfully saved transcript to:', filePath)
    return { success: true, filePath }
  } catch (error) {
    Debug.error('[TRANSCRIPT-SAVE] Failed to save transcript:', error instanceof Error ? error.message : 'Unknown error')
    console.error('Failed to save transcript to Obsidian:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
})

// Cleanup on app exit
app.on('before-quit', async () => {
  calendarSyncScheduler.dispose()
  if (transcriptionService) {
    await transcriptionService.cleanup()
  }
})
