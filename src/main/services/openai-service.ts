import OpenAI from 'openai'
import { randomUUID } from 'crypto'
import { BriefGenerationRequest, MeetingBrief, BriefGenerationStatus } from '../../shared/types/brief'
import { Meeting } from '../../shared/types/meeting'

export class OpenAIService {
  private client: OpenAI | null = null
  private apiKey: string | null = null

  constructor(apiKey?: string) {
    if (apiKey) {
      this.setApiKey(apiKey)
    }
  }

  setApiKey(apiKey: string): void {
    this.apiKey = apiKey
    this.client = new OpenAI({
      apiKey: apiKey
    })
  }

  isConfigured(): boolean {
    return this.client !== null && this.apiKey !== null
  }

  private getModelCapabilities(model: string): { usesCompletionTokens: boolean } {
    // Models that use max_completion_tokens instead of max_tokens
    const completionTokenModels = [
      'o1-preview', 'o1-mini', 'gpt-5', 'gpt-5-mini'
    ]
    
    const usesCompletionTokens = completionTokenModels.some(m => 
      model === m || model.startsWith(m + '-')
    )
    
    return { usesCompletionTokens }
  }

  async generateMeetingBrief(request: BriefGenerationRequest, meeting: Meeting, model: string = 'gpt-4o-mini'): Promise<MeetingBrief> {
    if (!this.isConfigured()) {
      throw new Error('OpenAI API key not configured')
    }

    const prompt = this.buildPrompt(request, meeting)
    
    try {
      interface RequestParams {
        model: string
        messages: Array<{
          role: 'system' | 'user' | 'assistant'
          content: string
        }>
        max_tokens?: number
        max_completion_tokens?: number
        temperature?: number
      }

      const requestParams: RequestParams = {
        model: model,
        messages: [
          {
            role: 'system',
            content: 'You are a professional meeting preparation assistant. Generate comprehensive, well-structured meeting briefs that help users prepare effectively.'
          },
          {
            role: 'user',
            content: prompt
          }
        ]
      }

      // Use correct parameters based on model capabilities
      const modelCapabilities = this.getModelCapabilities(model)
      if (modelCapabilities.usesCompletionTokens) {
        requestParams.max_completion_tokens = 2000
        // These models only support temperature = 1 (default)
      } else {
        requestParams.max_tokens = 2000
        requestParams.temperature = 0.7
      }

      const response = await this.client!.chat.completions.create(requestParams)

      const content = response.choices[0]?.message?.content
      if (!content) {
        throw new Error('No content generated from OpenAI')
      }

      return {
        id: randomUUID(),
        meetingId: request.meetingId,
        content: content.trim(),
        generatedAt: new Date(),
        userContext: request.userContext,
        status: BriefGenerationStatus.SUCCESS
      }
    } catch (error) {
      console.error('OpenAI API error:', error instanceof Error ? error.message : 'Unknown error')
      throw new Error(`Failed to generate meeting brief: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  private buildPrompt(request: BriefGenerationRequest, meeting: Meeting): string {
    // Ensure dates are Date objects
    const startDate = meeting.startDate instanceof Date ? meeting.startDate : new Date(meeting.startDate)
    const endDate = meeting.endDate instanceof Date ? meeting.endDate : new Date(meeting.endDate)
    
    const sections = [
      '# Meeting Brief Generation Request',
      '',
      '## Meeting Details',
      `**Title:** ${meeting.title}`,
      `**Date:** ${startDate.toLocaleDateString()}`,
      `**Time:** ${startDate.toLocaleTimeString()} - ${endDate.toLocaleTimeString()}`,
      meeting.location ? `**Location:** ${meeting.location}` : '',
      meeting.description ? `**Description:** ${meeting.description}` : '',
      '',
      '## User Context',
      request.userContext,
      ''
    ]

    // Add relevant context from vault if available
    if (request.includeContext && request.contextMatches && request.contextMatches.length > 0) {
      sections.push('## Relevant Historical Context')
      sections.push('The following information from your notes may be relevant to this meeting:')
      sections.push('')
      
      request.contextMatches.forEach((match, index) => {
        sections.push(`### ${index + 1}. ${match.file.title}`)
        sections.push(`**Source:** ${match.file.path}`)
        sections.push(`**Relevance Score:** ${(match.relevanceScore * 100).toFixed(1)}%`)
        
        if (match.snippets && match.snippets.length > 0) {
          sections.push('**Key Excerpts:**')
          match.snippets.forEach(snippet => {
            sections.push(`> ${snippet}`)
          })
        }
        
        sections.push('')
      })
    }

    if (request.meetingPurpose) {
      sections.push('## Meeting Purpose')
      sections.push(request.meetingPurpose)
      sections.push('')
    }

    if (request.keyTopics && request.keyTopics.length > 0) {
      sections.push('## Key Topics to Cover')
      request.keyTopics.forEach(topic => sections.push(`- ${topic}`))
      sections.push('')
    }

    if (request.attendees && request.attendees.length > 0) {
      sections.push('## Expected Attendees')
      request.attendees.forEach(attendee => sections.push(`- ${attendee}`))
      sections.push('')
    }

    if (request.additionalNotes) {
      sections.push('## Additional Notes')
      sections.push(request.additionalNotes)
      sections.push('')
    }

    sections.push(
      '## Instructions',
      'Please generate a comprehensive meeting brief that includes:',
      '1. **Executive Summary** - Brief overview of the meeting purpose and expected outcomes',
      '2. **Key Discussion Points** - Main topics to be covered based on the context provided',
      request.includeContext && request.contextMatches && request.contextMatches.length > 0 
        ? '3. **Historical Context Integration** - How the relevant historical information relates to this meeting'
        : '',
      '3. **Preparation Checklist** - Specific items the user should prepare or review beforehand',
      '4. **Questions to Consider** - Thoughtful questions to drive productive discussion',
      '5. **Success Metrics** - How to measure if the meeting was successful',
      '',
      request.includeContext && request.contextMatches && request.contextMatches.length > 0
        ? 'Pay special attention to the historical context provided and integrate it meaningfully into your recommendations. Reference specific past discussions, decisions, or action items that are relevant to this upcoming meeting.'
        : '',
      'Format the response in clear markdown with proper headings and bullet points. Keep it professional, actionable, and tailored to the specific meeting context provided.'
    )

    return sections.filter(line => line !== null && line !== '').join('\n')
  }

  async validateApiKey(apiKey: string): Promise<boolean> {
    const testModels = ['gpt-4o-mini', 'gpt-3.5-turbo', 'gpt-4']
    
    for (const model of testModels) {
      try {
        const testClient = new OpenAI({ apiKey })
        await testClient.chat.completions.create({
          model: model,
          messages: [{ role: 'user', content: 'test' }],
          max_tokens: 1
        })
        return true
      } catch (error) {
        // Continue to next model if this one fails
        continue
      }
    }
    
    console.error('API key validation failed with all test models')
    return false
  }

  async getAvailableModels(apiKey: string): Promise<string[]> {
    try {
      const testClient = new OpenAI({ apiKey })
      const response = await testClient.models.list()
      
      // Filter for chat completion models - be more inclusive but exclude unwanted types
      const chatModels = response.data
        .filter(model => {
          const id = model.id.toLowerCase()
          return (id.includes('gpt') || id.includes('o1')) && 
                 !id.includes('instruct') && 
                 !id.includes('edit') &&
                 !id.includes('embedding') &&
                 !id.includes('whisper') &&
                 !id.includes('tts') &&
                 !id.includes('dall-e') &&
                 !id.includes('codex') &&
                 !id.includes('image') &&
                 !id.includes('audio') &&
                 !id.includes('realtime')
        })
        .map(model => model.id)
        .sort((a, b) => {
          // Prioritize newer models with more comprehensive list
          const priority = [
            'o1-preview', 'o1-mini',
            'gpt-4o', 'gpt-4o-mini', 'gpt-4o-2024',
            'gpt-4-turbo', 'gpt-4-turbo-2024', 'gpt-4-turbo-preview',
            'gpt-4', 'gpt-4-0613', 'gpt-4-0314',
            'gpt-3.5-turbo', 'gpt-3.5-turbo-16k'
          ]
          
          const aIndex = priority.findIndex(p => a.includes(p) || a === p)
          const bIndex = priority.findIndex(p => b.includes(p) || b === p)
          
          if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex
          if (aIndex !== -1) return -1
          if (bIndex !== -1) return 1
          return a.localeCompare(b)
        })
      
      return chatModels.length > 0 ? chatModels : ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-4', 'gpt-3.5-turbo']
    } catch (error) {
      console.error('Failed to fetch models:', error instanceof Error ? error.message : 'Unknown error')
      // Return default models if API call fails
      return ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-4', 'gpt-3.5-turbo']
    }
  }
}
