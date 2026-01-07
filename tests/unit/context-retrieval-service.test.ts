import { ContextRetrievalService } from '../../src/main/services/context-retrieval-service'
import { VaultIndexer } from '../../src/main/services/vault-indexer'
import { SettingsManager } from '../../src/main/services/settings-manager'
import { Meeting } from '../../src/shared/types/meeting'
import { VaultFile } from '../../src/shared/types/vault'

// Mock dependencies
jest.mock('../../src/main/services/vault-indexer')
jest.mock('../../src/main/services/settings-manager')

// Mock unified and related packages
jest.mock('unified', () => ({
  unified: () => ({
    use: jest.fn().mockReturnThis(),
    parse: jest.fn(() => ({ type: 'root', children: [] }))
  })
}))

jest.mock('remark-parse', () => jest.fn())
jest.mock('remark-frontmatter', () => jest.fn())

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

describe('ContextRetrievalService', () => {
  let contextRetrievalService: ContextRetrievalService
  let mockVaultIndexer: jest.Mocked<VaultIndexer>
  let mockSettingsManager: jest.Mocked<SettingsManager>

  const mockMeeting: Meeting = {
    id: 'meeting-1',
    title: 'Team Standup with Sarah Johnson',
    description: 'Weekly team standup to discuss project progress',
    startDate: new Date('2024-01-15T10:00:00Z'),
    endDate: new Date('2024-01-15T10:30:00Z'),
    location: 'Conference Room A',
    attendees: ['Sarah Johnson <sarah@company.com>', 'John Doe <john@company.com>'],
    isAllDay: false,
    source: 'applescript',
    calendarName: 'Work Calendar'
  }

  const mockVaultFile: VaultFile = {
    path: '/vault/sarah-feedback.md',
    name: 'sarah-feedback.md',
    title: 'Sarah Johnson Feedback Session',
    content: 'Sarah provided excellent feedback on the authentication system. She mentioned concerns about user experience and suggested improvements to the login flow.',
    frontmatter: { author: 'John', date: '2024-01-10' },
    tags: ['feedback', 'authentication', 'ux'],
    created: new Date('2024-01-10'),
    modified: new Date('2024-01-12'),
    size: 200
  }

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Create mocked instances
    mockVaultIndexer = new VaultIndexer() as jest.Mocked<VaultIndexer>
    mockSettingsManager = new SettingsManager() as jest.Mocked<SettingsManager>
    
    contextRetrievalService = new ContextRetrievalService()
    contextRetrievalService.setVaultIndexer(mockVaultIndexer)
    
    // Replace the private settings manager with our mock
    ;(contextRetrievalService as any).settingsManager = mockSettingsManager
  })

  describe('findRelevantContext', () => {
    it('should find relevant context for a meeting', async () => {
      // Mock vault indexer to return search results
      mockVaultIndexer.search.mockResolvedValue([
        { file: mockVaultFile, score: 0.8 }
      ])

      const result = await contextRetrievalService.findRelevantContext(mockMeeting)

      expect(result.matches).toHaveLength(1)
      expect(result.matches[0].file.title).toBe('Sarah Johnson Feedback Session')
      expect(result.matches[0].relevanceScore).toBeGreaterThan(0)
      expect(result.matches[0].matchedFields).toContain('content')
      expect(result.totalMatches).toBe(1)
      expect(result.searchTime).toBeGreaterThan(0)
    })

    it('should return empty results when no context is found', async () => {
      mockVaultIndexer.search.mockResolvedValue([])

      const result = await contextRetrievalService.findRelevantContext(mockMeeting)

      expect(result.matches).toHaveLength(0)
      expect(result.totalMatches).toBe(0)
    })

    it('should filter results by minimum relevance score', async () => {
      const lowRelevanceFile: VaultFile = {
        ...mockVaultFile,
        title: 'Unrelated Note',
        content: 'This note has no relation to the meeting topic'
      }

      mockVaultIndexer.search.mockResolvedValue([
        { file: lowRelevanceFile, score: 0.1 }
      ])

      const result = await contextRetrievalService.findRelevantContext(mockMeeting)

      // Should filter out low relevance results (default min score is 0.3)
      expect(result.matches).toHaveLength(0)
    })

    it('should extract snippets when enabled', async () => {
      const fileWithSnippets: VaultFile = {
        ...mockVaultFile,
        content: 'Sarah Johnson provided feedback. She mentioned authentication concerns. The login flow needs improvement.'
      }

      mockVaultIndexer.search.mockResolvedValue([
        { file: fileWithSnippets, score: 0.8 }
      ])

      const result = await contextRetrievalService.findRelevantContext(mockMeeting)

      expect(result.matches[0].snippets).toBeDefined()
      expect(result.matches[0].snippets.length).toBeGreaterThan(0)
    })

    it('should handle search errors gracefully', async () => {
      mockVaultIndexer.search.mockRejectedValue(new Error('Search failed'))

      const result = await contextRetrievalService.findRelevantContext(mockMeeting)

      expect(result.matches).toHaveLength(0)
      expect(result.totalMatches).toBe(0)
    })

    it('should build appropriate search query from meeting data', async () => {
      mockVaultIndexer.search.mockResolvedValue([])

      await contextRetrievalService.findRelevantContext(mockMeeting)

      expect(mockVaultIndexer.search).toHaveBeenCalledWith(
        expect.stringContaining('Team Standup with Sarah Johnson'),
        expect.any(Number)
      )
    })
  })

  describe('relevance scoring', () => {
    it('should score title matches highly', async () => {
      const titleMatchFile: VaultFile = {
        ...mockVaultFile,
        title: 'Team Standup Notes',
        content: 'Regular content'
      }

      mockVaultIndexer.search.mockResolvedValue([
        { file: titleMatchFile, score: 0.5 }
      ])

      const result = await contextRetrievalService.findRelevantContext(mockMeeting)

      expect(result.matches[0].relevanceScore).toBeGreaterThan(0.3)
      expect(result.matches[0].matchedFields).toContain('title')
    })

    it('should score attendee name matches', async () => {
      const attendeeMatchFile: VaultFile = {
        ...mockVaultFile,
        content: 'Meeting with Sarah Johnson about project updates'
      }

      mockVaultIndexer.search.mockResolvedValue([
        { file: attendeeMatchFile, score: 0.5 }
      ])

      const result = await contextRetrievalService.findRelevantContext(mockMeeting)

      expect(result.matches[0].relevanceScore).toBeGreaterThan(0.3)
    })

    it('should score tag matches appropriately', async () => {
      const tagMatchFile: VaultFile = {
        ...mockVaultFile,
        tags: ['standup', 'team', 'meeting']
      }

      mockVaultIndexer.search.mockResolvedValue([
        { file: tagMatchFile, score: 0.5 }
      ])

      const result = await contextRetrievalService.findRelevantContext(mockMeeting)

      expect(result.matches[0].matchedFields).toContain('tags')
    })
  })

  describe('snippet extraction', () => {
    it('should extract relevant snippets from content', async () => {
      const fileWithContent: VaultFile = {
        ...mockVaultFile,
        content: 'Sarah Johnson mentioned several important points. First, the authentication system needs work. Second, the user experience could be improved. Third, we should focus on the login flow.'
      }

      mockVaultIndexer.search.mockResolvedValue([
        { file: fileWithContent, score: 0.8 }
      ])

      const result = await contextRetrievalService.findRelevantContext(mockMeeting)

      const snippets = result.matches[0].snippets
      expect(snippets).toBeDefined()
      expect(snippets.length).toBeGreaterThan(0)
      expect(snippets.some(snippet => snippet.includes('Sarah Johnson'))).toBe(true)
    })

    it('should limit snippet length', async () => {
      const longContent = 'Sarah Johnson '.repeat(100) + 'provided feedback on the system.'
      const fileWithLongContent: VaultFile = {
        ...mockVaultFile,
        content: longContent
      }

      mockVaultIndexer.search.mockResolvedValue([
        { file: fileWithLongContent, score: 0.8 }
      ])

      const result = await contextRetrievalService.findRelevantContext(mockMeeting)

      const snippets = result.matches[0].snippets
      expect(snippets.every(snippet => snippet.length <= 203)).toBe(true) // 200 + '...'
    })
  })

  describe('utility methods', () => {
    it('should delegate indexing to vault indexer', async () => {
      const mockFiles: VaultFile[] = [mockVaultFile]
      
      await contextRetrievalService.indexVaultFiles(mockFiles)

      expect(mockVaultIndexer.indexFiles).toHaveBeenCalledWith(mockFiles)
    })

    it('should check if indexed', () => {
      mockVaultIndexer.isIndexed.mockReturnValue(true)

      const result = contextRetrievalService.isIndexed()

      expect(result).toBe(true)
      expect(mockVaultIndexer.isIndexed).toHaveBeenCalled()
    })

    it('should get indexed file count', () => {
      mockVaultIndexer.getIndexedFileCount.mockReturnValue(42)

      const result = contextRetrievalService.getIndexedFileCount()

      expect(result).toBe(42)
      expect(mockVaultIndexer.getIndexedFileCount).toHaveBeenCalled()
    })
  })
})
