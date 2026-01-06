import { CalendarManager } from '../../src/main/services/calendar-manager'

// Mock dependencies
jest.mock('child_process')
jest.mock('fs')
jest.mock('os')
jest.mock('crypto')

const mockExecAsync = jest.fn()
jest.mock('util', () => ({
  promisify: jest.fn(() => mockExecAsync)
}))

describe('AppleScript Parsing Security Fix', () => {
  let calendarManager: CalendarManager
  
  beforeEach(() => {
    jest.clearAllMocks()
    calendarManager = new CalendarManager()
  })

  it('should handle calendar names with pipe characters', async () => {
    // Calendar name with pipe character that would break old parsing
    const mockAppleScriptOutput = 'Work|Project|||true|||Work Calendar|||{65535, 0, 0}, Personal|||false|||Personal Calendar|||{0, 65535, 0}'
    
    mockExecAsync.mockResolvedValue({ stdout: mockAppleScriptOutput })

    const result = await calendarManager.discoverCalendars()

    expect(result.calendars).toHaveLength(2)
    expect(result.calendars[0].name).toBe('Work|Project') // Should preserve pipe in name
    expect(result.calendars[0].type).toBe('local')
    expect(result.calendars[1].name).toBe('Personal')
    expect(result.calendars[1].type).toBe('subscribed')
  })

  it('should handle multiple pipe characters in calendar names', async () => {
    const mockAppleScriptOutput = 'Complex|Name|With|Pipes|||true|||Description|||{65535, 0, 0}'
    
    mockExecAsync.mockResolvedValue({ stdout: mockAppleScriptOutput })

    const result = await calendarManager.discoverCalendars()

    expect(result.calendars).toHaveLength(1)
    expect(result.calendars[0].name).toBe('Complex|Name|With|Pipes')
    expect(result.calendars[0].type).toBe('local')
  })

  it('should handle empty fields gracefully', async () => {
    const mockAppleScriptOutput = 'Calendar Name|||true||||||{65535, 0, 0}'
    
    mockExecAsync.mockResolvedValue({ stdout: mockAppleScriptOutput })

    const result = await calendarManager.discoverCalendars()

    expect(result.calendars).toHaveLength(1)
    expect(result.calendars[0].name).toBe('Calendar Name')
    expect(result.calendars[0].color).toBe('{65535, 0, 0}')
  })
})
