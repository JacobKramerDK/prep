import { Debug } from '../../src/shared/utils/debug'

describe('Debug Utility Fixes', () => {
  beforeEach(() => {
    // Reset debug mode before each test
    Debug.setDebugMode(false)
  })

  test('should start with debug mode disabled by default', () => {
    expect(Debug.isEnabled()).toBe(false)
  })

  test('should enable debug mode when explicitly set', () => {
    Debug.setDebugMode(true)
    expect(Debug.isEnabled()).toBe(true)
  })

  test('should disable debug mode when explicitly set to false', () => {
    Debug.setDebugMode(true)
    expect(Debug.isEnabled()).toBe(true)
    
    Debug.setDebugMode(false)
    expect(Debug.isEnabled()).toBe(false)
  })

  test('should not log when debug mode is disabled', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation()
    
    Debug.setDebugMode(false)
    Debug.log('test message')
    
    expect(consoleSpy).not.toHaveBeenCalled()
    consoleSpy.mockRestore()
  })

  test('should log when debug mode is enabled', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation()
    
    Debug.setDebugMode(true)
    Debug.log('test message')
    
    // Check that console.log was called with a message containing timestamp and debug info
    expect(consoleSpy).toHaveBeenCalledTimes(1)
    const logCall = consoleSpy.mock.calls[0][0]
    expect(logCall).toMatch(/^\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] \[DEBUG\] test message$/)
    consoleSpy.mockRestore()
  })
})
