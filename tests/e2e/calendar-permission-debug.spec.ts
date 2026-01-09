import { test, expect } from '@playwright/test'
import { _electron as electron } from 'playwright'
import path from 'path'
import fs from 'fs'

test.describe('Calendar Permission Debug', () => {
  test('should debug calendar permission issues and fallback behavior', async () => {
    // Check Swift binary first
    const binaryPath = path.join(process.cwd(), 'resources/bin/calendar-helper')
    const binaryExists = fs.existsSync(binaryPath)
    console.log(`Swift binary exists: ${binaryExists}`)

    if (binaryExists) {
      const stats = fs.statSync(binaryPath)
      console.log(`Binary executable: ${!!(stats.mode & parseInt('111', 8))}`)
    }

    // Start app
    const electronApp = await electron.launch({
      args: [path.join(__dirname, '../../dist/main/src/main/index.js')],
      env: {
        ...process.env,
        NODE_ENV: 'development'
      }
    })

    const page = await electronApp.firstWindow()
    await page.waitForLoadState('domcontentloaded')

    // Capture all console messages
    const consoleLogs: string[] = []
    page.on('console', msg => {
      const text = msg.text()
      consoleLogs.push(`${msg.type()}: ${text}`)
      console.log(`CONSOLE ${msg.type()}: ${text}`)
    })

    // Navigate to calendar import
    await page.click('button:has-text("Settings")')
    await page.waitForTimeout(500)
    await page.click('button:has-text("Calendar Import")')
    await page.waitForTimeout(500)

    console.log('\n=== Testing Calendar Extraction ===')

    // Test calendar extraction with detailed error handling
    const result = await page.evaluate(async () => {
      try {
        if (!window.electronAPI?.extractCalendarEvents) {
          return { success: false, error: 'extractCalendarEvents API not available' }
        }

        console.log('Calling extractCalendarEvents...')
        const events = await window.electronAPI.extractCalendarEvents()
        console.log('extractCalendarEvents completed:', events)
        return { success: true, events }
      } catch (error) {
        console.error('extractCalendarEvents failed:', error)
        return { 
          success: false, 
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      }
    })

    console.log('\n=== Extraction Result ===')
    console.log(JSON.stringify(result, null, 2))

    // Wait for any additional logs
    await page.waitForTimeout(2000)

    console.log('\n=== All Console Logs ===')
    consoleLogs.forEach(log => console.log(log))

    // Analyze logs for specific patterns
    const swiftLogs = consoleLogs.filter(log => 
      log.includes('Swift') || 
      log.includes('calendar-helper') ||
      log.includes('PERMISSION_DENIED')
    )
    
    const applescriptLogs = consoleLogs.filter(log => 
      log.includes('AppleScript') || 
      log.includes('fallback') ||
      log.includes('osascript')
    )

    const errorLogs = consoleLogs.filter(log => 
      log.includes('error:') || 
      log.includes('Error:') ||
      log.includes('failed')
    )

    console.log('\n=== Analysis ===')
    console.log(`Swift-related logs: ${swiftLogs.length}`)
    swiftLogs.forEach(log => console.log(`  ${log}`))
    
    console.log(`AppleScript-related logs: ${applescriptLogs.length}`)
    applescriptLogs.forEach(log => console.log(`  ${log}`))
    
    console.log(`Error logs: ${errorLogs.length}`)
    errorLogs.forEach(log => console.log(`  ${log}`))

    // Check if the issue is permissions
    const hasPermissionIssue = consoleLogs.some(log => 
      log.includes('PERMISSION_DENIED') || 
      log.includes('Calendar access permission required')
    )

    if (hasPermissionIssue) {
      console.log('\n❌ CONFIRMED: Calendar permission issue detected')
      console.log('SOLUTION: Grant calendar access to the app in System Preferences')
    } else if (!result.success) {
      console.log('\n❌ Calendar extraction failed for other reasons')
      console.log('Error:', result.error)
    } else {
      console.log('\n✅ Calendar extraction succeeded')
    }

    await electronApp.close()
  })
})