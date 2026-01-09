import { test, expect } from '@playwright/test'
import { _electron as electron } from 'playwright'
import path from 'path'
import fs from 'fs'

test.describe('Swift Calendar Integration Debug', () => {
  test('should debug Swift binary detection and fallback behavior in dev mode', async () => {
    // Check if Swift binary exists and permissions
    const binaryPath = path.join(process.cwd(), 'resources/bin/calendar-helper')
    const binaryExists = fs.existsSync(binaryPath)
    console.log(`Swift binary exists at ${binaryPath}: ${binaryExists}`)

    if (binaryExists) {
      const stats = fs.statSync(binaryPath)
      console.log(`Binary size: ${stats.size} bytes`)
      console.log(`Binary executable: ${!!(stats.mode & parseInt('111', 8))}`)
    }

    // Start app in dev mode
    const electronApp = await electron.launch({
      args: [path.join(__dirname, '../../dist/main/src/main/index.js')],
      env: {
        ...process.env,
        NODE_ENV: 'development'
      }
    })

    const page = await electronApp.firstWindow()
    await page.waitForLoadState('domcontentloaded')

    // Capture console logs
    const consoleLogs: string[] = []
    page.on('console', msg => {
      consoleLogs.push(`${msg.type()}: ${msg.text()}`)
    })

    // Navigate to Settings > Calendar Import
    await page.click('button:has-text("Settings")')
    await page.waitForTimeout(500)
    await page.click('button:has-text("Calendar Import")')
    await page.waitForTimeout(300)

    // Test calendar extraction with timeout
    const extractionResult = await Promise.race([
      page.evaluate(async () => {
        if (window.electronAPI?.extractCalendarEvents) {
          try {
            const result = await window.electronAPI.extractCalendarEvents()
            return { success: true, result }
          } catch (error) {
            return { success: false, error: error.message }
          }
        }
        return { success: false, error: 'API not available' }
      }),
      new Promise(resolve => setTimeout(() => resolve({ success: false, error: 'timeout' }), 5000))
    ])

    console.log('Extraction result:', extractionResult)

    // Wait for logs to accumulate
    await page.waitForTimeout(1000)

    // Check console logs for Swift/AppleScript indicators
    const swiftLogs = consoleLogs.filter(log => 
      log.includes('Swift') || 
      log.includes('calendar-helper') ||
      log.includes('SwiftCalendarManager') ||
      log.includes('PERMISSION_DENIED')
    )
    
    const applescriptLogs = consoleLogs.filter(log => 
      log.includes('AppleScript') || 
      log.includes('fallback') ||
      log.includes('osascript')
    )

    console.log('\n=== SWIFT LOGS ===')
    swiftLogs.forEach(log => console.log(log))
    
    console.log('\n=== APPLESCRIPT LOGS ===')
    applescriptLogs.forEach(log => console.log(log))

    // Check if Swift binary is being used vs AppleScript
    const usedSwift = swiftLogs.length > 0 && !applescriptLogs.some(log => log.includes('fallback'))
    const usedAppleScript = applescriptLogs.length > 0
    const hasPermissionError = consoleLogs.some(log => log.includes('PERMISSION_DENIED'))

    console.log('\n=== SUMMARY ===')
    console.log(`Binary exists: ${binaryExists}`)
    console.log(`Used Swift: ${usedSwift}`)
    console.log(`Used AppleScript: ${usedAppleScript}`)
    console.log(`Permission denied: ${hasPermissionError}`)

    // The main issue: Calendar permissions
    if (hasPermissionError || (!usedSwift && usedAppleScript)) {
      console.log('\n❌ ISSUE: Swift binary requires calendar access permissions')
      console.log('SOLUTION: Grant calendar access to the app in System Preferences > Security & Privacy > Privacy > Calendars')
      console.log('This is why it falls back to AppleScript (which also needs permissions but handles them differently)')
    }

    await electronApp.close()
  })

  test('should verify Swift binary execution directly', async () => {
    const binaryPath = path.join(process.cwd(), 'resources/bin/calendar-helper')
    
    if (!fs.existsSync(binaryPath)) {
      console.log('❌ Swift binary not found, skipping direct execution test')
      return
    }

    // Security validation: ensure binary path is within expected boundaries
    const projectRoot = path.normalize(process.cwd())
    const normalizedBinaryPath = path.normalize(binaryPath)
    
    if (!normalizedBinaryPath.startsWith(projectRoot)) {
      console.log('❌ Security violation: Binary path outside project boundaries')
      return
    }

    // Additional validation: check if it's actually the expected binary
    const stats = fs.statSync(binaryPath)
    if (!stats.isFile() || !(stats.mode & parseInt('111', 8))) {
      console.log('❌ Binary validation failed: not executable file')
      return
    }

    // Test direct binary execution with security constraints
    const { spawn } = require('child_process')
    
    const testExecution = () => new Promise((resolve) => {
      const child = spawn(binaryPath, [], { 
        stdio: 'pipe',
        timeout: 5000,
        // Security: prevent shell injection
        shell: false
      })
      
      let output = ''
      let error = ''
      
      child.stdout?.on('data', (data: Buffer) => {
        output += data.toString()
      })
      
      child.stderr?.on('data', (data: Buffer) => {
        error += data.toString()
      })
      
      child.on('close', (code) => {
        resolve({ code, output, error })
      })
      
      child.on('error', (err) => {
        resolve({ code: -1, output: '', error: err.message })
      })
    })

    const result = await testExecution() as any
    
    console.log('\n=== DIRECT BINARY EXECUTION ===')
    console.log(`Exit code: ${result.code}`)
    console.log(`Output: ${result.output}`)
    console.log(`Error: ${result.error}`)
    
    if (result.code !== 0) {
      console.log('❌ Swift binary execution failed')
      console.log('This explains why it falls back to AppleScript')
    } else {
      console.log('✅ Swift binary executes successfully')
    }
  })
})
