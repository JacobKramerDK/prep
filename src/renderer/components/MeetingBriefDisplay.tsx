import React, { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { Check, Copy, RotateCcw } from 'lucide-react'
import { MeetingBrief } from '../../shared/types/brief'

interface Props {
  brief: MeetingBrief
  onClose: () => void
  onRegenerate?: () => void
  isRegenerating?: boolean
}

export const MeetingBriefDisplay: React.FC<Props> = ({ brief, onClose, onRegenerate, isRegenerating }) => {
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[1000]">
      <div className="bg-background rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-5 border-b border-border">
          <div>
            <h2 className="m-0 text-xl font-semibold text-primary">
              📄 Meeting Brief
            </h2>
            <p className="m-0 mt-1 text-sm text-secondary">
              Generated {brief.generatedAt.toLocaleString()}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {onRegenerate && (
              <button
                onClick={onRegenerate}
                disabled={isRegenerating}
                className="px-3 py-2 text-sm bg-brand-600 hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed text-white border border-border rounded-md cursor-pointer flex items-center gap-1.5 font-medium transition-all duration-200"
                title="Regenerate brief"
              >
                {isRegenerating ? (
                  <>
                    <div className="w-4 h-4 animate-spin rounded-full border-2 border-white/30 border-t-white"></div>
                    Regenerating...
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-4 h-4" />
                    Regenerate
                  </>
                )}
              </button>
            )}
            <button
              onClick={handleCopyToClipboard}
              className={`px-3 py-2 text-sm ${copied ? 'bg-success text-white' : 'bg-surface text-primary'} border border-border rounded-md cursor-pointer flex items-center gap-1.5 font-medium transition-all duration-200`}
              title="Copy to clipboard"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Copy
                </>
              )}
            </button>
            <button
              onClick={handlePrint}
              className="px-3 py-2 text-sm bg-surface text-primary border border-border rounded-md cursor-pointer flex items-center gap-1.5 font-medium"
              title="Print brief"
            >
              <span>🖨️</span>
              Print
            </button>
            <button
              onClick={onClose}
              className="bg-transparent border-none text-2xl cursor-pointer text-tertiary p-1"
            >
              ×
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          <div className="text-sm leading-relaxed text-primary">
            <ReactMarkdown
              components={{
                h1: ({ children }) => (
                  <h1 className="text-2xl font-bold mt-8 mb-4 text-primary border-b border-border pb-2 first:mt-0">
                    {children}
                  </h1>
                ),
                h2: ({ children }) => (
                  <h2 className="text-xl font-semibold mt-6 mb-3 text-primary first:mt-0">
                    {children}
                  </h2>
                ),
                h3: ({ children }) => (
                  <h3 className="text-lg font-semibold mt-5 mb-2 text-primary first:mt-0">
                    {children}
                  </h3>
                ),
                p: ({ children }) => (
                  <p className="mb-4 leading-relaxed">
                    {children}
                  </p>
                ),
                ul: ({ children }) => (
                  <ul className="mb-4 pl-6 space-y-1 list-disc">
                    {children}
                  </ul>
                ),
                ol: ({ children }) => (
                  <ol className="mb-4 pl-6 space-y-1 list-decimal">
                    {children}
                  </ol>
                ),
                li: ({ children }) => (
                  <li className="leading-relaxed">
                    {children}
                  </li>
                ),
                blockquote: ({ children }) => (
                  <blockquote className="border-l-4 border-border pl-4 ml-0 mb-4 italic text-secondary">
                    {children}
                  </blockquote>
                ),
                code: ({ inline, children }) => (
                  inline ? (
                    <code className="bg-surface px-1.5 py-0.5 rounded text-sm font-mono">
                      {children}
                    </code>
                  ) : (
                    <code className="block bg-surface p-4 rounded-lg text-sm font-mono overflow-x-auto mb-4">
                      {children}
                    </code>
                  )
                ),
                a: ({ href, children }) => (
                  <a 
                    href={href}
                    className="text-brand-600 hover:text-brand-700 underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {children}
                  </a>
                ),
                strong: ({ children }) => (
                  <strong className="font-semibold text-primary">
                    {children}
                  </strong>
                ),
                em: ({ children }) => (
                  <em className="italic">
                    {children}
                  </em>
                )
              }}
            >
              {brief.content}
            </ReactMarkdown>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-border p-3 bg-surface">
          <div className="flex justify-between items-center text-xs text-secondary">
            <span>Meeting ID: {brief.meetingId}</span>
            <span>Brief ID: {brief.id}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
