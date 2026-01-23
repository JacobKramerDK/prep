export interface TranscriptionRequest {
  audioFilePath: string
  model?: string
  language?: string
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
