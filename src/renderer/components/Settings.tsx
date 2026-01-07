import React, { useState, useEffect } from 'react'

interface Props {
  onBackToHome: () => void
}

export const Settings: React.FC<Props> = ({ onBackToHome }) => {
  const [apiKey, setApiKey] = useState('')
  const [isValidating, setIsValidating] = useState(false)
  const [validationResult, setValidationResult] = useState<'valid' | 'invalid' | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)

  useEffect(() => {
    // Load existing API key on component mount
    const loadApiKey = async () => {
      try {
        const existingKey = await window.electronAPI.getOpenAIApiKey()
        if (existingKey) {
          setApiKey(existingKey)
          // Validate existing key instead of assuming it's valid
          setIsValidating(true)
          try {
            const isValid = await window.electronAPI.validateOpenAIApiKey(existingKey)
            setValidationResult(isValid ? 'valid' : 'invalid')
          } catch (error) {
            console.error('Failed to validate existing API key:', error)
            setValidationResult('invalid')
          } finally {
            setIsValidating(false)
          }
        }
      } catch (error) {
        console.error('Failed to load API key:', error)
      }
    }

    loadApiKey()
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
      await window.electronAPI.setOpenAIApiKey(apiKey.trim() || null)
      setSaveMessage('API key saved successfully!')
      setTimeout(() => setSaveMessage(null), 3000)
    } catch (error) {
      console.error('Failed to save API key:', error)
      setSaveMessage('Failed to save API key')
      setTimeout(() => setSaveMessage(null), 3000)
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
      setTimeout(() => setSaveMessage(null), 3000)
    } catch (error) {
      console.error('Failed to clear API key:', error)
      setSaveMessage('Failed to clear API key')
      setTimeout(() => setSaveMessage(null), 3000)
    }
  }

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

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={handleSaveKey}
              disabled={isSaving || !apiKey.trim()}
              style={{
                padding: '8px 16px',
                fontSize: '14px',
                backgroundColor: isSaving || !apiKey.trim() ? '#9ca3af' : '#059669',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: isSaving || !apiKey.trim() ? 'not-allowed' : 'pointer'
              }}
            >
              {isSaving ? 'Saving...' : 'Save API Key'}
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
      </main>
    </div>
  )
}
