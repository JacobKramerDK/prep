import React, { useEffect, useCallback } from 'react'
import { Mic, Square, Loader2, AlertTriangle } from 'lucide-react'
import { useVoiceDictation } from '../hooks/useVoiceDictation'
import { debugLog } from '../utils/debug'

interface VoiceDictationButtonProps {
  onTranscript: (text: string) => void
  disabled?: boolean
}

export const VoiceDictationButton: React.FC<VoiceDictationButtonProps> = ({ 
  onTranscript, 
  disabled = false 
}) => {
  const { state, capabilities, startRecording, stopRecording, retry } = useVoiceDictation(onTranscript)

  // Debug component state changes
  useEffect(() => {
    debugLog('VOICE-DICTATION-BUTTON', 'Component state changed', {
      disabled,
      capabilities,
      state: {
        isRecording: state.isRecording,
        isProcessing: state.isProcessing,
        hasError: !!state.error,
        errorMessage: state.error,
        hasPermissions: state.hasPermissions,
        transcriptLength: state.transcript.length
      }
    })
  }, [disabled, capabilities, state])

  const handleClick = useCallback(() => {
    debugLog('VOICE-DICTATION-BUTTON', 'Button clicked', {
      currentState: {
        hasError: !!state.error,
        isRecording: state.isRecording,
        isProcessing: state.isProcessing
      },
      action: state.error ? 'retry' : state.isRecording ? 'stop' : 'start'
    })

    if (state.error) {
      debugLog('VOICE-DICTATION-BUTTON', 'Executing retry action')
      retry()
    } else if (state.isRecording) {
      debugLog('VOICE-DICTATION-BUTTON', 'Executing stop recording action')
      stopRecording()
    } else {
      debugLog('VOICE-DICTATION-BUTTON', 'Executing start recording action')
      startRecording()
    }
  }, [state.error, state.isRecording, state.isProcessing, retry, stopRecording, startRecording])

  // Keyboard shortcut for accessibility (Ctrl/Cmd + Shift + M)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'M') {
        event.preventDefault()
        debugLog('VOICE-DICTATION-BUTTON', 'Keyboard shortcut triggered', {
          disabled,
          isAvailable: capabilities.isAvailable,
          currentState: {
            isRecording: state.isRecording,
            hasError: !!state.error
          }
        })
        if (!disabled && capabilities.isAvailable) {
          handleClick()
        } else {
          debugLog('VOICE-DICTATION-BUTTON', 'Keyboard shortcut ignored - button disabled or not available')
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [disabled, capabilities.isAvailable, handleClick])

  if (!capabilities.isAvailable) {
    debugLog('VOICE-DICTATION-BUTTON', 'Button not rendered - capabilities not available', capabilities)
    return null
  }

  const getIcon = () => {
    if (state.isProcessing) {
      return <Loader2 className="w-4 h-4 animate-spin" />
    }
    if (state.error) {
      return <AlertTriangle className="w-4 h-4" />
    }
    if (state.isRecording) {
      return <Square className="w-4 h-4" />
    }
    return <Mic className="w-4 h-4" />
  }

  const getButtonClass = () => {
    const baseClass = "absolute right-2 top-2 p-2 rounded-lg transition-all duration-200 hover:bg-surface-hover focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-1"
    
    if (state.error) {
      return `${baseClass} text-danger hover:text-danger-dark`
    }
    if (state.isRecording) {
      return `${baseClass} text-red-500 animate-pulse bg-red-50 hover:bg-red-100`
    }
    if (state.isProcessing) {
      return `${baseClass} text-brand-600 bg-brand-50`
    }
    return `${baseClass} text-secondary hover:text-primary`
  }

  const getTitle = () => {
    if (state.error) return 'Retry dictation (Ctrl+Shift+M)'
    if (state.isRecording) return 'Stop recording (Ctrl+Shift+M)'
    if (state.isProcessing) return 'Processing...'
    return 'Start voice dictation (Ctrl+Shift+M)'
  }

  const getAriaLabel = () => {
    if (state.error) return 'Retry voice dictation'
    if (state.isRecording) return 'Stop voice recording'
    if (state.isProcessing) return 'Processing voice recording'
    return 'Start voice dictation'
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || state.isProcessing}
      className={getButtonClass()}
      title={getTitle()}
      aria-label={getAriaLabel()}
      role="button"
      tabIndex={0}
    >
      {getIcon()}
      {state.isPartialResult && (
        <div className="absolute -top-1 -right-1 w-2 h-2 bg-yellow-400 rounded-full" 
             title="Partial result - may be incomplete"
             aria-label="Partial transcription result" />
      )}
      <span className="sr-only">
        {state.isRecording ? 'Recording in progress' : 
         state.isProcessing ? 'Transcribing audio' :
         state.error ? `Error: ${state.error}` : 
         'Voice dictation available'}
      </span>
    </button>
  )
}
