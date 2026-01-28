import { TestDataFactory } from './test-data-factory'

export class VoiceDictationTestHelper {
  /**
   * Setup comprehensive voice dictation mocks for testing
   */
  static async setupVoiceDictationMocks(page: any) {
    const mocks = TestDataFactory.generateVoiceDictationMocks()

    // Mock electronAPI methods for dictation
    await page.evaluate((mockData) => {
      window.electronAPI = {
        ...window.electronAPI,
        getOpenAIApiKey: () => Promise.resolve('sk-test-key'),
        isDebugMode: () => Promise.resolve(false),
        saveTempAudio: (buffer, path) => Promise.resolve(`/tmp/test-${path}`),
        transcribeAudio: (audioFilePath, model) => Promise.resolve(mockData.mockTranscriptionResult),
        cleanupTempAudio: (tempPath) => Promise.resolve()
      }
    }, mocks)

    // Mock Web Audio APIs
    await page.addInitScript(() => {
      // Mock navigator.permissions for microphone
      Object.defineProperty(navigator, 'permissions', {
        writable: true,
        value: {
          query: ({ name }) => {
            if (name === 'microphone') {
              return Promise.resolve({ state: 'granted' })
            }
            return Promise.resolve({ state: 'denied' })
          }
        }
      })

      // Mock navigator.mediaDevices
      Object.defineProperty(navigator, 'mediaDevices', {
        writable: true,
        value: {
          getUserMedia: (constraints) => {
            if (constraints.audio) {
              return Promise.resolve({
                id: 'test-stream',
                getTracks: () => [{
                  kind: 'audio',
                  enabled: true,
                  readyState: 'live',
                  stop: () => {}
                }],
                getAudioTracks: () => [{
                  kind: 'audio',
                  enabled: true,
                  readyState: 'live',
                  stop: () => {},
                  getSettings: () => ({ 
                    sampleRate: 48000, 
                    channelCount: 1,
                    deviceId: 'test-microphone'
                  })
                }]
              })
            }
            return Promise.reject(new Error('Audio not requested'))
          }
        }
      })

      // Mock MediaRecorder
      window.MediaRecorder = class MockMediaRecorder {
        constructor(stream, options) {
          this.stream = stream
          this.options = options
          this.state = 'inactive'
          this.mimeType = options?.mimeType || 'audio/webm;codecs=opus'
          this.ondataavailable = null
          this.onstop = null
          this.onerror = null
        }

        start(timeslice) {
          this.state = 'recording'
          // Simulate data chunks
          setTimeout(() => {
            if (this.ondataavailable) {
              this.ondataavailable({ 
                data: new Blob(['test-audio-chunk-1'], { type: this.mimeType }),
                timecode: Date.now()
              })
            }
          }, 100)
          
          setTimeout(() => {
            if (this.ondataavailable) {
              this.ondataavailable({ 
                data: new Blob(['test-audio-chunk-2'], { type: this.mimeType }),
                timecode: Date.now()
              })
            }
          }, 200)
        }

        stop() {
          this.state = 'inactive'
          setTimeout(() => {
            if (this.onstop) this.onstop()
          }, 50)
        }

        pause() {
          this.state = 'paused'
        }

        resume() {
          this.state = 'recording'
        }
      }

      // Ensure MediaRecorder.isTypeSupported works
      window.MediaRecorder.isTypeSupported = (mimeType) => {
        return mimeType.includes('webm') || mimeType.includes('opus')
      }
    })
  }

  /**
   * Setup voice dictation mocks with no capabilities (for testing unavailable state)
   */
  static async setupUnavailableDictationMocks(page: any) {
    await page.evaluate(() => {
      window.electronAPI = {
        ...window.electronAPI,
        getOpenAIApiKey: () => Promise.resolve(null), // No API key
        isDebugMode: () => Promise.resolve(false)
      }
    })

    // Mock denied microphone permission
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'permissions', {
        writable: true,
        value: {
          query: ({ name }) => {
            if (name === 'microphone') {
              return Promise.resolve({ state: 'denied' })
            }
            return Promise.resolve({ state: 'denied' })
          }
        }
      })

      Object.defineProperty(navigator, 'mediaDevices', {
        writable: true,
        value: {
          getUserMedia: () => Promise.reject(new Error('Permission denied'))
        }
      })
    })
  }

  /**
   * Find voice dictation button in the page
   */
  static getDictationButton(page: any) {
    return page.locator('button[title*="voice dictation"], button[aria-label*="voice dictation"], button[title*="dictation"]')
  }

  /**
   * Find context textarea where dictation integrates
   */
  static getContextTextarea(page: any) {
    return page.locator('[data-testid="context-textarea"]')
  }

  /**
   * Simulate complete dictation workflow
   */
  static async simulateDictationWorkflow(page: any, expectedText: string = 'Test transcription result') {
    const button = this.getDictationButton(page)
    const textarea = this.getContextTextarea(page)

    if (await button.count() === 0 || await textarea.count() === 0) {
      return false // Elements not available
    }

    // Get initial text
    const initialText = await textarea.inputValue()

    // Start recording
    await button.click()
    await page.waitForTimeout(100)

    // Stop recording
    await button.click()
    
    // Wait for transcription
    await page.waitForTimeout(500)

    // Check if text was added
    const finalText = await textarea.inputValue()
    return finalText !== initialText
  }

  /**
   * Wait for dictation capabilities to be checked
   */
  static async waitForCapabilitiesCheck(page: any, timeout: number = 2000) {
    await page.waitForTimeout(timeout)
  }

  /**
   * Verify dictation button states
   */
  static async verifyButtonStates(page: any) {
    const button = this.getDictationButton(page)
    
    if (await button.count() === 0) {
      return { available: false }
    }

    const isVisible = await button.isVisible()
    const isEnabled = await button.isEnabled()
    const title = await button.getAttribute('title')
    const ariaLabel = await button.getAttribute('aria-label')

    return {
      available: true,
      visible: isVisible,
      enabled: isEnabled,
      title,
      ariaLabel
    }
  }
}
