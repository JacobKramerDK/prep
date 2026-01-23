import { randomUUID } from 'crypto'
import { CalendarEvent } from '../../src/shared/types/calendar'
import { CalendarSelectionSettings } from '../../src/shared/types/calendar-selection'
import { RelevanceWeights } from '../../src/shared/types/relevance-weights'

export class TestDataFactory {
  static generateValidAPIKey(prefix: string = 'test'): string {
    // Generate a valid-looking API key that passes format validation
    const randomSuffix = randomUUID().replace(/-/g, '')
    return `sk-${prefix}${randomSuffix}`.substring(0, 51) // Standard OpenAI key length
  }

  static generateInvalidAPIKey(): string {
    return 'invalid-key-' + Date.now()
  }

  static generateTestSettings() {
    return {
      vaultPath: `/tmp/test-vault-${randomUUID()}`,
      openaiApiKey: this.generateValidAPIKey(),
      openaiModel: 'gpt-4o-mini',
      debugMode: false,
      searchHistory: ['test query 1', 'test query 2'],
      preferences: {
        autoScan: true,
        maxSearchResults: 50
      }
    }
  }

  static generateMockMeeting() {
    const now = new Date()
    const startDate = new Date(now.getTime() + 60 * 60 * 1000) // 1 hour from now
    const endDate = new Date(startDate.getTime() + 60 * 60 * 1000) // 1 hour duration
    
    return {
      id: randomUUID(),
      title: 'Test Meeting - Product Strategy',
      description: 'Discuss Q1 product roadmap and feature priorities',
      startDate,
      endDate,
      attendees: ['john@example.com', 'sarah@example.com'],
      location: 'Conference Room A',
      calendarId: 'test-calendar',
      source: 'test' as const
    }
  }

  static generateCalendarEvent(overrides: Partial<CalendarEvent> = {}): CalendarEvent {
    const baseEvent: CalendarEvent = {
      id: randomUUID(),
      title: `Test Meeting ${Date.now()}`,
      description: 'Test meeting description',
      startDate: new Date(),
      endDate: new Date(Date.now() + 3600000), // 1 hour later
      location: 'Test Location',
      attendees: ['test@example.com'],
      isAllDay: false,
      source: 'swift' as const,
      calendarName: 'Test Calendar'
    }

    return { ...baseEvent, ...overrides }
  }

  static generateCalendarEvents(count: number = 3): CalendarEvent[] {
    return Array.from({ length: count }, (_, index) => 
      this.generateCalendarEvent({
        title: `Test Meeting ${index + 1}`,
        startDate: new Date(Date.now() + index * 3600000)
      })
    )
  }

  static generateCalendarSelection(): CalendarSelectionSettings {
    return {
      selectedCalendarUids: [`test-calendar-${randomUUID()}`],
      lastDiscovery: new Date().toISOString(),
      discoveryCache: [
        {
          uid: `test-calendar-${randomUUID()}`,
          name: 'Test Calendar',
          title: 'Test Calendar',
          color: '#FF0000',
          type: 'local' as const,
          isVisible: true
        }
      ],
      autoSelectNew: true
    }
  }

  static generateRelevanceWeights(): RelevanceWeights {
    return {
      title: 0.4,
      content: 0.3,
      tags: 0.2,
      attendees: 0.1,
      flexSearchBonus: 0.2,
      recencyBonus: 0.15
    }
  }

  static generateMockMeetingContext(): string {
    return `
# Test Meeting Context

## Participants
- John Doe (john@example.com)
- Jane Smith (jane@example.com)

## Agenda
1. Project status update
2. Budget review
3. Next steps planning

## Previous Notes
- Last meeting focused on initial planning
- Budget approved for Q1
- Team assignments completed

## Action Items
- [ ] Complete project timeline
- [ ] Review technical specifications
- [ ] Schedule follow-up meeting
    `.trim()
  }

  static generateVaultFiles() {
    return [
      {
        path: '/test-vault/project-notes.md',
        content: '# Project Notes\n\nThis is a test project note.',
        lastModified: new Date().toISOString()
      },
      {
        path: '/test-vault/meeting-minutes.md',
        content: '# Meeting Minutes\n\n## 2024-01-15\n\nDiscussed project timeline.',
        lastModified: new Date().toISOString()
      },
      {
        path: '/test-vault/team-info.md',
        content: '# Team Information\n\n- John Doe: Project Manager\n- Jane Smith: Developer',
        lastModified: new Date().toISOString()
      }
    ]
  }

  static generateSearchResults() {
    return [
      {
        file: '/test-vault/project-notes.md',
        title: 'Project Notes',
        excerpt: 'This is a test project note with relevant content.',
        score: 0.85,
        lastModified: new Date().toISOString()
      },
      {
        file: '/test-vault/meeting-minutes.md',
        title: 'Meeting Minutes',
        excerpt: 'Meeting minutes from previous discussions.',
        score: 0.72,
        lastModified: new Date().toISOString()
      }
    ]
  }

  static generateBriefGenerationRequest() {
    return {
      meetingTitle: 'Test Project Review',
      meetingDescription: 'Weekly project review meeting',
      participants: ['john@example.com', 'jane@example.com'],
      context: this.generateMockMeetingContext(),
      relevantFiles: this.generateSearchResults()
    }
  }

  static generateTestEnvironmentConfig(testId: string = randomUUID()) {
    return {
      NODE_ENV: 'test',
      TEST_ID: testId,
      ELECTRON_STORE_NAME: `prep-settings-test-${testId}`,
      ELECTRON_STORE_PATH: `/tmp/prep-test-${testId}`,
      OPENAI_API_KEY: this.generateValidAPIKey('test'),
      DISABLE_NETWORK_REQUESTS: 'true',
      MOCK_CALENDAR_API: 'true',
      MOCK_OPENAI_API: 'true'
    }
  }

  // Utility methods for test assertions
  static isValidAPIKeyFormat(apiKey: string): boolean {
    return /^sk-[a-zA-Z0-9]{20,}$/.test(apiKey) && apiKey.length >= 20 && apiKey.length <= 200
  }

  static isValidUUID(uuid: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(uuid)
  }

  static isValidISODate(dateString: string): boolean {
    const date = new Date(dateString)
    return date instanceof Date && !isNaN(date.getTime()) && dateString === date.toISOString()
  }

  // Factory method for creating test-specific data
  static createTestSuite(testName: string) {
    const testId = `${testName}-${randomUUID()}`
    
    return {
      testId,
      settings: this.generateTestSettings(),
      calendarEvents: this.generateCalendarEvents(),
      calendarSelection: this.generateCalendarSelection(),
      relevanceWeights: this.generateRelevanceWeights(),
      vaultFiles: this.generateVaultFiles(),
      environmentConfig: this.generateTestEnvironmentConfig(testId),
      briefRequest: this.generateBriefGenerationRequest(),
      transcriptionData: this.generateTranscriptionTestData()
    }
  }

  // Transcription test data generators
  static generateTranscriptionTestData() {
    return {
      transcriptionResult: {
        id: randomUUID(),
        text: 'This is a test transcription of a meeting discussion about product features and roadmap planning.',
        language: 'en',
        duration: 120,
        createdAt: new Date(),
        model: 'whisper-1'
      },
      transcriptionStatus: {
        isRecording: false,
        recordingStartTime: undefined,
        currentFilePath: undefined
      },
      transcriptionSettings: {
        model: 'whisper-1',
        folder: `/tmp/test-transcripts-${randomUUID()}`
      }
    }
  }

  static generateMockTranscriptionResult() {
    return {
      id: randomUUID(),
      text: 'Welcome to today\'s meeting. We\'ll be discussing the quarterly review and upcoming project milestones. Let\'s start with the current status of our development initiatives.',
      language: 'en',
      duration: 180,
      createdAt: new Date(),
      model: 'whisper-1'
    }
  }

  static generateTranscriptionRequest() {
    return {
      audioFilePath: `/tmp/test-audio-${randomUUID()}.wav`,
      model: 'whisper-1',
      language: 'en'
    }
  }
}
