import { contextBridge, ipcRenderer } from 'electron'
import type { ElectronAPI } from '../shared/types/ipc'

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
const electronAPI: ElectronAPI = {
  getVersion: () => ipcRenderer.invoke('app:getVersion')
}

contextBridge.exposeInMainWorld('electronAPI', electronAPI)
