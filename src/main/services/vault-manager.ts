import * as fs from 'fs/promises'
import * as path from 'path'
import matter from 'gray-matter'
import chokidar from 'chokidar'
import { VaultFile, VaultIndex, SearchResult } from '../../shared/types/vault'
import { SettingsManager } from './settings-manager'
import { VaultIndexer } from './vault-indexer'

export class VaultManager {
  private vaultPath: string | null = null
  private index: VaultIndex | null = null
  private watcher: chokidar.FSWatcher | null = null
  private settingsManager: SettingsManager
  private vaultIndexer: VaultIndexer
  private fileChangeQueue: Array<() => Promise<void>> = []
  private processingQueue = false
  private isRescanning = false

  constructor() {
    this.settingsManager = new SettingsManager()
    this.vaultIndexer = new VaultIndexer()
    
    // Register cleanup handlers for unexpected exits (only in production)
    if (process.env.NODE_ENV !== 'test') {
      process.on('exit', () => {
        if (this.watcher) {
          this.watcher.close()
        }
      })
      
      process.on('SIGINT', async () => {
        await this.dispose()
        process.exit(0)
      })
      
      process.on('SIGTERM', async () => {
        await this.dispose()
        process.exit(0)
      })
    }
  }

  async scanVault(vaultPath: string): Promise<VaultIndex> {
    try {
      // Validate vault path
      const stats = await fs.stat(vaultPath)
      if (!stats.isDirectory()) {
        throw new Error('Selected path is not a directory')
      }

      this.vaultPath = vaultPath
      await this.settingsManager.setVaultPath(vaultPath)

      // Scan for markdown files
      const files = await this.scanDirectory(vaultPath)
      const vaultFiles: VaultFile[] = []
      const errors: Array<{ filePath: string; error: string }> = []

      for (const filePath of files) {
        try {
          const vaultFile = await this.parseMarkdownFile(filePath)
          vaultFiles.push(vaultFile)
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          console.warn(`Failed to parse file ${filePath}:`, error)
          errors.push({ filePath, error: errorMessage })
        }
      }

      const index: VaultIndex = {
        files: vaultFiles,
        totalFiles: vaultFiles.length,
        lastIndexed: new Date(),
        vaultPath,
        ...(errors.length > 0 && { errors })
      }

      this.index = index
      await this.settingsManager.setLastVaultScan(new Date())

      // Index files for context retrieval (safe re-indexing)
      try {
        await this.vaultIndexer.indexFiles(vaultFiles)
      } catch (indexError) {
        console.warn('Context indexing failed, but vault scan completed:', indexError)
        // Don't fail the entire vault scan if indexing fails
      }

      // Start file watching
      this.startFileWatching(vaultPath)

      return index
    } catch (error) {
      throw new Error(`Failed to scan vault: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async searchFiles(query: string): Promise<SearchResult[]> {
    if (!this.index) {
      throw new Error('No vault indexed. Please scan a vault first.')
    }

    if (!query.trim()) {
      return []
    }

    await this.settingsManager.addSearchQuery(query)
    const results: SearchResult[] = []
    const queryLower = query.toLowerCase()

    for (const file of this.index.files) {
      const matches: SearchResult['matches'] = []
      let score = 0

      // Search in title
      const titleIndex = file.title.toLowerCase().indexOf(queryLower)
      if (titleIndex !== -1) {
        matches.push({
          field: 'title',
          snippet: this.createSnippet(file.title, titleIndex, query.length),
          position: titleIndex
        })
        score += 10 // Higher score for title matches
      }

      // Search in content
      const contentIndex = file.content.toLowerCase().indexOf(queryLower)
      if (contentIndex !== -1) {
        matches.push({
          field: 'content',
          snippet: this.createSnippet(file.content, contentIndex, query.length),
          position: contentIndex
        })
        score += 5
      }

      // Search in tags
      const matchingTags = file.tags.filter(tag => 
        tag.toLowerCase().includes(queryLower)
      )
      if (matchingTags.length > 0) {
        matches.push({
          field: 'tags',
          snippet: matchingTags.join(', '),
          position: 0
        })
        score += 7 * matchingTags.length
      }

      if (matches.length > 0) {
        results.push({
          file,
          matches,
          score
        })
      }
    }

    // Sort by score (highest first)
    results.sort((a, b) => b.score - a.score)

    const preferences = await this.settingsManager.getPreferences()
    return results.slice(0, preferences.maxSearchResults)
  }

  async readFile(filePath: string): Promise<string> {
    if (!this.vaultPath) {
      throw new Error('No vault selected')
    }

    // Security: Ensure file is within vault directory
    const resolvedPath = path.resolve(filePath)
    const resolvedVaultPath = path.resolve(this.vaultPath)
    
    if (!resolvedPath.startsWith(resolvedVaultPath)) {
      throw new Error('Access denied: File is outside vault directory')
    }

    try {
      return await fs.readFile(resolvedPath, 'utf-8')
    } catch (error) {
      if (error instanceof Error && error.message.includes('ENOENT')) {
        // File not found - trigger a vault rescan to update the index (prevent recursion)
        if (!this.isRescanning) {
          console.warn(`File not found: ${filePath}. Triggering vault rescan.`)
          this.isRescanning = true
          try {
            await this.scanVault(this.vaultPath)
          } finally {
            this.isRescanning = false
          }
        }
        throw new Error(`File not found: ${path.basename(filePath)}. The vault has been rescanned - please try again.`)
      }
      throw new Error(`Failed to read file: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  private async scanDirectory(dirPath: string): Promise<string[]> {
    const files: string[] = []
    const resolvedDirPath = path.resolve(dirPath)
    
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true, recursive: true })
      
      for (const entry of entries) {
        if (entry.isFile() && path.extname(entry.name).toLowerCase() === '.md') {
          const fullPath = path.join(dirPath, entry.name)
          const resolvedPath = path.resolve(fullPath)
          
          // Security: Ensure the resolved path is within the vault directory
          if (!resolvedPath.startsWith(resolvedDirPath + path.sep) && resolvedPath !== resolvedDirPath) {
            console.warn(`Skipping file outside vault directory: ${entry.name}`)
            continue
          }
          
          files.push(fullPath)
        }
      }
    } catch (error) {
      console.warn(`Failed to scan directory ${dirPath}:`, error)
    }

    return files
  }

  private async parseMarkdownFile(filePath: string): Promise<VaultFile> {
    const content = await fs.readFile(filePath, 'utf-8')
    const stats = await fs.stat(filePath)
    
    const { data: frontmatter, content: markdownContent } = matter(content)
    
    // Extract title from frontmatter or filename
    const title = frontmatter.title || 
                 frontmatter.name || 
                 path.basename(filePath, '.md')
    
    // Extract tags from frontmatter
    let tags: string[] = []
    if (frontmatter.tags) {
      if (Array.isArray(frontmatter.tags)) {
        tags = frontmatter.tags.map(tag => String(tag))
      } else if (typeof frontmatter.tags === 'string') {
        tags = frontmatter.tags.split(',').map(tag => tag.trim())
      }
    }

    return {
      path: filePath,
      name: path.basename(filePath),
      title,
      content: markdownContent,
      frontmatter,
      tags,
      created: stats.birthtime,
      modified: stats.mtime,
      size: stats.size
    }
  }

  private createSnippet(text: string, position: number, queryLength: number): string {
    const snippetLength = 100
    const start = Math.max(0, position - snippetLength / 2)
    const end = Math.min(text.length, position + queryLength + snippetLength / 2)
    
    let snippet = text.slice(start, end)
    
    if (start > 0) snippet = '...' + snippet
    if (end < text.length) snippet = snippet + '...'
    
    return snippet
  }

  private startFileWatching(vaultPath: string): void {
    if (this.watcher) {
      this.watcher.close()
    }

    this.watcher = chokidar.watch(path.join(vaultPath, '**/*.md'), {
      ignored: /(^|[\/\\])\../, // ignore dotfiles
      persistent: true,
      ignoreInitial: true
    })

    this.watcher
      .on('add', (filePath) => this.handleFileChange(filePath, 'add'))
      .on('change', (filePath) => this.handleFileChange(filePath, 'change'))
      .on('unlink', (filePath) => this.handleFileChange(filePath, 'unlink'))
  }

  private async handleFileChange(filePath: string, event: 'add' | 'change' | 'unlink'): Promise<void> {
    // Queue file changes to prevent race conditions
    return new Promise((resolve) => {
      this.fileChangeQueue.push(async () => {
        await this.processFileChange(filePath, event)
        resolve()
      })
      this.processQueue()
    })
  }

  private async processQueue(): Promise<void> {
    if (this.processingQueue || this.fileChangeQueue.length === 0) {
      return
    }

    this.processingQueue = true
    
    while (this.fileChangeQueue.length > 0) {
      const task = this.fileChangeQueue.shift()
      if (task) {
        try {
          await task()
        } catch (error) {
          console.warn('Error processing file change:', error)
        }
      }
    }
    
    this.processingQueue = false
  }

  private async processFileChange(filePath: string, event: 'add' | 'change' | 'unlink'): Promise<void> {
    if (!this.index) return

    try {
      if (event === 'unlink') {
        // Remove file from index
        this.index.files = this.index.files.filter(file => file.path !== filePath)
        this.index.totalFiles = this.index.files.length
      } else {
        // Add or update file in index
        const vaultFile = await this.parseMarkdownFile(filePath)
        const existingIndex = this.index.files.findIndex(file => file.path === filePath)
        
        if (existingIndex !== -1) {
          this.index.files[existingIndex] = vaultFile
        } else {
          this.index.files.push(vaultFile)
          this.index.totalFiles = this.index.files.length
        }
      }
      
      this.index.lastIndexed = new Date()
    } catch (error) {
      console.warn(`Failed to handle file change for ${filePath}:`, error)
    }
  }

  async disconnectVault(): Promise<void> {
    // Clear the vault connection without deleting any files
    this.vaultPath = null
    this.index = null
    
    // Close file watcher
    if (this.watcher) {
      await this.watcher.close()
      this.watcher = null
    }
    
    // Clear vault settings
    await this.settingsManager.setVaultPath(null)
    
    // Clear vault indexer
    this.vaultIndexer.clear()
  }

  async dispose(): Promise<void> {
    if (this.watcher) {
      await this.watcher.close()
      this.watcher = null
    }
  }

  getVaultIndexer(): VaultIndexer {
    return this.vaultIndexer
  }
}
