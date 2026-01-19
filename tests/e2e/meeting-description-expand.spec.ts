import { test, expect, _electron as electron } from '@playwright/test'

test('meeting description expand/collapse functionality', async () => {
  const electronApp = await electron.launch({ 
    args: ['dist/main/src/main/index.js'],
    cwd: process.cwd()
  })
  
  const page = await electronApp.firstWindow()
  await page.waitForSelector('h1:has-text("Prep - Meeting Assistant")', { timeout: 10000 })
  await page.waitForTimeout(2000) // Wait for meetings to load
  
  // Check if meetings are displayed
  const meetingsHeading = page.locator('h2:has-text("📅 Today\'s Meetings")')
  await expect(meetingsHeading).toBeVisible()
  
  // Find meeting cards with descriptions
  const meetingCards = page.locator('div[style*="background-color: white"]').filter({ has: page.locator('h4') })
  const cardCount = await meetingCards.count()
  
  if (cardCount > 0) {
    // Look for cards with descriptions longer than 150 characters
    const cardsWithDescriptions = meetingCards.filter({ 
      has: page.locator('div[style*="border-left: 3px solid rgb(226, 232, 240)"]') 
    })
    const descCardCount = await cardsWithDescriptions.count()
    
    if (descCardCount > 0) {
      const firstCardWithDesc = cardsWithDescriptions.first()
      
      // Check if expand button exists for long descriptions
      const expandButton = firstCardWithDesc.locator('button:has-text("Show more")')
      if (await expandButton.count() > 0) {
        // Test expand functionality
        await expect(expandButton).toBeVisible()
        await expandButton.click()
        
        // After clicking, should show "Show less" button
        const collapseButton = firstCardWithDesc.locator('button:has-text("Show less")')
        await expect(collapseButton).toBeVisible()
        
        // Test collapse functionality
        await collapseButton.click()
        
        // Should show "Show more" button again
        await expect(expandButton).toBeVisible()
      }
    }
  }
  
  await electronApp.close()
})
