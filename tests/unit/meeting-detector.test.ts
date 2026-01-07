import { MeetingDetector } from '../../src/main/services/meeting-detector'
import { CalendarEvent } from '../../src/shared/types/calendar'

// Mock the dependencies
jest.mock('../../src/main/services/calendar-manager')
jest.mock('../../src/main/services/settings-manager')

describe('MeetingDetector', () => {
  let meetingDetector: MeetingDetector
  let mockCalendarManager: any

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks()
    
    // Create mock calendar manager
    mockCalendarManager = {
      getEvents: jest.fn(),
      dispose: jest.fn()
    }
    
    meetingDetector = new MeetingDetector(mockCalendarManager)
  })

  afterEach(async () => {
    await meetingDetector.dispose()
  })

  describe('getTodaysMeetings', () => {
    it('should filter events for today only', async () => {
      const today = new Date()
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)
      const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000)
      
      const mockEvents: CalendarEvent[] = [
        {
          id: '1',
          title: 'Today Meeting',
          startDate: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 10, 0),
          endDate: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 11, 0),
          isAllDay: false,
          source: 'applescript'
        },
        {
          id: '2', 
          title: 'Yesterday Meeting',
          startDate: yesterday,
          endDate: yesterday,
          isAllDay: false,
          source: 'applescript'
        },
        {
          id: '3',
          title: 'Tomorrow Meeting', 
          startDate: tomorrow,
          endDate: tomorrow,
          isAllDay: false,
          source: 'applescript'
        }
      ]

      mockCalendarManager.getEvents.mockResolvedValue(mockEvents)

      const result = await meetingDetector.getTodaysMeetings()

      expect(result.meetings).toHaveLength(1)
      expect(result.meetings[0].title).toBe('Today Meeting')
      expect(result.totalMeetings).toBe(1)
    })

    it('should handle all-day events for today', async () => {
      const today = new Date()
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate())
      const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000 - 1)

      const mockEvents: CalendarEvent[] = [
        {
          id: '1',
          title: 'All Day Event',
          startDate: todayStart,
          endDate: todayEnd,
          isAllDay: true,
          source: 'ics'
        }
      ]

      mockCalendarManager.getEvents.mockResolvedValue(mockEvents)

      const result = await meetingDetector.getTodaysMeetings()

      expect(result.meetings).toHaveLength(1)
      expect(result.meetings[0].title).toBe('All Day Event')
      expect(result.meetings[0].isAllDay).toBe(true)
    })

    it('should handle events spanning across today', async () => {
      const today = new Date()
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)
      const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000)

      const mockEvents: CalendarEvent[] = [
        {
          id: '1',
          title: 'Multi-day Event',
          startDate: yesterday,
          endDate: tomorrow,
          isAllDay: false,
          source: 'ics'
        }
      ]

      mockCalendarManager.getEvents.mockResolvedValue(mockEvents)

      const result = await meetingDetector.getTodaysMeetings()

      expect(result.meetings).toHaveLength(1)
      expect(result.meetings[0].title).toBe('Multi-day Event')
    })

    it('should handle midnight boundary conditions', async () => {
      const today = new Date()
      const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0)
      const todayEndOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59)

      const mockEvents: CalendarEvent[] = [
        {
          id: '1',
          title: 'Midnight Start',
          startDate: todayMidnight,
          endDate: new Date(todayMidnight.getTime() + 60 * 60 * 1000), // 1 hour
          isAllDay: false,
          source: 'applescript'
        },
        {
          id: '2',
          title: 'End of Day',
          startDate: todayEndOfDay,
          endDate: new Date(todayEndOfDay.getTime() + 60 * 1000), // 1 minute
          isAllDay: false,
          source: 'applescript'
        }
      ]

      mockCalendarManager.getEvents.mockResolvedValue(mockEvents)

      const result = await meetingDetector.getTodaysMeetings()

      expect(result.meetings).toHaveLength(2)
      expect(result.meetings.map(m => m.title)).toContain('Midnight Start')
      expect(result.meetings.map(m => m.title)).toContain('End of Day')
    })

    it('should return empty array when no events for today', async () => {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000)

      const mockEvents: CalendarEvent[] = [
        {
          id: '1',
          title: 'Yesterday Meeting',
          startDate: yesterday,
          endDate: yesterday,
          isAllDay: false,
          source: 'applescript'
        },
        {
          id: '2',
          title: 'Tomorrow Meeting',
          startDate: tomorrow,
          endDate: tomorrow,
          isAllDay: false,
          source: 'applescript'
        }
      ]

      mockCalendarManager.getEvents.mockResolvedValue(mockEvents)

      const result = await meetingDetector.getTodaysMeetings()

      expect(result.meetings).toHaveLength(0)
      expect(result.totalMeetings).toBe(0)
    })

    it('should handle calendar manager errors gracefully', async () => {
      mockCalendarManager.getEvents.mockRejectedValue(new Error('Calendar error'))

      const result = await meetingDetector.getTodaysMeetings()

      expect(result.meetings).toHaveLength(0)
      expect(result.totalMeetings).toBe(0)
      expect(result.detectedAt).toBeInstanceOf(Date)
    })

    it('should use cache for repeated calls within cache duration', async () => {
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
      
      // Second call immediately after
      const result2 = await meetingDetector.getTodaysMeetings()

      expect(mockCalendarManager.getEvents).toHaveBeenCalledTimes(1)
      expect(result1.detectedAt).toEqual(result2.detectedAt)
    })
  })

  describe('hasTodaysMeetings', () => {
    it('should return true when there are meetings today', async () => {
      const today = new Date()
      const mockEvents: CalendarEvent[] = [
        {
          id: '1',
          title: 'Today Meeting',
          startDate: today,
          endDate: today,
          isAllDay: false,
          source: 'applescript'
        }
      ]

      mockCalendarManager.getEvents.mockResolvedValue(mockEvents)

      const result = await meetingDetector.hasTodaysMeetings()

      expect(result).toBe(true)
    })

    it('should return false when there are no meetings today', async () => {
      mockCalendarManager.getEvents.mockResolvedValue([])

      const result = await meetingDetector.hasTodaysMeetings()

      expect(result).toBe(false)
    })
  })

  describe('invalidateCache', () => {
    it('should clear cache and force fresh data on next call', async () => {
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

      // First call to populate cache
      await meetingDetector.getTodaysMeetings()
      
      // Invalidate cache
      meetingDetector.invalidateCache()
      
      // Second call should fetch fresh data
      await meetingDetector.getTodaysMeetings()

      expect(mockCalendarManager.getEvents).toHaveBeenCalledTimes(2)
    })
  })
})
