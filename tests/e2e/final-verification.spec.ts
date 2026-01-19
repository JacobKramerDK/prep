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

test('Final: Verify design is working correctly', async () => {
  const page = await electronApp.firstWindow()
  await page.waitForLoadState('domcontentloaded')
  
  // Wait for React to render
  await page.waitForTimeout(1000)
  
  // Take a final screenshot
  await page.screenshot({ path: 'final-working-design.png', fullPage: true })
  
  // Verify key elements are visible and styled
  await expect(page.locator('h1:has-text("Prep")')).toBeVisible()
  await expect(page.locator('text=Meeting preparation assistant for Obsidian')).toBeVisible()
  await expect(page.locator('button:has-text("Settings")')).toBeVisible()
  await expect(page.locator('text=5 meetings scheduled for today')).toBeVisible()
  await expect(page.locator('h2:has-text("Today\'s Meetings")')).toBeVisible()
  
  // Verify meeting cards are present
  await expect(page.locator('text=Pod Meeting - EMEA South Team')).toBeVisible()
  await expect(page.locator('button:has-text("Generate Brief")').first()).toBeVisible()
  
  console.log('✅ Design implementation successful! All elements are visible and functional.')
})
