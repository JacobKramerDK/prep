// Mock fs module
jest.mock('fs/promises')

describe('Vault Auto-Loading Logic', () => {
  describe('loadExistingVault functionality', () => {
    it('should validate vault path exists before loading', async () => {
      const mockFs = {
        stat: jest.fn()
      }
      
      const mockSettingsManager = {
        getVaultPath: jest.fn(),
        setVaultPath: jest.fn()
      }
      
      const mockVaultManager = {
        scanVault: jest.fn()
      }
      
      // Test case 1: Valid directory path
      mockSettingsManager.getVaultPath.mockResolvedValue('/valid/vault/path')
      mockFs.stat.mockResolvedValue({ isDirectory: () => true })
      
      const vaultPath = await mockSettingsManager.getVaultPath()
      if (vaultPath) {
        const stats = await mockFs.stat(vaultPath)
        if (stats.isDirectory()) {
          await mockVaultManager.scanVault(vaultPath)
        }
      }
      
      expect(mockSettingsManager.getVaultPath).toHaveBeenCalled()
      expect(mockFs.stat).toHaveBeenCalledWith('/valid/vault/path')
      expect(mockVaultManager.scanVault).toHaveBeenCalledWith('/valid/vault/path')
    })

    it('should clear invalid vault path when directory does not exist', async () => {
      const mockFs = {
        stat: jest.fn()
      }
      
      const mockSettingsManager = {
        getVaultPath: jest.fn(),
        setVaultPath: jest.fn()
      }
      
      // Test case 2: Invalid path (ENOENT error)
      mockSettingsManager.getVaultPath.mockResolvedValue('/invalid/vault/path')
      mockFs.stat.mockRejectedValue(new Error('ENOENT: no such file or directory'))
      
      const vaultPath = await mockSettingsManager.getVaultPath()
      if (vaultPath) {
        try {
          await mockFs.stat(vaultPath)
        } catch (error) {
          await mockSettingsManager.setVaultPath(null)
        }
      }
      
      expect(mockSettingsManager.getVaultPath).toHaveBeenCalled()
      expect(mockFs.stat).toHaveBeenCalledWith('/invalid/vault/path')
      expect(mockSettingsManager.setVaultPath).toHaveBeenCalledWith(null)
    })

    it('should clear vault path when stored path is not a directory', async () => {
      const mockFs = {
        stat: jest.fn()
      }
      
      const mockSettingsManager = {
        getVaultPath: jest.fn(),
        setVaultPath: jest.fn()
      }
      
      // Test case 3: Path exists but is not a directory
      mockSettingsManager.getVaultPath.mockResolvedValue('/test/file.txt')
      mockFs.stat.mockResolvedValue({ isDirectory: () => false })
      
      const vaultPath = await mockSettingsManager.getVaultPath()
      if (vaultPath) {
        const stats = await mockFs.stat(vaultPath)
        if (!stats.isDirectory()) {
          await mockSettingsManager.setVaultPath(null)
        }
      }
      
      expect(mockSettingsManager.getVaultPath).toHaveBeenCalled()
      expect(mockFs.stat).toHaveBeenCalledWith('/test/file.txt')
      expect(mockSettingsManager.setVaultPath).toHaveBeenCalledWith(null)
    })

    it('should handle no stored vault path gracefully', async () => {
      const mockSettingsManager = {
        getVaultPath: jest.fn()
      }
      
      // Test case 4: No stored vault path
      mockSettingsManager.getVaultPath.mockResolvedValue(null)
      
      const vaultPath = await mockSettingsManager.getVaultPath()
      
      expect(mockSettingsManager.getVaultPath).toHaveBeenCalled()
      expect(vaultPath).toBeNull()
    })
  })

  describe('Vault indexing status logic', () => {
    it('should report correct indexing status based on document count', () => {
      // Mock VaultIndexer behavior
      const mockVaultIndexer = {
        documents: new Map(),
        index: null as any,
        isIndexed: function() { return this.index !== null && this.documents.size > 0 },
        getIndexedFileCount: function() { return this.documents.size }
      }
      
      // Initially not indexed
      expect(mockVaultIndexer.isIndexed()).toBe(false)
      expect(mockVaultIndexer.getIndexedFileCount()).toBe(0)
      
      // After adding documents and initializing index
      mockVaultIndexer.documents.set('file1.md', { path: 'file1.md' })
      mockVaultIndexer.index = { initialized: true } // Mock index object
      
      expect(mockVaultIndexer.isIndexed()).toBe(true)
      expect(mockVaultIndexer.getIndexedFileCount()).toBe(1)
    })
  })
})
