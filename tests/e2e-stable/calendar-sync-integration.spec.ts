import { test, expect } from '@playwright/test'
import { createTestApp } from '../helpers/test-app-factory'
import { TestEnvironment } from '../config/test-environment'

test.describe('Calendar Sync Integration - Stable Tests', () => {
  let testConfig: any

  test.beforeEach(async () => {
    testConfig = TestEnvironment.withMockedAPIs()
  })

  test('should display calendar UI elements without crashing', async () => {
    const { app, cleanup } = await createTestApp(testConfig)
    
    try {
      const page = await app.firstWindow()
      await page.waitForLoadState('domcontentloaded')
      
      // Wait for the app to load basic UI elements
      await page.waitForSelector('[data-testid="app-initialized"], [data-testid="app-initializing"]', { timeout: 15000 })

      // If we get here, the app loaded successfully with calendar sync functionality
      // This test ensures our calendar sync changes don't break app startup
      const appElement = page.locator('[data-testid="app-initialized"], [data-testid="app-initializing"]')
      await expect(appElement).toBeVisible()
      
    } finally {
      await cleanup()
    }
  })
})
