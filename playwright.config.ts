import { defineConfig, devices } from '@playwright/test'
import { TestEnvironment } from './tests/config/test-environment'

export default defineConfig({
  testDir: './tests/e2e-stable',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html', { open: 'never' }],
    ['json', { outputFile: 'test-results/results.json' }]
  ],
  timeout: 60000, // Increased timeout for calendar sync operations
  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },
  globalSetup: require.resolve('./tests/config/global-setup.ts'),
  globalTeardown: require.resolve('./tests/config/global-teardown.ts'),
  projects: [
    {
      name: 'electron-stable',
      use: { 
        ...devices['Desktop Chrome'],
        // Test isolation settings
        launchOptions: {
          env: {
            NODE_ENV: 'test',
            DISABLE_NETWORK_REQUESTS: 'true',
            MOCK_OPENAI_API: 'true',
            MOCK_CALENDAR_API: 'true'
          }
        }
      },
      testDir: './tests/e2e-stable'
    },
    {
      name: 'electron-integration',
      use: { 
        ...devices['Desktop Chrome'],
        launchOptions: {
          env: {
            NODE_ENV: 'test',
            DISABLE_NETWORK_REQUESTS: 'false',
            MOCK_OPENAI_API: 'false',
            MOCK_CALENDAR_API: 'false'
          }
        }
      },
      testDir: './tests/e2e-integration',
      testIgnore: process.env.CI ? '**/*' : undefined // Skip in CI
    }
  ],
})
