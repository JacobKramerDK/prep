import { test, expect } from '@playwright/test'
import { ElectronApplication, _electron as electron } from 'playwright'
import path from 'path'

test.describe('Calendar Integration', () => {
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

  test('should have calendar API available', async () => {
    const page = await electronApp.firstWindow()
    await page.waitForLoadState('domcontentloaded')
    
    // Test that calendar API methods are exposed
    const hasCalendarAPI = await page.evaluate(() => {
      return !!(window.electronAPI && 
               window.electronAPI.isAppleScriptSupported &&
               window.electronAPI.extractCalendarEvents &&
               window.electronAPI.parseICSFile)
    })
    
    expect(hasCalendarAPI).toBe(true)
  })

  test('should navigate to calendar page', async () => {
    const page = await electronApp.firstWindow()
    await page.waitForLoadState('domcontentloaded')
    
    await page.click('button:has-text("Calendar Import")')
    await page.waitForTimeout(500)
    
    const bodyText = await page.textContent('body')
    expect(bodyText).toContain('Calendar Import')
  })

  test('should detect AppleScript support', async () => {
    const page = await electronApp.firstWindow()
    await page.waitForLoadState('domcontentloaded')
    
    const isSupported = await page.evaluate(async () => {
      return await window.electronAPI.isAppleScriptSupported()
    })
    
    // On macOS should be true, on other platforms false
    expect(typeof isSupported).toBe('boolean')
  })
})
