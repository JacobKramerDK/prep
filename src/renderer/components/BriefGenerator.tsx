import React, { useState, useEffect } from 'react'
import { Lightbulb, Sparkles, Loader2, Bot, Brain } from 'lucide-react'
import type { Meeting } from '../../shared/types/meeting'
import { BriefGenerationRequest } from '../../shared/types/brief'
import { ContextPreview } from './ContextPreview'
import { useContextRetrieval } from '../hooks/useContextRetrieval'
import { VoiceDictationButton } from './VoiceDictationButton'

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
    includeContext: true
  })

  const {
    matches,
    isLoading: isLoadingContext,
    error: contextError,
    isIndexed,
    indexedFileCount,
    findRelevantContext,
    findRelevantContextEnhanced,
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

  const handleRefreshContext = () => {
    if (meeting.id && isIndexed) {
      const additionalContext = {}
      
      findRelevantContext(meeting.id)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const request: BriefGenerationRequest = {
      meetingId: meeting.id,
      userContext: formData.userContext.trim() || '',
      meetingPurpose: undefined,
      keyTopics: undefined,
      attendees: undefined,
      additionalNotes: undefined,
      includeContext: formData.includeContext,
      contextMatches: formData.includeContext ? matches : undefined
    }

    console.log('Submitting brief generation request:', request)
    console.log('Meeting data:', meeting)
    console.log('Form data:', formData)
    
    try {
      await onGenerate(request)
      console.log('Brief generation completed successfully')
    } catch (error) {
      console.error('Brief generation failed:', error)
    }
  }

  const handleInputChange = (field: keyof typeof formData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleDictationTranscript = (transcript: string) => {
    // Debug logging for dictation integration
    if (window.electronAPI?.isDebugMode) {
      console.log('[BRIEF-GENERATOR] Dictation transcript received', JSON.stringify({
        transcriptLength: transcript.length,
        transcriptPreview: transcript.substring(0, 100),
        currentContextLength: formData.userContext.length,
        willAppend: !!formData.userContext
      }, null, 2))
    }
    
    setFormData(prev => ({ 
      ...prev, 
      userContext: prev.userContext ? `${prev.userContext} ${transcript}` : transcript 
    }))
    
    // Log final result
    if (window.electronAPI?.isDebugMode) {
      console.log('[BRIEF-GENERATOR] Context updated after dictation', JSON.stringify({
        newContextLength: formData.userContext.length + transcript.length + (formData.userContext ? 1 : 0)
      }, null, 2))
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
          <div className="p-3 bg-danger-light/30 border border-danger/30 dark:bg-danger-dark/10 dark:border-danger-dark/30 rounded-lg mb-4" data-testid="brief-error">
            <div className="flex items-start gap-2">
              <div className="flex-shrink-0 mt-0.5">
                <svg className="w-4 h-4 text-danger-dark dark:text-danger-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-sm text-danger-dark dark:text-danger-400 m-0 font-medium">
                  Brief Generation Failed
                </p>
                <p className="text-sm text-danger-dark dark:text-danger-400 m-0 mt-1">
                  {error}
                </p>
                {error.includes('API key') && (
                  <p className="text-xs text-danger-dark/80 dark:text-danger-400/80 m-0 mt-2">
                    💡 Go to Settings → OpenAI to update your API key
                  </p>
                )}
                {error.includes('quota') && (
                  <p className="text-xs text-danger-dark/80 dark:text-danger-400/80 m-0 mt-2">
                    💡 Check your OpenAI billing at platform.openai.com
                  </p>
                )}
                {error.includes('model') && (
                  <p className="text-xs text-danger-dark/80 dark:text-danger-400/80 m-0 mt-2">
                    💡 Try selecting a different model in Settings
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="grid gap-3">
            <div>
              <label className="block text-sm font-medium text-primary mb-1">
                Context <span className="text-tertiary font-normal">(Optional)</span>
              </label>
              <div className="relative">
                <textarea
                  value={formData.userContext}
                  onChange={(e) => handleInputChange('userContext', e.target.value)}
                  placeholder="Provide any relevant context for your meeting: purpose, key topics, attendees, objectives, or any other details that would help generate a comprehensive brief."
                  className="w-full p-2 pr-12 border border-border rounded-lg text-sm bg-background text-primary placeholder-tertiary resize-vertical min-h-[80px] disabled:opacity-60"
                  disabled={isGenerating}
                  rows={4}
                  data-testid="context-textarea"
                />
                <VoiceDictationButton 
                  onTranscript={handleDictationTranscript}
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
                    onChange={(e) => handleInputChange('includeContext', e.target.checked)}
                    disabled={isGenerating}
                    className="w-4 h-4 cursor-pointer"
                  />
                  <span className="flex items-center gap-2">
                    <Brain className="w-4 h-4" />
                    Include relevant context from vault
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-tertiary bg-surface-hover px-2 py-0.5 rounded">
                      {indexedFileCount} files indexed
                    </span>
                    {formData.includeContext && isIndexed && (
                      <button
                        type="button"
                        onClick={handleRefreshContext}
                        disabled={isLoadingContext}
                        className="text-xs px-2 py-1 bg-brand text-white rounded hover:bg-brand-600 disabled:opacity-50 flex items-center gap-1"
                      >
                        {isLoadingContext ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Brain className="w-3 h-3" />
                        )}
                        Refresh
                      </button>
                    )}
                  </div>
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
                data-testid="generate-button"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span data-testid="brief-loading">Generating...</span>
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
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <div style={{ flexShrink: 0, marginTop: '2px' }}>
                  <svg style={{ width: '16px', height: '16px', color: '#dc2626' }} fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{
                    margin: '0 0 4px 0',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#dc2626'
                  }}>
                    Brief Generation Failed
                  </p>
                  <p style={{
                    margin: 0,
                    fontSize: '14px',
                    color: '#dc2626'
                  }}>
                    {error}
                  </p>
                  {error.includes('API key') && (
                    <p style={{
                      margin: '8px 0 0 0',
                      fontSize: '12px',
                      color: '#dc2626',
                      opacity: 0.8
                    }}>
                      💡 Go to Settings → OpenAI to update your API key
                    </p>
                  )}
                  {error.includes('quota') && (
                    <p style={{
                      margin: '8px 0 0 0',
                      fontSize: '12px',
                      color: '#dc2626',
                      opacity: 0.8
                    }}>
                      💡 Check your OpenAI billing at platform.openai.com
                    </p>
                  )}
                  {error.includes('model') && (
                    <p style={{
                      margin: '8px 0 0 0',
                      fontSize: '12px',
                      color: '#dc2626',
                      opacity: 0.8
                    }}>
                      💡 Try selecting a different model in Settings
                    </p>
                  )}
                </div>
              </div>
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
