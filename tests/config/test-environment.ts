import { tmpdir } from 'os'
import { join } from 'path'
import { randomUUID } from 'crypto'

export interface TestEnvironmentConfig {
  testId: string
  storeName: string
  storePath: string
  tempDir: string
  mockAPIs: boolean
  networkRequests: boolean
  debugMode: boolean
}

export class TestEnvironment {
  private static currentConfig: TestEnvironmentConfig | null = null

  static setup(testId: string = randomUUID()): TestEnvironmentConfig {
    const config: TestEnvironmentConfig = {
      testId,
      storeName: `prep-settings-test-${testId}`,
      storePath: join(tmpdir(), `prep-test-${testId}`),
      tempDir: join(tmpdir(), `prep-temp-${testId}`),
      mockAPIs: true,
      networkRequests: false,
      debugMode: false
    }

    // Set environment variables
    process.env.NODE_ENV = 'test'
    process.env.TEST_ID = testId
    process.env.ELECTRON_STORE_NAME = config.storeName
    process.env.ELECTRON_STORE_PATH = config.storePath
    process.env.PREP_TEMP_DIR = config.tempDir
    process.env.MOCK_OPENAI_API = config.mockAPIs ? 'true' : 'false'
    process.env.MOCK_CALENDAR_API = config.mockAPIs ? 'true' : 'false'
    process.env.DISABLE_NETWORK_REQUESTS = config.networkRequests ? 'false' : 'true'
    process.env.DEBUG_MODE = config.debugMode ? 'true' : 'false'
    
    // Set test OAuth credentials to prevent app startup failures
    process.env.GOOGLE_CLIENT_ID = 'test-client-id-for-testing'
    process.env.GOOGLE_CLIENT_SECRET = 'test-client-secret-for-testing'

    this.currentConfig = config
    return config
  }

  static cleanup(): void {
    if (this.currentConfig) {
      // Clean up environment variables
      delete process.env.TEST_ID
      delete process.env.ELECTRON_STORE_NAME
      delete process.env.ELECTRON_STORE_PATH
      delete process.env.PREP_TEMP_DIR
      delete process.env.MOCK_OPENAI_API
      delete process.env.MOCK_CALENDAR_API
      delete process.env.DISABLE_NETWORK_REQUESTS
      delete process.env.DEBUG_MODE
      delete process.env.GOOGLE_CLIENT_ID
      delete process.env.GOOGLE_CLIENT_SECRET

      this.currentConfig = null
    }
  }

  static getCurrentConfig(): TestEnvironmentConfig | null {
    return this.currentConfig
  }

  static isTestEnvironment(): boolean {
    return process.env.NODE_ENV === 'test'
  }

  static getTestId(): string | undefined {
    return process.env.TEST_ID
  }

  static shouldMockAPIs(): boolean {
    return process.env.MOCK_OPENAI_API === 'true' || process.env.MOCK_CALENDAR_API === 'true'
  }

  static shouldDisableNetworkRequests(): boolean {
    return process.env.DISABLE_NETWORK_REQUESTS === 'true'
  }

  static isDebugMode(): boolean {
    return process.env.DEBUG_MODE === 'true'
  }

  // Utility methods for test isolation
  static createIsolatedConfig(overrides: Partial<TestEnvironmentConfig> = {}): TestEnvironmentConfig {
    const baseConfig = this.setup()
    return { ...baseConfig, ...overrides }
  }

  static withMockedAPIs(testId?: string): TestEnvironmentConfig {
    return this.createIsolatedConfig({
      testId: testId || randomUUID(),
      mockAPIs: true,
      networkRequests: false
    })
  }

  static withRealAPIs(testId?: string): TestEnvironmentConfig {
    return this.createIsolatedConfig({
      testId: testId || randomUUID(),
      mockAPIs: false,
      networkRequests: true
    })
  }

  static withDebugMode(testId?: string): TestEnvironmentConfig {
    return this.createIsolatedConfig({
      testId: testId || randomUUID(),
      debugMode: true
    })
  }
}

// Constants for test configuration
export const TEST_CONSTANTS = {
  DEFAULT_TIMEOUT: 30000,
  API_TIMEOUT: 15000,
  LOADING_TIMEOUT: 10000,
  NETWORK_TIMEOUT: 5000,
  
  // Test data limits
  MAX_SEARCH_RESULTS: 50,
  MAX_CALENDAR_EVENTS: 100,
  MAX_VAULT_FILES: 1000,
  
  // Mock API responses
  MOCK_API_DELAY: 100,
  MOCK_VALIDATION_DELAY: 500,
  MOCK_GENERATION_DELAY: 2000,
  
  // File paths
  TEST_VAULT_PATH: join(tmpdir(), 'test-vault'),
  TEST_SETTINGS_PATH: join(tmpdir(), 'test-settings'),
  
  // API key patterns
  VALID_API_KEY_PATTERN: /^sk-[a-zA-Z0-9]{20,}$/,
  TEST_API_KEY_PREFIX: 'sk-test',
  
  // Calendar constants
  DEFAULT_CALENDAR_NAME: 'Test Calendar',
  DEFAULT_MEETING_DURATION: 3600000, // 1 hour in milliseconds
  
  // OpenAI model constants
  DEFAULT_MODEL: 'gpt-4o-mini',
  AVAILABLE_MODELS: ['gpt-4o-mini', 'gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo']
} as const

// Type guards for environment validation
export const isValidTestEnvironment = (): boolean => {
  return TestEnvironment.isTestEnvironment() && 
         !!TestEnvironment.getTestId() &&
         TestEnvironment.getCurrentConfig() !== null
}

export const requireTestEnvironment = (): TestEnvironmentConfig => {
  const config = TestEnvironment.getCurrentConfig()
  if (!config) {
    throw new Error('Test environment not properly initialized. Call TestEnvironment.setup() first.')
  }
  return config
}
