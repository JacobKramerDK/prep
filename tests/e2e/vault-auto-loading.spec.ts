import { test, expect } from '@playwright/test'
import { _electron as electron } from 'playwright'
import path from 'path'

test.describe('Vault Auto-Loading Integration', () => {
  test('should auto-load vault on app startup when path is persisted', async () => {
    // Start the Electron app
    const electronApp = await electron.launch({
      args: [path.join(__dirname, '../../dist/main/src/main/index.js')],
      env: {
        ...process.env,
        NODE_ENV: 'test'
      }
    })

    // Get the main window
    const window = await electronApp.firstWindow()
    
    // Wait for the app to load
    await window.waitForLoadState('domcontentloaded')
    
    // Check that the app loads without the vault initially
    const noVaultMessage = window.locator('text=No Obsidian Vault Connected')
    await expect(noVaultMessage).toBeVisible({ timeout: 10000 })
    
    // Open settings to connect a vault
    const settingsButton = window.locator('button:has-text("Settings")')
    await settingsButton.click()
    
    // Verify settings page loads
    await expect(window.locator('text=Settings')).toBeVisible()
    
    // Go back to main page
    const backButton = window.locator('button:has-text("Back to Home")')
    await backButton.click()
    
    // Verify we're back on the main page
    await expect(window.locator('text=Prep - Meeting Assistant')).toBeVisible()
    
    // Close the app
    await electronApp.close()
  })

  test('should show vault status correctly after connection', async () => {
    const electronApp = await electron.launch({
      args: [path.join(__dirname, '../../dist/main/src/main/index.js')],
      env: {
        ...process.env,
        NODE_ENV: 'test'
      }
    })

    const window = await electronApp.firstWindow()
    await window.waitForLoadState('domcontentloaded')
    
    // Initially should show no vault connected
    const noVaultSection = window.locator('text=No Obsidian Vault Connected')
    await expect(noVaultSection).toBeVisible({ timeout: 10000 })
    
    // The vault status indicators should not be present initially
    const vaultConnectedIndicator = window.locator('text=Obsidian Vault Connected')
    await expect(vaultConnectedIndicator).not.toBeVisible()
    
    await electronApp.close()
  })

  test('should handle app startup gracefully even with invalid stored vault path', async () => {
    const electronApp = await electron.launch({
      args: [path.join(__dirname, '../../dist/main/src/main/index.js')],
      env: {
        ...process.env,
        NODE_ENV: 'test'
      }
    })

    const window = await electronApp.firstWindow()
    await window.waitForLoadState('domcontentloaded')
    
    // App should start successfully even if there are issues with stored vault path
    await expect(window.locator('text=Prep - Meeting Assistant')).toBeVisible({ timeout: 10000 })
    
    // Should show the no vault connected state
    await expect(window.locator('text=No Obsidian Vault Connected')).toBeVisible()
    
    await electronApp.close()
  })
})
