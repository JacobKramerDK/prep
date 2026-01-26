import React from 'react'
import { Users, Mic, X } from 'lucide-react'

interface RecordingTypeSelectorProps {
  onSelect: (recordFullMeeting: boolean) => void
  onCancel: () => void
}

export const RecordingTypeSelector: React.FC<RecordingTypeSelectorProps> = ({ onSelect, onCancel }) => {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-surface border border-border rounded-xl p-6 shadow-lg max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-primary">Choose Recording Type</h3>
          <button
            onClick={onCancel}
            className="p-1 hover:bg-surface-hover rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-secondary" />
          </button>
        </div>

        {/* Options */}
        <div className="space-y-3 mb-6">
          {/* Full Meeting Option */}
          <button
            onClick={() => onSelect(true)}
            className="w-full p-4 border border-border hover:border-brand-300 hover:bg-brand-50 dark:hover:bg-brand-900/20 rounded-lg transition-colors text-left group"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-brand-100 dark:bg-brand-900/30 border border-brand-200 dark:border-brand-800 flex items-center justify-center group-hover:bg-brand-200 dark:group-hover:bg-brand-800/50 transition-colors">
                <Users className="w-5 h-5 text-brand-600 dark:text-brand-400" />
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-primary mb-1">Full Meeting Audio</h4>
                <p className="text-sm text-secondary">
                  Records both your microphone and system audio (other participants' voices)
                </p>
              </div>
            </div>
          </button>

          {/* Microphone Only Option */}
          <button
            onClick={() => onSelect(false)}
            className="w-full p-4 border border-border hover:border-brand-300 hover:bg-brand-50 dark:hover:bg-brand-900/20 rounded-lg transition-colors text-left group"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-surface-hover border border-border flex items-center justify-center group-hover:bg-brand-100 dark:group-hover:bg-brand-900/30 transition-colors">
                <Mic className="w-5 h-5 text-secondary group-hover:text-brand-600 dark:group-hover:text-brand-400" />
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-primary mb-1">Microphone Only</h4>
                <p className="text-sm text-secondary">
                  Records only your microphone (your voice only)
                </p>
              </div>
            </div>
          </button>
        </div>

        {/* Footer */}
        <div className="text-center">
          <p className="text-xs text-secondary">
            Both options will start recording immediately
          </p>
        </div>
      </div>
    </div>
  )
}
