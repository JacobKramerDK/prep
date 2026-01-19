import React, { useState, useEffect } from 'react'
import { Lightbulb, Sparkles, Loader2, Bot, Brain } from 'lucide-react'
import type { Meeting } from '../../shared/types/meeting'
import { BriefGenerationRequest } from '../../shared/types/brief'
import { ContextPreview } from './ContextPreview'
import { useContextRetrieval } from '../hooks/useContextRetrieval'

interface Props {
  meeting: Meeting
  onGenerate: (request: BriefGenerationRequest) => Promise<void>
  isGenerating: boolean
  error: string | null
  onClose: () => void
  inline?: boolean
}

export const BriefGenerator: React.FC<Props> = ({ 
  meeting, 
  onGenerate, 
  isGenerating, 
  error, 
  onClose,
  inline = false 
}) => {
  const [formData, setFormData] = useState({
    userContext: '',
    meetingPurpose: '',
    keyTopics: '',
    attendees: '',
    additionalNotes: '',
    includeContext: true
  })

  const {
    matches,
    isLoading: isLoadingContext,
    error: contextError,
    isIndexed,
    indexedFileCount,
    findRelevantContext,
    checkIndexStatus
  } = useContextRetrieval()

  // Check index status and find context when component mounts
  useEffect(() => {
    checkIndexStatus()
  }, [checkIndexStatus])

  useEffect(() => {
    if (formData.includeContext && isIndexed && meeting.id) {
      findRelevantContext(meeting.id)
    }
  }, [formData.includeContext, isIndexed, meeting.id, findRelevantContext])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const request: BriefGenerationRequest = {
      meetingId: meeting.id,
      userContext: formData.userContext || 'Generate a comprehensive meeting brief',
      meetingPurpose: formData.meetingPurpose,
      keyTopics: formData.keyTopics ? formData.keyTopics.split(',').map(t => t.trim()).filter(t => t) : undefined,
      attendees: formData.attendees ? formData.attendees.split(',').map(a => a.trim()).filter(a => a) : undefined,
      additionalNotes: formData.additionalNotes,
      includeContext: formData.includeContext
    }

    await onGenerate(request)
  }

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    if (field === 'includeContext') {
      setFormData(prev => ({ ...prev, [field]: value === 'true' }))
    } else {
      setFormData(prev => ({ ...prev, [field]: value }))
    }
  }

  if (inline) {
    return (
      <div className="mt-4 p-4 bg-surface border border-border rounded-lg">
        <div className="flex justify-between items-center mb-4">
          <h4 className="text-base font-semibold text-primary flex items-center gap-2">
            <Bot className="w-5 h-5" />
            Generate AI Meeting Brief
          </h4>
        </div>

        {error && (
          <div className="p-3 bg-danger-light/30 border border-danger/30 dark:bg-danger-dark/10 dark:border-danger-dark/30 rounded-lg mb-4">
            <p className="text-sm text-danger-dark dark:text-danger-400 m-0">
              {error}
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="grid gap-3">
            <div>
              <label className="block text-sm font-medium text-primary mb-1">
                Meeting Context <span className="text-tertiary font-normal">(Optional)</span>
              </label>
              <textarea
                value={formData.userContext}
                onChange={(e) => handleInputChange('userContext', e.target.value)}
                placeholder="What's this meeting about? Your role? Key objectives?"
                className="w-full p-2 border border-border rounded-lg text-sm bg-background text-primary placeholder-tertiary resize-vertical min-h-[80px] disabled:opacity-60"
                disabled={isGenerating}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-primary mb-1">
                  Purpose <span className="text-tertiary font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={formData.meetingPurpose}
                  onChange={(e) => handleInputChange('meetingPurpose', e.target.value)}
                  placeholder="e.g., Planning, Review, Decision"
                  className="w-full p-2 border border-border rounded-lg text-sm bg-background text-primary placeholder-tertiary disabled:opacity-60"
                  disabled={isGenerating}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-primary mb-1">
                  Key Topics <span className="text-tertiary font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={formData.keyTopics}
                  onChange={(e) => handleInputChange('keyTopics', e.target.value)}
                  placeholder="e.g., Budget, Timeline, Resources"
                  className="w-full p-2 border border-border rounded-lg text-sm bg-background text-primary placeholder-tertiary disabled:opacity-60"
                  disabled={isGenerating}
                />
              </div>
            </div>

            {/* Context Integration Section */}
            {isIndexed && (
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-primary mb-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.includeContext}
                    onChange={(e) => handleInputChange('includeContext', e.target.checked.toString())}
                    disabled={isGenerating}
                    className="w-4 h-4 cursor-pointer"
                  />
                  <span className="flex items-center gap-2">
                    <Brain className="w-4 h-4" />
                    Include relevant context from vault
                  </span>
                  <span className="text-xs text-tertiary bg-surface-hover px-2 py-0.5 rounded">
                    {indexedFileCount} files indexed
                  </span>
                </label>
                
                {formData.includeContext && (
                  <ContextPreview
                    matches={matches}
                    isLoading={isLoadingContext}
                    error={contextError}
                  />
                )}
              </div>
            )}

            {!isIndexed && indexedFileCount === 0 && (
              <div className="p-3 bg-warning-light/30 border border-warning/30 dark:bg-warning-dark/10 dark:border-warning-dark/30 rounded-lg text-sm text-warning-dark dark:text-warning-400">
                <div className="flex items-center gap-2">
                  <Lightbulb className="w-4 h-4" />
                  <span>
                    <strong>Tip:</strong> Scan your Obsidian vault to enable intelligent context retrieval for enhanced meeting briefs.
                  </span>
                </div>
              </div>
            )}

            <div className="flex gap-2 justify-end mt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isGenerating}
                className="px-4 py-2 text-sm font-medium text-secondary hover:text-primary bg-surface-hover border border-border rounded-lg hover:bg-surface transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isGenerating}
                className="px-5 py-2 text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 disabled:bg-secondary rounded-lg transition-colors disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Generate Brief
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    )
  }

  // Keep original modal version for backward compatibility
  return (
    <div style={{ 
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px',
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)',
        maxWidth: '600px',
        width: '100%',
        maxHeight: '90vh',
        overflow: 'auto'
      }}>
        <div style={{ padding: '24px' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: '20px'
          }}>
            <div>
              <h2 style={{
                margin: 0,
                fontSize: '20px',
                fontWeight: '600',
                color: '#1f2937'
              }}>
                Generate Meeting Brief
              </h2>
              <p style={{
                margin: '4px 0 0 0',
                fontSize: '14px',
                color: '#6b7280'
              }}>
                {meeting.title}
              </p>
            </div>
            <button
              onClick={onClose}
              disabled={isGenerating}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '24px',
                cursor: isGenerating ? 'not-allowed' : 'pointer',
                color: '#9ca3af',
                padding: '4px'
              }}
            >
              ×
            </button>
          </div>

          {error && (
            <div style={{
              padding: '12px',
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '6px',
              marginBottom: '16px'
            }}>
              <p style={{
                margin: 0,
                fontSize: '14px',
                color: '#dc2626'
              }}>
                {error}
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={onClose}
                disabled={isGenerating}
                style={{
                  padding: '8px 16px',
                  fontSize: '14px',
                  backgroundColor: '#f8fafc',
                  color: '#64748b',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  cursor: isGenerating ? 'not-allowed' : 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isGenerating}
                style={{
                  padding: '8px 20px',
                  fontSize: '14px',
                  backgroundColor: isGenerating ? '#9ca3af' : '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: isGenerating ? 'not-allowed' : 'pointer'
                }}
              >
                {isGenerating ? 'Generating...' : 'Generate Brief'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
