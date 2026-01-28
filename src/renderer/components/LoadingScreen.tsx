import React from 'react'
import { AppIcon } from '../../../AppIcon'

interface LoadingScreenProps {
  calendarSyncLoading?: boolean
  calendarSyncError?: string | null
}

export function LoadingScreen({ calendarSyncLoading, calendarSyncError }: LoadingScreenProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background" data-testid="loading-screen">
      <div className="text-center">
        {/* App Icon with animation */}
        <div className="mb-6 flex justify-center">
          <div className="animate-pulse">
            <AppIcon size={80} />
          </div>
        </div>

        {/* App Name */}
        <h1 className="text-2xl font-semibold text-primary mb-2">
          Prep
        </h1>

        {/* Loading message */}
        <p className="text-secondary mb-6">
          Loading your meeting assistant...
        </p>

        {/* Calendar sync status */}
        {calendarSyncLoading && (
          <p className="text-sm text-secondary mb-4">Syncing calendar events...</p>
        )}
        
        {calendarSyncError && (
          <p className="text-sm text-red-600 mb-4">
            Calendar sync failed: {calendarSyncError}
          </p>
        )}
        
        {!calendarSyncLoading && !calendarSyncError && (
          <p className="text-sm text-secondary mb-4">Initializing application...</p>
        )}

        {/* Loading indicator */}
        <div className="flex justify-center">
          <div className="w-8 h-8 border-2 border-brand-200 border-t-brand-600 rounded-full animate-spin"></div>
        </div>
      </div>
    </div>
  )
}
