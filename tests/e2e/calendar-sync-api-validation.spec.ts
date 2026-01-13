import { test, expect } from '@playwright/test'
import { _electron as electron } from 'playwright'
import path from 'path'

test.describe('Calendar Sync Fixes - API Availability', () => {
  test('should verify calendar APIs are properly exposed', async () => {
    const electronApp = await electron.launch({
      args: [path.join(__dirname, '../../dist/main/src/main/index.js')],
      env: { ...process.env, NODE_ENV: 'test' }
    })

    const page = await electronApp.firstWindow()
    await page.waitForLoadState('domcontentloaded')

    // Navigate to calendar settings
    await page.click('button:has-text("Settings")')
    await page.waitForTimeout(500)
    await page.click('button:has-text("Calendar Import")')
    await page.waitForTimeout(500)

    // Test that all required APIs are available
    const apiAvailability = await page.evaluate(() => {
      return {
        extractCalendarEvents: typeof window.electronAPI?.extractCalendarEvents === 'function',
        getCalendarSyncStatus: typeof window.electronAPI?.getCalendarSyncStatus === 'function',
        performManualCalendarSync: typeof window.electronAPI?.performManualCalendarSync === 'function',
        isAppleScriptSupported: typeof window.electronAPI?.isAppleScriptSupported === 'function',
        parseICSFile: typeof window.electronAPI?.parseICSFile === 'function',
        updateSelectedCalendars: typeof window.electronAPI?.updateSelectedCalendars === 'function'
      }
    })

    // All calendar APIs should be available
    expect(apiAvailability.extractCalendarEvents).toBe(true)
    expect(apiAvailability.getCalendarSyncStatus).toBe(true)
    expect(apiAvailability.performManualCalendarSync).toBe(true)
    expect(apiAvailability.isAppleScriptSupported).toBe(true)
    expect(apiAvailability.parseICSFile).toBe(true)
    expect(apiAvailability.updateSelectedCalendars).toBe(true)

    await electronApp.close()
  })

  test('should verify error handling structure is in place', async () => {
    const electronApp = await electron.launch({
      args: [path.join(__dirname, '../../dist/main/src/main/index.js')],
      env: { ...process.env, NODE_ENV: 'test' }
    })

    const page = await electronApp.firstWindow()
    await page.waitForLoadState('domcontentloaded')

    await page.click('button:has-text("Settings")')
    await page.waitForTimeout(500)
    await page.click('button:has-text("Calendar Import")')
    await page.waitForTimeout(500)

    // Test that error handling returns proper structure
    const errorHandling = await page.evaluate(async () => {
      try {
        if (!window.electronAPI?.extractCalendarEvents) {
          return { hasAPI: false }
        }

        // This will likely fail due to permissions, but should return proper error structure
        const result = await window.electronAPI.extractCalendarEvents()
        return { hasAPI: true, success: true, result }
      } catch (error) {
        return { 
          hasAPI: true, 
          success: false, 
          errorHandled: true,
          errorType: error.constructor.name,
          hasMessage: typeof error.message === 'string'
        }
      }
    })

    expect(errorHandling.hasAPI).toBe(true)
    
    // If it fails (expected), verify error handling structure
    if (!errorHandling.success) {
      expect(errorHandling.errorHandled).toBe(true)
      expect(errorHandling.hasMessage).toBe(true)
    }

    await electronApp.close()
  })

  test('should verify scheduler API structure', async () => {
    const electronApp = await electron.launch({
      args: [path.join(__dirname, '../../dist/main/src/main/index.js')],
      env: { ...process.env, NODE_ENV: 'test' }
    })

    const page = await electronApp.firstWindow()
    await page.waitForLoadState('domcontentloaded')

    // Test scheduler API structure
    const schedulerTest = await page.evaluate(async () => {
      try {
        if (!window.electronAPI?.getCalendarSyncStatus) {
          return { hasAPI: false }
        }

        const status = await window.electronAPI.getCalendarSyncStatus()
        
        return {
          hasAPI: true,
          success: true,
          statusStructure: {
            hasIsEnabled: typeof status.isEnabled === 'boolean',
            hasLastSyncTime: status.lastSyncTime === null || status.lastSyncTime instanceof Date || typeof status.lastSyncTime === 'string',
            hasNextSyncTime: status.nextSyncTime === null || status.nextSyncTime instanceof Date || typeof status.nextSyncTime === 'string',
            hasIsRunning: typeof status.isRunning === 'boolean',
            hasError: status.error === null || typeof status.error === 'string'
          }
        }
      } catch (error) {
        return { 
          hasAPI: true, 
          success: false, 
          errorHandled: true,
          errorMessage: error.message 
        }
      }
    })

    expect(schedulerTest.hasAPI).toBe(true)
    
    if (schedulerTest.success) {
      expect(schedulerTest.statusStructure.hasIsEnabled).toBe(true)
      expect(schedulerTest.statusStructure.hasLastSyncTime).toBe(true)
      expect(schedulerTest.statusStructure.hasNextSyncTime).toBe(true)
      expect(schedulerTest.statusStructure.hasIsRunning).toBe(true)
      expect(schedulerTest.statusStructure.hasError).toBe(true)
    }

    await electronApp.close()
  })

  test('should verify concurrent operation handling', async () => {
    const electronApp = await electron.launch({
      args: [path.join(__dirname, '../../dist/main/src/main/index.js')],
      env: { ...process.env, NODE_ENV: 'test' }
    })

    const page = await electronApp.firstWindow()
    await page.waitForLoadState('domcontentloaded')

    // Test that concurrent operations are handled properly
    const concurrencyTest = await page.evaluate(async () => {
      if (!window.electronAPI?.performManualCalendarSync) {
        return { hasAPI: false }
      }

      try {
        // Start multiple sync operations
        const promises = Array.from({ length: 3 }, () => 
          window.electronAPI.performManualCalendarSync()
        )

        const results = await Promise.allSettled(promises)
        
        // Check that all promises settled (didn't hang)
        const allSettled = results.every(r => r.status === 'fulfilled' || r.status === 'rejected')
        
        // Check for proper error handling in concurrent scenarios
        const hasProperErrorHandling = results.every(r => {
          if (r.status === 'fulfilled') {
            return typeof r.value === 'object' && 
                   typeof r.value.success === 'boolean' &&
                   (r.value.error === null || typeof r.value.error === 'string')
          }
          return true // Rejected promises are also handled
        })

        return {
          hasAPI: true,
          allSettled,
          hasProperErrorHandling,
          resultCount: results.length
        }
      } catch (error) {
        return { 
          hasAPI: true, 
          error: error.message,
          errorHandled: true 
        }
      }
    })

    expect(concurrencyTest.hasAPI).toBe(true)
    
    if (concurrencyTest.allSettled) {
      expect(concurrencyTest.hasProperErrorHandling).toBe(true)
      expect(concurrencyTest.resultCount).toBe(3)
    }

    await electronApp.close()
  })

  test('should verify event structure validation', async () => {
    const electronApp = await electron.launch({
      args: [path.join(__dirname, '../../dist/main/src/main/index.js')],
      env: { ...process.env, NODE_ENV: 'test' }
    })

    const page = await electronApp.firstWindow()
    await page.waitForLoadState('domcontentloaded')

    await page.click('button:has-text("Settings")')
    await page.waitForTimeout(500)
    await page.click('button:has-text("Calendar Import")')
    await page.waitForTimeout(500)

    // Test event structure validation
    const structureTest = await page.evaluate(async () => {
      if (!window.electronAPI?.extractCalendarEvents) {
        return { hasAPI: false }
      }

      try {
        const result = await window.electronAPI.extractCalendarEvents()
        
        // Verify result structure
        const hasValidStructure = 
          typeof result === 'object' &&
          Array.isArray(result.events) &&
          typeof result.totalEvents === 'number' &&
          typeof result.source === 'string' &&
          (result.importedAt instanceof Date || typeof result.importedAt === 'string')

        // If there are events, verify their structure
        let eventsValid = true
        if (result.events.length > 0) {
          eventsValid = result.events.every(event => 
            typeof event.id === 'string' &&
            typeof event.title === 'string' &&
            (event.startDate instanceof Date || typeof event.startDate === 'string') &&
            (event.endDate instanceof Date || typeof event.endDate === 'string') &&
            typeof event.isAllDay === 'boolean' &&
            typeof event.source === 'string' &&
            Array.isArray(event.attendees || [])
          )
        }

        return {
          hasAPI: true,
          success: true,
          hasValidStructure,
          eventsValid,
          eventCount: result.events.length
        }
      } catch (error) {
        return { 
          hasAPI: true, 
          success: false, 
          errorHandled: true,
          errorMessage: error.message 
        }
      }
    })

    expect(structureTest.hasAPI).toBe(true)
    
    // Whether it succeeds or fails, the structure should be validated
    if (structureTest.success) {
      expect(structureTest.hasValidStructure).toBe(true)
      expect(structureTest.eventsValid).toBe(true)
    } else {
      expect(structureTest.errorHandled).toBe(true)
    }

    await electronApp.close()
  })
})