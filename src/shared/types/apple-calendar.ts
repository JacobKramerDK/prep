import { CalendarError } from './calendar'

export type AppleCalendarPermissionState = 'unknown' | 'granted' | 'denied' | 'checking'

export interface AppleCalendarStatus {
  permissionState: AppleCalendarPermissionState
  selectedCalendarCount: number
  totalCalendarCount: number
  lastPermissionCheck?: Date
  error?: CalendarError
}

export interface AppleCalendarSettings {
  selectedCalendarNames: string[]
  autoSelectNew: boolean
  lastDiscovery?: Date
}

// IPC-safe version with string dates
export interface AppleCalendarStatusIPC {
  permissionState: AppleCalendarPermissionState
  selectedCalendarCount: number
  totalCalendarCount: number
  lastPermissionCheck?: string
  error?: CalendarError
}

// Utility functions for converting between Date and string versions
export function appleCalendarStatusToIPC(status: AppleCalendarStatus): AppleCalendarStatusIPC {
  return {
    ...status,
    lastPermissionCheck: status.lastPermissionCheck?.toISOString()
  }
}

export function appleCalendarStatusFromIPC(status: AppleCalendarStatusIPC): AppleCalendarStatus {
  return {
    ...status,
    lastPermissionCheck: status.lastPermissionCheck ? new Date(status.lastPermissionCheck) : undefined
  }
}
