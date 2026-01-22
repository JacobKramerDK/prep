import { TestEnvironment } from './test-environment'
import { PlaywrightMCPHelper } from '../helpers/playwright-mcp-helper'
import { TestAppFactory } from '../helpers/test-app-factory'

async function globalTeardown() {
  console.log('Cleaning up global test environment...')
  
  // Stop all MCP servers
  try {
    await PlaywrightMCPHelper.stopAllMCPServers()
    console.log('All MCP servers stopped')
  } catch (error) {
    console.warn('Error stopping MCP servers:', error)
  }
  
  // Cleanup any remaining test app instances
  try {
    await TestAppFactory.cleanupAll()
    console.log('All test app instances cleaned up')
  } catch (error) {
    console.warn('Error cleaning up test apps:', error)
  }
  
  // Cleanup test environment
  TestEnvironment.cleanup()
  
  console.log('Global test environment cleanup complete')
}

export default globalTeardown
