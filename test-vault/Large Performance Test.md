# Large Performance Test File

This file is designed to test markdown rendering performance with substantial content.

## Executive Summary

This document contains extensive content to validate the performance of markdown rendering with large files. The content includes various markdown elements, code blocks, tables, and wikilinks to simulate real-world usage scenarios.

## Project Overview

### Background
The [[Prep Meeting Assistant]] project aims to revolutionize how knowledge workers prepare for meetings by integrating with [[Obsidian Vaults]] and providing AI-powered meeting briefs.

### Key Features
- **Vault Integration**: Direct connection to [[Obsidian]] markdown files
- **Calendar Parsing**: Automatic meeting detection from [[Apple Calendar]] and ICS files
- **AI Brief Generation**: Comprehensive meeting preparation using [[OpenAI API]]
- **Audio Transcription**: Post-meeting summaries via [[Whisper API]]

## Technical Architecture

### Frontend Stack
```typescript
// React 19 with TypeScript
interface MeetingBrief {
  id: string
  title: string
  participants: string[]
  agenda: string[]
  context: VaultContext[]
  generatedAt: Date
}

class MeetingBriefGenerator {
  constructor(
    private vaultManager: VaultManager,
    private aiService: AIService
  ) {}

  async generateBrief(meeting: CalendarEvent): Promise<MeetingBrief> {
    const context = await this.vaultManager.findRelevantContext(
      meeting.participants,
      meeting.title
    )
    
    const brief = await this.aiService.generateMeetingBrief({
      meeting,
      context,
      template: 'comprehensive'
    })

    return {
      id: generateId(),
      title: meeting.title,
      participants: meeting.participants,
      agenda: brief.agenda,
      context: context,
      generatedAt: new Date()
    }
  }
}
```

### Backend Services
```python
# Vault indexing and search
import os
import re
from typing import List, Dict, Optional
from dataclasses import dataclass
from pathlib import Path

@dataclass
class VaultFile:
    path: str
    title: str
    content: str
    tags: List[str]
    links: List[str]
    modified: float

class VaultIndexer:
    def __init__(self, vault_path: str):
        self.vault_path = Path(vault_path)
        self.index: Dict[str, VaultFile] = {}
    
    def scan_vault(self) -> Dict[str, VaultFile]:
        """Scan vault and build comprehensive index"""
        for md_file in self.vault_path.rglob("*.md"):
            try:
                content = md_file.read_text(encoding='utf-8')
                vault_file = self._parse_markdown_file(md_file, content)
                self.index[str(md_file)] = vault_file
            except Exception as e:
                print(f"Error processing {md_file}: {e}")
        
        return self.index
    
    def _parse_markdown_file(self, file_path: Path, content: str) -> VaultFile:
        # Extract title from first heading or filename
        title_match = re.search(r'^#\s+(.+)$', content, re.MULTILINE)
        title = title_match.group(1) if title_match else file_path.stem
        
        # Extract tags
        tags = re.findall(r'#(\w+)', content)
        
        # Extract wikilinks
        links = re.findall(r'\[\[([^\]]+)\]\]', content)
        
        return VaultFile(
            path=str(file_path),
            title=title,
            content=content,
            tags=list(set(tags)),
            links=list(set(links)),
            modified=file_path.stat().st_mtime
        )
    
    def search(self, query: str, limit: int = 10) -> List[VaultFile]:
        """Search vault content for relevant files"""
        results = []
        query_lower = query.lower()
        
        for vault_file in self.index.values():
            score = 0
            
            # Title match (highest weight)
            if query_lower in vault_file.title.lower():
                score += 10
            
            # Content match
            content_matches = vault_file.content.lower().count(query_lower)
            score += content_matches * 2
            
            # Tag match
            for tag in vault_file.tags:
                if query_lower in tag.lower():
                    score += 5
            
            # Link match
            for link in vault_file.links:
                if query_lower in link.lower():
                    score += 3
            
            if score > 0:
                results.append((score, vault_file))
        
        # Sort by score and return top results
        results.sort(key=lambda x: x[0], reverse=True)
        return [vault_file for _, vault_file in results[:limit]]
```

## Database Schema

### Meeting Records
```sql
-- Meeting storage and tracking
CREATE TABLE meetings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    location VARCHAR(255),
    calendar_event_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE meeting_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meeting_id UUID REFERENCES meetings(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    role VARCHAR(100),
    attendance_status VARCHAR(50) DEFAULT 'pending'
);

CREATE TABLE meeting_briefs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meeting_id UUID REFERENCES meetings(id) ON DELETE CASCADE,
    content JSONB NOT NULL,
    context_files TEXT[],
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ai_model VARCHAR(100),
    generation_time_ms INTEGER
);

-- Indexes for performance
CREATE INDEX idx_meetings_start_time ON meetings(start_time);
CREATE INDEX idx_meeting_participants_email ON meeting_participants(email);
CREATE INDEX idx_meeting_briefs_meeting_id ON meeting_briefs(meeting_id);
CREATE INDEX idx_meeting_briefs_generated_at ON meeting_briefs(generated_at);

-- Full-text search on meeting content
CREATE INDEX idx_meetings_fts ON meetings USING gin(to_tsvector('english', title || ' ' || COALESCE(description, '')));
```

## Performance Benchmarks

### Vault Scanning Performance
| Vault Size | Files | Scan Time | Memory Usage |
|------------|-------|-----------|--------------|
| Small | 100 files | 0.5s | 10MB |
| Medium | 1,000 files | 2.1s | 45MB |
| Large | 10,000 files | 8.7s | 180MB |
| Enterprise | 50,000 files | 35.2s | 850MB |

### Search Performance
```javascript
// Search optimization with indexing
class SearchIndex {
  constructor() {
    this.titleIndex = new Map()
    this.contentIndex = new Map()
    this.tagIndex = new Map()
    this.linkIndex = new Map()
  }

  buildIndex(files) {
    const startTime = performance.now()
    
    files.forEach(file => {
      // Index title words
      this.indexWords(file.title, file.path, this.titleIndex, 10)
      
      // Index content words (sample for performance)
      const contentSample = file.content.substring(0, 5000)
      this.indexWords(contentSample, file.path, this.contentIndex, 1)
      
      // Index tags
      file.tags.forEach(tag => {
        this.addToIndex(tag, file.path, this.tagIndex, 5)
      })
      
      // Index links
      file.links.forEach(link => {
        this.addToIndex(link, file.path, this.linkIndex, 3)
      })
    })
    
    const endTime = performance.now()
    console.log(`Index built in ${endTime - startTime}ms`)
  }

  indexWords(text, filePath, index, weight) {
    const words = text.toLowerCase()
      .split(/\W+/)
      .filter(word => word.length > 2)
    
    words.forEach(word => {
      this.addToIndex(word, filePath, index, weight)
    })
  }

  addToIndex(term, filePath, index, weight) {
    if (!index.has(term)) {
      index.set(term, new Map())
    }
    
    const fileMap = index.get(term)
    const currentWeight = fileMap.get(filePath) || 0
    fileMap.set(filePath, currentWeight + weight)
  }

  search(query, limit = 20) {
    const startTime = performance.now()
    const queryTerms = query.toLowerCase().split(/\W+/)
    const scores = new Map()

    queryTerms.forEach(term => {
      // Search in all indexes
      [this.titleIndex, this.contentIndex, this.tagIndex, this.linkIndex]
        .forEach(index => {
          if (index.has(term)) {
            const fileMap = index.get(term)
            fileMap.forEach((weight, filePath) => {
              const currentScore = scores.get(filePath) || 0
              scores.set(filePath, currentScore + weight)
            })
          }
        })
    })

    // Sort results by score
    const results = Array.from(scores.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([filePath, score]) => ({ filePath, score }))

    const endTime = performance.now()
    console.log(`Search completed in ${endTime - startTime}ms`)
    
    return results
  }
}
```

## Integration Examples

### Calendar Integration
```go
package calendar

import (
    "encoding/json"
    "fmt"
    "os/exec"
    "strings"
    "time"
)

type CalendarEvent struct {
    ID           string    `json:"id"`
    Title        string    `json:"title"`
    Description  string    `json:"description"`
    StartTime    time.Time `json:"start_time"`
    EndTime      time.Time `json:"end_time"`
    Location     string    `json:"location"`
    Participants []string  `json:"participants"`
    CalendarName string    `json:"calendar_name"`
}

type AppleCalendarParser struct {
    scriptPath string
}

func NewAppleCalendarParser() *AppleCalendarParser {
    return &AppleCalendarParser{
        scriptPath: "./scripts/get_calendar_events.scpt",
    }
}

func (p *AppleCalendarParser) GetTodaysEvents() ([]CalendarEvent, error) {
    cmd := exec.Command("osascript", p.scriptPath)
    output, err := cmd.Output()
    if err != nil {
        return nil, fmt.Errorf("failed to execute AppleScript: %w", err)
    }

    var events []CalendarEvent
    lines := strings.Split(string(output), "\n")
    
    for _, line := range lines {
        if strings.TrimSpace(line) == "" {
            continue
        }
        
        var event CalendarEvent
        if err := json.Unmarshal([]byte(line), &event); err != nil {
            continue // Skip malformed entries
        }
        
        events = append(events, event)
    }

    return events, nil
}

func (p *AppleCalendarParser) ParseICSFile(filePath string) ([]CalendarEvent, error) {
    // ICS parsing implementation
    content, err := os.ReadFile(filePath)
    if err != nil {
        return nil, fmt.Errorf("failed to read ICS file: %w", err)
    }

    events := []CalendarEvent{}
    lines := strings.Split(string(content), "\n")
    
    var currentEvent *CalendarEvent
    
    for _, line := range lines {
        line = strings.TrimSpace(line)
        
        switch {
        case strings.HasPrefix(line, "BEGIN:VEVENT"):
            currentEvent = &CalendarEvent{}
            
        case strings.HasPrefix(line, "END:VEVENT"):
            if currentEvent != nil {
                events = append(events, *currentEvent)
                currentEvent = nil
            }
            
        case strings.HasPrefix(line, "SUMMARY:"):
            if currentEvent != nil {
                currentEvent.Title = strings.TrimPrefix(line, "SUMMARY:")
            }
            
        case strings.HasPrefix(line, "DESCRIPTION:"):
            if currentEvent != nil {
                currentEvent.Description = strings.TrimPrefix(line, "DESCRIPTION:")
            }
            
        case strings.HasPrefix(line, "DTSTART:"):
            if currentEvent != nil {
                timeStr := strings.TrimPrefix(line, "DTSTART:")
                if t, err := parseICSTime(timeStr); err == nil {
                    currentEvent.StartTime = t
                }
            }
            
        case strings.HasPrefix(line, "DTEND:"):
            if currentEvent != nil {
                timeStr := strings.TrimPrefix(line, "DTEND:")
                if t, err := parseICSTime(timeStr); err == nil {
                    currentEvent.EndTime = t
                }
            }
        }
    }

    return events, nil
}

func parseICSTime(timeStr string) (time.Time, error) {
    // Handle different ICS time formats
    formats := []string{
        "20060102T150405Z",
        "20060102T150405",
        "20060102",
    }
    
    for _, format := range formats {
        if t, err := time.Parse(format, timeStr); err == nil {
            return t, nil
        }
    }
    
    return time.Time{}, fmt.Errorf("unable to parse time: %s", timeStr)
}
```

## AI Integration

### OpenAI Service Implementation
```rust
use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use tokio::time::{timeout, Duration};

#[derive(Debug, Serialize, Deserialize)]
pub struct MeetingContext {
    pub participants: Vec<String>,
    pub title: String,
    pub description: Option<String>,
    pub relevant_notes: Vec<VaultNote>,
    pub previous_meetings: Vec<MeetingRecord>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct VaultNote {
    pub title: String,
    pub content: String,
    pub tags: Vec<String>,
    pub last_modified: u64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct MeetingRecord {
    pub date: String,
    pub title: String,
    pub participants: Vec<String>,
    pub summary: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct OpenAIRequest {
    pub model: String,
    pub messages: Vec<ChatMessage>,
    pub max_tokens: u32,
    pub temperature: f32,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ChatMessage {
    pub role: String,
    pub content: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct OpenAIResponse {
    pub choices: Vec<Choice>,
    pub usage: Usage,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Choice {
    pub message: ChatMessage,
    pub finish_reason: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Usage {
    pub prompt_tokens: u32,
    pub completion_tokens: u32,
    pub total_tokens: u32,
}

pub struct AIService {
    client: Client,
    api_key: String,
    base_url: String,
}

impl AIService {
    pub fn new(api_key: String) -> Self {
        Self {
            client: Client::new(),
            api_key,
            base_url: "https://api.openai.com/v1".to_string(),
        }
    }

    pub async fn generate_meeting_brief(
        &self,
        context: MeetingContext,
    ) -> Result<String, Box<dyn std::error::Error>> {
        let prompt = self.build_meeting_brief_prompt(&context);
        
        let request = OpenAIRequest {
            model: "gpt-4".to_string(),
            messages: vec![
                ChatMessage {
                    role: "system".to_string(),
                    content: "You are an expert meeting preparation assistant. Generate comprehensive, actionable meeting briefs based on the provided context.".to_string(),
                },
                ChatMessage {
                    role: "user".to_string(),
                    content: prompt,
                },
            ],
            max_tokens: 2000,
            temperature: 0.3,
        };

        let response = timeout(
            Duration::from_secs(30),
            self.client
                .post(&format!("{}/chat/completions", self.base_url))
                .header("Authorization", format!("Bearer {}", self.api_key))
                .header("Content-Type", "application/json")
                .json(&request)
                .send(),
        )
        .await??;

        let openai_response: OpenAIResponse = response.json().await?;
        
        if let Some(choice) = openai_response.choices.first() {
            Ok(choice.message.content.clone())
        } else {
            Err("No response from OpenAI".into())
        }
    }

    fn build_meeting_brief_prompt(&self, context: &MeetingContext) -> String {
        let mut prompt = format!(
            "Generate a comprehensive meeting brief for:\n\n\
            **Meeting:** {}\n\
            **Participants:** {}\n",
            context.title,
            context.participants.join(", ")
        );

        if let Some(description) = &context.description {
            prompt.push_str(&format!("**Description:** {}\n", description));
        }

        if !context.relevant_notes.is_empty() {
            prompt.push_str("\n**Relevant Notes:**\n");
            for note in &context.relevant_notes {
                prompt.push_str(&format!(
                    "- **{}**: {}\n",
                    note.title,
                    note.content.chars().take(200).collect::<String>()
                ));
            }
        }

        if !context.previous_meetings.is_empty() {
            prompt.push_str("\n**Previous Meetings:**\n");
            for meeting in &context.previous_meetings {
                prompt.push_str(&format!(
                    "- **{}** ({}): {}\n",
                    meeting.title,
                    meeting.date,
                    meeting.summary.chars().take(150).collect::<String>()
                ));
            }
        }

        prompt.push_str(
            "\n\nPlease provide:\n\
            1. **Meeting Objectives** - What should be accomplished\n\
            2. **Key Discussion Points** - Main topics to cover\n\
            3. **Background Context** - Relevant history and decisions\n\
            4. **Action Items** - Specific tasks and next steps\n\
            5. **Questions to Ask** - Important questions to raise\n\
            6. **Success Metrics** - How to measure meeting success\n\n\
            Format the response in clear markdown with appropriate headings."
        );

        prompt
    }
}
```

## Testing Strategy

### Unit Tests
```typescript
// Comprehensive test suite
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import { VaultManager } from '../src/main/services/vault-manager'
import { CalendarManager } from '../src/main/services/calendar-manager'
import { AIService } from '../src/main/services/ai-service'
import * as fs from 'fs/promises'
import * as path from 'path'

describe('VaultManager', () => {
  let vaultManager: VaultManager
  let testVaultPath: string

  beforeEach(async () => {
    testVaultPath = path.join(__dirname, 'fixtures', 'test-vault')
    await fs.mkdir(testVaultPath, { recursive: true })
    vaultManager = new VaultManager()
  })

  afterEach(async () => {
    await fs.rm(testVaultPath, { recursive: true, force: true })
  })

  describe('scanVault', () => {
    it('should scan and index all markdown files', async () => {
      // Create test files
      await fs.writeFile(
        path.join(testVaultPath, 'note1.md'),
        '# Note 1\n\nThis is a test note with [[Link to Note 2]].\n\n#tag1 #tag2'
      )
      await fs.writeFile(
        path.join(testVaultPath, 'note2.md'),
        '# Note 2\n\nAnother test note.\n\n#tag2 #tag3'
      )

      const index = await vaultManager.scanVault(testVaultPath)

      expect(index.files).toHaveLength(2)
      expect(index.files[0].title).toBe('Note 1')
      expect(index.files[0].tags).toContain('tag1')
      expect(index.files[0].tags).toContain('tag2')
      expect(index.files[0].links).toContain('Link to Note 2')
    })

    it('should handle nested directories', async () => {
      const subDir = path.join(testVaultPath, 'subfolder')
      await fs.mkdir(subDir, { recursive: true })
      
      await fs.writeFile(
        path.join(subDir, 'nested-note.md'),
        '# Nested Note\n\nThis is in a subfolder.'
      )

      const index = await vaultManager.scanVault(testVaultPath)

      expect(index.files).toHaveLength(1)
      expect(index.files[0].title).toBe('Nested Note')
      expect(index.files[0].path).toContain('subfolder')
    })

    it('should extract frontmatter metadata', async () => {
      await fs.writeFile(
        path.join(testVaultPath, 'with-frontmatter.md'),
        `---
title: Custom Title
tags: [meta1, meta2]
date: 2024-01-06
---

# Heading

Content here.`
      )

      const index = await vaultManager.scanVault(testVaultPath)

      expect(index.files[0].title).toBe('Custom Title')
      expect(index.files[0].tags).toContain('meta1')
      expect(index.files[0].tags).toContain('meta2')
    })
  })

  describe('searchFiles', () => {
    beforeEach(async () => {
      await fs.writeFile(
        path.join(testVaultPath, 'meeting-notes.md'),
        '# Weekly Team Meeting\n\nDiscussed project alpha with [[John Doe]].\n\n#meeting #project-alpha'
      )
      await fs.writeFile(
        path.join(testVaultPath, 'project-spec.md'),
        '# Project Alpha Specification\n\nTechnical details for project alpha.\n\n#project-alpha #technical'
      )
      await fs.writeFile(
        path.join(testVaultPath, 'random-note.md'),
        '# Random Thoughts\n\nSome unrelated content.\n\n#personal'
      )

      await vaultManager.scanVault(testVaultPath)
    })

    it('should find files by title match', async () => {
      const results = await vaultManager.searchFiles('meeting')

      expect(results).toHaveLength(1)
      expect(results[0].title).toBe('Weekly Team Meeting')
    })

    it('should find files by content match', async () => {
      const results = await vaultManager.searchFiles('project alpha')

      expect(results).toHaveLength(2)
      expect(results.map(r => r.title)).toContain('Weekly Team Meeting')
      expect(results.map(r => r.title)).toContain('Project Alpha Specification')
    })

    it('should find files by tag match', async () => {
      const results = await vaultManager.searchFiles('project-alpha')

      expect(results).toHaveLength(2)
    })

    it('should rank results by relevance', async () => {
      const results = await vaultManager.searchFiles('project alpha')

      // Project spec should rank higher due to title match
      expect(results[0].title).toBe('Project Alpha Specification')
    })
  })
})

describe('CalendarManager', () => {
  let calendarManager: CalendarManager

  beforeEach(() => {
    calendarManager = new CalendarManager()
  })

  describe('parseICSFile', () => {
    it('should parse basic ICS events', async () => {
      const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Test//Test//EN
BEGIN:VEVENT
UID:test-event-1
DTSTART:20240106T140000Z
DTEND:20240106T150000Z
SUMMARY:Team Meeting
DESCRIPTION:Weekly team sync
LOCATION:Conference Room A
END:VEVENT
END:VCALENDAR`

      const events = await calendarManager.parseICSContent(icsContent)

      expect(events).toHaveLength(1)
      expect(events[0].title).toBe('Team Meeting')
      expect(events[0].description).toBe('Weekly team sync')
      expect(events[0].location).toBe('Conference Room A')
    })

    it('should handle recurring events', async () => {
      const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Test//Test//EN
BEGIN:VEVENT
UID:recurring-event
DTSTART:20240106T140000Z
DTEND:20240106T150000Z
SUMMARY:Daily Standup
RRULE:FREQ=DAILY;COUNT=5
END:VEVENT
END:VCALENDAR`

      const events = await calendarManager.parseICSContent(icsContent)

      expect(events).toHaveLength(5) // Should expand recurring events
      expect(events.every(e => e.title === 'Daily Standup')).toBe(true)
    })
  })
})

describe('AIService', () => {
  let aiService: AIService

  beforeEach(() => {
    aiService = new AIService('test-api-key')
  })

  describe('generateMeetingBrief', () => {
    it('should generate comprehensive meeting brief', async () => {
      const mockContext = {
        title: 'Project Alpha Review',
        participants: ['John Doe', 'Jane Smith'],
        description: 'Quarterly review of project alpha progress',
        relevantNotes: [
          {
            title: 'Project Alpha Status',
            content: 'Current progress and blockers...',
            tags: ['project-alpha', 'status'],
            lastModified: Date.now()
          }
        ],
        previousMeetings: [
          {
            date: '2024-01-01',
            title: 'Project Alpha Kickoff',
            participants: ['John Doe', 'Jane Smith'],
            summary: 'Initial project planning and goal setting'
          }
        ]
      }

      // Mock the OpenAI API response
      jest.spyOn(aiService, 'callOpenAI').mockResolvedValue({
        choices: [{
          message: {
            content: `# Meeting Brief: Project Alpha Review

## Meeting Objectives
- Review Q4 progress against goals
- Identify and address current blockers
- Plan Q1 priorities and milestones

## Key Discussion Points
1. **Progress Review**: Current status vs. planned milestones
2. **Blocker Resolution**: Technical and resource constraints
3. **Q1 Planning**: Priority features and timeline

## Background Context
Based on previous meetings and project notes, the team has been working on project alpha since the kickoff meeting. Current focus areas include technical implementation and stakeholder alignment.

## Action Items
- [ ] Review technical specifications
- [ ] Update project timeline
- [ ] Schedule follow-up sessions

## Questions to Ask
1. What are the main blockers preventing progress?
2. Do we have adequate resources for Q1 goals?
3. Are stakeholders aligned on priorities?

## Success Metrics
- Clear understanding of current status
- Identified action items with owners
- Aligned Q1 roadmap`
          }
        }],
        usage: {
          prompt_tokens: 500,
          completion_tokens: 300,
          total_tokens: 800
        }
      })

      const brief = await aiService.generateMeetingBrief(mockContext)

      expect(brief).toContain('Meeting Brief: Project Alpha Review')
      expect(brief).toContain('Meeting Objectives')
      expect(brief).toContain('Key Discussion Points')
      expect(brief).toContain('Action Items')
    })
  })
})
```

## Conclusion

This comprehensive test file demonstrates the markdown rendering capabilities with:

- **Complex Code Blocks**: Multiple programming languages with syntax highlighting
- **Extensive Tables**: Performance benchmarks and feature comparisons  
- **Nested Structures**: Lists, blockquotes, and hierarchical content
- **Wikilinks**: References to other documents and pages
- **Mixed Content**: Technical documentation with code examples
- **Large Content Volume**: Substantial text to test performance

The file contains approximately **15,000+ characters** and includes various markdown elements that should render correctly with proper syntax highlighting, formatting, and wikilink processing.

Related documents: [[Complex Markdown Test]], [[Wikilink Edge Cases]], [[Syntax Highlighting Showcase]]

#performance-testing #markdown-rendering #large-files #comprehensive-test
