import { ipcMain } from 'electron'
import { randomUUID } from 'crypto'

export interface IPCHandler {
  channel: string
  handler: Function
}

export class MainProcessIsolator {
  private originalHandlers = new Map<string, Function[]>()
  private testId: string

  constructor(testId: string = randomUUID()) {
    this.testId = testId
  }

  async setup(): Promise<void> {
    // Clear existing IPC handlers to prevent conflicts
    this.clearIPCHandlers()
    
    // Set test environment variables
    this.setupTestEnvironment()
  }

  async teardown(): Promise<void> {
    // Restore original handlers
    this.restoreIPCHandlers()
    
    // Clean up test environment
    this.cleanupTestEnvironment()
  }

  private clearIPCHandlers(): void {
    // List of all IPC channels used in the app
    const channels = [
      'app:getVersion',
      'platform:getPlatformInfo',
      'context:isIndexed',
      'context:getIndexedFileCount',
      'vault:getPath',
      'vault:select',
      'vault:scan',
      'vault:search',
      'vault:getFileContent',
      'vault:getRecentFiles',
      'calendar:getTodaysMeetings',
      'calendar:getAllMeetings',
      'calendar:performAutomaticSync',
      'calendar:getLastSyncTime',
      'calendar:updateSelectedCalendars',
      'calendar:getSelectedCalendars',
      'calendar:getAvailableCalendars',
      'calendar:requestPermissions',
      'calendar:checkPermissions',
      'calendar:extractCalendarEvents',
      'calendar:syncGoogleCalendar',
      'calendar:disconnectGoogleCalendar',
      'calendar:getGoogleCalendarStatus',
      'openai:generateBrief',
      'openai:validateApiKey',
      'settings:get',
      'settings:set',
      'settings:getOpenAIApiKey',
      'settings:setOpenAIApiKey',
      'settings:getOpenAIModel',
      'settings:setOpenAIModel',
      'settings:getDebugMode',
      'settings:setDebugMode',
      'settings:getRelevanceWeights',
      'settings:setRelevanceWeights'
    ]

    channels.forEach(channel => {
      const listeners = ipcMain.listeners(channel)
      if (listeners.length > 0) {
        this.originalHandlers.set(channel, [...listeners])
        ipcMain.removeAllListeners(channel)
      }
    })
  }

  private restoreIPCHandlers(): void {
    this.originalHandlers.forEach((handlers, channel) => {
      // Remove test handlers first
      ipcMain.removeAllListeners(channel)
      
      // Restore original handlers
      handlers.forEach(handler => {
        ipcMain.handle(channel, handler)
      })
    })
    
    this.originalHandlers.clear()
  }

  private setupTestEnvironment(): void {
    process.env.NODE_ENV = 'test'
    process.env.TEST_ID = this.testId
    process.env.ELECTRON_STORE_NAME = `prep-settings-test-${this.testId}`
  }

  private cleanupTestEnvironment(): void {
    delete process.env.TEST_ID
    delete process.env.ELECTRON_STORE_NAME
  }

  getTestId(): string {
    return this.testId
  }
}
