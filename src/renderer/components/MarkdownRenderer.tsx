import React, { ErrorInfo, ReactNode } from 'react'
import ReactMarkdown from 'react-markdown'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism'
import remarkWikiLink from 'remark-wiki-link'
import { useMarkdownRenderer } from '../hooks/useMarkdownRenderer'

interface MarkdownRendererProps {
  children: string
}

interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
}

class MarkdownErrorBoundary extends React.Component<
  { children: ReactNode; fallback: ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: ReactNode; fallback: ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Markdown rendering error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback
    }

    return this.props.children
  }
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ children }) => {
  const { processedContent, isEmpty, wordCount, estimatedReadTime } = useMarkdownRenderer({ 
    content: children 
  })

  if (isEmpty) {
    return (
      <div style={{
        backgroundColor: 'white',
        padding: '20px',
        borderRadius: '6px',
        border: '1px solid #e5e7eb',
        textAlign: 'center',
        color: '#9ca3af',
        fontStyle: 'italic'
      }}>
        This file appears to be empty
      </div>
    )
  }
  return (
    <div>
      {/* Reading stats */}
      <div style={{
        backgroundColor: '#f8fafc',
        padding: '8px 12px',
        borderRadius: '6px',
        border: '1px solid #e2e8f0',
        marginBottom: '16px',
        fontSize: '12px',
        color: '#64748b',
        display: 'flex',
        gap: '16px'
      }}>
        <span>{wordCount} words</span>
        <span>{estimatedReadTime} min read</span>
      </div>

      {/* Markdown content */}
      <div style={{
        backgroundColor: 'white',
        padding: '20px',
        borderRadius: '6px',
        border: '1px solid #e5e7eb',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        lineHeight: '1.6',
        color: '#374151'
      }}>
        <MarkdownErrorBoundary
          fallback={
            <div style={{
              backgroundColor: '#fef2f2',
              color: '#dc2626',
              padding: '16px',
              borderRadius: '6px',
              border: '1px solid #fecaca'
            }}>
              Failed to render markdown content. The file may contain invalid syntax.
            </div>
          }
        >
          <ReactMarkdown
          remarkPlugins={[
            [remarkWikiLink, {
              pageResolver: (name: string) => [name.replace(/ /g, '-').toLowerCase()],
              hrefTemplate: (permalink: string) => `#${permalink}`,
              wikiLinkClassName: 'wiki-link'
            }]
          ]}
          components={{
          // Handle text nodes to safely style Obsidian tags
          text: ({ children }) => {
            const text = String(children)
            // Check if this text contains Obsidian tags
            if (text.includes('#') && /\B#\w+/.test(text)) {
              const parts = text.split(/(\B#\w+)/g)
              return (
                <>
                  {parts.map((part, index) => 
                    /^\B#\w+/.test(part) ? (
                      <span 
                        key={index}
                        style={{
                          color: '#7c3aed',
                          fontWeight: '500'
                        }}
                      >
                        {part}
                      </span>
                    ) : part
                  )}
                </>
              )
            }
            return <>{children}</>
          },
          code({ node, inline, className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '')
            return !inline && match ? (
              <SyntaxHighlighter
                style={oneLight}
                language={match[1]}
                PreTag="div"
                {...props}
              >
                {String(children).replace(/\n$/, '')}
              </SyntaxHighlighter>
            ) : (
              <code 
                className={className} 
                style={{
                  backgroundColor: '#f3f4f6',
                  padding: '2px 4px',
                  borderRadius: '3px',
                  fontSize: '0.9em',
                  fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Monaco, Consolas, monospace'
                }}
                {...props}
              >
                {children}
              </code>
            )
          },
          h1: ({ children }) => (
            <h1 style={{
              fontSize: '2rem',
              fontWeight: '700',
              marginTop: '2rem',
              marginBottom: '1rem',
              color: '#111827',
              borderBottom: '2px solid #e5e7eb',
              paddingBottom: '0.5rem'
            }}>
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 style={{
              fontSize: '1.5rem',
              fontWeight: '600',
              marginTop: '1.5rem',
              marginBottom: '0.75rem',
              color: '#111827'
            }}>
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 style={{
              fontSize: '1.25rem',
              fontWeight: '600',
              marginTop: '1.25rem',
              marginBottom: '0.5rem',
              color: '#111827'
            }}>
              {children}
            </h3>
          ),
          p: ({ children }) => (
            <p style={{
              marginBottom: '1rem',
              lineHeight: '1.7'
            }}>
              {children}
            </p>
          ),
          ul: ({ children }) => (
            <ul style={{
              marginBottom: '1rem',
              paddingLeft: '1.5rem'
            }}>
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol style={{
              marginBottom: '1rem',
              paddingLeft: '1.5rem'
            }}>
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li style={{
              marginBottom: '0.25rem'
            }}>
              {children}
            </li>
          ),
          blockquote: ({ children }) => (
            <blockquote style={{
              borderLeft: '4px solid #d1d5db',
              paddingLeft: '1rem',
              marginLeft: '0',
              marginBottom: '1rem',
              fontStyle: 'italic',
              color: '#6b7280'
            }}>
              {children}
            </blockquote>
          ),
          a: ({ href, children }) => {
            // Handle wiki links
            if (href?.startsWith('#')) {
              return (
                <span style={{
                  color: '#7c3aed',
                  backgroundColor: '#f3f4f6',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  fontWeight: '500',
                  border: '1px solid #d1d5db'
                }}>
                  {children}
                </span>
              )
            }
            // Regular links
            return (
              <a 
                href={href}
                style={{
                  color: '#2563eb',
                  textDecoration: 'underline'
                }}
              >
                {children}
              </a>
            )
          }
        }}
      >
        {processedContent}
      </ReactMarkdown>
      </MarkdownErrorBoundary>
    </div>
    </div>
  )
}
