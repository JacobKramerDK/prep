import { OpenAIService } from '../src/main/services/openai-service'
import { BriefGenerationRequest, BriefGenerationStatus } from '../src/shared/types/brief'
import { Meeting } from '../src/shared/types/meeting'

describe('OpenAI Service Debug', () => {
  test('should debug meeting brief generation failure', async () => {
    // Create a mock API key for testing
    const service = new OpenAIService('sk-test-key-for-debugging')
    
    const mockMeeting: Meeting = {
      id: 'test-meeting',
      title: 'Test Meeting',
      startDate: new Date(),
      endDate: new Date(Date.now() + 3600000),
      attendees: ['test@example.com'],
      location: 'Test Location',
      description: 'Test meeting description'
    }

    const mockRequest: BriefGenerationRequest = {
      meetingId: 'test-meeting',
      userContext: 'Test context',
      includeContext: false,
      contextMatches: []
    }

    try {
      const result = await service.generateMeetingBrief(mockRequest, mockMeeting)
      console.log('Brief generated successfully:', result)
    } catch (error) {
      console.log('Error caught in test:', error)
      // This will help us see the actual error
      expect(error).toBeDefined()
    }
  })
})
