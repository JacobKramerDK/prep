import type { VaultIndex, SearchResult } from './vault'
import type { CalendarEvent, CalendarImportResult } from './calendar'
import type { CalendarDiscoveryResult, CalendarSelectionSettings } from './calendar-selection'
import type { CalendarSyncStatusIPC, CalendarSyncResultIPC } from './calendar-sync'
import type { TodaysMeetingsResult } from './meeting'
import type { BriefGenerationRequest, BriefGenerationResult, BriefGenerationStatus } from './brief'
import type { ContextRetrievalResultIPC, ContextRetrievalRequest } from './context'

export interface ElectronAPI {
  getVersion: () => Promise<string>
  // Vault operations
  selectVault: () => Promise<string>
  scanVault: (vaultPath: string) => Promise<VaultIndex>
  refreshVault: () => Promise<VaultIndex>
  disconnectVault: () => Promise<void>
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
  // Calendar sync scheduler operations
  getCalendarSyncStatus: () => Promise<CalendarSyncStatusIPC>
  performManualCalendarSync: () => Promise<CalendarSyncResultIPC>
  startDailyCalendarSync: () => Promise<void>
  stopDailyCalendarSync: () => Promise<void>
  // Meeting operations
  getTodaysMeetings: () => Promise<TodaysMeetingsResult>
  hasTodaysMeetings: () => Promise<boolean>
  invalidateMeetingCache: () => Promise<void>
  // Brief generation operations
  generateMeetingBrief: (request: BriefGenerationRequest) => Promise<BriefGenerationResult>
  getBriefGenerationStatus: (meetingId: string) => Promise<BriefGenerationStatus>
  // Context retrieval operations
  findRelevantContext: (meetingId: string) => Promise<ContextRetrievalResultIPC>
  findRelevantContextEnhanced: (meetingId: string, additionalContext?: {
    meetingPurpose?: string
    keyTopics?: string[]
    additionalNotes?: string
  }) => Promise<ContextRetrievalResultIPC>
  isContextIndexed: () => Promise<boolean>
  getContextIndexedFileCount: () => Promise<number>
  // Vault status operations
  getVaultPath: () => Promise<string | null>
  // Settings operations
  getOpenAIApiKey: () => Promise<string | null>
  setOpenAIApiKey: (apiKey: string | null) => Promise<void>
  validateOpenAIApiKey: (apiKey: string) => Promise<boolean>
  getOpenAIModel: () => Promise<string>
  setOpenAIModel: (model: string) => Promise<void>
  getAvailableModels: (apiKey: string) => Promise<string[]>
  
  // Debug mode
  getDebugMode: () => Promise<boolean>
  setDebugMode: (enabled: boolean) => Promise<void>
  // Google Calendar operations
  authenticateGoogleCalendar: () => Promise<string>
  getGoogleCalendarEvents: () => Promise<CalendarImportResult>
  isGoogleCalendarConnected: () => Promise<boolean>
  disconnectGoogleCalendar: () => Promise<void>
  getGoogleCalendarUserInfo: () => Promise<{ email: string; name?: string } | null>
  // Calendar sync operations
  startAutoSync: () => Promise<boolean>
  getAutoSyncStatus: () => Promise<import('./calendar-sync').CalendarSyncStatus>
  performManualSync: () => Promise<import('./calendar-sync').CalendarSyncResult>
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
