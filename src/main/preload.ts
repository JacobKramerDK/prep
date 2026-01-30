import { contextBridge, ipcRenderer } from 'electron'
import type { ElectronAPI } from '../shared/types/ipc'
import type { CalendarSelectionSettings } from '../shared/types/calendar-selection'
import type { BriefGenerationRequest } from '../shared/types/brief'
import type { SummaryRequest } from '../shared/types/summary'
import type { RelevanceWeights } from '../shared/types/relevance-weights'

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
const electronAPI: ElectronAPI = {
  getVersion: () => ipcRenderer.invoke('app:getVersion'),
  // Add vault methods
  selectVault: () => ipcRenderer.invoke('vault:select'),
  scanVault: (vaultPath: string) => ipcRenderer.invoke('vault:scan', vaultPath),
  refreshVault: () => ipcRenderer.invoke('vault:refresh'),
  disconnectVault: () => ipcRenderer.invoke('vault:disconnect'),
  searchFiles: (query: string) => ipcRenderer.invoke('vault:search', query),
  readFile: (filePath: string) => ipcRenderer.invoke('vault:readFile', filePath),
  // Add calendar methods with date handling
  extractCalendarEvents: async (selectedCalendarNames?: string[]) => {
    const result = await ipcRenderer.invoke('calendar:extractEvents', selectedCalendarNames)
    // Ensure dates are properly deserialized
    if (result && result.events) {
      result.events = result.events.map((event: any) => ({
        ...event,
        startDate: new Date(event.startDate),
        endDate: new Date(event.endDate)
      }))
      result.importedAt = new Date(result.importedAt)
    }
    return result
  },
  parseICSFile: async (filePath: string) => {
    const result = await ipcRenderer.invoke('calendar:parseICS', filePath)
    // Ensure dates are properly deserialized
    if (result && result.events) {
      result.events = result.events.map((event: any) => ({
        ...event,
        startDate: new Date(event.startDate),
        endDate: new Date(event.endDate)
      }))
      result.importedAt = new Date(result.importedAt)
    }
    return result
  },
  getCalendarEvents: async () => {
    const events = await ipcRenderer.invoke('calendar:getEvents')
    // Ensure dates are properly deserialized
    return events.map((event: any) => ({
      ...event,
      startDate: new Date(event.startDate),
      endDate: new Date(event.endDate)
    }))
  },
  clearCalendarEvents: () => ipcRenderer.invoke('calendar:clearEvents'),
  isAppleScriptSupported: () => ipcRenderer.invoke('calendar:isAppleScriptSupported'),
  getPlatformInfo: () => ipcRenderer.invoke('platform:getPlatformInfo'),
  selectICSFile: () => ipcRenderer.invoke('calendar:selectICSFile'),
  discoverCalendars: () => ipcRenderer.invoke('calendar:discoverCalendars'),
  getSelectedCalendars: () => ipcRenderer.invoke('calendar:getSelectedCalendars'),
  updateSelectedCalendars: (settings: Partial<CalendarSelectionSettings>) => 
    ipcRenderer.invoke('calendar:updateSelectedCalendars', settings),
  // Calendar sync scheduler methods
  getCalendarSyncStatus: () => ipcRenderer.invoke('calendar:getSyncStatus'),
  performManualCalendarSync: () => ipcRenderer.invoke('calendar:performManualSync'),
  startDailyCalendarSync: () => ipcRenderer.invoke('calendar:startDailySync'),
  stopDailyCalendarSync: () => ipcRenderer.invoke('calendar:stopDailySync'),
  // Add meeting methods with date handling
  getTodaysMeetings: async () => {
    const result = await ipcRenderer.invoke('meeting:getTodaysMeetings')
    // Ensure dates are properly deserialized
    if (result && result.meetings) {
      result.meetings = result.meetings.map((meeting: any) => ({
        ...meeting,
        startDate: new Date(meeting.startDate),
        endDate: new Date(meeting.endDate)
      }))
      result.detectedAt = new Date(result.detectedAt)
    }
    return result
  },
  hasTodaysMeetings: () => ipcRenderer.invoke('meeting:hasTodaysMeetings'),
  invalidateMeetingCache: () => ipcRenderer.invoke('meeting:invalidateCache'),
  
  // Calendar event listeners
  onCalendarEventsUpdated: (callback: (data: { source: string; eventCount: number; action?: string; accountEmail?: string }) => void) => {
    ipcRenderer.on('calendar:eventsUpdated', (_, data) => callback(data))
    return () => {
      ipcRenderer.removeAllListeners('calendar:eventsUpdated')
    }
  },
  
  // Add brief generation methods
  generateMeetingBrief: (request: BriefGenerationRequest) => ipcRenderer.invoke('brief:generate', request),
  getBriefGenerationStatus: (meetingId: string) => ipcRenderer.invoke('brief:getStatus', meetingId),
  // Add context retrieval methods
  findRelevantContext: async (meetingId: string) => {
    const result = await ipcRenderer.invoke('context:findRelevant', meetingId)
    // Ensure dates are properly deserialized
    if (result && result.matches) {
      result.matches = result.matches.map((match: any) => ({
        ...match,
        file: {
          ...match.file,
          created: new Date(match.file.created),
          modified: new Date(match.file.modified)
        },
        matchedAt: new Date(match.matchedAt)
      }))
      result.retrievedAt = new Date(result.retrievedAt)
    }
    return result
  },
  findRelevantContextEnhanced: async (meetingId: string, additionalContext?: {
    meetingPurpose?: string
    keyTopics?: string[]
    additionalNotes?: string
  }) => {
    const result = await ipcRenderer.invoke('context:findRelevantEnhanced', meetingId, additionalContext)
    // Ensure dates are properly deserialized
    if (result && result.matches) {
      result.matches = result.matches.map((match: any) => ({
        ...match,
        file: {
          ...match.file,
          created: new Date(match.file.created),
          modified: new Date(match.file.modified)
        },
        matchedAt: new Date(match.matchedAt)
      }))
      result.retrievedAt = new Date(result.retrievedAt)
    }
    return result
  },
  isContextIndexed: () => ipcRenderer.invoke('context:isIndexed'),
  getContextIndexedFileCount: () => ipcRenderer.invoke('context:getIndexedFileCount'),
  // Vault status methods
  getVaultPath: () => ipcRenderer.invoke('vault:getPath'),
  getVaultIndexingStatus: () => ipcRenderer.invoke('vault:getIndexingStatus'),
  onVaultIndexingProgress: (callback: (progress: any) => void) => {
    const handler = (_: any, data: any) => callback(data)
    ipcRenderer.on('vault:indexing-progress', handler)
    return () => ipcRenderer.removeListener('vault:indexing-progress', handler)
  },
  // Add settings methods
  getOpenAIApiKey: () => ipcRenderer.invoke('settings:getOpenAIApiKey'),
  setOpenAIApiKey: (apiKey: string | null) => ipcRenderer.invoke('settings:setOpenAIApiKey', apiKey),
  validateOpenAIApiKey: (apiKey: string) => ipcRenderer.invoke('settings:validateOpenAIApiKey', apiKey),
  getOpenAIModel: () => ipcRenderer.invoke('settings:getOpenAIModel'),
  setOpenAIModel: (model: string) => ipcRenderer.invoke('settings:setOpenAIModel', model),
  getAvailableModels: (apiKey: string) => ipcRenderer.invoke('settings:getAvailableModels', apiKey),
  
  // Relevance weights methods
  getRelevanceWeights: () => ipcRenderer.invoke('settings:getRelevanceWeights'),
  setRelevanceWeights: (weights: RelevanceWeights) => ipcRenderer.invoke('settings:setRelevanceWeights', weights),
  
  // Debug mode methods
  getDebugMode: () => ipcRenderer.invoke('settings:getDebugMode'),
  setDebugMode: (enabled: boolean) => ipcRenderer.invoke('settings:setDebugMode', enabled),
  getDebugLogPath: () => ipcRenderer.invoke('settings:getDebugLogPath'),
  openDebugLogFolder: () => ipcRenderer.invoke('settings:openDebugLogFolder'),
  // Google Calendar methods
  authenticateGoogleCalendar: () => ipcRenderer.invoke('calendar:authenticateGoogle'),
  getGoogleCalendarEvents: async () => {
    const result = await ipcRenderer.invoke('calendar:getGoogleEvents')
    // Ensure dates are properly deserialized
    if (result && result.events) {
      result.events = result.events.map((event: any) => ({
        ...event,
        startDate: new Date(event.startDate),
        endDate: new Date(event.endDate)
      }))
      result.importedAt = new Date(result.importedAt)
    }
    return result
  },
  isGoogleCalendarConnected: () => ipcRenderer.invoke('calendar:isGoogleConnected'),
  disconnectGoogleCalendar: () => ipcRenderer.invoke('calendar:disconnectGoogle'),
  getGoogleCalendarUserInfo: () => ipcRenderer.invoke('calendar:getGoogleUserInfo'),
  // Multi-account Google Calendar methods
  getConnectedGoogleAccounts: () => ipcRenderer.invoke('calendar:getConnectedGoogleAccounts'),
  disconnectGoogleAccount: (accountEmail: string) => ipcRenderer.invoke('calendar:disconnectGoogleAccount', accountEmail),
  getMultiAccountGoogleCalendarState: () => ipcRenderer.invoke('calendar:getMultiAccountGoogleCalendarState'),
  // Google credential management methods
  getGoogleClientId: () => ipcRenderer.invoke('settings:getGoogleClientId'),
  setGoogleClientId: (clientId: string | null) => ipcRenderer.invoke('settings:setGoogleClientId', clientId),
  getGoogleClientSecret: () => ipcRenderer.invoke('settings:getGoogleClientSecret'),
  setGoogleClientSecret: (clientSecret: string | null) => ipcRenderer.invoke('settings:setGoogleClientSecret', clientSecret),
  validateGoogleCredentials: (clientId: string, clientSecret: string) => 
    ipcRenderer.invoke('settings:validateGoogleCredentials', clientId, clientSecret),
  // Apple Calendar methods
  getAppleCalendarStatus: async () => {
    const result = await ipcRenderer.invoke('calendar:getAppleCalendarStatus')
    // Ensure dates are properly deserialized
    if (result && result.lastPermissionCheck) {
      result.lastPermissionCheck = new Date(result.lastPermissionCheck)
    }
    return result
  },
  getAppleCalendarPermissionState: () => ipcRenderer.invoke('calendar:getAppleCalendarPermissionState'),
  isAppleCalendarAvailable: () => ipcRenderer.invoke('calendar:isAppleCalendarAvailable'),
  updateAppleCalendarSelection: (selectedCalendarNames: string[]) => 
    ipcRenderer.invoke('calendar:updateAppleCalendarSelection', selectedCalendarNames),
  extractAppleCalendarEvents: async () => {
    const result = await ipcRenderer.invoke('calendar:extractAppleCalendarEvents')
    // Ensure dates are properly deserialized
    if (result && result.events) {
      result.events = result.events.map((event: any) => ({
        ...event,
        startDate: new Date(event.startDate),
        endDate: new Date(event.endDate)
      }))
      result.importedAt = new Date(result.importedAt)
    }
    return result
  },
  // Calendar sync methods
  startAutoSync: () => ipcRenderer.invoke('calendar:startAutoSync'),
  getAutoSyncStatus: async () => {
    const result = await ipcRenderer.invoke('calendar:getAutoSyncStatus')
    // Ensure dates are properly deserialized
    if (result) {
      return {
        ...result,
        lastSyncTime: result.lastSyncTime ? new Date(result.lastSyncTime) : null,
        nextSyncTime: result.nextSyncTime ? new Date(result.nextSyncTime) : null
      }
    }
    return result
  },
  performManualSync: async () => {
    const result = await ipcRenderer.invoke('calendar:performManualSync')
    // Ensure dates are properly deserialized
    if (result) {
      return {
        ...result,
        syncTime: new Date(result.syncTime)
      }
    }
    return result
  },
  // Prompt template management
  getPromptTemplate: () => ipcRenderer.invoke('get-prompt-template'),
  setPromptTemplate: (template: string) => ipcRenderer.invoke('set-prompt-template', template),
  clearPromptTemplate: () => ipcRenderer.invoke('clear-prompt-template'),
  generateTranscriptionSummary: (request: SummaryRequest, model?: string) => 
    ipcRenderer.invoke('transcription:generateSummary', request, model),
  getTranscriptionSummaryPrompt: () => 
    ipcRenderer.invoke('get-transcription-summary-prompt'),
  setTranscriptionSummaryPrompt: (template: string) => 
    ipcRenderer.invoke('set-transcription-summary-prompt', template),
  clearTranscriptionSummaryPrompt: () => 
    ipcRenderer.invoke('clear-transcription-summary-prompt'),
  // Obsidian brief saving operations
  selectObsidianBriefFolder: () => ipcRenderer.invoke('obsidian:selectBriefFolder'),
  getObsidianBriefFolder: () => ipcRenderer.invoke('obsidian:getBriefFolder'),
  setObsidianBriefFolder: (folderPath: string | null) => ipcRenderer.invoke('obsidian:setBriefFolder', folderPath),
  saveBriefToObsidian: (briefContent: string, meetingTitle: string, meetingId: string) => 
    ipcRenderer.invoke('obsidian:saveBrief', briefContent, meetingTitle, meetingId),
  // Add audio recording methods to renderer API
  // Transcription operations
  startRecording: () => ipcRenderer.invoke('transcription:startRecording'),
  startAudioRecording: () => ipcRenderer.invoke('transcription:startRecording'),
  stopAudioRecording: () => ipcRenderer.invoke('transcription:stopRecording'),
  sendAudioData: (audioData: ArrayBuffer) => ipcRenderer.invoke('transcription:sendAudioData', audioData),
  stopRecordingAndTranscribe: (model?: string) => ipcRenderer.invoke('transcription:stopAndTranscribe', model),
  getRecordingStatus: () => ipcRenderer.invoke('transcription:getStatus'),
  transcribeFile: (filePath: string, model?: string) => ipcRenderer.invoke('transcription:transcribeFile', filePath, model),
  // Transcription settings
  getTranscriptionModel: () => ipcRenderer.invoke('transcription:getModel'),
  setTranscriptionModel: (model: string) => ipcRenderer.invoke('transcription:setModel', model),
  getTranscriptFolder: () => ipcRenderer.invoke('transcription:getFolder'),
  setTranscriptFolder: (folderPath: string | null) => ipcRenderer.invoke('transcription:setFolder', folderPath),
  selectTranscriptFolder: () => ipcRenderer.invoke('transcription:selectFolder'),
  // Summary settings
  getSummaryModel: () => ipcRenderer.invoke('summary:getModel'),
  setSummaryModel: (model: string) => ipcRenderer.invoke('summary:setModel', model),
  getSummaryFolder: () => ipcRenderer.invoke('summary:getFolder'),
  setSummaryFolder: (folderPath: string | null) => ipcRenderer.invoke('summary:setFolder', folderPath),
  selectSummaryFolder: () => ipcRenderer.invoke('summary:selectFolder'),
  saveTranscriptToObsidian: (transcriptContent: string, meetingTitle: string, transcriptionId: string) => 
    ipcRenderer.invoke('transcription:saveToObsidian', transcriptContent, meetingTitle, transcriptionId),
  // Recording file cleanup settings
  getCleanupRecordingFiles: () => ipcRenderer.invoke('transcription:getCleanupRecordingFiles'),
  setCleanupRecordingFiles: (enabled: boolean) => ipcRenderer.invoke('transcription:setCleanupRecordingFiles', enabled),
  // Debug mode
  isDebugMode: () => ipcRenderer.invoke('debug:isEnabled'),
  // Dictation methods for voice input
  saveTempAudio: (buffer: Uint8Array, path: string) => ipcRenderer.invoke('transcription:save-temp-audio', { buffer, path }),
  transcribeAudio: (audioFilePath: string, model?: string) => ipcRenderer.invoke('transcription:transcribe-audio', { audioFilePath, model }),
  cleanupTempAudio: (tempPath: string) => ipcRenderer.invoke('transcription:cleanup-temp-audio', tempPath),
  // Event listeners
  onTranscriptionChunkProgress: (callback: (progress: any) => void) => {
    const listener = (_event: any, progress: any) => callback(progress)
    ipcRenderer.on('transcription:chunkProgress', listener)
    return () => ipcRenderer.removeListener('transcription:chunkProgress', listener)
  },
}

contextBridge.exposeInMainWorld('electronAPI', electronAPI)
