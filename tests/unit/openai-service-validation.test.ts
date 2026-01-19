import { OpenAIService } from '../../src/main/services/openai-service'

// Mock OpenAI to avoid real API calls
jest.mock('openai', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      models: {
        list: jest.fn()
      },
      chat: {
        completions: {
          create: jest.fn()
        }
      }
    }))
  }
})

describe('OpenAIService - API Key Validation and Model Loading', () => {
  let openaiService: OpenAIService
  let mockOpenAI: any

  beforeEach(() => {
    jest.clearAllMocks()
    openaiService = new OpenAIService()
    
    // Get the mocked OpenAI constructor
    const OpenAI = require('openai').default
    mockOpenAI = {
      models: { list: jest.fn() },
      chat: { completions: { create: jest.fn() } }
    }
    OpenAI.mockImplementation(() => mockOpenAI)
  })

  describe('validateApiKey', () => {
    test('should return true when models.list() succeeds', async () => {
      mockOpenAI.models.list.mockResolvedValue({ data: [] })
      
      const result = await openaiService.validateApiKey('sk-test-key')
      
      expect(result).toBe(true)
      expect(mockOpenAI.models.list).toHaveBeenCalled()
    })

    test('should fallback to chat completion when models.list() fails', async () => {
      mockOpenAI.models.list.mockRejectedValue(new Error('Models list failed'))
      mockOpenAI.chat.completions.create.mockResolvedValue({ choices: [] })
      
      const result = await openaiService.validateApiKey('sk-test-key')
      
      expect(result).toBe(true)
      expect(mockOpenAI.models.list).toHaveBeenCalled()
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: 'test' }],
        max_tokens: 1
      })
    })

    test('should return false when both validation methods fail', async () => {
      mockOpenAI.models.list.mockRejectedValue(new Error('Models list failed'))
      mockOpenAI.chat.completions.create.mockRejectedValue(new Error('Chat failed'))
      
      const result = await openaiService.validateApiKey('sk-test-key')
      
      expect(result).toBe(false)
    })
  })

  describe('getAvailableModels', () => {
    test('should return filtered and sorted chat models', async () => {
      const mockModels = {
        data: [
          { id: 'gpt-4' },
          { id: 'gpt-3.5-turbo' },
          { id: 'gpt-4o' },
          { id: 'whisper-1' }, // Should be filtered out
          { id: 'dall-e-3' }, // Should be filtered out
          { id: 'text-embedding-ada-002' }, // Should be filtered out
          { id: 'o1-preview' },
          { id: 'gpt-5-mini' }
        ]
      }
      
      mockOpenAI.models.list.mockResolvedValue(mockModels)
      
      const result = await openaiService.getAvailableModels('sk-test-key')
      
      expect(result).toEqual(expect.arrayContaining([
        'o1-preview',
        'gpt-4o',
        'gpt-5-mini',
        'gpt-4',
        'gpt-3.5-turbo'
      ]))
      
      // Should not contain filtered models
      expect(result).not.toContain('whisper-1')
      expect(result).not.toContain('dall-e-3')
      expect(result).not.toContain('text-embedding-ada-002')
    })

    test('should return default models when API call fails', async () => {
      mockOpenAI.models.list.mockRejectedValue(new Error('API call failed'))
      
      const result = await openaiService.getAvailableModels('sk-test-key')
      
      expect(result).toEqual(['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-4', 'gpt-3.5-turbo'])
    })

    test('should return default models when no chat models found', async () => {
      const mockModels = {
        data: [
          { id: 'whisper-1' },
          { id: 'dall-e-3' },
          { id: 'text-embedding-ada-002' }
        ]
      }
      
      mockOpenAI.models.list.mockResolvedValue(mockModels)
      
      const result = await openaiService.getAvailableModels('sk-test-key')
      
      expect(result).toEqual(['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-4', 'gpt-3.5-turbo'])
    })

    test('should properly sort models by priority', async () => {
      const mockModels = {
        data: [
          { id: 'gpt-3.5-turbo' },
          { id: 'gpt-4' },
          { id: 'o1-preview' },
          { id: 'gpt-4o' },
          { id: 'gpt-4-turbo' }
        ]
      }
      
      mockOpenAI.models.list.mockResolvedValue(mockModels)
      
      const result = await openaiService.getAvailableModels('sk-test-key')
      
      // o1-preview should be first, then gpt-4o, then gpt-4-turbo, etc.
      expect(result[0]).toBe('o1-preview')
      expect(result[1]).toBe('gpt-4o')
      expect(result.indexOf('gpt-4-turbo')).toBeLessThan(result.indexOf('gpt-4'))
      expect(result.indexOf('gpt-4')).toBeLessThan(result.indexOf('gpt-3.5-turbo'))
    })
  })
})
