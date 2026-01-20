import { app, BrowserWindow, ipcMain, dialog } from 'electron'
import path from 'path'
import * as fs from 'fs/promises'
import { VaultManager } from './services/vault-manager'
import { CalendarManager } from './services/calendar-manager'
import { CalendarSyncScheduler } from './services/calendar-sync-scheduler'
import { SettingsManager } from './services/settings-manager'
import { MeetingDetector } from './services/meeting-detector'
import { OpenAIService } from './services/openai-service'
import { ContextRetrievalService } from './services/context-retrieval-service'
import { CalendarSelectionSettings } from '../shared/types/calendar-selection'
import { BriefGenerationRequest, BriefGenerationStatus } from '../shared/types/brief'
import { contextRetrievalResultToIPC } from '../shared/types/context'
import { calendarSyncStatusToIPC, calendarSyncResultToIPC } from '../shared/types/calendar-sync'

// Load environment variables
import * as dotenv from 'dotenv'
dotenv.config()

const isDevelopment = process.env.NODE_ENV === 'development'
const vaultManager = new VaultManager()
const calendarManager = new CalendarManager()
const calendarSyncScheduler = new CalendarSyncScheduler(calendarManager)
const meetingDetector = new MeetingDetector(calendarManager)
const settingsManager = new SettingsManager()
const contextRetrievalService = new ContextRetrievalService()
let openaiService: OpenAIService | null = null

// Connect the context retrieval service to use the vault manager's indexer
const connectServices = () => {
  const vaultIndexer = vaultManager.getVaultIndexer()
  contextRetrievalService.setVaultIndexer(vaultIndexer)
}

// Initialize OpenAI service with stored API key
const initializeOpenAIService = async (): Promise<void> => {
  try {
    const apiKey = await settingsManager.getOpenAIApiKey()
    if (apiKey) {
      openaiService = new OpenAIService(apiKey)
    }
  } catch (error) {
    console.error('Failed to initialize OpenAI service:', error instanceof Error ? error.message : 'Unknown error')
    // Continue without OpenAI service - user can configure it later in settings
    openaiService = null
  }
}

// Initialize services and connect them
const initializeServices = async (): Promise<void> => {
  connectServices()
  await initializeOpenAIService()
  await loadExistingVault()
}

// Load and index existing vault if one was previously configured
const loadExistingVault = async (): Promise<void> => {
  try {
    const vaultPath = await settingsManager.getVaultPath()
    if (vaultPath) {
      console.log(`Loading existing vault: ${vaultPath}`)
      
      // Validate vault path still exists
      try {
        const stats = await fs.stat(vaultPath)
        if (!stats.isDirectory()) {
          console.warn(`Stored vault path is not a directory: ${vaultPath}`)
          await settingsManager.setVaultPath(null) // Clear invalid path
          return
        }
      } catch (error) {
        console.warn(`Stored vault path no longer exists: ${vaultPath}`)
        await settingsManager.setVaultPath(null) // Clear invalid path
        return
      }
      
      await vaultManager.scanVault(vaultPath)
      console.log(`Vault loaded and indexed successfully`)
    }
  } catch (error) {
    console.warn('Failed to load existing vault on startup:', error instanceof Error ? error.message : 'Unknown error')
    // Don't fail app startup if vault loading fails - user can reconfigure
  }
}

const createWindow = (): void => {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    show: true // Show immediately
  })

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
  if (process.platform !== 'darwin') {
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

// Vault IPC handlers
ipcMain.handle('vault:select', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory'],
    title: 'Select Obsidian Vault Directory'
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
  return await calendarManager.getGoogleCalendarEvents()
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
        error: 'OpenAI API key not configured. Please set your API key in settings.'
      }
    }

    // Get the meeting details
    const todaysMeetings = await meetingDetector.getTodaysMeetings()
    const meeting = todaysMeetings.meetings.find(m => m.id === request.meetingId)
    
    if (!meeting) {
      return {
        success: false,
        error: 'Meeting not found'
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
    const brief = await openaiService.generateMeetingBrief(enhancedRequest, meeting, selectedModel)
    
    return {
      success: true,
      brief
    }
  } catch (error) {
    console.error('Brief generation error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
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
  } else {
    openaiService = null
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

// Debug mode IPC handlers
ipcMain.handle('settings:getDebugMode', async () => {
  return settingsManager.getDebugMode()
})

ipcMain.handle('settings:setDebugMode', async (_, enabled: boolean) => {
  settingsManager.setDebugMode(enabled)
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

// Cleanup on app exit
app.on('before-quit', () => {
  calendarSyncScheduler.dispose()
})
