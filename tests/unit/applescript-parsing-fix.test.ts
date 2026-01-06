// Mock fs module first
jest.mock('fs', () => ({
  existsSync: jest.fn().mockReturnValue(true),
  statSync: jest.fn().mockReturnValue({ size: 1024 }),
  readFileSync: jest.fn().mockReturnValue('mock ics content'),
  writeFileSync: jest.fn(),
  unlinkSync: jest.fn()
}))

// Mock the SettingsManager
const mockSettingsManager = {
  getCalendarEvents: jest.fn().mockResolvedValue([]),
  setCalendarEvents: jest.fn().mockResolvedValue(undefined)
}

jest.mock('../../src/main/services/settings-manager', () => ({
  SettingsManager: jest.fn().mockImplementation(() => mockSettingsManager)
}))

// Mock applescript
jest.mock('applescript', () => ({
  execString: jest.fn()
}))

// Mock child_process
const mockExecAsync = jest.fn()
jest.mock('child_process', () => ({
  exec: jest.fn()
}))

// Mock util.promisify to return our async mock
jest.mock('util', () => ({
  promisify: jest.fn(() => mockExecAsync)
}))

import { CalendarManager } from '../../src/main/services/calendar-manager'

describe('AppleScript Parsing Security Fix', () => {
  let calendarManager: CalendarManager
  
  beforeEach(() => {
    jest.clearAllMocks()
    calendarManager = new CalendarManager()
  })

  describe('AppleScript injection prevention', () => {
    it('should prevent malicious AppleScript injection in date parsing', async () => {
      // Test malicious input that could be injected
      const maliciousOutput = 'Meeting|||; do shell script "rm -rf /"|||2026-01-06 09:00:00|||2026-01-06 10:00:00|||Work'
      
      mockExecAsync.mockResolvedValue({ stdout: maliciousOutput })

      const result = await calendarManager.extractAppleScriptEvents()

      // Should not execute malicious code, should handle as invalid event
      expect(result.events).toHaveLength(0)
      expect(result.errors).toBeUndefined()
    })

    it('should handle pipe character injection in calendar names', async () => {
      // Test calendar names with pipe characters that could break parsing
      const pipeOutput = 'Meeting|With|Pipes|||2026-01-06 09:00:00|||2026-01-06 10:00:00|||Work'
      
      mockExecAsync.mockResolvedValue({ stdout: pipeOutput })

      const result = await calendarManager.extractAppleScriptEvents()

      // Should handle pipe characters safely
      expect(result.events).toHaveLength(0) // Invalid format should be rejected
    })

    it('should validate date format to prevent injection', async () => {
      // Test various invalid date formats that could be injection attempts
      const invalidDates = [
        'Meeting|||$(malicious)|||2026-01-06 10:00:00|||Work',
        'Meeting|||`rm -rf /`|||2026-01-06 10:00:00|||Work',
        'Meeting|||; echo "hacked"|||2026-01-06 10:00:00|||Work'
      ]

      for (const invalidDate of invalidDates) {
        mockExecAsync.mockResolvedValue({ stdout: invalidDate })

        const result = await calendarManager.extractAppleScriptEvents()
        
        // Should reject all malicious date formats
        expect(result.events).toHaveLength(0)
      }
    })

    it('should parse valid events correctly', async () => {
      const validOutput = 'Team Meeting|Tuesday, 6 January 2026 at 09.00.00|Tuesday, 6 January 2026 at 10.00.00|Work'
      
      mockExecAsync.mockResolvedValue({ stdout: validOutput })

      const result = await calendarManager.extractAppleScriptEvents()

      // Should parse valid events successfully
      expect(result.events).toHaveLength(1)
      expect(result.events[0].title).toBe('Team Meeting')
      expect(result.events[0].calendarName).toBe('Work')
    })
  })

  describe('Error handling', () => {
    it('should handle AppleScript execution errors', async () => {
      mockExecAsync.mockRejectedValue(new Error('AppleScript execution failed'))

      // Should throw CalendarError, not return error in result
      await expect(calendarManager.extractAppleScriptEvents()).rejects.toThrow('AppleScript execution failed')
    })

    it('should handle empty AppleScript output', async () => {
      mockExecAsync.mockResolvedValue({ stdout: '' })

      const result = await calendarManager.extractAppleScriptEvents()

      expect(result.events).toEqual([])
      expect(result.errors).toBeUndefined()
    })
  })
})
