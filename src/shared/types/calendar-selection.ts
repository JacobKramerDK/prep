export interface CalendarMetadata {
  uid: string           // Same as name due to AppleScript UID limitation
  name: string          // Display name and unique identifier
  title: string         // Calendar title (same as name for AppleScript)
  color?: string        // Calendar color for UI display
  type: 'local' | 'subscribed' | 'exchange' | 'caldav' | 'unknown'
  isVisible: boolean    // Whether calendar is currently visible
  eventCount?: number   // Optional: number of today's events
}

export interface CalendarSelectionSettings {
  selectedCalendarUids: string[]  // Actually calendar names due to AppleScript limitation
  lastDiscovery: string | null    // ISO date string
  discoveryCache: CalendarMetadata[]
  autoSelectNew: boolean          // Auto-select newly discovered calendars
}

export interface CalendarDiscoveryResult {
  calendars: CalendarMetadata[]
  totalCalendars: number
  discoveredAt: Date
  errors?: Array<{
    calendar?: string
    error: string
  }>
}

// IPC-safe version with string dates
export interface CalendarDiscoveryResultIPC {
  calendars: CalendarMetadata[]
  totalCalendars: number
  discoveredAt: string
  errors?: Array<{
    calendar?: string
    error: string
  }>
}

// Utility functions for converting between Date and string versions
export function calendarDiscoveryResultToIPC(result: CalendarDiscoveryResult): CalendarDiscoveryResultIPC {
  return {
    ...result,
    discoveredAt: result.discoveredAt.toISOString()
  }
}

export function calendarDiscoveryResultFromIPC(result: CalendarDiscoveryResultIPC): CalendarDiscoveryResult {
  return {
    ...result,
    discoveredAt: new Date(result.discoveredAt)
  }
}
