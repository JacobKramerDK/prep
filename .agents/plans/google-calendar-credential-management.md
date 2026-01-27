# Feature: Google Calendar Credential Management

The following plan should be complete, but its important that you validate documentation and codebase patterns and task sanity before you start implementing.

Pay special attention to naming of existing utils types and models. Import from the right files etc.

## Feature Description

Enhance the Google Calendar integration by allowing users to securely enter and store their Google OAuth2 client credentials (Client ID and Client Secret) directly within the application interface, eliminating the need for manual .env file configuration. This improvement follows the existing OpenAI API key storage pattern and provides a seamless user experience across Windows and macOS platforms.

## User Story

As a user of the Prep application
I want to configure my Google Calendar credentials through the application's settings interface
So that I can connect to Google Calendar without manually creating .env files or dealing with technical configuration steps

## Problem Statement

Currently, users must manually create a .env file and configure GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables to use Google Calendar integration. This creates friction in the user experience and is particularly challenging for non-technical users. The current approach also makes distribution and deployment more complex.

## Solution Statement

Implement a secure credential management system that mirrors the existing OpenAI API key storage pattern. Users will be able to enter their Google OAuth2 credentials through the settings interface, with credentials stored securely using Electron's encrypted storage. The system will maintain backward compatibility with environment variables while prioritizing user-entered credentials.

## Feature Metadata

**Feature Type**: Enhancement
**Estimated Complexity**: Medium
**Primary Systems Affected**: Settings Management, Google OAuth Manager, Settings UI, IPC Communication
**Dependencies**: electron-store (existing), Electron safeStorage (existing), Google APIs (existing)

---

## CONTEXT REFERENCES

### Relevant Codebase Files IMPORTANT: YOU MUST READ THESE FILES BEFORE IMPLEMENTING!

- `src/main/services/settings-manager.ts` (lines 212-250) - Why: Contains OpenAI API key storage pattern to mirror for Google credentials
- `src/main/services/google-oauth-manager.ts` (lines 1-50) - Why: Current credential loading logic that needs modification
- `src/renderer/components/SettingsPage.tsx` (lines 1-150, 300-400) - Why: OpenAI API key UI pattern and settings tab structure
- `src/renderer/components/GoogleCalendarAuth.tsx` - Why: Current Google Calendar UI component that needs credential input fields
- `src/main/index.ts` (lines 420-450) - Why: IPC handlers for Google Calendar that may need updates
- `src/shared/types/ipc.ts` (lines 70-85) - Why: IPC type definitions for Google Calendar methods
- `tests/e2e-stable/settings-management.spec.ts` - Why: Test patterns for credential management
- `tests/helpers/mock-settings-manager.ts` (lines 157-170) - Why: Mock patterns for Google Calendar settings

### New Files to Create

- None - All functionality will be added to existing files following established patterns

### Relevant Documentation YOU SHOULD READ THESE BEFORE IMPLEMENTING!

- [Google OAuth2 Desktop Apps Best Practices](https://developers.google.com/identity/protocols/oauth2/native-app)
  - Specific section: Client credential security for desktop applications
  - Why: Required for understanding secure credential handling in desktop apps
- [Electron Security Best Practices](https://www.electronjs.org/docs/tutorial/security)
  - Specific section: Secure credential storage using safeStorage
  - Why: Essential for implementing secure credential storage

### Patterns to Follow

**Settings Storage Pattern** (from `settings-manager.ts`):
```typescript
async getOpenAIApiKey(): Promise<string | null> {
  return this.store.get('openaiApiKey')
}

async setOpenAIApiKey(apiKey: string | null): Promise<void> {
  this.store.set('openaiApiKey', apiKey)
}
```

**Credential Input UI Pattern** (from `SettingsPage.tsx`):
```tsx
<input
  type="password"
  value={apiKey}
  onChange={(e) => {
    setApiKey(e.target.value)
    setValidationResult(null)
  }}
  placeholder="sk-..."
  className="flex-1 px-4 py-3 bg-background border border-border rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent font-mono text-sm"
/>
```

**Validation Pattern**:
```typescript
const handleValidateKey = async () => {
  setIsValidating(true)
  const isValid = await window.electronAPI.validateOpenAIApiKey(apiKey.trim())
  setValidationResult(isValid ? 'valid' : 'invalid')
}
```

**IPC Handler Pattern** (from `index.ts`):
```typescript
ipcMain.handle('settings:getOpenAIApiKey', async () => {
  return await settingsManager.getOpenAIApiKey()
})
```

---

## IMPLEMENTATION PLAN

### Phase 1: Backend Storage Foundation

Extend the settings manager to handle Google OAuth2 credentials with the same security patterns used for OpenAI API keys.

**Tasks:**
- Add Google credential storage methods to SettingsManager
- Implement credential validation logic
- Update GoogleOAuthManager to prioritize stored credentials over environment variables

### Phase 2: IPC Communication Layer

Create secure communication channels between the renderer and main processes for Google credential management.

**Tasks:**
- Add IPC handlers for Google credential operations
- Update preload script with new API methods
- Extend IPC type definitions

### Phase 3: User Interface Integration

Integrate Google credential input fields into the existing settings interface following the OpenAI API key pattern.

**Tasks:**
- Add credential input fields to GoogleCalendarAuth component
- Implement validation and feedback UI
- Update settings page layout and styling

### Phase 4: Testing & Validation

Ensure comprehensive testing coverage for the new credential management functionality.

**Tasks:**
- Extend existing test suites with Google credential scenarios
- Add Playwright tests for UI interactions
- Validate cross-platform functionality

---

## STEP-BY-STEP TASKS

IMPORTANT: Execute every task in order, top to bottom. Each task is atomic and independently testable.

### UPDATE src/main/services/settings-manager.ts

- **IMPLEMENT**: Add Google OAuth2 credential storage methods following OpenAI API key pattern
- **PATTERN**: Mirror `getOpenAIApiKey`/`setOpenAIApiKey` methods (lines 212-220)
- **IMPORTS**: No additional imports needed
- **GOTCHA**: Ensure credential validation follows same security patterns as OpenAI keys
- **VALIDATE**: `npm run build:main && node -e "console.log('Settings manager compiles')"`

```typescript
// Add after existing Google Calendar methods (around line 290)
async getGoogleClientId(): Promise<string | null> {
  return this.store.get('googleClientId')
}

async setGoogleClientId(clientId: string | null): Promise<void> {
  this.store.set('googleClientId', clientId)
}

async getGoogleClientSecret(): Promise<string | null> {
  return this.store.get('googleClientSecret')
}

async setGoogleClientSecret(clientSecret: string | null): Promise<void> {
  this.store.set('googleClientSecret', clientSecret)
}

validateGoogleClientIdFormat(clientId: string): boolean {
  // Google Client IDs end with .apps.googleusercontent.com
  return typeof clientId === 'string' && 
         clientId.length > 20 && 
         clientId.endsWith('.apps.googleusercontent.com')
}

validateGoogleClientSecretFormat(clientSecret: string): boolean {
  // Google Client Secrets are typically 24 characters, alphanumeric with hyphens/underscores
  return typeof clientSecret === 'string' && 
         clientSecret.length >= 20 && 
         /^[A-Za-z0-9_-]+$/.test(clientSecret)
}
```

### UPDATE src/main/services/google-oauth-manager.ts

- **IMPLEMENT**: Add initialization method to load stored credentials without modifying constructor
- **PATTERN**: Follow existing lazy loading patterns in codebase
- **IMPORTS**: Add `import { SettingsManager } from './settings-manager'`
- **GOTCHA**: Avoid async constructor issues, maintain backward compatibility
- **VALIDATE**: `npm run build:main && node -e "console.log('Google OAuth manager compiles')"`

```typescript
// Add after existing constructor (around line 40)
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
```

### UPDATE src/main/index.ts

- **IMPLEMENT**: Add IPC handlers for Google credential management
- **PATTERN**: Follow existing OpenAI API key handlers (search for 'openai' handlers)
- **IMPORTS**: No additional imports needed
- **GOTCHA**: Ensure proper error handling and validation
- **VALIDATE**: `npm run build:main && node -e "console.log('Main process IPC handlers compile')"`

```typescript
// Add after existing Google Calendar handlers (around line 450)
ipcMain.handle('settings:getGoogleClientId', async () => {
  try {
    return await settingsManager.getGoogleClientId()
  } catch (error) {
    console.error('Failed to get Google Client ID:', error)
    return null
  }
})

ipcMain.handle('settings:setGoogleClientId', async (_, clientId: string | null) => {
  try {
    await settingsManager.setGoogleClientId(clientId)
    // Update OAuth manager with new credentials if both are available
    const clientSecret = await settingsManager.getGoogleClientSecret()
    if (clientId && clientSecret) {
      await calendarManager.updateGoogleCredentials(clientId, clientSecret)
    }
  } catch (error) {
    console.error('Failed to set Google Client ID:', error)
    throw error
  }
})

ipcMain.handle('settings:getGoogleClientSecret', async () => {
  try {
    return await settingsManager.getGoogleClientSecret()
  } catch (error) {
    console.error('Failed to get Google Client Secret:', error)
    return null
  }
})

ipcMain.handle('settings:setGoogleClientSecret', async (_, clientSecret: string | null) => {
  try {
    await settingsManager.setGoogleClientSecret(clientSecret)
    // Update OAuth manager with new credentials if both are available
    const clientId = await settingsManager.getGoogleClientId()
    if (clientId && clientSecret) {
      await calendarManager.updateGoogleCredentials(clientId, clientSecret)
    }
  } catch (error) {
    console.error('Failed to set Google Client Secret:', error)
    throw error
  }
})

ipcMain.handle('settings:validateGoogleCredentials', async (_, clientId: string, clientSecret: string) => {
  try {
    const isValidId = settingsManager.validateGoogleClientIdFormat(clientId)
    const isValidSecret = settingsManager.validateGoogleClientSecretFormat(clientSecret)
    return isValidId && isValidSecret
  } catch (error) {
    console.error('Failed to validate Google credentials:', error)
    return false
  }
})
```

### UPDATE src/main/preload.ts

- **IMPLEMENT**: Expose Google credential management methods to renderer
- **PATTERN**: Follow existing OpenAI API key methods (search for 'openai' methods)
- **IMPORTS**: No additional imports needed
- **GOTCHA**: Maintain type safety and proper error handling
- **VALIDATE**: `npm run build:main && node -e "console.log('Preload script compiles')"`

```typescript
// Add after existing Google Calendar methods (around line 170)
getGoogleClientId: () => ipcRenderer.invoke('settings:getGoogleClientId'),
setGoogleClientId: (clientId: string | null) => ipcRenderer.invoke('settings:setGoogleClientId', clientId),
getGoogleClientSecret: () => ipcRenderer.invoke('settings:getGoogleClientSecret'),
setGoogleClientSecret: (clientSecret: string | null) => ipcRenderer.invoke('settings:setGoogleClientSecret', clientSecret),
validateGoogleCredentials: (clientId: string, clientSecret: string) => 
  ipcRenderer.invoke('settings:validateGoogleCredentials', clientId, clientSecret),
```

### UPDATE src/shared/types/ipc.ts

- **IMPLEMENT**: Add type definitions for new Google credential methods
- **PATTERN**: Follow existing OpenAI API key method types (search for 'openai' types)
- **IMPORTS**: No additional imports needed
- **GOTCHA**: Ensure type consistency across IPC boundary
- **VALIDATE**: `npm run build && node -e "console.log('IPC types compile')"`

```typescript
// Add after existing Google Calendar methods (around line 85)
getGoogleClientId: () => Promise<string | null>
setGoogleClientId: (clientId: string | null) => Promise<void>
getGoogleClientSecret: () => Promise<string | null>
setGoogleClientSecret: (clientSecret: string | null) => Promise<void>
validateGoogleCredentials: (clientId: string, clientSecret: string) => Promise<boolean>
```
### UPDATE src/renderer/components/GoogleCalendarAuth.tsx

- **IMPLEMENT**: Replace component with credential management + connection UI
- **PATTERN**: Mirror OpenAI API key input pattern from SettingsPage.tsx with edit button for filled credentials
- **IMPORTS**: Add `useState`, `useEffect` hooks for credential state management
- **GOTCHA**: Hide credentials behind edit button when configured, show inline errors only
- **VALIDATE**: `npm run dev:renderer && echo "Renderer compiles and runs"`

```tsx
// Replace entire component content with credential management UI
import React, { useState, useEffect } from 'react'
import { Edit, Eye, EyeOff } from 'lucide-react'

interface GoogleCalendarAuthProps {
  onAuthSuccess?: () => void
  onAuthError?: (error: string) => void
}

export const GoogleCalendarAuth: React.FC<GoogleCalendarAuthProps> = ({
  onAuthSuccess,
  onAuthError
}) => {
  const [clientId, setClientId] = useState('')
  const [clientSecret, setClientSecret] = useState('')
  const [isValidating, setIsValidating] = useState(false)
  const [validationResult, setValidationResult] = useState<'valid' | 'invalid' | null>(null)
  const [showCredentialForm, setShowCredentialForm] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [isAuthenticating, setIsAuthenticating] = useState(false)
  const [userInfo, setUserInfo] = useState<{ email: string; name?: string } | null>(null)
  const [showClientSecret, setShowClientSecret] = useState(false)

  useEffect(() => {
    loadCredentialsAndStatus()
  }, [])

  const loadCredentialsAndStatus = async () => {
    try {
      const [storedClientId, storedClientSecret, connected, info] = await Promise.all([
        window.electronAPI.getGoogleClientId(),
        window.electronAPI.getGoogleClientSecret(),
        window.electronAPI.isGoogleCalendarConnected(),
        window.electronAPI.getGoogleCalendarUserInfo()
      ])
      
      if (storedClientId) setClientId(storedClientId)
      if (storedClientSecret) setClientSecret(storedClientSecret)
      setIsConnected(connected)
      setUserInfo(info)
      
      // Show credential form if no credentials are configured
      setShowCredentialForm(!storedClientId || !storedClientSecret)
    } catch (error) {
      console.error('Failed to load Google credentials and status:', error)
      setShowCredentialForm(true)
    }
  }

  const handleValidateCredentials = async () => {
    if (!clientId.trim() || !clientSecret.trim()) {
      setValidationResult('invalid')
      setError('Both Client ID and Client Secret are required')
      return
    }

    setIsValidating(true)
    setValidationResult(null)
    setError(null)

    try {
      const isValid = await window.electronAPI.validateGoogleCredentials(
        clientId.trim(), 
        clientSecret.trim()
      )
      setValidationResult(isValid ? 'valid' : 'invalid')
      if (!isValid) {
        setError('Invalid credential format. Please check your Client ID and Secret.')
      }
    } catch (error) {
      console.error('Credential validation failed:', error)
      setValidationResult('invalid')
      setError('Failed to validate credentials')
    } finally {
      setIsValidating(false)
    }
  }

  const handleSaveCredentials = async () => {
    setIsSaving(true)
    setError(null)
    try {
      await Promise.all([
        window.electronAPI.setGoogleClientId(clientId.trim() || null),
        window.electronAPI.setGoogleClientSecret(clientSecret.trim() || null)
      ])
      setShowCredentialForm(false)
      setError(null)
    } catch (error) {
      console.error('Failed to save credentials:', error)
      setError('Failed to save credentials')
    } finally {
      setIsSaving(false)
    }
  }

  const handleClearCredentials = async () => {
    try {
      await Promise.all([
        window.electronAPI.setGoogleClientId(null),
        window.electronAPI.setGoogleClientSecret(null)
      ])
      setClientId('')
      setClientSecret('')
      setValidationResult(null)
      setShowCredentialForm(true)
      setError(null)
      // Disconnect if currently connected
      if (isConnected) {
        await handleDisconnect()
      }
    } catch (error) {
      console.error('Failed to clear credentials:', error)
      setError('Failed to clear credentials')
    }
  }

  const handleConnect = async () => {
    setIsAuthenticating(true)
    setError(null)
    
    try {
      await window.electronAPI.authenticateGoogleCalendar()
      await pollForAuthCompletion()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Authentication failed'
      setError(errorMessage)
      onAuthError?.(errorMessage)
    } finally {
      setIsAuthenticating(false)
    }
  }

  const pollForAuthCompletion = async () => {
    const maxAttempts = 60
    let attempts = 0
    
    const poll = async (): Promise<void> => {
      if (attempts >= maxAttempts) {
        throw new Error('Authentication timed out')
      }
      
      attempts++
      
      try {
        const connected = await window.electronAPI.isGoogleCalendarConnected()
        if (connected) {
          setIsConnected(true)
          const info = await window.electronAPI.getGoogleCalendarUserInfo()
          setUserInfo(info)
          onAuthSuccess?.()
          return
        }
      } catch (error) {
        // Continue polling on error
      }
      
      await new Promise(resolve => setTimeout(resolve, 2000))
      return poll()
    }
    
    return poll()
  }

  const handleDisconnect = async () => {
    try {
      await window.electronAPI.disconnectGoogleCalendar()
      setIsConnected(false)
      setUserInfo(null)
      setError(null)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to disconnect'
      setError(errorMessage)
    }
  }

  // Connected state UI
  if (isConnected && userInfo && !showCredentialForm) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center space-x-3">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <div>
              <p className="text-sm font-medium text-green-800">
                Connected to Google Calendar
              </p>
              <p className="text-xs text-green-600">
                {userInfo.email}
                {userInfo.name && ` (${userInfo.name})`}
              </p>
            </div>
          </div>
          <button
            onClick={handleDisconnect}
            className="px-3 py-1 text-xs font-medium text-red-600 bg-white border border-red-300 rounded hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
          >
            Disconnect
          </button>
        </div>
        
        {/* Configured credentials display with edit button */}
        <div className="p-3 bg-surface border border-border rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-primary">Google OAuth2 Configured</p>
              <p className="text-xs text-secondary font-mono">{clientId.substring(0, 20)}...</p>
            </div>
            <button
              onClick={() => setShowCredentialForm(true)}
              className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-secondary bg-surface border border-border rounded hover:bg-surface-hover focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <Edit className="w-3 h-3" />
              Edit
            </button>
          </div>
        </div>
        
        <div className="text-xs text-tertiary">
          Your Google Calendar events are automatically imported for meeting preparation.
        </div>
      </div>
    )
  }

  // Credential configuration or connection UI
  return (
    <div className="space-y-4">
      {/* Credential Configuration Form */}
      {showCredentialForm && (
        <div className="p-4 bg-surface border border-border rounded-lg">
          <h3 className="text-sm font-medium text-primary mb-3">
            Configure Google OAuth2 Credentials
          </h3>
          <p className="text-xs text-secondary mb-4">
            Enter your Google Cloud Project OAuth2 credentials to enable Google Calendar integration.
          </p>
          
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-primary mb-1">
                Client ID
              </label>
              <input
                type="text"
                value={clientId}
                onChange={(e) => {
                  setClientId(e.target.value)
                  setValidationResult(null)
                  setError(null)
                }}
                placeholder="1234567890-abcdefghijklmnopqrstuvwxyz.apps.googleusercontent.com"
                className="w-full px-3 py-2 bg-background border border-border rounded-md focus:ring-2 focus:ring-brand-500 focus:border-transparent text-xs font-mono"
              />
            </div>
            
            <div>
              <label className="block text-xs font-medium text-primary mb-1">
                Client Secret
              </label>
              <div className="relative">
                <input
                  type={showClientSecret ? "text" : "password"}
                  value={clientSecret}
                  onChange={(e) => {
                    setClientSecret(e.target.value)
                    setValidationResult(null)
                    setError(null)
                  }}
                  placeholder="GOCSPX-..."
                  className="w-full px-3 py-2 pr-10 bg-background border border-border rounded-md focus:ring-2 focus:ring-brand-500 focus:border-transparent text-xs font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowClientSecret(!showClientSecret)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showClientSecret ? (
                    <EyeOff className="w-4 h-4 text-tertiary" />
                  ) : (
                    <Eye className="w-4 h-4 text-tertiary" />
                  )}
                </button>
              </div>
            </div>
            
            <div className="flex space-x-2">
              <button
                onClick={handleValidateCredentials}
                disabled={isValidating || !clientId.trim() || !clientSecret.trim()}
                className="px-3 py-2 text-xs font-medium text-secondary bg-surface border border-border rounded hover:bg-surface-hover focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isValidating ? 'Validating...' : 'Validate'}
              </button>
              
              <button
                onClick={handleSaveCredentials}
                disabled={isSaving || validationResult !== 'valid'}
                className="px-3 py-2 text-xs font-medium text-white bg-brand-600 border border-transparent rounded hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? 'Saving...' : 'Save Credentials'}
              </button>
              
              <button
                onClick={handleClearCredentials}
                className="px-3 py-2 text-xs font-medium text-secondary bg-surface border border-border rounded hover:bg-surface-hover focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                Clear
              </button>
            </div>
            
            {/* Inline error display */}
            {error && (
              <div className="p-2 bg-surface border border-border rounded text-xs text-secondary">
                {error}
              </div>
            )}
            
            {validationResult === 'valid' && (
              <div className="p-2 bg-surface border border-border rounded text-xs text-secondary">
                Credentials format is valid
              </div>
            )}
          </div>
          
          <div className="mt-4 text-xs text-tertiary">
            <p className="mb-2"><strong>How to get Google OAuth2 credentials:</strong></p>
            <ol className="list-decimal list-inside space-y-1 ml-2">
              <li>Go to <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:text-brand-700 underline">Google Cloud Console</a></li>
              <li>Create a new project or select an existing one</li>
              <li>Enable the Google Calendar API</li>
              <li>Go to "Credentials" and create "OAuth 2.0 Client IDs"</li>
              <li>Choose "Desktop application" as the application type</li>
              <li>Add http://localhost:8080/oauth/callback as authorized redirect URI</li>
              <li>Copy the Client ID and Client Secret here</li>
            </ol>
          </div>
        </div>
      )}

      {/* Connection UI - only show if credentials are configured */}
      {!showCredentialForm && clientId && clientSecret && (
        <div className="p-4 bg-surface border border-border rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-primary">
                Google Calendar Integration
              </h3>
              <p className="text-xs text-secondary mt-1">
                Connect your Google Calendar to automatically import events for meeting preparation
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowCredentialForm(true)}
                className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-secondary bg-surface border border-border rounded hover:bg-surface-hover focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <Edit className="w-3 h-3" />
                Edit
              </button>
              <button
                onClick={handleConnect}
                disabled={isAuthenticating}
                className="px-4 py-2 text-sm font-medium text-white bg-brand-600 border border-transparent rounded-md hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-disabled"
              >
                {isAuthenticating ? 'Connecting...' : 'Connect Google Calendar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Inline error display for connection issues */}
      {error && !showCredentialForm && (
        <div className="p-3 bg-surface border border-border rounded-lg">
          <p className="text-sm text-secondary">{error}</p>
        </div>
      )}

      {isAuthenticating && (
        <div className="p-3 bg-surface border border-border rounded-lg">
          <p className="text-sm text-secondary">
            Please complete the authentication in your browser. This window will update automatically once you're connected.
          </p>
        </div>
      )}

      <div className="text-xs text-tertiary">
        <p className="mb-2">
          <strong>What happens when you connect:</strong>
        </p>
        <ul className="list-disc list-inside space-y-1 ml-2">
          <li>Prep will access your Google Calendar events (read-only)</li>
          <li>Events will be imported automatically for meeting preparation</li>
          <li>Your calendar data stays private and is only used locally</li>
          <li>You can disconnect at any time</li>
        </ul>
      </div>
    </div>
  )
}
```

### UPDATE src/main/services/calendar-manager.ts

- **IMPLEMENT**: Initialize GoogleOAuthManager with stored credentials after construction
- **PATTERN**: Follow existing async initialization patterns in codebase
- **IMPORTS**: No additional imports needed
- **GOTCHA**: Call initialization after construction to load stored credentials
- **VALIDATE**: `npm run build:main && node -e "console.log('Calendar manager compiles')"`

```typescript
// Update constructor (around line 40) - add initialization call
constructor() {
  this.settingsManager = new SettingsManager()
  this.swiftCalendarManager = new SwiftCalendarManager(this.settingsManager)
  this.googleOAuthManager = new GoogleOAuthManager()
  this.googleCalendarManager = new GoogleCalendarManager(this.googleOAuthManager)
  this.platformDetector = new PlatformDetector()
  
  // Initialize Google OAuth with stored credentials
  this.initializeGoogleOAuth()
  
  if (process.env.NODE_ENV !== 'test') {
    process.on('exit', () => this.dispose())
    process.on('SIGTERM', () => this.cleanup())
    process.on('SIGINT', () => this.cleanup())
  }
}

// Add initialization method after constructor
private async initializeGoogleOAuth(): Promise<void> {
  try {
    await this.googleOAuthManager.initialize(this.settingsManager)
  } catch (error) {
    Debug.log('[CALENDAR-MANAGER] Failed to initialize Google OAuth:', error)
  }
}

// Add method to update Google credentials (around line 870)
async updateGoogleCredentials(clientId: string, clientSecret: string): Promise<void> {
  try {
    await this.googleOAuthManager.updateCredentials(clientId, clientSecret, this.settingsManager)
  } catch (error) {
    console.error('Failed to update Google credentials:', error)
    throw error
  }
}
```

### UPDATE tests/helpers/mock-settings-manager.ts

- **IMPLEMENT**: Add mock methods for Google credential storage
- **PATTERN**: Follow existing mock method patterns (lines 157-170)
- **IMPORTS**: No additional imports needed
- **GOTCHA**: Ensure test isolation and proper mock behavior
- **VALIDATE**: `npm run test:helpers`

```typescript
// Add after existing Google Calendar mock methods (around line 175)
async getGoogleClientId(): Promise<string | null> {
  return this.mockData.googleClientId || null
}

async setGoogleClientId(clientId: string | null): Promise<void> {
  this.mockData.googleClientId = clientId
}

async getGoogleClientSecret(): Promise<string | null> {
  return this.mockData.googleClientSecret || null
}

async setGoogleClientSecret(clientSecret: string | null): Promise<void> {
  this.mockData.googleClientSecret = clientSecret
}

validateGoogleClientIdFormat(clientId: string): boolean {
  return typeof clientId === 'string' && 
         clientId.length > 20 && 
         clientId.endsWith('.apps.googleusercontent.com')
}

validateGoogleClientSecretFormat(clientSecret: string): boolean {
  return typeof clientSecret === 'string' && 
         clientSecret.length >= 20 && 
         /^[A-Za-z0-9_-]+$/.test(clientSecret)
}

// Update mockData interface to include new fields (around line 20)
private mockData: {
  // ... existing fields
  googleClientId?: string | null
  googleClientSecret?: string | null
} = {}
```

### CREATE tests/e2e-stable/google-credential-management.spec.ts

- **IMPLEMENT**: Comprehensive E2E tests for Google credential management
- **PATTERN**: Follow existing settings-management.spec.ts test patterns
- **IMPORTS**: Use existing test infrastructure imports
- **GOTCHA**: Use correct selectors, ensure proper test isolation and mock credential usage
- **VALIDATE**: `npm run test:e2e:stable`

```typescript
import { test, expect } from '@playwright/test'
import { createTestApp } from '../helpers/test-app-factory'
import { TestDataFactory } from '../helpers/test-data-factory'
import { TestEnvironment } from '../helpers/test-environment'

test.describe('Google Credential Management', () => {
  let testConfig: TestEnvironment

  test.beforeEach(async () => {
    testConfig = new TestEnvironment()
  })

  test.afterEach(async () => {
    await testConfig.cleanup()
  })

  test('should display credential input form when no credentials are stored', async () => {
    const { app, cleanup } = await createTestApp({
      testId: testConfig.testId,
      mockSettings: true
    })

    try {
      const page = await app.firstWindow()
      
      // Navigate to settings and calendar tab
      await page.click('button:has-text("Settings")')
      await page.click('button:has-text("Calendar Import")')
      
      // Should show credential configuration form
      await expect(page.locator('text=Configure Google OAuth2 Credentials')).toBeVisible()
      await expect(page.locator('input[placeholder*="apps.googleusercontent.com"]')).toBeVisible()
      await expect(page.locator('input[placeholder*="GOCSPX"]')).toBeVisible()
    } finally {
      await cleanup()
    }
  })

  test('should validate Google credential format', async () => {
    const { app, cleanup } = await createTestApp({
      testId: testConfig.testId,
      mockSettings: true
    })

    try {
      const page = await app.firstWindow()
      
      // Navigate to credential form
      await page.click('button:has-text("Settings")')
      await page.click('button:has-text("Calendar Import")')
      
      // Enter invalid credentials
      await page.fill('input[placeholder*="apps.googleusercontent.com"]', 'invalid-client-id')
      await page.fill('input[placeholder*="GOCSPX"]', 'invalid-secret')
      await page.click('button:has-text("Validate")')
      
      // Should show validation error
      await expect(page.locator('text=Invalid credential format')).toBeVisible()
      
      // Enter valid credentials
      const validClientId = TestDataFactory.generateValidGoogleClientId()
      const validClientSecret = TestDataFactory.generateValidGoogleClientSecret()
      
      await page.fill('input[placeholder*="apps.googleusercontent.com"]', validClientId)
      await page.fill('input[placeholder*="GOCSPX"]', validClientSecret)
      await page.click('button:has-text("Validate")')
      
      // Should show validation success
      await expect(page.locator('text=Credentials format is valid')).toBeVisible()
    } finally {
      await cleanup()
    }
  })

  test('should save and load Google credentials with edit button', async () => {
    const { app, cleanup } = await createTestApp({
      testId: testConfig.testId,
      mockSettings: true
    })

    try {
      const page = await app.firstWindow()
      
      // Navigate to credential form
      await page.click('button:has-text("Settings")')
      await page.click('button:has-text("Calendar Import")')
      
      // Enter and save valid credentials
      const validClientId = TestDataFactory.generateValidGoogleClientId()
      const validClientSecret = TestDataFactory.generateValidGoogleClientSecret()
      
      await page.fill('input[placeholder*="apps.googleusercontent.com"]', validClientId)
      await page.fill('input[placeholder*="GOCSPX"]', validClientSecret)
      await page.click('button:has-text("Validate")')
      await page.click('button:has-text("Save Credentials")')
      
      // Should hide credential form and show connection UI with edit button
      await expect(page.locator('text=Configure Google OAuth2 Credentials')).not.toBeVisible()
      await expect(page.locator('text=Google Calendar Integration')).toBeVisible()
      await expect(page.locator('button:has-text("Edit")')).toBeVisible()
      
      // Click edit button to show credential form again
      await page.click('button:has-text("Edit")')
      await expect(page.locator('text=Configure Google OAuth2 Credentials')).toBeVisible()
      
      // Verify credentials are loaded
      await expect(page.locator('input[placeholder*="apps.googleusercontent.com"]')).toHaveValue(validClientId)
    } finally {
      await cleanup()
    }
  })

  test('should clear Google credentials', async () => {
    const { app, cleanup } = await createTestApp({
      testId: testConfig.testId,
      mockSettings: true,
      initialSettings: {
        googleClientId: TestDataFactory.generateValidGoogleClientId(),
        googleClientSecret: TestDataFactory.generateValidGoogleClientSecret()
      }
    })

    try {
      const page = await app.firstWindow()
      
      // Navigate to settings
      await page.click('button:has-text("Settings")')
      await page.click('button:has-text("Calendar Import")')
      
      // Should show connection UI with edit button
      await expect(page.locator('button:has-text("Edit")')).toBeVisible()
      
      // Edit credentials
      await page.click('button:has-text("Edit")')
      await expect(page.locator('text=Configure Google OAuth2 Credentials')).toBeVisible()
      
      // Clear credentials
      await page.click('button:has-text("Clear")')
      
      // Should show empty form
      await expect(page.locator('input[placeholder*="apps.googleusercontent.com"]')).toHaveValue('')
      await expect(page.locator('input[placeholder*="GOCSPX"]')).toHaveValue('')
    } finally {
      await cleanup()
    }
  })

  test('should show/hide client secret with eye button', async () => {
    const { app, cleanup } = await createTestApp({
      testId: testConfig.testId,
      mockSettings: true
    })

    try {
      const page = await app.firstWindow()
      
      // Navigate to credential form
      await page.click('button:has-text("Settings")')
      await page.click('button:has-text("Calendar Import")')
      
      const secretInput = page.locator('input[placeholder*="GOCSPX"]')
      const eyeButton = page.locator('button').filter({ has: page.locator('svg') }).nth(1) // Eye button
      
      // Initially should be password type (hidden)
      await expect(secretInput).toHaveAttribute('type', 'password')
      
      // Fill secret and toggle visibility
      await secretInput.fill('test-secret')
      await eyeButton.click()
      
      // Should now be text type (visible)
      await expect(secretInput).toHaveAttribute('type', 'text')
      
      // Toggle back to hidden
      await eyeButton.click()
      await expect(secretInput).toHaveAttribute('type', 'password')
    } finally {
      await cleanup()
    }
  })
})
```

### UPDATE tests/helpers/test-data-factory.ts

- **IMPLEMENT**: Add factory methods for generating valid Google credential test data
- **PATTERN**: Follow existing factory method patterns in test-data-factory.ts
- **IMPORTS**: No additional imports needed
- **GOTCHA**: Generate realistic but safe test credentials
- **VALIDATE**: `npm run test:helpers`

```typescript
// Add after existing factory methods
static generateValidGoogleClientId(): string {
  const randomId = Math.random().toString(36).substring(2, 15)
  return `${randomId}-test.apps.googleusercontent.com`
}

static generateValidGoogleClientSecret(): string {
  const randomSecret = Math.random().toString(36).substring(2, 26)
  return `GOCSPX-${randomSecret}`
}

static generateInvalidGoogleClientId(): string {
  return 'invalid-client-id-format'
}

static generateInvalidGoogleClientSecret(): string {
  return 'invalid-secret'
}
```

---

## TESTING STRATEGY

### Unit Tests

**Scope**: Settings manager credential storage, validation logic, and OAuth manager credential handling
**Framework**: Jest with existing test infrastructure
**Coverage**: All new credential management methods with edge cases

Design unit tests with fixtures and assertions following existing testing approaches in the helpers directory.

### Integration Tests

**Scope**: End-to-end credential management workflow from UI input to secure storage
**Framework**: Playwright with MCP server integration
**Coverage**: Complete user workflows including validation, saving, loading, and clearing credentials

### Edge Cases

**Specific edge cases that must be tested for this feature:**
- Invalid credential format handling
- Network failures during validation
- Concurrent credential updates
- Environment variable fallback behavior
- Cross-platform storage compatibility
- Credential clearing while connected to Google Calendar

---

## VALIDATION COMMANDS

Execute every command to ensure zero regressions and 100% feature correctness.

### Level 1: Syntax & Style

```bash
npm run build
npm run lint
```

### Level 2: Unit Tests

```bash
npm run test:helpers
```

### Level 3: Integration Tests

```bash
npm run test:e2e:stable
```

### Level 4: Manual Validation

**Feature-specific manual testing steps:**
1. Open settings and navigate to Calendar tab
2. Verify credential input form appears when no credentials stored
3. Test credential validation with invalid formats
4. Test credential validation with valid formats
5. Save credentials and verify they persist across app restarts
6. Test credential editing and clearing functionality
7. Verify Google Calendar connection works with stored credentials
8. Test environment variable fallback (create .env with credentials)

### Level 5: Additional Validation (Optional)

```bash
# Test with Playwright MCP server if available
npm run test:e2e:stable -- --grep "Google Credential"
```

---

## ACCEPTANCE CRITERIA

- [ ] Users can enter Google OAuth2 credentials through the settings interface
- [ ] Credentials are validated for proper format before saving
- [ ] Credentials are stored securely using Electron's encrypted storage
- [ ] Stored credentials take priority over environment variables
- [ ] Environment variable fallback continues to work for backward compatibility
- [ ] Credential management UI follows existing design patterns
- [ ] All validation commands pass with zero errors
- [ ] Cross-platform functionality verified on Windows and macOS
- [ ] Comprehensive test coverage for all credential management scenarios
- [ ] Google Calendar connection works with user-entered credentials
- [ ] Credential clearing properly disconnects existing Google Calendar connections
- [ ] UI provides clear feedback for validation and save operations

---

## COMPLETION CHECKLIST

- [ ] All tasks completed in order
- [ ] Each task validation passed immediately
- [ ] All validation commands executed successfully
- [ ] Full test suite passes (unit + integration)
- [ ] No linting or type checking errors
- [ ] Manual testing confirms feature works on both platforms
- [ ] Acceptance criteria all met
- [ ] Code reviewed for quality and maintainability
- [ ] Playwright MCP server tests pass
- [ ] Backward compatibility with .env configuration maintained

---

## NOTES

**Design Decisions:**
- Prioritize stored credentials over environment variables for better user experience
- Maintain backward compatibility with existing .env configuration
- Follow existing OpenAI API key storage patterns for consistency
- Use same validation and UI patterns as existing credential management

**Security Considerations:**
- Credentials stored using Electron's encrypted storage (electron-store)
- Client secrets masked in UI using password input type
- Validation occurs locally without sending credentials to external services
- Proper error handling prevents credential leakage in logs

**Cross-Platform Compatibility:**
- Electron-store handles platform-specific secure storage automatically
- UI components use existing cross-platform design system
- No platform-specific code required for credential management

**Performance Implications:**
- Credential loading is async and non-blocking
- Validation is performed locally without network calls
- OAuth manager updates credentials without requiring app restart

---

## CONFIDENCE SCORE UPDATE

**Updated Confidence Score:** 9.5/10 for one-pass implementation success

**Improvements Made:**
- ✅ Eliminated async constructor issues by using initialization method
- ✅ Simplified dependency injection using existing patterns  
- ✅ Complete UI replacement with credential management + connection flow
- ✅ Accurate test selectors using correct button text instead of data-testid
- ✅ Comprehensive inline error handling with specific messages
- ✅ Enhanced UX with edit button for configured credentials and password toggle
- ✅ Robust state management between credential config and connection modes

**Risk Mitigation Complete:**
- No async constructors (uses initialization method)
- No circular dependencies (maintains existing patterns)
- Correct UI selectors (uses actual button text)
- Comprehensive error scenarios (inline error handling)
- Clear state management (credential form ↔ connection UI)

The plan now provides concrete implementation approaches, eliminates all identified risks, and includes detailed validation steps for successful one-pass implementation.
