import React, { useState, useEffect, useCallback } from 'react'
import { HomePage } from './components/HomePage'
import { SettingsPage } from './components/SettingsPage'
import { LoadingScreen } from './components/LoadingScreen'
import type { Meeting } from '../shared/types/meeting'
import type { VaultIndexingStatus, VaultIndexingProgress } from '../shared/types/vault-status'

type Page = 'home' | 'settings'

export function App() {
  const [currentPage, setCurrentPage] = useState<Page>('home')
  const [version, setVersion] = useState<string>('Loading...')
  const [todaysMeetings, setTodaysMeetings] = useState<Meeting[]>([])
  const [meetingsLoading, setMeetingsLoading] = useState(false)
  const [hasVault, setHasVault] = useState(false)
  const [vaultPath, setVaultPath] = useState<string | null>(null)
  const [vaultIndexed, setVaultIndexed] = useState(false)
  const [vaultFileCount, setVaultFileCount] = useState(0)
  const [calendarError, setCalendarError] = useState<string | null>(null)
  const [calendarConnectionStatus, setCalendarConnectionStatus] = useState<'checking' | 'connected' | 'partial' | 'disconnected'>('checking')
  const [googleCalendarConnected, setGoogleCalendarConnected] = useState(false)
  const [appleCalendarConnected, setAppleCalendarConnected] = useState(false)
  const [appleCalendarAvailable, setAppleCalendarAvailable] = useState(false)
  const [mounted, setMounted] = useState(true)
  const [isInitializing, setIsInitializing] = useState(true)
  const [vaultIndexingStatus, setVaultIndexingStatus] = useState<VaultIndexingStatus>({ isIndexing: false })
  const [vaultIndexingProgress, setVaultIndexingProgress] = useState<VaultIndexingProgress | null>(null)
  const [calendarSyncLoading, setCalendarSyncLoading] = useState(false)
  const [calendarSyncError, setCalendarSyncError] = useState<string | null>(null)

  // Cleanup on unmount
  useEffect(() => {
    return () => setMounted(false)
  }, [])

  // Check vault status on app start and when needed
  const checkVaultStatus = useCallback(async (): Promise<void> => {
    try {
      const [isIndexed, fileCount, vaultPath] = await Promise.all([
        window.electronAPI.isContextIndexed(),
        window.electronAPI.getContextIndexedFileCount(),
        window.electronAPI.getVaultPath()
      ])
      
      if (mounted) {
        setVaultIndexed(isIndexed)
        setVaultFileCount(fileCount)
        setVaultPath(vaultPath)
        setHasVault(!!vaultPath)
      }
    } catch (error) {
      console.error('Failed to check vault status:', error)
      if (mounted) {
        setHasVault(false)
        setVaultIndexed(false)
        setVaultFileCount(0)
        setVaultPath(null)
      }
    }
  }, [mounted])

  // Check calendar status on app start and when needed
  const checkCalendarStatus = useCallback(async (): Promise<void> => {
    try {
      const [isGoogleConnected, isAppleAvailable] = await Promise.all([
        window.electronAPI.isGoogleCalendarConnected(),
        window.electronAPI.isAppleCalendarAvailable()
      ])
      
      let isAppleConnected = false
      if (isAppleAvailable) {
        try {
          const appleStatus = await window.electronAPI.getAppleCalendarStatus()
          isAppleConnected = appleStatus.permissionState === 'granted' && appleStatus.selectedCalendarCount > 0
        } catch (error) {
          console.warn('Failed to check Apple Calendar status:', error)
          isAppleConnected = false
        }
      }
      
      if (mounted) {
        setGoogleCalendarConnected(isGoogleConnected)
        setAppleCalendarConnected(isAppleConnected)
        setAppleCalendarAvailable(isAppleAvailable)
        
        // Determine combined status
        const hasAnyConnection = isGoogleConnected || isAppleConnected
        const hasBothConnections = isGoogleConnected && (isAppleConnected || !isAppleAvailable)
        
        if (hasBothConnections) {
          setCalendarConnectionStatus('connected')
        } else if (hasAnyConnection) {
          setCalendarConnectionStatus('partial')
        } else {
          setCalendarConnectionStatus('disconnected')
        }
      }
    } catch (error) {
      console.error('Failed to check calendar status:', error)
      if (mounted) {
        setGoogleCalendarConnected(false)
        setAppleCalendarConnected(false)
        setAppleCalendarAvailable(false)
        setCalendarConnectionStatus('disconnected')
      }
    }
  }, [mounted])

  const loadTodaysMeetings = useCallback(async () => {
    setMeetingsLoading(true)
    try {
      const result = await window.electronAPI.getTodaysMeetings()
      if (mounted) {
        setTodaysMeetings(result.meetings)
      }
    } catch (error) {
      console.error('Failed to load meetings:', error)
      if (mounted) {
        setTodaysMeetings([])
      }
    } finally {
      if (mounted) {
        setMeetingsLoading(false)
      }
    }
  }, [mounted])

  const handleRefreshMeetings = useCallback(async () => {
    try {
      // Trigger fresh Apple Calendar sync and wait for it to complete
      await window.electronAPI.extractCalendarEvents()
      // Then load the updated meetings
      await loadTodaysMeetings()
    } catch (error) {
      console.error('Failed to refresh calendar:', error)
      // Still try to load stored meetings even if sync fails
      loadTodaysMeetings()
    }
  }, [loadTodaysMeetings])

  const refreshCalendarStatus = useCallback(() => {
    checkCalendarStatus()
  }, [checkCalendarStatus])

  useEffect(() => {
    const getVersion = async (): Promise<void> => {
      try {
        if (window.electronAPI) {
          const appVersion = await window.electronAPI.getVersion()
          setVersion(appVersion)
        } else {
          setVersion('Electron API not available')
        }
      } catch (error) {
        console.error('Failed to get version:', error)
        setVersion('Error loading version')
      }
    }

    const loadExistingEvents = async (): Promise<void> => {
      try {
        const existingEvents = await window.electronAPI.getCalendarEvents()
        if (existingEvents && existingEvents.length > 0) {
          setCalendarError(null)
        }
      } catch (error) {
        console.error('Failed to load existing calendar events:', error)
        setCalendarError('Failed to load calendar events. Please try importing your calendar again.')
      }
    }

    const performAutoSync = async (): Promise<void> => {
      setCalendarSyncLoading(true)
      setCalendarSyncError(null)
      try {
        // Start daily sync (handles Google Calendar and scheduling)
        const result = await window.electronAPI.startDailyCalendarSync()
        if (!result.success && result.error) {
          console.warn('Calendar sync failed but continuing:', result.error)
          setCalendarSyncError(result.error)
          // Don't throw - allow app to continue with cached/existing events
        }
        
        // Extract Apple Calendar events in background (non-blocking)
        window.electronAPI.extractCalendarEvents().catch(appleError => {
          console.warn('Apple Calendar sync failed but continuing:', appleError)
        })
        
        const events = await window.electronAPI.getCalendarEvents()
        if (events && events.length > 0) {
          setCalendarError(null)
        }
      } catch (error) {
        console.error('Auto sync failed:', error)
        setCalendarSyncError('Calendar sync failed')
        // Don't throw - allow app to continue
      } finally {
        setCalendarSyncLoading(false)
      }
    }

    const initializeApp = async (): Promise<void> => {
      try {
        // Run non-blocking operations in parallel
        await Promise.all([
          getVersion(),
          loadExistingEvents(),
          checkVaultStatus(),
          checkCalendarStatus()
        ])
        
        // Wait for calendar sync to complete before proceeding
        await performAutoSync()
        
      } catch (error) {
        console.error('App initialization failed:', error)
      } finally {
        // Set initialization complete after all tasks finish
        if (mounted) {
          setIsInitializing(false)
        }
      }
    }

    initializeApp()
  }, [checkVaultStatus, checkCalendarStatus, mounted])

  // Add progress event listener
  useEffect(() => {
    const cleanup = window.electronAPI.onVaultIndexingProgress((progress) => {
      if (mounted) {
        setVaultIndexingProgress(progress)
        
        // Update indexing status based on progress
        if (progress.stage === 'complete') {
          setVaultIndexingStatus({ isIndexing: false })
          // Refresh vault status after completion
          checkVaultStatus()
        } else if (progress.stage === 'error') {
          setVaultIndexingStatus({ isIndexing: false })
        } else {
          setVaultIndexingStatus({ isIndexing: true, progress })
        }
      }
    })
    
    return cleanup
  }, [mounted, checkVaultStatus])
  
  // Add calendar events update listener
  useEffect(() => {
    const cleanup = window.electronAPI.onCalendarEventsUpdated((data) => {
      if (mounted) {
        console.log(`Calendar events updated: ${data.eventCount} events from ${data.source}`)
        // Refresh today's meetings when calendar events are updated
        loadTodaysMeetings()
      }
    })
    
    return cleanup
  }, [mounted]) // Remove loadTodaysMeetings from dependency array since it's stable
  
  // Check indexing status on mount
  useEffect(() => {
    const checkIndexingStatus = async () => {
      try {
        const status = await window.electronAPI.getVaultIndexingStatus()
        if (mounted) {
          setVaultIndexingStatus(status)
        }
      } catch (error) {
        console.error('Failed to check indexing status:', error)
      }
    }
    
    checkIndexingStatus()
  }, [mounted])

  // Check if vault is configured and load meetings
  useEffect(() => {
    const checkVaultAndLoadMeetings = async () => {
      const vaultConfigured = !!vaultPath
      
      if (vaultConfigured !== hasVault && mounted) {
        setHasVault(vaultConfigured)
      }
      
      // Always load meetings regardless of vault configuration
      await loadTodaysMeetings()
    }

    const timeoutId = setTimeout(checkVaultAndLoadMeetings, 100)
    return () => clearTimeout(timeoutId)
  }, [vaultPath, hasVault, mounted, loadTodaysMeetings])

  return (
    <div className="min-h-screen max-w-full overflow-x-hidden bg-background text-primary selection:bg-brand-200 selection:text-brand-900 dark:selection:bg-brand-900 dark:selection:text-brand-100" data-testid={isInitializing ? "app-initializing" : "app-initialized"}>
      {/* Show loading screen during initialization */}
      {isInitializing ? (
        <LoadingScreen 
          calendarSyncLoading={calendarSyncLoading}
          calendarSyncError={calendarSyncError}
        />
      ) : (
        <>
          {/* Titlebar Drag Region (simulated for Electron) */}
          <div className="h-8 w-full fixed top-0 left-0 z-50 select-none app-region-drag" />

          {/* Main Content */}
          <main className="pt-8 pb-12">
            {currentPage === 'home' ? (
              <HomePage 
                onNavigate={setCurrentPage}
                version={version}
                todaysMeetings={todaysMeetings}
                meetingsLoading={meetingsLoading}
                hasVault={hasVault}
                vaultPath={vaultPath}
                vaultIndexed={vaultIndexed}
                vaultFileCount={vaultFileCount}
                calendarError={calendarError}
                calendarConnectionStatus={calendarConnectionStatus}
                googleCalendarConnected={googleCalendarConnected}
                appleCalendarConnected={appleCalendarConnected}
                appleCalendarAvailable={appleCalendarAvailable}
                isInitializing={isInitializing}
                onRefreshMeetings={handleRefreshMeetings}
              />
            ) : (
              <SettingsPage 
                onBack={() => {
                  setCurrentPage('home')
                  setTimeout(() => {
                    checkVaultStatus()
                    refreshCalendarStatus()
                  }, 100)
                }}
                vaultFileCount={vaultFileCount}
              />
            )}
          </main>
        </>
      )}
    </div>
  )
}

export default App
