import React, { useState } from 'react'
import type { VaultIndex } from '../../shared/types/vault'

interface VaultSelectorProps {
  onVaultSelected: (vaultIndex: VaultIndex) => void
}

export const VaultSelector: React.FC<VaultSelectorProps> = ({ onVaultSelected }) => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSelectVault = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const vaultPath = await window.electronAPI.selectVault()
      const vaultIndex = await window.electronAPI.scanVault(vaultPath)
      onVaultSelected(vaultIndex)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to select vault')
    } finally {
      setLoading(false)
    }
  }

  return (
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
        {loading ? 'Scanning Vault...' : 'Select Obsidian Vault'}
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
  )
}
