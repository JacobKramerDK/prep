import React, { useState, useEffect } from 'react'
import { Tabs } from './Tabs'
import {
  Bot,
  Database,
  Calendar as CalendarIcon,
  ArrowLeft,
  Save,
  Trash2,
  RefreshCw,
  Check,
  AlertCircle,
  FileUp,
  Settings as SettingsIcon,
  Info,
  Apple,
} from 'lucide-react'

interface SettingsPageProps {
  onBack: () => void
  vaultFileCount?: number
}

export function SettingsPage({ onBack, vaultFileCount }: SettingsPageProps) {
  const [activeTab, setActiveTab] = useState('ai')
  const [apiKey, setApiKey] = useState('')
  const [selectedModel, setSelectedModel] = useState('gpt-4-turbo')
  const [availableModels, setAvailableModels] = useState(['gpt-4-turbo', 'gpt-4', 'gpt-3.5-turbo'])
  const [isLoadingModels, setIsLoadingModels] = useState(false)
  const [isValidating, setIsValidating] = useState(false)
  const [validationResult, setValidationResult] = useState<'valid' | 'invalid' | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const [savedApiKey, savedModel] = await Promise.all([
          window.electronAPI.getOpenAIApiKey(),
          window.electronAPI.getOpenAIModel()
        ])
        
        if (savedApiKey) {
          setApiKey(savedApiKey)
          // Auto-load models if we have a valid API key
          if (savedApiKey.startsWith('sk-') && savedApiKey.length >= 20) {
            setIsLoadingModels(true)
            try {
              const models = await window.electronAPI.getAvailableModels(savedApiKey)
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
        if (savedModel) setSelectedModel(savedModel)
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
          if (models && models.length > 0) {
            setAvailableModels(models)
          }
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

  const handleSaveSettings = async () => {
    setIsSaving(true)
    setSaveMessage(null)
    try {
      await Promise.all([
        window.electronAPI.setOpenAIApiKey(apiKey.trim() || null),
        window.electronAPI.setOpenAIModel(selectedModel)
      ])
      setSaveMessage('Settings saved successfully!')
      setTimeout(() => setSaveMessage(null), 3000)
    } catch (error) {
      console.error('Failed to save settings:', error)
      setSaveMessage('Failed to save settings')
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

  const handleSelectVault = async () => {
    try {
      const vaultPath = await window.electronAPI.selectVault()
      if (vaultPath) {
        await window.electronAPI.scanVault(vaultPath)
      }
    } catch (error) {
      console.error('Failed to select vault:', error)
    }
  }

  const handleConnectAppleCalendar = async () => {
    try {
      await window.electronAPI.extractCalendarEvents()
    } catch (error) {
      console.error('Failed to connect Apple Calendar:', error)
    }
  }

  const handleConnectGoogleCalendar = async () => {
    try {
      await window.electronAPI.authenticateGoogleCalendar()
    } catch (error) {
      console.error('Failed to connect Google Calendar:', error)
    }
  }

  const handleImportICS = async () => {
    try {
      const filePath = await window.electronAPI.selectICSFile()
      if (filePath) {
        await window.electronAPI.parseICSFile(filePath)
      }
    } catch (error) {
      console.error('Failed to import ICS file:', error)
    }
  }

  const tabs = [
    {
      id: 'ai',
      label: 'AI Configuration',
      icon: <Bot className="w-4 h-4" />,
    },
    {
      id: 'vault',
      label: 'Vault Management',
      icon: <Database className="w-4 h-4" />,
    },
    {
      id: 'calendar',
      label: 'Calendar Import',
      icon: <CalendarIcon className="w-4 h-4" />,
    },
  ]

  return (
    <div className="max-w-4xl mx-auto px-6 py-8 animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={onBack}
          className="group flex items-center gap-2 text-sm font-medium text-secondary hover:text-primary mb-6 transition-colors"
        >
          <div className="p-1.5 rounded-md bg-surface border border-border group-hover:bg-surface-hover transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </div>
          Back to Home
        </button>

        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-surface border border-border rounded-lg shadow-sm">
            <SettingsIcon className="w-6 h-6 text-secondary" />
          </div>
          <h1 className="text-3xl font-bold text-primary tracking-tight">
            Settings
          </h1>
        </div>
        <p className="text-secondary text-lg">
          Configure your Prep application preferences
        </p>
      </div>

      {/* Tabs */}
      <div className="mb-8">
        <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
      </div>

      {/* Content Area */}
      <div className="space-y-6">
        {activeTab === 'ai' && (
          <div className="bg-surface border border-border rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-brand-50 dark:bg-brand-900/20 rounded-lg">
                <Bot className="w-6 h-6 text-brand-600 dark:text-brand-400" />
              </div>
              <h2 className="text-xl font-semibold text-primary">
                OpenAI API Configuration
              </h2>
            </div>

            <p className="text-secondary mb-6 max-w-2xl">
              To generate AI-powered meeting briefs, you need to provide your
              OpenAI API key. Your key is stored locally and never shared with
              anyone except OpenAI.
            </p>

            <div className="space-y-6 max-w-2xl">
              <div>
                <label className="block text-sm font-medium text-primary mb-2">
                  OpenAI API Key
                </label>
                <div className="flex gap-3">
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="flex-1 h-11 px-4 rounded-lg border border-border bg-background text-primary focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all font-mono text-sm"
                    placeholder="sk-..."
                  />
                  <button 
                    onClick={handleValidateKey}
                    disabled={isValidating}
                    className="h-11 px-6 font-medium text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-50 rounded-lg transition-colors shadow-sm">
                    {isValidating ? 'Validating...' : 'Validate'}
                  </button>
                </div>
                {validationResult && (
                  <div className={`mt-2 text-sm ${validationResult === 'valid' ? 'text-success-dark' : 'text-danger'}`}>
                    {validationResult === 'valid' ? '✓ API key is valid' : '✗ Invalid API key'}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-primary mb-2">
                  AI Model
                </label>
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  disabled={isLoadingModels}
                  className="w-full h-11 px-4 rounded-lg border border-border bg-background text-primary focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all appearance-none disabled:opacity-50"
                >
                  {isLoadingModels ? (
                    <option>Loading models...</option>
                  ) : (
                    availableModels.map(model => (
                      <option key={model} value={model}>
                        {model === 'gpt-4-turbo' ? 'GPT-4 Turbo (Recommended)' : 
                         model === 'gpt-4' ? 'GPT-4' :
                         model === 'gpt-3.5-turbo' ? 'GPT-3.5 Turbo' : 
                         model === 'o1-preview' ? 'O1 Preview' :
                         model === 'o1-mini' ? 'O1 Mini' :
                         model === 'gpt-4o' ? 'GPT-4o' :
                         model === 'gpt-4o-mini' ? 'GPT-4o Mini' :
                         model}
                      </option>
                    ))
                  )}
                </select>
                <p className="text-xs text-secondary mt-2">
                  {isLoadingModels 
                    ? 'Loading available models from OpenAI...' 
                    : 'Choose the AI model for generating meeting briefs. Validate your API key to see all available models.'
                  }
                </p>
              </div>

              <div className="pt-4 flex items-center gap-3 border-t border-border">
                <button 
                  onClick={handleSaveSettings}
                  disabled={isSaving}
                  className="flex items-center gap-2 px-6 py-2.5 bg-success hover:bg-success-dark disabled:opacity-50 text-white font-medium rounded-lg shadow-sm transition-colors">
                  <Save className="w-4 h-4" />
                  {isSaving ? 'Saving...' : 'Save Settings'}
                </button>
                <button 
                  onClick={handleClearKey}
                  className="flex items-center gap-2 px-6 py-2.5 bg-danger hover:bg-danger-dark text-white font-medium rounded-lg shadow-sm transition-colors">
                  <Trash2 className="w-4 h-4" />
                  Clear Key
                </button>
                {saveMessage && (
                  <span className={`text-sm ${saveMessage.includes('success') ? 'text-success-dark' : 'text-danger'}`}>
                    {saveMessage}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'vault' && (
          <div className="bg-surface border border-border rounded-xl p-8 text-center shadow-sm min-h-[400px] flex flex-col items-center justify-center">
            <h2 className="text-2xl font-bold text-primary mb-4">
              Connect Your Obsidian Vault
            </h2>
            <p className="text-secondary max-w-md mb-8">
              Select your Obsidian vault directory to start browsing and
              searching your notes for context.
            </p>

            <div className="w-full max-w-md mb-8">
              <div className="bg-success-light/30 border border-success/30 dark:bg-success-dark/10 dark:border-success-dark/30 rounded-lg p-4 flex items-center justify-center gap-3">
                <Check className="w-5 h-5 text-success dark:text-success-400" />
                <span className="font-medium text-success-dark dark:text-success-400">
                  Vault indexed for AI context ({vaultFileCount || 0} files)
                </span>
              </div>
            </div>

            <button 
              onClick={handleSelectVault}
              className="px-6 py-3 bg-brand-600 hover:bg-brand-700 text-white font-medium rounded-lg shadow-sm transition-colors">
              Select Different Vault
            </button>
          </div>
        )}

        {activeTab === 'calendar' && (
          <div className="space-y-6">
            <div className="bg-surface border border-border rounded-xl p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-brand-50 dark:bg-brand-900/20 rounded-lg">
                  <CalendarIcon className="w-6 h-6 text-brand-600 dark:text-brand-400" />
                </div>
                <h2 className="text-xl font-semibold text-primary">
                  Import Options
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                <button 
                  onClick={handleConnectAppleCalendar}
                  className="flex items-center gap-3 p-5 border-2 border-border rounded-xl hover:border-brand-500 hover:bg-surface-hover transition-all group">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-surface-hover border border-border flex items-center justify-center group-hover:bg-background transition-colors">
                    <CalendarIcon className="w-5 h-5 text-secondary group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors" />
                  </div>
                  <div className="text-left">
                    <div className="font-semibold text-primary group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                      Apple Calendar
                    </div>
                    <div className="text-sm text-secondary">
                      Extract events from macOS
                    </div>
                  </div>
                </button>

                <button 
                  onClick={handleImportICS}
                  className="flex items-center gap-3 p-5 border-2 border-border rounded-xl hover:border-brand-500 hover:bg-surface-hover transition-all group">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-surface-hover border border-border flex items-center justify-center group-hover:bg-background transition-colors">
                    <FileUp className="w-5 h-5 text-secondary group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors" />
                  </div>
                  <div className="text-left">
                    <div className="font-semibold text-primary group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                      ICS File
                    </div>
                    <div className="text-sm text-secondary">
                      Import calendar file
                    </div>
                  </div>
                </button>
              </div>

              <div className="border-t border-border pt-6">
                <h3 className="text-lg font-medium text-primary mb-4">
                  Google Calendar Integration
                </h3>
                <div className="bg-surface-hover rounded-lg p-6 border border-border">
                  <p className="text-secondary mb-4">
                    Connect your Google Calendar to automatically import events
                    for meeting preparation.
                  </p>
                  <button 
                    onClick={handleConnectGoogleCalendar}
                    className="flex items-center gap-2 px-4 py-2 bg-surface border border-border rounded-lg shadow-sm text-sm font-medium text-primary hover:bg-surface-hover transition-colors mb-6">
                    <CalendarIcon className="w-4 h-4" />
                    Connect Google Calendar
                  </button>

                  <ul className="space-y-2 text-sm text-secondary">
                    <li className="flex items-start gap-2">
                      <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-tertiary"></span>
                      Prep will access your Google Calendar events (read-only)
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-tertiary"></span>
                      Events will be imported automatically
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-tertiary"></span>
                      Your data stays private and local
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Info Footer */}
      <div className="mt-12 p-6 bg-surface-hover rounded-xl border border-border">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-lg bg-brand-50 dark:bg-brand-900/20 flex items-center justify-center">
            <Info className="w-4 h-4 text-brand-600 dark:text-brand-400" />
          </div>
          <h3 className="font-semibold text-primary">How it works</h3>
        </div>
        <ul className="space-y-2 text-sm text-secondary ml-1">
          <li className="flex items-center gap-2">
            <span className="w-1 h-1 rounded-full bg-tertiary"></span>
            Your API key is stored securely on your local machine
          </li>
          <li className="flex items-center gap-2">
            <span className="w-1 h-1 rounded-full bg-tertiary"></span>
            It's never shared with anyone except OpenAI for generating briefs
          </li>
          <li className="flex items-center gap-2">
            <span className="w-1 h-1 rounded-full bg-tertiary"></span>
            Brief generation requires an active internet connection
          </li>
        </ul>
      </div>
    </div>
  )
}
