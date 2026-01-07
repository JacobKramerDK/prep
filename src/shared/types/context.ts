import { VaultFile } from './vault'
import { Meeting } from './meeting'

// Core context matching interfaces
export interface ContextMatch {
  file: VaultFile
  relevanceScore: number
  matchedFields: string[]
  snippets: string[]
  matchedAt: Date
}

// IPC-safe version with string dates
export interface ContextMatchIPC {
  file: VaultFileIPC
  relevanceScore: number
  matchedFields: string[]
  snippets: string[]
  matchedAt: string // ISO string
}

// IPC-safe VaultFile version
export interface VaultFileIPC {
  path: string
  name: string
  title: string
  content: string
  frontmatter: Record<string, any>
  tags: string[]
  created: string // ISO string
  modified: string // ISO string
  size: number
  // Enhanced metadata fields
  links?: string[]
  backlinks?: string[]
  enhancedTags?: string[]
}

// Context retrieval request
export interface ContextRetrievalRequest {
  meeting: Meeting
  maxResults?: number
  minRelevanceScore?: number
  includeSnippets?: boolean
}

// Context retrieval result
export interface ContextRetrievalResult {
  matches: ContextMatch[]
  totalMatches: number
  searchTime: number
  retrievedAt: Date
}

// IPC-safe version
export interface ContextRetrievalResultIPC {
  matches: ContextMatchIPC[]
  totalMatches: number
  searchTime: number
  retrievedAt: string // ISO string
}

// Context configuration
export interface ContextConfiguration {
  enabled: boolean
  maxResults: number
  minRelevanceScore: number
  includeSnippets: boolean
  snippetLength: number
  searchFields: ('title' | 'content' | 'tags' | 'frontmatter')[]
}

// Utility functions for converting between Date and string versions
export function contextMatchToIPC(match: ContextMatch): ContextMatchIPC {
  return {
    ...match,
    file: {
      ...match.file,
      created: match.file.created.toISOString(),
      modified: match.file.modified.toISOString()
    },
    matchedAt: match.matchedAt.toISOString()
  }
}

export function contextMatchFromIPC(match: ContextMatchIPC): ContextMatch {
  return {
    ...match,
    file: {
      ...match.file,
      created: new Date(match.file.created),
      modified: new Date(match.file.modified)
    },
    matchedAt: new Date(match.matchedAt)
  }
}

export function contextRetrievalResultToIPC(result: ContextRetrievalResult): ContextRetrievalResultIPC {
  return {
    ...result,
    matches: result.matches.map(contextMatchToIPC),
    retrievedAt: result.retrievedAt.toISOString()
  }
}

export function contextRetrievalResultFromIPC(result: ContextRetrievalResultIPC): ContextRetrievalResult {
  return {
    ...result,
    matches: result.matches.map(contextMatchFromIPC),
    retrievedAt: new Date(result.retrievedAt)
  }
}
