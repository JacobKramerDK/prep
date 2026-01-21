import { test, expect } from '@playwright/test'
import { ElectronApplication, _electron as electron } from 'playwright'

test.describe('Horizontal Overflow Fix', () => {
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

  test('verify horizontal overflow is fixed', async () => {
    const window = await electronApp.firstWindow()
    
    await window.waitForLoadState('domcontentloaded')
    await window.waitForTimeout(6000)
    
    // Check horizontal overflow
    const overflowInfo = await window.evaluate(() => {
      const body = document.body
      const viewport = {
        width: window.innerWidth,
        height: window.innerHeight
      }
      
      return {
        viewport,
        bodyScrollWidth: body.scrollWidth,
        bodyClientWidth: body.clientWidth,
        documentScrollWidth: document.documentElement.scrollWidth,
        documentClientWidth: document.documentElement.clientWidth,
        hasHorizontalScroll: body.scrollWidth > viewport.width
      }
    })
    
    console.log('Horizontal overflow info:', JSON.stringify(overflowInfo, null, 2))
    
    // Take screenshot to verify visual state
    await window.screenshot({ path: 'horizontal-overflow-test.png' })
    
    // Verify no horizontal overflow
    const hasOverflow = overflowInfo.hasHorizontalScroll
    console.log('Has horizontal overflow:', hasOverflow)
    
    // Check that CSS classes are properly applied
    const cssClasses = await window.evaluate(() => {
      const rootDiv = document.querySelector('div[class*="min-h-screen"]')
      const main = document.querySelector('main')
      const homePage = document.querySelector('div[class*="max-w-full"]')
      
      return {
        rootDivClasses: rootDiv?.className || '',
        mainClasses: main?.className || '',
        homePageClasses: homePage?.className || ''
      }
    })
    
    console.log('Applied CSS classes:', cssClasses)
    
    // Verify proper CSS classes are applied
    expect(cssClasses.rootDivClasses).toContain('overflow-x-hidden')
    expect(cssClasses.homePageClasses).toContain('max-w-full')
    expect(hasOverflow).toBe(false)
  })
})
