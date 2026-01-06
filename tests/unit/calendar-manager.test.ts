// Mock fs module first
jest.mock('fs', () => ({
  existsSync: jest.fn().mockReturnValue(true),
  statSync: jest.fn().mockReturnValue({ size: 1024 }),
  readFileSync: jest.fn().mockReturnValue('mock ics content')
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
})
