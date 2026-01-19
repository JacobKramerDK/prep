import React, { useState, useEffect, useCallback } from 'react'
import { HomePage } from './components/HomePage'
import { SettingsPage } from './components/SettingsPage'
import type { Meeting } from '../shared/types/meeting'

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
  const [mounted, setMounted] = useState(true)

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

  const loadTodaysMeetings = useCallback(async () => {
    if (!hasVault) return
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
  }, [hasVault, mounted])

  const handleRefreshMeetings = useCallback(() => {
    loadTodaysMeetings()
  }, [loadTodaysMeetings])

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
      try {
        await window.electronAPI.startDailyCalendarSync()
        const events = await window.electronAPI.getCalendarEvents()
        if (events && events.length > 0) {
          setCalendarError(null)
        }
      } catch (error) {
        console.error('Auto sync failed:', error)
      }
    }

    getVersion()
    loadExistingEvents()
    performAutoSync()
    checkVaultStatus()
  }, [checkVaultStatus])

  // Check if vault is configured and load meetings
  useEffect(() => {
    const checkVaultAndLoadMeetings = async () => {
      const vaultConfigured = !!vaultPath
      
      if (vaultConfigured !== hasVault && mounted) {
        setHasVault(vaultConfigured)
      }
      
      if (vaultConfigured) {
        await loadTodaysMeetings()
      }
    }

    const timeoutId = setTimeout(checkVaultAndLoadMeetings, 100)
    return () => clearTimeout(timeoutId)
  }, [vaultPath, hasVault, mounted, loadTodaysMeetings])

  return (
    <div className="min-h-screen bg-background text-primary selection:bg-brand-200 selection:text-brand-900 dark:selection:bg-brand-900 dark:selection:text-brand-100">
      {/* Titlebar Drag Region (simulated for Electron) */}
      <div className="h-8 w-full fixed top-0 left-0 z-50 select-none app-region-drag" />

      {/* Main Content */}
      <main className="pt-8 pb-12 min-h-screen">
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
            onRefreshMeetings={handleRefreshMeetings}
          />
        ) : (
          <SettingsPage 
            onBack={() => {
              setCurrentPage('home')
              setTimeout(() => checkVaultStatus(), 100)
            }}
            vaultFileCount={vaultFileCount}
          />
        )}
      </main>
    </div>
  )
}

export default App
