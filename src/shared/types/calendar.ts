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

export class CalendarError extends Error {
  constructor(
    message: string,
    public code: 'PERMISSION_DENIED' | 'INVALID_FILE' | 'PARSE_ERROR' | 'PLATFORM_UNSUPPORTED',
    public cause?: Error
  ) {
    super(message)
    this.name = 'CalendarError'
  }
}
