export interface CalendarEvent {
  id: string
  title: string
  description?: string
  startDate: Date
  endDate: Date
  location?: string
  attendees?: string[]
  isAllDay: boolean
  source: 'applescript' | 'ics'
  calendarName?: string
}

// IPC-safe version with string dates for serialization
export interface CalendarEventIPC {
  id: string
  title: string
  description?: string
  startDate: string // ISO string
  endDate: string   // ISO string
  location?: string
  attendees?: string[]
  isAllDay: boolean
  source: 'applescript' | 'ics'
  calendarName?: string
}

export interface CalendarImportResult {
  events: CalendarEvent[]
  totalEvents: number
  importedAt: Date
  source: 'applescript' | 'ics'
  errors?: Array<{
    event?: string
    error: string
  }>
}

// IPC-safe version with string dates for serialization
export interface CalendarImportResultIPC {
  events: CalendarEventIPC[]
  totalEvents: number
  importedAt: string // ISO string
  source: 'applescript' | 'ics'
  errors?: Array<{
    event?: string
    error: string
  }>
}

// Utility functions for converting between Date and string versions
export function calendarEventToIPC(event: CalendarEvent): CalendarEventIPC {
  return {
    ...event,
    startDate: event.startDate.toISOString(),
    endDate: event.endDate.toISOString()
  }
}

export function calendarEventFromIPC(event: CalendarEventIPC): CalendarEvent {
  return {
    ...event,
    startDate: new Date(event.startDate),
    endDate: new Date(event.endDate)
  }
}

export function calendarImportResultToIPC(result: CalendarImportResult): CalendarImportResultIPC {
  return {
    ...result,
    events: result.events.map(calendarEventToIPC),
    importedAt: result.importedAt.toISOString()
  }
}

export function calendarImportResultFromIPC(result: CalendarImportResultIPC): CalendarImportResult {
  return {
    ...result,
    events: result.events.map(calendarEventFromIPC),
    importedAt: new Date(result.importedAt)
  }
}

export class CalendarError extends Error {
  constructor(
    message: string,
    public code: 'PERMISSION_DENIED' | 'INVALID_FILE' | 'PARSE_ERROR' | 'PLATFORM_UNSUPPORTED' | 'TIMEOUT',
    public cause?: Error
  ) {
    super(message)
    this.name = 'CalendarError'
  }
}
