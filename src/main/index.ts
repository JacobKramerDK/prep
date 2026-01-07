import { app, BrowserWindow, ipcMain, dialog } from 'electron'
import path from 'path'
import { VaultManager } from './services/vault-manager'
import { CalendarManager } from './services/calendar-manager'
import { SettingsManager } from './services/settings-manager'
import { MeetingDetector } from './services/meeting-detector'
import { OpenAIService } from './services/openai-service'
import { CalendarSelectionSettings } from '../shared/types/calendar-selection'
import { BriefGenerationRequest, BriefGenerationStatus } from '../shared/types/brief'

const isDevelopment = process.env.NODE_ENV === 'development'
const vaultManager = new VaultManager()
const calendarManager = new CalendarManager()
const meetingDetector = new MeetingDetector(calendarManager)
const settingsManager = new SettingsManager()
let openaiService: OpenAIService | null = null

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
app.whenReady().then(() => {
  createWindow()

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

    // Get the selected model
    const selectedModel = await settingsManager.getOpenAIModel()
    const brief = await openaiService.generateMeetingBrief(request, meeting, selectedModel)
    
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
  
  const testService = new OpenAIService()
  return await testService.validateApiKey(apiKey)
})

ipcMain.handle('settings:getOpenAIModel', async () => {
  return await settingsManager.getOpenAIModel()
})

ipcMain.handle('settings:setOpenAIModel', async (_, model: string) => {
  return await settingsManager.setOpenAIModel(model)
})

ipcMain.handle('settings:getAvailableModels', async (_, apiKey: string) => {
  const testService = new OpenAIService()
  return await testService.getAvailableModels(apiKey)
})

// Initialize OpenAI service on startup
initializeOpenAIService() // No need for .catch() since we handle errors internally
