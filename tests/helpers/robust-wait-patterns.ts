import { Page, expect } from '@playwright/test'

export interface WaitOptions {
  timeout?: number
  interval?: number
}

export class RobustWaitPatterns {
  static async waitForElectronAPI(page: Page, options: WaitOptions = {}): Promise<void> {
    const { timeout = 10000 } = options
    
    await page.waitForFunction(() => {
      return window.electronAPI && 
             typeof window.electronAPI === 'object' &&
             document.readyState === 'complete'
    }, { timeout })
  }

  static async waitForAPIValidation(page: Page, options: WaitOptions = {}): Promise<void> {
    const { timeout = 15000 } = options
    
    await page.waitForSelector('[data-testid="api-validation-result"], .validation-result', { timeout })
  }

  static async waitForLoadingToComplete(page: Page, options: WaitOptions = {}): Promise<void> {
    const { timeout = 10000 } = options
    
    await page.waitForFunction(() => {
      const loadingElements = document.querySelectorAll('[data-testid="loading"], .loading, .spinner')
      return loadingElements.length === 0
    }, { timeout })
  }

  static async waitForMeetingsToLoad(page: Page, options: WaitOptions = {}): Promise<void> {
    const { timeout = 15000 } = options
    
    await page.waitForFunction(() => {
      const meetingsContainer = document.querySelector('[data-testid="meetings-container"], .meetings-container')
      if (!meetingsContainer) return false
      
      const loadingIndicator = meetingsContainer.querySelector('[data-testid="loading"], .loading')
      return !loadingIndicator
    }, { timeout })
  }

  static async waitForSettingsToLoad(page: Page, options: WaitOptions = {}): Promise<void> {
    const { timeout = 10000 } = options
    
    await page.waitForSelector('[data-testid="settings-container"], .settings-container', { timeout })
    await this.waitForLoadingToComplete(page, options)
  }

  static async waitForBriefGeneration(page: Page, options: WaitOptions = {}): Promise<void> {
    const { timeout = 30000 } = options
    
    // Wait for either success or error state
    await page.waitForFunction(() => {
      const successElement = document.querySelector('[data-testid="brief-result"], .brief-result')
      const errorElement = document.querySelector('[data-testid="brief-error"], .error-message')
      const loadingElement = document.querySelector('[data-testid="brief-loading"], .generating')
      
      return (successElement || errorElement) && !loadingElement
    }, { timeout })
  }

  static async waitForVaultScan(page: Page, options: WaitOptions = {}): Promise<void> {
    const { timeout = 20000 } = options
    
    await page.waitForFunction(() => {
      const scanButton = document.querySelector('[data-testid="scan-vault-button"], button:has-text("Scan")')
      return scanButton && !scanButton.hasAttribute('disabled')
    }, { timeout })
  }

  static async waitForCalendarSync(page: Page, options: WaitOptions = {}): Promise<void> {
    const { timeout = 15000 } = options
    
    await page.waitForFunction(() => {
      const syncStatus = document.querySelector('[data-testid="sync-status"], .sync-status')
      if (!syncStatus) return false
      
      const text = syncStatus.textContent || ''
      return !text.includes('Syncing') && !text.includes('Loading')
    }, { timeout })
  }

  static async waitForElementToBeVisible(page: Page, selector: string, options: WaitOptions = {}): Promise<void> {
    const { timeout = 10000 } = options
    
    await page.waitForSelector(selector, { state: 'visible', timeout })
  }

  static async waitForElementToBeHidden(page: Page, selector: string, options: WaitOptions = {}): Promise<void> {
    const { timeout = 10000 } = options
    
    await page.waitForSelector(selector, { state: 'hidden', timeout })
  }

  static async waitForTextContent(page: Page, selector: string, expectedText: string, options: WaitOptions = {}): Promise<void> {
    const { timeout = 10000 } = options
    
    await page.waitForFunction(
      ({ selector, expectedText }) => {
        const element = document.querySelector(selector)
        return element && element.textContent?.includes(expectedText)
      },
      { selector, expectedText },
      { timeout }
    )
  }

  static async waitForFormSubmission(page: Page, formSelector: string, options: WaitOptions = {}): Promise<void> {
    const { timeout = 15000 } = options
    
    await page.waitForFunction(
      ({ formSelector }) => {
        const form = document.querySelector(formSelector)
        if (!form) return false
        
        const submitButton = form.querySelector('button[type="submit"], .submit-button')
        return submitButton && !submitButton.hasAttribute('disabled')
      },
      { formSelector },
      { timeout }
    )
  }

  static async waitForNetworkIdle(page: Page, options: WaitOptions = {}): Promise<void> {
    const { timeout = 10000 } = options
    
    await page.waitForLoadState('networkidle', { timeout })
  }

  static async waitForDOMContentLoaded(page: Page, options: WaitOptions = {}): Promise<void> {
    const { timeout = 10000 } = options
    
    await page.waitForLoadState('domcontentloaded', { timeout })
  }

  // Utility method to combine multiple wait conditions
  static async waitForMultipleConditions(page: Page, conditions: (() => Promise<void>)[]): Promise<void> {
    await Promise.all(conditions.map(condition => condition()))
  }

  // Retry pattern for flaky operations
  static async retryOperation<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    delay: number = 1000
  ): Promise<T> {
    let lastError: Error
    
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await operation()
      } catch (error) {
        lastError = error as Error
        if (i < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, delay))
        }
      }
    }
    
    throw lastError!
  }
}
