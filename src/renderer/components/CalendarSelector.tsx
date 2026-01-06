import React, { useState, useEffect, useMemo } from 'react'
import { CalendarMetadata } from '../../shared/types/calendar-selection'

interface CalendarSelectorProps {
  onSelectionChange: (selectedNames: string[]) => void
  selectedNames: string[]
}

export const CalendarSelector: React.FC<CalendarSelectorProps> = ({
  onSelectionChange,
  selectedNames
}) => {
  const [calendars, setCalendars] = useState<CalendarMetadata[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    let mounted = true
    
    const discoverCalendars = async () => {
      if (!mounted) return
      
      setLoading(true)
      setError(null)
      
      try {
        const result = await window.electronAPI.discoverCalendars()
        if (mounted) {
          setCalendars(result.calendars)
        }
      } catch (err: any) {
        if (mounted) {
          setError(err?.message || 'Failed to discover calendars')
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }
    
    discoverCalendars()
    
    return () => {
      mounted = false
    }
  }, [])

  const filteredCalendars = useMemo(() => 
    calendars.filter(cal => 
      cal.name.toLowerCase().includes(searchTerm.toLowerCase())
    ), [calendars, searchTerm]
  )

  const handleCalendarToggle = (calendarName: string) => {
    const newSelection = selectedNames.includes(calendarName)
      ? selectedNames.filter(name => name !== calendarName)
      : [...selectedNames, calendarName]
    
    onSelectionChange(newSelection)
  }

  const handleSelectAll = () => {
    onSelectionChange(filteredCalendars.map(cal => cal.name))
  }

  const handleSelectNone = () => {
    onSelectionChange([])
  }

  return (
    <div style={{
      backgroundColor: 'white',
      padding: '20px',
      borderRadius: '8px',
      border: '1px solid #e2e8f0',
      marginTop: '16px'
    }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '16px'
      }}>
        <h3 style={{ 
          fontSize: '18px',
          fontWeight: '600',
          color: '#334155',
          margin: 0
        }}>
          Select Calendars ({selectedNames.length} selected)
        </h3>
        
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={handleSelectAll}
            style={{
              padding: '6px 12px',
              fontSize: '14px',
              backgroundColor: '#059669',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            Select All
          </button>
          <button
            onClick={handleSelectNone}
            style={{
              padding: '6px 12px',
              fontSize: '14px',
              backgroundColor: '#6b7280',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            Select None
          </button>
        </div>
      </div>

      <input
        type="text"
        placeholder="Search calendars..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        style={{
          width: '100%',
          padding: '8px 12px',
          fontSize: '14px',
          border: '1px solid #d1d5db',
          borderRadius: '6px',
          marginBottom: '16px'
        }}
      />

      {loading && (
        <div style={{ textAlign: 'center', padding: '20px', color: '#6b7280' }}>
          Loading calendars...
        </div>
      )}

      {error && (
        <div style={{
          padding: '12px',
          backgroundColor: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '6px',
          color: '#dc2626',
          marginBottom: '16px'
        }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {!loading && !error && (
        <div style={{ 
          maxHeight: '300px', 
          overflowY: 'auto',
          display: 'grid',
          gap: '8px'
        }}>
          {filteredCalendars.map((calendar) => (
            <label
              key={calendar.name}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '12px',
                backgroundColor: selectedNames.includes(calendar.name) ? '#f0fdf4' : '#f9fafb',
                border: `1px solid ${selectedNames.includes(calendar.name) ? '#bbf7d0' : '#e5e7eb'}`,
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              <input
                type="checkbox"
                checked={selectedNames.includes(calendar.name)}
                onChange={() => handleCalendarToggle(calendar.name)}
                style={{ marginRight: '12px' }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ 
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '4px'
                }}>
                  {calendar.name}
                </div>
                <div style={{ 
                  fontSize: '12px',
                  color: '#6b7280'
                }}>
                  {calendar.type} • {calendar.isVisible ? 'Visible' : 'Hidden'}
                </div>
              </div>
            </label>
          ))}
        </div>
      )}
    </div>
  )
}
