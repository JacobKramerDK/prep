import React, { useState, useEffect } from 'react'

interface GoogleCalendarAuthProps {
  onAuthSuccess?: () => void
  onAuthError?: (error: string) => void
}

export const GoogleCalendarAuth: React.FC<GoogleCalendarAuthProps> = ({
  onAuthSuccess,
  onAuthError
}) => {
  const [isConnected, setIsConnected] = useState(false)
  const [isAuthenticating, setIsAuthenticating] = useState(false)
  const [userInfo, setUserInfo] = useState<{ email: string; name?: string } | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    checkConnectionStatus()
  }, [])

  const checkConnectionStatus = async () => {
    try {
      const connected = await window.electronAPI.isGoogleCalendarConnected()
      setIsConnected(connected)
      
      if (connected) {
        const info = await window.electronAPI.getGoogleCalendarUserInfo()
        setUserInfo(info)
      }
    } catch (error) {
      console.error('Failed to check Google Calendar connection:', error)
    }
  }

  const handleConnect = async () => {
    setIsAuthenticating(true)
    setError(null)
    
    try {
      // Check if we're using a test/placeholder client ID
      const authUrl = await window.electronAPI.authenticateGoogleCalendar()
      
      if (authUrl.includes('1234567890-abcdefghijklmnopqrstuvwxyz')) {
        // This is the placeholder client ID - show helpful error
        setError('Google OAuth Client ID not configured. Please set up a real Google OAuth Client ID in the Google Cloud Console and add it to your .env file as GOOGLE_CLIENT_ID.')
        return
      }
      
      // The OAuth flow will be handled by the main process
      // We'll need to poll for completion or listen for events
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
    const maxAttempts = 60 // 5 minutes with 5-second intervals
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
      
      // Wait 2 seconds before next poll (faster polling)
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

  if (isConnected && userInfo) {
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
        
        <div className="text-xs text-gray-500">
          Your Google Calendar events will be automatically imported and included in meeting preparation.
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-gray-900">
              Google Calendar Integration
            </h3>
            <p className="text-xs text-gray-600 mt-1">
              Connect your Google Calendar to automatically import events for meeting preparation
            </p>
          </div>
          <button
            onClick={handleConnect}
            disabled={isAuthenticating}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isAuthenticating ? 'Connecting...' : 'Connect Google Calendar'}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {isAuthenticating && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            Please complete the authentication in your browser. This window will update automatically once you're connected.
          </p>
        </div>
      )}

      <div className="text-xs text-gray-500">
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
