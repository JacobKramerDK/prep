import { SettingsManager } from '../../src/main/services/settings-manager'

describe('SettingsManager - API Key Format Validation', () => {
  let settingsManager: SettingsManager

  beforeEach(() => {
    settingsManager = new SettingsManager()
  })

  describe('validateApiKeyFormat', () => {
    test('should accept old format OpenAI keys', () => {
      const oldFormatKey = 'sk-1234567890123456789012345678901234567890123456789'
      expect(settingsManager.validateApiKeyFormat(oldFormatKey)).toBe(true)
    })

    test('should accept new project format OpenAI keys', () => {
      const newFormatKey = 'sk-proj-' + 'a'.repeat(150) // 164 characters total
      expect(settingsManager.validateApiKeyFormat(newFormatKey)).toBe(true)
    })

    test('should reject keys that are too short', () => {
      const shortKey = 'sk-123'
      expect(settingsManager.validateApiKeyFormat(shortKey)).toBe(false)
    })

    test('should reject keys that are too long', () => {
      const longKey = 'sk-' + 'a'.repeat(250) // Over 200 characters
      expect(settingsManager.validateApiKeyFormat(longKey)).toBe(false)
    })

    test('should reject keys that do not start with sk-', () => {
      const invalidKey = 'invalid-key-format'
      expect(settingsManager.validateApiKeyFormat(invalidKey)).toBe(false)
    })

    test('should reject non-string values', () => {
      expect(settingsManager.validateApiKeyFormat(null as any)).toBe(false)
      expect(settingsManager.validateApiKeyFormat(undefined as any)).toBe(false)
      expect(settingsManager.validateApiKeyFormat(123 as any)).toBe(false)
    })
  })

  describe('Model Name Validation', () => {
    test('should accept GPT-4 models', async () => {
      const validModels = [
        'gpt-4',
        'gpt-4-turbo',
        'gpt-4-0613',
        'gpt-4-turbo-2024-04-09'
      ]
      
      for (const model of validModels) {
        await expect(settingsManager.setOpenAIModel(model)).resolves.not.toThrow()
      }
    })

    test('should accept GPT-4o models', async () => {
      const validModels = [
        'gpt-4o',
        'gpt-4o-mini',
        'gpt-4o-2024-05-13',
        'gpt-4o-search-preview',
        'gpt-4o-transcribe'
      ]
      
      for (const model of validModels) {
        await expect(settingsManager.setOpenAIModel(model)).resolves.not.toThrow()
      }
    })

    test('should accept GPT-5 models', async () => {
      const validModels = [
        'gpt-5',
        'gpt-5-mini',
        'gpt-5-nano',
        'gpt-5-pro',
        'gpt-5-2025-08-07',
        'gpt-5-chat-latest'
      ]
      
      for (const model of validModels) {
        await expect(settingsManager.setOpenAIModel(model)).resolves.not.toThrow()
      }
    })

    test('should accept O1 models', async () => {
      const validModels = [
        'o1',
        'o1-preview',
        'o1-mini',
        'o1-pro',
        'o1-2024-12-17'
      ]
      
      for (const model of validModels) {
        await expect(settingsManager.setOpenAIModel(model)).resolves.not.toThrow()
      }
    })

    test('should accept GPT-3.5 models', async () => {
      const validModels = [
        'gpt-3.5-turbo',
        'gpt-3.5-turbo-16k',
        'gpt-3.5-turbo-0125'
      ]
      
      for (const model of validModels) {
        await expect(settingsManager.setOpenAIModel(model)).resolves.not.toThrow()
      }
    })

    test('should accept special latest models', async () => {
      const validModels = [
        'chatgpt-4o-latest',
        'gpt-5-chat-latest',
        'gpt-4-latest'
      ]
      
      for (const model of validModels) {
        await expect(settingsManager.setOpenAIModel(model)).resolves.not.toThrow()
      }
    })

    test('should reject invalid model names', async () => {
      const invalidModels = [
        'invalid-model',
        'gpt-2',
        'claude-3',
        '',
        'gpt-4-invalid-suffix'
      ]
      
      for (const model of invalidModels) {
        await expect(settingsManager.setOpenAIModel(model)).rejects.toThrow('Invalid model name')
      }
    })
  })
})
