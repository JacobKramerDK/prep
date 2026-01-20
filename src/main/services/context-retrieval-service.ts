import { VaultIndexer } from './vault-indexer'
import { SettingsManager } from './settings-manager'
import { TextCleaner } from '../../shared/utils/text-cleaner'
import { Meeting } from '../../shared/types/meeting'
import { ContextMatch, ContextRetrievalRequest, ContextRetrievalResult, ContextConfiguration } from '../../shared/types/context'
import { VaultFile } from '../../shared/types/vault'
import { RelevanceWeights, DEFAULT_RELEVANCE_WEIGHTS } from '../../shared/types/relevance-weights'

export class ContextRetrievalService {
  private vaultIndexer: VaultIndexer | null = null
  private settingsManager: SettingsManager
  private defaultConfig: ContextConfiguration = {
    enabled: true,
    maxResults: 10,
    minRelevanceScore: 0.15, // Increased from 0.01 to 0.15
    includeSnippets: true,
    snippetLength: 400,
    searchFields: ['title', 'content', 'tags', 'frontmatter']
  }

  constructor(vaultIndexer?: VaultIndexer) {
    this.vaultIndexer = vaultIndexer || null
    this.settingsManager = new SettingsManager()
  }

  private debugLog(message: string, ...args: any[]): void {
    if (this.settingsManager.getDebugMode()) {
      console.log(message, ...args)
    }
  }

  setVaultIndexer(vaultIndexer: VaultIndexer): void {
    this.vaultIndexer = vaultIndexer
  }

  async findRelevantContext(meeting: Meeting): Promise<ContextRetrievalResult> {
    const startTime = Date.now()
    
    try {
      // Check if vault indexer is available
      if (!this.vaultIndexer) {
        return {
          matches: [],
          totalMatches: 0,
          searchTime: Date.now() - startTime,
          retrievedAt: new Date()
        }
      }

      // Build search query from meeting data
      const searchQuery = this.buildSearchQuery(meeting)
      if (this.settingsManager.getDebugMode()) {
        console.log('🔍 Context search query:', searchQuery)
      }
      
      // Get configuration
      const config = await this.getContextConfiguration()
      if (this.settingsManager.getDebugMode()) {
        console.log('⚙️ Context config:', { minRelevanceScore: config.minRelevanceScore, maxResults: config.maxResults })
      }
      
      if (!config.enabled) {
        return {
          matches: [],
          totalMatches: 0,
          searchTime: Date.now() - startTime,
          retrievedAt: new Date()
        }
      }

      // Search vault index
      const searchResults = await this.vaultIndexer.search(searchQuery, config.maxResults * 2) // Get more to filter
      if (this.settingsManager.getDebugMode()) {
        console.log('📊 Vault search results:', searchResults.length)
      }
      
      // If no results with full query, try individual terms
      let fallbackResults: any[] = []
      if (searchResults.length === 0 && searchQuery.includes(' ')) {
        if (this.settingsManager.getDebugMode()) {
          console.log('🔄 Trying fallback search with individual terms...')
        }
        const terms = searchQuery.split(' ').filter(term => term.length > 2)
        for (const term of terms.slice(0, 3)) { // Try first 3 terms
          const termResults = await this.vaultIndexer.search(term, 5)
          fallbackResults.push(...termResults)
          if (fallbackResults.length >= 10) break
        }
        if (this.settingsManager.getDebugMode()) {
          console.log('📊 Fallback search results:', fallbackResults.length)
        }
      }
      
      const allResults = searchResults.length > 0 ? searchResults : fallbackResults
      
      // Calculate relevance scores and create context matches
      const matches: ContextMatch[] = []
      
      for (const result of allResults) {
        const relevanceScore = await this.calculateRelevanceScore(meeting, result.file)
        if (this.settingsManager.getDebugMode()) {
          console.log(`📄 File: ${result.file.title}, Score: ${relevanceScore.toFixed(3)}, Threshold: ${config.minRelevanceScore}`)
        }
        
        if (relevanceScore >= config.minRelevanceScore) {
          const contextMatch: ContextMatch = {
            file: result.file,
            relevanceScore,
            matchedFields: this.getMatchedFields(meeting, result.file),
            snippets: config.includeSnippets ? this.extractSnippets(result.file, searchQuery, config.snippetLength) : [],
            matchedAt: new Date()
          }
          
          matches.push(contextMatch)
        }
      }

      // Sort by relevance score and limit results
      matches.sort((a, b) => b.relevanceScore - a.relevanceScore)
      const finalMatches = matches.slice(0, config.maxResults)

      return {
        matches: finalMatches,
        totalMatches: matches.length,
        searchTime: Date.now() - startTime,
        retrievedAt: new Date()
      }
    } catch (error) {
      console.error('Context retrieval failed:', error)
      return {
        matches: [],
        totalMatches: 0,
        searchTime: Date.now() - startTime,
        retrievedAt: new Date()
      }
    }
  }

  private buildSearchQuery(meeting: Meeting): string {
    const queryParts: string[] = []
    
    // Add meeting title
    if (meeting.title) {
      queryParts.push(meeting.title)
      if (this.settingsManager.getDebugMode()) {
        console.log('🏷️ Added title to query:', meeting.title)
      }
    }
    
    // Add meeting description (filtered)
    if (meeting.description) {
      const cleanedDescription = this.cleanMeetingDescription(meeting.description)
      if (cleanedDescription) {
        queryParts.push(cleanedDescription)
        if (this.settingsManager.getDebugMode()) {
          console.log('📝 Added cleaned description to query:', cleanedDescription.substring(0, 100) + '...')
        }
      }
    }
    
    // Add attendees (extract names from email addresses)
    if (meeting.attendees && meeting.attendees.length > 0) {
      meeting.attendees.forEach(attendee => {
        // Safe email parsing with input length validation
        const trimmedAttendee = attendee.trim()
        if (trimmedAttendee.length > 200) {
          // Skip overly long inputs to prevent ReDoS
          queryParts.push(trimmedAttendee.substring(0, 50))
        } else {
          // Use safer string parsing instead of complex regex
          const angleIndex = trimmedAttendee.indexOf('<')
          let name = ''
          let email = ''
          
          if (angleIndex !== -1 && trimmedAttendee.endsWith('>')) {
            name = trimmedAttendee.substring(0, angleIndex).trim()
            email = trimmedAttendee.substring(angleIndex + 1, trimmedAttendee.length - 1).trim()
          } else if (trimmedAttendee.includes('@')) {
            email = trimmedAttendee
          } else {
            name = trimmedAttendee
          }
          
          // Add name if present and not just whitespace
          if (name && name.trim()) {
            queryParts.push(name.trim())
          }
          
          // Add email domain if email is present
          const emailToProcess = email || (name && name.includes('@') ? name : '')
          if (emailToProcess) {
            const domainMatch = emailToProcess.match(/@([^.]+)/)
            if (domainMatch) {
              queryParts.push(domainMatch[1])
            }
          }
          
          // If no name or email found, use the entire string
          if (!name && !email) {
            queryParts.push(trimmedAttendee)
          }
        }
      })
    }
    
    // Add location if available (but clean it first)
    if (meeting.location) {
      const cleanedLocation = this.cleanLocation(meeting.location)
      if (cleanedLocation) {
        queryParts.push(cleanedLocation)
        if (this.settingsManager.getDebugMode()) {
          console.log('📍 Added location to query:', cleanedLocation)
        }
      }
    }
    
    const finalQuery = queryParts.join(' ')
    
    // Remove duplicate words from the query
    const words = finalQuery.split(/\s+/)
    const uniqueWords = [...new Set(words.map(word => word.toLowerCase()))]
      .map(lowerWord => words.find(word => word.toLowerCase() === lowerWord))
      .filter(word => word && word.length > 2) // Remove short words
    
    const deduplicatedQuery = uniqueWords.join(' ')
    if (this.settingsManager.getDebugMode()) {
      console.log('🔍 Final search query:', deduplicatedQuery)
    }
    return deduplicatedQuery
  }

  private cleanMeetingDescription(description: string): string {
    // If it contains Zoom meeting details, extract only the meaningful part at the beginning
    if (description.includes('Zoom') || description.includes('Meeting')) {
      // Look for the actual meeting purpose before Zoom details
      const lines = description.split('\n')
      const meaningfulLines = []
      
      for (const line of lines) {
        const trimmed = line.trim()
        // Stop at Zoom invitation indicators
        if (trimmed.match(/Hi there|is inviting you|Join Zoom|Meeting URL|Password|Telephone/i)) {
          break
        }
        if (trimmed.length > 5 && !trimmed.match(/^\[|^<|trackunit/i)) {
          meaningfulLines.push(trimmed)
        }
      }
      
      return meaningfulLines.join(' ').substring(0, 100)
    }
    
    // For non-Zoom descriptions, just clean lightly
    return description.replace(/\[.*?\]/g, '').replace(/\s+/g, ' ').trim().substring(0, 200)
  }

  private cleanLocation(location: string): string {
    // If it's a Zoom URL, ignore it completely
    if (location.includes('zoom.us') || location.includes('http')) {
      return ''
    }
    return location.trim()
  }

  private getFileDate(file: VaultFile): Date | null {
    // Priority order: frontmatter date fields, then file modification date
    const frontmatter = file.frontmatter || {}
    
    // Common frontmatter date field names
    const dateFields = ['date', 'created', 'updated', 'modified', 'timestamp']
    
    for (const field of dateFields) {
      const dateValue = frontmatter[field]
      if (dateValue) {
        try {
          const parsedDate = new Date(dateValue)
          if (!isNaN(parsedDate.getTime())) {
            return parsedDate
          }
        } catch (error) {
          // Continue to next field if parsing fails
        }
      }
    }
    
    // Fallback to file modification date
    return file.modified || null
  }

  private async calculateRelevanceScore(meeting: Meeting, file: VaultFile): Promise<number> {
    let score = 0
    
    // Get configurable weights from settings, fallback to defaults
    let weights: RelevanceWeights
    try {
      weights = await this.settingsManager.getRelevanceWeights()
    } catch (error) {
      // Log specific error and fallback to default weights
      console.warn('Failed to load relevance weights, using defaults:', error instanceof Error ? error.message : 'Unknown error')
      weights = DEFAULT_RELEVANCE_WEIGHTS
    }
    
    // Give bonus points for being found by FlexSearch (it already did the heavy lifting)
    score += weights.flexSearchBonus
    
    // Add recency bonus based on file modification date or frontmatter date
    const fileDate = this.getFileDate(file)
    if (fileDate) {
      const daysSinceDate = (Date.now() - fileDate.getTime()) / (1000 * 60 * 60 * 24)
      if (daysSinceDate <= 7) {
        score += weights.recencyBonus // Full bonus for files within a week
      } else if (daysSinceDate <= 30) {
        score += weights.recencyBonus * 0.7 // 70% bonus for files within a month
      } else if (daysSinceDate <= 90) {
        score += weights.recencyBonus * 0.4 // 40% bonus for files within 3 months
      }
    }
    
    const searchTerms = this.extractSearchTerms(meeting)
    
    // Title similarity
    if (file.title) {
      const titleSimilarity = this.calculateTextSimilarity(searchTerms.join(' '), file.title)
      score += titleSimilarity * weights.title
    }
    
    // Content similarity (limit to first 10KB for performance)
    const contentSample = file.content.substring(0, 10000)
    const contentSimilarity = this.calculateTextSimilarity(searchTerms.join(' '), contentSample)
    score += contentSimilarity * weights.content
    
    // Tags similarity
    if (file.tags && file.tags.length > 0) {
      const tagText = file.tags.join(' ')
      const tagSimilarity = this.calculateTextSimilarity(searchTerms.join(' '), tagText)
      score += tagSimilarity * weights.tags
    }
    
    // Attendee name matching
    if (meeting.attendees) {
      const attendeeScore = this.calculateAttendeeScore(meeting.attendees, file)
      score += attendeeScore * weights.attendees
    }
    
    return Math.min(score, 1.0) // Cap at 1.0
  }

  private calculateTextSimilarity(text1: string, text2: string): number {
    try {
      // Normalize text for comparison
      const normalize = (text: string) => text.toLowerCase().replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim()
      
      const normalized1 = normalize(text1)
      const normalized2 = normalize(text2)
      
      // Handle empty text cases
      if (!normalized1 || !normalized2) return 0
      
      const words1 = normalized1.split(' ').filter(word => word.length > 0)
      const words2 = normalized2.split(' ').filter(word => word.length > 0)
      
      // Handle edge cases
      if (words1.length === 0 && words2.length === 0) return 1 // Both empty after filtering
      if (words1.length === 0 || words2.length === 0) return 0 // One empty after filtering
      
      const set1 = new Set(words1)
      const set2 = new Set(words2)
      
      // Optimized intersection calculation using Set operations
      const intersection = new Set([...set1].filter(x => set2.has(x)))
      const intersectionCount = intersection.size
      
      const unionCount = set1.size + set2.size - intersectionCount
      
      return unionCount > 0 ? intersectionCount / unionCount : 0
    } catch (error) {
      console.error('Text similarity calculation failed:', error)
      return 0
    }
  }

  private calculateAttendeeScore(attendees: string[], file: VaultFile): number {
    let maxScore = 0
    
    attendees.forEach(attendee => {
      // Extract name from email format
      const nameMatch = attendee.match(/^([^<]+)/)
      if (nameMatch) {
        const name = nameMatch[1].trim()
        
        // Check if name appears in file content or title
        const nameInTitle = file.title.toLowerCase().includes(name.toLowerCase()) ? 0.8 : 0
        const nameInContent = file.content.toLowerCase().includes(name.toLowerCase()) ? 0.6 : 0
        
        maxScore = Math.max(maxScore, nameInTitle, nameInContent)
      }
    })
    
    return maxScore
  }

  private extractSearchTerms(meeting: Meeting): string[] {
    const terms: string[] = []
    
    if (meeting.title) terms.push(meeting.title)
    if (meeting.description) terms.push(meeting.description)
    if (meeting.location) terms.push(meeting.location)
    
    return terms
  }

  private getMatchedFields(meeting: Meeting, file: VaultFile): string[] {
    const matchedFields: string[] = []
    const searchTerms = this.extractSearchTerms(meeting).join(' ').toLowerCase()
    
    if (file.title.toLowerCase().includes(searchTerms) || this.calculateTextSimilarity(searchTerms, file.title) > 0.3) {
      matchedFields.push('title')
    }
    
    if (file.content.toLowerCase().includes(searchTerms) || this.calculateTextSimilarity(searchTerms, file.content.substring(0, 1000)) > 0.2) {
      matchedFields.push('content')
    }
    
    if (file.tags.some(tag => searchTerms.includes(tag.toLowerCase()))) {
      matchedFields.push('tags')
    }
    
    return matchedFields
  }

  private extractSnippets(file: VaultFile, query: string, maxLength: number): string[] {
    const snippets: string[] = []
    const queryTerms = query.toLowerCase().split(' ').filter(term => term.length > 2)
    
    // Limit content processing for performance (10KB should be sufficient for context)
    const contentSample = file.content.substring(0, 10000)
    
    // Pre-compute lowercase version to avoid repeated operations
    const lowerContent = contentSample.toLowerCase()
    
    // Split content into sentences using the original case for output
    const sentences = contentSample.split(/[.!?]+/).filter(s => s.trim().length > 0)
    const lowerSentences = lowerContent.split(/[.!?]+/).filter(s => s.trim().length > 0)
    
    for (let i = 0; i < sentences.length && i < lowerSentences.length; i++) {
      const sentence = sentences[i]
      const lowerSentence = lowerSentences[i]
      
      // Check if sentence contains any query terms
      const hasQueryTerm = queryTerms.some(term => lowerSentence.includes(term))
      
      if (hasQueryTerm) {
        let snippet = sentence.trim()
        
        // Clean snippet of markdown and special characters
        snippet = TextCleaner.cleanSnippet(snippet)
        
        // Truncate if too long
        if (snippet.length > maxLength) {
          snippet = snippet.substring(0, maxLength - 3) + '...'
        }
        
        snippets.push(snippet)
        
        // Limit number of snippets
        if (snippets.length >= 3) break
      }
    }
    
    return snippets
  }

  private async getContextConfiguration(): Promise<ContextConfiguration> {
    // For now, return default config. In the future, this could be stored in settings
    return this.defaultConfig
  }

  async indexVaultFiles(files: VaultFile[]): Promise<void> {
    if (!this.vaultIndexer) {
      throw new Error('VaultIndexer not initialized')
    }
    await this.vaultIndexer.indexFiles(files)
  }

  isIndexed(): boolean {
    return this.vaultIndexer?.isIndexed() ?? false
  }

  getIndexedFileCount(): number {
    return this.vaultIndexer?.getIndexedFileCount() ?? 0
  }
}
