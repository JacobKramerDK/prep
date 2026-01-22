import { TestEnvironment } from './test-environment'
import { PlaywrightMCPHelper } from '../helpers/playwright-mcp-helper'

async function globalSetup() {
  console.log('Setting up global test environment...')
  
  // Initialize test environment
  TestEnvironment.setup('global-test')
  
  // Start Playwright MCP server for tests that need it
  try {
    await PlaywrightMCPHelper.setupPlaywrightMCP()
    console.log('Playwright MCP server started successfully')
  } catch (error) {
    console.warn('Failed to start Playwright MCP server:', error)
    // Don't fail setup if MCP server fails - tests can handle this
  }
  
  console.log('Global test environment setup complete')
}

export default globalSetup
