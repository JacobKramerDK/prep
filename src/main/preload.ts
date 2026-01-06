import { contextBridge, ipcRenderer } from 'electron'
import type { ElectronAPI } from '../shared/types/ipc'

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
  extractCalendarEvents: async () => {
    const result = await ipcRenderer.invoke('calendar:extractEvents')
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
  selectICSFile: () => ipcRenderer.invoke('calendar:selectICSFile')
}

contextBridge.exposeInMainWorld('electronAPI', electronAPI)
