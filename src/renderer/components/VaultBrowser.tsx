import React, { useState } from 'react'
import { VaultSelector } from './VaultSelector'
import { FileList } from './FileList'
import { MarkdownRenderer } from './MarkdownRenderer'
import type { VaultIndex, VaultFile } from '../../shared/types/vault'

interface VaultBrowserProps {
  onBackToHome?: () => void
}

export const VaultBrowser: React.FC<VaultBrowserProps> = ({ onBackToHome }) => {
  const [vaultIndex, setVaultIndex] = useState<VaultIndex | null>(null)
  const [selectedFile, setSelectedFile] = useState<VaultFile | null>(null)
  const [fileContent, setFileContent] = useState<string>('')
  const [loadingContent, setLoadingContent] = useState(false)
  const [fileError, setFileError] = useState<string | null>(null)

  const handleVaultSelected = (index: VaultIndex) => {
    setVaultIndex(index)
    setSelectedFile(null)
    setFileContent('')
    setFileError(null)
  }

  const handleFileSelect = async (file: VaultFile) => {
    setSelectedFile(file)
    setLoadingContent(true)
    setFileError(null)
    
    try {
      const content = await window.electronAPI.readFile(file.path)
      setFileContent(content)
    } catch (error) {
      console.error('Failed to read file:', error)
      let errorMessage = 'Error loading file content'
      
      if (error instanceof Error) {
        if (error.message.includes('ENOENT')) {
          errorMessage = 'File not found. It may have been moved or deleted.'
        } else if (error.message.includes('EACCES')) {
          errorMessage = 'Permission denied. Cannot access this file.'
        } else if (error.message.includes('outside vault directory')) {
          errorMessage = 'Security error: File is outside the vault directory.'
        } else {
          errorMessage = `Error: ${error.message}`
        }
      }
      
      setFileError(errorMessage)
      setFileContent('')
    } finally {
      setLoadingContent(false)
    }
  }

  const handleSelectNewVault = () => {
    setVaultIndex(null)
    setSelectedFile(null)
    setFileContent('')
    setFileError(null)
  }

  if (!vaultIndex) {
    return <VaultSelector onVaultSelected={handleVaultSelected} />
  }

  return (
    <div style={{ 
      display: 'flex', 
      height: '100vh',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      {/* Sidebar */}
      <div style={{ 
        width: '350px',
        borderRight: '1px solid #e2e8f0',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Header */}
        <div style={{ 
          padding: '16px',
          borderBottom: '1px solid #e2e8f0',
          backgroundColor: 'white'
        }}>
          {onBackToHome && (
            <button
              onClick={onBackToHome}
              style={{
                padding: '8px 16px',
                fontSize: '14px',
                backgroundColor: '#f1f5f9',
                color: '#475569',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                cursor: 'pointer',
                marginBottom: '12px'
              }}
            >
              ← Back to Home
            </button>
          )}
          <h3 style={{ 
            margin: '0 0 8px',
            fontSize: '1.1rem',
            color: '#1f2937'
          }}>
            Obsidian Vault
          </h3>
          <p style={{ 
            margin: '0 0 12px',
            fontSize: '12px',
            color: '#64748b',
            wordBreak: 'break-all'
          }}>
            {vaultIndex.vaultPath}
          </p>
          <button
            onClick={handleSelectNewVault}
            style={{
              padding: '6px 12px',
              fontSize: '12px',
              backgroundColor: '#f1f5f9',
              color: '#475569',
              border: '1px solid #cbd5e1',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Change Vault
          </button>
        </div>

        {/* File List */}
        <div style={{ flex: 1 }}>
          <FileList 
            files={vaultIndex.files}
            onFileSelect={handleFileSelect}
            selectedFile={selectedFile}
          />
        </div>
      </div>

      {/* Main Content */}
      <div style={{ 
        flex: 1,
        display: 'flex',
        flexDirection: 'column'
      }}>
        {selectedFile ? (
          <>
            {/* File Header */}
            <div style={{ 
              padding: '16px',
              borderBottom: '1px solid #e2e8f0',
              backgroundColor: 'white'
            }}>
              <h2 style={{ 
                margin: '0 0 8px',
                fontSize: '1.5rem',
                color: '#1f2937'
              }}>
                {selectedFile.title}
              </h2>
              <div style={{ 
                fontSize: '12px',
                color: '#64748b',
                display: 'flex',
                gap: '16px',
                flexWrap: 'wrap'
              }}>
                <span>Modified: {selectedFile.modified.toLocaleDateString()}</span>
                <span>Size: {Math.round(selectedFile.size / 1024)}KB</span>
                {selectedFile.tags.length > 0 && (
                  <span>Tags: {selectedFile.tags.map(tag => `#${tag}`).join(' ')}</span>
                )}
              </div>
            </div>

            {/* File Content */}
            <div style={{ 
              flex: 1,
              padding: '24px',
              backgroundColor: '#fafafa',
              overflow: 'auto'
            }}>
              {loadingContent ? (
                <div style={{ 
                  textAlign: 'center',
                  color: '#64748b',
                  padding: '40px'
                }}>
                  Loading file content...
                </div>
              ) : fileError ? (
                <div style={{ 
                  backgroundColor: '#fef2f2',
                  color: '#dc2626',
                  padding: '20px',
                  borderRadius: '6px',
                  border: '1px solid #fecaca'
                }}>
                  {fileError}
                </div>
              ) : (
                <MarkdownRenderer>
                  {fileContent}
                </MarkdownRenderer>
              )}
            </div>
          </>
        ) : (
          <div style={{ 
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#64748b',
            fontSize: '1.1rem'
          }}>
            Select a file to view its content
          </div>
        )}
      </div>
    </div>
  )
}
