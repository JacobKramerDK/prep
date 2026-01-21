import { test, expect } from '@playwright/test'
import { _electron as electron } from 'playwright'

test.describe('Brief Generation Issue Debug', () => {
  let electronApp: any
  let page: any

  test.beforeEach(async () => {
    electronApp = await electron.launch({
      args: ['dist/main/index.js'],
      timeout: 30000
    })
    
    page = await electronApp.firstWindow()
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(2000) // Wait for app to fully load
  })

  test.afterEach(async () => {
    if (electronApp) {
      await electronApp.close()
    }
  })

  test('should show API key configuration error when generating brief', async () => {
    // Look for meetings section
    const meetingsSection = page.locator('text=Today\'s Meetings')
    await expect(meetingsSection).toBeVisible({ timeout: 10000 })
    
    // Look for any meeting or create a test scenario
    // First, let's see if there are any meetings
    const meetingCards = page.locator('[data-testid="meeting-card"]')
    const meetingCount = await meetingCards.count()
    
    console.log(`Found ${meetingCount} meetings`)
    
    if (meetingCount > 0) {
      // Click on the first meeting to expand it
      await meetingCards.first().click()
      await page.waitForTimeout(1000)
      
      // Look for the brief generation form
      const textarea = page.locator('textarea[placeholder*="context"]')
      const generateButton = page.locator('button:has-text("Generate Brief")')
      
      if (await textarea.isVisible() && await generateButton.isVisible()) {
        // Fill the form and submit
        await textarea.fill('Test meeting context for debugging')
        await generateButton.click()
        
        // Wait for error message
        await page.waitForTimeout(3000)
        
        // Check for API key error
        const errorMessage = page.locator('text=*API key*')
        const hasApiKeyError = await errorMessage.count() > 0
        
        console.log('API key error found:', hasApiKeyError)
        
        if (hasApiKeyError) {
          const errorText = await errorMessage.textContent()
          console.log('Error message:', errorText)
          expect(errorText).toContain('API key')
        } else {
          // Check for any other error messages
          const anyError = page.locator('[class*="error"], [class*="danger"], text=*error*')
          const errorCount = await anyError.count()
          console.log(`Found ${errorCount} error elements`)
          
          if (errorCount > 0) {
            const errorTexts = await anyError.allTextContents()
            console.log('Error messages:', errorTexts)
          }
        }
      } else {
        console.log('Brief generation form not found')
        console.log('Textarea visible:', await textarea.isVisible())
        console.log('Generate button visible:', await generateButton.isVisible())
      }
    } else {
      console.log('No meetings found - this is expected in test environment')
    }
  })
})
