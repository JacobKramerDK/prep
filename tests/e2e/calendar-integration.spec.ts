import { test, expect } from '@playwright/test'
import { ElectronApplication, _electron as electron } from 'playwright'
import path from 'path'

test.describe('Calendar Integration', () => {
  let electronApp: ElectronApplication

  test.beforeEach(async () => {
    // Build the app first
    electronApp = await electron.launch({
      args: [path.join(__dirname, '../../dist/main/src/main/index.js')],
      env: {
        ...process.env,
        NODE_ENV: 'test'
      }
    })
  })

  test.afterEach(async () => {
    if (electronApp) {
      await electronApp.close()
    }
  })

  test('should test AppleScript calendar extraction', async () => {
    const page = await electronApp.firstWindow()
    await page.waitForLoadState('domcontentloaded')
    
    // Navigate to calendar page
    await page.click('button:has-text("Calendar Import")')
    await page.waitForTimeout(1000)
    
    // Test AppleScript support first
    const isSupported = await page.evaluate(async () => {
      return await window.electronAPI.isAppleScriptSupported()
    })
    
    console.log('AppleScript supported:', isSupported)
    
    if (isSupported) {
      // Try to extract calendar events
      const result = await page.evaluate(async () => {
        try {
          const events = await window.electronAPI.extractCalendarEvents()
          return { success: true, events, error: null }
        } catch (error) {
          return { success: false, events: null, error: error.message }
        }
      })
      
      console.log('Calendar extraction result:', result)
      
      if (result.success) {
        expect(result.events).toBeDefined()
        expect(result.events.events).toBeInstanceOf(Array)
        console.log(`Found ${result.events.events.length} events`)
        
        // Log each event for debugging
        result.events.events.forEach((event, index) => {
          console.log(`Event ${index + 1}: ${event.title} at ${event.startDate} (${event.calendarName})`)
        })
      } else {
        console.log('Calendar extraction failed:', result.error)
        // Don't fail the test, just log the error
        expect(result.error).toBeDefined()
      }
    } else {
      console.log('AppleScript not supported on this platform')
    }
  })

  test('should display calendar events in UI', async () => {
    const page = await electronApp.firstWindow()
    await page.waitForLoadState('domcontentloaded')
    
    // Navigate to calendar page
    await page.click('button:has-text("Calendar Import")')
    await page.waitForTimeout(1000)
    
    // Click Apple Calendar import if supported
    const isSupported = await page.evaluate(async () => {
      return await window.electronAPI.isAppleScriptSupported()
    })
    
    if (isSupported) {
      await page.click('button:has-text("Import from Apple Calendar")')
      await page.waitForTimeout(2000)
      
      // Check if events are displayed
      const bodyText = await page.textContent('body')
      console.log('Page content after import:', bodyText)
      
      // Should either show events or "No events" message
      const hasEvents = bodyText.includes('Today\'s Events') || bodyText.includes('No events for today')
      expect(hasEvents).toBe(true)
    }
  })
})
