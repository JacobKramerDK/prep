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
  setCalendarEvents: jest.fn().mockResolvedValue(undefined),
  getCalendarSelection: jest.fn().mockResolvedValue([]),
  setCalendarSelection: jest.fn().mockResolvedValue(undefined)
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
import { CalendarMetadata, CalendarDiscoveryResult } from '../../src/shared/types/calendar-selection'
import { CalendarError } from '../../src/shared/types/calendar'

describe('CalendarManager - Calendar Selection', () => {
  let calendarManager: CalendarManager
  
  beforeEach(() => {
    jest.clearAllMocks()
    calendarManager = new CalendarManager()
  })

  describe('discoverCalendars', () => {
    it('should discover calendars successfully', async () => {
      const mockAppleScriptOutput = 'Work|||true|||Work Calendar|||{65535, 0, 0}\nPersonal|||false|||Personal Calendar|||{0, 65535, 0}'
      
      mockExecAsync.mockResolvedValue({ stdout: mockAppleScriptOutput })

      const result: CalendarDiscoveryResult = await calendarManager.discoverCalendars()

      expect(result.calendars).toHaveLength(2)
      expect(result.errors).toBeUndefined()
    })

    it('should handle AppleScript errors gracefully', async () => {
      mockExecAsync.mockRejectedValue(new Error('AppleScript failed'))

      // Should throw CalendarError, not return error in result
      await expect(calendarManager.discoverCalendars()).rejects.toThrow('AppleScript failed')
    })

    it('should handle malformed calendar data', async () => {
      const mockAppleScriptOutput = 'InvalidData\nWork|||true|||Work Calendar' // Missing color field
      
      mockExecAsync.mockResolvedValue({ stdout: mockAppleScriptOutput })

      const result: CalendarDiscoveryResult = await calendarManager.discoverCalendars()

      // Should only include valid calendars
      expect(result.calendars).toHaveLength(0)
    })
  })

  describe('calendar discovery functionality', () => {
    it('should return empty result when AppleScript not available', async () => {
      // Mock platform detection to return false
      Object.defineProperty(process, 'platform', {
        value: 'win32'
      })
      
      const result = await calendarManager.discoverCalendars()
      
      expect(result.calendars).toEqual([])
      expect(result.totalCalendars).toBe(0)
    })
  })
})
