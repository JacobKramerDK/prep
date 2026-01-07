import React, { useState, useEffect } from 'react'
import type { VaultIndex } from '../../shared/types/vault'

interface VaultSelectorProps {
  onVaultSelected: (vaultIndex: VaultIndex) => void
  onBackToHome?: () => void
}

export const VaultSelector: React.FC<VaultSelectorProps> = ({ onVaultSelected, onBackToHome }) => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [statusLoading, setStatusLoading] = useState(false)
  const [indexStatus, setIndexStatus] = useState<{
    isIndexed: boolean
    fileCount: number
  }>({ isIndexed: false, fileCount: 0 })

  // Check indexing status on component mount
  useEffect(() => {
    checkIndexStatus()
  }, [])

  const checkIndexStatus = async () => {
    // Prevent concurrent status checks
    if (statusLoading) return
    
    setStatusLoading(true)
    try {
      const [isIndexed, fileCount] = await Promise.all([
        window.electronAPI.isContextIndexed(),
        window.electronAPI.getContextIndexedFileCount()
      ])
      setIndexStatus({ isIndexed, fileCount })
    } catch (error) {
      console.error('Failed to check index status:', error)
    } finally {
      setStatusLoading(false)
    }
  }

  const handleSelectVault = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const vaultPath = await window.electronAPI.selectVault()
      const vaultIndex = await window.electronAPI.scanVault(vaultPath)
      onVaultSelected(vaultIndex)
      
      // Update index status after successful vault scan
      await checkIndexStatus()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to select vault')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      {/* Back button */}
      {onBackToHome && (
        <div style={{ padding: '16px', borderBottom: '1px solid #e2e8f0' }}>
          <button
            onClick={onBackToHome}
            style={{
              padding: '8px 16px',
              fontSize: '14px',
              backgroundColor: '#f1f5f9',
              color: '#475569',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            ← Back to Home
          </button>
        </div>
      )}

      <div style={{ padding: '24px', textAlign: 'center' }}>
      <h2 style={{ 
        fontSize: '1.5rem', 
        marginBottom: '16px',
        color: '#334155'
      }}>
        Connect Your Obsidian Vault
      </h2>
      <p style={{ 
        color: '#64748b', 
        marginBottom: '24px',
        maxWidth: '400px',
        margin: '0 auto 24px'
      }}>
        Select your Obsidian vault directory to start browsing and searching your notes.
      </p>

      {/* Indexing Status Indicator */}
      {indexStatus.isIndexed && (
        <div style={{
          padding: '12px',
          backgroundColor: '#f0fdf4',
          border: '1px solid #bbf7d0',
          borderRadius: '6px',
          marginBottom: '16px',
          maxWidth: '400px',
          margin: '0 auto 16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <span style={{ fontSize: '16px' }}>✅</span>
            <span style={{ color: '#166534', fontSize: '14px', fontWeight: '500' }}>
              Vault indexed for AI context ({indexStatus.fileCount} files)
            </span>
          </div>
        </div>
      )}

      <button 
        onClick={handleSelectVault}
        disabled={loading}
        style={{
          padding: '12px 24px',
          fontSize: '16px',
          backgroundColor: loading ? '#94a3b8' : '#2563eb',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          cursor: loading ? 'not-allowed' : 'pointer',
          transition: 'background-color 0.2s'
        }}
      >
        {loading ? 'Scanning Vault...' : indexStatus.isIndexed ? 'Select Different Vault' : 'Select Obsidian Vault'}
      </button>
      {error && (
        <p style={{ 
          color: '#dc2626', 
          marginTop: '12px',
          padding: '8px',
          backgroundColor: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '4px',
          maxWidth: '400px',
          margin: '12px auto 0'
        }}>
          {error}
        </p>
      )}
      </div>
    </div>
  )
}
