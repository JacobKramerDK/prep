import Store from 'electron-store'
import path from 'path'
import { randomBytes } from 'crypto'
import { app } from 'electron'
import * as os from 'os'
import * as fs from 'fs'

interface SettingsSchema {
  vaultPath: string | null
  lastVaultScan: string | null
  searchHistory: string[]
  preferences: {
    autoScan: boolean
    maxSearchResults: number
  }
}

export class SettingsManager {
  private store: Store<SettingsSchema>

  constructor() {
    // Generate or retrieve a unique encryption key per installation
    const encryptionKey = this.getOrCreateEncryptionKey()
    
    this.store = new Store<SettingsSchema>({
      name: 'prep-settings',
      defaults: {
        vaultPath: null,
        lastVaultScan: null,
        searchHistory: [],
        preferences: {
          autoScan: true,
          maxSearchResults: 50
        }
      },
      encryptionKey
    })
  }

  private getOrCreateEncryptionKey(): string {
    // Handle test environment where Electron app is not available
    if (process.env.NODE_ENV === 'test') {
      return randomBytes(32).toString('hex')
    }

    // Store encryption key in a simple file in user data directory
    try {
      const userDataPath = app?.getPath('userData') || os.homedir()
      const keyFilePath = path.join(userDataPath, '.prep-encryption-key')
      
      // Try to read existing key
      if (fs.existsSync(keyFilePath)) {
        const key = fs.readFileSync(keyFilePath, 'utf8').trim()
        if (key && key.length === 64) { // Valid hex key
          return key
        }
      }
      
      // Generate new key
      const key = randomBytes(32).toString('hex')
      
      // Ensure directory exists
      fs.mkdirSync(path.dirname(keyFilePath), { recursive: true })
      // Write key to file with restricted permissions
      fs.writeFileSync(keyFilePath, key, { mode: 0o600 })
      
      return key
    } catch (error) {
      // Fallback to session-only key (no console.warn in production)
      return randomBytes(32).toString('hex')
    }
  }

  async getVaultPath(): Promise<string | null> {
    return this.store.get('vaultPath')
  }

  async setVaultPath(vaultPath: string): Promise<void> {
    this.store.set('vaultPath', vaultPath)
  }

  async getLastVaultScan(): Promise<Date | null> {
    const lastScan = this.store.get('lastVaultScan')
    return lastScan ? new Date(lastScan) : null
  }

  async setLastVaultScan(date: Date): Promise<void> {
    this.store.set('lastVaultScan', date.toISOString())
  }

  async addSearchQuery(query: string): Promise<void> {
    const history = this.store.get('searchHistory')
    const updatedHistory = [query, ...history.filter(q => q !== query)].slice(0, 10)
    this.store.set('searchHistory', updatedHistory)
  }

  async getSearchHistory(): Promise<string[]> {
    return this.store.get('searchHistory')
  }

  async getPreferences(): Promise<SettingsSchema['preferences']> {
    return this.store.get('preferences')
  }

  async updatePreferences(preferences: Partial<SettingsSchema['preferences']>): Promise<void> {
    const current = this.store.get('preferences')
    this.store.set('preferences', { ...current, ...preferences })
  }
}
