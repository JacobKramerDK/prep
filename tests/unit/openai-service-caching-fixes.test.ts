import { OpenAIService } from '../../src/main/services/openai-service'
import { BriefGenerationRequest, BriefGenerationStatus } from '../../src/shared/types/brief'
import { Meeting } from '../../src/shared/types/meeting'

// Mock OpenAI
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

describe('OpenAI Service API Key Validation Caching', () => {
  let service: OpenAIService

  beforeEach(() => {
    jest.clearAllMocks()
    service = new OpenAIService('sk-test-key')
  })

  test('should cache validation results', async () => {
    // Mock the validateApiKey method to track calls
    const validateSpy = jest.spyOn(service, 'validateApiKey').mockResolvedValue(true)
    
    // First call should validate
    const result1 = await (service as any).isApiKeyValidCached()
    expect(result1).toBe(true)
    expect(validateSpy).toHaveBeenCalledTimes(1)
    
    // Second call should use cache
    const result2 = await (service as any).isApiKeyValidCached()
    expect(result2).toBe(true)
    expect(validateSpy).toHaveBeenCalledTimes(1) // Still only called once
    
    validateSpy.mockRestore()
  })

  test('should clear cache when API key changes', async () => {
    const validateSpy = jest.spyOn(service, 'validateApiKey').mockResolvedValue(true)
    
    // First validation
    await (service as any).isApiKeyValidCached()
    expect(validateSpy).toHaveBeenCalledTimes(1)
    
    // Change API key - this should clear the cache
    service.setApiKey('sk-new-key')
    
    // Should validate again with new key
    await (service as any).isApiKeyValidCached()
    expect(validateSpy).toHaveBeenCalledTimes(2)
    
    validateSpy.mockRestore()
  })

  test('should expire cache after TTL', async () => {
    const validateSpy = jest.spyOn(service, 'validateApiKey').mockResolvedValue(true)
    
    // Mock Date.now to control time
    const originalNow = Date.now
    let mockTime = 1000000
    Date.now = jest.fn(() => mockTime)
    
    // First validation
    await (service as any).isApiKeyValidCached()
    expect(validateSpy).toHaveBeenCalledTimes(1)
    
    // Advance time beyond TTL (5 minutes = 300000ms)
    mockTime += 400000
    
    // Should validate again due to expired cache
    await (service as any).isApiKeyValidCached()
    expect(validateSpy).toHaveBeenCalledTimes(2)
    
    // Restore
    Date.now = originalNow
    validateSpy.mockRestore()
  })
})
