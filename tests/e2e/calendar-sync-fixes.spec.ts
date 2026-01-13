import { test, expect } from '@playwright/test'
import { _electron as electron } from 'playwright'
import path from 'path'

test.describe('Calendar Sync Fixes Verification', () => {
  test('should verify race condition fix in event storage', async () => {
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

    // Test concurrent event storage operations
    const result = await page.evaluate(async () => {
      try {
        if (!window.electronAPI?.extractCalendarEvents) {
          return { success: false, error: 'Calendar API not available' }
        }

        // Simulate concurrent calendar extractions
        const promises = Array.from({ length: 3 }, () => 
          window.electronAPI.extractCalendarEvents()
        )

        const results = await Promise.all(promises)
        
        // All results should be consistent (no race condition corruption)
        const firstResult = results[0]
        const allConsistent = results.every(r => 
          r.totalEvents === firstResult.totalEvents &&
          r.source === firstResult.source
        )

        return {
          success: true,
          consistent: allConsistent,
          totalEvents: firstResult.totalEvents,
          source: firstResult.source
        }
      } catch (error) {
        return { success: false, error: error.message }
      }
    })

    // Should not fail due to race conditions
    if (!result.success) {
      console.log('Race condition test result:', result)
    }
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.consistent).toBe(true)
    }

    await electronApp.close()
  })

  test('should verify deduplication logic with proper index tracking', async () => {
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

    // Test deduplication with multiple imports
    const result = await page.evaluate(async () => {
      if (!window.electronAPI?.extractCalendarEvents) return { success: false }

      try {
        // First extraction
        const result1 = await window.electronAPI.extractCalendarEvents()
        
        // Second extraction (should deduplicate properly)
        const result2 = await window.electronAPI.extractCalendarEvents()

        // Verify deduplication worked correctly
        const eventsMatch = result1.events.length === result2.events.length
        const sourcesMatch = result1.source === result2.source

        return {
          success: true,
          eventsMatch,
          sourcesMatch,
          firstCount: result1.events.length,
          secondCount: result2.events.length,
          source: result1.source
        }
      } catch (error) {
        return { success: false, error: error.message }
      }
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.eventsMatch).toBe(true)
      expect(result.sourcesMatch).toBe(true)
    }

    await electronApp.close()
  })

  test('should verify error handling in event processing', async () => {
    const electronApp = await electron.launch({
      args: [path.join(__dirname, '../../dist/main/src/main/index.js')],
      env: { ...process.env, NODE_ENV: 'test' }
    })

    const page = await electronApp.firstWindow()
    await page.waitForLoadState('domcontentloaded')

    // Capture console errors
    const consoleErrors: string[] = []
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text())
      }
    })

    await page.click('button:has-text("Settings")')
    await page.waitForTimeout(500)
    await page.click('button:has-text("Calendar Import")')
    await page.waitForTimeout(500)

    // Test error handling with invalid operations
    const result = await page.evaluate(async () => {
      try {
        // Test with undefined calendar selection (should handle gracefully)
        if (window.electronAPI?.extractCalendarEvents) {
          const result = await window.electronAPI.extractCalendarEvents()
          return {
            success: true,
            handled: true,
            totalEvents: result.totalEvents,
            source: result.source
          }
        }
        return { success: false, error: 'API not available' }
      } catch (error) {
        // Should not throw unhandled errors
        return {
          success: false,
          handled: false,
          error: error.message
        }
      }
    })

    // Should handle errors gracefully without throwing
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.handled).toBe(true)
    }
    
    // Should not have unhandled console errors
    const criticalErrors = consoleErrors.filter(err => 
      err.includes('undefined') || err.includes('TypeError')
    )
    expect(criticalErrors).toHaveLength(0)

    await electronApp.close()
  })

  test('should verify async initialization in scheduler', async () => {
    const electronApp = await electron.launch({
      args: [path.join(__dirname, '../../dist/main/src/main/index.js')],
      env: { ...process.env, NODE_ENV: 'test' }
    })

    const page = await electronApp.firstWindow()
    await page.waitForLoadState('domcontentloaded')

    // Test scheduler initialization and status
    const result = await page.evaluate(async () => {
      try {
        // Check if sync status API is available
        if (!window.electronAPI?.getCalendarSyncStatus) {
          return { success: false, error: 'Sync API not available' }
        }

        // Get initial sync status
        const initialStatus = await window.electronAPI.getCalendarSyncStatus()

        // Perform manual sync to test async operations
        let manualSyncResult = null
        if (window.electronAPI?.performManualCalendarSync) {
          manualSyncResult = await window.electronAPI.performManualCalendarSync()
        }

        // Get status after sync
        const finalStatus = await window.electronAPI.getCalendarSyncStatus()

        return {
          success: true,
          initialStatus,
          manualSyncResult,
          finalStatus,
          statusConsistent: typeof initialStatus === 'object' && typeof finalStatus === 'object'
        }
      } catch (error) {
        return { success: false, error: error.message }
      }
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.statusConsistent).toBe(true)
      expect(result.initialStatus).toBeDefined()
      expect(result.finalStatus).toBeDefined()
    }

    await electronApp.close()
  })

  test('should verify enhanced event storage integrity', async () => {
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

    // Test that enhanced events are properly stored
    const result = await page.evaluate(async () => {
      if (!window.electronAPI?.extractCalendarEvents) return { success: false }

      try {
        const extractionResult = await window.electronAPI.extractCalendarEvents()
        
        // Verify event structure integrity
        const hasValidStructure = extractionResult.events.every(event => 
          event.id && 
          event.title !== undefined &&
          event.startDate &&
          event.endDate &&
          event.source
        )

        // Verify enhanced properties are preserved
        const hasEnhancedProps = extractionResult.events.every(event =>
          typeof event.isAllDay === 'boolean' &&
          Array.isArray(event.attendees || [])
        )

        return {
          success: true,
          validStructure: hasValidStructure,
          enhancedProps: hasEnhancedProps,
          eventCount: extractionResult.events.length,
          source: extractionResult.source
        }
      } catch (error) {
        return { success: false, error: error.message }
      }
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.validStructure).toBe(true)
      expect(result.enhancedProps).toBe(true)
    }

    await electronApp.close()
  })

  test('should verify calendar sync scheduler robustness', async () => {
    const electronApp = await electron.launch({
      args: [path.join(__dirname, '../../dist/main/src/main/index.js')],
      env: { ...process.env, NODE_ENV: 'test' }
    })

    const page = await electronApp.firstWindow()
    await page.waitForLoadState('domcontentloaded')

    // Test scheduler under concurrent operations
    const result = await page.evaluate(async () => {
      if (!window.electronAPI?.performManualCalendarSync) return { success: false }

      try {
        // Start multiple sync operations concurrently
        const syncPromises = Array.from({ length: 3 }, () => 
          window.electronAPI.performManualCalendarSync()
        )

        const results = await Promise.allSettled(syncPromises)
        
        // At least one should succeed, others should handle concurrency gracefully
        const successCount = results.filter(r => 
          r.status === 'fulfilled' && r.value.success
        ).length

        const errorCount = results.filter(r => 
          r.status === 'fulfilled' && !r.value.success && 
          r.value.error === 'Sync already in progress'
        ).length

        return {
          success: true,
          successCount,
          errorCount,
          totalAttempts: results.length,
          handledConcurrency: successCount >= 1 && (successCount + errorCount) === results.length
        }
      } catch (error) {
        return { success: false, error: error.message }
      }
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.handledConcurrency).toBe(true)
      expect(result.successCount).toBeGreaterThanOrEqual(1)
    }

    await electronApp.close()
  })
})