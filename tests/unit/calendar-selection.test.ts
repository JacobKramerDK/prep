import { CalendarManager } from '../../src/main/services/calendar-manager'
import { CalendarMetadata, CalendarDiscoveryResult } from '../../src/shared/types/calendar-selection'
import { CalendarError } from '../../src/shared/types/calendar'

// Mock dependencies
jest.mock('child_process')
jest.mock('fs')
jest.mock('os')
jest.mock('crypto')

const mockExecAsync = jest.fn()
jest.mock('util', () => ({
  promisify: jest.fn(() => mockExecAsync)
}))

describe('CalendarManager - Calendar Selection', () => {
  let calendarManager: CalendarManager
  
  beforeEach(() => {
    jest.clearAllMocks()
    calendarManager = new CalendarManager()
  })

  describe('discoverCalendars', () => {
    it('should discover calendars successfully', async () => {
      const mockAppleScriptOutput = 'Work|true|Work Calendar|{65535, 0, 0}, Personal|false|Personal Calendar|{0, 65535, 0}'
      
      mockExecAsync.mockResolvedValue({ stdout: mockAppleScriptOutput })

      const result: CalendarDiscoveryResult = await calendarManager.discoverCalendars()

      expect(result.calendars).toHaveLength(2)
      expect(result.calendars[0]).toEqual({
        uid: 'Work',
        name: 'Work',
        title: 'Work',
        type: 'local',
        isVisible: true,
        color: '{65535, 0, 0}'
      })
      expect(result.calendars[1]).toEqual({
        uid: 'Personal',
        name: 'Personal',
        title: 'Personal',
        type: 'subscribed',
        isVisible: true,
        color: '{0, 65535, 0}'
      })
      expect(result.totalCalendars).toBe(2)
      expect(result.discoveredAt).toBeInstanceOf(Date)
    })

    it('should handle empty calendar list', async () => {
      mockExecAsync.mockResolvedValue({ stdout: '' })

      const result = await calendarManager.discoverCalendars()

      expect(result.calendars).toHaveLength(0)
      expect(result.totalCalendars).toBe(0)
      expect(result.errors).toBeUndefined()
    })

    it('should handle malformed calendar entries', async () => {
      const mockAppleScriptOutput = 'Work|true|Work Calendar|{65535, 0, 0}, InvalidEntry, Personal|false|Personal Calendar|{0, 65535, 0}'
      
      mockExecAsync.mockResolvedValue({ stdout: mockAppleScriptOutput })

      const result = await calendarManager.discoverCalendars()

      expect(result.calendars).toHaveLength(2) // Only valid entries
      expect(result.errors).toHaveLength(1)
      expect(result.errors![0].calendar).toBe('InvalidEntry')
    })

    it('should throw permission error for access denied', async () => {
      const permissionError = new Error('not allowed') as any
      permissionError.code = 'EACCES'
      
      mockExecAsync.mockRejectedValue(permissionError)

      await expect(calendarManager.discoverCalendars()).rejects.toThrow(CalendarError)
      await expect(calendarManager.discoverCalendars()).rejects.toThrow('Calendar access permission required')
    })

    it('should throw platform error on non-macOS', async () => {
      // Mock platform check
      Object.defineProperty(process, 'platform', {
        value: 'win32'
      })
      
      const newManager = new CalendarManager()
      
      await expect(newManager.discoverCalendars()).rejects.toThrow(CalendarError)
      await expect(newManager.discoverCalendars()).rejects.toThrow('AppleScript not supported on this platform')
    })
  })

  describe('extractAppleScriptEvents with calendar selection', () => {
    it('should extract events from selected calendars only', async () => {
      const mockEventOutput = 'Meeting 1|Tuesday, 6 January 2026 at 09.30.00|Tuesday, 6 January 2026 at 10.30.00|Work, Meeting 2|Tuesday, 6 January 2026 at 14.00.00|Tuesday, 6 January 2026 at 15.00.00|Work'
      
      mockExecAsync.mockResolvedValue({ stdout: mockEventOutput })

      const result = await calendarManager.extractAppleScriptEvents(['Work'])

      expect(result.events).toHaveLength(2)
      expect(result.events[0].calendarName).toBe('Work')
      expect(result.events[1].calendarName).toBe('Work')
      expect(result.source).toBe('applescript')
    })

    it('should extract from all calendars when no selection provided', async () => {
      const mockEventOutput = 'Meeting 1|Tuesday, 6 January 2026 at 09.30.00|Tuesday, 6 January 2026 at 10.30.00|Work, Meeting 2|Tuesday, 6 January 2026 at 14.00.00|Tuesday, 6 January 2026 at 15.00.00|Personal'
      
      mockExecAsync.mockResolvedValue({ stdout: mockEventOutput })

      const result = await calendarManager.extractAppleScriptEvents()

      expect(result.events).toHaveLength(2)
      expect(result.events[0].calendarName).toBe('Work')
      expect(result.events[1].calendarName).toBe('Personal')
    })

    it('should handle empty selection gracefully', async () => {
      const mockEventOutput = ''
      
      mockExecAsync.mockResolvedValue({ stdout: mockEventOutput })

      const result = await calendarManager.extractAppleScriptEvents([])

      expect(result.events).toHaveLength(0)
      expect(result.totalEvents).toBe(0)
    })
  })

  describe('performance optimization', () => {
    it('should generate correct AppleScript for selected calendars', async () => {
      const selectedCalendars = ['Work Calendar', 'Team Calendar']
      
      // Mock the script execution to capture the generated script
      let capturedScript = ''
      mockExecAsync.mockImplementation(async (command: string) => {
        // Extract script path from command and read it
        const scriptPath = command.match(/osascript "([^"]+)"/)?.[1]
        if (scriptPath) {
          const fs = require('fs')
          capturedScript = fs.readFileSync(scriptPath, 'utf8')
        }
        return { stdout: '' }
      })

      await calendarManager.extractAppleScriptEvents(selectedCalendars)

      expect(capturedScript).toContain('set selectedNames to {"Work Calendar", "Team Calendar"}')
      expect(capturedScript).toContain('set targetCal to calendar selectedName')
      expect(capturedScript).not.toContain('repeat with cal in calendars')
    })

    it('should use fallback script when no calendars selected', async () => {
      let capturedScript = ''
      mockExecAsync.mockImplementation(async (command: string) => {
        const scriptPath = command.match(/osascript "([^"]+)"/)?.[1]
        if (scriptPath) {
          const fs = require('fs')
          capturedScript = fs.readFileSync(scriptPath, 'utf8')
        }
        return { stdout: '' }
      })

      await calendarManager.extractAppleScriptEvents()

      expect(capturedScript).toContain('repeat with cal in calendars')
      expect(capturedScript).not.toContain('selectedNames')
    })
  })
})
