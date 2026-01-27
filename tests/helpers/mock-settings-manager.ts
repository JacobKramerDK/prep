import { CalendarEvent } from '../../src/shared/types/calendar'
import { CalendarSelectionSettings } from '../../src/shared/types/calendar-selection'
import { RelevanceWeights, DEFAULT_RELEVANCE_WEIGHTS } from '../../src/shared/types/relevance-weights'

interface MockSettingsSchema {
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
  googleClientId?: string | null
  googleClientSecret?: string | null
  relevanceWeights: RelevanceWeights
  preferences: {
    autoScan: boolean
    maxSearchResults: number
  }
  transcriptionModel: string
  transcriptFolder: string | null
}

export class MockSettingsManager {
  private data: MockSettingsSchema
  private testId: string

  constructor(testId: string = 'test') {
    this.testId = testId
    this.data = {
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
      debugMode: false,
      relevanceWeights: DEFAULT_RELEVANCE_WEIGHTS,
      preferences: {
        autoScan: true,
        maxSearchResults: 50
      },
      transcriptionModel: 'whisper-1',
      transcriptFolder: null
    }
  }

  // Vault methods
  async getVaultPath(): Promise<string | null> {
    return this.data.vaultPath
  }

  async setVaultPath(vaultPath: string | null): Promise<void> {
    this.data.vaultPath = vaultPath
  }

  async getLastVaultScan(): Promise<string | null> {
    return this.data.lastVaultScan
  }

  async setLastVaultScan(timestamp: string): Promise<void> {
    this.data.lastVaultScan = timestamp
  }

  // Search methods
  async getSearchHistory(): Promise<string[]> {
    return [...this.data.searchHistory]
  }

  async addToSearchHistory(query: string): Promise<void> {
    this.data.searchHistory = [query, ...this.data.searchHistory.filter(q => q !== query)].slice(0, 10)
  }

  async clearSearchHistory(): Promise<void> {
    this.data.searchHistory = []
  }

  // Calendar methods
  async getCalendarEvents(): Promise<CalendarEvent[]> {
    return [...this.data.calendarEvents]
  }

  async setCalendarEvents(events: CalendarEvent[]): Promise<void> {
    this.data.calendarEvents = [...events]
  }

  async getLastCalendarSync(): Promise<string | null> {
    return this.data.lastCalendarSync
  }

  async setLastCalendarSync(timestamp: string): Promise<void> {
    this.data.lastCalendarSync = timestamp
  }

  // OpenAI methods
  async getOpenAIApiKey(): Promise<string | null> {
    return this.data.openaiApiKey
  }

  async setOpenAIApiKey(apiKey: string | null): Promise<void> {
    this.data.openaiApiKey = apiKey
  }

  async getOpenAIModel(): Promise<string> {
    return this.data.openaiModel
  }

  async setOpenAIModel(model: string): Promise<void> {
    this.data.openaiModel = model
  }

  // Debug methods
  async getDebugMode(): Promise<boolean> {
    return this.data.debugMode
  }

  async setDebugMode(enabled: boolean): Promise<void> {
    this.data.debugMode = enabled
  }

  // Relevance weights methods
  async getRelevanceWeights(): Promise<RelevanceWeights> {
    return { ...this.data.relevanceWeights }
  }

  async setRelevanceWeights(weights: RelevanceWeights): Promise<void> {
    this.data.relevanceWeights = { ...weights }
  }

  // Calendar selection methods
  async getCalendarSelection(): Promise<CalendarSelectionSettings> {
    return { ...this.data.calendarSelection }
  }

  async setCalendarSelection(selection: CalendarSelectionSettings): Promise<void> {
    this.data.calendarSelection = { ...selection }
  }

  // Google Calendar methods
  async getGoogleCalendarRefreshToken(): Promise<string | null> {
    return this.data.googleCalendarRefreshToken
  }

  async setGoogleCalendarRefreshToken(token: string | null): Promise<void> {
    this.data.googleCalendarRefreshToken = token
  }

  async getGoogleCalendarConnected(): Promise<boolean> {
    return this.data.googleCalendarConnected
  }

  async setGoogleCalendarConnected(connected: boolean): Promise<void> {
    this.data.googleCalendarConnected = connected
  }

  // Google credential management mock methods
  async getGoogleClientId(): Promise<string | null> {
    return this.data.googleClientId || null
  }

  async setGoogleClientId(clientId: string | null): Promise<void> {
    this.data.googleClientId = clientId
  }

  async getGoogleClientSecret(): Promise<string | null> {
    return this.data.googleClientSecret || null
  }

  async setGoogleClientSecret(clientSecret: string | null): Promise<void> {
    this.data.googleClientSecret = clientSecret
  }

  validateGoogleClientIdFormat(clientId: string): boolean {
    return typeof clientId === 'string' && 
           clientId.length > 20 && 
           clientId.endsWith('.apps.googleusercontent.com')
  }

  validateGoogleClientSecretFormat(clientSecret: string): boolean {
    return typeof clientSecret === 'string' && 
           clientSecret.length >= 20 && 
           /^[A-Za-z0-9_-]+$/.test(clientSecret)
  }

  // Utility methods
  reset(): void {
    this.data = {
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
      debugMode: false,
      relevanceWeights: DEFAULT_RELEVANCE_WEIGHTS,
      preferences: {
        autoScan: true,
        maxSearchResults: 50
      }
    }
  }

  getTestId(): string {
    return this.testId
  }

  // Transcription settings methods
  async getTranscriptionModel(): Promise<string> {
    return this.data.transcriptionModel
  }

  async setTranscriptionModel(model: string): Promise<void> {
    this.data.transcriptionModel = model
  }

  async getTranscriptFolder(): Promise<string | null> {
    return this.data.transcriptFolder
  }

  async setTranscriptFolder(folderPath: string | null): Promise<void> {
    this.data.transcriptFolder = folderPath
  }
}
