import { SettingsManager } from '../../src/main/services/settings-manager'

// Mock electron-store
jest.mock('electron-store', () => {
  const mockStore = {
    get: jest.fn(),
    set: jest.fn(),
    has: jest.fn(),
    delete: jest.fn()
  }
  
  return jest.fn().mockImplementation(() => mockStore)
})

// Mock crypto
jest.mock('crypto', () => ({
  randomBytes: jest.fn(() => ({
    toString: jest.fn(() => 'mock-random-key-32-bytes-long-hex')
  }))
}))

// Mock fs
jest.mock('fs', () => ({
  existsSync: jest.fn(() => false),
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
  mkdirSync: jest.fn()
}))

// Mock os
jest.mock('os', () => ({
  homedir: jest.fn(() => '/mock/home')
}))

// Mock electron app
jest.mock('electron', () => ({
  app: {
    getPath: jest.fn(() => '/mock/userdata')
  }
}))

describe('SettingsManager Security Fixes', () => {
  let settingsManager: SettingsManager
  
  beforeEach(() => {
    jest.clearAllMocks()
    settingsManager = new SettingsManager()
  })

  it('should create store without encryption in test environment', () => {
    const Store = require('electron-store')
    expect(Store).toHaveBeenCalledTimes(1)
    
    // In test mode, encryption is disabled for isolation
    const settingsStoreCall = Store.mock.calls[0][0]
    expect(settingsStoreCall.name).toBe('prep-settings-test')
    expect(settingsStoreCall.encryptionKey).toBeUndefined()
  })

  it('should handle test environment gracefully', () => {
    expect(settingsManager).toBeDefined()
  })
})
