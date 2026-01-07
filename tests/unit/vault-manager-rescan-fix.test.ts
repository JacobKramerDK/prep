import { VaultManager } from '../../src/main/services/vault-manager'
import * as fs from 'fs/promises'

// Mock the dependencies
jest.mock('fs/promises')
jest.mock('../../src/main/services/settings-manager')
jest.mock('../../src/main/services/vault-indexer')

const mockFs = fs as jest.Mocked<typeof fs>

describe('VaultManager Recursive Rescan Fix', () => {
  let vaultManager: VaultManager

  beforeEach(() => {
    vaultManager = new VaultManager()
    jest.clearAllMocks()
  })

  describe('Recursive rescan prevention', () => {
    it('should prevent recursive rescans when file not found', async () => {
      // Setup mock vault
      const vaultPath = '/test/vault'
      mockFs.stat.mockResolvedValue({ isDirectory: () => true } as any)
      mockFs.readdir.mockResolvedValue([])

      // Scan vault first
      await vaultManager.scanVault(vaultPath)

      // Mock file not found error
      mockFs.readFile.mockRejectedValue(new Error('ENOENT: no such file or directory'))

      // First call should trigger rescan
      const scanSpy = jest.spyOn(vaultManager, 'scanVault')
      
      try {
        await vaultManager.readFile('/test/vault/nonexistent.md')
      } catch (error) {
        // Expected to throw
      }

      // Should have called scanVault once for the rescan
      expect(scanSpy).toHaveBeenCalledTimes(1)

      // Reset the spy
      scanSpy.mockClear()

      // Second immediate call should NOT trigger another rescan (prevention)
      try {
        await vaultManager.readFile('/test/vault/nonexistent.md')
      } catch (error) {
        // Expected to throw
      }

      // Should not have called scanVault again due to isRescanning flag
      expect(scanSpy).toHaveBeenCalledTimes(0)
    })

    it('should allow rescans after the flag is reset', async () => {
      const vaultPath = '/test/vault'
      mockFs.stat.mockResolvedValue({ isDirectory: () => true } as any)
      mockFs.readdir.mockResolvedValue([])

      await vaultManager.scanVault(vaultPath)

      mockFs.readFile.mockRejectedValue(new Error('ENOENT: no such file or directory'))

      const scanSpy = jest.spyOn(vaultManager, 'scanVault')

      // First call
      try {
        await vaultManager.readFile('/test/vault/nonexistent.md')
      } catch (error) {
        // Expected
      }

      expect(scanSpy).toHaveBeenCalledTimes(1)
      scanSpy.mockClear()

      // Wait a bit to ensure flag is reset
      await new Promise(resolve => setTimeout(resolve, 10))

      // Second call after flag reset should allow rescan
      try {
        await vaultManager.readFile('/test/vault/another-nonexistent.md')
      } catch (error) {
        // Expected
      }

      expect(scanSpy).toHaveBeenCalledTimes(1)
    })
  })
})
