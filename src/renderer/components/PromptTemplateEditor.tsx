import React, { useState, useEffect } from 'react'
import { FileText, RotateCcw, Save, Eye, AlertCircle, Check, X } from 'lucide-react'

interface Props {
  onSave?: () => void
}

export const PromptTemplateEditor: React.FC<Props> = ({ onSave }) => {
  const [template, setTemplate] = useState('')
  const [originalTemplate, setOriginalTemplate] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [showResetConfirm, setShowResetConfirm] = useState(false)

  useEffect(() => {
    loadTemplate()
  }, [])

  useEffect(() => {
    setHasChanges(template !== originalTemplate)
  }, [template, originalTemplate])

  const loadTemplate = async () => {
    try {
      const savedTemplate = await window.electronAPI.getPromptTemplate()
      const templateToUse = savedTemplate || getDefaultTemplate()
      setTemplate(templateToUse)
      setOriginalTemplate(templateToUse)
    } catch (error) {
      console.error('Failed to load prompt template:', error)
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    setSaveMessage(null)

    try {
      await window.electronAPI.setPromptTemplate(template)
      setOriginalTemplate(template)
      setSaveMessage('Template saved successfully!')
      onSave?.()
      
      setTimeout(() => setSaveMessage(null), 3000)
    } catch (error) {
      console.error('Failed to save template:', error)
      setSaveMessage('Failed to save template')
    } finally {
      setIsSaving(false)
    }
  }

  const handleReset = async () => {
    setShowResetConfirm(true)
  }

  const confirmReset = async () => {
    setShowResetConfirm(false)
    try {
      await window.electronAPI.clearPromptTemplate()
      await loadTemplate()
      setSaveMessage('Reset to default template')
      setTimeout(() => setSaveMessage(null), 3000)
    } catch (error) {
      console.error('Failed to reset template:', error)
    }
  }

  const getDefaultTemplate = () => {
    return `Please generate a comprehensive meeting brief that includes:
1. **Executive Summary** - Brief overview of the meeting purpose and expected outcomes
2. **Key Discussion Points** - Main topics to be covered based on the context provided
3. **Preparation Checklist** - Specific items the user should prepare or review beforehand
4. **Questions to Consider** - Thoughtful questions to drive productive discussion
5. **Success Metrics** - How to measure if the meeting was successful

Pay special attention to:
- **User-provided context**: Direct input from the user about meeting goals and expectations
- **Historical context**: Relevant information from past notes that may inform this meeting
- **Integration**: Connect historical insights with current meeting objectives

Format the response in clear markdown with proper headings and bullet points. Keep it professional, actionable, and tailored to the specific meeting context provided.`
  }

  return (
    <div className="space-y-6">
      {/* Reset Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-surface border border-border rounded-xl p-6 max-w-md mx-4 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle className="w-6 h-6 text-warning" />
              <h3 className="text-lg font-semibold text-primary">Reset Template</h3>
            </div>
            <p className="text-secondary mb-6">
              Reset to default template? This will lose your current changes.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="px-4 py-2 text-sm text-secondary hover:text-primary border border-border rounded-lg hover:bg-surface-hover transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmReset}
                className="px-4 py-2 text-sm font-medium bg-warning hover:bg-warning-dark text-white rounded-lg transition-colors"
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <h3 className="text-lg font-semibold text-primary">Template Editor</h3>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="flex items-center gap-2 px-4 py-2 text-sm text-secondary hover:text-primary border border-border rounded-lg hover:bg-surface-hover transition-colors"
          >
            <Eye className="w-4 h-4" />
            <span>{showPreview ? 'Hide' : 'Show'} Info</span>
          </button>
        </div>
      </div>

      {showPreview && (
        <div className="bg-brand-50 border border-brand-200 rounded-lg p-4">
          <h4 className="font-medium text-brand-900 mb-3">How it works:</h4>
          <div className="text-sm text-brand-800 space-y-2">
            <p>1. <strong>Your custom prompt</strong> - The instructions you write above</p>
            <p>2. <strong>Meeting details</strong> - Title, date, time, location, description</p>
            <p>3. <strong>User context</strong> - The context you provide when generating a brief</p>
            <p>4. <strong>Obsidian notes</strong> - Relevant historical context from your vault</p>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <label className="block text-sm font-medium text-primary">
          Template Content
        </label>
        <textarea
          value={template}
          onChange={(e) => setTemplate(e.target.value)}
          className="w-full h-96 px-4 py-3 bg-background border border-border rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent font-mono text-sm text-primary resize-none transition-all"
          placeholder="Enter your custom prompt template..."
        />
        <p className="text-xs text-secondary">
          Your custom prompt will be followed automatically by meeting details, user context, and relevant Obsidian notes.
        </p>
      </div>

      <div className="flex items-center justify-between">
        <button
          onClick={handleReset}
          className="flex items-center gap-2 px-4 py-2 text-sm text-secondary hover:text-primary border border-border rounded-lg hover:bg-surface-hover transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Reset to Default</span>
        </button>

        <div className="flex items-center space-x-3">
          {saveMessage && (
            <div className={`flex items-center space-x-2 text-sm px-3 py-1.5 rounded-md ${
              saveMessage.includes('Failed') 
                ? 'bg-danger-light text-danger-dark border border-danger' 
                : 'bg-success-light text-success-dark border border-success'
            }`}>
              {saveMessage.includes('Failed') ? (
                <X className="w-4 h-4" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              <span>{saveMessage}</span>
            </div>
          )}
          
          <button
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
            className={`flex items-center gap-2 px-6 py-2 text-sm font-medium rounded-lg transition-colors shadow-sm ${
              hasChanges && !isSaving
                ? 'bg-brand-600 hover:bg-brand-700 text-white'
                : 'bg-surface border border-border text-tertiary cursor-not-allowed opacity-50'
            }`}
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Saving...' : 'Save Template'}</span>
          </button>
        </div>
      </div>
    </div>
  )
}
