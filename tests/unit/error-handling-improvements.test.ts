import { OpenAIService } from '../../src/main/services/openai-service'
import { BriefGenerationRequest } from '../../src/shared/types/brief'
import { Meeting } from '../../src/shared/types/meeting'

describe('Error Handling Improvements', () => {
  const mockMeeting: Meeting = {
    id: 'test-meeting',
    title: 'Test Meeting',
    startDate: new Date(),
    endDate: new Date(),
    description: 'Test meeting description',
    location: 'Test location',
    isAllDay: false,
    source: 'ics'
  }

  const mockRequest: BriefGenerationRequest = {
    meetingId: 'test-meeting',
    userContext: 'Test context',
    includeContext: false
  }

  describe('OpenAI Service Error Handling', () => {
    it('should throw specific error for empty API key', async () => {
      const service = new OpenAIService('')
      
      await expect(service.generateMeetingBrief(mockRequest, mockMeeting))
        .rejects
        .toThrow('OpenAI API key not configured. Please set your API key in settings.')
    })

    it('should throw specific error for unconfigured service', async () => {
      const service = new OpenAIService()
      
      await expect(service.generateMeetingBrief(mockRequest, mockMeeting))
        .rejects
        .toThrow('OpenAI API key not configured. Please set your API key in settings.')
    })

    it('should handle GPT-5 model capabilities correctly', () => {
      const service = new OpenAIService('test-key')
      
      // Access private method for testing
      const getModelCapabilities = (service as any).getModelCapabilities.bind(service)
      
      // Test GPT-5 variants
      expect(getModelCapabilities('gpt-5')).toEqual({ usesCompletionTokens: true })
      expect(getModelCapabilities('gpt-5-mini')).toEqual({ usesCompletionTokens: true })
      expect(getModelCapabilities('gpt-5-turbo')).toEqual({ usesCompletionTokens: true })
      expect(getModelCapabilities('gpt-5-preview-2024')).toEqual({ usesCompletionTokens: true })
      
      // Test o1 models
      expect(getModelCapabilities('o1-preview')).toEqual({ usesCompletionTokens: true })
      expect(getModelCapabilities('o1-mini')).toEqual({ usesCompletionTokens: true })
      
      // Test regular GPT models
      expect(getModelCapabilities('gpt-4o')).toEqual({ usesCompletionTokens: false })
      expect(getModelCapabilities('gpt-4')).toEqual({ usesCompletionTokens: false })
      expect(getModelCapabilities('gpt-3.5-turbo')).toEqual({ usesCompletionTokens: false })
    })
  })

  describe('Model Capabilities Detection', () => {
    it('should correctly identify completion token models', () => {
      const service = new OpenAIService('test-key')
      const getModelCapabilities = (service as any).getModelCapabilities.bind(service)
      
      const completionTokenModels = [
        'gpt-5',
        'gpt-5-mini', 
        'gpt-5-turbo',
        'gpt-5.1',
        'gpt-5.2-preview',
        'gpt-5_experimental',
        'o1-preview',
        'o1-mini'
      ]
      
      completionTokenModels.forEach(model => {
        expect(getModelCapabilities(model).usesCompletionTokens).toBe(true)
      })
    })

    it('should correctly identify regular token models', () => {
      const service = new OpenAIService('test-key')
      const getModelCapabilities = (service as any).getModelCapabilities.bind(service)
      
      const regularTokenModels = [
        'gpt-4o',
        'gpt-4o-mini',
        'gpt-4-turbo',
        'gpt-4',
        'gpt-3.5-turbo'
      ]
      
      regularTokenModels.forEach(model => {
        expect(getModelCapabilities(model).usesCompletionTokens).toBe(false)
      })
    })
  })
})
