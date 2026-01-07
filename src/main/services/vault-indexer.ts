import * as FlexSearch from 'flexsearch'
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkFrontmatter from 'remark-frontmatter'
import { VaultFile } from '../../shared/types/vault'

// FlexSearch document interface
interface IndexedDocument {
  id: string
  title: string
  content: string
  tags: string
  frontmatter: string
  path: string
  [key: string]: string // Index signature for FlexSearch compatibility
}

export class VaultIndexer {
  private index: FlexSearch.Document<IndexedDocument> | null = null
  private documents: Map<string, VaultFile> = new Map()
  private processor = unified()
    .use(remarkParse)
    .use(remarkFrontmatter, ['yaml', 'toml'])

  constructor() {
    this.initializeIndex()
  }

  private initializeIndex(): void {
    this.index = new FlexSearch.Document<IndexedDocument>({
      document: {
        id: 'id',
        index: ['title', 'content', 'tags', 'frontmatter']
      },
      tokenize: 'forward',
      cache: 100
    })
  }

  async indexFiles(files: VaultFile[]): Promise<void> {
    // Clear existing index to prevent conflicts
    this.documents.clear()
    
    // Properly dispose of existing FlexSearch instance
    if (this.index) {
      try {
        // Check if destroy method exists before calling it
        if (this.index && typeof (this.index as any).destroy === 'function') {
          (this.index as any).destroy()
        }
      } catch (error) {
        // Silently handle disposal errors - not critical for functionality
        console.warn('Failed to dispose FlexSearch index:', error)
      } finally {
        this.index = null
      }
    }
    
    // Initialize fresh index
    this.initializeIndex()

    let indexTime = 0
    if (process.env.NODE_ENV === 'development') {
      const startTime = Date.now()
      
      for (const file of files) {
        try {
          await this.indexFile(file)
        } catch (error) {
          console.error(`Failed to index file ${file.path}:`, error)
        }
      }

      indexTime = Date.now() - startTime
      console.log(`Indexed ${files.length} files in ${indexTime}ms (${(indexTime / files.length).toFixed(1)}ms/file)`)
    } else {
      // Production: index without timing
      for (const file of files) {
        try {
          await this.indexFile(file)
        } catch (error) {
          console.error(`Failed to index file ${file.path}:`, error)
        }
      }
    }
  }

  private async indexFile(file: VaultFile): Promise<void> {
    if (!this.index) return

    // Extract enhanced metadata
    const enhancedFile = await this.enhanceFileMetadata(file)
    
    // Store the enhanced file
    this.documents.set(file.path, enhancedFile)

    // Create searchable document
    const doc: IndexedDocument = {
      id: file.path,
      title: file.title,
      content: file.content,
      tags: file.tags.join(' '),
      frontmatter: JSON.stringify(file.frontmatter),
      path: file.path
    }

    // Add to FlexSearch index
    this.index.add(doc)
  }

  private async enhanceFileMetadata(file: VaultFile): Promise<VaultFile> {
    try {
      // Parse markdown to extract links and other metadata
      const tree = this.processor.parse(file.content)
      
      // Extract wiki-style links [[link]]
      const links: string[] = []
      const linkRegex = /\[\[([^\]]+)\]\]/g
      let match
      while ((match = linkRegex.exec(file.content)) !== null) {
        links.push(match[1])
      }

      // Extract markdown links [text](link)
      const markdownLinkRegex = /\[([^\]]+)\]\(([^)]+)\)/g
      while ((match = markdownLinkRegex.exec(file.content)) !== null) {
        links.push(match[2])
      }

      // Extract enhanced tags from content (including #tags)
      const enhancedTags = [...file.tags]
      const hashtagRegex = /#([a-zA-Z0-9_-]+)/g
      while ((match = hashtagRegex.exec(file.content)) !== null) {
        const tag = match[1]
        if (!enhancedTags.includes(tag)) {
          enhancedTags.push(tag)
        }
      }

      return {
        ...file,
        links: Array.from(new Set(links)), // Remove duplicates
        enhancedTags
      } as VaultFile & { links?: string[]; enhancedTags?: string[] }
    } catch (error) {
      console.error(`Failed to enhance metadata for ${file.path}:`, error)
      return file
    }
  }

  async search(query: string, maxResults: number = 10): Promise<Array<{ file: VaultFile; score: number }>> {
    if (!this.index || this.documents.size === 0) {
      return []
    }

    let searchTime = 0
    if (process.env.NODE_ENV === 'development') {
      const startTime = Date.now()
      
      try {
        const results = await this.performSearch(query, maxResults)
        searchTime = Date.now() - startTime
        console.log(`Search completed in ${searchTime}ms`)
        return results
      } catch (error) {
        console.error('Search failed:', error)
        return []
      }
    } else {
      // Production: search without timing
      try {
        return await this.performSearch(query, maxResults)
      } catch (error) {
        console.error('Search failed:', error)
        return []
      }
    }
  }

  private async performSearch(query: string, maxResults: number): Promise<Array<{ file: VaultFile; score: number }>> {
    if (!this.index) {
      return []
    }
    
    // Search across all indexed fields
    const results = this.index.search(query, {
      limit: maxResults,
      suggest: true
    })

      // Simplified result handling with proper type guards
      const allResults = new Map<string, number>()
      
      // Handle FlexSearch results - can be array or object
      const processResults = (resultData: any, baseScore: number = 1) => {
        if (Array.isArray(resultData)) {
          resultData.forEach((id: string, index: number) => {
            if (typeof id === 'string') {
              const score = baseScore / (index + 1)
              allResults.set(id, Math.max(allResults.get(id) || 0, score))
            }
          })
        }
      }
      
      if (Array.isArray(results)) {
        // Handle array format
        results.forEach((result: any) => {
          if (result && Array.isArray(result)) {
            processResults(result)
          } else if (result && typeof result === 'object' && Array.isArray(result.result)) {
            processResults(result.result)
          }
        })
      } else if (results && typeof results === 'object') {
        // Handle object format with field results
        Object.values(results).forEach((fieldResults: any) => {
          processResults(fieldResults)
        })
      }

      // Convert to final results
      const finalResults = Array.from(allResults.entries())
        .map(([path, score]) => {
          const file = this.documents.get(path)
          return file ? { file, score } : null
        })
        .filter((result): result is { file: VaultFile; score: number } => result !== null)
        .sort((a, b) => b.score - a.score)
        .slice(0, maxResults)

      return finalResults
  }

  getIndexedFileCount(): number {
    return this.documents.size
  }

  isIndexed(): boolean {
    return this.index !== null && this.documents.size > 0
  }

  clear(): void {
    this.documents.clear()
    this.initializeIndex()
  }
}
