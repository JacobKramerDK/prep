import Store from 'electron-store'
import path from 'path'
import { randomBytes } from 'crypto'
import { app } from 'electron'
import * as os from 'os'
import * as fs from 'fs'
import { CalendarEvent } from '../../shared/types/calendar'
import { CalendarSelectionSettings } from '../../shared/types/calendar-selection'
import { RelevanceWeights, DEFAULT_RELEVANCE_WEIGHTS } from '../../shared/types/relevance-weights'
import { ObsidianBriefSettings } from '../../shared/types/obsidian-settings'
import { GoogleAccount, LegacySingleAccountData } from '../../shared/types/multi-account-calendar'
import { Debug } from '../../shared/utils/debug'

// API key validation constants
const API_KEY_MIN_LENGTH = 20
const API_KEY_MAX_LENGTH = 200 // Accommodates both legacy (51 chars) and new project keys (up to ~200 chars)

interface SettingsSchema {
  vaultPath: string | null
  lastVaultScan: string | null
  searchHistory: string[]
  calendarEvents: CalendarEvent[]
  lastCalendarSync: string | null
  calendarSelection: CalendarSelectionSettings
  debugMode: boolean
  openaiApiKey: string | null
  openaiModel: string
  promptTemplate: string | null
  googleCalendarRefreshToken: string | null
  googleCalendarTokenExpiry: string | null
  googleCalendarUserEmail: string | null
  googleCalendarConnected: boolean
  googleAccounts: GoogleAccount[]  // New multi-account storage
  multiAccountMigrationCompleted: boolean // Migration tracking
  relevanceWeights: RelevanceWeights
  preferences: {
    autoScan: boolean
    maxSearchResults: number
  }
  obsidianBriefFolder: string | null
  transcriptionModel: string
  transcriptFolder: string | null
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
      promptTemplate: null,
      googleCalendarRefreshToken: null,
      googleCalendarTokenExpiry: null,
      googleCalendarUserEmail: null,
      googleCalendarConnected: false,
      googleAccounts: [],  // New multi-account storage
      multiAccountMigrationCompleted: false, // Migration tracking
      debugMode: false,
      relevanceWeights: DEFAULT_RELEVANCE_WEIGHTS,
      preferences: {
        autoScan: true,
        maxSearchResults: 50
      },
      obsidianBriefFolder: null,
      transcriptionModel: 'whisper-1',
      transcriptFolder: null
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

    // Initialize debug mode
    const debugMode = this.store.get('debugMode', false)
    Debug.setDebugMode(debugMode)
  }

  async initialize(): Promise<void> {
    // Migrate from single-account to multi-account storage
    await this.migrateToMultiAccount()
  }

  private async migrateToMultiAccount(): Promise<void> {
    try {
      // Check if migration is needed
      const existingAccounts = this.store.get('googleAccounts', [])
      const migrationCompleted = this.store.get('multiAccountMigrationCompleted', false)
      
      if (migrationCompleted || existingAccounts.length > 0) {
        return // Already migrated
      }

      // Check for legacy single-account data
      const legacyData: LegacySingleAccountData = {
        refreshToken: this.store.get('googleCalendarRefreshToken') || undefined,
        tokenExpiry: this.store.get('googleCalendarTokenExpiry') || undefined,
        userEmail: this.store.get('googleCalendarUserEmail') || undefined,
        connected: this.store.get('googleCalendarConnected') || false
      }

      if (legacyData.refreshToken && legacyData.userEmail && legacyData.connected) {
        // Migrate single account to multi-account format
        const migratedAccount: GoogleAccount = {
          email: legacyData.userEmail,
          refreshToken: legacyData.refreshToken,
          tokenExpiry: legacyData.tokenExpiry || undefined,
          connectedAt: new Date().toISOString() // Use current date as connected date
        }

        // Atomic migration: set both accounts and migration flag
        await this.setGoogleAccounts([migratedAccount])
        this.store.set('multiAccountMigrationCompleted', true)
        
        Debug.log(`[SETTINGS] Migrated single account to multi-account: ${legacyData.userEmail}`)
      } else {
        // No legacy data to migrate, mark as completed
        this.store.set('multiAccountMigrationCompleted', true)
      }
    } catch (error) {
      Debug.error('[SETTINGS] Failed to migrate to multi-account:', error)
      // Don't mark as completed on failure, allow retry on next startup
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
    Debug.log(`[SETTINGS-MANAGER] Storing ${events.length} calendar events`)
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
    // Consolidated OpenAI model validation patterns
    const validPatterns = [
      // GPT models with flexible variant combinations
      /^gpt-([3-9](\.\d+)?|4o)(-turbo(-16k)?|-mini|-nano|-pro|-search-preview|-transcribe|-diarize)?(-\d{4}(-\d{2}-\d{2})?|-preview)?$/,
      // O1 models: o1, o1-preview, o1-mini, o1-pro with optional dates
      /^o1(-preview|-mini|-pro)?(-\d{4}-\d{2}-\d{2})?$/,
      // Special latest models
      /^(chatgpt-4o-latest|gpt-[45](\.\d+)?-(chat-)?latest)$/
    ]
    
    return validPatterns.some(pattern => pattern.test(model))
  }

  validateApiKeyFormat(apiKey: string): boolean {
    // OpenAI API keys start with 'sk-' and can be various lengths
    // Old format: ~51 characters
    // New project format: ~164 characters
    return typeof apiKey === 'string' && 
           apiKey.startsWith('sk-') && 
           apiKey.length >= API_KEY_MIN_LENGTH && 
           apiKey.length <= API_KEY_MAX_LENGTH
  }

  async getRelevanceWeights(): Promise<RelevanceWeights> {
    return this.store.get('relevanceWeights')
  }

  async setRelevanceWeights(weights: RelevanceWeights): Promise<void> {
    this.store.set('relevanceWeights', weights)
  }

  // Google Calendar settings methods
  async getGoogleCalendarRefreshToken(): Promise<string | null> {
    return this.store.get('googleCalendarRefreshToken')
  }

  async setGoogleCalendarRefreshToken(token: string | null): Promise<void> {
    this.store.set('googleCalendarRefreshToken', token)
  }

  async getGoogleCalendarTokenExpiry(): Promise<string | null> {
    return this.store.get('googleCalendarTokenExpiry')
  }

  async setGoogleCalendarTokenExpiry(expiry: string | null): Promise<void> {
    this.store.set('googleCalendarTokenExpiry', expiry)
  }

  async getGoogleCalendarUserEmail(): Promise<string | null> {
    return this.store.get('googleCalendarUserEmail')
  }

  async setGoogleCalendarUserEmail(email: string | null): Promise<void> {
    this.store.set('googleCalendarUserEmail', email)
  }

  async getGoogleCalendarConnected(): Promise<boolean> {
    return this.store.get('googleCalendarConnected')
  }

  async setGoogleCalendarConnected(connected: boolean): Promise<void> {
    this.store.set('googleCalendarConnected', connected)
  }

  async clearGoogleCalendarSettings(): Promise<void> {
    this.store.set('googleCalendarRefreshToken', null)
    this.store.set('googleCalendarTokenExpiry', null)
    this.store.set('googleCalendarUserEmail', null)
    this.store.set('googleCalendarConnected', false)
  }

  // Google OAuth2 credential storage methods
  async getGoogleClientId(): Promise<string | null> {
    return this.store.get('googleClientId')
  }

  async setGoogleClientId(clientId: string | null): Promise<void> {
    this.store.set('googleClientId', clientId)
  }

  async getGoogleClientSecret(): Promise<string | null> {
    return this.store.get('googleClientSecret')
  }

  async setGoogleClientSecret(clientSecret: string | null): Promise<void> {
    this.store.set('googleClientSecret', clientSecret)
  }

  validateGoogleClientIdFormat(clientId: string): boolean {
    // Google Client IDs end with .apps.googleusercontent.com
    return typeof clientId === 'string' && 
           clientId.length > 20 && 
           clientId.endsWith('.apps.googleusercontent.com')
  }

  validateGoogleClientSecretFormat(clientSecret: string): boolean {
    // Google Client Secrets are typically 24 characters, alphanumeric with hyphens/underscores
    return typeof clientSecret === 'string' && 
           clientSecret.length >= 20 && 
           /^[A-Za-z0-9_-]+$/.test(clientSecret)
  }

  // Debug mode methods
  getDebugMode(): boolean {
    return this.store.get('debugMode', false)
  }

  setDebugMode(enabled: boolean): void {
    this.store.set('debugMode', enabled)
    if (enabled) {
      try {
        const logPath = this.getDebugLogPath()
        Debug.setDebugMode(enabled, logPath)
      } catch (error) {
        console.error('Failed to initialize debug logging:', error)
        // Reset debug mode in store if initialization fails
        this.store.set('debugMode', false)
        throw error
      }
    } else {
      Debug.setDebugMode(enabled)
    }
  }

  getDebugLogPath(): string {
    const userDataPath = app.getPath('userData')
    return path.join(userDataPath, 'debug.log')
  }

  // Prompt template methods
  getPromptTemplate(): string | null {
    return this.store.get('promptTemplate', null)
  }

  setPromptTemplate(template: string): void {
    this.store.set('promptTemplate', template)
  }

  clearPromptTemplate(): void {
    this.store.delete('promptTemplate')
  }

  // Obsidian brief folder methods
  getObsidianBriefFolder(): string | null {
    return this.store.get('obsidianBriefFolder', null)
  }

  setObsidianBriefFolder(folderPath: string | null): void {
    this.store.set('obsidianBriefFolder', folderPath)
  }

  // Transcription settings methods
  getTranscriptionModel(): string {
    const model = this.store.get('transcriptionModel', 'whisper-1')
    // Validate model is supported
    const validModels = ['whisper-1', 'gpt-4o-mini-transcribe', 'gpt-4o-transcribe']
    const finalModel = validModels.includes(model) ? model : 'whisper-1'
    
    if (this.getDebugMode()) {
      Debug.log(`Using transcription model: ${finalModel}`)
    }
    
    return finalModel
  }

  setTranscriptionModel(model: string): void {
    // Validate model before setting
    const validModels = ['whisper-1', 'gpt-4o-mini-transcribe', 'gpt-4o-transcribe']
    if (validModels.includes(model)) {
      this.store.set('transcriptionModel', model)
    } else {
      throw new Error(`Invalid transcription model: ${model}`)
    }
  }

  getTranscriptFolder(): string | null {
    return this.store.get('transcriptFolder', null)
  }

  setTranscriptFolder(folderPath: string | null): void {
    this.store.set('transcriptFolder', folderPath)
  }

  // Recording file cleanup settings
  getCleanupRecordingFiles(): boolean {
    return this.store.get('cleanupRecordingFiles', true) // Default: true for privacy
  }

  setCleanupRecordingFiles(enabled: boolean): void {
    this.store.set('cleanupRecordingFiles', enabled)
  }

  // Multi-account Google Calendar methods
  async getGoogleAccounts(): Promise<GoogleAccount[]> {
    return this.store.get('googleAccounts', [])
  }

  async setGoogleAccounts(accounts: GoogleAccount[]): Promise<void> {
    this.store.set('googleAccounts', accounts)
  }

  async addGoogleAccount(account: GoogleAccount): Promise<void> {
    const accounts = await this.getGoogleAccounts()
    const updatedAccounts = [...accounts, account]
    await this.setGoogleAccounts(updatedAccounts)
  }

  async removeGoogleAccount(accountEmail: string): Promise<void> {
    const accounts = await this.getGoogleAccounts()
    const updatedAccounts = accounts.filter(account => account.email !== accountEmail)
    await this.setGoogleAccounts(updatedAccounts)
  }
}
