import { CalendarManager } from '../../src/main/services/calendar-manager'
import { CalendarError } from '../../src/shared/types/calendar'
import * as path from 'path'
import * as fs from 'fs'
import * as os from 'os'

describe('CalendarManager Path Traversal Security', () => {
  let calendarManager: CalendarManager
  let tempDir: string
  let validIcsFile: string

  beforeEach(() => {
    calendarManager = new CalendarManager()
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'calendar-test-'))
    validIcsFile = path.join(tempDir, 'valid.ics')
    
    // Create a valid ICS file for testing
    fs.writeFileSync(validIcsFile, `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Test//Test//EN
BEGIN:VEVENT
UID:test@example.com
DTSTART:20260106T100000Z
DTEND:20260106T110000Z
SUMMARY:Test Event
END:VEVENT
END:VCALENDAR`)
  })

  afterEach(() => {
    // Cleanup temp directory
    fs.rmSync(tempDir, { recursive: true, force: true })
  })

  test('should reject path traversal attempts with ../', async () => {
    const maliciousPath = path.join(tempDir, '../../../etc/passwd')
    
    await expect(calendarManager.parseICSFile(maliciousPath))
      .rejects
      .toThrow(CalendarError)
  })

  test('should reject absolute paths outside working directory', async () => {
    const maliciousPath = '/etc/passwd'
    
    await expect(calendarManager.parseICSFile(maliciousPath))
      .rejects
      .toThrow(CalendarError)
  })

  test('should reject paths with .. components', async () => {
    const maliciousPath = path.join(tempDir, 'subdir', '..', '..', 'malicious.ics')
    
    await expect(calendarManager.parseICSFile(maliciousPath))
      .rejects
      .toThrow(CalendarError)
  })

  test('should accept valid relative paths within working directory', async () => {
    // Change working directory to temp directory for this test
    const originalCwd = process.cwd()
    process.chdir(tempDir)
    
    try {
      // This should work since the file is within the working directory
      const result = await calendarManager.parseICSFile('valid.ics')
      expect(result).toBeDefined()
      expect(result.events).toBeDefined()
    } finally {
      process.chdir(originalCwd)
    }
  })
})
