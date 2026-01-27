import { google, calendar_v3 } from 'googleapis'
import { GoogleOAuthManager } from './google-oauth-manager'
import { CalendarEvent, CalendarError, CalendarImportResult } from '../../shared/types/calendar'
import { GoogleCalendarError } from '../../shared/types/google-calendar'
import { Debug } from '../../shared/utils/debug'

export class GoogleCalendarManager {
  private oauthManager: GoogleOAuthManager
  private requestQueue: Array<() => Promise<any>> = []
  private isProcessingQueue = false

  constructor(oauthManager: GoogleOAuthManager) {
    this.oauthManager = oauthManager
  }

  async getEvents(
    refreshToken: string,
    timeMin?: Date,
    timeMax?: Date,
    maxResults: number = 250
  ): Promise<CalendarImportResult> {
    try {
      const events = await this.makeRequestWithRetry(async () => {
        // Refresh access token
        const { accessToken } = await this.oauthManager.refreshAccessToken(refreshToken)
        
        // Set up OAuth2 client
        const oauth2Client = new google.auth.OAuth2()
        oauth2Client.setCredentials({
          access_token: accessToken
        })
        
        // Initialize Calendar API
        const calendar = google.calendar({ version: 'v3', auth: oauth2Client })
        
        // Set default time range if not provided (reduced from 90 to 30 days)
        const now = new Date()
        const defaultTimeMin = timeMin || new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) // 30 days ago
        const defaultTimeMax = timeMax || new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
        
        Debug.log(`[GOOGLE-CALENDAR] Searching events from ${defaultTimeMin.toISOString()} to ${defaultTimeMax.toISOString()}`)
        
        // First, get list of all accessible calendars
        const calendarListResponse = await calendar.calendarList.list()
        const allCalendars = calendarListResponse.data.items || []
        
        // Limit calendars to prevent API quota exhaustion (max 10 calendars)
        const MAX_CALENDARS = 10
        const calendars = allCalendars.slice(0, MAX_CALENDARS)
        
        if (allCalendars.length > MAX_CALENDARS) {
          Debug.log(`[GOOGLE-CALENDAR] Limited to ${MAX_CALENDARS} calendars (found ${allCalendars.length} total)`)
        }
        
        Debug.log(`[GOOGLE-CALENDAR] Processing ${calendars.length} calendars`)
        calendars.forEach(cal => {
          Debug.log(`[GOOGLE-CALENDAR] Calendar: ${cal.summary || cal.id} (ID: ${cal.id})`)
        })
        
        // Fetch events from calendars with minimum events per calendar
        const allEvents: calendar_v3.Schema$Event[] = []
        const MIN_EVENTS_PER_CALENDAR = 50
        const eventsPerCalendar = Math.max(MIN_EVENTS_PER_CALENDAR, Math.ceil(maxResults / calendars.length))
        
        for (const cal of calendars) {
          if (!cal.id) continue
          
          try {
            Debug.log(`[GOOGLE-CALENDAR] Fetching events from calendar: ${cal.summary || cal.id}`)
            const response = await calendar.events.list({
              calendarId: cal.id,
              timeMin: defaultTimeMin.toISOString(),
              timeMax: defaultTimeMax.toISOString(),
              maxResults: eventsPerCalendar,
              singleEvents: true,
              orderBy: 'startTime'
            })
            
            const eventCount = (response.data.items || []).length
            Debug.log(`[GOOGLE-CALENDAR] Found ${eventCount} events in calendar: ${cal.summary || cal.id}`)
            
            const calendarEvents = (response.data.items || []).map(event => ({
              ...event,
              // Add calendar info to event for better identification
              extendedProperties: {
                ...event.extendedProperties,
                private: {
                  ...event.extendedProperties?.private,
                  calendarName: cal.summary || cal.id || '',
                  calendarId: cal.id || ''
                }
              }
            }))
            
            allEvents.push(...calendarEvents)
            
            // Add delay between calendar requests to respect rate limits
            await new Promise(resolve => setTimeout(resolve, 200))
          } catch (calError) {
            // Log error but continue with other calendars
            Debug.error(`[GOOGLE-CALENDAR] Failed to fetch events from calendar ${cal.summary || cal.id}:`, calError)
            console.warn(`Failed to fetch events from calendar ${cal.summary || cal.id}:`, calError)
          }
        }
        
        Debug.log(`[GOOGLE-CALENDAR] Total events collected: ${allEvents.length}`)
        return allEvents
      })
      
      const transformedEvents = events
        .filter(event => event.id) // Filter out events without IDs
        .map(event => this.transformGoogleEvent(event))
      
      return {
        events: transformedEvents,
        totalEvents: transformedEvents.length,
        importedAt: new Date(),
        source: 'google'
      }
    } catch (error) {
      if (error instanceof GoogleCalendarError) {
        throw error
      }
      throw new GoogleCalendarError(
        'Failed to fetch Google Calendar events',
        'API_ERROR',
        error as Error
      )
    }
  }

  private transformGoogleEvent(googleEvent: calendar_v3.Schema$Event): CalendarEvent {
    if (!googleEvent.id) {
      throw new GoogleCalendarError('Event missing required ID', 'API_ERROR')
    }
    
    const startDate = googleEvent.start?.dateTime 
      ? new Date(googleEvent.start.dateTime)
      : new Date((googleEvent.start?.date || '') + 'T00:00:00')
      
    const endDate = googleEvent.end?.dateTime
      ? new Date(googleEvent.end.dateTime) 
      : new Date((googleEvent.end?.date || '') + 'T23:59:59')
    
    // Extract calendar name from extended properties if available
    const calendarName = googleEvent.extendedProperties?.private?.calendarName || 'Google Calendar'
    const calendarId = googleEvent.extendedProperties?.private?.calendarId || 'primary'
      
    return {
      id: `google-${calendarId}-${googleEvent.id}`,
      title: googleEvent.summary || 'Untitled Event',
      description: googleEvent.description || undefined,
      startDate,
      endDate,
      location: googleEvent.location || undefined,
      attendees: googleEvent.attendees?.map((a) => a.email || '').filter(email => email) || [],
      isAllDay: !googleEvent.start?.dateTime,
      source: 'google' as const,
      calendarName: calendarName,
      calendarId: calendarId
    }
  }

  private async makeRequestWithRetry<T>(request: () => Promise<T>, maxRetries = 3): Promise<T> {
    return new Promise((resolve, reject) => {
      this.requestQueue.push(async () => {
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
          try {
            const result = await request()
            resolve(result)
            return
          } catch (error: any) {
            // Handle rate limiting
            if (error.code === 429 || error.code === 403) {
              if (attempt < maxRetries) {
                const delay = Math.min(1000 * Math.pow(2, attempt) + Math.random() * 1000, 30000)
                await new Promise(resolve => setTimeout(resolve, delay))
                continue
              }
            }
            
            // Handle token expiration
            if (error.code === 401) {
              reject(new GoogleCalendarError('Authentication failed', 'TOKEN_EXPIRED', error))
              return
            }
            
            // Handle network errors
            if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
              reject(new GoogleCalendarError('Network error', 'NETWORK_ERROR', error))
              return
            }
            
            if (attempt === maxRetries) {
              reject(new GoogleCalendarError('Max retries exceeded', 'API_ERROR', error))
              return
            }
          }
        }
      })
      
      this.processQueue()
    })
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue || this.requestQueue.length === 0) {
      return
    }
    
    this.isProcessingQueue = true
    
    while (this.requestQueue.length > 0) {
      const request = this.requestQueue.shift()
      if (request) {
        try {
          await request()
        } catch (error) {
          // Error handling is done in the request itself
        }
        
        // Add small delay between requests to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }
    
    this.isProcessingQueue = false
  }

  async testConnection(refreshToken: string): Promise<boolean> {
    try {
      const { accessToken } = await this.oauthManager.refreshAccessToken(refreshToken)
      
      const oauth2Client = new google.auth.OAuth2()
      oauth2Client.setCredentials({
        access_token: accessToken
      })
      
      const calendar = google.calendar({ version: 'v3', auth: oauth2Client })
      
      // Test with a minimal request
      await calendar.calendarList.list({
        maxResults: 1
      })
      
      return true
    } catch (error) {
      return false
    }
  }

  async getUserInfo(refreshToken: string): Promise<{ email: string; name?: string }> {
    try {
      const { accessToken } = await this.oauthManager.refreshAccessToken(refreshToken)
      
      const oauth2Client = new google.auth.OAuth2()
      oauth2Client.setCredentials({
        access_token: accessToken
      })
      
      const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client })
      const response = await oauth2.userinfo.get()
      
      return {
        email: response.data.email || '',
        name: response.data.name || undefined
      }
    } catch (error) {
      throw new GoogleCalendarError(
        'Failed to get user info',
        'API_ERROR',
        error as Error
      )
    }
  }
}
