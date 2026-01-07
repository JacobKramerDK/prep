import Store from 'electron-store'
import path from 'path'
import { randomBytes } from 'crypto'
import { app } from 'electron'
import * as os from 'os'
import * as fs from 'fs'
import { CalendarEvent } from '../../shared/types/calendar'
import { CalendarSelectionSettings } from '../../shared/types/calendar-selection'

interface SettingsSchema {
  vaultPath: string | null
  lastVaultScan: string | null
  searchHistory: string[]
  calendarEvents: CalendarEvent[]
  lastCalendarSync: string | null
  calendarSelection: CalendarSelectionSettings
  openaiApiKey: string | null
  openaiModel: string
  preferences: {
    autoScan: boolean
    maxSearchResults: number
  }
}

export class SettingsManager {
  private store: Store<SettingsSchema>

  constructor() {
    const isTest = process.env.NODE_ENV === 'test'
    const encryptionKey = isTest ? undefined : this.getOrCreateEncryptionKey()
    
    const defaults = {
      vaultPath: null,
      lastVaultScan: null,
      searchHistory: [],
      calendarEvents: [],
      lastCalendarSync: null,
      calendarSelection: {
        selectedCalendarUids: [],
        lastDiscovery: null,
        discoveryCache: [],
        autoSelectNew: true
      },
      openaiApiKey: null,
      openaiModel: 'gpt-4o-mini',
      preferences: {
        autoScan: true,
        maxSearchResults: 50
      }
    }

    const storeConfig: any = {
      name: isTest ? 'prep-settings-test' : 'prep-settings',
      defaults,
      ...(encryptionKey && { encryptionKey })
    }

    try {
      this.store = new Store<SettingsSchema>(storeConfig)
    } catch (error) {
      // Clear corrupted store and retry
      if (process.env.NODE_ENV === 'development') {
        console.warn('Settings store corrupted, clearing:', error)
      }
      try {
        const storePath = isTest 
          ? path.join(os.tmpdir(), 'prep-settings-test.json')
          : path.join(app.getPath('userData'), 'prep-settings.json')
        if (fs.existsSync(storePath)) {
          fs.unlinkSync(storePath)
        }
        this.store = new Store<SettingsSchema>(storeConfig)
      } catch (retryError) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Failed to create settings store:', retryError)
        }
        throw retryError
      }
    }
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

  async setVaultPath(vaultPath: string | null): Promise<void> {
    if (vaultPath === null) {
      this.store.delete('vaultPath')
    } else {
      this.store.set('vaultPath', vaultPath)
    }
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
    const updatedHistory = [query, ...history.filter((q: string) => q !== query)].slice(0, 10)
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

  async getCalendarEvents(): Promise<CalendarEvent[]> {
    return this.store.get('calendarEvents')
  }

  async setCalendarEvents(events: CalendarEvent[]): Promise<void> {
    this.store.set('calendarEvents', events)
    this.store.set('lastCalendarSync', new Date().toISOString())
  }

  async getLastCalendarSync(): Promise<Date | null> {
    const lastSync = this.store.get('lastCalendarSync')
    return lastSync ? new Date(lastSync) : null
  }

  async getCalendarSelection(): Promise<CalendarSelectionSettings> {
    return this.store.get('calendarSelection')
  }

  async updateCalendarSelection(settings: Partial<CalendarSelectionSettings>): Promise<void> {
    const current = this.store.get('calendarSelection')
    this.store.set('calendarSelection', { ...current, ...settings })
  }

  async getOpenAIApiKey(): Promise<string | null> {
    return this.store.get('openaiApiKey')
  }

  async setOpenAIApiKey(apiKey: string | null): Promise<void> {
    this.store.set('openaiApiKey', apiKey)
  }

  async getOpenAIModel(): Promise<string> {
    return this.store.get('openaiModel')
  }

  async setOpenAIModel(model: string): Promise<void> {
    // Validate model name format
    if (!this.isValidModelName(model)) {
      throw new Error(`Invalid model name: ${model}`)
    }
    this.store.set('openaiModel', model)
  }

  private isValidModelName(model: string): boolean {
    // Basic validation for known model patterns
    const validPatterns = [
      /^gpt-[34](\.\d+)?(-turbo)?(-\d{4}-\d{2}-\d{2})?$/,
      /^gpt-4o(-mini)?(-\d{4}-\d{2}-\d{2})?$/,
      /^o1-(preview|mini)$/,
      /^gpt-3\.5-turbo(-16k)?(-\d{4}-\d{2}-\d{2})?$/
    ]
    
    return validPatterns.some(pattern => pattern.test(model))
  }

  validateApiKeyFormat(apiKey: string): boolean {
    // OpenAI API keys start with 'sk-' and are typically 51 characters long
    return typeof apiKey === 'string' && 
           apiKey.startsWith('sk-') && 
           apiKey.length >= 20 && 
           apiKey.length <= 100
  }
}
