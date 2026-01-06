// Jest setup file
// Mock electron modules that aren't available in test environment
jest.mock('electron', () => ({
  app: {
    getVersion: jest.fn(() => '1.0.0'),
    whenReady: jest.fn(() => Promise.resolve()),
    on: jest.fn(),
    quit: jest.fn()
  },
  BrowserWindow: jest.fn(),
  ipcMain: {
    handle: jest.fn()
  },
  dialog: {
    showOpenDialog: jest.fn()
  }
}))

jest.mock('electron-store', () => {
  return jest.fn().mockImplementation(() => ({
    get: jest.fn((key) => {
      if (key === 'searchHistory') return []
      if (key === 'preferences') return { autoScan: true, maxSearchResults: 50 }
      return null
    }),
    set: jest.fn(),
    has: jest.fn(),
    delete: jest.fn()
  }))
})
