import React from 'react'
import { Database } from 'lucide-react'
import { VaultIndexingProgress } from '../../shared/types/vault-status'

interface Props {
  progress?: VaultIndexingProgress
}

export function VaultIndexingLoader({ progress }: Props) {
  const getProgressText = () => {
    if (!progress) return 'Preparing vault...'
    
    switch (progress.stage) {
      case 'scanning': return 'Scanning vault files...'
      case 'indexing': return `Indexing files... (${progress.current}/${progress.total})`
      case 'complete': return 'Vault ready!'
      case 'error': return `Error: ${progress.error}`
      default: return 'Processing vault...'
    }
  }
  
  const getProgressPercentage = () => {
    if (!progress || progress.total === 0) return 0
    return Math.round((progress.current / progress.total) * 100)
  }
  
  return (
    <div className="text-center p-6" data-testid="vault-indexing-loader">
      <div className="mb-4 flex justify-center">
        <div className="animate-pulse">
          <Database className="w-12 h-12 text-brand-600" />
        </div>
      </div>
      
      <p className="text-secondary mb-4">{getProgressText()}</p>
      
      {progress && progress.stage !== 'error' && progress.stage !== 'complete' && (
        <div className="w-full bg-surface-hover rounded-full h-2 mb-2">
          <div 
            className="bg-brand-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${getProgressPercentage()}%` }}
            role="progressbar"
            aria-valuenow={getProgressPercentage()}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>
      )}
      
      <div className="flex justify-center">
        <div className="w-6 h-6 border-2 border-brand-200 border-t-brand-600 rounded-full animate-spin"></div>
      </div>
    </div>
  )
}
