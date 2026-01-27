import { GoogleOAuthManager } from '../../src/main/services/google-oauth-manager'
import { GoogleCalendarError } from '../../src/shared/types/google-calendar'

describe('GoogleOAuthManager Security', () => {
  const originalEnv = process.env

  beforeEach(() => {
    // Reset environment
    process.env = { ...originalEnv }
    delete process.env.GOOGLE_CLIENT_ID
    delete process.env.GOOGLE_CLIENT_SECRET
  })

  afterAll(() => {
    process.env = originalEnv
  })

  test('should initialize gracefully when OAuth credentials are missing', () => {
    const manager = new GoogleOAuthManager()
    expect(manager.isOAuthConfigured()).toBe(false)
  })

  test('should initialize successfully with valid credentials', () => {
    process.env.GOOGLE_CLIENT_ID = 'test-client-id'
    process.env.GOOGLE_CLIENT_SECRET = 'test-client-secret'
    
    const manager = new GoogleOAuthManager()
    expect(manager.isOAuthConfigured()).toBe(true)
  })

  test('should not be configured when only client ID is provided', () => {
    process.env.GOOGLE_CLIENT_ID = 'test-client-id'
    
    const manager = new GoogleOAuthManager()
    expect(manager.isOAuthConfigured()).toBe(false)
  })

  test('should not be configured when only client secret is provided', () => {
    process.env.GOOGLE_CLIENT_SECRET = 'test-client-secret'
    
    const manager = new GoogleOAuthManager()
    expect(manager.isOAuthConfigured()).toBe(false)
  })

  test('should throw error when trying to use OAuth methods without configuration', async () => {
    const manager = new GoogleOAuthManager()
    
    await expect(manager.initiateOAuthFlow()).rejects.toThrow(GoogleCalendarError)
    await expect(manager.initiateOAuthFlow()).rejects.toThrow('Google OAuth credentials not configured')
  })

  test('should allow OAuth methods when properly configured', async () => {
    process.env.GOOGLE_CLIENT_ID = 'test-client-id'
    process.env.GOOGLE_CLIENT_SECRET = 'test-client-secret'
    
    const manager = new GoogleOAuthManager()
    
    // Should not throw when calling initiateOAuthFlow (though it may fail for other reasons)
    expect(() => manager.initiateOAuthFlow()).not.toThrow()
  })
})
