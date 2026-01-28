export interface DictationState {
  isRecording: boolean
  isProcessing: boolean
  error: string | null
  transcript: string
  isPartialResult: boolean
  hasPermissions: boolean
}

export interface DictationCapabilities {
  hasOpenAIConfig: boolean
  hasMicrophonePermission: boolean
  isAvailable: boolean
}

export type DictationMethod = 'existing-transcription-service'
