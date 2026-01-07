import { MeetingDetector } from '../../src/main/services/meeting-detector'
import { CalendarEvent } from '../../src/shared/types/calendar'

// Mock the dependencies
jest.mock('../../src/main/services/calendar-manager')
jest.mock('../../src/main/services/settings-manager')

describe('MeetingDetector Cache Fix', () => {
  let meetingDetector: MeetingDetector
  let mockCalendarManager: any

  beforeEach(() => {
    jest.clearAllMocks()
    
    mockCalendarManager = {
      getEvents: jest.fn(),
      dispose: jest.fn()
    }
    
    meetingDetector = new MeetingDetector(mockCalendarManager)
  })

  afterEach(async () => {
    await meetingDetector.dispose()
  })

  it('should cache empty results correctly', async () => {
    // Mock empty events
    mockCalendarManager.getEvents.mockResolvedValue([])

    // First call - should fetch from calendar manager
    const result1 = await meetingDetector.getTodaysMeetings()
    expect(result1.meetings).toHaveLength(0)
    expect(result1.totalMeetings).toBe(0)
    expect(mockCalendarManager.getEvents).toHaveBeenCalledTimes(1)

    // Second call immediately after - should use cache even with empty results
    const result2 = await meetingDetector.getTodaysMeetings()
    expect(result2.meetings).toHaveLength(0)
    expect(result2.totalMeetings).toBe(0)
    expect(mockCalendarManager.getEvents).toHaveBeenCalledTimes(1) // Still only called once
    expect(result1.detectedAt).toEqual(result2.detectedAt) // Same detection time
  })

  it('should cache non-empty results correctly', async () => {
    const mockEvents: CalendarEvent[] = [
      {
        id: '1',
        title: 'Test Meeting',
        startDate: new Date(),
        endDate: new Date(),
        isAllDay: false,
        source: 'applescript'
      }
    ]

    mockCalendarManager.getEvents.mockResolvedValue(mockEvents)

    // First call
    const result1 = await meetingDetector.getTodaysMeetings()
    expect(result1.meetings).toHaveLength(1)
    expect(mockCalendarManager.getEvents).toHaveBeenCalledTimes(1)

    // Second call - should use cache
    const result2 = await meetingDetector.getTodaysMeetings()
    expect(result2.meetings).toHaveLength(1)
    expect(mockCalendarManager.getEvents).toHaveBeenCalledTimes(1) // Still only called once
    expect(result1.detectedAt).toEqual(result2.detectedAt)
  })
})
