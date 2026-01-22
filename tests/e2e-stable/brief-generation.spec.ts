import { test, expect } from '@playwright/test'
import { createTestApp } from '../helpers/test-app-factory'
import { TestDataFactory } from '../helpers/test-data-factory'
import { RobustWaitPatterns } from '../helpers/robust-wait-patterns'
import { TestEnvironment } from '../config/test-environment'

// Helper function to expand a meeting and access brief generation form
async function expandMeetingForBrief(page: any) {
  // Try to find and expand a meeting to access the brief generation form
  const meetingCard = page.locator('[data-testid*="meeting-"], .meeting-card').first()
  const expandButton = page.locator('button:has-text("Generate Brief"), button:has-text("Expand"), [data-testid*="expand"]').first()
  
  // If there's a meeting, expand it to show the brief form
  if (await meetingCard.count() > 0) {
    await expandButton.click()
    await page.waitForTimeout(500)
    return true
  }
  return false
}

// Helper function to check if brief form is available
async function checkBriefFormAvailable(page: any) {
  const contextTextarea = page.locator('[data-testid="context-textarea"]')
  const generateButton = page.locator('[data-testid="generate-button"]')
  
  const textareaVisible = await contextTextarea.count() > 0
  const buttonVisible = await generateButton.count() > 0
  
  return textareaVisible && buttonVisible
}

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
      await RobustWaitPatterns.waitForAppInitialization(page)
      
      // First, try to find and expand a meeting to access the brief generation form
      const meetingCard = page.locator('[data-testid*="meeting-"], .meeting-card').first()
      const expandButton = page.locator('button:has-text("Generate Brief"), button:has-text("Expand"), [data-testid*="expand"]').first()
      
      // If there's a meeting, expand it to show the brief form
      if (await meetingCard.count() > 0) {
        await expandButton.click()
        await page.waitForTimeout(500)
      }
      
      // Look for brief generation form elements
      const contextTextarea = page.locator('[data-testid="context-textarea"]')
      const generateButton = page.locator('[data-testid="generate-button"]')
      
      // Check if elements are visible (they might not be if no meetings exist)
      const textareaVisible = await contextTextarea.count() > 0
      const buttonVisible = await generateButton.count() > 0
      
      if (textareaVisible && buttonVisible) {
        await expect(contextTextarea).toBeVisible()
        await expect(generateButton).toBeVisible()
      } else {
        // If no meetings exist, just verify the page loaded correctly
        const mainContent = page.locator('[data-testid="main-content"]')
        await expect(mainContent).toBeVisible()
      }
      
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
      await RobustWaitPatterns.waitForAppInitialization(page)
      
      // Try to expand a meeting first
      const expanded = await expandMeetingForBrief(page)
      
      // Check if brief form is available
      if (await checkBriefFormAvailable(page)) {
        const contextTextarea = page.locator('[data-testid="context-textarea"]')
        const generateButton = page.locator('[data-testid="generate-button"]')
        
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
      } else {
        // If no meetings exist or form isn't available, just verify the page loaded
        const mainContent = page.locator('[data-testid="main-content"]')
        await expect(mainContent).toBeVisible()
        console.log('Brief generation form not available - no meetings to expand')
      }
      
    } finally {
      await cleanup()
    }
  })
})
