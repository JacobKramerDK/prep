import type { VaultIndex, SearchResult } from './vault'
import type { CalendarEvent, CalendarImportResult } from './calendar'
import type { CalendarDiscoveryResult, CalendarSelectionSettings } from './calendar-selection'
import type { TodaysMeetingsResult } from './meeting'
import type { BriefGenerationRequest, BriefGenerationResult, BriefGenerationStatus } from './brief'

export interface ElectronAPI {
  getVersion: () => Promise<string>
  // Vault operations
  selectVault: () => Promise<string>
  scanVault: (vaultPath: string) => Promise<VaultIndex>
  searchFiles: (query: string) => Promise<SearchResult[]>
  readFile: (filePath: string) => Promise<string>
  // Calendar operations
  extractCalendarEvents: (selectedCalendarNames?: string[]) => Promise<CalendarImportResult>
  parseICSFile: (filePath: string) => Promise<CalendarImportResult>
  getCalendarEvents: () => Promise<CalendarEvent[]>
  clearCalendarEvents: () => Promise<void>
  isAppleScriptSupported: () => Promise<boolean>
  selectICSFile: () => Promise<string>
  discoverCalendars: () => Promise<CalendarDiscoveryResult>
  getSelectedCalendars: () => Promise<CalendarSelectionSettings>
  updateSelectedCalendars: (settings: Partial<CalendarSelectionSettings>) => Promise<void>
  // Meeting operations
  getTodaysMeetings: () => Promise<TodaysMeetingsResult>
  hasTodaysMeetings: () => Promise<boolean>
  invalidateMeetingCache: () => Promise<void>
  // Brief generation operations
  generateMeetingBrief: (request: BriefGenerationRequest) => Promise<BriefGenerationResult>
  getBriefGenerationStatus: (meetingId: string) => Promise<BriefGenerationStatus>
  // Settings operations
  getOpenAIApiKey: () => Promise<string | null>
  setOpenAIApiKey: (apiKey: string | null) => Promise<void>
  validateOpenAIApiKey: (apiKey: string) => Promise<boolean>
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
