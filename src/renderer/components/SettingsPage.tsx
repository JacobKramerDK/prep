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
  FileText,
  FolderOpen,
  Bug,
} from 'lucide-react'
import type { VaultIndexingProgress } from '../../shared/types/vault-status'
import { VaultIndexingLoader } from './VaultIndexingLoader'
import { PromptTemplateEditor } from './PromptTemplateEditor'
import { SummaryPromptEditor } from './SummaryPromptEditor'
import { RelevanceWeightSettings } from './RelevanceWeightSettings'
import { AppleCalendarAuth } from './AppleCalendarAuth'
import { GoogleCalendarAuth } from './GoogleCalendarAuth'
import { useOSDetection } from '../hooks/useOSDetection'

interface SettingsPageProps {
  onBack: () => void
  vaultFileCount?: number
}

export function SettingsPage({ onBack, vaultFileCount }: SettingsPageProps) {
  const { isMacOS } = useOSDetection()
  const [activeTab, setActiveTab] = useState('ai')
  const [apiKey, setApiKey] = useState('')
  const [selectedModel, setSelectedModel] = useState('gpt-4-turbo')
  const [availableModels, setAvailableModels] = useState(['gpt-4-turbo', 'gpt-4', 'gpt-3.5-turbo'])
  const [isLoadingModels, setIsLoadingModels] = useState(false)
  const [isValidating, setIsValidating] = useState(false)
  const [validationResult, setValidationResult] = useState<'valid' | 'invalid' | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)
  const [briefFolder, setBriefFolder] = useState<string | null>(null)
  const [debugMode, setDebugMode] = useState(false)
  const [debugLogPath, setDebugLogPath] = useState<string | null>(null)
  const [debugError, setDebugError] = useState<string | null>(null)
  const [vaultLoading, setVaultLoading] = useState(false)
  const [vaultIndexingProgress, setVaultIndexingProgress] = useState<VaultIndexingProgress | null>(null)
  const [transcriptionModel, setTranscriptionModel] = useState('whisper-1')
  const [transcriptFolder, setTranscriptFolder] = useState<string | null>(null)
  const [summaryModel, setSummaryModel] = useState('gpt-4o-mini')
  const [summaryFolder, setSummaryFolder] = useState<string | null>(null)
  const [cleanupRecordingFiles, setCleanupRecordingFiles] = useState(true)

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const results = await Promise.allSettled([
          window.electronAPI.getOpenAIApiKey(),
          window.electronAPI.getOpenAIModel(),
          window.electronAPI.getObsidianBriefFolder(),
          window.electronAPI.getDebugMode(),
          window.electronAPI.getTranscriptionModel(),
          window.electronAPI.getTranscriptFolder(),
          window.electronAPI.getSummaryModel(),
          window.electronAPI.getSummaryFolder(),
          window.electronAPI.getCleanupRecordingFiles()
        ])
        
        const [apiKeyResult, modelResult, briefFolderResult, debugModeResult, transcriptionModelResult, transcriptFolderResult, summaryModelResult, summaryFolderResult, cleanupResult] = results
        
        if (apiKeyResult.status === 'fulfilled' && apiKeyResult.value) {
          setApiKey(apiKeyResult.value)
          // Auto-load models if we have a valid API key
          if (apiKeyResult.value.startsWith('sk-') && apiKeyResult.value.length >= 20) {
            setIsLoadingModels(true)
            try {
              const models = await window.electronAPI.getAvailableModels(apiKeyResult.value)
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
        
        if (modelResult.status === 'fulfilled' && modelResult.value) {
          setSelectedModel(modelResult.value)
        }
        
        if (briefFolderResult.status === 'fulfilled' && briefFolderResult.value) {
          setBriefFolder(briefFolderResult.value)
        }
        
        if (transcriptionModelResult.status === 'fulfilled' && transcriptionModelResult.value) {
          setTranscriptionModel(transcriptionModelResult.value)
        }
        
        if (transcriptFolderResult.status === 'fulfilled' && transcriptFolderResult.value) {
          setTranscriptFolder(transcriptFolderResult.value)
        }
        
        if (summaryModelResult.status === 'fulfilled' && summaryModelResult.value) {
          setSummaryModel(summaryModelResult.value)
        }
        
        if (summaryFolderResult.status === 'fulfilled' && summaryFolderResult.value) {
          setSummaryFolder(summaryFolderResult.value)
        }
        
        if (cleanupResult.status === 'fulfilled') {
          setCleanupRecordingFiles(cleanupResult.value)
        }
        
        if (debugModeResult.status === 'fulfilled') {
          setDebugMode(debugModeResult.value)
          if (debugModeResult.value) {
            try {
              const logPath = await window.electronAPI.getDebugLogPath()
              setDebugLogPath(logPath)
              setDebugError(null)
            } catch (error) {
              console.error('Failed to get debug log path:', error)
              setDebugError('Failed to determine debug log path. Debug mode may not work correctly.')
            }
          }
        }
      } catch (error) {
        console.error('Failed to load settings:', error)
      }
    }
    loadSettings()
  }, [])

  // Add progress listener
  useEffect(() => {
    const cleanup = window.electronAPI.onVaultIndexingProgress((progress) => {
      setVaultIndexingProgress(progress)
      
      if (progress.stage === 'complete' || progress.stage === 'error') {
        setVaultLoading(false)
      }
    })
    
    return cleanup
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
        window.electronAPI.setOpenAIModel(selectedModel),
        window.electronAPI.setTranscriptionModel(transcriptionModel),
        window.electronAPI.setSummaryModel(summaryModel),
        window.electronAPI.setCleanupRecordingFiles(cleanupRecordingFiles)
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
    setVaultLoading(true)
    setVaultIndexingProgress(null)
    
    try {
      const vaultPath = await window.electronAPI.selectVault()
      if (vaultPath) {
        await window.electronAPI.scanVault(vaultPath)
        // Loading state will be cleared by progress event listener
      } else {
        setVaultLoading(false)
      }
    } catch (error) {
      console.error('Failed to select vault:', error)
      setVaultLoading(false)
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

  const handleSelectBriefFolder = async () => {
    try {
      const folderPath = await window.electronAPI.selectObsidianBriefFolder()
      if (folderPath) {
        await window.electronAPI.setObsidianBriefFolder(folderPath)
        setBriefFolder(folderPath)
      }
    } catch (error) {
      console.error('Failed to select brief folder:', error)
    }
  }

  const handleSelectTranscriptFolder = async () => {
    try {
      const folderPath = await window.electronAPI.selectTranscriptFolder()
      if (folderPath) {
        await window.electronAPI.setTranscriptFolder(folderPath)
        setTranscriptFolder(folderPath)
      }
    } catch (error) {
      console.error('Failed to select transcript folder:', error)
    }
  }

  const handleSelectSummaryFolder = async () => {
    try {
      const folderPath = await window.electronAPI.selectSummaryFolder()
      if (folderPath) {
        await window.electronAPI.setSummaryFolder(folderPath)
        setSummaryFolder(folderPath)
      }
    } catch (error) {
      console.error('Failed to select summary folder:', error)
    }
  }

  const handleDebugModeToggle = async (enabled: boolean) => {
    try {
      await window.electronAPI.setDebugMode(enabled)
      setDebugMode(enabled)
      setDebugError(null)
      if (enabled) {
        const logPath = await window.electronAPI.getDebugLogPath()
        setDebugLogPath(logPath)
      } else {
        setDebugLogPath(null)
      }
    } catch (error) {
      console.error('Failed to toggle debug mode:', error)
      setDebugError(`Failed to ${enabled ? 'enable' : 'disable'} debug mode: ${error instanceof Error ? error.message : 'Unknown error'}`)
      // Revert the debug mode state if it failed
      setDebugMode(!enabled)
    }
  }

  const tabs = [
    {
      id: 'ai',
      label: 'AI Configuration',
      icon: <Bot className="w-4 h-4" />,
    },
    {
      id: 'relevance',
      label: 'Relevance Scoring',
      icon: <SettingsIcon className="w-4 h-4" />,
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
    {
      id: 'prompts',
      label: 'Prompt Templates',
      icon: <FileText className="w-4 h-4" />,
    },
    {
      id: 'debug',
      label: 'Debug Settings',
      icon: <Bug className="w-4 h-4" />,
    },
  ]

  return (
    <div className="max-w-4xl mx-auto px-6 py-8 animate-fade-in" data-testid="settings-container">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={onBack}
          className="group flex items-center gap-2 text-sm font-medium text-secondary hover:text-primary mb-6 transition-colors"
          data-testid="back-button"
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

            <div className="mb-6 p-6 bg-surface-hover rounded-xl border border-border">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-lg bg-brand-50 dark:bg-brand-900/20 flex items-center justify-center">
                  <Info className="w-4 h-4 text-brand-600 dark:text-brand-400" />
                </div>
                <h3 className="font-semibold text-primary">API Configuration</h3>
              </div>
              <ul className="space-y-2 text-sm text-secondary ml-1">
                <li className="flex items-center gap-2">
                  <span className="w-1 h-1 rounded-full bg-tertiary"></span>
                  Your API key is stored securely on your local machine
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1 h-1 rounded-full bg-tertiary"></span>
                  Choose the right model for your needs - GPT-4 Turbo is recommended
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1 h-1 rounded-full bg-tertiary"></span>
                  Brief generation requires an active internet connection
                </li>
              </ul>
            </div>

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
                    data-testid="api-key-input"
                  />
                  <button 
                    onClick={handleValidateKey}
                    disabled={isValidating}
                    className="h-11 px-6 font-medium text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-50 rounded-lg transition-colors shadow-sm"
                    data-testid="validate-button">
                    {isValidating ? 'Validating...' : 'Validate'}
                  </button>
                </div>
                {validationResult && (
                  <div className={`mt-2 text-sm ${validationResult === 'valid' ? 'text-success-dark' : 'text-danger'}`} data-testid="api-validation-result">
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
                  data-testid="model-select"
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

              <div>
                <label className="block text-sm font-medium text-primary mb-2">
                  Transcription Model
                </label>
                <select
                  value={transcriptionModel}
                  onChange={(e) => setTranscriptionModel(e.target.value)}
                  className="w-full h-11 px-4 rounded-lg border border-border bg-background text-primary focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all appearance-none"
                  data-testid="transcription-model-select"
                >
                  <option value="whisper-1">Whisper-1 (Original - Duration Billing)</option>
                  <option value="gpt-4o-mini-transcribe">GPT-4o Mini Transcribe (Fast & Accurate - Token Billing)</option>
                  <option value="gpt-4o-transcribe">GPT-4o Transcribe (Highest Quality - Token Billing)</option>
                </select>
                <p className="text-xs text-secondary mt-2">
                  Choose the AI model for transcribing meeting audio. Whisper-1 uses duration-based billing, while GPT-4o models use token-based billing for cost optimization.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-primary mb-2">
                  Summary Model
                </label>
                <select
                  value={summaryModel}
                  onChange={(e) => setSummaryModel(e.target.value)}
                  disabled={isLoadingModels}
                  className="w-full h-11 px-4 rounded-lg border border-border bg-background text-primary focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all appearance-none disabled:opacity-50"
                  data-testid="summary-model-select"
                >
                  {isLoadingModels ? (
                    <option>Loading models...</option>
                  ) : (
                    availableModels.map(model => (
                      <option key={model} value={model}>
                        {model === 'gpt-4-turbo' ? 'GPT-4 Turbo' : 
                         model === 'gpt-4' ? 'GPT-4' :
                         model === 'gpt-3.5-turbo' ? 'GPT-3.5 Turbo' : 
                         model === 'o1-preview' ? 'O1 Preview' :
                         model === 'o1-mini' ? 'O1 Mini' :
                         model === 'gpt-4o' ? 'GPT-4o' :
                         model === 'gpt-4o-mini' ? 'GPT-4o Mini (Recommended)' :
                         model}
                      </option>
                    ))
                  )}
                </select>
                <p className="text-xs text-secondary mt-2">
                  Choose the AI model for generating meeting summaries from transcripts. GPT-4o Mini offers the best balance of quality and cost.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-primary mb-2">
                  Transcript Folder
                </label>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-11 px-4 rounded-lg border border-border bg-surface text-primary flex items-center">
                    <span className="text-sm truncate">
                      {transcriptFolder || 'No folder selected'}
                    </span>
                  </div>
                  <button
                    onClick={handleSelectTranscriptFolder}
                    className="flex items-center gap-2 px-4 py-2.5 bg-surface border border-border hover:bg-surface-hover text-secondary hover:text-primary rounded-lg transition-colors"
                  >
                    <FolderOpen className="w-4 h-4" />
                    Select
                  </button>
                </div>
                <p className="text-xs text-secondary mt-2">
                  Choose where to save meeting transcripts. Transcripts will be saved as Markdown files with metadata.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-primary mb-2">
                  Summary Folder
                </label>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-11 px-4 rounded-lg border border-border bg-surface text-primary flex items-center">
                    <span className="text-sm truncate">
                      {summaryFolder || 'No folder selected'}
                    </span>
                  </div>
                  <button
                    onClick={handleSelectSummaryFolder}
                    className="flex items-center gap-2 px-4 py-2.5 bg-surface border border-border hover:bg-surface-hover text-secondary hover:text-primary rounded-lg transition-colors"
                  >
                    <FolderOpen className="w-4 h-4" />
                    Select
                  </button>
                </div>
                <p className="text-xs text-secondary mt-2">
                  Choose where to save meeting summaries. Summaries will be saved as Markdown files with structured content.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-primary mb-3">
                  Recording File Management
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="cleanup-recording-files"
                    checked={cleanupRecordingFiles}
                    onChange={(e) => setCleanupRecordingFiles(e.target.checked)}
                    className="w-4 h-4 text-brand-600 bg-background border-border rounded focus:ring-brand-500 focus:ring-2"
                    data-testid="cleanup-recording-files-checkbox"
                  />
                  <label htmlFor="cleanup-recording-files" className="text-sm text-primary cursor-pointer">
                    Automatically delete recording files after successful transcription
                  </label>
                </div>
                <p className="text-xs text-secondary mt-2">
                  When enabled, original audio recordings are automatically deleted after transcription completes successfully. 
                  This saves storage space and protects privacy. Failed transcriptions preserve files for retry.
                </p>
              </div>

              <div className="pt-4 flex items-center gap-3 border-t border-border">
                <button 
                  onClick={handleSaveSettings}
                  disabled={isSaving}
                  className="flex items-center gap-2 px-6 py-2.5 bg-success hover:bg-success-dark disabled:opacity-50 text-white font-medium rounded-lg shadow-sm transition-colors"
                  data-testid="save-settings-button">
                  <Save className="w-4 h-4" />
                  {isSaving ? 'Saving...' : 'Save Settings'}
                </button>
                <button 
                  onClick={handleClearKey}
                  className="flex items-center gap-2 px-6 py-2.5 bg-danger hover:bg-danger-dark text-white font-medium rounded-lg shadow-sm transition-colors"
                  data-testid="clear-key-button">
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

        {activeTab === 'relevance' && (
          <RelevanceWeightSettings />
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

            <div className="mb-6 p-6 bg-surface-hover rounded-xl border border-border">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-lg bg-brand-50 dark:bg-brand-900/20 flex items-center justify-center">
                  <Info className="w-4 h-4 text-brand-600 dark:text-brand-400" />
                </div>
                <h3 className="font-semibold text-primary">Vault Integration</h3>
              </div>
              <ul className="space-y-2 text-sm text-secondary ml-1">
                <li className="flex items-center gap-2">
                  <span className="w-1 h-1 rounded-full bg-tertiary"></span>
                  Connect to your existing Obsidian vault directory
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1 h-1 rounded-full bg-tertiary"></span>
                  All files are indexed locally for fast searching
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1 h-1 rounded-full bg-tertiary"></span>
                  Your notes remain private and stored on your device
                </li>
              </ul>
            </div>

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
              disabled={vaultLoading}
              className="px-6 py-3 bg-brand-600 hover:bg-brand-700 disabled:bg-gray-400 text-white font-medium rounded-lg shadow-sm transition-colors">
              {vaultLoading ? 'Scanning Vault...' : 'Select Different Vault'}
            </button>

            {/* Show VaultIndexingLoader when loading */}
            {vaultLoading && (
              <div className="mt-6">
                <VaultIndexingLoader progress={vaultIndexingProgress} />
              </div>
            )}

            {/* Brief Folder Configuration */}
            <div className="mt-8 pt-8 border-t border-border">
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-primary mb-2">
                  Meeting Brief Storage
                </h3>
                <p className="text-sm text-secondary">
                  Configure where to save AI-generated meeting briefs in your Obsidian vault.
                </p>
              </div>

              <div className="bg-surface-hover rounded-xl border border-border p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-brand-50 dark:bg-brand-900/20 flex items-center justify-center">
                    <FolderOpen className="w-4 h-4 text-brand-600 dark:text-brand-400" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-primary">Brief Folder</h4>
                    <p className="text-sm text-secondary">
                      {briefFolder ? briefFolder : 'No folder selected'}
                    </p>
                  </div>
                </div>

                <div className="flex justify-center">
                  <button
                    onClick={handleSelectBriefFolder}
                    className="px-4 py-2 bg-surface text-primary border border-border rounded-lg hover:bg-surface-hover transition-colors flex items-center gap-2"
                  >
                    <FolderOpen className="w-4 h-4" />
                    {briefFolder ? 'Change Folder' : 'Select Folder'}
                  </button>
                </div>
              </div>
            </div>
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

              <div className="mb-6 p-6 bg-surface-hover rounded-xl border border-border">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-brand-50 dark:bg-brand-900/20 flex items-center justify-center">
                    <Info className="w-4 h-4 text-brand-600 dark:text-brand-400" />
                  </div>
                  <h3 className="font-semibold text-primary">Import Methods</h3>
                </div>
                <ul className="space-y-2 text-sm text-secondary ml-1">
                  <li className="flex items-center gap-2">
                    <span className="w-1 h-1 rounded-full bg-tertiary"></span>
                    Choose from multiple calendar sources and formats
                  </li>
                  {isMacOS && (
                    <li className="flex items-center gap-2">
                      <span className="w-1 h-1 rounded-full bg-tertiary"></span>
                      Apple Calendar integration available on macOS
                    </li>
                  )}
                  <li className="flex items-center gap-2">
                    <span className="w-1 h-1 rounded-full bg-tertiary"></span>
                    All calendar data stays private and syncs locally
                  </li>
                </ul>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
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
                  <GoogleCalendarAuth />
                </div>
              </div>

              {isMacOS && (
                <div className="border-t border-border pt-6">
                  <h3 className="text-lg font-medium text-primary mb-4">
                    Apple Calendar Integration
                  </h3>
                  <div className="bg-surface-hover rounded-lg p-6 border border-border">
                    <p className="text-secondary mb-4">
                      Connect your Apple Calendar to automatically import events
                      for meeting preparation with calendar selection.
                    </p>
                    
                    <AppleCalendarAuth />

                    <ul className="space-y-2 text-sm text-secondary mt-6">
                      <li className="flex items-start gap-2">
                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-tertiary"></span>
                        Prep will access your Apple Calendar events (read-only)
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-tertiary"></span>
                        Choose which calendars to sync
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-tertiary"></span>
                        Your data stays private and local
                      </li>
                    </ul>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'prompts' && (
          <div className="space-y-6">
            <div className="bg-surface border border-border rounded-xl p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-brand-50 dark:bg-brand-900/20 rounded-lg">
                  <FileText className="w-6 h-6 text-brand-600 dark:text-brand-400" />
                </div>
                <h2 className="text-xl font-semibold text-primary">Prompt Templates</h2>
              </div>
              <p className="text-secondary mb-6">
                Customize the AI prompt used for generating meeting briefs. Use variables to insert dynamic content.
              </p>

              <div className="mb-6 p-6 bg-surface-hover rounded-xl border border-border">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-brand-50 dark:bg-brand-900/20 flex items-center justify-center">
                    <Info className="w-4 h-4 text-brand-600 dark:text-brand-400" />
                  </div>
                  <h3 className="font-semibold text-primary">Template Customization</h3>
                </div>
                <ul className="space-y-2 text-sm text-secondary ml-1">
                  <li className="flex items-center gap-2">
                    <span className="w-1 h-1 rounded-full bg-tertiary"></span>
                    Use variables like {'{meetingTitle}'} and {'{attendees}'} for dynamic content
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1 h-1 rounded-full bg-tertiary"></span>
                    Customize the AI's tone and focus for your meeting style
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1 h-1 rounded-full bg-tertiary"></span>
                    Changes directly impact the quality of generated briefs
                  </li>
                </ul>
              </div>
              <PromptTemplateEditor />
            </div>

            {/* Summary Prompt Template Section */}
            <div className="bg-surface border border-border rounded-xl p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-brand-50 dark:bg-brand-900/20 rounded-lg">
                  <FileText className="w-5 h-5 text-brand-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-primary">Summary Prompt Template</h3>
                  <p className="text-sm text-secondary">
                    Customize how AI generates meeting summaries from transcriptions
                  </p>
                </div>
              </div>
              <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                  <li className="flex items-center gap-2">
                    <span className="w-1 h-1 rounded-full bg-tertiary"></span>
                    Controls the structure and content of AI-generated meeting summaries
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1 h-1 rounded-full bg-tertiary"></span>
                    Applied when generating summaries from completed transcriptions
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1 h-1 rounded-full bg-tertiary"></span>
                    Focus on actionable insights, decisions, and follow-up items
                  </li>
                </ul>
              </div>
              <SummaryPromptEditor />
            </div>
          </div>
        )}

        {activeTab === 'debug' && (
          <div className="space-y-6">
            <div className="bg-surface border border-border rounded-xl p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-brand-50 dark:bg-brand-900/20 rounded-lg">
                  <Bug className="w-5 h-5 text-brand-600" />
                </div>
                <h3 className="text-lg font-semibold text-primary">Debug Mode</h3>
              </div>
              
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm font-medium text-primary mb-1">Enable Debug Logging</p>
                  <p className="text-xs text-secondary">Write debug information to log file for troubleshooting</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={debugMode}
                    onChange={(e) => handleDebugModeToggle(e.target.checked)}
                    className="sr-only"
                  />
                  <div className={`relative w-11 h-6 rounded-full transition-colors ${
                    debugMode ? 'bg-brand-600' : 'bg-surface border border-border'
                  }`}>
                    <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                      debugMode ? 'translate-x-5' : 'translate-x-0'
                    }`} />
                  </div>
                </label>
              </div>
              
              {debugLogPath && (
                <div className="mt-4 p-3 bg-surface-hover rounded-lg border border-border">
                  <p className="text-xs text-secondary mb-1">Log file location:</p>
                  <p className="text-sm font-mono text-primary break-all">{debugLogPath}</p>
                </div>
              )}
              
              {debugError && (
                <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-600" />
                    <p className="text-sm text-red-700 dark:text-red-300">{debugError}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
