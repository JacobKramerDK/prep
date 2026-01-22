import { execFile, exec } from 'child_process'
import { promisify } from 'util'
import * as fs from 'fs'
import * as path from 'path'
import { CalendarEvent, CalendarError, CalendarImportResult } from '../../shared/types/calendar'
import { Debug } from '../../shared/utils/debug'

// Safely initialize execFileAsync with proper error handling
const execFileAsync = (() => {
  try {
    return execFile ? promisify(execFile) : null
  } catch (error) {
    return null
  }
})()

const execAsync = promisify(exec)

interface SwiftCalendarEvent {
  id: string
  title: string
  startDate: string  // ISO8601
  endDate: string    // ISO8601
  calendar: string
  location: string
  notes?: string
  attendees?: string[]
  url?: string
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
    
    // In development mode, resolve from project root
    // Use process.cwd() as it was working before (commit fa6f886)
    const projectRoot = process.cwd()
    const helperPath = path.join(projectRoot, 'resources', 'bin', 'calendar-helper')
    
    // Security validation: ensure the resolved path is within expected project boundaries
    const normalizedProjectRoot = path.normalize(projectRoot)
    const normalizedHelperPath = path.normalize(helperPath)
    
    if (!normalizedHelperPath.startsWith(normalizedProjectRoot)) {
      throw new Error('Security violation: Binary path outside project boundaries')
    }
    
    return helperPath
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

    // Trigger calendar permission dialog via AppleScript first
    // This ensures calendar access is granted before running Swift binary
    try {
      await execAsync('osascript -e \'tell application "Calendar" to return "permission-check"\'')
    } catch (permissionError) {
      // Continue anyway - the Swift binary will handle the error
    }

    const helperPath = this.getHelperPath()

    try {
      Debug.log('[SWIFT-CALENDAR] Executing Swift calendar helper...')
      const startTime = Date.now()

      const { stdout, stderr } = await execFileAsync(helperPath, [], {
        timeout: 5000  // 5 seconds is plenty for Swift
      })

      const executionTime = Date.now() - startTime
      Debug.log(`[SWIFT-CALENDAR] Swift calendar helper completed in ${executionTime}ms`)

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

      Debug.log(`[SWIFT-CALENDAR] Parsed ${events.length} events from Swift helper`)

      const calendarEvents: CalendarEvent[] = []
      
      events.forEach((event, index) => {
        try {
          calendarEvents.push({
            id: event.id,
            title: event.title,
            description: event.notes,
            startDate: new Date(event.startDate),
            endDate: new Date(event.endDate),
            location: event.location,
            attendees: event.attendees || [],
            isAllDay: event.isAllDay,
            source: 'swift' as const,
            calendarName: event.calendar
          })
        } catch (parseError) {
          console.warn(`Failed to parse Swift event ${index}:`, parseError)
          // Skip invalid events rather than failing entirely
        }
      })

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
