import { TestDataFactory } from '../helpers/test-data-factory'

describe('TestDataFactory', () => {
  describe('generateValidAPIKey', () => {
    it('should generate valid API key format', () => {
      const apiKey = TestDataFactory.generateValidAPIKey()
      
      expect(apiKey).toMatch(/^sk-/)
      expect(apiKey.length).toBeGreaterThanOrEqual(20)
      expect(apiKey.length).toBeLessThanOrEqual(200)
      expect(TestDataFactory.isValidAPIKeyFormat(apiKey)).toBe(true)
    })

    it('should generate unique API keys', () => {
      const key1 = TestDataFactory.generateValidAPIKey()
      const key2 = TestDataFactory.generateValidAPIKey()
      
      expect(key1).not.toBe(key2)
    })

    it('should include custom prefix', () => {
      const apiKey = TestDataFactory.generateValidAPIKey('custom')
      
      expect(apiKey).toMatch(/^sk-custom/)
    })
  })

  describe('generateInvalidAPIKey', () => {
    it('should generate invalid API key format', () => {
      const apiKey = TestDataFactory.generateInvalidAPIKey()
      
      expect(TestDataFactory.isValidAPIKeyFormat(apiKey)).toBe(false)
    })
  })

  describe('generateCalendarEvent', () => {
    it('should generate valid calendar event', () => {
      const event = TestDataFactory.generateCalendarEvent()
      
      expect(event.id).toBeTruthy()
      expect(event.title).toBeTruthy()
      expect(event.startDate).toBeInstanceOf(Date)
      expect(event.endDate).toBeInstanceOf(Date)
      expect(TestDataFactory.isValidISODate(event.startDate.toISOString())).toBe(true)
      expect(TestDataFactory.isValidISODate(event.endDate.toISOString())).toBe(true)
    })

    it('should apply overrides', () => {
      const customTitle = 'Custom Meeting Title'
      const event = TestDataFactory.generateCalendarEvent({ title: customTitle })
      
      expect(event.title).toBe(customTitle)
    })
  })

  describe('generateCalendarEvents', () => {
    it('should generate specified number of events', () => {
      const events = TestDataFactory.generateCalendarEvents(5)
      
      expect(events).toHaveLength(5)
      events.forEach(event => {
        expect(event.id).toBeTruthy()
        expect(event.title).toBeTruthy()
      })
    })

    it('should generate unique events', () => {
      const events = TestDataFactory.generateCalendarEvents(3)
      const ids = events.map(e => e.id)
      const uniqueIds = new Set(ids)
      
      expect(uniqueIds.size).toBe(3)
    })
  })

  describe('generateTestSettings', () => {
    it('should generate valid test settings', () => {
      const settings = TestDataFactory.generateTestSettings()
      
      expect(settings.vaultPath).toBeTruthy()
      expect(settings.openaiApiKey).toBeTruthy()
      expect(settings.openaiModel).toBeTruthy()
      expect(TestDataFactory.isValidAPIKeyFormat(settings.openaiApiKey)).toBe(true)
    })
  })

  describe('createTestSuite', () => {
    it('should create complete test suite data', () => {
      const testSuite = TestDataFactory.createTestSuite('integration-test')
      
      expect(testSuite.testId).toContain('integration-test')
      expect(testSuite.settings).toBeTruthy()
      expect(testSuite.calendarEvents).toHaveLength(3)
      expect(testSuite.vaultFiles).toHaveLength(3)
      expect(testSuite.environmentConfig).toBeTruthy()
    })
  })

  describe('utility methods', () => {
    it('should validate API key format correctly', () => {
      expect(TestDataFactory.isValidAPIKeyFormat('sk-1234567890123456789012345')).toBe(true)
      expect(TestDataFactory.isValidAPIKeyFormat('invalid-key')).toBe(false)
      expect(TestDataFactory.isValidAPIKeyFormat('sk-short')).toBe(false)
    })

    it('should validate UUID format correctly', () => {
      const uuid = '123e4567-e89b-12d3-a456-426614174000'
      expect(TestDataFactory.isValidUUID(uuid)).toBe(true)
      expect(TestDataFactory.isValidUUID('invalid-uuid')).toBe(false)
    })

    it('should validate ISO date format correctly', () => {
      const isoDate = new Date().toISOString()
      expect(TestDataFactory.isValidISODate(isoDate)).toBe(true)
      expect(TestDataFactory.isValidISODate('invalid-date')).toBe(false)
    })
  })
})
