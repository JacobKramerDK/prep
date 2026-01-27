import { CalendarEvent } from '../../shared/types/calendar'
import { Meeting, TodaysMeetingsResult } from '../../shared/types/meeting'
import { CalendarManager } from './calendar-manager'
import { SettingsManager } from './settings-manager'
import { Debug } from '../../shared/utils/debug'

export class MeetingDetector {
  private settingsManager: SettingsManager
  private calendarManager: CalendarManager
  private lastDetection: Date | null = null
  private cachedMeetings: Meeting[] = []
  private readonly CACHE_DURATION = 5 * 60 * 1000 // 5 minutes cache

  constructor(calendarManager?: CalendarManager) {
    this.settingsManager = new SettingsManager()
    this.calendarManager = calendarManager || new CalendarManager()
  }

  async dispose(): Promise<void> {
    await this.calendarManager.dispose()
  }

  /**
   * Get today's meetings from calendar events
   */
  async getTodaysMeetings(): Promise<TodaysMeetingsResult> {
    // Check cache first
    if (this.lastDetection && 
        Date.now() - this.lastDetection.getTime() < this.CACHE_DURATION) {
      return {
        meetings: this.cachedMeetings,
        totalMeetings: this.cachedMeetings.length,
        detectedAt: this.lastDetection
      }
    }

    try {
      // Get all calendar events
      const allEvents = await this.calendarManager.getEvents()
      
      // DEBUG: Log all events
      Debug.log(`[MEETING-DETECTOR] Retrieved ${allEvents.length} total events from calendar manager`)
      
      // Filter for today's meetings
      const todaysMeetings = this.filterTodaysEvents(allEvents)
      
      // DEBUG: Log filtered events
      Debug.log(`[MEETING-DETECTOR] Filtered to ${todaysMeetings.length} today's events`)
      
      // Convert to Meeting objects
      const meetings: Meeting[] = todaysMeetings.map(event => ({
        ...event,
        briefGenerated: false
      }))

      // Update cache
      this.cachedMeetings = meetings
      this.lastDetection = new Date()

      return {
        meetings,
        totalMeetings: meetings.length,
        detectedAt: this.lastDetection
      }
    } catch (error) {
      console.error('[MEETING-DETECTOR] Failed to detect today\'s meetings:', error)
      return {
        meetings: [],
        totalMeetings: 0,
        detectedAt: new Date()
      }
    }
  }

  /**
   * Filter calendar events for today's date
   */
  private filterTodaysEvents(events: CalendarEvent[]): CalendarEvent[] {
    const today = new Date()
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000)

    Debug.log(`[MEETING-DETECTOR] Filtering for today: ${todayStart.toISOString()} to ${todayEnd.toISOString()}`)
    
    let foundCount = 0
    const todaysEvents = events.filter(event => {
      const eventStart = new Date(event.startDate)
      const eventEnd = new Date(event.endDate)

      const isToday = (eventStart >= todayStart && eventStart < todayEnd) ||
                      (eventStart < todayStart && eventEnd > todayStart)
      
      // Only log first few events to avoid spam
      if (isToday && foundCount < 5) {
        Debug.log(`[MEETING-DETECTOR] Found today's event: "${event.title}" at ${eventStart.toISOString()}`)
        foundCount++
      }

      return isToday
    })

    Debug.log(`[MEETING-DETECTOR] Found ${todaysEvents.length} events for today out of ${events.length} total events`)
    return todaysEvents
  }

  /**
   * Invalidate cache to force fresh detection
   */
  invalidateCache(): void {
    this.lastDetection = null
    this.cachedMeetings = []
  }

  /**
   * Check if there are any meetings for today
   */
  async hasTodaysMeetings(): Promise<boolean> {
    const result = await this.getTodaysMeetings()
    return result.totalMeetings > 0
  }
}
