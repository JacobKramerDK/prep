// Mock fs module first
jest.mock('fs', () => ({
  existsSync: jest.fn().mockReturnValue(true),
  statSync: jest.fn().mockReturnValue({ size: 1024 }),
  readFileSync: jest.fn().mockReturnValue('mock ics content')
}))

// Mock googleapis
jest.mock('googleapis', () => ({
  google: {
    auth: {
      OAuth2: jest.fn().mockImplementation(() => ({
        setCredentials: jest.fn(),
        getAccessToken: jest.fn()
      }))
    },
    calendar: jest.fn().mockReturnValue({
      events: {
        list: jest.fn()
      }
    })
  }
}))

// Mock the SettingsManager
const mockSettingsManager = {
  getCalendarEvents: jest.fn().mockResolvedValue([]),
  setCalendarEvents: jest.fn().mockResolvedValue(undefined),
  getGoogleCalendarConnected: jest.fn().mockResolvedValue(false),
  getGoogleCalendarRefreshToken: jest.fn().mockResolvedValue(null)
}

jest.mock('../../src/main/services/settings-manager', () => ({
  SettingsManager: jest.fn().mockImplementation(() => mockSettingsManager)
}))

// Mock SwiftCalendarManager
jest.mock('../../src/main/services/swift-calendar-manager', () => ({
  SwiftCalendarManager: jest.fn().mockImplementation(() => ({
    isSupported: jest.fn().mockReturnValue(false),
    extractEvents: jest.fn()
  }))
}))

// Mock GoogleOAuthManager
jest.mock('../../src/main/services/google-oauth-manager', () => ({
  GoogleOAuthManager: jest.fn().mockImplementation(() => ({
    cleanup: jest.fn()
  }))
}))

// Mock GoogleCalendarManager
jest.mock('../../src/main/services/google-calendar-manager', () => ({
  GoogleCalendarManager: jest.fn().mockImplementation(() => ({
    getEvents: jest.fn(),
    getUserInfo: jest.fn()
  }))
}))

// Mock applescript
jest.mock('applescript', () => ({
  execString: jest.fn()
}), { virtual: true })

// Mock ical.js
jest.mock('ical.js', () => ({
  parse: jest.fn().mockReturnValue([]),
  Component: jest.fn().mockImplementation(() => ({
    getAllSubcomponents: jest.fn().mockReturnValue([])
  })),
  Event: jest.fn()
}), { virtual: true })

import { CalendarManager } from '../../src/main/services/calendar-manager'
import { CalendarError } from '../../src/shared/types/calendar'
import * as fs from 'fs'

const mockFs = fs as jest.Mocked<typeof fs>

describe('CalendarManager', () => {
  let calendarManager: CalendarManager
  let originalPlatform: string

  beforeEach(() => {
    originalPlatform = process.platform
    jest.clearAllMocks()
  })

  afterEach(() => {
    Object.defineProperty(process, 'platform', {
      value: originalPlatform
    })
  })

  describe('isAppleScriptSupported', () => {
    it('should return false on non-macOS platforms', () => {
      Object.defineProperty(process, 'platform', { value: 'win32' })
      calendarManager = new CalendarManager()
      const result = calendarManager.isAppleScriptSupported()
      expect(result).toBe(false)
    })
  })

  describe('extractAppleScriptEvents', () => {
    it('should throw error on non-macOS platforms', async () => {
      Object.defineProperty(process, 'platform', { value: 'win32' })
      calendarManager = new CalendarManager()
      
      await expect(calendarManager.extractAppleScriptEvents()).rejects.toThrow(CalendarError)
      await expect(calendarManager.extractAppleScriptEvents()).rejects.toThrow('AppleScript not available')
    })
  })

  describe('parseICSFile', () => {
    beforeEach(() => {
      calendarManager = new CalendarManager()
    })

    it('should validate file extension', async () => {
      await expect(calendarManager.parseICSFile('test.txt')).rejects.toThrow(CalendarError)
      await expect(calendarManager.parseICSFile('test.txt')).rejects.toThrow('File must be an .ics calendar file')
    })

    it('should check file existence', async () => {
      mockFs.existsSync.mockReturnValue(false)
      
      await expect(calendarManager.parseICSFile('test.ics')).rejects.toThrow(CalendarError)
      await expect(calendarManager.parseICSFile('test.ics')).rejects.toThrow('File does not exist')
    })

    it('should check file size limits', async () => {
      mockFs.existsSync.mockReturnValue(true)
      mockFs.statSync.mockReturnValue({ size: 11 * 1024 * 1024 } as fs.Stats) // 11MB
      
      await expect(calendarManager.parseICSFile('test.ics')).rejects.toThrow(CalendarError)
      await expect(calendarManager.parseICSFile('test.ics')).rejects.toThrow('ICS file too large')
    })
  })

  describe('getStoredEvents', () => {
    beforeEach(() => {
      calendarManager = new CalendarManager()
    })

    it('should return stored events from settings manager', async () => {
      const mockEvents = [{ id: '1', title: 'Test Event' }]
      mockSettingsManager.getCalendarEvents.mockResolvedValue(mockEvents)
      
      const result = await calendarManager.getStoredEvents()
      expect(result).toEqual(mockEvents)
      expect(mockSettingsManager.getCalendarEvents).toHaveBeenCalled()
    })
  })

  describe('clearEvents', () => {
    beforeEach(() => {
      calendarManager = new CalendarManager()
    })

    it('should clear stored events', async () => {
      await calendarManager.clearEvents()
      expect(mockSettingsManager.setCalendarEvents).toHaveBeenCalledWith([])
    })
  })

  describe('hasConnectedCalendars', () => {
    beforeEach(() => {
      calendarManager = new CalendarManager()
    })

    it('should return true when Google Calendar is connected', async () => {
      mockSettingsManager.getGoogleCalendarConnected.mockResolvedValue(true)
      
      const result = await calendarManager.hasConnectedCalendars()
      expect(result).toBe(true)
    })

    it('should return true when Apple Calendar is available on macOS', async () => {
      Object.defineProperty(process, 'platform', { value: 'darwin' })
      mockSettingsManager.getGoogleCalendarConnected.mockResolvedValue(false)
      calendarManager = new CalendarManager()
      
      const result = await calendarManager.hasConnectedCalendars()
      expect(result).toBe(true)
    })

    it('should return false when no calendars are connected', async () => {
      Object.defineProperty(process, 'platform', { value: 'win32' })
      mockSettingsManager.getGoogleCalendarConnected.mockResolvedValue(false)
      calendarManager = new CalendarManager()
      
      const result = await calendarManager.hasConnectedCalendars()
      expect(result).toBe(false)
    })

    it('should handle errors gracefully', async () => {
      mockSettingsManager.getGoogleCalendarConnected.mockRejectedValue(new Error('Settings error'))
      
      const result = await calendarManager.hasConnectedCalendars()
      expect(result).toBe(false)
    })
  })

  describe('syncTodaysEvents', () => {
    beforeEach(() => {
      calendarManager = new CalendarManager()
    })

    it('should filter events to only today', async () => {
      const today = new Date()
      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)

      const mockEvents = [
        {
          id: '1',
          title: 'Yesterday Event',
          startDate: yesterday,
          endDate: yesterday,
          isAllDay: false,
          source: 'swift' as const
        },
        {
          id: '2',
          title: 'Today Event',
          startDate: today,
          endDate: today,
          isAllDay: false,
          source: 'swift' as const
        },
        {
          id: '3',
          title: 'Tomorrow Event',
          startDate: tomorrow,
          endDate: tomorrow,
          isAllDay: false,
          source: 'swift' as const
        }
      ]

      // Mock the performAutomaticSync method
      jest.spyOn(calendarManager, 'performAutomaticSync').mockResolvedValue({
        events: mockEvents,
        totalEvents: mockEvents.length,
        importedAt: new Date(),
        source: 'swift'
      })

      const result = await calendarManager.syncTodaysEvents()
      
      expect(result).toHaveLength(1)
      expect(result[0].title).toBe('Today Event')
    })
  })
})
