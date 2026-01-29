export interface SummaryRequest {
  transcriptionId: string
  transcriptionText: string
  model?: string
}

export interface SummaryResult {
  id: string
  transcriptionId: string
  content: string
  generatedAt: Date
  model: string
  status: SummaryStatus
}

export enum SummaryStatus {
  IDLE = 'idle',
  GENERATING = 'generating',
  SUCCESS = 'success',
  ERROR = 'error'
}
