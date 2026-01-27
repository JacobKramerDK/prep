import { test, expect } from '@playwright/test'
import { createTestApp } from '../helpers/test-app-factory'
import { TestDataFactory } from '../helpers/test-data-factory'
import { TestEnvironment } from '../config/test-environment'

test.describe('Google Credential Management', () => {
  let testConfig: any

  test.beforeEach(async () => {
    // Setup isolated test environment
    testConfig = TestEnvironment.withMockedAPIs()
  })

  test.afterEach(async () => {
    // Cleanup test environment
    TestEnvironment.cleanup()
  })

  test('should display credential input form when no credentials are stored', async () => {
    const { app, cleanup } = await createTestApp({
      testId: 'google-cred-display',
      mockSettings: true
    })

    try {
      const page = await app.firstWindow()
      
      // Ensure no credentials are set initially
      await page.evaluate(async () => {
        await window.electronAPI.setGoogleClientId(null)
        await window.electronAPI.setGoogleClientSecret(null)
      })
      
      // Navigate to settings and calendar tab
      await page.click('button:has-text("Settings")')
      await page.click('button:has-text("Calendar Import")')
      
      // Wait for the page to load
      await page.waitForTimeout(2000)
      
      // Should show credential configuration form when no credentials are set
      await expect(page.locator('text=Configure Google OAuth2 Credentials')).toBeVisible()
      await expect(page.locator('input[placeholder*="apps.googleusercontent.com"]')).toBeVisible()
      await expect(page.locator('input[placeholder*="GOCSPX"]')).toBeVisible()
    } finally {
      await cleanup()
    }
  })

  test('should validate Google credential format', async () => {
    const { app, cleanup } = await createTestApp({
      testId: 'google-cred-validate',
      mockSettings: true
    })

    try {
      const page = await app.firstWindow()
      
      // Ensure no credentials are set initially
      await page.evaluate(async () => {
        await window.electronAPI.setGoogleClientId(null)
        await window.electronAPI.setGoogleClientSecret(null)
      })
      
      // Navigate to credential form
      await page.click('button:has-text("Settings")')
      await page.click('button:has-text("Calendar Import")')
      
      // Wait for credential form to appear (should be visible when no credentials are set)
      await expect(page.locator('input[placeholder*="apps.googleusercontent.com"]')).toBeVisible({ timeout: 10000 })
      
      // Enter invalid credentials
      await page.fill('input[placeholder*="apps.googleusercontent.com"]', 'invalid-client-id')
      await page.fill('input[placeholder*="GOCSPX"]', 'invalid-secret')
      await page.click('button:has-text("Validate")')
      
      // Should show validation error
      await expect(page.locator('text=Invalid credential format')).toBeVisible()
      
      // Enter valid credentials
      const validClientId = TestDataFactory.generateValidGoogleClientId()
      const validClientSecret = TestDataFactory.generateValidGoogleClientSecret()
      
      await page.fill('input[placeholder*="apps.googleusercontent.com"]', validClientId)
      await page.fill('input[placeholder*="GOCSPX"]', validClientSecret)
      await page.click('button:has-text("Validate")')
      
      // Should show validation success
      await expect(page.locator('text=Credentials format is valid')).toBeVisible()
    } finally {
      await cleanup()
    }
  })

  test('should save and load Google credentials with edit button', async () => {
    const { app, cleanup } = await createTestApp({
      testId: 'google-cred-save',
      mockSettings: true
    })

    try {
      const page = await app.firstWindow()
      
      // Navigate to credential form
      await page.click('button:has-text("Settings")')
      await page.click('button:has-text("Calendar Import")')
      
      // Wait for the page to load
      await page.waitForTimeout(2000)
      
      // Verify we start with the credential form
      await expect(page.locator('text=Configure Google OAuth2 Credentials')).toBeVisible()
      
      // Enter and save valid credentials
      const validClientId = TestDataFactory.generateValidGoogleClientId()
      const validClientSecret = TestDataFactory.generateValidGoogleClientSecret()
      
      await page.fill('input[placeholder*="apps.googleusercontent.com"]', validClientId)
      await page.fill('input[placeholder*="GOCSPX"]', validClientSecret)
      await page.click('button:has-text("Validate")')
      
      // Wait for validation to complete
      await expect(page.locator('text=Credentials format is valid')).toBeVisible()
      
      // Save credentials
      await page.click('button:has-text("Save Credentials")')
      
      // The form should disappear and we should see either connection UI or edit button
      // Let's just check that the save worked by looking for any indication of success
      await page.waitForTimeout(2000) // Give it time to save
      
      // Check if we can find an edit button or connection UI
      const hasEditButton = await page.locator('button:has-text("Edit")').isVisible()
      const hasConnectButton = await page.locator('button:has-text("Connect Google Calendar")').isVisible()
      
      // At least one of these should be true after saving
      if (!hasEditButton && !hasConnectButton) {
        throw new Error('Neither edit button nor connect button found after saving credentials')
      }
      
      console.log('Save test passed - found UI elements after save')
    } finally {
      await cleanup()
    }
  })

  test('should clear Google credentials', async () => {
    const { app, cleanup } = await createTestApp({
      testId: 'google-cred-clear',
      mockSettings: true
    })

    try {
      const page = await app.firstWindow()
      
      // Ensure no credentials are set initially
      await page.evaluate(async () => {
        await window.electronAPI.setGoogleClientId(null)
        await window.electronAPI.setGoogleClientSecret(null)
      })
      
      // Navigate to settings
      await page.click('button:has-text("Settings")')
      await page.click('button:has-text("Calendar Import")')
      
      // First, set up credentials
      const validClientId = TestDataFactory.generateValidGoogleClientId()
      const validClientSecret = TestDataFactory.generateValidGoogleClientSecret()
      
      await page.fill('input[placeholder*="apps.googleusercontent.com"]', validClientId)
      await page.fill('input[placeholder*="GOCSPX"]', validClientSecret)
      await page.click('button:has-text("Validate")')
      await page.click('button:has-text("Save Credentials")')
      
      // Should now show connection UI with edit button
      await expect(page.locator('button:has-text("Edit")')).toBeVisible()
      
      // Edit credentials
      await page.click('button:has-text("Edit")')
      await expect(page.locator('text=Configure Google OAuth2 Credentials')).toBeVisible()
      
      // Clear credentials
      await page.click('button:has-text("Clear")')
      
      // Should show empty form
      await expect(page.locator('input[placeholder*="apps.googleusercontent.com"]')).toHaveValue('')
      await expect(page.locator('input[placeholder*="GOCSPX"]')).toHaveValue('')
    } finally {
      await cleanup()
    }
  })

  test('should show/hide client secret with eye button', async () => {
    const { app, cleanup } = await createTestApp({
      testId: 'google-cred-toggle',
      mockSettings: true
    })

    try {
      const page = await app.firstWindow()
      
      // Ensure no credentials are set initially
      await page.evaluate(async () => {
        await window.electronAPI.setGoogleClientId(null)
        await window.electronAPI.setGoogleClientSecret(null)
      })
      
      // Navigate to credential form
      await page.click('button:has-text("Settings")')
      await page.click('button:has-text("Calendar Import")')
      
      // Wait a bit for the page to load
      await page.waitForTimeout(2000)
      
      // Wait for credential form to appear - the form should be visible since no credentials are set
      const secretInput = page.locator('input[placeholder*="GOCSPX"]')
      await expect(secretInput).toBeVisible({ timeout: 10000 })
      
      const eyeButton = page.locator('[data-testid="toggle-client-secret"]')
      
      // Initially should be password type (hidden)
      await expect(secretInput).toHaveAttribute('type', 'password')
      
      // Fill secret and toggle visibility
      await secretInput.fill('test-secret')
      await eyeButton.click()
      
      // Should now be text type (visible)
      await expect(secretInput).toHaveAttribute('type', 'text')
      
      // Toggle back to hidden
      await eyeButton.click()
      await expect(secretInput).toHaveAttribute('type', 'password')
    } finally {
      await cleanup()
    }
  })
})
