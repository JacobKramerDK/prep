import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron'
import path from 'path'
import * as fs from 'fs/promises'
import { VaultManager } from './services/vault-manager'
import { CalendarManager } from './services/calendar-manager'
import { CalendarSyncScheduler } from './services/calendar-sync-scheduler'
import { SettingsManager } from './services/settings-manager'
import { MeetingDetector } from './services/meeting-detector'
import { OpenAIService } from './services/openai-service'
import { ContextRetrievalService } from './services/context-retrieval-service'
import { PlatformDetector } from './services/platform-detector'
import { Debug } from '../shared/utils/debug'
import { CalendarSelectionSettings } from '../shared/types/calendar-selection'
import { BriefGenerationRequest, BriefGenerationStatus } from '../shared/types/brief'
import { contextRetrievalResultToIPC } from '../shared/types/context'
import { calendarSyncStatusToIPC, calendarSyncResultToIPC } from '../shared/types/calendar-sync'
import { appleCalendarStatusToIPC } from '../shared/types/apple-calendar'
import { RelevanceWeights } from '../shared/types/relevance-weights'

// Load environment variables
import * as dotenv from 'dotenv'
dotenv.config()

const isDevelopment = process.env.NODE_ENV === 'development'
const platformDetector = new PlatformDetector()
const vaultManager = new VaultManager()
const calendarManager = new CalendarManager()
const calendarSyncScheduler = new CalendarSyncScheduler(calendarManager)
const meetingDetector = new MeetingDetector(calendarManager)
const settingsManager = new SettingsManager()
const contextRetrievalService = new ContextRetrievalService()
let openaiService: OpenAIService | null = null

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
  // Use PNG for better cross-platform compatibility
  const iconPath = path.join(process.cwd(), 'build', 'icon.png')

  if (settingsManager.getDebugMode()) {
    console.log('Icon path:', iconPath)
    console.log('Icon exists:', require('fs').existsSync(iconPath))
  }

  const mainWindow = new BrowserWindow({
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
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory'],
    title: 'Select Obsidian Brief Folder'
  })
  
  if (result.canceled || result.filePaths.length === 0) {
    throw new Error('No directory selected')
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

    // Validate and normalize the folder path to prevent path traversal
    const normalizedFolder = path.resolve(briefFolder)
    
    // Security validation: ensure the resolved path doesn't escape expected boundaries
    // Get user data directory as the safe boundary
    const userDataPath = app.getPath('userData')
    const normalizedUserData = path.normalize(userDataPath)
    
    // Allow paths within user data directory or absolute paths that don't contain traversal
    const isWithinUserData = normalizedFolder.startsWith(normalizedUserData)
    const containsTraversal = briefFolder.includes('..') || briefFolder.includes('~')
    
    if (containsTraversal || (!path.isAbsolute(briefFolder) && !isWithinUserData)) {
      throw new Error('Invalid folder path: path traversal or unsafe path detected')
    }

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

// Cleanup on app exit
app.on('before-quit', () => {
  calendarSyncScheduler.dispose()
})
