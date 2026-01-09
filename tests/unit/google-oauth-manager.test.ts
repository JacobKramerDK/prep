import { GoogleOAuthManager } from '../../src/main/services/google-oauth-manager'
import { GoogleCalendarError } from '../../src/shared/types/google-calendar'

// Mock dependencies
jest.mock('googleapis')
jest.mock('electron', () => ({
  safeStorage: {
    isEncryptionAvailable: jest.fn(() => true),
    encryptString: jest.fn((str: string) => Buffer.from(str + '_encrypted')),
    decryptString: jest.fn((buffer: Buffer) => buffer.toString().replace('_encrypted', ''))
  }
}))
jest.mock('express', () => {
  const mockApp = {
    get: jest.fn(),
    listen: jest.fn((port: number, host: string, callback: () => void) => {
      callback()
      return { close: jest.fn() }
    })
  }
  return jest.fn(() => mockApp)
})

describe('GoogleOAuthManager', () => {
  let oauthManager: GoogleOAuthManager

  beforeEach(() => {
    oauthManager = new GoogleOAuthManager()
    jest.clearAllMocks()
  })

  afterEach(() => {
    oauthManager.cleanup()
  })

  describe('initiateOAuthFlow', () => {
    it('should generate OAuth URL with PKCE parameters', async () => {
      const authUrl = await oauthManager.initiateOAuthFlow()
      
      expect(authUrl).toContain('https://accounts.google.com/o/oauth2/v2/auth')
      expect(authUrl).toContain('client_id=')
      expect(authUrl).toContain('redirect_uri=http://localhost:8080/oauth/callback')
      expect(authUrl).toContain('response_type=code')
      expect(authUrl).toContain('scope=https://www.googleapis.com/auth/calendar.readonly')
      expect(authUrl).toContain('code_challenge=')
      expect(authUrl).toContain('code_challenge_method=S256')
      expect(authUrl).toContain('state=')
      expect(authUrl).toContain('access_type=offline')
      expect(authUrl).toContain('prompt=consent')
    })

    it('should store code verifier and state temporarily', async () => {
      await oauthManager.initiateOAuthFlow()
      
      // We can't directly access tempStorage, but we can verify the URL contains the expected parameters
      const authUrl = await oauthManager.initiateOAuthFlow()
      expect(authUrl).toContain('code_challenge=')
      expect(authUrl).toContain('state=')
    })

    it('should throw GoogleCalendarError on failure', async () => {
      // Mock crypto to throw an error
      const originalCrypto = require('crypto')
      jest.doMock('crypto', () => ({
        ...originalCrypto,
        randomBytes: jest.fn(() => { throw new Error('Crypto error') })
      }))

      await expect(oauthManager.initiateOAuthFlow()).rejects.toThrow(GoogleCalendarError)
    })
  })

  describe('refreshAccessToken', () => {
    it('should refresh access token successfully', async () => {
      const mockOAuth2Client = {
        setCredentials: jest.fn(),
        refreshAccessToken: jest.fn().mockResolvedValue({
          credentials: {
            access_token: 'new_access_token',
            expiry_date: Date.now() + 3600000 // 1 hour from now
          }
        })
      }

      const { google } = require('googleapis')
      google.auth.OAuth2 = jest.fn(() => mockOAuth2Client)

      const result = await oauthManager.refreshAccessToken('refresh_token')

      expect(result.accessToken).toBe('new_access_token')
      expect(result.expiryDate).toBeInstanceOf(Date)
      expect(mockOAuth2Client.setCredentials).toHaveBeenCalledWith({
        refresh_token: 'refresh_token'
      })
    })

    it('should throw GoogleCalendarError when refresh fails', async () => {
      const mockOAuth2Client = {
        setCredentials: jest.fn(),
        refreshAccessToken: jest.fn().mockRejectedValue(new Error('Refresh failed'))
      }

      const { google } = require('googleapis')
      google.auth.OAuth2 = jest.fn(() => mockOAuth2Client)

      await expect(oauthManager.refreshAccessToken('invalid_token')).rejects.toThrow(GoogleCalendarError)
    })

    it('should throw GoogleCalendarError when credentials are invalid', async () => {
      const mockOAuth2Client = {
        setCredentials: jest.fn(),
        refreshAccessToken: jest.fn().mockResolvedValue({
          credentials: {
            // Missing access_token or expiry_date
          }
        })
      }

      const { google } = require('googleapis')
      google.auth.OAuth2 = jest.fn(() => mockOAuth2Client)

      await expect(oauthManager.refreshAccessToken('refresh_token')).rejects.toThrow(GoogleCalendarError)
    })
  })

  describe('token encryption/decryption', () => {
    it('should encrypt and decrypt tokens when safeStorage is available', () => {
      const token = 'test_token'
      const encrypted = oauthManager.encryptToken(token)
      const decrypted = oauthManager.decryptToken(encrypted)

      expect(decrypted).toBe(token)
    })

    it('should use fallback when safeStorage is not available', () => {
      const { safeStorage } = require('electron')
      safeStorage.isEncryptionAvailable.mockReturnValue(false)

      const token = 'test_token'
      const encrypted = oauthManager.encryptToken(token)
      const decrypted = oauthManager.decryptToken(encrypted)

      expect(decrypted).toBe(token)
    })

    it('should throw GoogleCalendarError when decryption fails', () => {
      expect(() => oauthManager.decryptToken('invalid_encrypted_data')).toThrow(GoogleCalendarError)
    })
  })

  describe('startOAuthServer', () => {
    it('should start OAuth server on localhost:8080', async () => {
      const express = require('express')
      const mockApp = express()

      const serverPromise = oauthManager.startOAuthServer()
      
      expect(mockApp.listen).toHaveBeenCalledWith(8080, 'localhost', expect.any(Function))
      
      // Simulate timeout to avoid hanging test
      setTimeout(() => oauthManager.cleanup(), 100)
      
      await expect(serverPromise).rejects.toThrow('OAuth flow timed out')
    })
  })

  describe('cleanup', () => {
    it('should cleanup resources', () => {
      expect(() => oauthManager.cleanup()).not.toThrow()
    })
  })
})
