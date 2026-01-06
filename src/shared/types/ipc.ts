import type { VaultIndex, SearchResult } from './vault'
import type { CalendarEvent, CalendarImportResult } from './calendar'

export interface ElectronAPI {
  getVersion: () => Promise<string>
  // Vault operations
  selectVault: () => Promise<string>
  scanVault: (vaultPath: string) => Promise<VaultIndex>
  searchFiles: (query: string) => Promise<SearchResult[]>
  readFile: (filePath: string) => Promise<string>
  // Calendar operations
  extractCalendarEvents: () => Promise<CalendarImportResult>
  parseICSFile: (filePath: string) => Promise<CalendarImportResult>
  getCalendarEvents: () => Promise<CalendarEvent[]>
  clearCalendarEvents: () => Promise<void>
  isAppleScriptSupported: () => Promise<boolean>
  selectICSFile: () => Promise<string>
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
