import React, { useState, useEffect } from 'react'
import type { ElectronAPI } from '../shared/types/ipc'
import type { CalendarEvent } from '../shared/types/calendar'
import { VaultBrowser } from './components/VaultBrowser'
import { CalendarImport } from './components/CalendarImport'

const App: React.FC = () => {
  const [version, setVersion] = useState<string>('Loading...')
  const [showVault, setShowVault] = useState(false)
  const [showCalendar, setShowCalendar] = useState(false)
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([])

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

    getVersion()
  }, [])

  const handleEventsImported = (events: CalendarEvent[]) => {
    setCalendarEvents(events)
  }

  if (showVault) {
    return <VaultBrowser onBackToHome={() => setShowVault(false)} />
  }

  if (showCalendar) {
    return (
      <div>
        <div style={{ padding: '16px', borderBottom: '1px solid #e2e8f0' }}>
          <button
            onClick={() => setShowCalendar(false)}
            style={{
              padding: '8px 16px',
              fontSize: '14px',
              backgroundColor: '#f1f5f9',
              color: '#475569',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            ← Back to Home
          </button>
        </div>
        <CalendarImport onEventsImported={handleEventsImported} />
      </div>
    )
  }

  return (
    <div style={{ 
      padding: '40px', 
      fontFamily: 'system-ui, -apple-system, sans-serif',
      maxWidth: '800px',
      margin: '0 auto'
    }}>
      <header style={{ marginBottom: '40px' }}>
        <h1 style={{ 
          fontSize: '2.5rem', 
          color: '#2563eb',
          marginBottom: '16px'
        }}>
          Prep - Meeting Assistant
        </h1>
        <p style={{ 
          fontSize: '1.2rem', 
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
      </header>

      <main>
        <div style={{ 
          backgroundColor: '#f8fafc', 
          padding: '24px', 
          borderRadius: '8px',
          border: '1px solid #e2e8f0',
          marginBottom: '24px'
        }}>
          <h2 style={{ 
            fontSize: '1.5rem', 
            marginBottom: '16px',
            color: '#334155'
          }}>
            🚀 Application Status
          </h2>
          <ul style={{ 
            listStyle: 'none', 
            padding: 0,
            margin: 0
          }}>
            <li style={{ 
              padding: '8px 0',
              color: '#059669'
            }}>
              ✅ Electron + React 19 + TypeScript
            </li>
            <li style={{ 
              padding: '8px 0',
              color: '#059669'
            }}>
              ✅ Obsidian Vault Integration
            </li>
            <li style={{ 
              padding: '8px 0',
              color: '#059669'
            }}>
              ✅ File Search & Browse
            </li>
            <li style={{ 
              padding: '8px 0',
              color: '#059669'
            }}>
              ✅ Calendar Integration (Apple Calendar + ICS Files)
            </li>
            <li style={{ 
              padding: '8px 0',
              color: '#d97706'
            }}>
              🚧 AI Meeting Briefs (Coming Soon)
            </li>
          </ul>
          
          {calendarEvents.length > 0 && (
            <div style={{ 
              marginTop: '16px',
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
                📅 {calendarEvents.length} calendar event{calendarEvents.length !== 1 ? 's' : ''} loaded for today
              </p>
            </div>
          )}
        </div>

        <div style={{ 
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '16px',
          marginBottom: '24px'
        }}>
          <button
            onClick={() => setShowVault(true)}
            style={{
              padding: '20px',
              fontSize: '16px',
              backgroundColor: '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '500',
              textAlign: 'left'
            }}
          >
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>📚</div>
            <div style={{ fontWeight: '600', marginBottom: '4px' }}>Vault Browser</div>
            <div style={{ fontSize: '14px', opacity: 0.9 }}>
              Browse and search your Obsidian notes
            </div>
          </button>
          
          <button
            onClick={() => setShowCalendar(true)}
            style={{
              padding: '20px',
              fontSize: '16px',
              backgroundColor: '#059669',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '500',
              textAlign: 'left'
            }}
          >
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>📅</div>
            <div style={{ fontWeight: '600', marginBottom: '4px' }}>Calendar Import</div>
            <div style={{ fontSize: '14px', opacity: 0.9 }}>
              Import today's meetings from Apple Calendar or ICS files
            </div>
          </button>
        </div>
      </main>
    </div>
  )
}

export default App
