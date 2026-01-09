import React, { useState, useEffect } from 'react'
import { VaultBrowser } from './VaultBrowser'
import { CalendarImport } from './CalendarImport'
import { GoogleCalendarAuth } from './GoogleCalendarAuth'
import type { CalendarEvent } from '../../shared/types/calendar'

interface Props {
  onBackToHome: () => void
}

export const Settings: React.FC<Props> = ({ onBackToHome }) => {
  // Constants
  const SUCCESS_MESSAGE_TIMEOUT = 3000

  const [activeTab, setActiveTab] = useState<'openai' | 'vault' | 'calendar'>('openai')
  const [apiKey, setApiKey] = useState('')
  const [selectedModel, setSelectedModel] = useState('gpt-4o-mini')
  const [availableModels, setAvailableModels] = useState<string[]>([
    'o1-preview', 'o1-mini', 'gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-4', 'gpt-3.5-turbo'
  ])
  const [isLoadingModels, setIsLoadingModels] = useState(false)
  const [isValidating, setIsValidating] = useState(false)
  const [validationResult, setValidationResult] = useState<'valid' | 'invalid' | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)

  useEffect(() => {
    // Load existing settings on component mount
    const loadSettings = async () => {
      try {
        const [existingKey, existingModel] = await Promise.all([
          window.electronAPI.getOpenAIApiKey(),
          window.electronAPI.getOpenAIModel()
        ])
        
        if (existingKey) {
          setApiKey(existingKey)
          // Only try to load models if the API key format is valid
          if (existingKey.startsWith('sk-') && existingKey.length >= 20) {
            setIsLoadingModels(true)
            try {
              const models = await window.electronAPI.getAvailableModels(existingKey)
              if (models && models.length > 0) {
                setAvailableModels(models)
              }
            } catch (error) {
              console.error('Failed to load models on settings page:', error)
              // Keep default models if fetch fails
            } finally {
              setIsLoadingModels(false)
            }
          }
        }
        
        if (existingModel) {
          setSelectedModel(existingModel)
        }
      } catch (error) {
        console.error('Failed to load settings:', error)
      }
    }

    loadSettings()
  }, [])

  const handleValidateKey = async () => {
    if (!apiKey.trim()) {
      setValidationResult('invalid')
      return
    }

    setIsValidating(true)
    setValidationResult(null)

    try {
      const isValid = await window.electronAPI.validateOpenAIApiKey(apiKey.trim())
      setValidationResult(isValid ? 'valid' : 'invalid')
      
      // If valid, fetch available models
      if (isValid) {
        setIsLoadingModels(true)
        try {
          const models = await window.electronAPI.getAvailableModels(apiKey.trim())
          setAvailableModels(models)
        } catch (error) {
          console.error('Failed to fetch models:', error)
          // Keep default models if fetch fails
        } finally {
          setIsLoadingModels(false)
        }
      }
    } catch (error) {
      console.error('API key validation failed:', error)
      setValidationResult('invalid')
    } finally {
      setIsValidating(false)
    }
  }

  const handleSaveKey = async () => {
    setIsSaving(true)
    setSaveMessage(null)

    try {
      await Promise.all([
        window.electronAPI.setOpenAIApiKey(apiKey.trim() || null),
        window.electronAPI.setOpenAIModel(selectedModel)
      ])
      setSaveMessage('Settings saved successfully!')
      setTimeout(() => setSaveMessage(null), SUCCESS_MESSAGE_TIMEOUT)
    } catch (error) {
      console.error('Failed to save settings:', error)
      setSaveMessage('Failed to save settings')
      setTimeout(() => setSaveMessage(null), SUCCESS_MESSAGE_TIMEOUT)
    } finally {
      setIsSaving(false)
    }
  }

  const handleClearKey = async () => {
    setApiKey('')
    setValidationResult(null)
    try {
      await window.electronAPI.setOpenAIApiKey(null)
      setSaveMessage('API key cleared successfully!')
      setTimeout(() => setSaveMessage(null), SUCCESS_MESSAGE_TIMEOUT)
    } catch (error) {
      console.error('Failed to clear API key:', error)
      setSaveMessage('Failed to clear API key')
      setTimeout(() => setSaveMessage(null), SUCCESS_MESSAGE_TIMEOUT)
    }
  }

  const renderOpenAISettings = () => (
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
        🤖 OpenAI API Configuration
      </h2>
      
      <p style={{
        fontSize: '14px',
        color: '#64748b',
        marginBottom: '16px',
        lineHeight: '1.5'
      }}>
        To generate AI-powered meeting briefs, you need to provide your OpenAI API key. 
        You can get one from{' '}
        <a 
          href="https://platform.openai.com/api-keys" 
          target="_blank" 
          rel="noopener noreferrer"
          style={{ color: '#2563eb', textDecoration: 'underline' }}
        >
          OpenAI's platform
        </a>.
      </p>

      <div style={{ marginBottom: '16px' }}>
        <label 
          htmlFor="apiKey" 
          style={{
            display: 'block',
            fontSize: '14px',
            fontWeight: '500',
            color: '#374151',
            marginBottom: '8px'
          }}
        >
          OpenAI API Key
        </label>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
          <input
            id="apiKey"
            type="password"
            value={apiKey}
            onChange={(e) => {
              setApiKey(e.target.value)
              setValidationResult(null)
            }}
            placeholder="sk-..."
            style={{
              flex: 1,
              padding: '8px 12px',
              fontSize: '14px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontFamily: 'monospace'
            }}
          />
          <button
            onClick={handleValidateKey}
            disabled={isValidating || !apiKey.trim()}
            style={{
              padding: '8px 16px',
              fontSize: '14px',
              backgroundColor: isValidating ? '#9ca3af' : '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: isValidating || !apiKey.trim() ? 'not-allowed' : 'pointer',
              whiteSpace: 'nowrap'
            }}
          >
            {isValidating ? 'Validating...' : 'Validate'}
          </button>
        </div>
      </div>

      {validationResult && (
        <div style={{
          padding: '8px 12px',
          borderRadius: '6px',
          fontSize: '14px',
          marginBottom: '16px',
          backgroundColor: validationResult === 'valid' ? '#ecfdf5' : '#fef2f2',
          border: `1px solid ${validationResult === 'valid' ? '#a7f3d0' : '#fecaca'}`,
          color: validationResult === 'valid' ? '#065f46' : '#dc2626'
        }}>
          {validationResult === 'valid' ? (
            <span>✅ API key is valid and ready to use</span>
          ) : (
            <span>❌ Invalid API key. Please check your key and try again.</span>
          )}
        </div>
      )}

      <div style={{ marginBottom: '16px' }}>
        <label 
          htmlFor="modelSelect" 
          style={{
            display: 'block',
            fontSize: '14px',
            fontWeight: '500',
            color: '#374151',
            marginBottom: '8px'
          }}
        >
          AI Model
        </label>
        <select
          id="modelSelect"
          value={selectedModel}
          onChange={(e) => setSelectedModel(e.target.value)}
          disabled={isLoadingModels}
          style={{
            width: '100%',
            padding: '8px 12px',
            fontSize: '14px',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            backgroundColor: isLoadingModels ? '#f9fafb' : 'white',
            cursor: isLoadingModels ? 'not-allowed' : 'pointer'
          }}
        >
          {availableModels.map((model) => (
            <option key={model} value={model}>
              {model}
            </option>
          ))}
        </select>
        <p style={{
          fontSize: '12px',
          color: '#6b7280',
          marginTop: '4px',
          margin: '4px 0 0 0'
        }}>
          {isLoadingModels 
            ? 'Loading available models...' 
            : 'Choose the AI model for generating meeting briefs. Validate your API key to see all available models.'
          }
        </p>
      </div>

      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          onClick={handleSaveKey}
          disabled={isSaving}
          style={{
            padding: '8px 16px',
            fontSize: '14px',
            backgroundColor: isSaving ? '#9ca3af' : '#059669',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: isSaving ? 'not-allowed' : 'pointer'
          }}
        >
          {isSaving ? 'Saving...' : 'Save Settings'}
        </button>
        
        {apiKey && (
          <button
            onClick={handleClearKey}
            style={{
              padding: '8px 16px',
              fontSize: '14px',
              backgroundColor: '#dc2626',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            Clear Key
          </button>
        )}
      </div>

      {saveMessage && (
        <div style={{
          marginTop: '12px',
          padding: '8px 12px',
          borderRadius: '6px',
          fontSize: '14px',
          backgroundColor: saveMessage.includes('success') ? '#ecfdf5' : '#fef2f2',
          border: `1px solid ${saveMessage.includes('success') ? '#a7f3d0' : '#fecaca'}`,
          color: saveMessage.includes('success') ? '#065f46' : '#dc2626'
        }}>
          {saveMessage}
        </div>
      )}
    </div>
  )

  const renderVaultSettings = () => <VaultBrowser onBackToHome={undefined} />

  const handleEventsImported = (events: CalendarEvent[]) => {
    setSaveMessage(`Successfully imported ${events.length} calendar events!`)
    setTimeout(() => setSaveMessage(null), SUCCESS_MESSAGE_TIMEOUT)
  }

  const renderCalendarSettings = () => <CalendarImport onEventsImported={handleEventsImported} />

  return (
    <div style={{ 
      padding: '40px', 
      fontFamily: 'system-ui, -apple-system, sans-serif',
      maxWidth: '800px',
      margin: '0 auto'
    }}>
      <div style={{ marginBottom: '24px' }}>
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
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          ← Back to Home
        </button>
      </div>

      <header style={{ marginBottom: '40px' }}>
        <h1 style={{ 
          fontSize: '2rem', 
          color: '#2563eb',
          marginBottom: '8px'
        }}>
          ⚙️ Settings
        </h1>
        <p style={{ 
          fontSize: '1rem', 
          color: '#64748b'
        }}>
          Configure your Prep application settings
        </p>
      </header>

      <main>
        {/* Tab Navigation */}
        <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', marginBottom: '24px' }}>
          {[
            { id: 'openai', label: '🤖 AI Configuration' },
            { id: 'vault', label: '📚 Vault Management' },
            { id: 'calendar', label: '📅 Calendar Import' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as 'openai' | 'vault' | 'calendar')}
              style={{
                padding: '12px 16px',
                border: 'none',
                backgroundColor: 'transparent',
                borderBottom: activeTab === tab.id ? '2px solid #2563eb' : '2px solid transparent',
                color: activeTab === tab.id ? '#2563eb' : '#64748b',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
        {/* Tab Content */}
        {(() => {
          switch (activeTab) {
            case 'openai':
              return (
                <>
                  {renderOpenAISettings()}
                  <div style={{
                    backgroundColor: '#f8fafc',
                    padding: '24px',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0'
                  }}>
                    <h3 style={{
                      fontSize: '1.25rem',
                      marginBottom: '12px',
                      color: '#334155'
                    }}>
                      💡 How it works
                    </h3>
                    <ul style={{
                      fontSize: '14px',
                      color: '#64748b',
                      lineHeight: '1.6',
                      paddingLeft: '20px'
                    }}>
                      <li>Your API key is stored securely on your local machine</li>
                      <li>It's never shared with anyone except OpenAI for generating briefs</li>
                      <li>You can clear or change your API key at any time</li>
                      <li>Brief generation requires an active internet connection</li>
                    </ul>
                  </div>
                </>
              )
            case 'vault':
              return renderVaultSettings()
            case 'calendar':
              return renderCalendarSettings()
            default:
              return null
          }
        })()}
      </main>
    </div>
  )
}
