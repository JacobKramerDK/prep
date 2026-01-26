import { test, expect } from '@playwright/test'
import { createTestApp } from '../helpers/test-app-factory'
import { RobustWaitPatterns } from '../helpers/robust-wait-patterns'

test.describe('New Transcription Models - Feature Tests', () => {
  test('should display all three transcription models in settings', async () => {
    const { app, cleanup } = await createTestApp({
      testId: 'transcription-models-test',
      mockSettings: true
    })

    try {
      const page = await app.firstWindow()
      await RobustWaitPatterns.waitForAppInitialization(page)

      // Navigate to settings
      const settingsButton = page.locator('[data-testid="settings-button"]')
      await settingsButton.click()
      await RobustWaitPatterns.waitForAppInitialization(page)

      // Check transcription model dropdown
      const transcriptionModelSelect = page.locator('[data-testid="transcription-model-select"]')
      await expect(transcriptionModelSelect).toBeVisible()

      // Verify all three models are available
      const options = await transcriptionModelSelect.locator('option').allTextContents()
      expect(options).toContain('Whisper-1 (Original - Duration Billing)')
      expect(options).toContain('GPT-4o Mini Transcribe (Fast & Accurate - Token Billing)')
      expect(options).toContain('GPT-4o Transcribe (Highest Quality - Token Billing)')

    } finally {
      await cleanup()
    }
  })
})
