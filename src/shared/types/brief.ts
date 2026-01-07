export interface BriefGenerationRequest {
  meetingId: string
  userContext: string
  additionalNotes?: string
  meetingPurpose?: string
  keyTopics?: string[]
  attendees?: string[]
}

export interface MeetingBrief {
  id: string
  meetingId: string
  content: string
  generatedAt: Date
  userContext: string
  status: BriefGenerationStatus
}

export enum BriefGenerationStatus {
  IDLE = 'idle',
  GENERATING = 'generating',
  SUCCESS = 'success',
  ERROR = 'error'
}

export interface BriefGenerationResult {
  success: boolean
  brief?: MeetingBrief
  error?: string
}
