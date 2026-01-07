import { SettingsManager } from '../../src/main/services/settings-manager'

// Mock electron-store
jest.mock('electron-store', () => {
  return jest.fn().mockImplementation(() => ({
    get: jest.fn(),
    set: jest.fn()
  }))
})

// Mock electron app
jest.mock('electron', () => ({
  app: {
    getPath: jest.fn(() => '/tmp')
  }
}))

describe('Settings Manager Fixes', () => {
  let settingsManager: SettingsManager
  let mockStore: any

  beforeEach(() => {
    const Store = require('electron-store')
    mockStore = {
      get: jest.fn(),
      set: jest.fn()
    }
    Store.mockImplementation(() => mockStore)
    settingsManager = new SettingsManager()
  })

  describe('Model Name Validation', () => {
    it('should accept valid GPT-4 model names', async () => {
      mockStore.set.mockImplementation(() => {})

      await expect(settingsManager.setOpenAIModel('gpt-4')).resolves.not.toThrow()
      await expect(settingsManager.setOpenAIModel('gpt-4-turbo')).resolves.not.toThrow()
      await expect(settingsManager.setOpenAIModel('gpt-4o')).resolves.not.toThrow()
      await expect(settingsManager.setOpenAIModel('gpt-4o-mini')).resolves.not.toThrow()
    })

    it('should accept valid o1 model names', async () => {
      mockStore.set.mockImplementation(() => {})

      await expect(settingsManager.setOpenAIModel('o1-preview')).resolves.not.toThrow()
      await expect(settingsManager.setOpenAIModel('o1-mini')).resolves.not.toThrow()
    })

    it('should accept valid GPT-3.5 model names', async () => {
      mockStore.set.mockImplementation(() => {})

      await expect(settingsManager.setOpenAIModel('gpt-3.5-turbo')).resolves.not.toThrow()
      await expect(settingsManager.setOpenAIModel('gpt-3.5-turbo-16k')).resolves.not.toThrow()
    })

    it('should reject invalid model names', async () => {
      await expect(settingsManager.setOpenAIModel('invalid-model')).rejects.toThrow('Invalid model name: invalid-model')
      await expect(settingsManager.setOpenAIModel('gpt-2')).rejects.toThrow('Invalid model name: gpt-2')
      await expect(settingsManager.setOpenAIModel('')).rejects.toThrow('Invalid model name: ')
      await expect(settingsManager.setOpenAIModel('dall-e-3')).rejects.toThrow('Invalid model name: dall-e-3')
    })

    it('should accept dated model versions', async () => {
      mockStore.set.mockImplementation(() => {})

      await expect(settingsManager.setOpenAIModel('gpt-4-turbo-2024-04-09')).resolves.not.toThrow()
      await expect(settingsManager.setOpenAIModel('gpt-4o-2024-05-13')).resolves.not.toThrow()
      await expect(settingsManager.setOpenAIModel('gpt-3.5-turbo-2024-01-25')).resolves.not.toThrow()
    })
  })
})
