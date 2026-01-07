import React from 'react'
import type { ContextMatch } from '../../shared/types/context'

interface Props {
  matches: ContextMatch[]
  isLoading?: boolean
  error?: string | null
}

export const ContextPreview: React.FC<Props> = ({ matches, isLoading, error }) => {
  if (isLoading) {
    return (
      <div style={{
        padding: '16px',
        backgroundColor: '#f8fafc',
        borderRadius: '8px',
        border: '1px solid #e2e8f0',
        marginTop: '16px'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <div style={{
            width: '16px',
            height: '16px',
            border: '2px solid #e2e8f0',
            borderTop: '2px solid #3b82f6',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }} />
          <span style={{
            fontSize: '14px',
            color: '#64748b'
          }}>
            Finding relevant context from your vault...
          </span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{
        padding: '16px',
        backgroundColor: '#fef2f2',
        borderRadius: '8px',
        border: '1px solid #fecaca',
        marginTop: '16px'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span style={{ fontSize: '16px' }}>⚠️</span>
          <span style={{
            fontSize: '14px',
            color: '#dc2626'
          }}>
            Failed to retrieve context: {error}
          </span>
        </div>
      </div>
    )
  }

  if (!matches || matches.length === 0) {
    return (
      <div style={{
        padding: '16px',
        backgroundColor: '#f8fafc',
        borderRadius: '8px',
        border: '1px solid #e2e8f0',
        marginTop: '16px'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span style={{ fontSize: '16px' }}>📝</span>
          <span style={{
            fontSize: '14px',
            color: '#64748b'
          }}>
            No relevant context found in your vault for this meeting.
          </span>
        </div>
      </div>
    )
  }

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
        alignItems: 'center',
        gap: '8px',
        marginBottom: '16px'
      }}>
        <span style={{ fontSize: '16px' }}>🧠</span>
        <h4 style={{
          margin: 0,
          fontSize: '16px',
          fontWeight: '600',
          color: '#334155'
        }}>
          Relevant Context from Your Vault
        </h4>
        <span style={{
          fontSize: '12px',
          color: '#64748b',
          backgroundColor: '#e2e8f0',
          padding: '2px 6px',
          borderRadius: '4px'
        }}>
          {matches.length} match{matches.length !== 1 ? 'es' : ''}
        </span>
      </div>

      <div style={{
        display: 'grid',
        gap: '12px'
      }}>
        {matches.map((match, index) => (
          <div
            key={`${match.file.path}-${index}`}
            style={{
              padding: '12px',
              backgroundColor: '#ffffff',
              borderRadius: '6px',
              border: '1px solid #e2e8f0'
            }}
          >
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              marginBottom: '8px'
            }}>
              <h5 style={{
                margin: 0,
                fontSize: '14px',
                fontWeight: '600',
                color: '#1e293b'
              }}>
                {match.file.title}
              </h5>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span style={{
                  fontSize: '12px',
                  color: '#64748b',
                  backgroundColor: '#f1f5f9',
                  padding: '2px 6px',
                  borderRadius: '4px'
                }}>
                  {(match.relevanceScore * 100).toFixed(0)}% match
                </span>
              </div>
            </div>

            <div style={{
              fontSize: '12px',
              color: '#64748b',
              marginBottom: '8px'
            }}>
              <span>📁 {match.file.path}</span>
              {match.matchedFields.length > 0 && (
                <span style={{ marginLeft: '12px' }}>
                  🎯 Matched: {match.matchedFields.join(', ')}
                </span>
              )}
            </div>

            {match.snippets && match.snippets.length > 0 && (
              <div style={{
                marginTop: '8px'
              }}>
                <div style={{
                  fontSize: '12px',
                  fontWeight: '500',
                  color: '#475569',
                  marginBottom: '4px'
                }}>
                  Key excerpts:
                </div>
                {match.snippets.map((snippet, snippetIndex) => (
                  <div
                    key={snippetIndex}
                    style={{
                      fontSize: '13px',
                      color: '#374151',
                      backgroundColor: '#f8fafc',
                      padding: '8px',
                      borderRadius: '4px',
                      borderLeft: '3px solid #3b82f6',
                      marginBottom: '4px',
                      fontStyle: 'italic'
                    }}
                  >
                    "{snippet}"
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <div style={{
        marginTop: '12px',
        fontSize: '12px',
        color: '#64748b',
        textAlign: 'center'
      }}>
        This context will be included in your AI-generated meeting brief
      </div>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
