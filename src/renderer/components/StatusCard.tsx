import React from 'react'
import { CheckCircle2, AlertCircle, Database } from 'lucide-react'

interface StatusCardProps {
  isConnected: boolean
  path?: string | null
  indexedCount?: number
  isIndexed?: boolean
  isInitializing?: boolean
  onAction?: () => void
}

export function StatusCard({
  isConnected,
  path,
  indexedCount = 0,
  isIndexed = false,
  isInitializing = false,
  onAction,
}: StatusCardProps) {
  // Extract just the vault name from the full path
  const vaultName = path ? path.split('/').pop() || path : ''

  // Show loading state during initialization
  if (isInitializing) {
    return (
      <div className="bg-surface border border-border rounded-xl p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-surface-hover border border-border flex items-center justify-center">
            <Database className="w-5 h-5 text-secondary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-primary">Obsidian Vault</h3>
            <p className="text-sm text-secondary">Checking connection...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!isConnected || !path) {
    return (
      <div className="bg-surface border border-border rounded-xl p-4 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 rounded-lg bg-surface-hover border border-border flex items-center justify-center">
                <Database className="w-5 h-5 text-secondary" />
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-sm font-semibold text-primary">
                  Obsidian Vault
                </h3>
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-warning-light/40 dark:bg-warning-dark/20 border border-warning/30 dark:border-warning-dark/30">
                  <div className="w-1.5 h-1.5 rounded-full bg-warning dark:bg-warning-400" />
                  <span className="text-xs font-medium text-warning-dark dark:text-warning-400">
                    Not Connected
                  </span>
                </div>
              </div>
              <p className="text-sm text-secondary">
                Connect your vault to generate AI briefs
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-surface border border-border rounded-xl p-4 shadow-sm hover:shadow-md transition-all duration-200">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {/* Icon */}
          <div className="flex-shrink-0">
            <div className="w-10 h-10 rounded-lg bg-surface-hover border border-border flex items-center justify-center">
              <Database className="w-5 h-5 text-secondary" />
            </div>
          </div>

          {/* Content */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-sm font-semibold text-primary">
                Obsidian Vault
              </h3>
              <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full ${
                isIndexed 
                  ? 'bg-success-light/40 dark:bg-success-dark/20 border border-success/30 dark:border-success-dark/30'
                  : 'bg-warning-light/40 dark:bg-warning-dark/20 border border-warning/30 dark:border-warning-dark/30'
              }`}>
                <div className={`w-1.5 h-1.5 rounded-full ${
                  isIndexed ? 'bg-success dark:bg-success-400' : 'bg-warning dark:bg-warning-400'
                }`} />
                <span className={`text-xs font-medium ${
                  isIndexed 
                    ? 'text-success-dark dark:text-success-400'
                    : 'text-warning-dark dark:text-warning-400'
                }`}>
                  {isIndexed ? 'Indexed' : 'Connected'}
                </span>
              </div>
            </div>
            <p className="text-sm text-secondary">
              <span className="font-medium text-primary">{indexedCount}</span>{' '}
              files {isIndexed ? 'indexed' : 'found'}
              {vaultName !== path && (
                <span className="text-tertiary ml-1.5">• {vaultName}</span>
              )}
            </p>
          </div>
        </div>

        {/* Action Button */}
        {onAction && (
          <button
            onClick={onAction}
            className="flex-shrink-0 px-3 py-1.5 text-sm font-medium text-secondary hover:text-primary bg-surface-hover hover:bg-surface border border-border rounded-lg transition-colors"
          >
            Change
          </button>
        )}
      </div>
    </div>
  )
}
