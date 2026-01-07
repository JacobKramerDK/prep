import React, { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { MeetingBrief } from '../../shared/types/brief'

interface Props {
  brief: MeetingBrief
  onClose: () => void
}

export const MeetingBriefDisplay: React.FC<Props> = ({ brief, onClose }) => {
  const [copied, setCopied] = useState(false)

  const handleCopyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(brief.content)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy to clipboard:', error)
    }
  }

  const handlePrint = () => {
    const printWindow = window.open('', '_blank')
    if (printWindow) {
      // Sanitize content for print - only include plain text
      const sanitizedContent = brief.content
        .replace(/<[^>]*>/g, '') // Remove any HTML tags
        .replace(/[<>&"']/g, (match) => { // Escape HTML entities
          const entities: { [key: string]: string } = {
            '<': '&lt;',
            '>': '&gt;',
            '&': '&amp;',
            '"': '&quot;',
            "'": '&#39;'
          }
          return entities[match] || match
        })
      
      const sanitizedId = brief.id.replace(/[<>&"']/g, (match) => {
        const entities: { [key: string]: string } = {
          '<': '&lt;',
          '>': '&gt;',
          '&': '&amp;',
          '"': '&quot;',
          "'": '&#39;'
        }
        return entities[match] || match
      })

      printWindow.document.write(`
        <html>
          <head>
            <title>Meeting Brief - ${sanitizedId}</title>
            <style>
              body { 
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                line-height: 1.6;
                max-width: 800px;
                margin: 0 auto;
                padding: 20px;
              }
              .meta { color: #666; font-size: 0.9em; margin-bottom: 20px; }
              .content { white-space: pre-wrap; }
            </style>
          </head>
          <body>
            <div class="meta">
              Generated: ${brief.generatedAt.toLocaleString()}<br>
              Meeting ID: ${brief.meetingId}
            </div>
            <div class="content">${sanitizedContent}</div>
          </body>
        </html>
      `)
      printWindow.document.close()
      printWindow.print()
    }
  }

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
        maxWidth: '900px',
        width: '100%',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '20px 24px',
          borderBottom: '1px solid #e2e8f0'
        }}>
          <div>
            <h2 style={{
              margin: 0,
              fontSize: '20px',
              fontWeight: '600',
              color: '#1f2937'
            }}>
              📄 Meeting Brief
            </h2>
            <p style={{
              margin: '4px 0 0 0',
              fontSize: '14px',
              color: '#6b7280'
            }}>
              Generated {brief.generatedAt.toLocaleString()}
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={handleCopyToClipboard}
              style={{
                padding: '8px 12px',
                fontSize: '14px',
                backgroundColor: copied ? '#10b981' : '#f8fafc',
                color: copied ? 'white' : '#374151',
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontWeight: '500',
                transition: 'all 0.2s'
              }}
              title="Copy to clipboard"
            >
              {copied ? (
                <>
                  <span>✅</span>
                  Copied!
                </>
              ) : (
                <>
                  <span>📋</span>
                  Copy
                </>
              )}
            </button>
            <button
              onClick={handlePrint}
              style={{
                padding: '8px 12px',
                fontSize: '14px',
                backgroundColor: '#f8fafc',
                color: '#374151',
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontWeight: '500'
              }}
              title="Print brief"
            >
              <span>🖨️</span>
              Print
            </button>
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '24px',
                cursor: 'pointer',
                color: '#9ca3af',
                padding: '4px'
              }}
            >
              ×
            </button>
          </div>
        </div>

        {/* Content */}
        <div style={{
          flex: 1,
          overflow: 'auto',
          padding: '24px'
        }}>
          <div style={{
            fontSize: '14px',
            lineHeight: '1.6',
            color: '#374151'
          }}>
            <ReactMarkdown>{brief.content}</ReactMarkdown>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          borderTop: '1px solid #e2e8f0',
          padding: '12px 24px',
          backgroundColor: '#f8fafc'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '12px',
            color: '#6b7280'
          }}>
            <span>Meeting ID: {brief.meetingId}</span>
            <span>Brief ID: {brief.id}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
