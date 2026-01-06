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
  // Add calendar methods
  extractCalendarEvents: () => ipcRenderer.invoke('calendar:extractEvents'),
  parseICSFile: (filePath: string) => ipcRenderer.invoke('calendar:parseICS', filePath),
  getCalendarEvents: () => ipcRenderer.invoke('calendar:getEvents'),
  clearCalendarEvents: () => ipcRenderer.invoke('calendar:clearEvents'),
  isAppleScriptSupported: () => ipcRenderer.invoke('calendar:isAppleScriptSupported'),
  selectICSFile: () => ipcRenderer.invoke('calendar:selectICSFile')
}

contextBridge.exposeInMainWorld('electronAPI', electronAPI)
