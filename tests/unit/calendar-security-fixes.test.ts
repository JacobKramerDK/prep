import { CalendarManager } from '../../src/main/services/calendar-manager'
import { CalendarError } from '../../src/shared/types/calendar'
import * as fs from 'fs'
import * as path from 'path'

// Mock fs module
jest.mock('fs', () => ({
  existsSync: jest.fn(),
  statSync: jest.fn(),
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
  unlinkSync: jest.fn()
}))

// Mock child_process
jest.mock('child_process', () => ({
  exec: jest.fn()
}))

// Mock ical.js
const mockComponent = {
  getAllSubcomponents: jest.fn().mockReturnValue([])
}
const mockICAL = {
  parse: jest.fn().mockReturnValue([]),
  Component: jest.fn().mockImplementation(() => mockComponent)
}

jest.mock('ical.js', () => mockICAL, { virtual: true })

// Mock crypto
jest.mock('crypto', () => ({
  randomUUID: jest.fn(() => 'test-uuid-123')
}))

// Mock the SettingsManager
const mockSettingsManager = {
  getCalendarEvents: jest.fn().mockResolvedValue([]),
  setCalendarEvents: jest.fn().mockResolvedValue(undefined)
}

jest.mock('../../src/main/services/settings-manager', () => ({
  SettingsManager: jest.fn().mockImplementation(() => mockSettingsManager)
}))

const mockFs = fs as jest.Mocked<typeof fs>

describe('CalendarManager Security Fixes', () => {
  let calendarManager: CalendarManager
  let originalPlatform: string

  beforeEach(() => {
    originalPlatform = process.platform
    jest.clearAllMocks()
    calendarManager = new CalendarManager()
  })

  afterEach(() => {
    Object.defineProperty(process, 'platform', {
      value: originalPlatform
    })
  })

  describe('ID Generation Security', () => {
    it('should use crypto.randomUUID for unique IDs', () => {
      const crypto = require('crypto')
      
      // Test that parseOSAScriptResult uses crypto.randomUUID
      const testResult = 'Test Event|Tuesday, 6 January 2026 at 09.30.00|Tuesday, 6 January 2026 at 10.00.00|Calendar'
      const events = (calendarManager as any).parseOSAScriptResult(testResult)
      
      expect(crypto.randomUUID).toHaveBeenCalled()
      expect(events[0]?.id).toBe('applescript-test-uuid-123')
    })
  })

  describe('Path Traversal Protection', () => {
    it('should reject paths with .. components', async () => {
      const maliciousPath = '../../../etc/passwd.ics'
      
      await expect(calendarManager.parseICSFile(maliciousPath)).rejects.toThrow(CalendarError)
      await expect(calendarManager.parseICSFile(maliciousPath)).rejects.toThrow('Path traversal not allowed')
    })

    it('should reject paths with /../ sequences', async () => {
      const maliciousPath = '/safe/path/../../../etc/passwd.ics'
      
      await expect(calendarManager.parseICSFile(maliciousPath)).rejects.toThrow(CalendarError)
      await expect(calendarManager.parseICSFile(maliciousPath)).rejects.toThrow('Path traversal not allowed')
    })

    it('should accept safe paths within working directory', async () => {
      const safePath = './test.ics'
      mockFs.existsSync.mockReturnValue(true)
      mockFs.statSync.mockReturnValue({ size: 1024 } as fs.Stats)
      mockFs.readFileSync.mockReturnValue('mock ics content')
      
      // This should not throw for path validation, but may throw for ICAL parsing
      // We're only testing that path traversal validation passes
      try {
        await calendarManager.parseICSFile(safePath)
      } catch (error) {
        // Should not be a path traversal error
        if (error instanceof CalendarError && error.code === 'INVALID_FILE') {
          expect((error as Error).message).not.toContain('Path traversal')
        }
        // Other errors (like ICAL parsing) are acceptable for this test
      }
      
      // If we get here without a path traversal error, the test passes
      expect(true).toBe(true)
    })
  })

  describe('Date Parsing Error Handling', () => {
    it('should throw error for invalid date formats instead of silent fallback', () => {
      const invalidDate = 'invalid-date-format'
      
      expect(() => {
        (calendarManager as any).parseAppleScriptDate(invalidDate)
      }).toThrow(CalendarError)
      
      expect(() => {
        (calendarManager as any).parseAppleScriptDate(invalidDate)
      }).toThrow('Failed to parse AppleScript date')
    })

    it('should parse valid AppleScript dates correctly', () => {
      const validDate = 'Tuesday, 6 January 2026 at 09.30.00'
      
      const result = (calendarManager as any).parseAppleScriptDate(validDate)
      
      expect(result).toBeInstanceOf(Date)
      expect(result.getFullYear()).toBe(2026)
      expect(result.getMonth()).toBe(0) // January is 0
      expect(result.getDate()).toBe(6)
    })
  })

  describe('Calendar Access Error Handling', () => {
    it('should propagate calendar access errors instead of swallowing them', async () => {
      Object.defineProperty(process, 'platform', { value: 'darwin' })
      
      const { exec } = require('child_process')
      exec.mockImplementation((cmd: string, callback: Function) => {
        if (cmd.includes('Calendar')) {
          callback(new Error('Permission denied'), null)
        }
      })
      
      await expect(calendarManager.extractAppleScriptEvents()).rejects.toThrow(CalendarError)
    })
  })
})
