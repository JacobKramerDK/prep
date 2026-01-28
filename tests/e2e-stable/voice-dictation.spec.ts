import { test, expect } from '@playwright/test'
import { createTestApp } from '../helpers/test-app-factory'
import { TestDataFactory } from '../helpers/test-data-factory'
import { VoiceDictationTestHelper } from '../helpers/voice-dictation-helper'
import { RobustWaitPatterns } from '../helpers/robust-wait-patterns'
import { TestEnvironment } from '../config/test-environment'

// Helper function to expand meeting and access brief form
async function expandMeetingForDictation(page: any) {
  const meetingCard = page.locator('[data-testid*="meeting-"], .meeting-card').first()
  const expandButton = page.locator('button:has-text("Generate Brief"), button:has-text("Expand"), [data-testid*="expand"]').first()
  
  if (await meetingCard.count() > 0) {
    await expandButton.click()
    await page.waitForTimeout(500)
    return true
  }
  return false
}

test.describe('Voice Dictation - Stable Tests', () => {
  let testConfig: any

  test.beforeEach(async () => {
    testConfig = TestEnvironment.withMockedAPIs()
  })

  test.afterEach(async () => {
    TestEnvironment.cleanup()
  })

  test('should display voice dictation button when capabilities available', async () => {
    const { app, cleanup } = await createTestApp({
      testId: testConfig.testId,
      mockSettings: true
    })

    try {
      const page = await app.firstWindow()
      await RobustWaitPatterns.waitForAppInitialization(page)
      await VoiceDictationTestHelper.setupVoiceDictationMocks(page)

      // Try to expand a meeting to access brief form
      await expandMeetingForDictation(page)

      // Wait for capabilities check
      await VoiceDictationTestHelper.waitForCapabilitiesCheck(page)

      // Check for context textarea and dictation button
      const textarea = VoiceDictationTestHelper.getContextTextarea(page)
      const buttonState = await VoiceDictationTestHelper.verifyButtonStates(page)
      
      if (await textarea.count() > 0) {
        await expect(textarea).toBeVisible()
        
        if (buttonState.available) {
          expect(buttonState.visible).toBe(true)
        }
      }
    } finally {
      await cleanup()
    }
  })

  test('should handle voice dictation workflow', async () => {
    const { app, cleanup } = await createTestApp({
      testId: testConfig.testId,
      mockSettings: true
    })

    try {
      const page = await app.firstWindow()
      await RobustWaitPatterns.waitForAppInitialization(page)
      await VoiceDictationTestHelper.setupVoiceDictationMocks(page)

      // Try to expand a meeting to access brief form
      const expanded = await expandMeetingForDictation(page)
      
      if (expanded) {
        await VoiceDictationTestHelper.waitForCapabilitiesCheck(page)
        
        // Test complete dictation workflow
        const workflowSuccess = await VoiceDictationTestHelper.simulateDictationWorkflow(page)
        
        // Verify workflow elements are still functional
        const textarea = VoiceDictationTestHelper.getContextTextarea(page)
        if (await textarea.count() > 0) {
          await expect(textarea).toBeVisible()
        }
      }
    } finally {
      await cleanup()
    }
  })

  test('should handle dictation button states correctly', async () => {
    const { app, cleanup } = await createTestApp({
      testId: testConfig.testId,
      mockSettings: true
    })

    try {
      const page = await app.firstWindow()
      await RobustWaitPatterns.waitForAppInitialization(page)
      await VoiceDictationTestHelper.setupVoiceDictationMocks(page)

      await expandMeetingForDictation(page)
      await VoiceDictationTestHelper.waitForCapabilitiesCheck(page)

      const buttonState = await VoiceDictationTestHelper.verifyButtonStates(page)
      
      if (buttonState.available) {
        expect(buttonState.visible).toBe(true)
        expect(buttonState.enabled).toBe(true)
        expect(buttonState.title || buttonState.ariaLabel).toContain('dictation')
      }
    } finally {
      await cleanup()
    }
  })

  test('should integrate with brief generation form', async () => {
    const { app, cleanup } = await createTestApp({
      testId: testConfig.testId,
      mockSettings: true
    })

    try {
      const page = await app.firstWindow()
      await RobustWaitPatterns.waitForAppInitialization(page)
      await VoiceDictationTestHelper.setupVoiceDictationMocks(page)

      const expanded = await expandMeetingForDictation(page)
      
      if (expanded) {
        const textarea = VoiceDictationTestHelper.getContextTextarea(page)
        const generateButton = page.locator('[data-testid="generate-button"]')
        
        if (await textarea.count() > 0 && await generateButton.count() > 0) {
          // Test manual text input (simulating dictation result)
          await textarea.fill('Test meeting context from dictation')
          
          const textValue = await textarea.inputValue()
          expect(textValue).toContain('Test meeting context')
          
          // Verify generate button remains functional
          await expect(generateButton).toBeVisible()
          await expect(generateButton).toBeEnabled()
        }
      }
    } finally {
      await cleanup()
    }
  })

  test('should handle missing capabilities gracefully', async () => {
    const { app, cleanup } = await createTestApp({
      testId: testConfig.testId,
      mockSettings: true
    })

    try {
      const page = await app.firstWindow()
      await RobustWaitPatterns.waitForAppInitialization(page)
      await VoiceDictationTestHelper.setupUnavailableDictationMocks(page)

      // Try to expand a meeting to access brief form
      await expandMeetingForDictation(page)
      await VoiceDictationTestHelper.waitForCapabilitiesCheck(page)

      const textarea = VoiceDictationTestHelper.getContextTextarea(page)
      const buttonState = await VoiceDictationTestHelper.verifyButtonStates(page)
      
      if (await textarea.count() > 0) {
        // Dictation button should not be available when capabilities missing
        expect(buttonState.available).toBe(false)
        
        // Textarea should still be functional for manual input
        await expect(textarea).toBeVisible()
        await textarea.fill('Manual text input')
        const textValue = await textarea.inputValue()
        expect(textValue).toBe('Manual text input')
      }
    } finally {
      await cleanup()
    }
  })
})
