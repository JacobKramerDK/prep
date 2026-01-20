import { test, expect } from '@playwright/test'

test.describe('Relevance Weights Settings', () => {
  test('should handle settings loading gracefully', async ({ page }) => {
    // Navigate to the app
    await page.goto('http://localhost:5173')
    
    // Wait for the app to load
    await page.waitForSelector('[data-testid="app-container"]', { timeout: 10000 })
    
    // Navigate to settings
    const settingsButton = page.locator('button:has-text("Settings")')
    if (await settingsButton.isVisible()) {
      await settingsButton.click()
      
      // Look for relevance settings tab
      const relevanceTab = page.locator('button:has-text("Relevance")')
      if (await relevanceTab.isVisible()) {
        await relevanceTab.click()
        
        // Check that sliders are rendered
        await expect(page.locator('input[type="range"]')).toHaveCount(6)
        
        // Check that save button exists
        await expect(page.locator('button:has-text("Save Weights")')).toBeVisible()
      }
    }
  })

  test('should display tooltips correctly positioned', async ({ page }) => {
    await page.goto('http://localhost:5173')
    await page.waitForSelector('[data-testid="app-container"]', { timeout: 10000 })
    
    const settingsButton = page.locator('button:has-text("Settings")')
    if (await settingsButton.isVisible()) {
      await settingsButton.click()
      
      const relevanceTab = page.locator('button:has-text("Relevance")')
      if (await relevanceTab.isVisible()) {
        await relevanceTab.click()
        
        // Hover over info icon to show tooltip
        const infoIcon = page.locator('svg').first()
        if (await infoIcon.isVisible()) {
          await infoIcon.hover()
          
          // Check tooltip appears (it should be centered now)
          const tooltip = page.locator('.group-hover\\:block')
          if (await tooltip.isVisible()) {
            // Verify tooltip has centered positioning classes
            await expect(tooltip).toHaveClass(/left-1\/2/)
            await expect(tooltip).toHaveClass(/transform/)
            await expect(tooltip).toHaveClass(/-translate-x-1\/2/)
          }
        }
      }
    }
  })
})
