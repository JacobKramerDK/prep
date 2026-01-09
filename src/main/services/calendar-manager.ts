import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { exec } from 'child_process'
import { promisify } from 'util'
import * as crypto from 'crypto'
import { CalendarEvent, CalendarImportResult, CalendarError } from '../../shared/types/calendar'
import { CalendarMetadata, CalendarDiscoveryResult } from '../../shared/types/calendar-selection'
import { SettingsManager } from './settings-manager'
import { SwiftCalendarManager } from './swift-calendar-manager'
import { GoogleCalendarManager } from './google-calendar-manager'
import { GoogleOAuthManager } from './google-oauth-manager'

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
  private swiftCalendarManager: SwiftCalendarManager
  private googleOAuthManager: GoogleOAuthManager
  private googleCalendarManager: GoogleCalendarManager
  private readonly isAppleScriptAvailable = process.platform === 'darwin'
  private appleScriptPromise: Promise<CalendarImportResult> | null = null
  private isExtracting = false
  private lastExtraction: Date | null = null
  private readonly CACHE_DURATION = 2 * 60 * 1000 // 2 minutes for better freshness
  private readonly useSwiftBackend = true // Feature flag for Swift backend

  constructor() {
    this.settingsManager = new SettingsManager()
    this.swiftCalendarManager = new SwiftCalendarManager()
    this.googleOAuthManager = new GoogleOAuthManager()
    this.googleCalendarManager = new GoogleCalendarManager(this.googleOAuthManager)
    if (process.env.NODE_ENV !== 'test') {
      process.on('exit', () => this.dispose())
    }
  }

  async dispose(): Promise<void> {
    // Cleanup resources if needed
    this.googleOAuthManager.cleanup()
  }

  async extractAppleScriptEvents(selectedCalendarNames?: string[]): Promise<CalendarImportResult> {
    // Try Swift backend first if enabled and available
    if (this.useSwiftBackend && this.swiftCalendarManager.isSupported()) {
      try {
        console.log('Using Swift backend for calendar extraction')
        const result = await this.swiftCalendarManager.extractEvents()
        
        // Merge with existing Google Calendar events
        const existingEvents = await this.settingsManager.getCalendarEvents()
        const googleEvents = existingEvents.filter(event => event.source === 'google')
        const mergedEvents = [...googleEvents, ...result.events]
        
        await this.settingsManager.setCalendarEvents(mergedEvents)
        this.lastExtraction = new Date()
        
        return {
          ...result,
          events: mergedEvents,
          totalEvents: mergedEvents.length
        }
      } catch (error) {
        // Reset cache state on Swift failure to ensure fresh data from AppleScript
        this.lastExtraction = null
        if (process.env.NODE_ENV === 'development') {
          console.warn('Swift backend failed, falling back to AppleScript:', error instanceof Error ? error.message : 'Unknown error')
        }
        // Continue to AppleScript fallback
      }
    }

    // AppleScript fallback
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

    console.log('Selected calendars for extraction:', selectedCalendarNames)

    // Don't filter out the main Calendar - only filter truly problematic ones
    const filteredCalendars = selectedCalendarNames?.filter(name => 
      !['Birthdays', 'Siri Suggestions'].includes(name)
    ) || []
    
    console.log('Filtered calendars (excluding system calendars):', filteredCalendars)

    // Use a temporary file approach to avoid quote escaping issues
    const tempDir = os.tmpdir()
    const scriptPath = path.join(tempDir, `calendar-script-${crypto.randomUUID()}.scpt`)
    
    // Much faster AppleScript - get recent events and filter in JavaScript
    const script = filteredCalendars && filteredCalendars.length > 0 ? 
      // Working approach - individual property access (slower but reliable)
      `tell application "Calendar"
  set todayStart to current date
  set time of todayStart to 0
  set todayEnd to todayStart + 1 * days
  
  set targetCal to calendar "${filteredCalendars[0].replace(/"/g, '\\"')}"
  set todayEvents to (events of targetCal whose start date ≥ todayStart and start date < todayEnd)
  
  set allEvents to {}
  repeat with evt in todayEvents
    try
      set eventTitle to summary of evt
      set eventStart to start date of evt as string
      set eventEnd to end date of evt as string
      set end of allEvents to (eventTitle & "|" & eventStart & "|" & eventEnd & "|" & "${filteredCalendars[0].replace(/"/g, '\\"')}")
    end try
  end repeat
  
  return allEvents
end tell` :
      // Working fallback approach
      `tell application "Calendar"
  set todayStart to current date
  set time of todayStart to 0
  set todayEnd to todayStart + 1 * days
  
  set allEvents to {}
  
  -- Only process first 3 calendars to avoid timeout
  repeat with i from 1 to (count of calendars)
    if i > 3 then exit repeat
    try
      set cal to calendar i
      set calName to name of cal
      set dayEvents to (events of cal whose start date ≥ todayStart and start date < todayEnd)
      
      repeat with evt in dayEvents
        try
          set eventTitle to summary of evt
          set eventStart to start date of evt as string
          set eventEnd to end date of evt as string
          set end of allEvents to (eventTitle & "|" & eventStart & "|" & eventEnd & "|" & calName)
          if (count of allEvents) > 20 then exit repeat
        end try
      end repeat
      
      if (count of allEvents) > 20 then exit repeat
    end try
  end repeat
  
  return allEvents
end tell`

    try {
      // Write script to temporary file
      fs.writeFileSync(scriptPath, script, 'utf8')
      
      console.log('Executing AppleScript for calendar extraction...')
      const startTime = Date.now()
      
      // Execute with timeout for calendar extraction
      const { stdout } = await execAsync(`osascript "${scriptPath}"`, {
        timeout: 30000, // Reduced to 30s to avoid long hangs
        killSignal: 'SIGTERM'
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
          'Calendar extraction timed out after 30 seconds. Try using ICS file import instead, or check if Calendar app is responding.',
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

  // Google Calendar integration methods
  async authenticateGoogleCalendar(): Promise<string> {
    try {
      const authUrl = await this.googleOAuthManager.initiateOAuthFlow()
      
      // Start the OAuth server and handle the callback
      this.googleOAuthManager.startOAuthServer().catch(error => {
        console.error('OAuth server error:', error)
      })
      
      return authUrl
    } catch (error) {
      throw new CalendarError(
        'Failed to authenticate with Google Calendar',
        'PERMISSION_DENIED',
        error instanceof Error ? error : undefined
      )
    }
  }

  async getGoogleCalendarEvents(): Promise<CalendarImportResult> {
    try {
      const refreshToken = await this.settingsManager.getGoogleCalendarRefreshToken()
      if (!refreshToken) {
        throw new CalendarError('Google Calendar not authenticated', 'PERMISSION_DENIED')
      }

      const result = await this.googleCalendarManager.getEvents(refreshToken)
      
      // Merge with existing events from other sources
      const existingEvents = await this.settingsManager.getCalendarEvents()
      const nonGoogleEvents = existingEvents.filter(event => event.source !== 'google')
      const allEvents = [...nonGoogleEvents, ...result.events]
      
      await this.settingsManager.setCalendarEvents(allEvents)
      
      return result
    } catch (error) {
      throw new CalendarError(
        'Failed to fetch Google Calendar events',
        'PARSE_ERROR',
        error instanceof Error ? error : undefined
      )
    }
  }

  async isGoogleCalendarConnected(): Promise<boolean> {
    return await this.settingsManager.getGoogleCalendarConnected()
  }

  async disconnectGoogleCalendar(): Promise<void> {
    try {
      await this.settingsManager.clearGoogleCalendarSettings()
      
      // Remove Google Calendar events from stored events
      const existingEvents = await this.settingsManager.getCalendarEvents()
      const nonGoogleEvents = existingEvents.filter(event => event.source !== 'google')
      await this.settingsManager.setCalendarEvents(nonGoogleEvents)
    } catch (error) {
      throw new CalendarError(
        'Failed to disconnect Google Calendar',
        'PARSE_ERROR',
        error instanceof Error ? error : undefined
      )
    }
  }

  async getGoogleCalendarUserInfo(): Promise<{ email: string; name?: string } | null> {
    try {
      const refreshToken = await this.settingsManager.getGoogleCalendarRefreshToken()
      if (!refreshToken) {
        return null
      }

      return await this.googleCalendarManager.getUserInfo(refreshToken)
    } catch (error) {
      return null
    }
  }
}
