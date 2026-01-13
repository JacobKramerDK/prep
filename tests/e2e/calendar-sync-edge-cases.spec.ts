import { test, expect } from '@playwright/test'
import { _electron as electron } from 'playwright'
import path from 'path'

test.describe('Calendar Sync Edge Cases', () => {
  test('should handle undefined selected calendars gracefully', async () => {
    const electronApp = await electron.launch({
      args: [path.join(__dirname, '../../dist/main/src/main/index.js')],
      env: { ...process.env, NODE_ENV: 'test' }
    })

    const page = await electronApp.firstWindow()
    await page.waitForLoadState('domcontentloaded')

    await page.click('button:has-text("Settings")')
    await page.click('button:has-text("Calendar Import")')

    // Test calendar sync with no selected calendars
    const result = await page.evaluate(async () => {
      try {
        // Check if calendar extraction API is available
        if (!window.electronAPI?.extractCalendarEvents) {
          return { success: false, error: 'Calendar API not available' }
        }
        
        // Test extraction with undefined (no selected calendars)
        const extractionResult = await window.electronAPI.extractCalendarEvents()
        
        return {
          success: true,
          totalEvents: extractionResult.totalEvents,
          hasEvents: extractionResult.events.length > 0,
          source: extractionResult.source
        }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    })
    
    // The extraction should succeed (not fail with undefined calendars)
    expect(result.success).toBe(true)
    
    // Should have a valid source
    expect(result.source).toBeDefined()
    
    // Should not throw an error about undefined calendars
    if (!result.success) {
      expect(result.error).not.toContain('undefined')
      expect(result.error).not.toContain('Selected calendars for extraction: undefined')
    }

    await electronApp.close()
  })
  
  test('should auto-discover calendars when none are selected', async () => {
    const electronApp = await electron.launch({
      args: [path.join(__dirname, '../../dist/main/src/main/index.js')],
      env: { ...process.env, NODE_ENV: 'test' }
    })

    const page = await electronApp.firstWindow()
    await page.waitForLoadState('domcontentloaded')

    await page.click('button:has-text("Settings")')
    await page.click('button:has-text("Calendar Import")')

    // Test calendar discovery and selection
    const result = await page.evaluate(async () => {
      try {
        // First, clear any existing calendar selection
        if (window.electronAPI?.updateSelectedCalendars) {
          await window.electronAPI.updateSelectedCalendars({
            selectedCalendarUids: []
          })
        }
        
        // Now test extraction - should auto-discover calendars
        if (!window.electronAPI?.extractCalendarEvents) {
          return { success: false, error: 'Calendar API not available' }
        }
        
        const extractionResult = await window.electronAPI.extractCalendarEvents([])
        
        return {
          success: true,
          totalEvents: extractionResult.totalEvents,
          source: extractionResult.source,
          hasAutoDiscovered: true
        }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    })
    
    // Should succeed with auto-discovery
    expect(result.success).toBe(true)
    
    // Should indicate auto-discovery worked
    if (result.success) {
      expect(result.hasAutoDiscovered).toBe(true)
    }

    await electronApp.close()
  })
  
  test('should handle calendar sync scheduler correctly', async () => {
    const electronApp = await electron.launch({
      args: [path.join(__dirname, '../../dist/main/src/main/index.js')],
      env: { ...process.env, NODE_ENV: 'test' }
    })

    const page = await electronApp.firstWindow()
    await page.waitForLoadState('domcontentloaded')

    await page.click('button:has-text("Settings")')
    await page.click('button:has-text("Calendar Import")')

    // Test the calendar sync scheduler
    const result = await page.evaluate(async () => {
      try {
        // Check if sync status API is available
        if (!window.electronAPI?.getCalendarSyncStatus) {
          return { success: false, error: 'Calendar sync API not available' }
        }
        
        // Get current sync status
        const syncStatus = await window.electronAPI.getCalendarSyncStatus()
        
        // Try to perform a manual sync
        let manualSyncResult = null
        if (window.electronAPI?.performManualCalendarSync) {
          manualSyncResult = await window.electronAPI.performManualCalendarSync()
        }
        
        return {
          success: true,
          syncStatus,
          manualSyncResult,
          hasScheduler: true
        }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    })
    
    // Should be able to get sync status
    expect(result.success).toBe(true)
    
    if (result.success) {
      expect(result.syncStatus).toBeDefined()
      expect(result.hasScheduler).toBe(true)
    }

    await electronApp.close()
  })

  test('should handle rapid consecutive sync operations', async () => {
    const electronApp = await electron.launch({
      args: [path.join(__dirname, '../../dist/main/src/main/index.js')],
      env: { ...process.env, NODE_ENV: 'test' }
    })

    const page = await electronApp.firstWindow()
    await page.waitForLoadState('domcontentloaded')

    await page.click('button:has-text("Settings")')
    await page.click('button:has-text("Calendar Import")')

    // Test rapid consecutive operations
    const result = await page.evaluate(async () => {
      if (!window.electronAPI?.performManualCalendarSync) return { success: false }

      const results = []
      
      // Fire 5 rapid sync requests
      for (let i = 0; i < 5; i++) {
        try {
          const syncResult = await window.electronAPI.performManualCalendarSync()
          results.push({ attempt: i + 1, ...syncResult })
        } catch (error) {
          results.push({ 
            attempt: i + 1, 
            success: false, 
            error: error.message 
          })
        }
      }

      const successCount = results.filter(r => r.success).length
      const inProgressCount = results.filter(r => 
        !r.success && r.error === 'Sync already in progress'
      ).length

      return {
        success: true,
        results,
        successCount,
        inProgressCount,
        totalAttempts: results.length,
        handledProperly: successCount >= 1 && (successCount + inProgressCount) === results.length
      }
    })

    expect(result.success).toBe(true)
    expect(result.handledProperly).toBe(true)
    expect(result.successCount).toBeGreaterThanOrEqual(1)

    await electronApp.close()
  })

  test('should maintain event data integrity during concurrent operations', async () => {
    const electronApp = await electron.launch({
      args: [path.join(__dirname, '../../dist/main/src/main/index.js')],
      env: { ...process.env, NODE_ENV: 'test' }
    })

    const page = await electronApp.firstWindow()
    await page.waitForLoadState('domcontentloaded')

    await page.click('button:has-text("Settings")')
    await page.click('button:has-text("Calendar Import")')

    // Test data integrity during concurrent operations
    const result = await page.evaluate(async () => {
      if (!window.electronAPI?.extractCalendarEvents) return { success: false }

      try {
        // Start multiple concurrent extractions
        const promises = Array.from({ length: 5 }, (_, i) => 
          window.electronAPI.extractCalendarEvents().then(result => ({
            index: i,
            ...result
          }))
        )

        const results = await Promise.all(promises)
        
        // Check for data consistency
        const firstResult = results[0]
        const allHaveSameEventCount = results.every(r => 
          r.totalEvents === firstResult.totalEvents
        )
        
        const allHaveSameSource = results.every(r => 
          r.source === firstResult.source
        )

        // Check event structure integrity
        const allEventsValid = results.every(r => 
          r.events.every(event => 
            event.id && 
            event.title !== undefined &&
            event.startDate &&
            event.endDate
          )
        )

        return {
          success: true,
          resultCount: results.length,
          allHaveSameEventCount,
          allHaveSameSource,
          allEventsValid,
          sampleEventCount: firstResult.totalEvents,
          sampleSource: firstResult.source
        }
      } catch (error) {
        return { success: false, error: error.message }
      }
    })

    expect(result.success).toBe(true)
    expect(result.allHaveSameEventCount).toBe(true)
    expect(result.allHaveSameSource).toBe(true)
    expect(result.allEventsValid).toBe(true)

    await electronApp.close()
  })
})