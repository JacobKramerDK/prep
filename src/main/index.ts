import { app, BrowserWindow, ipcMain, dialog } from 'electron'
import path from 'path'
import { VaultManager } from './services/vault-manager'
import { CalendarManager } from './services/calendar-manager'

const isDevelopment = process.env.NODE_ENV === 'development'
const vaultManager = new VaultManager()
const calendarManager = new CalendarManager()

const createWindow = (): void => {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    show: false
  })

  // Load the app
  if (isDevelopment) {
    mainWindow.loadURL('http://localhost:5173')
    // Only open DevTools if explicitly requested
    if (process.env.OPEN_DEVTOOLS === 'true') {
      mainWindow.webContents.openDevTools()
    }
  } else {
    // More robust path resolution for production builds
    const rendererPath = path.join(__dirname, '..', '..', '..', 'renderer', 'src', 'renderer', 'index.html')
    mainWindow.loadFile(rendererPath)
  }

  // Show window when ready to prevent visual flash
  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
  })

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
ipcMain.handle('calendar:extractEvents', async () => {
  return await calendarManager.extractAppleScriptEvents()
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
