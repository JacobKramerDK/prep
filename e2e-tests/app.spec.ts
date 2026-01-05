import { test, expect } from '@playwright/test'
import { spawn, ChildProcess } from 'child_process'
import path from 'path'
import fs from 'fs'
import packageJson from '../package.json'

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

    // The app should either exit cleanly or be killed by timeout
    // Both indicate the app can start (timeout means it's running)
    expect(result === 0 || result === -1).toBe(true)
    
    // Ensure process is cleaned up
    if (!appProcess.killed) {
      appProcess.kill()
    }
  })

  test('should validate package.json configuration', async () => {
    expect(packageJson.name).toBe('prep')
    expect(packageJson.main).toBe('dist/main/index.js')
    expect(packageJson.scripts.dev).toBeDefined()
    expect(packageJson.scripts.build).toBeDefined()
    expect(packageJson.dependencies.react).toBeDefined()
    expect(packageJson.devDependencies.electron).toBeDefined()
    expect(packageJson.devDependencies.typescript).toBeDefined()
  })

  test('should have correct build output structure', async () => {
    // Check that build outputs exist
    expect(fs.existsSync(path.join(process.cwd(), 'dist', 'main', 'index.js'))).toBe(true)
    expect(fs.existsSync(path.join(process.cwd(), 'dist', 'renderer'))).toBe(true)
    
    // Check main process file has basic Electron imports
    const mainContent = fs.readFileSync(path.join(process.cwd(), 'dist', 'main', 'index.js'), 'utf8')
    expect(mainContent).toContain('electron')
    expect(mainContent).toContain('BrowserWindow')
  })
})
