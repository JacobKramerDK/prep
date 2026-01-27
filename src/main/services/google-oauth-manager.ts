import { google } from 'googleapis'
import { safeStorage } from 'electron'
import * as crypto from 'crypto'
import express, { Request, Response } from 'express'
import { Server } from 'http'
import { GoogleCalendarError, GoogleCalendarCredentials, GoogleOAuthConfig } from '../../shared/types/google-calendar'
import { MultiAccountGoogleManager } from './multi-account-google-manager'
import { Debug } from '../../shared/utils/debug'
import { SettingsManager } from './settings-manager'
import type { GoogleAccountUserInfo } from '../../shared/types/multi-account-calendar'

// Load environment variables in development and production
// This allows users to create a .env file to override bundled credentials
try {
  require('dotenv').config()
} catch (error) {
  // dotenv not available or .env file doesn't exist - this is expected in production builds
  Debug.log('[ENV] dotenv not available, using system environment variables only')
}

export class GoogleOAuthManager {
  private CLIENT_ID: string | null
  private CLIENT_SECRET: string | null
  private isConfigured: boolean
  // OAuth scopes required for multi-account Google Calendar integration:
  // - calendar.readonly: Access to read calendar events and metadata
  // - userinfo.email: Required to identify and differentiate between multiple accounts
  // - userinfo.profile: Optional but provides better user experience with names/avatars
  private readonly SCOPES = [
    'https://www.googleapis.com/auth/calendar.readonly',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile'
  ]
  private readonly REDIRECT_URI = 'http://localhost:8080/oauth/callback'
  
  private tempStorage = new Map<string, string>()
  private oauthServer: Server | null = null
  private multiAccountManager?: MultiAccountGoogleManager

  constructor() {
    // Check for OAuth credentials but don't fail if missing
    const clientId = process.env.GOOGLE_CLIENT_ID
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET
    
    this.CLIENT_ID = clientId || null
    this.CLIENT_SECRET = clientSecret || null
    this.isConfigured = !!(clientId && clientSecret)
    
    if (!this.isConfigured) {
      Debug.log('[GOOGLE-OAUTH] OAuth credentials not configured - Google Calendar features will be disabled')
    }
  }

  async initialize(settingsManager: SettingsManager): Promise<void> {
    try {
      // Priority: 1. Stored credentials, 2. Environment variables
      const storedClientId = await settingsManager.getGoogleClientId()
      const storedClientSecret = await settingsManager.getGoogleClientSecret()
      
      if (storedClientId && storedClientSecret) {
        this.CLIENT_ID = storedClientId
        this.CLIENT_SECRET = storedClientSecret
        this.isConfigured = true
        Debug.log('[GOOGLE-OAUTH] Using stored credentials')
      } else {
        // Keep existing environment variable logic as fallback
        Debug.log('[GOOGLE-OAUTH] No stored credentials, using environment variables')
      }
      
      // Initialize multi-account manager after credentials are loaded
      this.multiAccountManager = new MultiAccountGoogleManager(settingsManager, this)
    } catch (error) {
      Debug.log('[GOOGLE-OAUTH] Failed to load stored credentials, using environment variables:', error)
    }
  }

  // Add method to update credentials at runtime
  async updateCredentials(clientId: string, clientSecret: string, settingsManager: SettingsManager): Promise<void> {
    this.CLIENT_ID = clientId
    this.CLIENT_SECRET = clientSecret
    this.isConfigured = !!(clientId && clientSecret)
    
    // Store credentials securely
    await settingsManager.setGoogleClientId(clientId)
    await settingsManager.setGoogleClientSecret(clientSecret)
    
    Debug.log('[GOOGLE-OAUTH] Credentials updated and stored')
  }

  private ensureConfigured(): void {
    if (!this.isConfigured || !this.CLIENT_ID || !this.CLIENT_SECRET) {
      throw new GoogleCalendarError(
        'Google OAuth credentials not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables.',
        'CONFIG_MISSING'
      )
    }
  }

  isOAuthConfigured(): boolean {
    return this.isConfigured
  }

  getMultiAccountManager(): MultiAccountGoogleManager {
    if (!this.multiAccountManager) {
      throw new GoogleCalendarError('Multi-account manager not initialized', 'AUTH_FAILED')
    }
    return this.multiAccountManager
  }

  async initiateOAuthFlow(): Promise<string> {
    this.ensureConfigured()
    
    try {
      const usingCustomCredentials = process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      Debug.log('[GOOGLE-OAUTH] Initiating OAuth flow with', usingCustomCredentials ? 'custom' : 'bundled', 'credentials')
      Debug.log('[GOOGLE-OAUTH] Client ID:', this.CLIENT_ID!.substring(0, 20) + '...')
      const state = crypto.randomBytes(16).toString('hex')
      
      // Store state temporarily
      this.tempStorage.set('state', state)
      Debug.log('[GOOGLE-OAUTH] Generated and stored OAuth state')
      
      // For web apps, we don't need PKCE
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${new URLSearchParams({
        client_id: this.CLIENT_ID!,
        redirect_uri: this.REDIRECT_URI,
        response_type: 'code',
        scope: this.SCOPES.join(' '),
        state: state,
        access_type: 'offline',
        prompt: 'consent'
      })}`
      
      Debug.log('[GOOGLE-OAUTH] Generated OAuth authorization URL')
      return authUrl
    } catch (error) {
      Debug.error('[GOOGLE-OAUTH] Failed to initiate OAuth flow:', error instanceof Error ? error.message : 'Unknown error')
      throw new GoogleCalendarError(
        'Failed to initiate OAuth flow',
        'AUTH_FAILED',
        error as Error
      )
    }
  }

  async startOAuthServer(): Promise<void> {
    return new Promise((resolve, reject) => {
      const app = express()
      
      app.get('/oauth/callback', (req: Request, res: Response) => {
        const { code, state, error } = req.query
        
        Debug.log('[GOOGLE-OAUTH] OAuth callback received:', { code: !!code, state: !!state, error })
        
        if (error) {
          Debug.error('[GOOGLE-OAUTH] OAuth error:', error)
          let errorMessage = 'Authentication failed'
          
          // Provide specific error messages for common issues
          if (error === 'invalid_client') {
            errorMessage = 'Invalid OAuth client configuration. Please check your Google Client ID and Client Secret.'
          } else if (error === 'access_denied') {
            errorMessage = 'Access denied. Please grant permission to access your Google Calendar.'
          }
          
          res.send(`<html><body><h1>Authentication Failed</h1><p>${errorMessage}</p><p>Error: ${error}</p><script>setTimeout(() => window.close(), 5000)</script></body></html>`)
          this.stopOAuthServer()
          reject(new GoogleCalendarError(`OAuth authorization failed: ${error}`, 'AUTH_FAILED'))
          return
        }
        
        if (!code || !state) {
          Debug.error('[GOOGLE-OAUTH] Missing code or state:', { code: !!code, state: !!state })
          console.error('Missing code or state:', { code: !!code, state: !!state })
          res.send('<html><body><h1>Authentication Failed</h1><p>Missing authorization code or state</p><script>window.close()</script></body></html>')
          this.stopOAuthServer()
          reject(new GoogleCalendarError('Missing authorization code', 'AUTH_FAILED'))
          return
        }
        
        const expectedState = this.tempStorage.get('state')
        if (state !== expectedState) {
          console.error('State mismatch:', { received: state, expected: expectedState })
          res.send('<html><body><h1>Authentication Failed</h1><p>Invalid state parameter</p><script>window.close()</script></body></html>')
          this.stopOAuthServer()
          reject(new GoogleCalendarError('Invalid state parameter', 'AUTH_FAILED'))
          return
        }
        
        res.send('<html><body><h1>Authentication Successful</h1><p>You can close this window and return to Prep.</p><script>window.close()</script></body></html>')
        this.stopOAuthServer()
        
        // Exchange code for tokens
        this.exchangeCodeForTokens(code as string)
          .then(() => {
            Debug.log('[GOOGLE-OAUTH] OAuth flow completed successfully')
            console.log('OAuth flow completed successfully')
            resolve()
          })
          .catch(reject)
      })
      
      this.oauthServer = app.listen(8080, 'localhost', () => {
        Debug.log('[GOOGLE-OAUTH] OAuth server started on http://localhost:8080')
        console.log('OAuth server started on http://localhost:8080')
      })
      
      // Timeout after 5 minutes
      setTimeout(() => {
        if (this.oauthServer) {
          this.stopOAuthServer()
          reject(new GoogleCalendarError('OAuth flow timed out', 'AUTH_FAILED'))
        }
      }, 5 * 60 * 1000)
    })
  }

  private async exchangeCodeForTokens(code: string): Promise<void> {
    try {
      const codeVerifier = this.tempStorage.get('codeVerifier')
      
      // Ensure we have valid credentials
      if (!this.CLIENT_ID || !this.CLIENT_SECRET) {
        throw new GoogleCalendarError('OAuth credentials not available during token exchange', 'AUTH_FAILED')
      }
      
      const oauth2Client = new google.auth.OAuth2(
        this.CLIENT_ID,
        this.CLIENT_SECRET,
        this.REDIRECT_URI
      )
      
      // For web apps, we don't use PKCE
      const tokenRequest: any = { code }
      
      // Only add codeVerifier if we have one (PKCE flow)
      if (codeVerifier) {
        tokenRequest.codeVerifier = codeVerifier
      }
      
      Debug.log(`[GOOGLE-OAUTH] Exchanging code for tokens with client ID: ${this.CLIENT_ID?.substring(0, 20)}...`)
      
      const { tokens } = await oauth2Client.getToken(tokenRequest)
      
      if (!tokens.refresh_token) {
        throw new GoogleCalendarError('No refresh token received', 'AUTH_FAILED')
      }
      
      // Use multi-account manager to add the new account
      if (!this.multiAccountManager) {
        throw new GoogleCalendarError('Multi-account manager not initialized', 'AUTH_FAILED')
      }
      
      // Use the access token we just received to get user info immediately
      let userInfo: GoogleAccountUserInfo | null = null
      if (tokens.access_token) {
        try {
          // Validate tokens before setting credentials
          if (!tokens.access_token || typeof tokens.access_token !== 'string') {
            throw new Error('Invalid access token received')
          }
          
          // Set the tokens on the oauth2Client before making API calls
          oauth2Client.setCredentials(tokens)
          
          // Use the same oauth2Client that just successfully got the tokens
          const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client })
          const response = await oauth2.userinfo.get()
          
          if (response.data.email) {
            // Validate email format
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
            if (!emailRegex.test(response.data.email)) {
              throw new Error('Invalid email format received from Google')
            }
            
            userInfo = {
              email: response.data.email,
              name: response.data.name || undefined,
              picture: response.data.picture || undefined
            }
          }
        } catch (userInfoError) {
          Debug.error('[GOOGLE-OAUTH] Failed to fetch user info during token exchange:', userInfoError)
          // Make user info fetch mandatory for multi-account support
          throw new GoogleCalendarError(
            'Failed to fetch user information required for account identification',
            'AUTH_FAILED',
            userInfoError as Error
          )
        }
      }
      
      if (!userInfo) {
        throw new GoogleCalendarError(
          'No user information available - required for multi-account support',
          'AUTH_FAILED'
        )
      }
      
      // Add account with the tokens and user info
      const result = await this.multiAccountManager.addAccountDirect(
        tokens.refresh_token,
        userInfo,
        tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : undefined
      )
      
      if (!result.success) {
        throw new GoogleCalendarError(
          result.error || 'Failed to add account',
          result.isLimitReached ? 'ACCOUNT_LIMIT_REACHED' : 'AUTH_FAILED'
        )
      }
      
      Debug.log(`[GOOGLE-OAUTH] Successfully added account: ${result.account?.email}`)
      
      // Clean up temporary storage
      this.tempStorage.delete('state')
      
    } catch (error) {
      Debug.error('[GOOGLE-OAUTH] Token exchange failed:', error)
      throw new GoogleCalendarError(
        'Failed to exchange code for tokens',
        'AUTH_FAILED',
        error as Error
      )
    }
  }

  private stopOAuthServer(): void {
    if (this.oauthServer) {
      this.oauthServer.close()
      this.oauthServer = null
    }
  }

  async refreshAccessToken(refreshToken: string): Promise<{ accessToken: string; expiryDate: Date }> {
    this.ensureConfigured()
    
    try {
      const oauth2Client = new google.auth.OAuth2(
        this.CLIENT_ID!,
        this.CLIENT_SECRET!,
        this.REDIRECT_URI
      )
      
      oauth2Client.setCredentials({
        refresh_token: refreshToken
      })
      
      const { credentials } = await oauth2Client.refreshAccessToken()
      
      if (!credentials.access_token || !credentials.expiry_date) {
        throw new GoogleCalendarError('Invalid token response', 'AUTH_FAILED')
      }
      
      return {
        accessToken: credentials.access_token,
        expiryDate: new Date(credentials.expiry_date)
      }
    } catch (error) {
      throw new GoogleCalendarError(
        'Failed to refresh access token',
        'TOKEN_EXPIRED',
        error as Error
      )
    }
  }

  encryptToken(token: string): string {
    if (safeStorage.isEncryptionAvailable()) {
      return safeStorage.encryptString(token).toString('base64')
    } else {
      // Development fallback - not secure
      console.warn('Encryption not available, storing token in plain text (development only)')
      return Buffer.from(token).toString('base64')
    }
  }

  decryptToken(encryptedToken: string): string {
    try {
      if (safeStorage.isEncryptionAvailable()) {
        const buffer = Buffer.from(encryptedToken, 'base64')
        return safeStorage.decryptString(buffer)
      } else {
        // Development fallback
        return Buffer.from(encryptedToken, 'base64').toString()
      }
    } catch (error) {
      throw new GoogleCalendarError(
        'Failed to decrypt token',
        'AUTH_FAILED',
        error as Error
      )
    }
  }

  cleanup(): void {
    this.stopOAuthServer()
    this.tempStorage.clear()
  }
}
