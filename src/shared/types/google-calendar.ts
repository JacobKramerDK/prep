/**
 * Google Calendar specific types and interfaces
 */

export interface GoogleCalendarCredentials {
  refreshToken: string
  accessToken?: string
  tokenExpiry?: Date
  userEmail?: string
}

export interface GoogleCalendarAuthState {
  isAuthenticated: boolean
  userEmail?: string
  isAuthenticating: boolean
  error?: string
}

export interface GoogleOAuthConfig {
  clientId: string
  scopes: string[]
  redirectUri: string
}

export interface GoogleCalendarEvent {
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
}

export class GoogleCalendarError extends Error {
  constructor(
    message: string,
    public code: 'AUTH_FAILED' | 'API_ERROR' | 'RATE_LIMITED' | 'NETWORK_ERROR' | 'TOKEN_EXPIRED' | 'CONFIG_MISSING',
    public cause?: Error
  ) {
    super(message)
    this.name = 'GoogleCalendarError'
  }
}
