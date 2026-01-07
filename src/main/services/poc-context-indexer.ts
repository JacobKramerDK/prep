import { Document } from 'flexsearch'
import * as fs from 'fs/promises'
import * as path from 'path'
import matter from 'gray-matter'
import stringComparison from 'string-comparison'

interface VaultDocument {
  id: string
  title: string
  content: string
  tags: string[]
  attendees: string[]
  stakeholders: string[]
  author?: string
  date?: string
  filePath: string
  [key: string]: any // Index signature for FlexSearch compatibility
}

interface ContextMatch {
  document: VaultDocument
  relevanceScore: number
  matchedFields: string[]
  snippets: string[]
}

export class PoCContextIndexer {
  private index: Document<VaultDocument>
  private documents: Map<string, VaultDocument> = new Map()

  constructor() {
    this.index = new Document({
      tokenize: 'forward',
      document: {
        id: 'id',
        field: ['title', 'content', 'tags', 'attendees', 'stakeholders', 'author']
      }
    })
  }

  async indexVault(vaultPath: string): Promise<void> {
    console.time('Vault Indexing')
    
    const files = await this.findMarkdownFiles(vaultPath)
    console.log(`Found ${files.length} markdown files`)

    for (const filePath of files) {
      try {
        await this.indexFile(filePath)
      } catch (error) {
        console.error(`Error indexing ${filePath}:`, error)
      }
    }

    console.timeEnd('Vault Indexing')
    console.log(`Indexed ${this.documents.size} documents`)
  }

  private async findMarkdownFiles(vaultPath: string): Promise<string[]> {
    const files: string[] = []
    
    async function scanDirectory(dir: string) {
      const entries = await fs.readdir(dir, { withFileTypes: true })
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name)
        
        if (entry.isDirectory()) {
          await scanDirectory(fullPath)
        } else if (entry.isFile() && entry.name.endsWith('.md')) {
          files.push(fullPath)
        }
      }
    }

    await scanDirectory(vaultPath)
    return files
  }

  private async indexFile(filePath: string): Promise<void> {
    const content = await fs.readFile(filePath, 'utf-8')
    const parsed = matter(content)
    
    const doc: VaultDocument = {
      id: filePath,
      title: parsed.data.title || path.basename(filePath, '.md'),
      content: parsed.content,
      tags: this.extractArray(parsed.data.tags),
      attendees: this.extractArray(parsed.data.attendees),
      stakeholders: this.extractArray(parsed.data.stakeholders),
      author: parsed.data.author,
      date: parsed.data.date,
      filePath
    }

    this.documents.set(doc.id, doc)
    this.index.add(doc)
  }

  private extractArray(value: any): string[] {
    if (Array.isArray(value)) return value
    if (typeof value === 'string') return [value]
    return []
  }

  async findRelevantContext(
    meetingTitle: string,
    attendees: string[] = [],
    topics: string[] = []
  ): Promise<ContextMatch[]> {
    console.time('Context Search')
    
    const matches: ContextMatch[] = []
    
    // Search by attendees
    for (const attendee of attendees) {
      const results = this.index.search(attendee, { limit: 10 })
      for (const searchResult of results) {
        if (searchResult.result) {
          for (const docId of searchResult.result) {
            const doc = this.documents.get(docId as string)
            if (doc) {
              matches.push(this.createContextMatch(doc, attendee, 'attendees'))
            }
          }
        }
      }
    }

    // Search by meeting title
    if (meetingTitle) {
      const results = this.index.search(meetingTitle, { limit: 10 })
      for (const searchResult of results) {
        if (searchResult.result) {
          for (const docId of searchResult.result) {
            const doc = this.documents.get(docId as string)
            if (doc) {
              matches.push(this.createContextMatch(doc, meetingTitle, 'title'))
            }
          }
        }
      }
    }

    // Search by topics
    for (const topic of topics) {
      const results = this.index.search(topic, { limit: 10 })
      for (const searchResult of results) {
        if (searchResult.result) {
          for (const docId of searchResult.result) {
            const doc = this.documents.get(docId as string)
            if (doc) {
              matches.push(this.createContextMatch(doc, topic, 'content'))
            }
          }
        }
      }
    }

    // Remove duplicates and sort by relevance
    const uniqueMatches = this.deduplicateMatches(matches)
    const sortedMatches = uniqueMatches.sort((a, b) => b.relevanceScore - a.relevanceScore)

    console.timeEnd('Context Search')
    console.log(`Found ${sortedMatches.length} relevant documents`)

    return sortedMatches.slice(0, 5) // Return top 5 matches
  }

  private createContextMatch(
    doc: VaultDocument,
    query: string,
    matchedField: string
  ): ContextMatch {
    // Calculate relevance using cosine similarity
    const titleSimilarity = stringComparison.cosine.similarity(query.toLowerCase(), doc.title.toLowerCase())
    const contentSimilarity = stringComparison.cosine.similarity(query.toLowerCase(), doc.content.toLowerCase())
    
    const relevanceScore = Math.max(titleSimilarity, contentSimilarity)
    
    // Extract snippet around the match
    const snippets = this.extractSnippets(doc.content, query)
    
    return {
      document: doc,
      relevanceScore,
      matchedFields: [matchedField],
      snippets
    }
  }

  private extractSnippets(content: string, query: string, maxSnippets: number = 2): string[] {
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0)
    const queryLower = query.toLowerCase()
    
    const matchingSentences = sentences
      .filter(sentence => sentence.toLowerCase().includes(queryLower))
      .slice(0, maxSnippets)
      .map(sentence => sentence.trim() + '.')
    
    return matchingSentences
  }

  private deduplicateMatches(matches: ContextMatch[]): ContextMatch[] {
    const seen = new Set<string>()
    const unique: ContextMatch[] = []
    
    for (const match of matches) {
      if (!seen.has(match.document.id)) {
        seen.add(match.document.id)
        unique.push(match)
      }
    }
    
    return unique
  }

  getStats(): { totalDocuments: number; indexSize: number } {
    return {
      totalDocuments: this.documents.size,
      indexSize: this.documents.size // Simplified for PoC
    }
  }
}
