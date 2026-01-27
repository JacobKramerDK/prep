import React, { useState, useEffect } from 'react'
import { Edit, Eye, EyeOff } from 'lucide-react'
import type { GoogleAccount, MultiAccountGoogleCalendarState } from '../../shared/types/multi-account-calendar'

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
  const [connectedAccounts, setConnectedAccounts] = useState<GoogleAccount[]>([])
  const [multiAccountState, setMultiAccountState] = useState<MultiAccountGoogleCalendarState | null>(null)
  const [showClientSecret, setShowClientSecret] = useState(false)

  useEffect(() => {
    loadCredentialsAndStatus()
  }, [])

  const loadCredentialsAndStatus = async () => {
    try {
      const results = await Promise.allSettled([
        window.electronAPI.getGoogleClientId(),
        window.electronAPI.getGoogleClientSecret(),
        window.electronAPI.isGoogleCalendarConnected(),
        window.electronAPI.getConnectedGoogleAccounts(),
        window.electronAPI.getMultiAccountGoogleCalendarState()
      ])
      
      // Extract results with fallbacks for failed calls
      const [clientIdResult, clientSecretResult, connectedResult, accountsResult, stateResult] = results
      
      const storedClientId = clientIdResult.status === 'fulfilled' ? clientIdResult.value : null
      const storedClientSecret = clientSecretResult.status === 'fulfilled' ? clientSecretResult.value : null
      const connected = connectedResult.status === 'fulfilled' ? connectedResult.value : false
      const accounts = accountsResult.status === 'fulfilled' ? accountsResult.value : []
      const state = stateResult.status === 'fulfilled' ? stateResult.value : null
      
      if (storedClientId) setClientId(storedClientId)
      if (storedClientSecret) setClientSecret(storedClientSecret)
      setIsConnected(connected)
      setConnectedAccounts(accounts)
      setMultiAccountState(state)
      
      // Show credential form if no credentials are configured
      setShowCredentialForm(!storedClientId || !storedClientSecret)
      
      // Log any failed calls for debugging
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          const callNames = ['getGoogleClientId', 'getGoogleClientSecret', 'isGoogleCalendarConnected', 'getConnectedGoogleAccounts', 'getMultiAccountGoogleCalendarState']
          console.warn(`Failed to load ${callNames[index]}:`, result.reason)
        }
      })
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
      // Reload credentials and status to ensure UI updates properly
      await loadCredentialsAndStatus()
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
        const [connected, accounts, state] = await Promise.all([
          window.electronAPI.isGoogleCalendarConnected(),
          window.electronAPI.getConnectedGoogleAccounts(),
          window.electronAPI.getMultiAccountGoogleCalendarState()
        ])
        
        if (connected && accounts.length > connectedAccounts.length) {
          // New account was added
          setIsConnected(true)
          setConnectedAccounts(accounts)
          setMultiAccountState(state)
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
      setConnectedAccounts([])
      setMultiAccountState(null)
      setError(null)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to disconnect'
      setError(errorMessage)
    }
  }

  const handleDisconnectAccount = async (accountEmail: string) => {
    try {
      const result = await window.electronAPI.disconnectGoogleAccount(accountEmail)
      if (result.success) {
        // Reload account state
        await loadCredentialsAndStatus()
      } else {
        setError(result.error || 'Failed to disconnect account')
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to disconnect account'
      setError(errorMessage)
    }
  }

  // Connected state UI with multi-account support
  if (isConnected && connectedAccounts.length > 0 && !showCredentialForm) {
    return (
      <div className="space-y-4">
        {/* Connected accounts list */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-primary">Connected Google Accounts</h4>
            <span className="text-xs text-secondary">
              {connectedAccounts.length} of {multiAccountState?.hasReachedLimit ? '5 (limit reached)' : '5'} accounts
            </span>
          </div>
          
          {connectedAccounts.map(account => (
            <div key={account.email} className="flex items-center justify-between p-3 bg-surface border border-border rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <div>
                  <p className="text-sm font-medium text-primary">{account.name || account.email}</p>
                  <p className="text-xs text-secondary">{account.email}</p>
                </div>
              </div>
              <button
                onClick={() => handleDisconnectAccount(account.email)}
                className="px-3 py-1 text-xs font-medium text-red-600 bg-white border border-red-300 rounded hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
              >
                Disconnect
              </button>
            </div>
          ))}
        </div>

        {/* Add another account button */}
        {!multiAccountState?.hasReachedLimit && (
          <button
            onClick={handleConnect}
            disabled={isAuthenticating}
            className="w-full px-4 py-2 text-sm font-medium text-brand-600 bg-white border border-brand-300 rounded-lg hover:bg-brand-50 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isAuthenticating ? 'Connecting...' : 'Add Another Google Account'}
          </button>
        )}

        {multiAccountState?.hasReachedLimit && (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-xs text-yellow-800">
              Maximum of 5 Google accounts allowed. Disconnect an account to add a new one.
            </p>
          </div>
        )}
        
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
          Events from all connected Google Calendar accounts are automatically imported for meeting preparation.
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
                  data-testid="toggle-client-secret"
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
      {!showCredentialForm && clientId && clientSecret && clientId.trim() && clientSecret.trim() && (
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
                className="px-4 py-2 text-sm font-medium text-white bg-brand-600 border border-transparent rounded-md hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
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
