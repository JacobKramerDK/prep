import React from 'react'
import { AlertTriangle, FileText, Brain, Folder, Target } from 'lucide-react'
import type { ContextMatch } from '../../shared/types/context'

interface Props {
  matches: ContextMatch[]
  isLoading?: boolean
  error?: string | null
}

export const ContextPreview: React.FC<Props> = ({ matches, isLoading, error }) => {
  if (isLoading) {
    return (
      <div className="p-4 bg-surface border border-border rounded-lg mt-4">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-border border-t-brand-600 rounded-full animate-spin" />
          <span className="text-sm text-secondary">
            Finding relevant context from your vault...
          </span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 bg-danger-light/30 border border-danger/30 dark:bg-danger-dark/10 dark:border-danger-dark/30 rounded-lg mt-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          <span className="text-sm text-danger-dark dark:text-danger-400">
            Failed to retrieve context: {error}
          </span>
        </div>
      </div>
    )
  }

  if (!matches || matches.length === 0) {
    return (
      <div className="p-4 bg-surface border border-border rounded-lg mt-4">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4" />
          <span className="text-sm text-secondary">
            No relevant context found in your vault for this meeting.
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className="mt-4 p-4 bg-surface border border-border rounded-lg">
      <div className="flex items-center gap-2 mb-4">
        <Brain className="w-4 h-4" />
        <h4 className="text-base font-semibold text-primary m-0">
          Relevant Context from Your Vault
        </h4>
        <span className="text-xs text-tertiary bg-surface-hover px-2 py-0.5 rounded">
          {matches.length} match{matches.length !== 1 ? 'es' : ''}
        </span>
      </div>

      <div className="grid gap-3">
        {matches.map((match, index) => (
          <div
            key={`${match.file.path}-${index}`}
            className="p-3 bg-background border border-border rounded-lg"
          >
            <div className="flex justify-between items-start mb-2">
              <h5 className="text-sm font-semibold text-primary m-0">
                {match.file.title}
              </h5>
              <div className="flex items-center gap-2">
                <span className="text-xs text-tertiary bg-surface-hover px-2 py-0.5 rounded">
                  {(match.relevanceScore * 100).toFixed(0)}% match
                </span>
              </div>
            </div>

            <div className="text-xs text-tertiary mb-2 flex items-center gap-3">
              <span className="flex items-center gap-1">
                <Folder className="w-3 h-3" />
                {match.file.path}
              </span>
              {match.matchedFields.length > 0 && (
                <span className="flex items-center gap-1">
                  <Target className="w-3 h-3" />
                  Matched: {match.matchedFields.join(', ')}
                </span>
              )}
            </div>

            {match.snippets && match.snippets.length > 0 && (
              <div className="mt-2">
                <div className="text-xs font-medium text-secondary mb-1">
                  Key excerpts:
                </div>
                {match.snippets.map((snippet, snippetIndex) => (
                  <div
                    key={snippetIndex}
                    className="text-xs text-primary bg-surface p-2 rounded border-l-2 border-brand-600 mb-1 italic"
                  >
                    "{snippet}"
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-3 text-xs text-tertiary text-center">
        This context will be included in your AI-generated meeting brief
      </div>
    </div>
  )
}
