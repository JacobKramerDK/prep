export interface TranscriptionRequest {
  audioFilePath: string
  model?: string
  language?: string
}

export type TranscriptionModel = 'whisper-1' | 'gpt-4o-mini-transcribe' | 'gpt-4o-transcribe'

export const TRANSCRIPTION_MODELS: Record<TranscriptionModel, { name: string; description: string; billing: string }> = {
  'whisper-1': {
    name: 'Whisper-1',
    description: 'Original - Duration Billing',
    billing: 'duration'
  },
  'gpt-4o-mini-transcribe': {
    name: 'GPT-4o Mini Transcribe',
    description: 'Fast & Accurate - Token Billing',
    billing: 'token'
  },
  'gpt-4o-transcribe': {
    name: 'GPT-4o Transcribe',
    description: 'Highest Quality - Token Billing',
    billing: 'token'
  }
}

export interface TranscriptionResult {
  id: string
  text: string
  language?: string
  duration?: number
  createdAt: Date
  model: string
}

export interface TranscriptionStatus {
  isRecording: boolean
  recordingStartTime?: Date
  currentFilePath?: string
}

export interface SaveTranscriptRequest {
  transcriptContent: string
  meetingTitle: string
  transcriptionId: string
}

export interface SaveTranscriptResult {
  success: boolean
  filePath?: string
  error?: string
}

export interface AudioRecordingState {
  isRecording: boolean
  startTime?: Date
  filePath?: string
  error?: string
}

export interface ChunkProgress {
  current: number
  total: number
  status: 'processing' | 'completed' | 'error'
  estimatedTimeRemaining?: number
}

export interface ChunkedTranscriptionResult extends TranscriptionResult {
  chunks: number
  processingTime: number
}
