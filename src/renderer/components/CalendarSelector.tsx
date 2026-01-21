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
    <div className="bg-surface border border-border rounded-lg mt-4 p-5 shadow-sm">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-primary m-0">
          Select Calendars ({selectedNames.length} selected)
        </h3>
        
        <div className="flex gap-2">
          <button
            onClick={handleSelectAll}
            className="px-3 py-1.5 text-sm font-medium text-brand-600 bg-brand-50 border border-brand-200 rounded-md hover:bg-brand-100 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
          >
            Select All
          </button>
          <button
            onClick={handleSelectNone}
            className="px-3 py-1.5 text-sm font-medium text-secondary bg-surface-hover border border-border rounded-md hover:bg-surface transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
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
        className="w-full px-3 py-2 text-sm bg-surface border border-border rounded-md mb-4 placeholder-tertiary focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
      />

      {loading && (
        <div className="text-center py-5 text-secondary">
          Loading calendars...
        </div>
      )}

      {error && (
        <div className="p-3 bg-danger-light/30 border border-danger/30 rounded-md text-danger-dark mb-4">
          <strong>Error:</strong> {error}
        </div>
      )}

      {!loading && !error && (
        <div className="max-h-80 overflow-y-auto space-y-2">
          {filteredCalendars.length === 0 ? (
            <div className="text-center py-5 text-secondary">
              {searchTerm ? 'No calendars match your search.' : 'No calendars found.'}
            </div>
          ) : (
            filteredCalendars.map((calendar) => (
              <label
                key={calendar.name}
                className={`flex items-center p-3 rounded-md cursor-pointer transition-colors ${
                  selectedNames.includes(calendar.name) 
                    ? 'bg-success-light/30 border border-success/30' 
                    : 'bg-surface-hover border border-border hover:bg-surface'
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedNames.includes(calendar.name)}
                  onChange={() => handleCalendarToggle(calendar.name)}
                  className="mr-3 h-4 w-4 text-brand-600 focus:ring-brand-500 border-border rounded"
                />
                <div className="flex-1">
                  <div className="font-medium text-primary mb-1">
                    {calendar.name}
                  </div>
                  <div className="text-xs text-secondary">
                    {calendar.type} • {calendar.isVisible ? 'Visible' : 'Hidden'}
                  </div>
                </div>
              </label>
            ))
          )}
        </div>
      )}
    </div>
  )
}
