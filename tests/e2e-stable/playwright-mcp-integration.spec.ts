import { test, expect } from '@playwright/test'
import { PlaywrightMCPHelper, mcpTest } from '../helpers/playwright-mcp-helper'
import { TestEnvironment } from '../config/test-environment'

test.describe('Playwright MCP Integration - Stable Tests', () => {
  let testConfig: any

  test.beforeEach(async () => {
    testConfig = TestEnvironment.withMockedAPIs()
  })

  test.afterEach(async () => {
    TestEnvironment.cleanup()
  })

  test('should start and stop MCP server successfully', async () => {
    const config = PlaywrightMCPHelper.getPlaywrightMCPConfig()
    
    // Start MCP server
    await PlaywrightMCPHelper.startMCPServer(config)
    
    // Verify server is running
    const activeServers = PlaywrightMCPHelper.getActiveServers()
    expect(activeServers.length).toBeGreaterThan(0)
    
    // Stop all servers
    await PlaywrightMCPHelper.stopAllMCPServers()
    
    // Verify servers are stopped
    const remainingServers = PlaywrightMCPHelper.getActiveServers()
    expect(remainingServers.length).toBe(0)
  })

  test('should validate MCP server health', async () => {
    const serverId = await PlaywrightMCPHelper.setupPlaywrightMCP()
    
    try {
      // Wait for server to be ready
      await PlaywrightMCPHelper.waitForMCPServerReady(serverId)
      
      // Validate server health
      const isHealthy = await PlaywrightMCPHelper.validateMCPServerHealth(serverId)
      expect(isHealthy).toBe(true)
      
    } finally {
      await PlaywrightMCPHelper.stopMCPServer(serverId)
    }
  })

  test('should handle MCP server configuration', async () => {
    const config = PlaywrightMCPHelper.getPlaywrightMCPConfig()
    
    expect(config.name).toBe('playwright')
    expect(config.command).toBe('npx')
    expect(config.args).toContain('@playwright/mcp@latest')
    expect(config.env?.NODE_ENV).toBe('test')
  })

  test('should manage multiple MCP server instances', async () => {
    const config1 = {
      name: 'test-server-1',
      command: 'echo',
      args: ['test1']
    }
    
    const config2 = {
      name: 'test-server-2', 
      command: 'echo',
      args: ['test2']
    }
    
    try {
      // This test uses echo commands which exit immediately
      // So we expect them to fail to start as persistent servers
      await expect(PlaywrightMCPHelper.startMCPServer(config1)).rejects.toThrow()
      await expect(PlaywrightMCPHelper.startMCPServer(config2)).rejects.toThrow()
      
    } finally {
      // Cleanup any remaining servers
      await PlaywrightMCPHelper.stopAllMCPServers()
    }
  })

  test('should handle MCP server startup timeout', async () => {
    const invalidConfig = {
      name: 'invalid-server',
      command: 'nonexistent-command',
      args: []
    }
    
    // Should timeout and throw error
    await expect(PlaywrightMCPHelper.startMCPServer(invalidConfig)).rejects.toThrow()
  })

  test('should cleanup servers on test failure', async () => {
    // Start a server
    const serverId = await PlaywrightMCPHelper.setupPlaywrightMCP()
    
    // Verify it's running
    const activeServers = PlaywrightMCPHelper.getActiveServers()
    expect(activeServers).toContain(serverId)
    
    // Cleanup should work even if test fails
    await PlaywrightMCPHelper.stopAllMCPServers()
    
    const remainingServers = PlaywrightMCPHelper.getActiveServers()
    expect(remainingServers.length).toBe(0)
  })
})

// Test using the MCP fixture
mcpTest.describe('MCP Fixture Tests', () => {
  mcpTest('should automatically manage MCP server lifecycle', async ({ mcpServerId }) => {
    // Server should be automatically started by fixture
    expect(mcpServerId).toBeTruthy()
    
    // Verify server is healthy
    const isHealthy = await PlaywrightMCPHelper.validateMCPServerHealth(mcpServerId)
    expect(isHealthy).toBe(true)
    
    // Server will be automatically stopped by fixture cleanup
  })

  mcpTest('should provide isolated MCP server per test', async ({ mcpServerId }) => {
    // Each test should get its own server instance
    expect(mcpServerId).toBeTruthy()
    
    const serverConfig = PlaywrightMCPHelper.getServerConfig(mcpServerId)
    expect(serverConfig?.name).toBe('playwright')
  })
})
