import React, { useState, useEffect } from 'react'
import type { VaultFile, SearchResult } from '../../shared/types/vault'

interface FileListProps {
  files: VaultFile[]
  onFileSelect: (file: VaultFile) => void
  selectedFile: VaultFile | null
}

export const FileList: React.FC<FileListProps> = ({ files, onFileSelect, selectedFile }) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSearch = async (query: string) => {
    setSearchQuery(query)
    setError(null)

    if (!query.trim()) {
      setSearchResults([])
      return
    }

    setLoading(true)
    try {
      const results = await window.electronAPI.searchFiles(query)
      setSearchResults(results)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed')
      setSearchResults([])
    } finally {
      setLoading(false)
    }
  }

  const displayFiles = searchQuery.trim() ? searchResults.map(r => r.file) : files

  // Create a map for efficient search result lookup
  const searchResultMap = new Map<string, SearchResult>()
  if (searchQuery.trim()) {
    searchResults.forEach(result => {
      searchResultMap.set(result.file.path, result)
    })
  }

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100%',
      backgroundColor: '#f8fafc',
      borderRadius: '8px',
      border: '1px solid #e2e8f0'
    }}>
      {/* Search Header */}
      <div style={{ 
        padding: '16px',
        borderBottom: '1px solid #e2e8f0'
      }}>
        <input
          type="text"
          placeholder="Search notes..."
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          style={{
            width: '100%',
            padding: '8px 12px',
            border: '1px solid #d1d5db',
            borderRadius: '4px',
            fontSize: '14px',
            outline: 'none'
          }}
        />
        {loading && (
          <p style={{ 
            fontSize: '12px', 
            color: '#64748b', 
            margin: '4px 0 0',
            textAlign: 'center'
          }}>
            Searching...
          </p>
        )}
        {error && (
          <p style={{ 
            fontSize: '12px', 
            color: '#dc2626', 
            margin: '4px 0 0',
            textAlign: 'center'
          }}>
            {error}
          </p>
        )}
      </div>

      {/* File List */}
      <div style={{ 
        flex: 1, 
        overflowY: 'auto',
        padding: '8px'
      }}>
        {displayFiles.length === 0 ? (
          <div style={{ 
            padding: '24px', 
            textAlign: 'center',
            color: '#64748b'
          }}>
            {searchQuery.trim() ? 'No files found matching your search.' : 'No files in vault.'}
          </div>
        ) : (
          displayFiles.map((file) => {
            const searchResult = searchResultMap.get(file.path)
            return (
            <div
              key={file.path}
              onClick={() => onFileSelect(file)}
              style={{
                padding: '12px',
                margin: '4px 0',
                backgroundColor: selectedFile?.path === file.path ? '#dbeafe' : 'white',
                border: selectedFile?.path === file.path ? '1px solid #3b82f6' : '1px solid #e5e7eb',
                borderRadius: '4px',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                if (selectedFile?.path !== file.path) {
                  e.currentTarget.style.backgroundColor = '#f1f5f9'
                }
              }}
              onMouseLeave={(e) => {
                if (selectedFile?.path !== file.path) {
                  e.currentTarget.style.backgroundColor = 'white'
                }
              }}
            >
              <div style={{ 
                fontWeight: '500',
                color: '#1f2937',
                marginBottom: '4px'
              }}>
                {file.title}
              </div>
              <div style={{ 
                fontSize: '12px',
                color: '#6b7280',
                marginBottom: '4px'
              }}>
                {file.name}
              </div>
              {file.tags.length > 0 && (
                <div style={{ 
                  fontSize: '11px',
                  color: '#059669'
                }}>
                  {file.tags.map(tag => `#${tag}`).join(' ')}
                </div>
              )}
              {searchQuery.trim() && searchResult && (
                <div style={{ 
                  fontSize: '11px',
                  color: '#64748b',
                  marginTop: '4px',
                  fontStyle: 'italic'
                }}>
                  {searchResult.matches[0]?.snippet}
                </div>
              )}
            </div>
            )
          })
        )}
      </div>

      {/* Footer */}
      <div style={{ 
        padding: '12px 16px',
        borderTop: '1px solid #e2e8f0',
        fontSize: '12px',
        color: '#64748b',
        textAlign: 'center'
      }}>
        {displayFiles.length} file{displayFiles.length !== 1 ? 's' : ''}
        {searchQuery.trim() && ` found for "${searchQuery}"`}
      </div>
    </div>
  )
}
