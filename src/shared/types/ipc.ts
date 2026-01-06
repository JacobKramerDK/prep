import type { VaultIndex, SearchResult } from './vault'

export interface ElectronAPI {
  getVersion: () => Promise<string>
  // Vault operations
  selectVault: () => Promise<string>
  scanVault: (vaultPath: string) => Promise<VaultIndex>
  searchFiles: (query: string) => Promise<SearchResult[]>
  readFile: (filePath: string) => Promise<string>
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
