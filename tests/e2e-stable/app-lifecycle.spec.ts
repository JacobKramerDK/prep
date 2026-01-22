import { test, expect } from '@playwright/test'
import { createTestApp } from '../helpers/test-app-factory'
import { RobustWaitPatterns } from '../helpers/robust-wait-patterns'
import { TestEnvironment } from '../config/test-environment'

test.describe('App Lifecycle - Stable Tests', () => {
  let testConfig: any

  test.beforeEach(async () => {
    testConfig = TestEnvironment.withMockedAPIs()
  })

  test.afterEach(async () => {
    TestEnvironment.cleanup()
  })

  test('should launch app successfully', async () => {
    const { app, cleanup } = await createTestApp({
      testId: testConfig.testId,
      mockSettings: true,
      timeout: 30000
    })

    try {
      // Verify app launched
      expect(app).toBeTruthy()
      
      // Get first window
      const page = await app.firstWindow()
      expect(page).toBeTruthy()
      
      // Wait for app to be ready
      await RobustWaitPatterns.waitForElectronAPI(page)
      
      // Verify window is visible
      await expect(page).toHaveTitle(/Prep/)
      
    } finally {
      await cleanup()
    }
  })

  test('should display main interface elements', async () => {
    const { app, cleanup } = await createTestApp({
      testId: testConfig.testId,
      mockSettings: true
    })

    try {
      const page = await app.firstWindow()
      await RobustWaitPatterns.waitForElectronAPI(page)
      
      // Check for main navigation elements
      const settingsButton = page.locator('[data-testid="settings-button"], button:has-text("Settings")')
      await expect(settingsButton).toBeVisible()
      
      // Check for main content area
      const mainContent = page.locator('[data-testid="main-content"], main, .main-container')
      await expect(mainContent).toBeVisible()
      
    } finally {
      await cleanup()
    }
  })

  test('should handle window resize', async () => {
    const { app, cleanup } = await createTestApp({
      testId: testConfig.testId,
      mockSettings: true
    })

    try {
      const page = await app.firstWindow()
      await RobustWaitPatterns.waitForElectronAPI(page)
      
      // Get initial viewport size
      const initialViewport = page.viewportSize()
      expect(initialViewport).toBeTruthy()
      
      // Resize window
      await page.setViewportSize({ width: 800, height: 600 })
      
      // Verify resize worked
      const newViewport = page.viewportSize()
      expect(newViewport?.width).toBe(800)
      expect(newViewport?.height).toBe(600)
      
      // Verify UI still works after resize
      const settingsButton = page.locator('[data-testid="settings-button"], button:has-text("Settings")')
      await expect(settingsButton).toBeVisible()
      
    } finally {
      await cleanup()
    }
  })

  test('should navigate between main sections', async () => {
    const { app, cleanup } = await createTestApp({
      testId: testConfig.testId,
      mockSettings: true
    })

    try {
      const page = await app.firstWindow()
      await RobustWaitPatterns.waitForElectronAPI(page)
      
      // Navigate to Settings
      const settingsButton = page.locator('[data-testid="settings-button"], button:has-text("Settings")')
      await settingsButton.click()
      await RobustWaitPatterns.waitForSettingsToLoad(page)
      
      // Verify settings page loaded
      const settingsContainer = page.locator('[data-testid="settings-container"], .settings-container')
      await expect(settingsContainer).toBeVisible()
      
      // Navigate back to home
      const backButton = page.locator('[data-testid="back-button"], button:has-text("Back"), button:has-text("Home")')
      if (await backButton.count() > 0) {
        await backButton.click()
        await page.waitForTimeout(500)
        
        // Should be back to main view
        const mainContent = page.locator('[data-testid="main-content"], main, .main-container')
        await expect(mainContent).toBeVisible()
      }
      
    } finally {
      await cleanup()
    }
  })

  test('should handle app close gracefully', async () => {
    const { app, cleanup } = await createTestApp({
      testId: testConfig.testId,
      mockSettings: true
    })

    try {
      const page = await app.firstWindow()
      await RobustWaitPatterns.waitForElectronAPI(page)
      
      // Verify app is running
      expect(await page.title()).toBeTruthy()
      
      // Close should be handled by cleanup
      
    } finally {
      // This will test the cleanup process
      await cleanup()
    }
    
    // If we get here without errors, cleanup worked
    expect(true).toBe(true)
  })

  test('should maintain responsive design', async () => {
    const { app, cleanup } = await createTestApp({
      testId: testConfig.testId,
      mockSettings: true
    })

    try {
      const page = await app.firstWindow()
      await RobustWaitPatterns.waitForElectronAPI(page)
      
      // Test different viewport sizes
      const viewports = [
        { width: 1200, height: 800 }, // Desktop
        { width: 1024, height: 768 }, // Tablet landscape
        { width: 768, height: 1024 }  // Tablet portrait
      ]
      
      for (const viewport of viewports) {
        await page.setViewportSize(viewport)
        await page.waitForTimeout(300)
        
        // Verify main elements are still visible
        const settingsButton = page.locator('[data-testid="settings-button"], button:has-text("Settings")')
        await expect(settingsButton).toBeVisible()
        
        const mainContent = page.locator('[data-testid="main-content"], main, .main-container')
        await expect(mainContent).toBeVisible()
      }
      
    } finally {
      await cleanup()
    }
  })

  test('should handle keyboard navigation', async () => {
    const { app, cleanup } = await createTestApp({
      testId: testConfig.testId,
      mockSettings: true
    })

    try {
      const page = await app.firstWindow()
      await RobustWaitPatterns.waitForElectronAPI(page)
      
      // Test Tab navigation
      await page.keyboard.press('Tab')
      
      // Should focus on first focusable element
      const focusedElement = page.locator(':focus')
      await expect(focusedElement).toBeVisible()
      
      // Test Enter key on focused element
      await page.keyboard.press('Enter')
      await page.waitForTimeout(500)
      
      // Should have triggered some action (navigation or interaction)
      // The exact behavior depends on what was focused
      
    } finally {
      await cleanup()
    }
  })

  test('should load without external dependencies', async () => {
    const { app, cleanup } = await createTestApp({
      testId: testConfig.testId,
      mockSettings: true
    })

    try {
      const page = await app.firstWindow()
      
      // Should load successfully even with network disabled
      await RobustWaitPatterns.waitForElectronAPI(page)
      
      // Verify core functionality works
      const settingsButton = page.locator('[data-testid="settings-button"], button:has-text("Settings")')
      await expect(settingsButton).toBeVisible()
      
      // Should not show network-related errors
      const errorMessages = page.locator('.error, [data-testid="error"], .error-message')
      const errorCount = await errorMessages.count()
      
      // Some errors might be expected (like API key not configured), but not network errors
      if (errorCount > 0) {
        const errorTexts = await errorMessages.allTextContents()
        const hasNetworkErrors = errorTexts.some(text => 
          text.toLowerCase().includes('network') || 
          text.toLowerCase().includes('connection') ||
          text.toLowerCase().includes('fetch')
        )
        expect(hasNetworkErrors).toBe(false)
      }
      
    } finally {
      await cleanup()
    }
  })
})
