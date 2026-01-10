export interface CalendarSyncStatus {
  isEnabled: boolean
  lastSyncTime: Date | null
  nextSyncTime: Date | null
  isRunning: boolean
  error: string | null
}

export interface CalendarSyncStatusIPC {
  isEnabled: boolean
  lastSyncTime: string | null
  nextSyncTime: string | null
  isRunning: boolean
  error: string | null
}

export interface CalendarSyncResult {
  success: boolean
  eventsCount: number
  syncTime: Date
  error: string | null
}

export interface CalendarSyncResultIPC {
  success: boolean
  eventsCount: number
  syncTime: string
  error: string | null
}

// Utility functions for converting between Date and string versions
export function calendarSyncStatusToIPC(status: CalendarSyncStatus): CalendarSyncStatusIPC {
  return {
    ...status,
    lastSyncTime: status.lastSyncTime?.toISOString() || null,
    nextSyncTime: status.nextSyncTime?.toISOString() || null
  }
}

export function calendarSyncStatusFromIPC(status: CalendarSyncStatusIPC): CalendarSyncStatus {
  return {
    ...status,
    lastSyncTime: status.lastSyncTime ? new Date(status.lastSyncTime) : null,
    nextSyncTime: status.nextSyncTime ? new Date(status.nextSyncTime) : null
  }
}

export function calendarSyncResultToIPC(result: CalendarSyncResult): CalendarSyncResultIPC {
  return {
    ...result,
    syncTime: result.syncTime.toISOString()
  }
}

export function calendarSyncResultFromIPC(result: CalendarSyncResultIPC): CalendarSyncResult {
  return {
    ...result,
    syncTime: new Date(result.syncTime)
  }
}
