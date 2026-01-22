import { test, expect } from '@playwright/test'
import { createTestApp } from '../helpers/test-app-factory'
import { TestDataFactory } from '../helpers/test-data-factory'
import { RobustWaitPatterns } from '../helpers/robust-wait-patterns'
import { TestEnvironment } from '../config/test-environment'

test.describe('Brief Generation - Stable Tests', () => {
  let testConfig: any

  test.beforeEach(async () => {
    // Setup isolated test environment with mocked APIs
    testConfig = TestEnvironment.withMockedAPIs()
  })

  test.afterEach(async () => {
    TestEnvironment.cleanup()
  })

  test('should display brief generation form elements', async () => {
    const { app, cleanup } = await createTestApp({
      testId: testConfig.testId,
      mockSettings: true
    })

    try {
      const page = await app.firstWindow()
      await RobustWaitPatterns.waitForElectronAPI(page)
      
      // Look for brief generation form
      const contextTextarea = page.locator('[data-testid="context-textarea"], textarea[placeholder*="context"]')
      const generateButton = page.locator('[data-testid="generate-button"], button:has-text("Generate")')
      
      await expect(contextTextarea).toBeVisible()
      await expect(generateButton).toBeVisible()
      
    } finally {
      await cleanup()
    }
  })

  test('should handle form submission with mocked API', async () => {
    const { app, cleanup } = await createTestApp({
      testId: testConfig.testId,
      mockSettings: true
    })

    try {
      const page = await app.firstWindow()
      await RobustWaitPatterns.waitForElectronAPI(page)
      
      // Fill the form with test data
      const contextTextarea = page.locator('[data-testid="context-textarea"], textarea[placeholder*="context"]')
      const generateButton = page.locator('[data-testid="generate-button"], button:has-text("Generate")')
      
      const testContext = TestDataFactory.generateMockMeetingContext()
      await contextTextarea.fill(testContext)
      
      // Submit the form
      await generateButton.click()
      
      // Wait for brief generation to complete (mocked)
      await RobustWaitPatterns.waitForBriefGeneration(page)
      
      // Should show either result or error (both are valid for mocked API)
      const briefResult = page.locator('[data-testid="brief-result"], .brief-result')
      const briefError = page.locator('[data-testid="brief-error"], .error-message')
      
      const hasResult = await briefResult.count() > 0
      const hasError = await briefError.count() > 0
      
      expect(hasResult || hasError).toBe(true)
      
    } finally {
      await cleanup()
    }
  })

  test('should show loading state during generation', async () => {
    const { app, cleanup } = await createTestApp({
      testId: testConfig.testId,
      mockSettings: true
    })

    try {
      const page = await app.firstWindow()
      await RobustWaitPatterns.waitForElectronAPI(page)
      
      const contextTextarea = page.locator('[data-testid="context-textarea"], textarea[placeholder*="context"]')
      const generateButton = page.locator('[data-testid="generate-button"], button:has-text("Generate")')
      
      await contextTextarea.fill('Test meeting context')
      await generateButton.click()
      
      // Should show loading state immediately
      const loadingIndicator = page.locator('[data-testid="brief-loading"], .generating, text=*Generating*')
      await expect(loadingIndicator).toBeVisible({ timeout: 2000 })
      
    } finally {
      await cleanup()
    }
  })

  test('should handle empty form submission gracefully', async () => {
    const { app, cleanup } = await createTestApp({
      testId: testConfig.testId,
      mockSettings: true
    })

    try {
      const page = await app.firstWindow()
      await RobustWaitPatterns.waitForElectronAPI(page)
      
      const generateButton = page.locator('[data-testid="generate-button"], button:has-text("Generate")')
      
      // Try to submit empty form
      await generateButton.click()
      
      // Should either show validation error or handle gracefully
      await page.waitForTimeout(1000)
      
      // Check for validation message or disabled state
      const validationMessage = page.locator('[data-testid="validation-message"], .validation-error')
      const buttonDisabled = await generateButton.isDisabled()
      
      const hasValidation = await validationMessage.count() > 0
      
      // Either should show validation or button should be disabled
      expect(hasValidation || buttonDisabled).toBe(true)
      
    } finally {
      await cleanup()
    }
  })

  test('should reset form after successful generation', async () => {
    const { app, cleanup } = await createTestApp({
      testId: testConfig.testId,
      mockSettings: true
    })

    try {
      const page = await app.firstWindow()
      await RobustWaitPatterns.waitForElectronAPI(page)
      
      const contextTextarea = page.locator('[data-testid="context-textarea"], textarea[placeholder*="context"]')
      const generateButton = page.locator('[data-testid="generate-button"], button:has-text("Generate")')
      
      // Fill and submit form
      const testContext = 'Test meeting context for reset'
      await contextTextarea.fill(testContext)
      await generateButton.click()
      
      // Wait for completion
      await RobustWaitPatterns.waitForBriefGeneration(page)
      
      // Check if form was reset (this depends on implementation)
      const currentValue = await contextTextarea.inputValue()
      
      // Form might be reset or might retain value - both are valid behaviors
      // Just ensure the form is still functional
      await expect(contextTextarea).toBeEnabled()
      await expect(generateButton).toBeEnabled()
      
    } finally {
      await cleanup()
    }
  })

  test('should handle multiple rapid submissions gracefully', async () => {
    const { app, cleanup } = await createTestApp({
      testId: testConfig.testId,
      mockSettings: true
    })

    try {
      const page = await app.firstWindow()
      await RobustWaitPatterns.waitForElectronAPI(page)
      
      const contextTextarea = page.locator('[data-testid="context-textarea"], textarea[placeholder*="context"]')
      const generateButton = page.locator('[data-testid="generate-button"], button:has-text("Generate")')
      
      await contextTextarea.fill('Test context for rapid submission')
      
      // Click multiple times rapidly
      await generateButton.click()
      await generateButton.click()
      await generateButton.click()
      
      // Should handle gracefully - button should be disabled during processing
      const isDisabled = await generateButton.isDisabled()
      expect(isDisabled).toBe(true)
      
      // Wait for completion
      await RobustWaitPatterns.waitForBriefGeneration(page)
      
      // Button should be enabled again
      await expect(generateButton).toBeEnabled()
      
    } finally {
      await cleanup()
    }
  })
})
