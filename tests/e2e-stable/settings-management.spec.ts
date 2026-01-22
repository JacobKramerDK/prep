import { test, expect } from '@playwright/test'
import { createTestApp } from '../helpers/test-app-factory'
import { TestDataFactory } from '../helpers/test-data-factory'
import { RobustWaitPatterns } from '../helpers/robust-wait-patterns'
import { TestEnvironment } from '../config/test-environment'

test.describe('Settings Management - Stable Tests', () => {
  let testConfig: any

  test.beforeEach(async () => {
    // Setup isolated test environment
    testConfig = TestEnvironment.withMockedAPIs()
  })

  test.afterEach(async () => {
    // Cleanup test environment
    TestEnvironment.cleanup()
  })

  test('should display settings page without modifying production data', async () => {
    const { app, cleanup } = await createTestApp({
      testId: testConfig.testId,
      mockSettings: true
    })

    try {
      const page = await app.firstWindow()
      await RobustWaitPatterns.waitForElectronAPI(page)
      
      // Navigate to Settings using data-testid (will be added in component updates)
      const settingsButton = page.locator('[data-testid="settings-button"], button:has-text("Settings")')
      await expect(settingsButton).toBeVisible()
      await settingsButton.click()
      
      await RobustWaitPatterns.waitForSettingsToLoad(page)
      
      // Verify settings page loaded
      const settingsContainer = page.locator('[data-testid="settings-container"], .settings-container')
      await expect(settingsContainer).toBeVisible()
      
    } finally {
      await cleanup()
    }
  })

  test('should handle API key input without persistence', async () => {
    const { app, cleanup } = await createTestApp({
      testId: testConfig.testId,
      mockSettings: true
    })

    try {
      const page = await app.firstWindow()
      await RobustWaitPatterns.waitForElectronAPI(page)
      
      // Navigate to Settings -> AI Configuration
      await page.click('button:has-text("Settings")')
      await RobustWaitPatterns.waitForSettingsToLoad(page)
      
      await page.click('button:has-text("AI Configuration")')
      await page.waitForTimeout(300)
      
      // Test API key input
      const apiKeyInput = page.locator('[data-testid="api-key-input"], input[type="password"]')
      await expect(apiKeyInput).toBeVisible()
      
      const testApiKey = TestDataFactory.generateValidAPIKey('test')
      await apiKeyInput.fill(testApiKey)
      
      // Verify input value
      expect(await apiKeyInput.inputValue()).toBe(testApiKey)
      
      // Test validation button
      const validateButton = page.locator('[data-testid="validate-button"], button:has-text("Validate")')
      await expect(validateButton).toBeVisible()
      await validateButton.click()
      
      // Wait for validation result (should be mocked)
      await RobustWaitPatterns.waitForAPIValidation(page)
      
    } finally {
      await cleanup()
    }
  })

  test('should handle model selection without global state changes', async () => {
    const { app, cleanup } = await createTestApp({
      testId: testConfig.testId,
      mockSettings: true
    })

    try {
      const page = await app.firstWindow()
      await RobustWaitPatterns.waitForElectronAPI(page)
      
      // Navigate to AI Configuration
      await page.click('button:has-text("Settings")')
      await RobustWaitPatterns.waitForSettingsToLoad(page)
      await page.click('button:has-text("AI Configuration")')
      await page.waitForTimeout(300)
      
      // Test model selection
      const modelSelect = page.locator('[data-testid="model-select"], select')
      await expect(modelSelect).toBeVisible()
      
      // Get available options
      const options = await modelSelect.locator('option').allTextContents()
      expect(options.length).toBeGreaterThan(0)
      
      // Select a different model
      if (options.length > 1) {
        await modelSelect.selectOption({ index: 1 })
        
        // Verify selection changed
        const selectedValue = await modelSelect.inputValue()
        expect(selectedValue).toBeTruthy()
      }
      
    } finally {
      await cleanup()
    }
  })

  test('should clear API key without affecting production settings', async () => {
    const { app, cleanup } = await createTestApp({
      testId: testConfig.testId,
      mockSettings: true
    })

    try {
      const page = await app.firstWindow()
      await RobustWaitPatterns.waitForElectronAPI(page)
      
      // Navigate to AI Configuration
      await page.click('button:has-text("Settings")')
      await RobustWaitPatterns.waitForSettingsToLoad(page)
      await page.click('button:has-text("AI Configuration")')
      await page.waitForTimeout(300)
      
      // Fill API key
      const apiKeyInput = page.locator('[data-testid="api-key-input"], input[type="password"]')
      const testApiKey = TestDataFactory.generateValidAPIKey('clear-test')
      await apiKeyInput.fill(testApiKey)
      
      // Clear the key
      const clearButton = page.locator('[data-testid="clear-key-button"], button:has-text("Clear")')
      await expect(clearButton).toBeVisible()
      await clearButton.click()
      
      // Verify key is cleared
      await page.waitForTimeout(500)
      expect(await apiKeyInput.inputValue()).toBe('')
      
    } finally {
      await cleanup()
    }
  })

  test('should validate API key format correctly', async () => {
    const { app, cleanup } = await createTestApp({
      testId: testConfig.testId,
      mockSettings: true
    })

    try {
      const page = await app.firstWindow()
      await RobustWaitPatterns.waitForElectronAPI(page)
      
      // Navigate to AI Configuration
      await page.click('button:has-text("Settings")')
      await RobustWaitPatterns.waitForSettingsToLoad(page)
      await page.click('button:has-text("AI Configuration")')
      await page.waitForTimeout(300)
      
      const apiKeyInput = page.locator('[data-testid="api-key-input"], input[type="password"]')
      const validateButton = page.locator('[data-testid="validate-button"], button:has-text("Validate")')
      
      // Test invalid API key
      await apiKeyInput.fill('invalid-key')
      await validateButton.click()
      await RobustWaitPatterns.waitForAPIValidation(page)
      
      // Should show error for invalid format
      const errorMessage = page.locator('[data-testid="validation-error"], text=*Invalid*')
      await expect(errorMessage).toBeVisible()
      
      // Test valid API key format
      const validKey = TestDataFactory.generateValidAPIKey('format-test')
      await apiKeyInput.fill(validKey)
      await validateButton.click()
      await RobustWaitPatterns.waitForAPIValidation(page)
      
      // Should show success or different message (mocked response)
      const validationResult = page.locator('[data-testid="validation-result"], .validation-result')
      await expect(validationResult).toBeVisible()
      
    } finally {
      await cleanup()
    }
  })
})
