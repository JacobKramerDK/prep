import { VaultIndexer } from '../../src/main/services/vault-indexer'
import { VaultFile } from '../../src/shared/types/vault'

// Mock FlexSearch
jest.mock('flexsearch', () => {
  const mockDocument = {
    add: jest.fn(),
    search: jest.fn(),
  }
  
  return {
    Document: jest.fn(() => mockDocument),
    __mockDocument: mockDocument
  }
})

// Mock unified and remark
jest.mock('unified', () => ({
  unified: () => ({
    use: jest.fn().mockReturnThis(),
    parse: jest.fn(() => ({ type: 'root', children: [] }))
  })
}))

jest.mock('remark-parse', () => jest.fn())
jest.mock('remark-frontmatter', () => jest.fn())

describe('VaultIndexer', () => {
  let vaultIndexer: VaultIndexer
  let mockFlexSearchDocument: any

  beforeEach(() => {
    jest.clearAllMocks()
    vaultIndexer = new VaultIndexer()
    
    // Get the mock FlexSearch document instance
    const FlexSearch = require('flexsearch')
    mockFlexSearchDocument = FlexSearch.__mockDocument
  })

  describe('indexFiles', () => {
    it('should index files successfully', async () => {
      const mockFiles: VaultFile[] = [
        {
          path: '/vault/note1.md',
          name: 'note1.md',
          title: 'Test Note 1',
          content: 'This is test content with [[link]] and #tag',
          frontmatter: { author: 'test' },
          tags: ['test'],
          created: new Date('2024-01-01'),
          modified: new Date('2024-01-02'),
          size: 100
        },
        {
          path: '/vault/note2.md',
          name: 'note2.md',
          title: 'Test Note 2',
          content: 'Another note with different content',
          frontmatter: {},
          tags: ['another'],
          created: new Date('2024-01-03'),
          modified: new Date('2024-01-04'),
          size: 80
        }
      ]

      await vaultIndexer.indexFiles(mockFiles)

      // Verify FlexSearch add was called for each file
      expect(mockFlexSearchDocument.add).toHaveBeenCalledTimes(2)
      
      // Verify the first file was indexed correctly
      expect(mockFlexSearchDocument.add).toHaveBeenCalledWith({
        id: '/vault/note1.md',
        title: 'Test Note 1',
        content: 'This is test content with [[link]] and #tag',
        tags: 'test',
        frontmatter: '{"author":"test"}',
        path: '/vault/note1.md'
      })
    })

    it('should handle empty file list', async () => {
      await vaultIndexer.indexFiles([])
      
      expect(mockFlexSearchDocument.add).not.toHaveBeenCalled()
      expect(vaultIndexer.getIndexedFileCount()).toBe(0)
    })

    it('should handle files with enhanced metadata', async () => {
      const mockFile: VaultFile = {
        path: '/vault/note.md',
        name: 'note.md',
        title: 'Note with Links',
        content: 'Content with [[internal link]] and [external](http://example.com) and #hashtag',
        frontmatter: {},
        tags: ['original'],
        created: new Date(),
        modified: new Date(),
        size: 100
      }

      await vaultIndexer.indexFiles([mockFile])

      expect(mockFlexSearchDocument.add).toHaveBeenCalledWith(
        expect.objectContaining({
          id: '/vault/note.md',
          title: 'Note with Links',
          content: expect.stringContaining('internal link'),
          tags: 'original',
          path: '/vault/note.md'
        })
      )
    })
  })

  describe('search', () => {
    beforeEach(async () => {
      // Index some test files first
      const mockFiles: VaultFile[] = [
        {
          path: '/vault/meeting-notes.md',
          name: 'meeting-notes.md',
          title: 'Team Meeting Notes',
          content: 'Discussion about project timeline and Sarah Johnson feedback',
          frontmatter: {},
          tags: ['meeting', 'team'],
          created: new Date(),
          modified: new Date(),
          size: 100
        }
      ]
      
      await vaultIndexer.indexFiles(mockFiles)
    })

    it('should return search results', async () => {
      // Mock FlexSearch to return results
      mockFlexSearchDocument.search.mockReturnValue([
        { result: ['/vault/meeting-notes.md'] }
      ])

      const results = await vaultIndexer.search('Sarah Johnson', 5)

      expect(mockFlexSearchDocument.search).toHaveBeenCalledWith('Sarah Johnson', {
        limit: 5,
        suggest: true
      })
      
      expect(results).toHaveLength(1)
      expect(results[0].file.title).toBe('Team Meeting Notes')
      expect(results[0].score).toBeGreaterThan(0)
    })

    it('should return empty results for no matches', async () => {
      mockFlexSearchDocument.search.mockReturnValue([])

      const results = await vaultIndexer.search('nonexistent', 5)

      expect(results).toHaveLength(0)
    })

    it('should handle search errors gracefully', async () => {
      mockFlexSearchDocument.search.mockImplementation(() => {
        throw new Error('Search failed')
      })

      const results = await vaultIndexer.search('test query', 5)

      expect(results).toHaveLength(0)
    })

    it('should return empty results when not indexed', async () => {
      const newIndexer = new VaultIndexer()
      const results = await newIndexer.search('test', 5)

      expect(results).toHaveLength(0)
    })
  })

  describe('utility methods', () => {
    it('should report correct indexed file count', async () => {
      expect(vaultIndexer.getIndexedFileCount()).toBe(0)

      const mockFiles: VaultFile[] = [
        {
          path: '/vault/note1.md',
          name: 'note1.md',
          title: 'Test Note',
          content: 'Content',
          frontmatter: {},
          tags: [],
          created: new Date(),
          modified: new Date(),
          size: 50
        }
      ]

      await vaultIndexer.indexFiles(mockFiles)
      expect(vaultIndexer.getIndexedFileCount()).toBe(1)
    })

    it('should report indexed status correctly', async () => {
      expect(vaultIndexer.isIndexed()).toBe(false)

      const mockFiles: VaultFile[] = [
        {
          path: '/vault/note.md',
          name: 'note.md',
          title: 'Test',
          content: 'Content',
          frontmatter: {},
          tags: [],
          created: new Date(),
          modified: new Date(),
          size: 50
        }
      ]

      await vaultIndexer.indexFiles(mockFiles)
      expect(vaultIndexer.isIndexed()).toBe(true)
    })

    it('should clear index correctly', async () => {
      const mockFiles: VaultFile[] = [
        {
          path: '/vault/note.md',
          name: 'note.md',
          title: 'Test',
          content: 'Content',
          frontmatter: {},
          tags: [],
          created: new Date(),
          modified: new Date(),
          size: 50
        }
      ]

      await vaultIndexer.indexFiles(mockFiles)
      expect(vaultIndexer.isIndexed()).toBe(true)

      vaultIndexer.clear()
      expect(vaultIndexer.isIndexed()).toBe(false)
      expect(vaultIndexer.getIndexedFileCount()).toBe(0)
    })
  })
})
