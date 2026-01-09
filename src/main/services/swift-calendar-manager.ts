import { execFile } from 'child_process'
import { promisify } from 'util'
import * as fs from 'fs'
import * as path from 'path'
import { CalendarEvent, CalendarError, CalendarImportResult } from '../../shared/types/calendar'

// Safely initialize execFileAsync with proper error handling
const execFileAsync = (() => {
  try {
    return execFile ? promisify(execFile) : null
  } catch (error) {
    return null
  }
})()

interface SwiftCalendarEvent {
  id: string
  title: string
  startDate: string  // ISO8601
  endDate: string    // ISO8601
  calendar: string
  location: string
  isAllDay: boolean
}

export class SwiftCalendarManager {
  private readonly isSwiftAvailable = process.platform === 'darwin'

  private getHelperPath(): string {
    // Handle both packaged and development modes
    try {
      const { app } = require('electron')
      if (app.isPackaged) {
        return path.join(process.resourcesPath, 'resources', 'bin', 'calendar-helper')
      }
    } catch (error) {
      // Only catch module not found errors, log others for debugging
      if (error instanceof Error && error.message.includes('Cannot find module')) {
        // Electron not available (e.g., in tests)
      } else {
        if (process.env.NODE_ENV === 'development') {
          console.warn('Unexpected error loading electron module:', error)
        }
      }
    }
    return path.join(__dirname, '../../../resources/bin/calendar-helper')
  }

  private isBinaryAvailable(): boolean {
    try {
      const helperPath = this.getHelperPath()
      return fs.existsSync(helperPath) && fs.statSync(helperPath).isFile()
    } catch (error) {
      return false
    }
  }

  async extractEvents(): Promise<CalendarImportResult> {
    if (!this.isSwiftAvailable) {
      throw new CalendarError('Swift calendar helper not supported on this platform', 'PLATFORM_UNSUPPORTED')
    }

    if (!this.isBinaryAvailable()) {
      throw new CalendarError(
        'Calendar helper binary not found. Run: npm run build:native',
        'PARSE_ERROR'
      )
    }

    if (!execFileAsync) {
      throw new CalendarError(
        'execFile not available in this environment',
        'PLATFORM_UNSUPPORTED'
      )
    }

    const helperPath = this.getHelperPath()

    try {
      console.log('Executing Swift calendar helper...')
      const startTime = Date.now()

      const { stdout, stderr } = await execFileAsync(helperPath, [], {
        timeout: 5000  // 5 seconds is plenty for Swift
      })

      const executionTime = Date.now() - startTime
      console.log(`Swift calendar helper completed in ${executionTime}ms`)

      if (stderr && stderr.includes('PERMISSION_DENIED')) {
        throw new CalendarError(
          'Calendar access permission required. Please grant access in System Preferences > Security & Privacy > Privacy > Calendar',
          'PERMISSION_DENIED'
        )
      }

      let events: SwiftCalendarEvent[]
      try {
        events = JSON.parse(stdout)
      } catch (parseError) {
        throw new CalendarError(
          `Failed to parse Swift calendar helper output: ${parseError instanceof Error ? parseError.message : 'Invalid JSON'}`,
          'PARSE_ERROR',
          parseError instanceof Error ? parseError : undefined
        )
      }

      console.log(`Parsed ${events.length} events from Swift helper`)

      const calendarEvents: CalendarEvent[] = events.map(event => ({
        id: event.id,
        title: event.title,
        description: undefined,
        startDate: new Date(event.startDate),
        endDate: new Date(event.endDate),
        location: event.location,
        attendees: [],
        isAllDay: event.isAllDay,
        source: 'swift' as const,
        calendarName: event.calendar
      }))

      return {
        events: calendarEvents,
        totalEvents: calendarEvents.length,
        importedAt: new Date(),
        source: 'swift'
      }

    } catch (error: any) {
      if (error.code === 'ENOENT') {
        throw new CalendarError(
          'Calendar helper binary not found. Run: npm run build:native',
          'PARSE_ERROR'
        )
      }

      if (error.code === 'TIMEOUT' || error.killed || error.signal === 'SIGTERM') {
        throw new CalendarError(
          'Swift calendar helper timed out after 5 seconds',
          'TIMEOUT',
          error instanceof Error ? error : undefined
        )
      }

      // Check for permission errors in stderr
      const errorMessage = error?.message?.toLowerCase() || ''
      const stderrMessage = error?.stderr?.toLowerCase() || ''
      const isPermissionError = error?.code === 'EACCES' || 
                               errorMessage.includes('not allowed') || 
                               errorMessage.includes('permission') ||
                               errorMessage.includes('access denied') ||
                               errorMessage.includes('not authorized') ||
                               stderrMessage.includes('permission_denied')
      
      if (isPermissionError) {
        throw new CalendarError(
          'Calendar access permission required. Please grant access in System Preferences > Security & Privacy > Privacy > Calendar',
          'PERMISSION_DENIED',
          error instanceof Error ? error : undefined
        )
      }

      throw new CalendarError(
        `Swift calendar helper failed: ${error?.message || 'Unknown error'}`,
        'PARSE_ERROR',
        error instanceof Error ? error : undefined
      )
    }
  }

  isSupported(): boolean {
    return this.isSwiftAvailable && this.isBinaryAvailable()
  }
}
