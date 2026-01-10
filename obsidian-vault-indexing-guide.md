# Obsidian Vault Indexing & Meeting Brief Generation

## Overview

This document explains how Prep's Obsidian vault indexing system works and how it integrates with AI-powered meeting brief generation to surface relevant historical context.

## Vault Indexing System

### 1. FlexSearch-Based Indexing

The `VaultIndexer` uses FlexSearch to create a full-text search index of all Obsidian vault files:

- **Multi-field indexing**: Indexes `title`, `content`, `tags`, and `frontmatter` separately
- **Enhanced metadata extraction**: Extracts wiki-links `[[link]]`, markdown links, and hashtags `#tag`
- **Performance optimized**: Uses forward tokenization with caching for fast searches
- **Incremental updates**: Can re-index files when vault changes

### 2. File Processing Pipeline

Each markdown file goes through this process:

```typescript
1. Parse frontmatter and extract metadata
2. Extract wiki-links [[]] and markdown links
3. Find hashtags #tag in content
4. Create searchable document with all fields
5. Add to FlexSearch index
```

### 3. Search Capabilities

- **Multi-field search**: Searches across title, content, tags, and frontmatter simultaneously
- **Relevance scoring**: FlexSearch provides relevance scores for each match
- **Configurable limits**: Can limit results and set minimum relevance thresholds

## Context Retrieval for Meetings

### 1. Smart Query Building

The `ContextRetrievalService` builds search queries from meeting data:

**Query components:**
- Meeting title
- Meeting description  
- Attendee names (extracted from emails)
- Meeting location
- Company domains (from attendee emails)

### 2. Relevance Scoring Algorithm

Uses weighted scoring across multiple factors:

- **Title similarity** (40%): How well meeting terms match file titles
- **Content similarity** (30%): Matches in file content (first 10KB for performance)
- **Tag similarity** (20%): Matches in file tags
- **Attendee matching** (10%): Names found in file content

### 3. Context Matching Process

```typescript
1. Build search query from meeting details
2. Search vault index with FlexSearch
3. Calculate custom relevance scores
4. Filter by minimum relevance threshold (default: 0.3)
5. Extract relevant snippets from matching files
6. Sort by relevance and limit results
```

## Integration with Meeting Brief Generation

### 1. Context Enhancement

When generating a meeting brief, the system:

```typescript
// In main/index.ts - generateMeetingBrief handler
if (request.includeContext && contextRetrievalService.isIndexed()) {
  const contextResult = await contextRetrievalService.findRelevantContext(meeting)
  if (contextResult.matches.length > 0) {
    enhancedRequest = {
      ...request,
      includeContext: true,
      contextMatches: contextResult.matches
    }
  }
}
```

### 2. OpenAI Prompt Construction

The `OpenAIService` builds prompts that include:

- **Meeting details**: Title, date, time, location, description
- **User context**: Custom notes from the user
- **Historical context**: Relevant vault files with:
  - File titles and paths
  - Relevance scores
  - Key excerpts/snippets
  - Matched fields

### 3. Brief Generation Structure

The AI generates briefs with sections like:

1. **Executive Summary** - Meeting overview
2. **Key Discussion Points** - Based on context
3. **Historical Context Integration** - How past notes relate
4. **Preparation Checklist** - Specific prep items
5. **Questions to Consider** - Thoughtful discussion starters
6. **Success Metrics** - How to measure meeting success

## Performance Optimizations

### 1. Indexing Performance

- **Batch processing**: Indexes all files in one operation
- **Memory efficient**: Clears old index before rebuilding
- **Development timing**: Logs indexing performance in dev mode

### 2. Search Performance

- **Content limits**: Only processes first 10KB of large files for relevance scoring
- **Result limits**: Gets 2x requested results, then filters and sorts
- **Caching**: FlexSearch includes built-in result caching

### 3. Security Measures

- **Input validation**: Limits attendee string length to prevent ReDoS attacks
- **Safe parsing**: Uses simple string operations instead of complex regex
- **Error handling**: Graceful fallbacks when context retrieval fails

## Real-World Usage Flow

1. **User connects Obsidian vault** → Files are indexed with FlexSearch
2. **User has upcoming meeting** → System detects from calendar
3. **User requests meeting brief** → Context retrieval searches vault
4. **Relevant notes found** → Snippets and relevance scores calculated
5. **OpenAI generates brief** → Includes historical context and specific recommendations
6. **User gets comprehensive brief** → With past discussions, action items, and prep checklist

## Key Files

- **`src/main/services/vault-indexer.ts`** - FlexSearch indexing implementation
- **`src/main/services/context-retrieval-service.ts`** - Context matching and relevance scoring
- **`src/main/services/openai-service.ts`** - AI brief generation with context integration
- **`src/main/index.ts`** - Main integration logic connecting all services

## Configuration

Default context retrieval settings:

```typescript
{
  enabled: true,
  maxResults: 10,
  minRelevanceScore: 0.3,
  includeSnippets: true,
  snippetLength: 200,
  searchFields: ['title', 'content', 'tags', 'frontmatter']
}
```

This creates a powerful system where your existing Obsidian notes automatically inform your meeting preparation, making each meeting more productive by surfacing relevant historical context.
