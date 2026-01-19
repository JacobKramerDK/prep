import { test, expect } from '@playwright/test'
import { ElectronApplication, _electron as electron } from 'playwright'

let electronApp: ElectronApplication

test.beforeAll(async () => {
  electronApp = await electron.launch({
    args: ['dist/main/src/main/index.js'],
    timeout: 30000
  })
})

test.afterAll(async () => {
  await electronApp.close()
})

test.describe('New Design Implementation', () => {
  test('should display the new homepage design', async () => {
    const page = await electronApp.firstWindow()
    await page.waitForLoadState('domcontentloaded')

    // Check for the new app header with Sparkles icon and title
    await expect(page.locator('h1:has-text("Prep")')).toBeVisible()
    await expect(page.locator('text=Meeting preparation assistant for Obsidian')).toBeVisible()
    
    // Check for version badge
    await expect(page.locator('text=v35.7.5')).toBeVisible()
    
    // Check for Settings button
    await expect(page.locator('button:has-text("Settings")')).toBeVisible()
    
    // Check for status section
    await expect(page.locator('text=5 meetings scheduled for today')).toBeVisible()
    await expect(page.locator('text=Obsidian Vault')).toBeVisible()
    await expect(page.locator('text=111 files indexed')).toBeVisible()
    
    // Check for Today's Meetings section
    await expect(page.locator('h2:has-text("Today\'s Meetings")')).toBeVisible()
    await expect(page.locator('button:has-text("Refresh")')).toBeVisible()
    
    // Check for meeting cards and Generate Brief buttons
    await expect(page.locator('text=Pod Meeting - EMEA South Team')).toBeVisible()
    await expect(page.locator('text=Product Design Weekly Sync')).toBeVisible()
    await expect(page.locator('button:has-text("Generate Brief")').first()).toBeVisible()
  })

  test('should navigate to settings page', async () => {
    const page = await electronApp.firstWindow()
    await page.waitForLoadState('domcontentloaded')

    // Click Settings button
    await page.click('button:has-text("Settings")')
    
    // Check settings page elements
    await expect(page.locator('h1:has-text("Settings")')).toBeVisible()
    await expect(page.locator('text=Configure your Prep application preferences')).toBeVisible()
    
    // Check for tabs
    await expect(page.locator('text=AI Configuration')).toBeVisible()
    await expect(page.locator('text=Vault Management')).toBeVisible()
    await expect(page.locator('text=Calendar Import')).toBeVisible()
    
    // Check AI Configuration tab content
    await expect(page.locator('text=OpenAI API Configuration')).toBeVisible()
    await expect(page.locator('input[placeholder="sk-..."]')).toBeVisible()
    await expect(page.locator('select')).toBeVisible()
    
    // Check Back button
    await expect(page.locator('button:has-text("Back to Home")')).toBeVisible()
  })

  test('should expand meeting details', async () => {
    const page = await electronApp.firstWindow()
    await page.waitForLoadState('domcontentloaded')

    // Click "Show details" on first meeting
    await page.click('button:has-text("Show details")')
    
    // Check that details are expanded
    await expect(page.locator('text=This is an invite to the EMEA South POD Meeting')).toBeVisible()
    
    // Check "Hide details" button appears
    await expect(page.locator('button:has-text("Hide details")')).toBeVisible()
  })

  test('should switch between settings tabs', async () => {
    const page = await electronApp.firstWindow()
    await page.waitForLoadState('domcontentloaded')

    // Navigate to settings
    await page.click('button:has-text("Settings")')
    
    // Click Vault Management tab
    await page.click('text=Vault Management')
    await expect(page.locator('text=Connect Your Obsidian Vault')).toBeVisible()
    await expect(page.locator('text=Vault indexed for AI context (111 files)')).toBeVisible()
    
    // Click Calendar Import tab
    await page.click('text=Calendar Import')
    await expect(page.locator('text=Import Options')).toBeVisible()
    await expect(page.locator('text=Apple Calendar')).toBeVisible()
    await expect(page.locator('text=ICS File')).toBeVisible()
    await expect(page.locator('text=Google Calendar Integration')).toBeVisible()
  })

  test('should have proper Tailwind styling', async () => {
    const page = await electronApp.firstWindow()
    await page.waitForLoadState('domcontentloaded')

    // Check that the app has the proper Tailwind classes applied
    const appDiv = page.locator('div.min-h-screen')
    await expect(appDiv).toBeVisible()
    
    // Check that buttons have flex display (from Tailwind classes)
    const settingsButton = page.locator('button:has-text("Settings")')
    const buttonDisplay = await settingsButton.evaluate(el => getComputedStyle(el).display)
    expect(buttonDisplay).toBe('flex')
  })
})
