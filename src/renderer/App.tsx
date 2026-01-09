import React, { useState, useEffect, useCallback } from 'react'
import type { ElectronAPI } from '../shared/types/ipc'
import type { CalendarEvent } from '../shared/types/calendar'
import type { Meeting } from '../shared/types/meeting'
import { TodaysMeetings } from './components/TodaysMeetings'
import { Settings } from './components/Settings'

const App: React.FC = () => {
  // Constants
  const VAULT_CHECK_DEBOUNCE_MS = 100

  const [version, setVersion] = useState<string>('Loading...')
  const [showSettings, setShowSettings] = useState(false)
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]) // Maintains imported events for meeting detection system
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
      // Check if vault is indexed and get vault path
      const [isIndexed, fileCount, vaultPath] = await Promise.all([
        window.electronAPI.isContextIndexed(),
        window.electronAPI.getContextIndexedFileCount(),
        window.electronAPI.getVaultPath()
      ])
      
      if (mounted) {
        setVaultIndexed(isIndexed)
        setVaultFileCount(fileCount)
        setVaultPath(vaultPath)
        setHasVault(!!vaultPath) // Vault is connected if path exists
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

    // Load existing calendar events and vault status on app start
    const loadExistingEvents = async (): Promise<void> => {
      try {
        const existingEvents = await window.electronAPI.getCalendarEvents()
        if (existingEvents && existingEvents.length > 0) {
          setCalendarEvents(existingEvents)
          setCalendarError(null)
        }
      } catch (error) {
        console.error('Failed to load existing calendar events:', error)
        setCalendarError('Failed to load calendar events. Please try importing your calendar again.')
      }
    }

    getVersion()
    loadExistingEvents()
    checkVaultStatus()
  }, [checkVaultStatus])

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

  // Check if vault is configured and load meetings
  useEffect(() => {
    const checkVaultAndLoadMeetings = async () => {
      // Vault is configured if we have a vault path
      const vaultConfigured = !!vaultPath
      
      // Prevent flickering by batching state updates
      if (vaultConfigured !== hasVault && mounted) {
        setHasVault(vaultConfigured)
      }
      
      if (vaultConfigured) {
        await loadTodaysMeetings()
      }
    }

    // Debounce the effect to prevent rapid re-renders
    const timeoutId = setTimeout(checkVaultAndLoadMeetings, VAULT_CHECK_DEBOUNCE_MS)
    return () => clearTimeout(timeoutId)
  }, [vaultPath, hasVault, mounted, loadTodaysMeetings])

  const handleEventsImported = (events: CalendarEvent[]) => {
    setCalendarEvents(events)
  }

  if (showSettings) {
    return <Settings onBackToHome={() => {
      setShowSettings(false)
      // Refresh vault status when returning from Settings
      setTimeout(() => checkVaultStatus(), 100)
    }} />
  }

  return (
    <div style={{ 
      padding: '40px', 
      fontFamily: 'system-ui, -apple-system, sans-serif',
      maxWidth: '900px',
      margin: '0 auto',
      lineHeight: '1.6'
    }}>
      <header style={{ marginBottom: '48px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 style={{ 
              fontSize: '2.75rem', 
              color: '#2563eb',
              marginBottom: '16px',
              fontWeight: '700'
            }}>
              Prep - Meeting Assistant
            </h1>
            <p style={{ 
              fontSize: '1.25rem', 
              color: '#64748b',
              marginBottom: '8px'
            }}>
              Desktop meeting preparation assistant for Obsidian users
            </p>
            <p style={{ 
              fontSize: '0.9rem', 
              color: '#94a3b8'
            }}>
              Version: {version}
            </p>
          </div>
          <button
            onClick={() => setShowSettings(true)}
            style={{
              padding: '10px 18px',
              fontSize: '14px',
              backgroundColor: '#f1f5f9',
              color: '#475569',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontWeight: '500'
            }}
          >
            ⚙️ Settings
          </button>
        </div>
      </header>

      <main style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {calendarError && (
          <div style={{
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '24px'
          }}>
            <p style={{
              color: '#dc2626',
              margin: 0,
              fontSize: '14px'
            }}>
              {calendarError}
            </p>
          </div>
        )}

        {/* Status Indicators */}
        {todaysMeetings.length > 0 && (
          <div style={{ 
            marginBottom: '24px',
            padding: '12px',
            backgroundColor: '#ecfdf5',
            border: '1px solid #a7f3d0',
            borderRadius: '6px'
          }}>
            <p style={{ 
              color: '#065f46',
              margin: 0,
              fontSize: '14px'
            }}>
              📅 {todaysMeetings.length} meeting{todaysMeetings.length !== 1 ? 's' : ''} scheduled for today
            </p>
          </div>
        )}

        {/* Vault Status Indicator */}
        {vaultPath && (
          <div style={{ 
            marginBottom: '32px',
            padding: '16px',
            backgroundColor: vaultIndexed ? '#f0fdf4' : '#fef3c7',
            border: `2px solid ${vaultIndexed ? '#bbf7d0' : '#fbbf24'}`,
            borderRadius: '8px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <span style={{ fontSize: '20px' }}>{vaultIndexed ? '✅' : '⚠️'}</span>
              <span style={{ 
                color: vaultIndexed ? '#166534' : '#92400e',
                fontSize: '16px',
                fontWeight: '600'
              }}>
                Obsidian Vault {vaultIndexed ? 'Connected & Indexed' : 'Connected (Not Indexed)'}
              </span>
            </div>
            <div style={{ 
              fontSize: '14px',
              color: vaultIndexed ? '#065f46' : '#78350f',
              marginLeft: '32px',
              lineHeight: '1.4'
            }}>
              📁 {vaultPath}
              {vaultIndexed && (
                <div style={{ marginTop: '4px' }}>
                  🔍 {vaultFileCount} files indexed for AI context
                </div>
              )}
            </div>
          </div>
        )}
        
        {!vaultPath && (
          <div style={{ 
            marginBottom: '32px',
            padding: '20px',
            backgroundColor: '#f8fafc',
            border: '2px solid #cbd5e1',
            borderRadius: '8px',
            textAlign: 'center'
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <span style={{ fontSize: '24px' }}>📚</span>
              <span style={{ 
                color: '#475569',
                fontSize: '18px',
                fontWeight: '600'
              }}>
                No Obsidian Vault Connected
              </span>
            </div>
            <p style={{ 
              fontSize: '14px',
              color: '#64748b',
              marginBottom: '16px',
              lineHeight: '1.5'
            }}>
              Connect your Obsidian vault to generate AI-powered meeting briefs with relevant context from your notes.
            </p>
            <button
              onClick={() => setShowSettings(true)}
              style={{
                padding: '12px 24px',
                fontSize: '14px',
                backgroundColor: '#2563eb',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                margin: '0 auto'
              }}
            >
              ⚙️ Open Settings to Connect Vault
            </button>
          </div>
        )}

        {/* Today's Meetings Section - Show when vault is configured */}
        {hasVault && (
          <div style={{ marginBottom: '32px' }}>
            <h2 style={{ 
              fontSize: '1.5rem', 
              color: '#1e293b',
              marginBottom: '16px',
              fontWeight: '600'
            }}>
              📅 Today's Meetings
            </h2>
            <TodaysMeetings 
              meetings={todaysMeetings}
              isLoading={meetingsLoading}
              onRefresh={handleRefreshMeetings}
            />
          </div>
        )}


      </main>
    </div>
  )
}

export default App
