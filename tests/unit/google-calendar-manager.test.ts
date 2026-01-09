import { GoogleCalendarManager } from '../../src/main/services/google-calendar-manager'
import { GoogleOAuthManager } from '../../src/main/services/google-oauth-manager'
import { GoogleCalendarError } from '../../src/shared/types/google-calendar'

// Mock dependencies
jest.mock('googleapis')
jest.mock('../../src/main/services/google-oauth-manager')

describe('GoogleCalendarManager', () => {
  let calendarManager: GoogleCalendarManager
  let mockOAuthManager: jest.Mocked<GoogleOAuthManager>

  beforeEach(() => {
    mockOAuthManager = new GoogleOAuthManager() as jest.Mocked<GoogleOAuthManager>
    calendarManager = new GoogleCalendarManager(mockOAuthManager)
    jest.clearAllMocks()
  })

  describe('getEvents', () => {
    const mockRefreshToken = 'refresh_token'
    const mockAccessToken = 'access_token'
    const mockGoogleEvent = {
      id: 'event_1',
      summary: 'Test Meeting',
      description: 'Test description',
      start: {
        dateTime: '2024-01-15T10:00:00Z'
      },
      end: {
        dateTime: '2024-01-15T11:00:00Z'
      },
      location: 'Conference Room A',
      attendees: [
        { email: 'user1@example.com' },
        { email: 'user2@example.com' }
      ]
    }

    beforeEach(() => {
      mockOAuthManager.refreshAccessToken.mockResolvedValue({
        accessToken: mockAccessToken,
        expiryDate: new Date(Date.now() + 3600000)
      })

      const mockCalendar = {
        events: {
          list: jest.fn().mockResolvedValue({
            data: {
              items: [mockGoogleEvent]
            }
          })
        }
      }

      const { google } = require('googleapis')
      google.auth.OAuth2 = jest.fn(() => ({
        setCredentials: jest.fn()
      }))
      google.calendar = jest.fn(() => mockCalendar)
    })

    it('should fetch and transform Google Calendar events', async () => {
      const result = await calendarManager.getEvents(mockRefreshToken)

      expect(result.events).toHaveLength(1)
      expect(result.events[0]).toMatchObject({
        id: 'google-event_1',
        title: 'Test Meeting',
        description: 'Test description',
        location: 'Conference Room A',
        attendees: ['user1@example.com', 'user2@example.com'],
        isAllDay: false,
        source: 'google',
        calendarName: 'Google Calendar'
      })
      expect(result.events[0].startDate).toBeInstanceOf(Date)
      expect(result.events[0].endDate).toBeInstanceOf(Date)
      expect(result.totalEvents).toBe(1)
      expect(result.source).toBe('google')
    })

    it('should handle all-day events', async () => {
      const allDayEvent = {
        ...mockGoogleEvent,
        start: { date: '2024-01-15' },
        end: { date: '2024-01-15' }
      }

      const mockCalendar = {
        events: {
          list: jest.fn().mockResolvedValue({
            data: { items: [allDayEvent] }
          })
        }
      }

      const { google } = require('googleapis')
      google.calendar = jest.fn(() => mockCalendar)

      const result = await calendarManager.getEvents(mockRefreshToken)

      expect(result.events[0].isAllDay).toBe(true)
      expect(result.events[0].startDate.getHours()).toBe(0)
    })

    it('should filter out events without IDs', async () => {
      const eventWithoutId = { ...mockGoogleEvent, id: undefined }
      const mockCalendar = {
        events: {
          list: jest.fn().mockResolvedValue({
            data: { items: [mockGoogleEvent, eventWithoutId] }
          })
        }
      }

      const { google } = require('googleapis')
      google.calendar = jest.fn(() => mockCalendar)

      const result = await calendarManager.getEvents(mockRefreshToken)

      expect(result.events).toHaveLength(1)
      expect(result.events[0].id).toBe('google-event_1')
    })

    it('should handle events with missing optional fields', async () => {
      const minimalEvent = {
        id: 'minimal_event',
        start: { dateTime: '2024-01-15T10:00:00Z' },
        end: { dateTime: '2024-01-15T11:00:00Z' }
      }

      const mockCalendar = {
        events: {
          list: jest.fn().mockResolvedValue({
            data: { items: [minimalEvent] }
          })
        }
      }

      const { google } = require('googleapis')
      google.calendar = jest.fn(() => mockCalendar)

      const result = await calendarManager.getEvents(mockRefreshToken)

      expect(result.events[0]).toMatchObject({
        id: 'google-minimal_event',
        title: 'Untitled Event',
        description: undefined,
        location: undefined,
        attendees: []
      })
    })

    it('should use custom time range when provided', async () => {
      const timeMin = new Date('2024-01-01T00:00:00Z')
      const timeMax = new Date('2024-01-31T23:59:59Z')
      const mockCalendar = {
        events: {
          list: jest.fn().mockResolvedValue({
            data: { items: [mockGoogleEvent] }
          })
        }
      }

      const { google } = require('googleapis')
      google.calendar = jest.fn(() => mockCalendar)

      await calendarManager.getEvents(mockRefreshToken, timeMin, timeMax, 100)

      expect(mockCalendar.events.list).toHaveBeenCalledWith({
        calendarId: 'primary',
        timeMin: timeMin.toISOString(),
        timeMax: timeMax.toISOString(),
        maxResults: 100,
        singleEvents: true,
        orderBy: 'startTime'
      })
    })

    it('should handle rate limiting with exponential backoff', async () => {
      const rateLimitError = { code: 429 }
      const mockCalendar = {
        events: {
          list: jest.fn()
            .mockRejectedValueOnce(rateLimitError)
            .mockRejectedValueOnce(rateLimitError)
            .mockResolvedValueOnce({
              data: { items: [mockGoogleEvent] }
            })
        }
      }

      const { google } = require('googleapis')
      google.calendar = jest.fn(() => mockCalendar)

      const result = await calendarManager.getEvents(mockRefreshToken)

      expect(mockCalendar.events.list).toHaveBeenCalledTimes(3)
      expect(result.events).toHaveLength(1)
    })

    it('should throw GoogleCalendarError on authentication failure', async () => {
      mockOAuthManager.refreshAccessToken.mockRejectedValue(new Error('Auth failed'))

      await expect(calendarManager.getEvents(mockRefreshToken)).rejects.toThrow(GoogleCalendarError)
    })

    it('should throw GoogleCalendarError on API failure', async () => {
      const mockCalendar = {
        events: {
          list: jest.fn().mockRejectedValue(new Error('API Error'))
        }
      }

      const { google } = require('googleapis')
      google.calendar = jest.fn(() => mockCalendar)

      await expect(calendarManager.getEvents(mockRefreshToken)).rejects.toThrow(GoogleCalendarError)
    })
  })

  describe('testConnection', () => {
    it('should return true for successful connection test', async () => {
      mockOAuthManager.refreshAccessToken.mockResolvedValue({
        accessToken: 'access_token',
        expiryDate: new Date()
      })

      const mockCalendar = {
        calendarList: {
          list: jest.fn().mockResolvedValue({ data: {} })
        }
      }

      const { google } = require('googleapis')
      google.auth.OAuth2 = jest.fn(() => ({ setCredentials: jest.fn() }))
      google.calendar = jest.fn(() => mockCalendar)

      const result = await calendarManager.testConnection('refresh_token')

      expect(result).toBe(true)
    })

    it('should return false for failed connection test', async () => {
      mockOAuthManager.refreshAccessToken.mockRejectedValue(new Error('Connection failed'))

      const result = await calendarManager.testConnection('invalid_token')

      expect(result).toBe(false)
    })
  })

  describe('getUserInfo', () => {
    it('should fetch user information', async () => {
      mockOAuthManager.refreshAccessToken.mockResolvedValue({
        accessToken: 'access_token',
        expiryDate: new Date()
      })

      const mockOAuth2 = {
        userinfo: {
          get: jest.fn().mockResolvedValue({
            data: {
              email: 'user@example.com',
              name: 'Test User'
            }
          })
        }
      }

      const { google } = require('googleapis')
      google.auth.OAuth2 = jest.fn(() => ({ setCredentials: jest.fn() }))
      google.oauth2 = jest.fn(() => mockOAuth2)

      const result = await calendarManager.getUserInfo('refresh_token')

      expect(result).toEqual({
        email: 'user@example.com',
        name: 'Test User'
      })
    })

    it('should throw GoogleCalendarError on failure', async () => {
      mockOAuthManager.refreshAccessToken.mockRejectedValue(new Error('Auth failed'))

      await expect(calendarManager.getUserInfo('refresh_token')).rejects.toThrow(GoogleCalendarError)
    })
  })
})
