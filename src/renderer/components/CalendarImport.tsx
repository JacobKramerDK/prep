import React, { useState, useEffect, useCallback } from 'react'
import { CalendarEvent, CalendarImportResult } from '../../shared/types/calendar'

interface CalendarImportProps {
  onEventsImported?: (events: CalendarEvent[]) => void
}

export const CalendarImport: React.FC<CalendarImportProps> = ({ onEventsImported }) => {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isAppleScriptSupported, setIsAppleScriptSupported] = useState(false)

  // Memoize the callback to prevent unnecessary re-renders
  const handleEventsImported = useCallback((events: CalendarEvent[]) => {
    onEventsImported?.(events)
  }, [onEventsImported])

  useEffect(() => {
    const initialize = async () => {
      try {
        const supported = await window.electronAPI.isAppleScriptSupported()
        setIsAppleScriptSupported(supported)
        
        const existingEvents = await window.electronAPI.getCalendarEvents()
        setEvents(existingEvents)
        handleEventsImported(existingEvents)
      } catch (err) {
        console.warn('Failed to initialize calendar:', err)
      }
    }
    
    initialize()
  }, [handleEventsImported])

  const handleAppleScriptExtraction = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const result: CalendarImportResult = await window.electronAPI.extractCalendarEvents()
      setEvents(result.events)
      handleEventsImported(result.events)
    } catch (err: any) {
      setError(err?.message || 'Failed to extract calendar events')
    } finally {
      setLoading(false)
    }
  }

  const handleICSImport = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const filePath = await window.electronAPI.selectICSFile()
      const result: CalendarImportResult = await window.electronAPI.parseICSFile(filePath)
      setEvents(result.events)
      handleEventsImported(result.events)
    } catch (err: any) {
      if (err?.message !== 'No file selected') {
        setError(err?.message || 'Failed to import ICS file')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleClearEvents = async () => {
    try {
      await window.electronAPI.clearCalendarEvents()
      setEvents([])
      handleEventsImported([])
    } catch (err: any) {
      setError(err?.message || 'Failed to clear events')
    }
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString()
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
          color: '#059669',
          marginBottom: '16px'
        }}>
          📅 Calendar Import
        </h1>
        <p style={{ 
          fontSize: '1.2rem', 
          color: '#64748b',
          marginBottom: '8px'
        }}>
          Import today's meetings from Apple Calendar or ICS files
        </p>
      </header>

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
          Import Options
        </h2>
        
        <div style={{ 
          display: 'grid',
          gridTemplateColumns: isAppleScriptSupported ? '1fr 1fr' : '1fr',
          gap: '16px',
          marginBottom: '16px'
        }}>
          {isAppleScriptSupported && (
            <button
              onClick={handleAppleScriptExtraction}
              disabled={loading}
              style={{
                padding: '16px',
                fontSize: '16px',
                backgroundColor: loading ? '#94a3b8' : '#059669',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontWeight: '500'
              }}
            >
              {loading ? 'Extracting...' : '🍎 Extract from Apple Calendar'}
            </button>
          )}
          
          <button
            onClick={handleICSImport}
            disabled={loading}
            style={{
              padding: '16px',
              fontSize: '16px',
              backgroundColor: loading ? '#94a3b8' : '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontWeight: '500'
            }}
          >
            {loading ? 'Importing...' : '📁 Import ICS File'}
          </button>
        </div>
        
        {events.length > 0 && (
          <button
            onClick={handleClearEvents}
            style={{
              padding: '8px 16px',
              fontSize: '14px',
              backgroundColor: '#dc2626',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            Clear All Events
          </button>
        )}
        
        {error && (
          <div style={{
            marginTop: '16px',
            padding: '12px',
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '6px',
            color: '#dc2626'
          }}>
            <strong>Error:</strong> {error}
          </div>
        )}
      </div>

      <div style={{ 
        backgroundColor: '#f8fafc', 
        padding: '24px', 
        borderRadius: '8px',
        border: '1px solid #e2e8f0'
      }}>
        <h2 style={{ 
          fontSize: '1.5rem', 
          marginBottom: '16px',
          color: '#334155'
        }}>
          Today's Events
        </h2>
        
        {events.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '40px',
            color: '#64748b'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📅</div>
            <p style={{ fontSize: '18px', marginBottom: '8px' }}>No events for today</p>
            <p style={{ fontSize: '14px' }}>Import your calendar to see today's meetings</p>
          </div>
        ) : (
          <div>
            <p style={{ 
              color: '#059669',
              marginBottom: '16px',
              fontSize: '16px',
              fontWeight: '500'
            }}>
              {events.length} event{events.length !== 1 ? 's' : ''} found for today
            </p>
            
            <div style={{ display: 'grid', gap: '16px' }}>
              {events.map((event) => (
                <div key={event.id} style={{
                  backgroundColor: 'white',
                  padding: '20px',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
                }}>
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'flex-start',
                    marginBottom: '12px'
                  }}>
                    <h3 style={{ 
                      fontSize: '18px',
                      fontWeight: '600',
                      color: '#1f2937',
                      margin: 0
                    }}>
                      {event.title}
                    </h3>
                    <span style={{
                      padding: '4px 8px',
                      fontSize: '12px',
                      backgroundColor: event.source === 'applescript' ? '#dcfce7' : '#dbeafe',
                      color: event.source === 'applescript' ? '#166534' : '#1e40af',
                      borderRadius: '4px',
                      fontWeight: '500'
                    }}>
                      {event.source === 'applescript' ? 'Apple Calendar' : 'ICS File'}
                    </span>
                  </div>
                  
                  <div style={{ 
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    marginBottom: '12px',
                    fontSize: '14px',
                    color: '#6b7280'
                  }}>
                    <span>
                      🕐 {event.isAllDay ? 'All day' : `${formatTime(event.startDate)} - ${formatTime(event.endDate)}`}
                    </span>
                    <span>📅 {formatDate(event.startDate)}</span>
                  </div>
                  
                  {event.location && (
                    <div style={{ 
                      marginBottom: '8px',
                      fontSize: '14px',
                      color: '#6b7280'
                    }}>
                      📍 {event.location}
                    </div>
                  )}
                  
                  {event.description && (
                    <div style={{ 
                      marginBottom: '8px',
                      fontSize: '14px',
                      color: '#374151',
                      backgroundColor: '#f9fafb',
                      padding: '8px',
                      borderRadius: '4px'
                    }}>
                      {event.description}
                    </div>
                  )}
                  
                  {event.attendees && event.attendees.length > 0 && (
                    <div style={{ 
                      fontSize: '14px',
                      color: '#6b7280'
                    }}>
                      👥 {event.attendees.length} attendee{event.attendees.length !== 1 ? 's' : ''}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
