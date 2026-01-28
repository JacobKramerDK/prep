import type { VaultIndex, SearchResult } from './vault'
import type { CalendarEvent, CalendarImportResult } from './calendar'
import type { CalendarDiscoveryResult, CalendarSelectionSettings } from './calendar-selection'
import type { CalendarSyncStatusIPC, CalendarSyncResultIPC } from './calendar-sync'
import type { AppleCalendarStatusIPC, AppleCalendarPermissionState } from './apple-calendar'
import type { TodaysMeetingsResult } from './meeting'
import type { BriefGenerationRequest, BriefGenerationResult, BriefGenerationStatus } from './brief'
import type { ContextRetrievalResultIPC, ContextRetrievalRequest } from './context'
import type { RelevanceWeights } from './relevance-weights'
import type { PlatformInfo } from './platform'
import type { ObsidianBriefSettings } from './obsidian-settings'
import type { VaultIndexingStatus, VaultIndexingProgress } from './vault-status'

export interface ElectronAPI {
  getVersion: () => Promise<string>
  // Platform detection
  getPlatformInfo: () => Promise<PlatformInfo>
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
  
  // Calendar event listeners
  onCalendarEventsUpdated: (callback: (data: { 
    source: string; 
    eventCount: number; 
    action?: string; 
    accountEmail?: string 
  }) => void) => void
  
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
  getVaultIndexingStatus: () => Promise<VaultIndexingStatus>
  onVaultIndexingProgress: (callback: (progress: VaultIndexingProgress) => void) => () => void
  // Settings operations
  getOpenAIApiKey: () => Promise<string | null>
  setOpenAIApiKey: (apiKey: string | null) => Promise<void>
  validateOpenAIApiKey: (apiKey: string) => Promise<boolean>
  getOpenAIModel: () => Promise<string>
  setOpenAIModel: (model: string) => Promise<void>
  getAvailableModels: (apiKey: string) => Promise<string[]>
  
  // Relevance weights operations
  getRelevanceWeights: () => Promise<RelevanceWeights>
  setRelevanceWeights: (weights: RelevanceWeights) => Promise<void>
  
  // Debug mode
  getDebugMode: () => Promise<boolean>
  setDebugMode: (enabled: boolean) => Promise<void>
  getDebugLogPath: () => Promise<string>
  openDebugLogFolder: () => Promise<void>
  // Multi-Account Google Calendar operations
  authenticateGoogleCalendar: () => Promise<string>
  getGoogleCalendarEvents: () => Promise<CalendarImportResult>
  getConnectedGoogleAccounts: () => Promise<import('./multi-account-calendar').GoogleAccount[]>
  disconnectGoogleAccount: (accountEmail: string) => Promise<import('./multi-account-calendar').AccountDisconnectionResult>
  getMultiAccountGoogleCalendarState: () => Promise<import('./multi-account-calendar').MultiAccountGoogleCalendarState>
  // Legacy compatibility methods
  isGoogleCalendarConnected: () => Promise<boolean>
  disconnectGoogleCalendar: () => Promise<void>
  getGoogleCalendarUserInfo: () => Promise<{ email: string; name?: string } | null>
  // Google credential management
  getGoogleClientId: () => Promise<string | null>
  setGoogleClientId: (clientId: string | null) => Promise<void>
  getGoogleClientSecret: () => Promise<string | null>
  setGoogleClientSecret: (clientSecret: string | null) => Promise<void>
  validateGoogleCredentials: (clientId: string, clientSecret: string) => Promise<boolean>
  // Apple Calendar operations
  getAppleCalendarStatus: () => Promise<AppleCalendarStatusIPC>
  getAppleCalendarPermissionState: () => Promise<AppleCalendarPermissionState>
  isAppleCalendarAvailable: () => Promise<boolean>
  updateAppleCalendarSelection: (selectedCalendarNames: string[]) => Promise<void>
  extractAppleCalendarEvents: () => Promise<CalendarImportResult>
  // Calendar sync operations
  startAutoSync: () => Promise<boolean>
  getAutoSyncStatus: () => Promise<import('./calendar-sync').CalendarSyncStatus>
  performManualSync: () => Promise<import('./calendar-sync').CalendarSyncResult>
  // Prompt template management
  getPromptTemplate(): Promise<string | null>
  setPromptTemplate(template: string): Promise<{ success: boolean }>
  clearPromptTemplate(): Promise<{ success: boolean }>
  // Obsidian brief saving operations
  selectObsidianBriefFolder: () => Promise<string | null>
  getObsidianBriefFolder: () => Promise<string | null>
  setObsidianBriefFolder: (folderPath: string | null) => Promise<void>
  saveBriefToObsidian: (briefContent: string, meetingTitle: string, meetingId: string) => Promise<{ success: boolean; filePath?: string; error?: string }>
  // Transcription operations
  startRecording: () => Promise<void>
  startAudioRecording: () => Promise<void>
  stopAudioRecording: () => Promise<void>
  sendAudioData: (audioData: ArrayBuffer) => Promise<void>
  stopRecordingAndTranscribe: (model?: string) => Promise<import('./transcription').TranscriptionResult>
  getRecordingStatus: () => Promise<import('./transcription').TranscriptionStatus>
  transcribeFile: (filePath: string, model?: string) => Promise<import('./transcription').TranscriptionResult>
  // Transcription settings
  getTranscriptionModel: () => Promise<string>
  setTranscriptionModel: (model: string) => Promise<void>
  getTranscriptFolder: () => Promise<string | null>
  setTranscriptFolder: (folderPath: string | null) => Promise<void>
  selectTranscriptFolder: () => Promise<string | null>
  saveTranscriptToObsidian: (transcriptContent: string, meetingTitle: string, transcriptionId: string) => Promise<import('./transcription').SaveTranscriptResult>
  // Recording file cleanup settings
  getCleanupRecordingFiles: () => Promise<boolean>
  setCleanupRecordingFiles: (enabled: boolean) => Promise<void>
  // Debug mode
  isDebugMode: () => Promise<boolean>
  // Dictation methods for voice input
  saveTempAudio: (buffer: Uint8Array, path: string) => Promise<string>
  transcribeAudio: (audioFilePath: string, model?: string) => Promise<import('./transcription').TranscriptionResult>
  cleanupTempAudio: (tempPath: string) => Promise<void>
  // Event listeners
  onTranscriptionChunkProgress: (callback: (progress: import('./transcription').ChunkProgress) => void) => () => void
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
