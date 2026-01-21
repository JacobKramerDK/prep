import { OpenAIService } from '../../src/main/services/openai-service'
import { BriefGenerationRequest } from '../../src/shared/types/brief'
import { Meeting } from '../../src/shared/types/meeting'

// Mock OpenAI
jest.mock('openai', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: jest.fn()
        }
      },
      models: {
        list: jest.fn()
      }
    }))
  }
})

describe('OpenAI Service Fixes', () => {
  let service: OpenAIService
  let mockClient: any

  beforeEach(() => {
    const OpenAI = require('openai').default
    mockClient = {
      chat: {
        completions: {
          create: jest.fn()
        }
      },
      models: {
        list: jest.fn()
      }
    }
    OpenAI.mockImplementation(() => mockClient)
    service = new OpenAIService('test-key')
  })

  describe('API Key Validation with Fallback Models', () => {
    it('should try models.list first, then fallback models for validation', async () => {
      // models.list fails, then fallback models are tried
      mockClient.models.list.mockRejectedValueOnce(new Error('Models list not available'))
      mockClient.chat.completions.create
        .mockRejectedValueOnce(new Error('Model not available'))
        .mockResolvedValueOnce({ choices: [{ message: { content: 'test' } }] })

      const result = await service.validateApiKey('sk-test-key')
      
      expect(result).toBe(true)
      expect(mockClient.models.list).toHaveBeenCalledTimes(1)
      expect(mockClient.chat.completions.create).toHaveBeenCalledTimes(2)
    })

    it('should return false if all validation methods fail', async () => {
      mockClient.models.list.mockRejectedValue(new Error('Invalid key'))
      mockClient.chat.completions.create.mockRejectedValue(new Error('Invalid key'))

      const result = await service.validateApiKey('sk-invalid-key')
      
      expect(result).toBe(false)
      expect(mockClient.models.list).toHaveBeenCalledTimes(1)
      expect(mockClient.chat.completions.create).toHaveBeenCalledTimes(3) // All 3 fallback models
    })
  })

  describe('Model Capabilities Detection', () => {
    it('should use max_completion_tokens for o1 models', async () => {
      mockClient.chat.completions.create.mockResolvedValue({
        choices: [{ message: { content: 'test brief' } }]
      })

      const request: BriefGenerationRequest = {
        meetingId: 'test',
        userContext: 'test context',
        keyTopics: ['topic1', 'topic2'],
        attendees: ['person1', 'person2']
      }

      const meeting: Meeting = {
        id: 'test',
        title: 'Test Meeting',
        startDate: new Date(),
        endDate: new Date(),
        isAllDay: false,
        source: 'ics',
        attendees: []
      }

      await service.generateMeetingBrief(request, meeting, 'o1-preview')

      const callArgs = mockClient.chat.completions.create.mock.calls[0][0]
      expect(callArgs.max_completion_tokens).toBe(32000) // Updated to match our improved implementation
      expect(callArgs.max_tokens).toBeUndefined()
      expect(callArgs.temperature).toBeUndefined()
    })

    it('should use max_tokens for regular models', async () => {
      mockClient.chat.completions.create.mockResolvedValue({
        choices: [{ message: { content: 'test brief' } }]
      })

      const request: BriefGenerationRequest = {
        meetingId: 'test',
        userContext: 'test context'
      }

      const meeting: Meeting = {
        id: 'test',
        title: 'Test Meeting',
        startDate: new Date(),
        endDate: new Date(),
        isAllDay: false,
        source: 'ics',
        attendees: []
      }

      await service.generateMeetingBrief(request, meeting, 'gpt-4')

      const callArgs = mockClient.chat.completions.create.mock.calls[0][0]
      expect(callArgs.max_tokens).toBe(2000)
      expect(callArgs.temperature).toBe(0.7)
      expect(callArgs.max_completion_tokens).toBeUndefined()
    })
  })

  describe('Array Handling in Brief Generation', () => {
    it('should handle keyTopics and attendees arrays correctly', async () => {
      mockClient.chat.completions.create.mockResolvedValue({
        choices: [{ message: { content: 'test brief' } }]
      })

      const request: BriefGenerationRequest = {
        meetingId: 'test',
        userContext: 'test context',
        keyTopics: ['Budget Review', 'Timeline Discussion'],
        attendees: ['John Doe', 'Jane Smith']
      }

      const meeting: Meeting = {
        id: 'test',
        title: 'Test Meeting',
        startDate: new Date(),
        endDate: new Date(),
        isAllDay: false,
        source: 'ics',
        attendees: []
      }

      const result = await service.generateMeetingBrief(request, meeting)

      expect(result).toBeDefined()
      expect(result.content).toBe('test brief')
      
      // Verify the prompt includes the arrays properly
      const callArgs = mockClient.chat.completions.create.mock.calls[0][0]
      const prompt = callArgs.messages[1].content
      expect(prompt).toContain('- Budget Review')
      expect(prompt).toContain('- Timeline Discussion')
      expect(prompt).toContain('- John Doe')
      expect(prompt).toContain('- Jane Smith')
    })
  })
})
