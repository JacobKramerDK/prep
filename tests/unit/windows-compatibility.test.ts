import { CalendarManager } from '../../src/main/services/calendar-manager'
import * as path from 'path'

describe('Windows Compatibility', () => {
  let originalPlatform: NodeJS.Platform

  beforeEach(() => {
    originalPlatform = process.platform
  })

  afterEach(() => {
    // Restore original platform
    Object.defineProperty(process, 'platform', {
      value: originalPlatform,
      writable: true
    })
    jest.clearAllMocks()
  })

  describe('CalendarManager Windows behavior', () => {
    beforeEach(() => {
      Object.defineProperty(process, 'platform', {
        value: 'win32',
        writable: true
      })
    })

    it('should report AppleScript as not supported on Windows', () => {
      const calendarManager = new CalendarManager()
      expect(calendarManager.isAppleScriptSupported()).toBe(false)
    })

    it('should throw appropriate error when trying to discover calendars on Windows', async () => {
      const calendarManager = new CalendarManager()
      
      await expect(calendarManager.discoverCalendars()).rejects.toThrow(
        'AppleScript not supported on this platform'
      )
    })

    it('should handle calendar extraction gracefully on Windows', async () => {
      const calendarManager = new CalendarManager()
      
      await expect(calendarManager.extractAppleScriptEvents()).rejects.toThrow(
        'AppleScript not available on this platform'
      )
    })
  })

  describe('File path handling', () => {
    it('should handle path joining correctly', () => {
      const testPath = 'Documents'
      const fileName = 'test.md'
      const fullPath = path.join(testPath, fileName)

      // Path.join will use the appropriate separator for the current platform
      expect(fullPath).toContain('test.md')
      expect(fullPath).toContain('Documents')
    })

    it('should normalize paths correctly', () => {
      const testPath = 'Documents/Notes/../Vault'
      const normalizedPath = path.normalize(testPath)

      // Should resolve the .. correctly regardless of platform
      expect(normalizedPath).toContain('Documents')
      expect(normalizedPath).toContain('Vault')
      expect(normalizedPath).not.toContain('..')
    })

    it('should handle absolute paths correctly', () => {
      const isWindows = process.platform === 'win32'
      const testPath = isWindows ? 'C:\\Users\\Test' : '/Users/Test'
      const fileName = 'test.md'
      const fullPath = path.join(testPath, fileName)

      expect(path.isAbsolute(fullPath)).toBe(true)
      expect(fullPath).toContain('test.md')
    })
  })

  describe('Platform-specific error handling', () => {
    it('should provide helpful error messages for unsupported features on Windows', () => {
      Object.defineProperty(process, 'platform', {
        value: 'win32',
        writable: true
      })

      const calendarManager = new CalendarManager()
      
      // Test that Windows detection works
      expect(calendarManager.isAppleScriptSupported()).toBe(false)
    })

    it('should allow macOS-specific features on macOS', () => {
      Object.defineProperty(process, 'platform', {
        value: 'darwin',
        writable: true
      })

      const calendarManager = new CalendarManager()
      
      // Test that macOS detection works
      expect(calendarManager.isAppleScriptSupported()).toBe(true)
    })
  })

  describe('Cross-platform compatibility', () => {
    it('should handle different line endings', () => {
      const windowsText = 'Line 1\r\nLine 2\r\nLine 3'
      const unixText = 'Line 1\nLine 2\nLine 3'
      
      // Normalize line endings
      const normalizedWindows = windowsText.replace(/\r\n/g, '\n')
      const normalizedUnix = unixText.replace(/\r\n/g, '\n')
      
      expect(normalizedWindows).toBe(normalizedUnix)
    })

    it('should handle case sensitivity differences', () => {
      // Windows is case-insensitive, Unix is case-sensitive
      const fileName1 = 'Test.md'
      const fileName2 = 'test.md'
      
      if (process.platform === 'win32') {
        // On Windows, these would be considered the same file
        expect(fileName1.toLowerCase()).toBe(fileName2.toLowerCase())
      } else {
        // On Unix systems, these are different files
        expect(fileName1).not.toBe(fileName2)
      }
    })
  })
})
