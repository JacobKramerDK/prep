import { test, expect } from '@playwright/test'
import { _electron as electron } from 'playwright'

test.describe('Brief Generation Debug', () => {
  let electronApp: any
  let page: any

  test.beforeEach(async () => {
    electronApp = await electron.launch({
      args: ['dist/main/index.js'],
      timeout: 30000
    })
    
    page = await electronApp.firstWindow()
    await page.waitForLoadState('domcontentloaded')
  })

  test.afterEach(async () => {
    await electronApp.close()
  })

  test('should find brief generation form elements', async () => {
    // Look for the brief generator form
    const textarea = page.locator('textarea[placeholder*="context"]')
    const generateButton = page.locator('button:has-text("Generate Brief")')
    
    await expect(textarea).toBeVisible()
    await expect(generateButton).toBeVisible()
    
    console.log('Form elements found successfully')
  })

  test('should handle form submission', async () => {
    // Fill the form
    const textarea = page.locator('textarea[placeholder*="context"]')
    await textarea.fill('Test meeting context for debugging')
    
    // Try to submit
    const generateButton = page.locator('button:has-text("Generate Brief")')
    await generateButton.click()
    
    // Check for error message or loading state
    await page.waitForTimeout(2000)
    
    // Look for error messages or loading indicators
    const errorMessage = page.locator('text=*error*')
    const loadingIndicator = page.locator('text=Generating')
    
    const hasError = await errorMessage.count() > 0
    const isLoading = await loadingIndicator.count() > 0
    
    console.log('Form submission result:', { hasError, isLoading })
    
    // We expect either an error (no API key) or loading state
    expect(hasError || isLoading).toBe(true)
  })
})
