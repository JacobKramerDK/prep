import { test, expect } from '@playwright/test'
import { ElectronApplication, _electron as electron } from 'playwright'
import path from 'path'

test.describe('Vault Integration', () => {
  let electronApp: ElectronApplication

  test('should launch Electron app and display content', async () => {
    // Launch Electron app
    electronApp = await electron.launch({
      args: [path.join(__dirname, '../../dist/main/src/main/index.js')],
      env: {
        ...process.env,
        NODE_ENV: 'test'
      }
    })
    
    // Get the first window
    const page = await electronApp.firstWindow()
    
    // Wait for the app to load
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(2000)
    
    // Test that content is actually displayed
    const title = await page.textContent('h1')
    expect(title).toContain('Prep - Meeting Assistant')
    
    const button = await page.textContent('button')
    expect(button).toContain('Open Vault Browser')
    
    // Test that the app version is displayed
    const bodyText = await page.textContent('body')
    expect(bodyText).toContain('Version:')
    
    await electronApp.close()
  })

  test('should have working IPC communication', async () => {
    electronApp = await electron.launch({
      args: [path.join(__dirname, '../../dist/main/src/main/index.js')],
      env: {
        ...process.env,
        NODE_ENV: 'test'
      }
    })
    
    const page = await electronApp.firstWindow()
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(2000)
    
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
    
    await electronApp.close()
  })

  test('should navigate to vault browser', async () => {
    electronApp = await electron.launch({
      args: [path.join(__dirname, '../../dist/main/src/main/index.js')],
      env: {
        ...process.env,
        NODE_ENV: 'test'
      }
    })
    
    const page = await electronApp.firstWindow()
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(2000)
    
    // Click the vault browser button
    await page.click('button:has-text("Open Vault Browser")')
    
    // Wait for navigation
    await page.waitForTimeout(1000)
    
    // Check that vault selector is displayed
    const vaultSelectorText = await page.textContent('body')
    expect(vaultSelectorText).toContain('Connect Your Obsidian Vault')
    expect(vaultSelectorText).toContain('Select Obsidian Vault')
    
    await electronApp.close()
  })
})
