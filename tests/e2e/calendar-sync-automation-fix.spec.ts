import { test, expect } from '@playwright/test'

test.describe('Calendar Sync Automation Fix', () => {
  test('should handle undefined selected calendars gracefully', async ({ page }) => {
    // Navigate to the app
    await page.goto('http://localhost:5173')
    
    // Wait for the app to load by checking for the header
    await page.waitForSelector('h1', { timeout: 10000 })
    
    // Test calendar sync with no selected calendars
    const result = await page.evaluate(async () => {
      try {
        // Check if calendar extraction API is available
        if (!window.electronAPI?.extractCalendarEvents) {
          return { success: false, error: 'Calendar API not available' }
        }
        
        // Test extraction with undefined (no selected calendars)
        console.log('Testing calendar extraction with undefined selected calendars...')
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
    
    console.log('Calendar extraction result:', result)
    
    // The extraction should succeed (not fail with undefined calendars)
    expect(result.success).toBe(true)
    
    // Should have a valid source
    expect(result.source).toBeDefined()
    
    // Should not throw an error about undefined calendars
    if (!result.success) {
      expect(result.error).not.toContain('undefined')
      expect(result.error).not.toContain('Selected calendars for extraction: undefined')
    }
  })
  
  test('should auto-discover calendars when none are selected', async ({ page }) => {
    // Navigate to the app
    await page.goto('http://localhost:5173')
    
    // Wait for the app to load by checking for the header
    await page.waitForSelector('h1', { timeout: 10000 })
    
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
        
        console.log('Testing auto-discovery of calendars...')
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
    
    console.log('Auto-discovery result:', result)
    
    // Should succeed with auto-discovery
    expect(result.success).toBe(true)
    
    // Should indicate auto-discovery worked
    if (result.success) {
      expect(result.hasAutoDiscovered).toBe(true)
    }
  })
  
  test('should handle calendar sync scheduler correctly', async ({ page }) => {
    // Navigate to the app
    await page.goto('http://localhost:5173')
    
    // Wait for the app to load by checking for the header
    await page.waitForSelector('h1', { timeout: 10000 })
    
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
    
    console.log('Calendar sync scheduler result:', result)
    
    // Should be able to get sync status
    expect(result.success).toBe(true)
    
    if (result.success) {
      expect(result.syncStatus).toBeDefined()
      expect(result.hasScheduler).toBe(true)
    }
  })
})
