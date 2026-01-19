import { test, expect } from '@playwright/test'
import { _electron as electron } from 'playwright'

test('Functionality Verification - New Design', async () => {
  const electronApp = await electron.launch({ 
    args: ['dist/main/src/main/index.js'],
    timeout: 30000
  })
  
  const page = await electronApp.firstWindow()
  await page.waitForLoadState('domcontentloaded')
  
  // Verify the new design is loaded
  await expect(page.locator('h1')).toContainText('Prep')
  
  // Verify Settings button is functional
  const settingsButton = page.locator('button:has-text("Settings")').first()
  await expect(settingsButton).toBeVisible()
  
  // Click Settings button
  await settingsButton.click()
  await page.waitForTimeout(500)
  
  // Verify Settings page loads
  await expect(page.locator('h1')).toContainText('Settings')
  
  // Verify tabs are present and functional
  await expect(page.locator('button:has-text("AI Configuration")')).toBeVisible()
  await expect(page.locator('button:has-text("Vault Management")')).toBeVisible()
  await expect(page.locator('button:has-text("Calendar Import")')).toBeVisible()
  
  // Test AI Configuration tab
  await page.click('button:has-text("AI Configuration")')
  await page.waitForTimeout(300)
  await expect(page.locator('label:has-text("OpenAI API Key")')).toBeVisible()
  await expect(page.locator('button:has-text("Validate")')).toBeVisible()
  await expect(page.locator('button:has-text("Save Settings")')).toBeVisible()
  await expect(page.locator('button:has-text("Clear Key")')).toBeVisible()
  
  // Test Vault Management tab
  await page.click('button:has-text("Vault Management")')
  await page.waitForTimeout(300)
  await expect(page.locator('text=Connect Your Obsidian Vault')).toBeVisible()
  
  // Test Calendar Import tab
  await page.click('button:has-text("Calendar Import")')
  await page.waitForTimeout(300)
  await expect(page.locator('text=Apple Calendar')).toBeVisible()
  await expect(page.locator('text=ICS File')).toBeVisible()
  
  // Go back to home
  await page.click('button:has-text("Back to Home")')
  await page.waitForTimeout(500)
  
  // Verify we're back on home page
  await expect(page.locator('h1')).toContainText('Prep')
  
  // Verify status card is present
  await expect(page.locator('text=Obsidian Vault')).toBeVisible()
  
  // Verify meetings section is present
  await expect(page.locator('text=Today\'s Meetings')).toBeVisible()
  
  // Verify refresh button is functional
  await expect(page.locator('button:has-text("Refresh")')).toBeVisible()
  
  console.log('✅ All functionality verification tests passed!')
  
  await electronApp.close()
})
