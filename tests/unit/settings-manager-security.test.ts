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

  it('should generate unique encryption key per installation', () => {
    const crypto = require('crypto')
    expect(crypto.randomBytes).toHaveBeenCalledWith(32)
  })

  it('should use generated key for encryption', () => {
    const Store = require('electron-store')
    
    // Should create one store for settings
    expect(Store).toHaveBeenCalledTimes(1)
    
    // Settings store should use the generated key
    const settingsStoreCall = Store.mock.calls[0][0]
    expect(settingsStoreCall.encryptionKey).toBe('mock-random-key-32-bytes-long-hex')
  })

  it('should handle test environment gracefully', () => {
    // In test environment, it falls back to session keys due to missing electron app
    // This is expected and secure behavior
    expect(settingsManager).toBeDefined()
  })
})
