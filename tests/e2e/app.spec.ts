import { test, expect } from '@playwright/test'
import { spawn, ChildProcess } from 'child_process'
import path from 'path'
import fs from 'fs'
import packageJson from '../../package.json'

test.describe('Prep Application', () => {
  test('should start application successfully (fallback test)', async () => {
    // Build the application first
    const buildProcess = spawn('npm', ['run', 'build'], {
      stdio: 'pipe',
      cwd: process.cwd()
    })

    await new Promise<void>((resolve, reject) => {
      buildProcess.on('close', (code) => {
        if (code === 0) {
          resolve()
        } else {
          reject(new Error(`Build failed with code ${code}`))
        }
      })
    })

    // Test that the application can start
    const electronPath = path.join(process.cwd(), 'node_modules', '.bin', 'electron')
    const mainPath = path.join(process.cwd(), 'dist', 'main', 'index.js')
    
    const appProcess: ChildProcess = spawn(electronPath, [mainPath, '--version'], {
      stdio: 'pipe'
    })

    let output = ''
    appProcess.stdout?.on('data', (data) => {
      output += data.toString()
    })

    appProcess.stderr?.on('data', (data) => {
      output += data.toString()
    })

    // Wait for process to complete or timeout
    const result = await Promise.race([
      new Promise<number>((resolve) => {
        appProcess.on('close', resolve)
      }),
      new Promise<number>((resolve) => {
        setTimeout(() => {
          appProcess.kill()
          resolve(-1)
        }, 10000) // 10 second timeout
      })
    ])

    // Verify the application started successfully
    expect(result).not.toBe(-1) // Should not timeout
    expect(output).toContain(packageJson.version)
  })

  test('should build context-enhanced brief generation workflow', async () => {
    // This test verifies that the context enhancement feature is properly integrated
    // by checking that the build includes all necessary components
    
    // Verify main process files exist
    const mainFiles = [
      'dist/main/src/main/index.js',
      'dist/main/src/main/services/vault-indexer.js',
      'dist/main/src/main/services/context-retrieval-service.js'
    ]
    
    for (const file of mainFiles) {
      const filePath = path.join(process.cwd(), file)
      expect(fs.existsSync(filePath)).toBe(true)
    }
    
    // Verify renderer files exist
    const rendererFiles = [
      'dist/renderer/index.html',
      'dist/renderer/assets'
    ]
    
    for (const file of rendererFiles) {
      const filePath = path.join(process.cwd(), file)
      expect(fs.existsSync(filePath)).toBe(true)
    }
    
    // Verify that the main process includes context functionality
    const mainIndexPath = path.join(process.cwd(), 'dist/main/src/main/index.js')
    const mainIndexContent = fs.readFileSync(mainIndexPath, 'utf8')
    
    // Check for context-related IPC handlers
    expect(mainIndexContent).toContain('context:findRelevant')
    expect(mainIndexContent).toContain('context:isIndexed')
    expect(mainIndexContent).toContain('context:getIndexedFileCount')
  })
})
