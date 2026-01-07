import { VaultIndexer } from '../../src/main/services/vault-indexer'
import { VaultFile } from '../../src/shared/types/vault'

describe('VaultIndexer Safety Fixes', () => {
  let indexer: VaultIndexer

  beforeEach(() => {
    indexer = new VaultIndexer()
  })

  describe('FlexSearch disposal safety', () => {
    it('should safely dispose of FlexSearch instance without errors', async () => {
      const mockFiles: VaultFile[] = [
        {
          path: '/test/file1.md',
          name: 'file1.md',
          title: 'Test File 1',
          content: 'Test content',
          frontmatter: {},
          tags: [],
          created: new Date(),
          modified: new Date(),
          size: 100
        }
      ]

      // Index some files first
      await indexer.indexFiles(mockFiles)
      expect(indexer.isIndexed()).toBe(true)

      // Re-indexing should safely dispose of previous instance
      await expect(indexer.indexFiles(mockFiles)).resolves.not.toThrow()
      expect(indexer.isIndexed()).toBe(true)
    })

    it('should handle multiple disposal attempts safely', async () => {
      const mockFiles: VaultFile[] = []

      // Multiple calls should not throw errors
      await expect(indexer.indexFiles(mockFiles)).resolves.not.toThrow()
      await expect(indexer.indexFiles(mockFiles)).resolves.not.toThrow()
      await expect(indexer.indexFiles(mockFiles)).resolves.not.toThrow()
    })

    it('should clear index safely', () => {
      expect(() => indexer.clear()).not.toThrow()
      expect(() => indexer.clear()).not.toThrow() // Multiple calls should be safe
    })
  })

  describe('Performance optimizations', () => {
    it('should not execute timing code in production environment', async () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'production'

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation()

      const mockFiles: VaultFile[] = [
        {
          path: '/test/file1.md',
          name: 'file1.md',
          title: 'Test File 1',
          content: 'Test content',
          frontmatter: {},
          tags: [],
          created: new Date(),
          modified: new Date(),
          size: 100
        }
      ]

      await indexer.indexFiles(mockFiles)

      // Should not log timing information in production
      expect(consoleSpy).not.toHaveBeenCalledWith(expect.stringContaining('Indexed'))

      consoleSpy.mockRestore()
      process.env.NODE_ENV = originalEnv
    })
  })
})
