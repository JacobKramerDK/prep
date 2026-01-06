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

// Mock child_process
const mockExec = jest.fn()
jest.mock('child_process', () => ({
  exec: mockExec
}))

// Mock util
jest.mock('util', () => ({
  promisify: jest.fn((fn) => fn)
}))

// Mock crypto
jest.mock('crypto', () => ({
  randomUUID: jest.fn(() => 'mock-uuid')
}))

// Test for race condition fix
import { CalendarManager } from '../../src/main/services/calendar-manager'

describe('CalendarManager Race Condition Fix', () => {
  let calendarManager: CalendarManager

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Mock successful AppleScript execution
    mockExec.mockImplementation((command: string, options: any) => {
      return Promise.resolve({ 
        stdout: 'Test Event|Tuesday, 6 January 2026 at 09.30.00|Tuesday, 6 January 2026 at 10.30.00|Calendar' 
      })
    })
    
    calendarManager = new CalendarManager()
  })

  test('should handle concurrent extraction calls without race condition', async () => {
    // Mock the platform check to simulate macOS
    Object.defineProperty(process, 'platform', {
      value: 'darwin',
      configurable: true
    })

    // Start multiple concurrent extractions
    const promises = [
      calendarManager.extractAppleScriptEvents(),
      calendarManager.extractAppleScriptEvents(),
      calendarManager.extractAppleScriptEvents()
    ]

    // All should resolve to the same result without throwing
    const results = await Promise.allSettled(promises)
    
    // All promises should resolve (not reject due to race condition)
    results.forEach(result => {
      expect(result.status).toBe('fulfilled')
    })

    // Should call exec twice: once for permission check, once for actual extraction
    // The key is that it should NOT call exec 6 times (2 per concurrent call)
    expect(mockExec).toHaveBeenCalledTimes(2)
  }, 10000)

  test('should properly invalidate cache', async () => {
    // Test cache invalidation method exists and works
    await expect(calendarManager.invalidateCache()).resolves.toBeUndefined()
  })
})
