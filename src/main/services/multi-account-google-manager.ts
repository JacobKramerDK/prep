import { google } from 'googleapis'
import type { 
  GoogleAccount, 
  GoogleAccountUserInfo, 
  MultiAccountGoogleCalendarState,
  AccountConnectionResult,
  AccountDisconnectionResult,
  MultiAccountGoogleCalendarError
} from '../../shared/types/multi-account-calendar'
import { MAX_GOOGLE_ACCOUNTS } from '../../shared/types/multi-account-calendar'
import { SettingsManager } from './settings-manager'
import { Debug } from '../../shared/utils/debug'

// Forward declaration to avoid circular dependency
interface GoogleOAuthManager {
  refreshAccessToken(refreshToken: string): Promise<{ accessToken: string; expiryDate: Date }>
}

export class MultiAccountGoogleManager {
  private settingsManager: SettingsManager
  private googleOAuthManager: GoogleOAuthManager
  private operationLocks = new Map<string, Promise<any>>()

  constructor(settingsManager: SettingsManager, googleOAuthManager: GoogleOAuthManager) {
    this.settingsManager = settingsManager
    this.googleOAuthManager = googleOAuthManager
  }

  async getConnectedAccounts(): Promise<GoogleAccount[]> {
    return await this.settingsManager.getGoogleAccounts()
  }

  async getMultiAccountState(): Promise<MultiAccountGoogleCalendarState> {
    const accounts = await this.getConnectedAccounts()
    return {
      connectedAccounts: accounts,
      totalAccounts: accounts.length,
      hasReachedLimit: accounts.length >= MAX_GOOGLE_ACCOUNTS
    }
  }

  async addAccount(refreshToken: string, tokenExpiry?: string): Promise<AccountConnectionResult> {
    const userInfo = await this.fetchUserInfo(refreshToken)
    if (!userInfo) {
      return {
        success: false,
        error: 'Failed to fetch user information for account'
      }
    }
    return this.addAccountWithUserInfo(refreshToken, userInfo, tokenExpiry)
  }

  async addAccountDirect(refreshToken: string, userInfo: GoogleAccountUserInfo | null, tokenExpiry?: string): Promise<AccountConnectionResult> {
    // If no user info provided, try to fetch it
    if (!userInfo) {
      userInfo = await this.fetchUserInfo(refreshToken)
      if (!userInfo) {
        return {
          success: false,
          error: 'Failed to fetch user information for account'
        }
      }
    }
    return this.addAccountWithUserInfo(refreshToken, userInfo, tokenExpiry)
  }

  private async addAccountWithUserInfo(refreshToken: string, userInfo: GoogleAccountUserInfo, tokenExpiry?: string): Promise<AccountConnectionResult> {
    // Use a more robust mutex implementation
    const lockKey = `account-addition-${userInfo.email}`
    
    // If there's already an operation for this account, wait for it
    if (this.operationLocks.has(lockKey)) {
      try {
        await this.operationLocks.get(lockKey)
        // Check if account was already added by the previous operation
        const existingAccount = await this.getAccountByEmail(userInfo.email)
        if (existingAccount) {
          return {
            success: false,
            error: `Account ${userInfo.email} is already connected`
          }
        }
      } catch (error) {
        // Previous operation failed, continue with this one
      }
    }
    
    // Create a new operation promise
    const operationPromise = this.performAccountAddition(refreshToken, userInfo, tokenExpiry)
    this.operationLocks.set(lockKey, operationPromise)
    
    try {
      const result = await operationPromise
      return result
    } finally {
      this.operationLocks.delete(lockKey)
    }
  }

  private async performAccountAddition(refreshToken: string, userInfo: GoogleAccountUserInfo, tokenExpiry?: string): Promise<AccountConnectionResult> {
    try {
      const currentAccounts = await this.getConnectedAccounts()
      
      // Check account limit
      if (currentAccounts.length >= MAX_GOOGLE_ACCOUNTS) {
        return {
          success: false,
          error: `Maximum of ${MAX_GOOGLE_ACCOUNTS} Google accounts allowed`,
          isLimitReached: true
        }
      }

      // Check for duplicate account
      const existingAccount = currentAccounts.find(account => 
        account.email.toLowerCase() === userInfo.email.toLowerCase()
      )
      if (existingAccount) {
        return {
          success: false,
          error: `Account ${userInfo.email} is already connected`
        }
      }

      // Create new account
      const newAccount: GoogleAccount = {
        email: userInfo.email,
        name: userInfo.name,
        refreshToken,
        tokenExpiry,
        connectedAt: new Date().toISOString()
      }

      // Add to accounts array atomically
      const updatedAccounts = [...currentAccounts, newAccount]
      await this.settingsManager.setGoogleAccounts(updatedAccounts)

      Debug.log(`[MULTI-GOOGLE] Added account: ${userInfo.email}`)
      return {
        success: true,
        account: newAccount
      }
    } catch (error) {
      Debug.error('[MULTI-GOOGLE] Failed to add account:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  async removeAccount(accountEmail: string): Promise<AccountDisconnectionResult> {
    try {
      const accounts = await this.getConnectedAccounts()
      const accountIndex = accounts.findIndex(account => account.email === accountEmail)
      
      if (accountIndex === -1) {
        return {
          success: false,
          error: `Account ${accountEmail} not found`
        }
      }

      // Remove account from array
      const updatedAccounts = accounts.filter(account => account.email !== accountEmail)
      await this.settingsManager.setGoogleAccounts(updatedAccounts)

      Debug.log(`[MULTI-GOOGLE] Removed account: ${accountEmail}`)
      return {
        success: true,
        removedAccountEmail: accountEmail
      }
    } catch (error) {
      Debug.error('[MULTI-GOOGLE] Failed to remove account:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  async fetchUserInfo(refreshToken: string): Promise<GoogleAccountUserInfo | null> {
    try {
      return await this.makeRequestWithRetry(async () => {
        // Get fresh access token using the OAuth manager
        const { accessToken } = await this.googleOAuthManager.refreshAccessToken(refreshToken)
        
        const oauth2Client = new google.auth.OAuth2()
        oauth2Client.setCredentials({ access_token: accessToken })

        const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client })
        const response = await oauth2.userinfo.get()
        
        if (!response.data.email) {
          throw new Error('No email in user info response')
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(response.data.email)) {
          throw new Error('Invalid email format received from Google')
        }

        return {
          email: response.data.email,
          name: response.data.name || undefined,
          picture: response.data.picture || undefined
        }
      })
    } catch (error) {
      Debug.error('[MULTI-GOOGLE] Failed to fetch user info:', error)
      return null
    }
  }

  async fetchUserInfoWithAccessToken(accessToken: string): Promise<GoogleAccountUserInfo | null> {
    try {
      return await this.makeRequestWithRetry(async () => {
        const oauth2Client = new google.auth.OAuth2()
        oauth2Client.setCredentials({ access_token: accessToken })

        const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client })
        const response = await oauth2.userinfo.get()
        
        if (!response.data.email) {
          throw new Error('No email in user info response')
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(response.data.email)) {
          throw new Error('Invalid email format received from Google')
        }

        return {
          email: response.data.email,
          name: response.data.name || undefined,
          picture: response.data.picture || undefined
        }
      })
    } catch (error) {
      Debug.error('[MULTI-GOOGLE] Failed to fetch user info with access token:', error)
      return null
    }
  }

  private async makeRequestWithRetry<T>(request: () => Promise<T>, maxRetries = 3): Promise<T> {
    let lastError: any
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await request()
      } catch (error: any) {
        lastError = error
        
        // Don't retry on final attempt
        if (attempt === maxRetries) {
          break
        }
        
        // Calculate delay based on error type and attempt
        let delay = 0
        let shouldRetry = false
        
        if (error.code === 429 || error.code === 403) {
          // Rate limiting - exponential backoff
          delay = Math.min(1000 * Math.pow(2, attempt) + Math.random() * 1000, 30000)
          shouldRetry = true
          Debug.log(`[MULTI-GOOGLE] Rate limited, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries + 1})`)
        } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
          // Network errors - linear backoff
          delay = 1000 * (attempt + 1)
          shouldRetry = true
          Debug.log(`[MULTI-GOOGLE] Network error, retrying in ${delay}ms`)
        } else if (error.code === 401) {
          // Authentication failed - don't retry
          Debug.error('[MULTI-GOOGLE] Authentication failed:', error)
          break
        }
        
        if (shouldRetry && delay > 0) {
          await new Promise(resolve => setTimeout(resolve, delay))
        } else {
          break
        }
      }
    }
    
    Debug.error('[MULTI-GOOGLE] Max retries exceeded:', lastError)
    throw lastError
  }

  async isAccountConnected(email: string): Promise<boolean> {
    const accounts = await this.getConnectedAccounts()
    return accounts.some(account => account.email === email)
  }

  async getAccountByEmail(email: string): Promise<GoogleAccount | null> {
    const accounts = await this.getConnectedAccounts()
    return accounts.find(account => account.email === email) || null
  }

  async hasAnyConnectedAccounts(): Promise<boolean> {
    const accounts = await this.getConnectedAccounts()
    return accounts.length > 0
  }

  async getPrimaryAccount(): Promise<GoogleAccount | null> {
    const accounts = await this.getConnectedAccounts()
    // Return the first connected account as primary
    return accounts.length > 0 ? accounts[0] : null
  }
}
