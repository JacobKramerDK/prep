import { test, expect } from '@playwright/test'
import { ElectronApplication, _electron as electron } from 'playwright'

test.describe('Final Bug Fix Verification', () => {
  let electronApp: ElectronApplication

  test.beforeAll(async () => {
    electronApp = await electron.launch({
      args: ['dist/main/src/main/index.js'],
      cwd: process.cwd()
    })
  })

  test.afterAll(async () => {
    await electronApp.close()
  })

  test('verify meetings are visible and scrollable', async () => {
    const window = await electronApp.firstWindow()
    
    await window.waitForLoadState('domcontentloaded')
    await window.waitForTimeout(6000) // Wait for meetings to load
    
    console.log('=== Final Verification ===')
    
    // Check that meetings are loaded via API
    const meetingsInfo = await window.evaluate(async () => {
      return await (window as any).electronAPI.getTodaysMeetings()
    })
    
    console.log('API meetings count:', meetingsInfo?.totalMeetings || 0)
    expect(meetingsInfo?.totalMeetings).toBeGreaterThan(0)
    
    // Check that Today's Meetings header is visible
    const headerVisible = await window.locator('h2:has-text("Today\'s Meetings")').isVisible()
    console.log('Today\'s Meetings header visible:', headerVisible)
    expect(headerVisible).toBe(true)
    
    // Check that the meetings container exists and has content
    const meetingsContainer = window.locator('div.grid.gap-4')
    const containerExists = await meetingsContainer.count() > 0
    console.log('Meetings container exists:', containerExists)
    expect(containerExists).toBe(true)
    
    // Check that scrolling works
    const canScroll = await window.evaluate(() => {
      return document.documentElement.scrollHeight > document.documentElement.clientHeight
    })
    console.log('Page is scrollable:', canScroll)
    expect(canScroll).toBe(true)
    
    // Test actual scrolling
    await window.evaluate(() => window.scrollTo(0, 500))
    await window.waitForTimeout(500)
    
    const scrollPosition = await window.evaluate(() => window.scrollY)
    console.log('Can scroll (position after scroll):', scrollPosition)
    expect(scrollPosition).toBeGreaterThan(0)
    
    // Take final screenshot
    await window.screenshot({ path: 'final-verification.png' })
    
    console.log('✅ All checks passed - meetings are visible and scrollable!')
  })
})
