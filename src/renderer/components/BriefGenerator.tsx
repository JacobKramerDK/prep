import React, { useState, useEffect } from 'react'
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
      <div style={{
        marginTop: '16px',
        padding: '16px',
        backgroundColor: '#f8fafc',
        borderRadius: '8px',
        border: '1px solid #e2e8f0'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px'
        }}>
          <h4 style={{
            margin: 0,
            fontSize: '16px',
            fontWeight: '600',
            color: '#334155'
          }}>
            🤖 Generate AI Meeting Brief
          </h4>
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
          <div style={{ display: 'grid', gap: '12px' }}>
            <div>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '4px'
              }}>
                Meeting Context <span style={{ color: '#9ca3af', fontWeight: 'normal' }}>(Optional)</span>
              </label>
              <textarea
                value={formData.userContext}
                onChange={(e) => handleInputChange('userContext', e.target.value)}
                placeholder="What's this meeting about? Your role? Key objectives?"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontFamily: 'inherit',
                  resize: 'vertical',
                  minHeight: '80px',
                  boxSizing: 'border-box'
                }}
                disabled={isGenerating}
                rows={3}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '4px'
                }}>
                  Purpose <span style={{ color: '#9ca3af', fontWeight: 'normal' }}>(Optional)</span>
                </label>
                <input
                  type="text"
                  value={formData.meetingPurpose}
                  onChange={(e) => handleInputChange('meetingPurpose', e.target.value)}
                  placeholder="e.g., Planning, Review, Decision"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontFamily: 'inherit',
                    boxSizing: 'border-box'
                  }}
                  disabled={isGenerating}
                />
              </div>

              <div>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '4px'
                }}>
                  Key Topics <span style={{ color: '#9ca3af', fontWeight: 'normal' }}>(Optional)</span>
                </label>
                <input
                  type="text"
                  value={formData.keyTopics}
                  onChange={(e) => handleInputChange('keyTopics', e.target.value)}
                  placeholder="e.g., Budget, Timeline, Resources"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontFamily: 'inherit',
                    boxSizing: 'border-box'
                  }}
                  disabled={isGenerating}
                />
              </div>
            </div>

            {/* Context Integration Section */}
            {isIndexed && (
              <div>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '8px',
                  cursor: 'pointer'
                }}>
                  <input
                    type="checkbox"
                    checked={formData.includeContext}
                    onChange={(e) => handleInputChange('includeContext', e.target.checked.toString())}
                    disabled={isGenerating}
                    style={{
                      width: '16px',
                      height: '16px',
                      cursor: 'pointer'
                    }}
                  />
                  <span>🧠 Include relevant context from vault</span>
                  <span style={{
                    fontSize: '12px',
                    color: '#64748b',
                    backgroundColor: '#e2e8f0',
                    padding: '2px 6px',
                    borderRadius: '4px'
                  }}>
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
              <div style={{
                padding: '12px',
                backgroundColor: '#fef3c7',
                border: '1px solid #fbbf24',
                borderRadius: '6px',
                fontSize: '14px',
                color: '#92400e'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>💡</span>
                  <span>
                    <strong>Tip:</strong> Scan your Obsidian vault to enable intelligent context retrieval for enhanced meeting briefs.
                  </span>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '8px' }}>
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
                  cursor: isGenerating ? 'not-allowed' : 'pointer',
                  fontWeight: '500',
                  opacity: isGenerating ? 0.6 : 1
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
                  cursor: isGenerating ? 'not-allowed' : 'pointer',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                {isGenerating ? (
                  <>
                    <span style={{ animation: 'spin 1s linear infinite' }}>⏳</span>
                    Generating...
                  </>
                ) : (
                  <>
                    <span>✨</span>
                    Generate Brief
                  </>
                )}
              </button>
            </div>
          </div>
        </form>

        <style>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
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
