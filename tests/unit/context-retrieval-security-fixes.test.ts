import { ContextRetrievalService } from '../../src/main/services/context-retrieval-service'
import { VaultIndexer } from '../../src/main/services/vault-indexer'
import { Meeting } from '../../src/shared/types/meeting'

describe('ContextRetrievalService Security Fixes', () => {
  let service: ContextRetrievalService
  let mockIndexer: jest.Mocked<VaultIndexer>

  beforeEach(() => {
    mockIndexer = {
      search: jest.fn(),
      isIndexed: jest.fn().mockReturnValue(true),
      getIndexedFileCount: jest.fn().mockReturnValue(10)
    } as any

    service = new ContextRetrievalService(mockIndexer)
  })

  describe('Email parsing security', () => {
    it('should handle extremely long attendee strings without ReDoS', async () => {
      const longString = 'a'.repeat(10000) + '<test@example.com>'
      const meeting: Meeting = {
        id: 'test',
        title: 'Test Meeting',
        startDate: new Date(),
        endDate: new Date(),
        attendees: [longString],
        description: '',
        location: '',
        isAllDay: false,
        source: 'applescript'
      }

      mockIndexer.search.mockResolvedValue([])

      const startTime = Date.now()
      await service.findRelevantContext(meeting)
      const duration = Date.now() - startTime

      // Should complete quickly (under 100ms) even with malicious input
      expect(duration).toBeLessThan(100)
    })

    it('should parse email formats correctly with safe string parsing', async () => {
      const meeting: Meeting = {
        id: 'test',
        title: 'Test Meeting',
        startDate: new Date(),
        endDate: new Date(),
        attendees: [
          'John Doe <john@example.com>',
          'jane@example.com',
          'Bob Smith',
          'Alice <alice@test.com>'
        ],
        description: '',
        location: '',
        isAllDay: false,
        source: 'applescript'
      }

      mockIndexer.search.mockResolvedValue([])

      const result = await service.findRelevantContext(meeting)
      
      // Should complete without errors
      expect(result).toBeDefined()
      expect(result.matches).toEqual([])
    })

    it('should handle malformed email strings safely', async () => {
      const meeting: Meeting = {
        id: 'test',
        title: 'Test Meeting',
        startDate: new Date(),
        endDate: new Date(),
        attendees: [
          '<<<>>>',
          'malformed<email',
          'test@',
          '@example.com',
          ''
        ],
        description: '',
        location: '',
        isAllDay: false,
        source: 'applescript'
      }

      mockIndexer.search.mockResolvedValue([])

      const result = await service.findRelevantContext(meeting)
      
      // Should complete without errors
      expect(result).toBeDefined()
      expect(result.matches).toEqual([])
    })
  })
})
