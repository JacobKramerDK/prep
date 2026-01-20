import { contextBridge, ipcRenderer } from 'electron'
import type { ElectronAPI } from '../shared/types/ipc'
import type { CalendarSelectionSettings } from '../shared/types/calendar-selection'
import type { BriefGenerationRequest } from '../shared/types/brief'

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
  // Add settings methods
  getOpenAIApiKey: () => ipcRenderer.invoke('settings:getOpenAIApiKey'),
  setOpenAIApiKey: (apiKey: string | null) => ipcRenderer.invoke('settings:setOpenAIApiKey', apiKey),
  validateOpenAIApiKey: (apiKey: string) => ipcRenderer.invoke('settings:validateOpenAIApiKey', apiKey),
  getOpenAIModel: () => ipcRenderer.invoke('settings:getOpenAIModel'),
  setOpenAIModel: (model: string) => ipcRenderer.invoke('settings:setOpenAIModel', model),
  getAvailableModels: (apiKey: string) => ipcRenderer.invoke('settings:getAvailableModels', apiKey),
  
  // Debug mode methods
  getDebugMode: () => ipcRenderer.invoke('settings:getDebugMode'),
  setDebugMode: (enabled: boolean) => ipcRenderer.invoke('settings:setDebugMode', enabled),
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
}

contextBridge.exposeInMainWorld('electronAPI', electronAPI)
