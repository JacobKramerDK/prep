import { test, expect } from '@playwright/test'
import { ElectronApplication, _electron as electron } from 'playwright'
import path from 'path'

test.describe('Vault Integration', () => {
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

  test('should launch Electron app and display content', async () => {
    const page = await electronApp.firstWindow()
    await page.waitForLoadState('domcontentloaded')
    
    // Test that content is displayed
    const title = await page.textContent('h1')
    expect(title).toContain('Prep - Meeting Assistant')
    
    // Test that buttons are present
    const bodyText = await page.textContent('body')
    expect(bodyText).toContain('Vault Browser')
    expect(bodyText).toContain('Calendar Import')
    expect(bodyText).toContain('Version:')
  })

  test('should have working IPC communication', async () => {
    const page = await electronApp.firstWindow()
    await page.waitForLoadState('domcontentloaded')
    
    // Test that electronAPI is exposed and working
    const version = await page.evaluate(async () => {
      if (window.electronAPI && window.electronAPI.getVersion) {
        return await window.electronAPI.getVersion()
      }
      return null
    })
    
    expect(version).toBeTruthy()
    expect(typeof version).toBe('string')
    
    // Test that vault API methods are exposed
    const hasVaultAPI = await page.evaluate(() => {
      return !!(window.electronAPI && 
               window.electronAPI.selectVault &&
               window.electronAPI.scanVault &&
               window.electronAPI.searchFiles &&
               window.electronAPI.readFile)
    })
    
    expect(hasVaultAPI).toBe(true)
  })

  test('should navigate to vault browser', async () => {
    const page = await electronApp.firstWindow()
    await page.waitForLoadState('domcontentloaded')
    
    // Click the vault browser button
    await page.click('button:has-text("Vault Browser")')
    await page.waitForTimeout(1000)
    
    // Check that vault selector is displayed
    const bodyText = await page.textContent('body')
    expect(bodyText).toContain('Connect Your Obsidian Vault')
    expect(bodyText).toContain('Select Obsidian Vault')
  })
})
