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

test('Debug: Take fresh screenshot and check actual styles', async () => {
  const page = await electronApp.firstWindow()
  await page.waitForLoadState('domcontentloaded')
  await page.waitForTimeout(2000)
  
  // Take screenshot to see current state
  await page.screenshot({ path: 'current-broken-design.png', fullPage: true })
  
  // Check if our custom classes are actually being applied
  const customStyles = await page.evaluate(() => {
    const mainDiv = document.querySelector('.min-h-screen')
    const bgBackgroundEl = document.querySelector('.bg-background')
    const textPrimaryEl = document.querySelector('.text-primary')
    
    return {
      mainDiv: mainDiv ? {
        classes: mainDiv.className,
        computedBg: getComputedStyle(mainDiv).backgroundColor,
        computedColor: getComputedStyle(mainDiv).color
      } : null,
      bgBackground: bgBackgroundEl ? {
        classes: bgBackgroundEl.className,
        computedBg: getComputedStyle(bgBackgroundEl).backgroundColor
      } : null,
      textPrimary: textPrimaryEl ? {
        classes: textPrimaryEl.className,
        computedColor: getComputedStyle(textPrimaryEl).color
      } : null
    }
  })
  
  console.log('Custom styles check:', JSON.stringify(customStyles, null, 2))
  
  // Check if basic Tailwind classes work
  const basicTailwind = await page.evaluate(() => {
    const flexEl = document.querySelector('.flex')
    const minHEl = document.querySelector('.min-h-screen')
    
    return {
      flex: flexEl ? {
        display: getComputedStyle(flexEl).display
      } : null,
      minHeight: minHEl ? {
        minHeight: getComputedStyle(minHEl).minHeight
      } : null
    }
  })
  
  console.log('Basic Tailwind check:', JSON.stringify(basicTailwind, null, 2))
})
