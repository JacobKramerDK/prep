import { PoCContextIndexer } from '../../src/main/services/poc-context-indexer'
import * as path from 'path'

describe('PoC Context Matching', () => {
  let indexer: PoCContextIndexer
  const sampleVaultPath = path.join(__dirname, 'sample-vault')

  beforeAll(async () => {
    indexer = new PoCContextIndexer()
    await indexer.indexVault(sampleVaultPath)
  })

  test('should index sample vault successfully', () => {
    const stats = indexer.getStats()
    expect(stats.totalDocuments).toBeGreaterThan(0)
    console.log(`Indexed ${stats.totalDocuments} documents`)
  })

  test('should find relevant context for meeting with Sarah Johnson', async () => {
    const matches = await indexer.findRelevantContext(
      'Product Strategy Meeting',
      ['Sarah Johnson'],
      ['product strategy', 'roadmap']
    )

    expect(matches.length).toBeGreaterThan(0)
    
    // Should find the product roadmap and meeting notes
    const titles = matches.map(m => m.document.title)
    console.log('Found relevant documents:', titles)
    
    // Verify relevance scores
    matches.forEach(match => {
      expect(match.relevanceScore).toBeGreaterThan(0)
      console.log(`${match.document.title}: ${match.relevanceScore.toFixed(3)}`)
    })
  })

  test('should find authentication-related context', async () => {
    const matches = await indexer.findRelevantContext(
      'Authentication System Review',
      ['Mike Chen'],
      ['authentication', 'security', 'login']
    )

    expect(matches.length).toBeGreaterThan(0)
    
    // Should find technical architecture and user research
    const hasAuthContent = matches.some(m => 
      m.document.title.toLowerCase().includes('authentication') ||
      m.document.content.toLowerCase().includes('authentication')
    )
    expect(hasAuthContent).toBe(true)
    
    console.log('Authentication context found:')
    matches.forEach(match => {
      console.log(`- ${match.document.title} (${match.relevanceScore.toFixed(3)})`)
      if (match.snippets.length > 0) {
        console.log(`  Snippet: ${match.snippets[0].substring(0, 100)}...`)
      }
    })
  })

  test('should find design system context for Alex Rodriguez', async () => {
    const matches = await indexer.findRelevantContext(
      'Design System Planning',
      ['Alex Rodriguez'],
      ['design system', 'components', 'ui']
    )

    expect(matches.length).toBeGreaterThan(0)
    
    console.log('Design system context:')
    matches.forEach(match => {
      console.log(`- ${match.document.title} (${match.relevanceScore.toFixed(3)})`)
    })
  })

  test('should handle meetings with no relevant context gracefully', async () => {
    const matches = await indexer.findRelevantContext(
      'Completely Unrelated Topic',
      ['Unknown Person'],
      ['nonexistent topic']
    )

    // Should return empty array or very low relevance scores
    expect(matches.length).toBeGreaterThanOrEqual(0)
    
    if (matches.length > 0) {
      matches.forEach(match => {
        expect(match.relevanceScore).toBeLessThan(0.5) // Low relevance threshold
      })
    }
    
    console.log(`No relevant context found (${matches.length} low-relevance matches)`)
  })

  test('should extract meaningful snippets', async () => {
    const matches = await indexer.findRelevantContext(
      'Authentication',
      ['Mike Chen'],
      []
    )

    const matchesWithSnippets = matches.filter(m => m.snippets.length > 0)
    expect(matchesWithSnippets.length).toBeGreaterThan(0)
    
    console.log('Sample snippets:')
    matchesWithSnippets.slice(0, 2).forEach(match => {
      console.log(`From "${match.document.title}":`)
      match.snippets.forEach(snippet => {
        console.log(`  "${snippet}"`)
      })
    })
  })
})
