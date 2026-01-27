import { _electron as electron, ElectronApplication } from 'playwright'
import { randomUUID } from 'crypto'
import { tmpdir } from 'os'
import { join } from 'path'

export interface TestAppOptions {
  testId?: string
  mockSettings?: boolean
  timeout?: number
}

export interface TestAppInstance {
  app: ElectronApplication
  cleanup: () => Promise<void>
}

export class TestAppFactory {
  private static instances: Map<string, TestAppInstance> = new Map()

  static async createTestApp(options: TestAppOptions = {}): Promise<TestAppInstance> {
    const {
      testId = randomUUID(),
      mockSettings = true,
      timeout = 30000
    } = options

    // Ensure unique test environment with clean Google credentials
    const cleanEnv = { ...process.env }
    delete cleanEnv.GOOGLE_CLIENT_ID
    delete cleanEnv.GOOGLE_CLIENT_SECRET
    
    const testEnv = {
      NODE_ENV: 'test',
      TEST_ID: testId,
      ELECTRON_STORE_NAME: `prep-settings-test-${testId}`,
      ELECTRON_STORE_PATH: join(tmpdir(), `prep-test-${testId}`),
      ...cleanEnv
    }

    const app = await electron.launch({
      args: [join(process.cwd(), 'dist/main/src/main/index.js')],
      timeout,
      env: testEnv
    })

    const cleanup = async () => {
      try {
        await app.close()
        TestAppFactory.instances.delete(testId)
      } catch (error) {
        console.warn(`Failed to cleanup test app ${testId}:`, error)
      }
    }

    const instance: TestAppInstance = { app, cleanup }
    TestAppFactory.instances.set(testId, instance)

    return instance
  }

  static async cleanupAll(): Promise<void> {
    const cleanupPromises = Array.from(TestAppFactory.instances.values()).map(
      instance => instance.cleanup()
    )
    await Promise.allSettled(cleanupPromises)
    TestAppFactory.instances.clear()
  }
}

// Convenience function for simple usage
export const createTestApp = TestAppFactory.createTestApp.bind(TestAppFactory)
