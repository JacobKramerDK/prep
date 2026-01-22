import React, { useState, useEffect } from 'react'
import { Save, RotateCcw, Settings, Info } from 'lucide-react'
import { RelevanceWeightSlider } from './RelevanceWeightSlider'
import { RelevanceWeights, DEFAULT_RELEVANCE_WEIGHTS } from '../../shared/types/relevance-weights'

const MESSAGE_TIMEOUT = 3000

export function RelevanceWeightSettings() {
  const [weights, setWeights] = useState<RelevanceWeights>(DEFAULT_RELEVANCE_WEIGHTS)
  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)

  useEffect(() => {
    const loadWeights = async () => {
      try {
        const savedWeights = await window.electronAPI.getRelevanceWeights()
        setWeights(savedWeights)
      } catch (error) {
        console.error('Failed to load relevance weights:', error)
      }
    }
    loadWeights()
  }, [])

  const handleWeightChange = (key: keyof RelevanceWeights, value: number) => {
    setWeights(prev => ({
      ...prev,
      [key]: value
    }))
  }

  const handleSave = async () => {
    setIsSaving(true)
    setSaveMessage(null)
    try {
      await window.electronAPI.setRelevanceWeights(weights)
      setSaveMessage('Relevance weights saved successfully!')
      setTimeout(() => setSaveMessage(null), MESSAGE_TIMEOUT)
    } catch (error) {
      console.error('Failed to save relevance weights:', error)
      setSaveMessage('Failed to save relevance weights')
      setTimeout(() => setSaveMessage(null), MESSAGE_TIMEOUT)
    } finally {
      setIsSaving(false)
    }
  }

  const handleReset = () => {
    setWeights(DEFAULT_RELEVANCE_WEIGHTS)
  }

  const weightConfigs = [
    {
      key: 'title' as keyof RelevanceWeights,
      label: 'Title Matching',
      description: 'How much weight to give to matches found in note titles. Higher values prioritize notes with relevant titles.'
    },
    {
      key: 'content' as keyof RelevanceWeights,
      label: 'Content Similarity',
      description: 'How much weight to give to matches found in note content. Higher values prioritize notes with relevant body text.'
    },
    {
      key: 'tags' as keyof RelevanceWeights,
      label: 'Tag Matching',
      description: 'How much weight to give to matches found in note tags. Higher values prioritize notes with relevant tags.'
    },
    {
      key: 'attendees' as keyof RelevanceWeights,
      label: 'Attendee Names',
      description: 'How much weight to give when meeting attendee names appear in notes. Higher values prioritize notes mentioning participants.'
    },
    {
      key: 'flexSearchBonus' as keyof RelevanceWeights,
      label: 'Search Engine Bonus',
      description: 'Bonus points for notes found by the search engine. This rewards notes that match your search terms well.'
    },
    {
      key: 'recencyBonus' as keyof RelevanceWeights,
      label: 'Recency Bonus',
      description: 'Bonus points for recently modified notes. Higher values prioritize newer notes over older ones.'
    }
  ]

  return (
    <div className="bg-surface border border-border rounded-xl p-6 shadow-sm">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-brand-50 dark:bg-brand-900/20 rounded-lg">
          <Settings className="w-6 h-6 text-brand-600 dark:text-brand-400" />
        </div>
        <h2 className="text-xl font-semibold text-primary">
          Relevance Scoring Weights
        </h2>
      </div>

      <p className="text-secondary mb-6 max-w-2xl">
        Customize how the AI prioritizes different aspects of your notes when finding relevant context for meetings. 
        Adjust the weights to match your note-taking style and preferences.
      </p>

      <div className="mb-6 p-6 bg-surface-hover rounded-xl border border-border">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-lg bg-brand-50 dark:bg-brand-900/20 flex items-center justify-center">
            <Info className="w-4 h-4 text-brand-600 dark:text-brand-400" />
          </div>
          <h3 className="font-semibold text-primary">Relevance Scoring</h3>
        </div>
        <ul className="space-y-2 text-sm text-secondary ml-1">
          <li className="flex items-center gap-2">
            <span className="w-1 h-1 rounded-full bg-tertiary"></span>
            Higher weights give more importance to specific matching criteria
          </li>
          <li className="flex items-center gap-2">
            <span className="w-1 h-1 rounded-full bg-tertiary"></span>
            Adjust based on how you organize and tag your notes
          </li>
          <li className="flex items-center gap-2">
            <span className="w-1 h-1 rounded-full bg-tertiary"></span>
            Changes take effect immediately for new meeting preparations
          </li>
        </ul>
      </div>

      <div className="space-y-6 max-w-2xl">
        {weightConfigs.map(({ key, label, description }) => (
          <RelevanceWeightSlider
            key={key}
            label={label}
            description={description}
            value={weights[key]}
            onChange={(value) => handleWeightChange(key, value)}
          />
        ))}

        <div className="pt-4 flex items-center gap-3 border-t border-border">
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-6 py-2.5 bg-success hover:bg-success-dark disabled:opacity-50 text-white font-medium rounded-lg shadow-sm transition-colors">
            <Save className="w-4 h-4" />
            {isSaving ? 'Saving...' : 'Save Weights'}
          </button>
          <button 
            onClick={handleReset}
            className="flex items-center gap-2 px-6 py-2.5 bg-surface border border-border hover:bg-surface-hover text-primary font-medium rounded-lg shadow-sm transition-colors">
            <RotateCcw className="w-4 h-4" />
            Reset to Defaults
          </button>
          {saveMessage && (
            <span className={`text-sm ${saveMessage.includes('success') ? 'text-success-dark' : 'text-danger'}`}>
              {saveMessage}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
