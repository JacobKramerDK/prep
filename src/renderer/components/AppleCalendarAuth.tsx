import React, { useState, useEffect } from 'react'
import { AppleCalendarStatus, AppleCalendarPermissionState } from '../../shared/types/apple-calendar'
import { CalendarError } from '../../shared/types/calendar'
import { CalendarSelector } from './CalendarSelector'
import { useOSDetection } from '../hooks/useOSDetection'
import { Calendar, Settings, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react'

interface AppleCalendarAuthProps {
  onStatusChange?: (status: AppleCalendarStatus) => void
  onError?: (error: string) => void
  onEventsImported?: (events: any[]) => void
}

export const AppleCalendarAuth: React.FC<AppleCalendarAuthProps> = ({
  onStatusChange,
  onError,
  onEventsImported
}) => {
  const osInfo = useOSDetection()
  const [status, setStatus] = useState<AppleCalendarStatus>({
    permissionState: 'unknown',
    selectedCalendarCount: 0,
    totalCalendarCount: 0
  })
  const [isChecking, setIsChecking] = useState(false)
  const [isExtracting, setIsExtracting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showCalendarSelector, setShowCalendarSelector] = useState(false)
  const [selectedCalendars, setSelectedCalendars] = useState<string[]>([])

  useEffect(() => {
    if (osInfo.isMacOS) {
      checkStatus()
      loadSelectedCalendars()
    }
  }, [osInfo.isMacOS])

  const loadSelectedCalendars = async () => {
    try {
      const settings = await window.electronAPI.getSelectedCalendars()
      setSelectedCalendars(settings.selectedCalendarUids)
    } catch (err) {
      console.warn('Failed to load selected calendars:', err)
    }
  }

  const checkStatus = async () => {
    if (!osInfo.isMacOS) return

    setIsChecking(true)
    setError(null)
    
    try {
      const appleStatus = await window.electronAPI.getAppleCalendarStatus()
      setStatus(appleStatus)
      onStatusChange?.(appleStatus)
    } catch (err: any) {
      const errorMessage = err?.message || 'Failed to check Apple Calendar status'
      setError(errorMessage)
      onError?.(errorMessage)
    } finally {
      setIsChecking(false)
    }
  }

  const handleRetryPermissions = async () => {
    setIsChecking(true)
    setError(null)
    
    try {
      // Force a fresh permission check by getting the permission state directly
      const permissionState = await window.electronAPI.getAppleCalendarPermissionState()
      
      // Then get the full status
      const appleStatus = await window.electronAPI.getAppleCalendarStatus()
      setStatus(appleStatus)
      onStatusChange?.(appleStatus)
    } catch (err: any) {
      const errorMessage = err?.message || 'Failed to retry permission check'
      setError(errorMessage)
      onError?.(errorMessage)
    } finally {
      setIsChecking(false)
    }
  }

  const handleCalendarSelectionChange = async (selectedNames: string[]) => {
    setSelectedCalendars(selectedNames)
    
    try {
      await window.electronAPI.updateAppleCalendarSelection(selectedNames)
      // Refresh status after selection change
      await checkStatus()
    } catch (err: any) {
      const errorMessage = err?.message || 'Failed to update calendar selection'
      setError(errorMessage)
      onError?.(errorMessage)
    }
  }

  const handleExtractEvents = async () => {
    setIsExtracting(true)
    setError(null)
    
    try {
      const result = await window.electronAPI.extractAppleCalendarEvents()
      onEventsImported?.(result.events)
    } catch (err: any) {
      const errorMessage = err?.message || 'Failed to extract calendar events'
      setError(errorMessage)
      onError?.(errorMessage)
    } finally {
      setIsExtracting(false)
    }
  }

  if (!osInfo.isMacOS) {
    return null
  }

  if (isChecking || status.permissionState === 'checking') {
    return (
      <div className="p-4 bg-surface border border-border rounded-lg">
        <div className="flex items-center space-x-3">
          <div className="w-5 h-5 bg-brand-600 rounded-full animate-pulse"></div>
          <div>
            <p className="text-sm font-medium text-primary">Checking Apple Calendar</p>
            <p className="text-xs text-secondary">Verifying calendar access...</p>
          </div>
        </div>
      </div>
    )
  }

  if (status.permissionState === 'denied' || error) {
    return (
      <div className="p-4 bg-danger-light/30 border border-danger/30 rounded-lg">
        <div className="flex items-start space-x-3">
          <div className="w-5 h-5 bg-danger rounded-full mt-0.5"></div>
          <div className="flex-1">
            <p className="text-sm font-medium text-danger-dark">Apple Calendar Access Required</p>
            <p className="text-xs text-secondary mt-1">
              {error || 'Calendar access permission is required to sync with Apple Calendar.'}
            </p>
            <div className="mt-3 text-xs text-secondary">
              <p className="font-medium">To grant access:</p>
              <ol className="list-decimal list-inside mt-1 space-y-1">
                <li>Open System Preferences → Security & Privacy</li>
                <li>Click the Privacy tab</li>
                <li>Select Calendar from the list</li>
                <li>Check the box next to Prep</li>
              </ol>
            </div>
            <button
              onClick={handleRetryPermissions}
              className="mt-3 px-3 py-1.5 text-xs font-medium text-white bg-danger hover:bg-danger-dark rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-danger focus:ring-offset-2"
            >
              <RefreshCw className="w-3 h-3 inline mr-1" />
              Retry
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (status.permissionState === 'granted') {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 bg-success-light/30 border border-success/30 rounded-lg">
          <div className="flex items-center space-x-3">
            <div className="w-5 h-5 bg-success rounded-full"></div>
            <div>
              <p className="text-sm font-medium text-success-dark">Connected to Apple Calendar</p>
              <p className="text-xs text-secondary">
                {status.selectedCalendarCount} of {status.totalCalendarCount} calendars selected
              </p>
            </div>
          </div>
          <button
            onClick={checkStatus}
            className="px-3 py-1.5 text-xs font-medium text-success-dark bg-white border border-success/30 rounded-md hover:bg-success-light/20 transition-colors focus:outline-none focus:ring-2 focus:ring-success focus:ring-offset-2"
          >
            <RefreshCw className="w-3 h-3 inline mr-1" />
            Refresh
          </button>
        </div>

        <div>
          <button
            onClick={() => setShowCalendarSelector(!showCalendarSelector)}
            className="flex items-center justify-between w-full p-3 text-sm font-medium text-primary bg-surface border border-border rounded-lg hover:bg-surface-hover transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
          >
            <div className="flex items-center space-x-2">
              <Settings className="w-4 h-4 text-secondary" />
              <span>Select Calendars ({selectedCalendars.length} selected)</span>
            </div>
            {showCalendarSelector ? (
              <ChevronUp className="w-4 h-4 text-secondary" />
            ) : (
              <ChevronDown className="w-4 h-4 text-secondary" />
            )}
          </button>
          
          {showCalendarSelector && (
            <div className="mt-2">
              <CalendarSelector
                selectedNames={selectedCalendars}
                onSelectionChange={handleCalendarSelectionChange}
              />
            </div>
          )}
        </div>

        {selectedCalendars.length > 0 && (
          <button
            onClick={handleExtractEvents}
            disabled={isExtracting}
            className={`w-full px-4 py-2.5 text-sm font-medium text-white rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${
              isExtracting 
                ? 'bg-surface-hover text-secondary cursor-not-allowed' 
                : 'bg-success hover:bg-success-dark focus:ring-success'
            }`}
          >
            <div className="flex items-center justify-center space-x-2">
              <Calendar className="w-4 h-4" />
              <span>{isExtracting ? 'Extracting Events...' : 'Extract Calendar Events'}</span>
            </div>
          </button>
        )}
      </div>
    )
  }

  // Unknown state
  return (
    <div className="p-4 bg-surface border border-border rounded-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-5 h-5 bg-tertiary rounded-full"></div>
          <div>
            <p className="text-sm font-medium text-primary">Apple Calendar</p>
            <p className="text-xs text-secondary">Status unknown</p>
          </div>
        </div>
        <button
          onClick={checkStatus}
          className="px-3 py-1.5 text-xs font-medium text-primary bg-surface-hover border border-border rounded-md hover:bg-surface transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
        >
          <RefreshCw className="w-3 h-3 inline mr-1" />
          Check Status
        </button>
      </div>
    </div>
  )
}
