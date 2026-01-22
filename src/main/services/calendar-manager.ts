import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { exec } from 'child_process'
import { promisify } from 'util'
import * as crypto from 'crypto'
import { CalendarEvent, CalendarImportResult, CalendarError } from '../../shared/types/calendar'
import { CalendarMetadata, CalendarDiscoveryResult } from '../../shared/types/calendar-selection'
import { AppleCalendarStatus, AppleCalendarPermissionState } from '../../shared/types/apple-calendar'
import { SettingsManager } from './settings-manager'
import { SwiftCalendarManager } from './swift-calendar-manager'
import { GoogleCalendarManager } from './google-calendar-manager'
import { GoogleOAuthManager } from './google-oauth-manager'
import { PlatformDetector } from './platform-detector'
import { Debug } from '../../shared/utils/debug'

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
  private platformDetector: PlatformDetector
  private appleScriptPromise: Promise<CalendarImportResult> | null = null
  private isExtracting = false
  private lastExtraction: Date | null = null
  private readonly CACHE_DURATION = 2 * 60 * 1000 // 2 minutes for better freshness
  private readonly useSwiftBackend = true // Must get this working!
  private tempFiles: Set<string> = new Set() // Track temp files for cleanup

  constructor() {
    this.settingsManager = new SettingsManager()
    this.swiftCalendarManager = new SwiftCalendarManager()
    this.googleOAuthManager = new GoogleOAuthManager()
    this.googleCalendarManager = new GoogleCalendarManager(this.googleOAuthManager)
    this.platformDetector = new PlatformDetector()
    if (process.env.NODE_ENV !== 'test') {
      process.on('exit', () => this.dispose())
      // Ensure cleanup on process termination
      process.on('SIGTERM', () => this.cleanup())
      process.on('SIGINT', () => this.cleanup())
    }
  }

  private cleanup(): void {
    // Clean up any remaining temporary files
    for (const tempFile of this.tempFiles) {
      try {
        if (fs.existsSync(tempFile)) {
          fs.unlinkSync(tempFile)
        }
      } catch (error) {
        // Ignore cleanup errors
      }
    }
    this.tempFiles.clear()
  }

  async dispose(): Promise<void> {
    // Cleanup resources if needed
    this.cleanup()
    this.googleOAuthManager.cleanup()
  }

  async extractAppleScriptEvents(selectedCalendarNames?: string[]): Promise<CalendarImportResult> {
    // Try Swift backend first if enabled and available
    if (this.useSwiftBackend && this.swiftCalendarManager.isSupported()) {
      try {
        Debug.log('[CALENDAR-MANAGER] Using Swift backend for calendar extraction')
        
        // First, ensure we have calendar permissions by running a simple AppleScript check
        // This will trigger the permission dialog if needed
        try {
          await this.checkAppleScriptPermissions()
        } catch (permissionError) {
          throw permissionError // Fall through to AppleScript
        }
        
        let result
        try {
          result = await this.swiftCalendarManager.extractEvents()
          
          // Apply Google Calendar detection to Swift results
          const enhancedEvents = this.enhanceEventSources(result.events)
          result = {
            ...result,
            events: enhancedEvents
          }
        } catch (swiftError) {
          throw swiftError
        }
        
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
    if (!this.platformDetector.isMacOS()) {
      throw new CalendarError('AppleScript not available on this platform', 'PLATFORM_UNSUPPORTED')
    }

    // Return existing promise if already running (atomic check)
    if (this.isExtracting && this.appleScriptPromise) {
      if (process.env.NODE_ENV === 'development') {
        Debug.log('[CALENDAR-MANAGER] AppleScript extraction already in progress, returning existing promise')
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

    if (process.env.NODE_ENV === 'development') {
      Debug.log('[CALENDAR-MANAGER] Selected calendars for extraction:', selectedCalendarNames)
    }

    // Don't filter out the main Calendar - only filter truly problematic ones
    const filteredCalendars = selectedCalendarNames?.filter(name => 
      !['Birthdays', 'Siri Suggestions'].includes(name)
    ) || []
    
    if (process.env.NODE_ENV === 'development') {
      Debug.log('[CALENDAR-MANAGER] Filtered calendars (excluding system calendars):', filteredCalendars)
    }

    // If no calendars are selected, fall back to discovering and using all available calendars
    if (filteredCalendars.length === 0) {
      if (process.env.NODE_ENV === 'development') {
        Debug.log('[CALENDAR-MANAGER] No calendars selected, discovering available calendars...')
      }
      try {
        const discoveryResult = await this.discoverCalendars()
        const availableCalendars = discoveryResult.calendars
          .filter(cal => cal.isVisible && !['Birthdays', 'Siri Suggestions'].includes(cal.name))
          .map(cal => cal.name)
        
        if (availableCalendars.length === 0) {
          throw new CalendarError('No available calendars found', 'NO_CALENDARS')
        }
        
        if (process.env.NODE_ENV === 'development') {
          Debug.log('[CALENDAR-MANAGER] Using discovered calendars:', availableCalendars)
        }
        
        // Use immutable pattern for clarity
        const finalCalendars = [...filteredCalendars, ...availableCalendars]
        filteredCalendars.length = 0
        filteredCalendars.push(...finalCalendars)
      } catch (error) {
        throw new CalendarError(
          `Failed to discover calendars: ${error instanceof Error ? error.message : 'Unknown error'}`,
          'DISCOVERY_FAILED'
        )
      }
    }

    // Use a temporary file approach to avoid quote escaping issues
    const tempDir = os.tmpdir()
    const scriptPath = path.join(tempDir, `calendar-script-${crypto.randomUUID()}.scpt`)
    
    // Track temp file for cleanup
    this.tempFiles.add(scriptPath)
    
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
      
      if (process.env.NODE_ENV === 'development') {
        Debug.log('[CALENDAR-MANAGER] Executing AppleScript for calendar extraction...')
      }
      const startTime = Date.now()
      
      // Execute with timeout for calendar extraction
      const { stdout } = await execAsync(`osascript "${scriptPath}"`, {
        timeout: 30000, // Reduced to 30s to avoid long hangs
        killSignal: 'SIGTERM'
      })
      
      const executionTime = Date.now() - startTime
      if (process.env.NODE_ENV === 'development') {
        Debug.log(`[CALENDAR-MANAGER] AppleScript completed in ${executionTime}ms`)
      }
      
      const events = this.parseOSAScriptResult(stdout.trim())
      if (process.env.NODE_ENV === 'development') {
        Debug.log(`[CALENDAR-MANAGER] Parsed ${events.length} events from AppleScript`)
      }
      
      // Clean up temporary file
      try {
        fs.unlinkSync(scriptPath)
        this.tempFiles.delete(scriptPath)
      } catch (cleanupError) {
        // Ignore cleanup errors
      }
      
      // Apply Google Calendar detection to AppleScript results
      const enhancedEvents = this.enhanceEventSources(events)
      
      await this.settingsManager.setCalendarEvents(enhancedEvents)
      
      return {
        events: enhancedEvents,
        totalEvents: enhancedEvents.length,
        importedAt: new Date(),
        source: 'applescript'
      }
    } catch (error: any) {
      // Clean up temporary file on error
      try {
        fs.unlinkSync(scriptPath)
        this.tempFiles.delete(scriptPath)
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
    if (!this.platformDetector.isMacOS()) return false
    
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
    return this.platformDetector.isMacOS()
  }

  async discoverCalendars(): Promise<CalendarDiscoveryResult> {
    if (!this.platformDetector.isMacOS()) {
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
    
    // Track temp file for cleanup
    this.tempFiles.add(scriptPath)
    
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
        this.tempFiles.delete(scriptPath)
      } catch (cleanupError) {
        // Ignore cleanup errors
      }
      
      return stdout.trim()
    } catch (error: any) {
      // Clean up temporary file on error
      try {
        fs.unlinkSync(scriptPath)
        this.tempFiles.delete(scriptPath)
      } catch (cleanupError) {
        // Ignore cleanup errors
      }
      
      throw error
    }
  }

  // Google Calendar integration methods
  async authenticateGoogleCalendar(): Promise<string> {
    try {
      Debug.log('[GOOGLE-CALENDAR] Starting Google Calendar authentication')
      const authUrl = await this.googleOAuthManager.initiateOAuthFlow()
      Debug.log('[GOOGLE-CALENDAR] OAuth flow initiated, auth URL generated')
      
      // Start the OAuth server and handle the callback
      this.googleOAuthManager.startOAuthServer().catch(error => {
        Debug.error('[GOOGLE-CALENDAR] OAuth server error:', error instanceof Error ? error.message : 'Unknown error')
        console.error('OAuth server error:', error)
      })
      
      Debug.log('[GOOGLE-CALENDAR] OAuth server started, waiting for callback')
      return authUrl
    } catch (error) {
      Debug.error('[GOOGLE-CALENDAR] Authentication failed:', error instanceof Error ? error.message : 'Unknown error')
      throw new CalendarError(
        'Failed to authenticate with Google Calendar',
        'PERMISSION_DENIED',
        error instanceof Error ? error : undefined
      )
    }
  }

  async getGoogleCalendarEvents(): Promise<CalendarImportResult> {
    try {
      Debug.log('[GOOGLE-CALENDAR] Fetching Google Calendar events')
      const refreshToken = await this.settingsManager.getGoogleCalendarRefreshToken()
      if (!refreshToken) {
        throw new CalendarError('Google Calendar not authenticated', 'PERMISSION_DENIED')
      }

      Debug.log('[GOOGLE-CALENDAR] Using stored refresh token to fetch events')
      const result = await this.googleCalendarManager.getEvents(refreshToken)
      Debug.log(`[GOOGLE-CALENDAR] Retrieved ${result.events.length} events from Google Calendar`)
      
      // Merge with existing events from other sources
      const existingEvents = await this.settingsManager.getCalendarEvents()
      const nonGoogleEvents = existingEvents.filter(event => event.source !== 'google')
      const allEvents = [...nonGoogleEvents, ...result.events]
      
      await this.settingsManager.setCalendarEvents(allEvents)
      Debug.log(`[GOOGLE-CALENDAR] Successfully merged and stored ${allEvents.length} total events`)
      
      return result
    } catch (error) {
      Debug.error('[GOOGLE-CALENDAR] Failed to fetch events:', error instanceof Error ? error.message : 'Unknown error')
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

  /**
   * Detect if an Apple Calendar event is likely a Google Calendar event
   * based on calendar name and common patterns
   */
  private isLikelyGoogleCalendarEvent(event: CalendarEvent): boolean {
    // Skip if already marked as Google
    if (event.source === 'google') {
      return false
    }
    
    const calendarName = event.calendarName?.toLowerCase() || ''
    const title = event.title?.toLowerCase() || ''
    const location = event.location?.toLowerCase() || ''
    
    // Check for Google Calendar indicators in calendar name
    if (calendarName.includes('google') || 
        calendarName.includes('gmail') ||
        calendarName.includes('work') ||  // Common for work Google Calendars
        calendarName.includes('arbejde')) { // Danish for "work"
      return true
    }
    
    // Check for Google Meet or Zoom indicators (common in Google Calendar events)
    if (location.includes('meet.google.com') || 
        location.includes('zoom.us') || 
        title.includes('google meet') ||
        title.includes('zoom')) {
      return true
    }
    
    // Check for common Google Calendar event patterns in title
    // Events with "Placeholder:" prefix are often from Google Calendar
    if (title.startsWith('placeholder:')) {
      return true
    }
    
    return false
  }

  /**
   * Enhance Apple Calendar events by detecting Google Calendar events
   * and updating their source accordingly
   */
  private enhanceEventSources(events: CalendarEvent[]): CalendarEvent[] {
    // Guard against empty or invalid input
    if (!events || events.length === 0) {
      return events
    }
    
    return events.map(event => {
      if (event.source === 'applescript' && this.isLikelyGoogleCalendarEvent(event)) {
        if (process.env.NODE_ENV === 'development') {
          Debug.log(`[CALENDAR-MANAGER] Detected Google Calendar event in Apple Calendar: ${event.title}`)
        }
        return {
          ...event,
          source: 'google' as const
        }
      }
      return event
    })
  }

  /**
   * Deduplicate events based on title, start time, and calendar name
   * Preserves the source of the first occurrence (Google events take precedence)
   */
  private deduplicateEvents(events: CalendarEvent[]): CalendarEvent[] {
    const seen = new Map<string, number>() // Map key to index in deduplicated array
    const deduplicated: CalendarEvent[] = []

    for (const event of events) {
      // Create a unique key based on title, start time, and calendar
      const key = `${event.title}|${event.startDate.getTime()}|${event.calendarName}`
      
      if (!seen.has(key)) {
        seen.set(key, deduplicated.length)
        deduplicated.push(event)
      } else {
        // If we already have this event, prefer Google Calendar source over Apple Calendar
        const existingIndex = seen.get(key)!
        const existingEvent = deduplicated[existingIndex]
        
        if (event.source === 'google' && existingEvent.source !== 'google') {
          // Replace Apple Calendar event with Google Calendar event
          deduplicated[existingIndex] = event
        }
        
        if (process.env.NODE_ENV === 'development') {
          console.log(`Skipping duplicate event: ${event.title} at ${event.startDate} (keeping ${deduplicated[existingIndex].source} over ${event.source})`)
        }
      }
    }

    return deduplicated
  }

  // Automatic sync methods
  async hasConnectedCalendars(): Promise<boolean> {
    try {
      // Check if Google Calendar is connected
      const isGoogleConnected = await this.settingsManager.getGoogleCalendarConnected()
      
      // Check if Apple Calendar is available (macOS only)
      const isAppleAvailable = this.platformDetector.isMacOS()
      
      return isGoogleConnected || isAppleAvailable
    } catch (error) {
      return false
    }
  }

  async performAutomaticSync(): Promise<CalendarImportResult> {
    const allEvents: CalendarEvent[] = []
    let totalEvents = 0
    const errors: Array<{ event?: string; error: string }> = []
    let hasAnySuccess = false

    try {
      // Sync Google Calendar if connected
      const isGoogleConnected = await this.settingsManager.getGoogleCalendarConnected()
      if (isGoogleConnected) {
        try {
          const googleResult = await this.getGoogleCalendarEvents()
          allEvents.push(...googleResult.events)
          totalEvents += googleResult.totalEvents
          hasAnySuccess = true
        } catch (error) {
          errors.push({
            error: `Google Calendar sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`
          })
        }
      }

      // Sync Apple Calendar if available (macOS only)
      if (this.platformDetector.isMacOS()) {
        try {
          // Try Swift backend first, but fall back to AppleScript if it fails
          let appleEvents: CalendarEvent[] = []
          
          if (this.useSwiftBackend && this.swiftCalendarManager.isSupported()) {
            try {
              console.log('Attempting Swift backend for automatic sync')
              const swiftResult = await this.swiftCalendarManager.extractEvents()
              appleEvents = swiftResult.events
              hasAnySuccess = true
            } catch (swiftError) {
              console.log('Swift backend failed, falling back to AppleScript:', swiftError instanceof Error ? swiftError.message : 'Unknown error')
              
              // Fallback to AppleScript
              try {
                const calendarSelection = await this.settingsManager.getCalendarSelection()
                const selectedCalendarNames = calendarSelection.selectedCalendarUids
                
                const appleResult = await this.extractAppleScriptEvents(selectedCalendarNames)
                // Don't filter out Google events - they were correctly detected in extractAppleScriptEvents
                appleEvents = appleResult.events
                hasAnySuccess = true
              } catch (appleScriptError) {
                // Both Swift and AppleScript failed - add to errors but don't fail completely
                errors.push({
                  error: `Apple Calendar sync failed: ${appleScriptError instanceof Error ? appleScriptError.message : 'Unknown error'}`
                })
              }
            }
          } else {
            // Use AppleScript directly
            try {
              const calendarSelection = await this.settingsManager.getCalendarSelection()
              const selectedCalendarNames = calendarSelection.selectedCalendarUids
              
              const appleResult = await this.extractAppleScriptEvents(selectedCalendarNames)
              // Don't filter out Google events - they were correctly detected in extractAppleScriptEvents
              appleEvents = appleResult.events
              hasAnySuccess = true
            } catch (appleScriptError) {
              errors.push({
                error: `Apple Calendar sync failed: ${appleScriptError instanceof Error ? appleScriptError.message : 'Unknown error'}`
              })
            }
          }
          
          allEvents.push(...appleEvents)
          totalEvents += appleEvents.length
        } catch (error) {
          errors.push({
            error: `Apple Calendar sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`
          })
        }
      }

      // Apply Google Calendar detection and deduplication with better error handling
      let finalEvents = allEvents
      try {
        if (allEvents.length > 0) {
          const enhancedEvents = this.enhanceEventSources(allEvents)
          finalEvents = this.deduplicateEvents(enhancedEvents)
          
          if (process.env.NODE_ENV === 'development') {
            const googleEvents = finalEvents.filter(e => e.source === 'google')
            console.log(`Enhanced events: ${googleEvents.length} Google Calendar events detected`)
          }
        }
      } catch (processingError) {
        // If event processing fails, use original events to prevent total failure
        console.error('Event processing failed, using original events:', processingError)
        finalEvents = allEvents
      }
      
      // Store all events
      await this.settingsManager.setCalendarEvents(finalEvents)

      // Return results even if some sources failed, as long as we have some success
      return {
        events: finalEvents,
        totalEvents: finalEvents.length,
        importedAt: new Date(),
        source: 'automatic-sync',
        errors: errors.length > 0 ? errors : undefined
      }
    } catch (error) {
      // If we have partial success, return it with errors
      if (hasAnySuccess) {
        let finalEvents = allEvents
        try {
          finalEvents = this.deduplicateEvents(allEvents)
        } catch (processingError) {
          console.error('Event deduplication failed, using original events:', processingError)
        }
        
        return {
          events: finalEvents,
          totalEvents: finalEvents.length,
          importedAt: new Date(),
          source: 'automatic-sync',
          errors: [...errors, { error: `Sync completion failed: ${error instanceof Error ? error.message : 'Unknown error'}` }]
        }
      }
      
      // Complete failure - throw with error information
      throw new CalendarError(
        `Automatic sync failed: ${error instanceof Error ? error.message : 'Unknown error'}${errors.length > 0 ? '. Additional errors: ' + errors.map(e => e.error).join(', ') : ''}`,
        'PARSE_ERROR',
        error instanceof Error ? error : undefined
      )
    }
  }

  async syncTodaysEvents(): Promise<CalendarEvent[]> {
    const result = await this.performAutomaticSync()
    
    // Filter to only today's events
    const today = new Date()
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)

    return result.events.filter(event => {
      const eventStart = new Date(event.startDate)
      return eventStart >= startOfDay && eventStart < endOfDay
    })
  }

  // Apple Calendar specific methods
  private static readonly PERMISSION_CACHE_DURATION = 5 * 60 * 1000 // 5 minutes
  private appleCalendarPermissionCache: {
    state: AppleCalendarPermissionState
    timestamp: Date
  } | null = null

  async getAppleCalendarStatus(): Promise<AppleCalendarStatus> {
    if (!this.platformDetector.isMacOS()) {
      return {
        permissionState: 'denied',
        selectedCalendarCount: 0,
        totalCalendarCount: 0
      }
    }

    const permissionState = await this.getAppleCalendarPermissionState()
    const settings = await this.settingsManager.getCalendarSelection()
    
    let totalCalendarCount = 0
    let discoveryError: CalendarError | undefined
    
    if (permissionState === 'granted') {
      try {
        const discovery = await this.discoverCalendars()
        totalCalendarCount = discovery.totalCalendars
      } catch (error) {
        // Only catch discovery-specific errors, not permission errors
        if (error instanceof CalendarError && error.code === 'DISCOVERY_FAILED') {
          discoveryError = error
        } else {
          // Re-throw permission-related errors to avoid masking them
          throw error
        }
      }
    }

    return {
      permissionState,
      selectedCalendarCount: settings.selectedCalendarUids.length,
      totalCalendarCount,
      lastPermissionCheck: new Date(),
      error: discoveryError
    }
  }

  async getAppleCalendarPermissionState(): Promise<AppleCalendarPermissionState> {
    if (!this.platformDetector.isMacOS()) {
      return 'denied'
    }

    // Check cache first
    if (this.appleCalendarPermissionCache) {
      const now = new Date()
      const cacheAge = now.getTime() - this.appleCalendarPermissionCache.timestamp.getTime()
      if (cacheAge < CalendarManager.PERMISSION_CACHE_DURATION) {
        return this.appleCalendarPermissionCache.state
      }
    }

    try {
      await this.checkAppleScriptPermissions()
      const state: AppleCalendarPermissionState = 'granted'
      this.appleCalendarPermissionCache = { state, timestamp: new Date() }
      return state
    } catch (error) {
      const state: AppleCalendarPermissionState = 'denied'
      this.appleCalendarPermissionCache = { state, timestamp: new Date() }
      return state
    }
  }

  isAppleCalendarAvailable(): boolean {
    return this.platformDetector.isMacOS()
  }

  async updateAppleCalendarSelection(selectedCalendarNames: string[]): Promise<void> {
    const settings = await this.settingsManager.getCalendarSelection()
    await this.settingsManager.updateCalendarSelection({
      ...settings,
      selectedCalendarUids: selectedCalendarNames
    })
  }

  async extractAppleCalendarEvents(): Promise<CalendarImportResult> {
    if (!this.platformDetector.isMacOS()) {
      throw new CalendarError('Apple Calendar is only available on macOS', 'PLATFORM_UNSUPPORTED')
    }

    const settings = await this.settingsManager.getCalendarSelection()
    const selectedCalendars = settings.selectedCalendarUids.length > 0 ? settings.selectedCalendarUids : undefined
    
    return await this.extractAppleScriptEvents(selectedCalendars)
  }
}
