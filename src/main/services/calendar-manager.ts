import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { exec } from 'child_process'
import { promisify } from 'util'
import * as crypto from 'crypto'
import { CalendarEvent, CalendarImportResult, CalendarError } from '../../shared/types/calendar'
import { CalendarMetadata, CalendarDiscoveryResult } from '../../shared/types/calendar-selection'
import { SettingsManager } from './settings-manager'

const execAsync = promisify(exec)

// Import ical.js - required for ICS file parsing
let ICAL: any
try {
  ICAL = require('ical.js')
} catch (error) {
  if (process.env.NODE_ENV !== 'test') {
    throw new Error('ical.js dependency is required for ICS file parsing functionality. Please install it with: npm install ical.js')
  }
}

export class CalendarManager {
  private settingsManager: SettingsManager
  private readonly isAppleScriptAvailable = process.platform === 'darwin'
  private appleScriptPromise: Promise<CalendarImportResult> | null = null
  private isExtracting = false
  private lastExtraction: Date | null = null
  private readonly CACHE_DURATION = 2 * 60 * 1000 // 2 minutes for better freshness

  constructor() {
    this.settingsManager = new SettingsManager()
    if (process.env.NODE_ENV !== 'test') {
      process.on('exit', () => this.dispose())
    }
  }

  async dispose(): Promise<void> {
    // Cleanup resources if needed
  }

  async extractAppleScriptEvents(selectedCalendarNames?: string[]): Promise<CalendarImportResult> {
    if (!this.isAppleScriptAvailable) {
      throw new CalendarError('AppleScript not available on this platform', 'PLATFORM_UNSUPPORTED')
    }

    // Return existing promise if already running (atomic check)
    if (this.isExtracting && this.appleScriptPromise) {
      if (process.env.NODE_ENV === 'development') {
        console.log('AppleScript extraction already in progress, returning existing promise')
      }
      return this.appleScriptPromise
    }

    // Check cache first
    if (this.lastExtraction && Date.now() - this.lastExtraction.getTime() < this.CACHE_DURATION) {
      const cachedEvents = await this.getStoredEvents()
      return {
        events: cachedEvents,
        totalEvents: cachedEvents.length,
        importedAt: this.lastExtraction,
        source: 'applescript'
      }
    }

    // Set atomic flag before creating promise
    this.isExtracting = true
    this.appleScriptPromise = this.performAppleScriptExtraction(selectedCalendarNames)
    
    try {
      const result = await this.appleScriptPromise
      this.lastExtraction = new Date()
      return result
    } finally {
      // Atomic cleanup
      this.isExtracting = false
      this.appleScriptPromise = null
    }
  }

  private async performAppleScriptExtraction(selectedCalendarNames?: string[]): Promise<CalendarImportResult> {
    await this.checkAppleScriptPermissions()

    // Use a temporary file approach to avoid quote escaping issues
    const tempDir = os.tmpdir()
    const scriptPath = path.join(tempDir, `calendar-script-${crypto.randomUUID()}.scpt`)
    
    // Optimized AppleScript - only get today's events from selected calendars
    const script = selectedCalendarNames && selectedCalendarNames.length > 0 ? 
      // Process only selected calendars
      `tell application "Calendar"
  set todayStart to current date
  set time of todayStart to 0
  set todayEnd to todayStart + 1 * days
  
  set selectedNames to {${selectedCalendarNames.map(name => `"${name.replace(/"/g, '\\"')}"`).join(', ')}}
  set allEvents to {}
  
  repeat with selectedName in selectedNames
    try
      set targetCal to calendar selectedName
      set dayEvents to (events of targetCal whose start date ≥ todayStart and start date < todayEnd)
      repeat with evt in dayEvents
        try
          set eventTitle to summary of evt
          set eventStart to start date of evt as string
          set eventEnd to end date of evt as string
          set end of allEvents to (eventTitle & "|" & eventStart & "|" & eventEnd & "|" & selectedName)
        end try
      end repeat
    on error
      -- Skip calendar if not found
    end try
  end repeat
  
  return allEvents
end tell` :
      // Process all calendars (fallback)
      `tell application "Calendar"
  set todayStart to current date
  set time of todayStart to 0
  set todayEnd to todayStart + 1 * days
  
  set allEvents to {}
  repeat with cal in calendars
    try
      set calName to name of cal
      set dayEvents to (events of cal whose start date ≥ todayStart and start date < todayEnd)
      repeat with evt in dayEvents
        try
          set eventTitle to summary of evt
          set eventStart to start date of evt as string
          set eventEnd to end date of evt as string
          set end of allEvents to (eventTitle & "|" & eventStart & "|" & eventEnd & "|" & calName)
        end try
      end repeat
    end try
  end repeat
  
  return allEvents
end tell`

    try {
      // Write script to temporary file
      fs.writeFileSync(scriptPath, script, 'utf8')
      
      console.log('Executing AppleScript for calendar extraction...')
      const startTime = Date.now()
      
      // Execute with longer timeout for large calendars
      const { stdout } = await execAsync(`osascript "${scriptPath}"`, {
        timeout: 30000 // 30 second timeout for large calendars
      })
      
      const executionTime = Date.now() - startTime
      console.log(`AppleScript completed in ${executionTime}ms`)
      
      const events = this.parseOSAScriptResult(stdout.trim())
      console.log(`Parsed ${events.length} events from AppleScript`)
      
      // Clean up temporary file
      try {
        fs.unlinkSync(scriptPath)
      } catch (cleanupError) {
        // Ignore cleanup errors
      }
      
      await this.settingsManager.setCalendarEvents(events)
      
      return {
        events,
        totalEvents: events.length,
        importedAt: new Date(),
        source: 'applescript'
      }
    } catch (error: any) {
      // Clean up temporary file on error
      try {
        fs.unlinkSync(scriptPath)
      } catch (cleanupError) {
        // Ignore cleanup errors
      }
      
      // If the script fails or times out, provide better error handling
      if (error.code === 'TIMEOUT' || error.killed || error.signal === 'SIGTERM') {
        throw new CalendarError(
          'Calendar extraction timed out after 30 seconds. This can happen with very large calendars. Try using ICS file import instead.',
          'TIMEOUT',
          error instanceof Error ? error : undefined
        )
      }
      
      // Check if it's a permission error - use multiple indicators for robustness
      const errorMessage = error?.message?.toLowerCase() || ''
      const isPermissionError = error?.code === 'EACCES' || 
                               errorMessage.includes('not allowed') || 
                               errorMessage.includes('permission') ||
                               errorMessage.includes('access denied') ||
                               errorMessage.includes('not authorized')
      
      if (isPermissionError) {
        throw new CalendarError(
          'Calendar access permission required. Please grant access in System Preferences > Security & Privacy > Privacy > Calendar',
          'PERMISSION_DENIED',
          error instanceof Error ? error : undefined
        )
      }
      
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
        throw new Error(`Invalid date format: ${dateStr}`)
      }
      
      return parsed
    } catch (error) {
      throw new CalendarError(
        `Failed to parse AppleScript date: ${dateStr}`,
        'PARSE_ERROR',
        error instanceof Error ? error : undefined
      )
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
              id: `applescript-${crypto.randomUUID()}`,
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
          if (process.env.NODE_ENV === 'development') {
            console.debug('Skipped invalid event:', error instanceof Error ? error.message : 'Unknown error', 'Event data:', match)
          }
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
              id: `applescript-${crypto.randomUUID()}`,
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
          if (process.env.NODE_ENV === 'development') {
            console.debug('Skipped invalid event in fallback:', error instanceof Error ? error.message : 'Unknown error', 'Event data:', eventString)
          }
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
      const errorMessage = error?.message?.toLowerCase() || ''
      const isPermissionError = error?.code === 'EACCES' || 
                               errorMessage.includes('not allowed') || 
                               errorMessage.includes('permission') ||
                               errorMessage.includes('access denied') ||
                               errorMessage.includes('not authorized')
      
      if (isPermissionError) {
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
              id: `ics-${crypto.randomUUID()}`,
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
    // Robust path traversal protection
    const resolvedPath = path.resolve(filePath)
    const cwd = path.resolve(process.cwd())
    const relativePath = path.relative(cwd, resolvedPath)
    
    // Check if the relative path contains '..' components or is outside cwd
    if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
      throw new CalendarError('Path traversal not allowed', 'INVALID_FILE')
    }
    
    // Additional security: ensure no '..' components anywhere in the path
    if (relativePath.split(path.sep).includes('..')) {
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
    // Only return stored events, don't auto-extract
    return await this.getStoredEvents()
  }

  async getStoredEvents(): Promise<CalendarEvent[]> {
    return await this.settingsManager.getCalendarEvents()
  }

  async clearEvents(): Promise<void> {
    await this.settingsManager.setCalendarEvents([])
  }

  async invalidateCache(): Promise<void> {
    this.lastExtraction = null
  }

  isAppleScriptSupported(): boolean {
    return this.isAppleScriptAvailable
  }

  async discoverCalendars(): Promise<CalendarDiscoveryResult> {
    if (!this.isAppleScriptAvailable) {
      throw new CalendarError('AppleScript not supported on this platform', 'PLATFORM_UNSUPPORTED')
    }

    const script = `tell application "Calendar"
    set calendarList to {}
    repeat with cal in calendars
      try
        set calName to name of cal
        set calWritable to writable of cal
        set calDescription to description of cal
        set calColor to color of cal
        set end of calendarList to (calName & "|||" & calWritable & "|||" & calDescription & "|||" & calColor)
      end try
    end repeat
    return calendarList
  end tell`

    try {
      const result = await this.executeAppleScriptRaw(script)
      const calendars: CalendarMetadata[] = []
      const errors: Array<{calendar?: string, error: string}> = []

      if (result && result.trim()) {
        // AppleScript returns comma-separated values on a single line
        // Split by comma and process each calendar entry
        const calendarEntries = result.trim().split(', ')
        
        for (const entry of calendarEntries) {
          try {
            const parts = entry.split('|||')
            if (parts.length >= 4) {
              calendars.push({
                uid: parts[0].trim(), // Use name as UID since UID property doesn't exist
                name: parts[0].trim(),
                title: parts[0].trim(),
                type: parts[1] === 'true' ? 'local' : 'subscribed',
                isVisible: true,
                color: parts[3].trim()
              })
            }
          } catch (parseError) {
            errors.push({
              calendar: entry,
              error: parseError instanceof Error ? parseError.message : 'Parse error'
            })
          }
        }
      }

      return {
        calendars,
        totalCalendars: calendars.length,
        discoveredAt: new Date(),
        errors: errors.length > 0 ? errors : undefined
      }
    } catch (error: any) {
      // Use existing error handling pattern from lines 160-180
      const errorMessage = error?.message?.toLowerCase() || ''
      const isPermissionError = error?.code === 'EACCES' || 
                               errorMessage.includes('not allowed') || 
                               errorMessage.includes('permission') ||
                               errorMessage.includes('access denied') ||
                               errorMessage.includes('not authorized')
      
      if (isPermissionError) {
        throw new CalendarError(
          'Calendar access permission required. Please grant access in System Preferences > Security & Privacy > Privacy > Calendar',
          'PERMISSION_DENIED',
          error instanceof Error ? error : undefined
        )
      }

      throw new CalendarError(
        `Failed to discover calendars: ${error?.message || 'Unknown error'}`,
        'PARSE_ERROR',
        error instanceof Error ? error : undefined
      )
    }
  }

  private async executeAppleScriptRaw(script: string): Promise<string> {
    await this.checkAppleScriptPermissions()

    // Use a temporary file approach to avoid quote escaping issues
    const tempDir = os.tmpdir()
    const scriptPath = path.join(tempDir, `calendar-discovery-${crypto.randomUUID()}.scpt`)
    
    try {
      // Write script to temporary file
      fs.writeFileSync(scriptPath, script, 'utf8')
      
      // Execute with timeout
      const { stdout } = await execAsync(`osascript "${scriptPath}"`, {
        timeout: 10000 // 10 second timeout for discovery
      })
      
      // Clean up temporary file
      try {
        fs.unlinkSync(scriptPath)
      } catch (cleanupError) {
        // Ignore cleanup errors
      }
      
      return stdout.trim()
    } catch (error: any) {
      // Clean up temporary file on error
      try {
        fs.unlinkSync(scriptPath)
      } catch (cleanupError) {
        // Ignore cleanup errors
      }
      
      throw error
    }
  }
}
