import { TestEnvironment } from '../config/test-environment'

describe('TestEnvironment', () => {
  afterEach(() => {
    TestEnvironment.cleanup()
  })

  describe('setup', () => {
    it('should setup test environment with default config', () => {
      const config = TestEnvironment.setup()
      
      expect(config.testId).toBeTruthy()
      expect(config.storeName).toContain('prep-settings-test-')
      expect(config.mockAPIs).toBe(true)
      expect(config.networkRequests).toBe(false)
      
      expect(process.env.NODE_ENV).toBe('test')
      expect(process.env.TEST_ID).toBe(config.testId)
    })

    it('should setup test environment with custom testId', () => {
      const customId = 'custom-test-123'
      const config = TestEnvironment.setup(customId)
      
      expect(config.testId).toBe(customId)
      expect(config.storeName).toBe(`prep-settings-test-${customId}`)
      expect(process.env.TEST_ID).toBe(customId)
    })
  })

  describe('cleanup', () => {
    it('should cleanup environment variables', () => {
      TestEnvironment.setup('cleanup-test')
      
      expect(process.env.TEST_ID).toBeTruthy()
      
      TestEnvironment.cleanup()
      
      expect(process.env.TEST_ID).toBeUndefined()
      expect(TestEnvironment.getCurrentConfig()).toBeNull()
    })
  })

  describe('utility methods', () => {
    it('should detect test environment', () => {
      TestEnvironment.setup()
      
      expect(TestEnvironment.isTestEnvironment()).toBe(true)
      expect(TestEnvironment.getTestId()).toBeTruthy()
    })

    it('should create isolated configs', () => {
      const config1 = TestEnvironment.withMockedAPIs('test1')
      const config2 = TestEnvironment.withMockedAPIs('test2')
      
      expect(config1.testId).not.toBe(config2.testId)
      expect(config1.mockAPIs).toBe(true)
      expect(config2.mockAPIs).toBe(true)
    })

    it('should create real API config', () => {
      const config = TestEnvironment.withRealAPIs('real-test')
      
      expect(config.mockAPIs).toBe(false)
      expect(config.networkRequests).toBe(true)
    })

    it('should create debug config', () => {
      const config = TestEnvironment.withDebugMode('debug-test')
      
      expect(config.debugMode).toBe(true)
    })
  })

  describe('validation', () => {
    it('should validate test environment setup', () => {
      expect(() => TestEnvironment.getCurrentConfig()).not.toThrow()
      
      TestEnvironment.setup()
      
      const config = TestEnvironment.getCurrentConfig()
      expect(config).toBeTruthy()
    })
  })
})
