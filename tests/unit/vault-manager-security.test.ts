import { VaultManager } from '../../src/main/services/vault-manager'
import * as fs from 'fs/promises'

jest.mock('fs/promises')
jest.mock('gray-matter')
jest.mock('chokidar', () => ({
  watch: jest.fn(() => ({
    on: jest.fn().mockReturnThis(),
    close: jest.fn()
  }))
}))

// Mock path module
jest.mock('path', () => {
  const originalPath = jest.requireActual('path')
  return {
    ...originalPath,
    resolve: jest.fn((...args) => {
      const joined = originalPath.join(...args)
      // Simulate path traversal attack
      if (joined.includes('malicious')) {
        return '/etc/passwd' // Outside vault
      }
      return originalPath.resolve(...args)
    })
  }
})

const mockFs = fs as jest.Mocked<typeof fs>

describe('VaultManager Security Fixes', () => {
  let vaultManager: VaultManager
  
  beforeEach(() => {
    vaultManager = new VaultManager()
    jest.clearAllMocks()
  })

  describe('Path Traversal Protection', () => {
    it('should reject files outside vault directory', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation()
      
      mockFs.stat.mockResolvedValue({
        isDirectory: () => true,
        birthtime: new Date(),
        mtime: new Date(),
        size: 1024
      } as any)

      // Mock readdir to return a malicious file
      mockFs.readdir.mockResolvedValue([
        { name: 'malicious.md', isFile: () => true }
      ] as any)

      const result = await vaultManager.scanVault('/safe/vault')

      // Should skip the malicious file
      expect(result.files).toHaveLength(0)
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Skipping file outside vault directory')
      )
      
      consoleSpy.mockRestore()
    })

    it('should allow legitimate files within vault', async () => {
      mockFs.stat.mockResolvedValue({
        isDirectory: () => true,
        birthtime: new Date(),
        mtime: new Date(),
        size: 1024
      } as any)

      mockFs.readdir.mockResolvedValue([
        { name: 'legitimate-file.md', isFile: () => true }
      ] as any)

      mockFs.readFile.mockResolvedValue('# Test Content')
      
      const matter = require('gray-matter')
      matter.mockReturnValue({
        data: {},
        content: '# Test Content',
        orig: '',
        language: '',
        matter: '',
        stringify: jest.fn()
      })

      const result = await vaultManager.scanVault('/safe/vault')

      expect(result.files).toHaveLength(1)
      expect(result.files[0].name).toBe('legitimate-file.md')
    })
  })

  describe('Race Condition Protection', () => {
    it('should process file changes sequentially', async () => {
      // Set up vault first
      mockFs.stat.mockResolvedValue({
        isDirectory: () => true,
        birthtime: new Date(),
        mtime: new Date(),
        size: 1024
      } as any)

      mockFs.readdir.mockResolvedValue([])
      await vaultManager.scanVault('/test/vault')

      // Mock file operations
      mockFs.readFile.mockResolvedValue('# Test')
      const matter = require('gray-matter')
      matter.mockReturnValue({
        data: {},
        content: '# Test',
        orig: '',
        language: '',
        matter: '',
        stringify: jest.fn()
      })

      // Simulate multiple rapid file changes
      const promises = [
        (vaultManager as any).handleFileChange('/test/vault/file1.md', 'add'),
        (vaultManager as any).handleFileChange('/test/vault/file2.md', 'add'),
        (vaultManager as any).handleFileChange('/test/vault/file3.md', 'add')
      ]

      await Promise.all(promises)

      // All changes should be processed without corruption
      const index = (vaultManager as any).index
      expect(index.files).toHaveLength(3)
    })
  })
})
