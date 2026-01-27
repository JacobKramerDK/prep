/**
 * Multi-account Google Calendar types and interfaces
 */

// Maximum number of Google accounts that can be connected simultaneously.
// Limited to 5 to prevent UI complexity and API quota issues.
// This aligns with typical user needs while maintaining performance.
export const MAX_GOOGLE_ACCOUNTS = 5

export interface GoogleAccount {
  email: string
  name?: string
  /** 
   * OAuth refresh token - SECURITY: This token is encrypted when stored 
   * by SettingsManager using Electron's safeStorage API 
   */
  refreshToken: string
  tokenExpiry?: string
  connectedAt: string // Use ISO string for consistent serialization
}

export interface MultiAccountGoogleCalendarState {
  connectedAccounts: GoogleAccount[]
  totalAccounts: number
  hasReachedLimit: boolean
}

export interface GoogleAccountUserInfo {
  email: string
  name?: string
  picture?: string
}

export interface MultiAccountCalendarEvent {
  id: string
  summary?: string
  description?: string
  start?: {
    dateTime?: string
    date?: string
    timeZone?: string
  }
  end?: {
    dateTime?: string
    date?: string
    timeZone?: string
  }
  location?: string
  attendees?: Array<{
    email: string
    displayName?: string
    responseStatus?: string
  }>
  creator?: {
    email: string
    displayName?: string
  }
  organizer?: {
    email: string
    displayName?: string
  }
  source: 'google'
  sourceAccountEmail: string
  calendarName?: string
  calendarId?: string
}

export interface AccountConnectionResult {
  success: boolean
  account?: GoogleAccount
  error?: string
  isLimitReached?: boolean
}

export interface AccountDisconnectionResult {
  success: boolean
  removedAccountEmail?: string
  error?: string
}

// Migration types for backward compatibility
export interface LegacySingleAccountData {
  refreshToken?: string
  tokenExpiry?: string
  userEmail?: string
  connected?: boolean
}

export class MultiAccountGoogleCalendarError extends Error {
  constructor(
    message: string,
    public code: 'ACCOUNT_LIMIT_REACHED' | 'ACCOUNT_NOT_FOUND' | 'DUPLICATE_ACCOUNT' | 'AUTH_FAILED' | 'API_ERROR' | 'MIGRATION_FAILED',
    public cause?: Error
  ) {
    super(message)
    this.name = 'MultiAccountGoogleCalendarError'
  }
}
