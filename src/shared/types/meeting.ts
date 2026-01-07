import { CalendarEvent, CalendarEventIPC } from './calendar'
import { MeetingBrief } from './brief'

// Meeting-specific interface extending CalendarEvent
export interface Meeting extends CalendarEvent {
  // AI brief generation properties
  brief?: MeetingBrief
  briefGenerated?: boolean
  briefContent?: string
  contextNotes?: string[]
}

// IPC-safe version with string dates for serialization
export interface MeetingIPC extends CalendarEventIPC {
  brief?: MeetingBrief
  briefGenerated?: boolean
  briefContent?: string
  contextNotes?: string[]
}

// Meeting detection result
export interface TodaysMeetingsResult {
  meetings: Meeting[]
  totalMeetings: number
  detectedAt: Date
}

// IPC-safe version
export interface TodaysMeetingsResultIPC {
  meetings: MeetingIPC[]
  totalMeetings: number
  detectedAt: string // ISO string
}

// Utility functions for converting between Date and string versions
export function meetingToIPC(meeting: Meeting): MeetingIPC {
  return {
    ...meeting,
    startDate: meeting.startDate.toISOString(),
    endDate: meeting.endDate.toISOString()
  }
}

export function meetingFromIPC(meeting: MeetingIPC): Meeting {
  return {
    ...meeting,
    startDate: new Date(meeting.startDate),
    endDate: new Date(meeting.endDate)
  }
}

export function todaysMeetingsResultToIPC(result: TodaysMeetingsResult): TodaysMeetingsResultIPC {
  return {
    ...result,
    meetings: result.meetings.map(meetingToIPC),
    detectedAt: result.detectedAt.toISOString()
  }
}

export function todaysMeetingsResultFromIPC(result: TodaysMeetingsResultIPC): TodaysMeetingsResult {
  return {
    ...result,
    meetings: result.meetings.map(meetingFromIPC),
    detectedAt: new Date(result.detectedAt)
  }
}
