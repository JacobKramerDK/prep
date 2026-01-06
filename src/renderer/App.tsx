import React, { useState, useEffect } from 'react'
import type { ElectronAPI } from '../shared/types/ipc'
import { VaultBrowser } from './components/VaultBrowser'

const App: React.FC = () => {
  const [version, setVersion] = useState<string>('Loading...')
  const [showVault, setShowVault] = useState(false)

  useEffect(() => {
    const getVersion = async (): Promise<void> => {
      try {
        if (window.electronAPI) {
          const appVersion = await window.electronAPI.getVersion()
          setVersion(appVersion)
        } else {
          setVersion('Electron API not available')
        }
      } catch (error) {
        console.error('Failed to get version:', error)
        setVersion('Error loading version')
      }
    }

    getVersion()
  }, [])

  if (showVault) {
    return <VaultBrowser />
  }

  return (
    <div style={{ 
      padding: '40px', 
      fontFamily: 'system-ui, -apple-system, sans-serif',
      maxWidth: '800px',
      margin: '0 auto'
    }}>
      <header style={{ marginBottom: '40px' }}>
        <h1 style={{ 
          fontSize: '2.5rem', 
          color: '#2563eb',
          marginBottom: '16px'
        }}>
          Prep - Meeting Assistant
        </h1>
        <p style={{ 
          fontSize: '1.2rem', 
          color: '#64748b',
          marginBottom: '8px'
        }}>
          Desktop meeting preparation assistant for Obsidian users
        </p>
        <p style={{ 
          fontSize: '0.9rem', 
          color: '#94a3b8'
        }}>
          Version: {version}
        </p>
      </header>

      <main>
        <div style={{ 
          backgroundColor: '#f8fafc', 
          padding: '24px', 
          borderRadius: '8px',
          border: '1px solid #e2e8f0',
          marginBottom: '24px'
        }}>
          <h2 style={{ 
            fontSize: '1.5rem', 
            marginBottom: '16px',
            color: '#334155'
          }}>
            🚀 Application Status
          </h2>
          <ul style={{ 
            listStyle: 'none', 
            padding: 0,
            margin: 0
          }}>
            <li style={{ 
              padding: '8px 0',
              color: '#059669'
            }}>
              ✅ Electron + React 19 + TypeScript
            </li>
            <li style={{ 
              padding: '8px 0',
              color: '#059669'
            }}>
              ✅ Obsidian Vault Integration
            </li>
            <li style={{ 
              padding: '8px 0',
              color: '#059669'
            }}>
              ✅ File Search & Browse
            </li>
            <li style={{ 
              padding: '8px 0',
              color: '#d97706'
            }}>
              🚧 Calendar Integration (Coming Soon)
            </li>
            <li style={{ 
              padding: '8px 0',
              color: '#d97706'
            }}>
              🚧 AI Meeting Briefs (Coming Soon)
            </li>
          </ul>
        </div>

        <div style={{ 
          textAlign: 'center',
          padding: '24px'
        }}>
          <button
            onClick={() => setShowVault(true)}
            style={{
              padding: '16px 32px',
              fontSize: '18px',
              backgroundColor: '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '500',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#1d4ed8'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#2563eb'
            }}
          >
            Open Vault Browser
          </button>
          <p style={{ 
            fontSize: '14px',
            color: '#64748b',
            marginTop: '12px'
          }}>
            Connect to your Obsidian vault to start browsing and searching your notes
          </p>
        </div>
      </main>
    </div>
  )
}

export default App
