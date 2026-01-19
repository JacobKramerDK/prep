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

test('Debug: Check CSS variables and computed styles', async () => {
  const page = await electronApp.firstWindow()
  await page.waitForLoadState('domcontentloaded')
  
  // Check if CSS variables are defined
  const cssVariables = await page.evaluate(() => {
    const root = document.documentElement
    const styles = getComputedStyle(root)
    return {
      bgPrimary: styles.getPropertyValue('--bg-primary'),
      bgSecondary: styles.getPropertyValue('--bg-secondary'),
      textPrimary: styles.getPropertyValue('--text-primary'),
      textSecondary: styles.getPropertyValue('--text-secondary'),
      borderColor: styles.getPropertyValue('--border-color')
    }
  })
  
  console.log('CSS Variables:', cssVariables)
  
  // Check computed styles of main elements
  const computedStyles = await page.evaluate(() => {
    const body = document.body
    const root = document.getElementById('root')
    const mainDiv = document.querySelector('.min-h-screen')
    
    return {
      body: {
        backgroundColor: getComputedStyle(body).backgroundColor,
        color: getComputedStyle(body).color
      },
      root: root ? {
        backgroundColor: getComputedStyle(root).backgroundColor,
        color: getComputedStyle(root).color
      } : null,
      mainDiv: mainDiv ? {
        backgroundColor: getComputedStyle(mainDiv).backgroundColor,
        color: getComputedStyle(mainDiv).color,
        minHeight: getComputedStyle(mainDiv).minHeight
      } : null
    }
  })
  
  console.log('Computed Styles:', computedStyles)
  
  // Check if Tailwind classes are working
  const tailwindTest = await page.evaluate(() => {
    const testDiv = document.createElement('div')
    testDiv.className = 'bg-red-500 text-white p-4'
    document.body.appendChild(testDiv)
    const styles = getComputedStyle(testDiv)
    document.body.removeChild(testDiv)
    
    return {
      backgroundColor: styles.backgroundColor,
      color: styles.color,
      padding: styles.padding
    }
  })
  
  console.log('Tailwind test styles:', tailwindTest)
})
