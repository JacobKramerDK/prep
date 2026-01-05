import React, { useState, useEffect } from 'react'
import type { ElectronAPI } from '../shared/types/ipc'

const App: React.FC = () => {
  const [version, setVersion] = useState<string>('Loading...')

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
          border: '1px solid #e2e8f0'
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
              ✅ Secure IPC Communication
            </li>
            <li style={{ 
              padding: '8px 0',
              color: '#059669'
            }}>
              ✅ Context Isolation Enabled
            </li>
            <li style={{ 
              padding: '8px 0',
              color: '#059669'
            }}>
              ✅ Development Environment Ready
            </li>
          </ul>
        </div>

        <div style={{ 
          marginTop: '32px',
          padding: '24px',
          backgroundColor: '#fefce8',
          borderRadius: '8px',
          border: '1px solid #fde047'
        }}>
          <h3 style={{ 
            fontSize: '1.2rem',
            marginBottom: '12px',
            color: '#a16207'
          }}>
            🔧 Next Steps
          </h3>
          <p style={{ color: '#a16207' }}>
            The Electron application scaffolding is complete. Ready to implement:
          </p>
          <ul style={{ 
            color: '#a16207',
            marginTop: '12px'
          }}>
            <li>Obsidian vault integration</li>
            <li>Calendar parsing functionality</li>
            <li>AI-powered meeting brief generation</li>
            <li>Audio transcription features</li>
          </ul>
        </div>
      </main>
    </div>
  )
}

export default App
