import React, { useState, useEffect } from 'react'
import { FileText, RotateCcw, Save, Eye, AlertCircle, Check, X } from 'lucide-react'

interface Props {
  onSave?: () => void
}

export const SummaryPromptEditor: React.FC<Props> = ({ onSave }) => {
  const [template, setTemplate] = useState('')
  const [originalTemplate, setOriginalTemplate] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    loadTemplate()
  }, [])

  useEffect(() => {
    setHasChanges(template !== originalTemplate)
  }, [template, originalTemplate])

  const loadTemplate = async () => {
    try {
      setLoadError(null)
      const savedTemplate = await window.electronAPI.getTranscriptionSummaryPrompt()
      const templateToUse = savedTemplate || getDefaultSummaryTemplate()
      setTemplate(templateToUse)
      setOriginalTemplate(templateToUse)
    } catch (error) {
      console.error('Failed to load summary prompt template:', error)
      setLoadError('Failed to load template. Using default template.')
      const defaultTemplate = getDefaultSummaryTemplate()
      setTemplate(defaultTemplate)
      setOriginalTemplate(defaultTemplate)
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    setSaveMessage(null)

    try {
      await window.electronAPI.setTranscriptionSummaryPrompt(template)
      setOriginalTemplate(template)
      setSaveMessage('Summary template saved successfully!')
      onSave?.()
      
      setTimeout(() => setSaveMessage(null), 3000)
    } catch (error) {
      console.error('Failed to save summary template:', error)
      setSaveMessage('Failed to save summary template')
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
      await window.electronAPI.clearTranscriptionSummaryPrompt()
      await loadTemplate()
      setSaveMessage('Reset to default summary template')
      setTimeout(() => setSaveMessage(null), 3000)
    } catch (error) {
      console.error('Failed to reset summary template:', error)
    }
  }

  const getDefaultSummaryTemplate = () => {
    return `Analyze this meeting transcript and create a structured summary with the following sections:

## Executive Summary
Brief 2-3 sentence overview of the meeting's main purpose and outcomes.

## Key Discussion Points
- Main topics discussed with specific details
- Important decisions made during the meeting
- Any concerns or issues raised

## Action Items
| Task | Owner | Due Date | Priority |
|------|-------|----------|----------|
| [Extract specific tasks with owners and deadlines] |

## Decisions Made
- List all concrete decisions with rationale
- Include who made the decision and when

## Follow-up Items
- Next steps identified
- Future meetings scheduled
- Items requiring additional discussion

## Key Quotes
- Important statements or commitments made
- Direct quotes that capture essential points

Focus on actionable insights and specific details. Avoid generic summaries.`
  }

  return (
    <div className="space-y-6">
      {/* Reset Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-surface border border-border rounded-xl p-6 max-w-md mx-4 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle className="w-6 h-6 text-warning" />
              <h3 className="text-lg font-semibold text-primary">Reset Summary Template</h3>
            </div>
            <p className="text-secondary mb-6">
              Reset to default summary template? This will lose your current changes.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="px-4 py-2 text-secondary hover:text-primary border border-border hover:border-border-hover rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmReset}
                className="px-4 py-2 bg-warning hover:bg-warning/90 text-white rounded-lg transition-colors"
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-surface border border-border rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <FileText className="w-6 h-6 text-brand-600" />
            <div>
              <h3 className="text-lg font-semibold text-primary">Summary Prompt Template</h3>
              <p className="text-sm text-secondary">
                Customize how AI generates meeting summaries from transcriptions
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="flex items-center gap-2 px-3 py-2 text-secondary hover:text-primary border border-border hover:border-border-hover rounded-lg transition-colors"
            >
              <Eye className="w-4 h-4" />
              {showPreview ? 'Hide' : 'Preview'}
            </button>
            <button
              onClick={handleReset}
              disabled={isSaving}
              className="flex items-center gap-2 px-3 py-2 text-secondary hover:text-primary border border-border hover:border-border-hover rounded-lg transition-colors disabled:opacity-50"
            >
              <RotateCcw className="w-4 h-4" />
              Reset
            </button>
            <button
              onClick={handleSave}
              disabled={!hasChanges || isSaving}
              className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 disabled:bg-gray-400 text-white rounded-lg transition-colors"
            >
              <Save className="w-4 h-4" />
              {isSaving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>

        {/* Load Error Message */}
        {loadError && (
          <div className="mb-4 p-3 rounded-lg flex items-center gap-2 bg-red-50 border border-red-200 text-red-700">
            <AlertCircle className="w-4 h-4" />
            {loadError}
          </div>
        )}

        {/* Save Message */}
        {saveMessage && (
          <div className={`mb-4 p-3 rounded-lg flex items-center gap-2 ${
            saveMessage.includes('Failed') 
              ? 'bg-red-50 border border-red-200 text-red-700' 
              : 'bg-green-50 border border-green-200 text-green-700'
          }`}>
            {saveMessage.includes('Failed') ? (
              <AlertCircle className="w-4 h-4" />
            ) : (
              <Check className="w-4 h-4" />
            )}
            {saveMessage}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-primary mb-2">
              Template Content
            </label>
            <textarea
              value={template}
              onChange={(e) => setTemplate(e.target.value)}
              className="w-full h-96 p-3 border border-border rounded-lg bg-surface-hover text-primary placeholder-secondary resize-none font-mono text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              placeholder="Enter your custom summary prompt template..."
            />
          </div>

          {showPreview && (
            <div>
              <label className="block text-sm font-medium text-primary mb-2">
                Preview
              </label>
              <div className="p-4 border border-border rounded-lg bg-surface-hover max-h-96 overflow-y-auto">
                <pre className="text-sm text-primary whitespace-pre-wrap font-mono">
                  {template || 'No template content to preview'}
                </pre>
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="text-sm font-medium text-blue-900 mb-2">Template Guidelines</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Use markdown formatting for structure (## headings, - bullets, | tables |)</li>
            <li>• Focus on actionable insights and specific details</li>
            <li>• Include sections for decisions, action items, and follow-ups</li>
            <li>• The transcript will be automatically appended to your prompt</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
