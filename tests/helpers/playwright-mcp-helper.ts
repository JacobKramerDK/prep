import { test, expect } from '@playwright/test'
import { spawn, ChildProcess } from 'child_process'
import { randomUUID } from 'crypto'

export interface MCPServerConfig {
  name: string
  command: string
  args: string[]
  env?: Record<string, string>
}

export class PlaywrightMCPHelper {
  private static servers: Map<string, ChildProcess> = new Map()
  private static serverConfigs: Map<string, MCPServerConfig> = new Map()

  static async startMCPServer(config: MCPServerConfig): Promise<void> {
    const serverId = `${config.name}-${randomUUID()}`
    
    try {
      const serverProcess = spawn(config.command, config.args, {
        env: { ...process.env, ...config.env },
        stdio: ['pipe', 'pipe', 'pipe']
      })

      // Wait for server to be ready
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error(`MCP server ${config.name} failed to start within timeout`))
        }, 10000)

        serverProcess.stdout?.on('data', (data) => {
          const output = data.toString()
          if (output.includes('Server started') || output.includes('ready')) {
            clearTimeout(timeout)
            resolve()
          }
        })

        serverProcess.stderr?.on('data', (data) => {
          console.warn(`MCP server ${config.name} stderr:`, data.toString())
        })

        serverProcess.on('error', (error) => {
          clearTimeout(timeout)
          reject(error)
        })

        serverProcess.on('exit', (code) => {
          if (code !== 0) {
            clearTimeout(timeout)
            reject(new Error(`MCP server ${config.name} exited with code ${code}`))
          }
        })
      })

      this.servers.set(serverId, serverProcess)
      this.serverConfigs.set(serverId, config)
      
    } catch (error) {
      throw new Error(`Failed to start MCP server ${config.name}: ${error}`)
    }
  }

  static async stopMCPServer(serverId: string): Promise<void> {
    const serverProcess = this.servers.get(serverId)
    if (serverProcess) {
      serverProcess.kill('SIGTERM')
      
      // Wait for graceful shutdown
      await new Promise<void>((resolve) => {
        const timeout = setTimeout(() => {
          serverProcess.kill('SIGKILL')
          resolve()
        }, 5000)

        serverProcess.on('exit', () => {
          clearTimeout(timeout)
          resolve()
        })
      })

      this.servers.delete(serverId)
      this.serverConfigs.delete(serverId)
    }
  }

  static async stopAllMCPServers(): Promise<void> {
    const stopPromises = Array.from(this.servers.keys()).map(serverId => 
      this.stopMCPServer(serverId)
    )
    await Promise.allSettled(stopPromises)
  }

  static getPlaywrightMCPConfig(): MCPServerConfig {
    return {
      name: 'playwright',
      command: 'npx',
      args: ['@playwright/mcp@latest'],
      env: {
        NODE_ENV: 'test',
        MCP_LOG_LEVEL: 'error'
      }
    }
  }

  static async setupPlaywrightMCP(): Promise<string> {
    const config = this.getPlaywrightMCPConfig()
    await this.startMCPServer(config)
    
    // Return server ID for cleanup
    const serverId = Array.from(this.servers.keys()).find(id => 
      this.serverConfigs.get(id)?.name === 'playwright'
    )
    
    if (!serverId) {
      throw new Error('Failed to get Playwright MCP server ID')
    }
    
    return serverId
  }

  static async validateMCPServerHealth(serverId: string): Promise<boolean> {
    const serverProcess = this.servers.get(serverId)
    if (!serverProcess) {
      return false
    }

    // Check if process is still running
    try {
      process.kill(serverProcess.pid!, 0)
      return true
    } catch (error) {
      return false
    }
  }

  static async waitForMCPServerReady(serverId: string, timeout: number = 10000): Promise<void> {
    const startTime = Date.now()
    
    while (Date.now() - startTime < timeout) {
      if (await this.validateMCPServerHealth(serverId)) {
        return
      }
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    
    throw new Error(`MCP server ${serverId} not ready within timeout`)
  }

  // Test fixture for automatic MCP server lifecycle management
  static createMCPFixture() {
    return test.extend<{ mcpServerId: string }>({
      mcpServerId: async ({}, use) => {
        const serverId = await PlaywrightMCPHelper.setupPlaywrightMCP()
        await PlaywrightMCPHelper.waitForMCPServerReady(serverId)
        
        try {
          await use(serverId)
        } finally {
          await PlaywrightMCPHelper.stopMCPServer(serverId)
        }
      }
    })
  }

  // Utility methods for MCP integration testing
  static async testMCPCommand(serverId: string, command: string, args: any[] = []): Promise<any> {
    const serverProcess = this.servers.get(serverId)
    if (!serverProcess) {
      throw new Error(`MCP server ${serverId} not found`)
    }

    // Send command to MCP server
    const request = {
      id: randomUUID(),
      method: command,
      params: args
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`MCP command ${command} timed out`))
      }, 5000)

      serverProcess.stdout?.once('data', (data) => {
        clearTimeout(timeout)
        try {
          const response = JSON.parse(data.toString())
          if (response.error) {
            reject(new Error(response.error.message))
          } else {
            resolve(response.result)
          }
        } catch (error) {
          reject(error)
        }
      })

      serverProcess.stdin?.write(JSON.stringify(request) + '\n')
    })
  }

  static getActiveServers(): string[] {
    return Array.from(this.servers.keys())
  }

  static getServerConfig(serverId: string): MCPServerConfig | undefined {
    return this.serverConfigs.get(serverId)
  }
}

// Export the MCP test fixture for use in test files
export const mcpTest = PlaywrightMCPHelper.createMCPFixture()
