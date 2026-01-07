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
  // Add settings methods
  getOpenAIApiKey: () => ipcRenderer.invoke('settings:getOpenAIApiKey'),
  setOpenAIApiKey: (apiKey: string | null) => ipcRenderer.invoke('settings:setOpenAIApiKey', apiKey),
  validateOpenAIApiKey: (apiKey: string) => ipcRenderer.invoke('settings:validateOpenAIApiKey', apiKey),
  getOpenAIModel: () => ipcRenderer.invoke('settings:getOpenAIModel'),
  setOpenAIModel: (model: string) => ipcRenderer.invoke('settings:setOpenAIModel', model),
  getAvailableModels: (apiKey: string) => ipcRenderer.invoke('settings:getAvailableModels', apiKey)
}

contextBridge.exposeInMainWorld('electronAPI', electronAPI)
