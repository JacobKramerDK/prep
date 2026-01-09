import { test, expect } from '@playwright/test'
import { ElectronApplication, _electron as electron } from 'playwright'
import path from 'path'

test.describe('Interface Restructuring', () => {
  let electronApp: ElectronApplication

  test.beforeEach(async () => {
    electronApp = await electron.launch({
      args: [path.join(__dirname, '../../dist/main/src/main/index.js')],
      env: {
        ...process.env,
        NODE_ENV: 'test'
      }
    })
  })

  test.afterEach(async () => {
    if (electronApp) {
      await electronApp.close()
    }
  })

  test('main dashboard shows only meetings and vault status', async () => {
    const page = await electronApp.firstWindow()
    await page.waitForLoadState('domcontentloaded')
    
    // Verify main dashboard content
    await expect(page.locator('h1')).toContainText('Prep - Meeting Assistant')
    
    // Should show meetings section
    await expect(page.locator('text=📅')).toBeVisible()
    await expect(page.locator('text=meeting')).toBeVisible()
    
    // Should show vault status
    await expect(page.locator('text=📁')).toBeVisible()
    await expect(page.locator('text=vault')).toBeVisible()
    
    // Should NOT show vault browser button
    await expect(page.locator('button:has-text("Vault Browser")')).not.toBeVisible()
    
    // Should NOT show calendar import button  
    await expect(page.locator('button:has-text("Calendar Import")')).not.toBeVisible()
    
    // Should show Settings button
    await expect(page.locator('button:has-text("Settings")')).toBeVisible()
  })

  test('settings screen includes required tabs', async () => {
    const page = await electronApp.firstWindow()
    await page.waitForLoadState('domcontentloaded')
    
    // Navigate to Settings
    await page.click('button:has-text("Settings")')
    await page.waitForTimeout(500)
    
    // Verify Settings tabs are present
    await expect(page.locator('button:has-text("AI Configuration")')).toBeVisible()
    await expect(page.locator('button:has-text("Vault Management")')).toBeVisible()
    await expect(page.locator('button:has-text("Calendar Import")')).toBeVisible()
  })

  test('navigation between main dashboard and settings works', async () => {
    const page = await electronApp.firstWindow()
    await page.waitForLoadState('domcontentloaded')
    
    // Start on main dashboard
    await expect(page.locator('h1')).toContainText('Prep - Meeting Assistant')
    
    // Navigate to Settings
    await page.click('button:has-text("Settings")')
    await page.waitForTimeout(500)
    
    // Should be in Settings view
    await expect(page.locator('button:has-text("AI Configuration")')).toBeVisible()
    
    // Navigate back to main dashboard
    await page.click('button:has-text("Back to Home")')
    await page.waitForTimeout(500)
    
    // Should be back on main dashboard
    await expect(page.locator('h1')).toContainText('Prep - Meeting Assistant')
    await expect(page.locator('text=📅')).toBeVisible()
  })

  test('tab switching in settings works properly', async () => {
    const page = await electronApp.firstWindow()
    await page.waitForLoadState('domcontentloaded')
    
    // Navigate to Settings
    await page.click('button:has-text("Settings")')
    await page.waitForTimeout(500)
    
    // Test AI Configuration tab (default)
    await page.click('button:has-text("AI Configuration")')
    await page.waitForTimeout(300)
    await expect(page.locator('text=OpenAI API Key')).toBeVisible()
    
    // Test Vault Management tab
    await page.click('button:has-text("Vault Management")')
    await page.waitForTimeout(300)
    await expect(page.locator('text=Connect Your Obsidian Vault')).toBeVisible()
    await expect(page.locator('button:has-text("Select Obsidian Vault")')).toBeVisible()
    
    // Test Calendar Import tab
    await page.click('button:has-text("Calendar Import")')
    await page.waitForTimeout(300)
    await expect(page.locator('text=Calendar Import')).toBeVisible()
    
    // Switch back to AI Configuration
    await page.click('button:has-text("AI Configuration")')
    await page.waitForTimeout(300)
    await expect(page.locator('text=OpenAI API Key')).toBeVisible()
  })

  test('vault management functionality in settings', async () => {
    const page = await electronApp.firstWindow()
    await page.waitForLoadState('domcontentloaded')
    
    // Navigate to Settings > Vault Management
    await page.click('button:has-text("Settings")')
    await page.waitForTimeout(500)
    await page.click('button:has-text("Vault Management")')
    await page.waitForTimeout(300)
    
    // Should show vault selection interface
    await expect(page.locator('text=Connect Your Obsidian Vault')).toBeVisible()
    await expect(page.locator('button:has-text("Select Obsidian Vault")')).toBeVisible()
    
    // Should show vault status if no vault connected
    const bodyText = await page.textContent('body')
    expect(bodyText).toContain('No vault selected')
  })

  test('calendar import functionality in settings', async () => {
    const page = await electronApp.firstWindow()
    await page.waitForLoadState('domcontentloaded')
    
    // Navigate to Settings > Calendar Import
    await page.click('button:has-text("Settings")')
    await page.waitForTimeout(500)
    await page.click('button:has-text("Calendar Import")')
    await page.waitForTimeout(300)
    
    // Should show calendar import interface
    await expect(page.locator('text=Calendar Import')).toBeVisible()
    
    // Should have calendar API methods available
    const hasCalendarAPI = await page.evaluate(() => {
      return !!(window.electronAPI && 
               window.electronAPI.isAppleScriptSupported &&
               window.electronAPI.extractCalendarEvents &&
               window.electronAPI.parseICSFile)
    })
    expect(hasCalendarAPI).toBe(true)
  })

  test('main dashboard meeting display without navigation buttons', async () => {
    const page = await electronApp.firstWindow()
    await page.waitForLoadState('domcontentloaded')
    
    // Should show meeting information
    const bodyText = await page.textContent('body')
    expect(bodyText).toContain('meeting')
    
    // Should show vault status
    expect(bodyText).toContain('vault')
    
    // Should NOT contain old navigation buttons
    expect(bodyText).not.toContain('Vault Browser')
    expect(bodyText).not.toContain('Calendar Import')
    
    // Should only have Settings button for navigation
    const buttons = await page.locator('button').allTextContents()
    const navigationButtons = buttons.filter(text => 
      text.includes('Vault Browser') || text.includes('Calendar Import')
    )
    expect(navigationButtons).toHaveLength(0)
  })

  test('settings tab state persistence during session', async () => {
    const page = await electronApp.firstWindow()
    await page.waitForLoadState('domcontentloaded')
    
    // Navigate to Settings > Calendar Import
    await page.click('button:has-text("Settings")')
    await page.waitForTimeout(500)
    await page.click('button:has-text("Calendar Import")')
    await page.waitForTimeout(300)
    
    // Go back to dashboard
    await page.click('button:has-text("Back to Home")')
    await page.waitForTimeout(500)
    
    // Return to Settings - should remember last tab
    await page.click('button:has-text("Settings")')
    await page.waitForTimeout(500)
    
    // Should still be on Calendar Import tab
    await expect(page.locator('text=Calendar Import')).toBeVisible()
  })
})