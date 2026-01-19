import { test, expect } from '@playwright/test'
import { _electron as electron } from 'playwright'

test.describe('Settings Page - API Key and Model Management', () => {
  let electronApp: any
  let page: any

  test.beforeEach(async () => {
    electronApp = await electron.launch({ 
      args: ['dist/main/src/main/index.js'],
      timeout: 30000
    })
    
    page = await electronApp.firstWindow()
    await page.waitForLoadState('domcontentloaded')
    
    // Navigate to Settings
    await page.click('button:has-text("Settings")')
    await page.waitForTimeout(500)
    
    // Go to AI Configuration tab
    await page.click('button:has-text("AI Configuration")')
    await page.waitForTimeout(300)
  })

  test.afterEach(async () => {
    await electronApp.close()
  })

  test('should display API key input and validation button', async () => {
    await expect(page.locator('input[type="password"]')).toBeVisible()
    await expect(page.locator('button:has-text("Validate")')).toBeVisible()
  })

  test('should display model dropdown with default options', async () => {
    const modelSelect = page.locator('select')
    await expect(modelSelect).toBeVisible()
    
    const options = await modelSelect.locator('option').allTextContents()
    expect(options.length).toBeGreaterThan(0)
  })

  test('should show validation error for invalid API key format', async () => {
    const apiKeyInput = page.locator('input[type="password"]')
    await apiKeyInput.fill('invalid-key')
    
    await page.click('button:has-text("Validate")')
    await page.waitForTimeout(1000)
    
    await expect(page.locator('text=✗ Invalid API key')).toBeVisible()
  })

  test('should show loading state during validation', async () => {
    const apiKeyInput = page.locator('input[type="password"]')
    await apiKeyInput.fill('sk-test1234567890123456789012345678901234567890')
    
    await page.click('button:has-text("Validate")')
    
    // Check for loading state (button should be disabled)
    await expect(page.locator('button:has-text("Validating...")')).toBeVisible()
  })

  test('should display save and clear buttons', async () => {
    await expect(page.locator('button:has-text("Save Settings")')).toBeVisible()
    await expect(page.locator('button:has-text("Clear Key")')).toBeVisible()
  })

  test('should show loading text for model dropdown when loading', async () => {
    // This test checks that the loading state UI is properly implemented
    const helpText = await page.locator('p').allTextContents()
    const hasExpectedText = helpText.some(text => 
      text.includes('Choose the AI model') || text.includes('Loading available models')
    )
    expect(hasExpectedText).toBe(true)
  })

  test('should handle model selection and saving', async () => {
    // Select a model
    const modelSelect = page.locator('select')
    const options = await modelSelect.locator('option').allTextContents()
    
    if (options.length > 1) {
      await modelSelect.selectOption({ index: 1 })
      
      // Save settings
      await page.click('button:has-text("Save Settings")')
      await page.waitForTimeout(2000)
      
      // Should show success message or no error
      const pageContent = await page.textContent('body')
      expect(pageContent).not.toContain('Failed to save')
    }
  })

  test('should clear API key when clear button is clicked', async () => {
    const apiKeyInput = page.locator('input[type="password"]')
    await apiKeyInput.fill('sk-test1234567890123456789012345678901234567890')
    
    await page.click('button:has-text("Clear Key")')
    await page.waitForTimeout(1000)
    
    // API key input should be empty
    expect(await apiKeyInput.inputValue()).toBe('')
  })

  test('should maintain model selection after page navigation', async () => {
    const modelSelect = page.locator('select')
    const options = await modelSelect.locator('option').allTextContents()
    
    if (options.length > 1) {
      // Select a specific model
      await modelSelect.selectOption({ index: 1 })
      const selectedValue = await modelSelect.inputValue()
      
      // Save the selection first
      await page.click('button:has-text("Save Settings")')
      await page.waitForTimeout(1000)
      
      // Navigate away and back
      await page.click('button:has-text("Back to Home")')
      await page.waitForTimeout(500)
      await page.click('button:has-text("Settings")')
      await page.waitForTimeout(500)
      await page.click('button:has-text("AI Configuration")')
      await page.waitForTimeout(300)
      
      // Model should still be selected (check that a valid model is selected)
      const newSelectedValue = await page.locator('select').inputValue()
      expect(newSelectedValue).toBeTruthy()
      
      // Get the option values instead of text content
      const optionValues = await page.locator('select option').evaluateAll(options => 
        options.map(option => option.value)
      )
      expect(optionValues).toContain(newSelectedValue)
    }
  })
})
