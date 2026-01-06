import * as fs from 'fs'
import * as path from 'path'
import { exec } from 'child_process'
import { promisify } from 'util'
import { CalendarEvent, CalendarImportResult, CalendarError } from '../../shared/types/calendar'
import { SettingsManager } from './settings-manager'

const execAsync = promisify(exec)

// Dynamic imports for optional dependencies
let ICAL: any

try {
  ICAL = require('ical.js')
} catch (error) {
  if (process.env.NODE_ENV !== 'test') {
    throw new Error('ical.js is required for calendar functionality')
  }
}

export class CalendarManager {
  private settingsManager: SettingsManager
  private readonly isAppleScriptAvailable = process.platform === 'darwin'

  constructor() {
    this.settingsManager = new SettingsManager()
    if (process.env.NODE_ENV !== 'test') {
      process.on('exit', () => this.dispose())
    }
  }

  async dispose(): Promise<void> {
    // Cleanup resources if needed
  }

  async extractAppleScriptEvents(): Promise<CalendarImportResult> {
    if (!this.isAppleScriptAvailable) {
      throw new CalendarError('AppleScript not available on this platform', 'PLATFORM_UNSUPPORTED')
    }

    await this.checkAppleScriptPermissions()

    // Get available calendars
    try {
      const { stdout } = await execAsync('osascript -e \'tell application "Calendar" to return name of every calendar\'')
      const calendars = stdout.trim().split(', ')
      
      if (!calendars || calendars.length === 0 || (calendars.length === 1 && calendars[0] === '')) {
        return {
          events: [],
          totalEvents: 0,
          importedAt: new Date(),
          source: 'applescript'
        }
      }
    } catch (error) {
      console.error('Failed to get calendars:', error)
    }

    // Now try today's events
    const script = `tell application "Calendar"
  set todayStart to current date
  set time of todayStart to 0
  set todayEnd to todayStart + 1 * days
  
  set allEvents to {}
  repeat with cal in calendars
    set dayEvents to (events of cal whose start date ≥ todayStart and start date < todayEnd)
    repeat with evt in dayEvents
      set end of allEvents to (summary of evt & "|" & (start date of evt as string) & "|" & (end date of evt as string) & "|" & (name of cal))
    end repeat
  end repeat
  
  return allEvents
end tell`

    try {
      const { stdout } = await execAsync(`osascript -e '${script}'`)
      const events = this.parseOSAScriptResult(stdout.trim())
      
      await this.settingsManager.setCalendarEvents(events)
      
      return {
        events,
        totalEvents: events.length,
        importedAt: new Date(),
        source: 'applescript'
      }
    } catch (error: any) {
      throw new CalendarError(
        `Failed to extract calendar events: ${error?.message || 'Unknown error'}`,
        'PARSE_ERROR',
        error instanceof Error ? error : undefined
      )
    }
  }

  private parseAppleScriptDate(dateStr: string): Date {
    try {
      // AppleScript date format: "Tuesday, 6 January 2026 at 09.30.00"
      // Convert to a format JavaScript can parse
      
      // Remove day of week and "at"
      let cleanDate = dateStr.replace(/^[A-Za-z]+,\s*/, '').replace(' at ', ' ')
      
      // Replace dots with colons in time
      cleanDate = cleanDate.replace(/(\d{2})\.(\d{2})\.(\d{2})$/, '$1:$2:$3')
      
      // Try to parse the cleaned date
      const parsed = new Date(cleanDate)
      
      if (isNaN(parsed.getTime())) {
        return new Date() // Fallback to current time
      }
      
      return parsed
    } catch (error) {
      return new Date() // Fallback to current time
    }
  }

  private parseOSAScriptResult(result: string): CalendarEvent[] {
    if (!result || result.trim() === '') {
      return []
    }

    const events: CalendarEvent[] = []
    
    // The result is a single string with events separated by ", "
    // But each event has the format: "title|startDate|endDate|calendar"
    // We need to split carefully because the comma-space separator can appear in event titles
    
    // Split by the pattern that separates events: ", " followed by a title that doesn't contain "|"
    const eventPattern = /([^|]+\|[^|]+\|[^|]+\|[^,]+)(?:, |$)/g
    const matches = result.match(eventPattern)
    
    if (matches) {
      matches.forEach((match: string, index: number) => {
        try {
          // Remove trailing ", " if present
          const eventString = match.replace(/, $/, '')
          const parts = eventString.split('|')
          
          if (parts.length >= 4) {
            const [title, startDateStr, endDateStr, calendarName] = parts
            
            const event: CalendarEvent = {
              id: `applescript-${Date.now()}-${index}`,
              title: title.trim() || 'Untitled Event',
              description: undefined,
              startDate: this.parseAppleScriptDate(startDateStr.trim()),
              endDate: this.parseAppleScriptDate(endDateStr.trim()),
              location: undefined,
              attendees: [],
              isAllDay: false,
              source: 'applescript' as const,
              calendarName: calendarName.trim() || undefined
            }
            
            events.push(event)
          }
        } catch (error) {
          // Silently skip invalid events
        }
      })
    } else {
      // Fallback: try splitting by ", " and hope for the best
      const eventStrings = result.split(', ')
      eventStrings.forEach((eventString: string, index: number) => {
        try {
          const parts = eventString.split('|')
          if (parts.length >= 4) {
            const [title, startDateStr, endDateStr, calendarName] = parts
            
            const event: CalendarEvent = {
              id: `applescript-${Date.now()}-${index}`,
              title: title.trim() || 'Untitled Event',
              description: undefined,
              startDate: this.parseAppleScriptDate(startDateStr.trim()),
              endDate: this.parseAppleScriptDate(endDateStr.trim()),
              location: undefined,
              attendees: [],
              isAllDay: false,
              source: 'applescript' as const,
              calendarName: calendarName.trim() || undefined
            }
            
            events.push(event)
          }
        } catch (error) {
          // Silently skip invalid events
        }
      })
    }

    return events
  }

  private async checkAppleScriptPermissions(): Promise<boolean> {
    if (process.platform !== 'darwin') return false
    
    try {
      const { stdout } = await execAsync('osascript -e \'tell application "Calendar" to return "test"\'')
      return true
    } catch (error: any) {
      if (error?.message?.includes('not allowed') || error?.message?.includes('permission')) {
        throw new CalendarError(
          'Calendar access permission required. Please grant access in System Preferences > Security & Privacy > Privacy > Calendar',
          'PERMISSION_DENIED',
          error instanceof Error ? error : undefined
        )
      }
      throw new CalendarError(
        `AppleScript execution failed: ${error?.message || 'Unknown error'}`,
        'PARSE_ERROR',
        error instanceof Error ? error : undefined
      )
    }
  }

  private parseAppleScriptResult(result: any): CalendarEvent[] {
    console.log('AppleScript result:', result, typeof result)
    
    if (!result || !Array.isArray(result)) {
      console.log('No events or invalid result format')
      return []
    }

    const events: CalendarEvent[] = []
    
    result.forEach((eventData: any, index: number) => {
      try {
        console.log(`Processing event ${index}:`, eventData)
        
        if (!Array.isArray(eventData) || eventData.length < 6) {
          console.warn('Invalid event data format:', eventData)
          return
        }
        
        const [title, startDate, endDate, location, description, calendarName] = eventData
        
        const event: CalendarEvent = {
          id: `applescript-${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${index}`,
          title: title || 'Untitled Event',
          description: description || undefined,
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          location: location || undefined,
          attendees: [],
          isAllDay: false,
          source: 'applescript' as const,
          calendarName: calendarName || undefined
        }
        
        console.log('Created event:', event.title, 'at', event.startDate)
        events.push(event)
      } catch (error) {
        console.warn('Failed to parse AppleScript event:', error)
      }
    })

    console.log(`Parsed ${events.length} events total`)
    return events
  }

  async parseICSFile(filePath: string): Promise<CalendarImportResult> {
    this.validateICSFile(filePath)

    try {
      const icsContent = fs.readFileSync(filePath, 'utf8')
      const jcalData = ICAL.parse(icsContent)
      const comp = new ICAL.Component(jcalData)
      
      const events: CalendarEvent[] = []
      const today = new Date()
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate())
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)

      const vevents = comp.getAllSubcomponents('vevent')
      
      vevents.forEach((vevent: any, index: number) => {
        try {
          const event = new ICAL.Event(vevent)
          const startDate = event.startDate.toJSDate()
          
          // Only include today's events
          if (startDate >= startOfDay && startDate < endOfDay) {
            events.push({
              id: `ics-${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${index}`,
              title: event.summary || 'Untitled Event',
              description: event.description || undefined,
              startDate,
              endDate: event.endDate.toJSDate(),
              location: event.location || undefined,
              attendees: event.attendees?.map((att: any) => att.toString()) || [],
              isAllDay: this.isAllDayEvent(event, startDate),
              source: 'ics' as const
            })
          }
        } catch (error) {
          console.warn('Failed to parse ICS event:', error)
        }
      })

      await this.settingsManager.setCalendarEvents(events)

      return {
        events,
        totalEvents: events.length,
        importedAt: new Date(),
        source: 'ics'
      }
    } catch (error: any) {
      throw new CalendarError(
        `Failed to parse ICS file: ${error?.message || 'Unknown error'}`,
        'PARSE_ERROR',
        error instanceof Error ? error : undefined
      )
    }
  }

  private isAllDayEvent(event: any, startDate: Date): boolean {
    try {
      // Check if the event has a date-only start (no time component)
      if (event.startDate && event.startDate.isDate) {
        return true
      }
      
      // Fallback: check if duration is 24 hours and starts at midnight
      const endDate = event.endDate.toJSDate()
      const duration = endDate.getTime() - startDate.getTime()
      const is24Hours = duration === 24 * 60 * 60 * 1000
      const startsAtMidnight = startDate.getHours() === 0 && startDate.getMinutes() === 0 && startDate.getSeconds() === 0
      
      return is24Hours && startsAtMidnight
    } catch (error) {
      // Fallback to simple time check
      return startDate.getHours() === 0 && startDate.getMinutes() === 0
    }
  }

  private validateICSFile(filePath: string): void {
    // Path traversal protection
    const resolvedPath = path.resolve(filePath)
    const cwd = process.cwd()
    if (!resolvedPath.startsWith(cwd)) {
      throw new CalendarError('Path traversal not allowed', 'INVALID_FILE')
    }
    
    // File extension check
    if (!filePath.toLowerCase().endsWith('.ics')) {
      throw new CalendarError('File must be an .ics calendar file', 'INVALID_FILE')
    }
    
    // File existence check
    if (!fs.existsSync(filePath)) {
      throw new CalendarError('File does not exist', 'INVALID_FILE')
    }
    
    // File size check (prevent memory issues)
    const stats = fs.statSync(filePath)
    if (stats.size > 10 * 1024 * 1024) { // 10MB limit
      throw new CalendarError('ICS file too large (max 10MB)', 'INVALID_FILE')
    }
  }

  async getEvents(): Promise<CalendarEvent[]> {
    if (this.isAppleScriptAvailable) {
      try {
        const result = await this.extractAppleScriptEvents()
        return result.events
      } catch (error) {
        console.warn('AppleScript failed, falling back to stored events:', error)
      }
    }
    
    return await this.getStoredEvents()
  }

  async getStoredEvents(): Promise<CalendarEvent[]> {
    return await this.settingsManager.getCalendarEvents()
  }

  async clearEvents(): Promise<void> {
    await this.settingsManager.setCalendarEvents([])
  }

  isAppleScriptSupported(): boolean {
    return this.isAppleScriptAvailable
  }
}
