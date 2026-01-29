import OpenAI from 'openai'
import { randomUUID } from 'crypto'
import * as fs from 'fs'
import * as path from 'path'
import { BriefGenerationRequest, MeetingBrief, BriefGenerationStatus } from '../../shared/types/brief'
import { Meeting } from '../../shared/types/meeting'
import { TranscriptionRequest, TranscriptionResult } from '../../shared/types/transcription'
import { SummaryRequest, SummaryResult, SummaryStatus } from '../../shared/types/summary'
import { Debug } from '../../shared/utils/debug'
import { SettingsManager } from './settings-manager'

export class OpenAIService {
  private client: OpenAI | null = null
  private apiKey: string | null = null
  private validationCache: { key: string; isValid: boolean; timestamp: number } | null = null
  private readonly VALIDATION_CACHE_TTL = 5 * 60 * 1000 // 5 minutes
  private settingsManager: SettingsManager

  constructor(apiKey?: string, settingsManager?: SettingsManager) {
    this.settingsManager = settingsManager || new SettingsManager()
    if (apiKey) {
      this.setApiKey(apiKey)
    }
  }

  setApiKey(apiKey: string): void {
    this.apiKey = apiKey
    this.client = new OpenAI({
      apiKey: apiKey
    })
    // Clear validation cache when API key changes
    this.validationCache = null
  }

  isConfigured(): boolean {
    return this.client !== null && this.apiKey !== null && this.apiKey.trim() !== ''
  }

  private getModelCapabilities(model: string): { usesCompletionTokens: boolean } {
    // Models that use max_completion_tokens instead of max_tokens
    const completionTokenModels = [
      'o1-preview', 'o1-mini', 'gpt-5', 'gpt-5-mini', 'gpt-5-turbo'
    ]
    
    // Use exact matching or proper boundary matching to avoid false positives
    const usesCompletionTokens = completionTokenModels.some(m => 
      model === m || model.match(new RegExp(`^${m.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(-|_|\\.|$)`))
    )
    
    Debug.log('Model capabilities check:', {
      model,
      usesCompletionTokens,
      matchedModels: completionTokenModels.filter(m => 
        model === m || model.match(new RegExp(`^${m.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(-|_|\\.|$)`))
      )
    })
    
    return { usesCompletionTokens }
  }

  private async isApiKeyValidCached(): Promise<boolean> {
    if (!this.apiKey) return false
    
    // Check cache first
    if (this.validationCache && 
        this.validationCache.key === this.apiKey &&
        Date.now() - this.validationCache.timestamp < this.VALIDATION_CACHE_TTL) {
      return this.validationCache.isValid
    }
    
    // Validate and cache result
    const isValid = await this.validateApiKey(this.apiKey)
    this.validationCache = {
      key: this.apiKey,
      isValid,
      timestamp: Date.now()
    }
    
    return isValid
  }

  async generateMeetingBrief(request: BriefGenerationRequest, meeting: Meeting, model: string = 'gpt-4o-mini'): Promise<MeetingBrief> {
    if (!this.isConfigured()) {
      throw new Error('OpenAI API key not configured. Please set your API key in settings.')
    }

    // Use cached validation
    try {
      const isValid = await this.isApiKeyValidCached()
      if (!isValid) {
        throw new Error('Invalid OpenAI API key. Please verify your API key is correct and has sufficient credits.')
      }
    } catch (validationError) {
      if (validationError instanceof Error && validationError.message.includes('Invalid OpenAI API key')) {
        throw validationError
      }
      throw new Error('Failed to validate OpenAI API key. Please check your internet connection and try again.')
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
            content: 'You are a professional meeting preparation assistant. Generate comprehensive, well-structured meeting briefs using this context hierarchy:\n\n1. PRIORITIZE user-provided context as the primary source of meeting objectives and focus areas\n2. USE historical context as supporting background information to enrich the brief\n3. INTEGRATE insights by connecting relevant historical information to current meeting goals\n4. FOCUS on actionable preparation items based on the user\'s stated context\n\nAlways distinguish between what the user wants to accomplish (primary) and what historical information supports that goal (secondary).'
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
        requestParams.max_completion_tokens = 32000  // Higher limit for reasoning models (up to 100k supported)
        // These models only support temperature = 1 (default)
      } else {
        requestParams.max_tokens = 2000
        requestParams.temperature = 0.7
      }

      Debug.log('Making OpenAI request with params:', {
        model: requestParams.model,
        messageCount: requestParams.messages.length,
        maxTokens: requestParams.max_tokens || requestParams.max_completion_tokens,
        temperature: requestParams.temperature,
        usesCompletionTokens: modelCapabilities.usesCompletionTokens
      })

      const response = await this.client!.chat.completions.create(requestParams)

      Debug.log('OpenAI response received:', {
        choices: response.choices?.length || 0,
        firstChoiceContent: response.choices?.[0]?.message?.content ? 'present' : 'missing',
        usage: response.usage
      })

      const content = response.choices[0]?.message?.content
      if (!content) {
        Debug.error('No content in OpenAI response:', {
          response: JSON.stringify(response, null, 2)
        })
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
      Debug.error('OpenAI API error details:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        model: model,
        apiKeyConfigured: !!this.apiKey,
        clientConfigured: !!this.client,
        errorType: error instanceof Error ? error.constructor.name : typeof error
      })
      
      // Provide more specific error messages based on error type and content
      if (error instanceof Error) {
        throw new Error(this.classifyOpenAIError(error, model))
      }
      
      throw new Error('Unknown error occurred while generating meeting brief. Please try again.')
    }
  }

  private buildPrompt(request: BriefGenerationRequest, meeting: Meeting): string {
    // Get custom template or use default
    const customTemplate = this.settingsManager.getPromptTemplate()
    
    // Clean meeting data to remove Zoom/Teams noise
    const cleanedMeeting = this.cleanMeetingData(meeting)
    
    // Prepare meeting details
    const startDate = cleanedMeeting.startDate instanceof Date ? cleanedMeeting.startDate : new Date(cleanedMeeting.startDate)
    const endDate = cleanedMeeting.endDate instanceof Date ? cleanedMeeting.endDate : new Date(cleanedMeeting.endDate)
    
    // Build the prompt sections
    const sections = []
    
    // 1. Custom prompt (or default instructions)
    if (customTemplate) {
      sections.push(customTemplate)
    } else {
      sections.push(
        'Generate a comprehensive meeting brief with these sections:',
        '1. **Executive Summary** - Brief overview focusing on user-stated objectives',
        '2. **Key Discussion Points** - Main topics based on user context, enhanced by historical insights',
        '3. **Preparation Checklist** - Specific items to prepare based on user goals and relevant background',
        '4. **Strategic Questions** - Thoughtful questions connecting current objectives with historical context',
        '5. **Success Metrics** - How to measure meeting success based on user-stated goals',
        '',
        'Context Usage Guidelines:',
        '- **User Context = Primary**: This defines the meeting focus and objectives',
        '- **Historical Context = Supporting**: Use this to enrich and inform the primary objectives',
        '- **Integration**: Connect past insights to current goals, don\'t just summarize history',
        '',
        'Format in clear markdown with proper headings and bullet points. Provide a complete, self-contained brief without offering additional services or asking for further input.'
      )
    }
    
    sections.push('', '---', '', '## Meeting Details')
    sections.push(`**Title:** ${cleanedMeeting.title}`)
    sections.push(`**Date:** ${startDate.toLocaleDateString()}`)
    sections.push(`**Time:** ${startDate.toLocaleTimeString()} - ${endDate.toLocaleTimeString()}`)
    if (cleanedMeeting.location) sections.push(`**Location:** ${cleanedMeeting.location}`)
    if (cleanedMeeting.description) sections.push(`**Description:** ${cleanedMeeting.description}`)
    
    // 2. User-provided context and inputs
    const hasUserInputs = request.userContext || request.meetingPurpose || 
                         (request.keyTopics && request.keyTopics.length > 0) ||
                         (request.attendees && request.attendees.length > 0) ||
                         request.additionalNotes
    
    if (hasUserInputs) {
      sections.push('', '## 🎯 PRIMARY CONTEXT: Your Meeting Focus')
      sections.push('This represents your main objectives and context for this meeting:')
      sections.push('')
      
      if (request.userContext) {
        sections.push(`**General Context:** ${request.userContext}`)
      }
      
      if (request.meetingPurpose) {
        sections.push(`**Meeting Purpose:** ${request.meetingPurpose}`)
      }
      
      if (request.keyTopics && request.keyTopics.length > 0) {
        sections.push('**Key Topics to Cover:**')
        request.keyTopics.forEach(topic => sections.push(`- ${topic}`))
      }
      
      if (request.attendees && request.attendees.length > 0) {
        sections.push('**Expected Attendees:**')
        request.attendees.forEach(attendee => sections.push(`- ${attendee}`))
      }
      
      if (request.additionalNotes) {
        sections.push(`**Additional Notes:** ${request.additionalNotes}`)
      }
    }
    
    // 3. Historical context from Obsidian vault
    if (request.includeContext && request.contextMatches && request.contextMatches.length > 0) {
      sections.push('', '## 📚 SUPPORTING CONTEXT: Relevant Historical Information')
      sections.push('Use this background information to enrich your meeting preparation:')
      sections.push('')
      
      request.contextMatches.forEach((match, index) => {
        sections.push(`### ${index + 1}. ${match.file.title}`)
        sections.push(`**Source:** ${match.file.path}`)
        sections.push(`**Relevance Score:** ${(match.relevanceScore * 100).toFixed(1)}%`)
        
        if (match.snippets && match.snippets.length > 0) {
          sections.push('**Key Excerpts:**')
          match.snippets.forEach((snippet: any) => {
            const text = typeof snippet === 'string' ? snippet : (snippet.text || snippet.content || snippet.snippet || String(snippet))
            sections.push(`> ${text}`)
          })
        }
        sections.push('')
      })
      
      // Add integration guidance at the end of historical context section
      sections.push('', '## 🔗 Integration Instructions')
      sections.push('Connect the historical insights above with your primary meeting objectives. Focus on how past information can help achieve today\'s goals rather than just summarizing history.')
    }
    
    const finalPrompt = sections.filter(line => line !== null).join('\n')
    
    // Log the final prompt for debugging
    Debug.log('PROMPT SENT TO LLM:', finalPrompt)
    
    return finalPrompt
  }

  async validateApiKey(apiKey: string): Promise<boolean> {
    try {
      const testClient = new OpenAI({ apiKey })
      await testClient.models.list()
      return true
    } catch (error) {
      // Multi-model fallback test for better validation coverage
      const fallbackModels = ['gpt-4o-mini', 'gpt-3.5-turbo', 'gpt-4']
      
      for (const model of fallbackModels) {
        try {
          const testClient = new OpenAI({ apiKey })
          await testClient.chat.completions.create({
            model,
            messages: [{ role: 'user', content: 'test' }],
            max_tokens: 1
          })
          return true
        } catch (chatError) {
          // Continue to next model
          continue
        }
      }
      return false
    }
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

  private classifyOpenAIError(error: Error, model: string): string {
    const errorMessage = error.message.toLowerCase()
    
    if (errorMessage.includes('401') || errorMessage.includes('unauthorized')) {
      return 'Invalid OpenAI API key. Please verify your API key is correct and active.'
    } else if (errorMessage.includes('429') || errorMessage.includes('rate limit')) {
      return 'OpenAI API rate limit exceeded. Please wait a moment and try again.'
    } else if (errorMessage.includes('insufficient_quota') || errorMessage.includes('quota')) {
      return 'OpenAI API quota exceeded. Please check your billing and usage limits.'
    } else if (errorMessage.includes('model_not_found') || (errorMessage.includes('model') && errorMessage.includes('not found'))) {
      return `Model "${model}" is not available. Please select a different model in settings.`
    } else if (errorMessage.includes('max_tokens') || errorMessage.includes('max_completion_tokens')) {
      return `Token limit error for model "${model}". This model may have different token requirements.`
    } else if (errorMessage.includes('network') || errorMessage.includes('timeout') || errorMessage.includes('enotfound')) {
      return 'Network error connecting to OpenAI. Please check your internet connection and try again.'
    } else if (errorMessage.includes('api key')) {
      return 'API key error. Please verify your OpenAI API key is valid and has sufficient credits.'
    }
    
    // For other errors, provide the original message with context
    return `OpenAI API error: ${error.message}`
  }

  private cleanMeetingData(meeting: Meeting): Meeting {
    return {
      ...meeting,
      description: meeting.description ? this.cleanMeetingDescription(meeting.description) : meeting.description,
      location: meeting.location ? this.cleanLocation(meeting.location) : meeting.location
    }
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
        // Skip code blocks and special characters
        if (trimmed.length > 5 && !trimmed.match(/^\[|^<|trackunit|^```|^`|^#|^\*\*|^\>/i)) {
          meaningfulLines.push(trimmed)
        }
      }
      
      return meaningfulLines.join(' ').substring(0, 150) // Increased from 100
    }
    
    // For non-Zoom descriptions, clean special characters and markdown
    return description
      .replace(/\[.*?\]/g, '') // Remove [links]
      .replace(/```[\s\S]*?```/g, '') // Remove code blocks
      .replace(/`[^`]*`/g, '') // Remove inline code
      .replace(/^\s*[#*>-]\s*/gm, '') // Remove markdown headers, bullets, quotes
      .replace(/\*\*([^*]+)\*\*/g, '$1') // Remove bold formatting
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim()
      .substring(0, 250) // Increased from 200
  }

  private cleanLocation(location: string): string {
    // If it's a Zoom URL, ignore it completely
    if (location.includes('zoom.us') || location.includes('http')) {
      return ''
    }
    return location.trim()
  }

  // Transcription methods
  async transcribeAudio(request: TranscriptionRequest): Promise<TranscriptionResult> {
    if (!this.isConfigured()) {
      throw new Error('OpenAI API key not configured. Please set your API key in settings.')
    }

    // Validate API key
    try {
      const isValid = await this.isApiKeyValidCached()
      if (!isValid) {
        throw new Error('Invalid OpenAI API key. Please verify your API key is correct and has sufficient credits.')
      }
    } catch (validationError) {
      if (validationError instanceof Error && validationError.message.includes('Invalid OpenAI API key')) {
        throw validationError
      }
      throw new Error('Failed to validate OpenAI API key. Please check your internet connection and try again.')
    }

    // Validate file exists and size
    if (!fs.existsSync(request.audioFilePath)) {
      throw new Error('Audio file not found')
    }

    const stats = fs.statSync(request.audioFilePath)
    const fileSizeMB = stats.size / (1024 * 1024)
    if (fileSizeMB > 25) {
      throw new Error('Audio file too large. Maximum size is 25MB.')
    }

    try {
      const audioFile = fs.createReadStream(request.audioFilePath)
      
      // GPT-4o models support both 'json' and 'text' formats
      const model = request.model || 'whisper-1'
      const responseFormat = 'json' // Use json format for all models for consistency
      
      const response = await this.client!.audio.transcriptions.create({
        file: audioFile,
        model: model,
        language: request.language,
        response_format: responseFormat
      })

      return {
        id: randomUUID(),
        text: response.text,
        language: request.language,
        duration: undefined, // Not provided by basic response
        createdAt: new Date(),
        model: model
      }
    } catch (error) {
      Debug.error('Transcription failed:', error)
      if (error instanceof OpenAI.APIError) {
        if (error.status === 401) {
          throw new Error('Invalid OpenAI API key')
        } else if (error.status === 429) {
          throw new Error('Rate limit exceeded. Please try again later.')
        } else if (error.status === 413) {
          throw new Error('Audio file too large')
        }
        throw new Error(`OpenAI API error: ${error.message}`)
      }
      throw new Error(`Transcription failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async generateTranscriptionSummary(request: SummaryRequest, model: string = 'gpt-4o-mini'): Promise<SummaryResult> {
    if (!this.isConfigured()) {
      throw new Error('OpenAI API key not configured. Please set your API key in settings.')
    }

    // Use cached validation
    try {
      const isValid = await this.isApiKeyValidCached()
      if (!isValid) {
        throw new Error('Invalid OpenAI API key. Please verify your API key is correct and has sufficient credits.')
      }
    } catch (validationError) {
      if (validationError instanceof Error && validationError.message.includes('Invalid OpenAI API key')) {
        throw validationError
      }
      throw new Error('Failed to validate OpenAI API key. Please check your internet connection and try again.')
    }

    // Get custom template or use default
    const customTemplate = this.settingsManager.getTranscriptionSummaryPrompt()
    
    const prompt = customTemplate || this.getDefaultSummaryTemplate()
    
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
            content: 'You are a professional meeting summarization assistant. Generate structured, actionable meeting summaries from transcripts. Focus on key insights, decisions, and action items.'
          },
          {
            role: 'user',
            content: `${prompt}\n\n---\n\nTranscript to summarize:\n\n${request.transcriptionText}`
          }
        ]
      }

      // Use correct parameters based on model capabilities
      const modelCapabilities = this.getModelCapabilities(model)
      if (modelCapabilities.usesCompletionTokens) {
        requestParams.max_completion_tokens = 32000
      } else {
        requestParams.max_tokens = 2000
        requestParams.temperature = 0.7
      }

      Debug.log('Making OpenAI summary request with params:', {
        model: requestParams.model,
        transcriptionLength: request.transcriptionText.length,
        maxTokens: requestParams.max_tokens || requestParams.max_completion_tokens,
        temperature: requestParams.temperature,
        usesCompletionTokens: modelCapabilities.usesCompletionTokens
      })

      const response = await this.client!.chat.completions.create(requestParams)

      Debug.log('OpenAI summary response received:', {
        choices: response.choices?.length || 0,
        firstChoiceContent: response.choices?.[0]?.message?.content ? 'present' : 'missing',
        usage: response.usage
      })

      const content = response.choices[0]?.message?.content
      if (!content) {
        Debug.error('No content in OpenAI summary response:', {
          response: JSON.stringify(response, null, 2)
        })
        throw new Error('No content generated from OpenAI')
      }

      return {
        id: randomUUID(),
        transcriptionId: request.transcriptionId,
        content: content.trim(),
        generatedAt: new Date(),
        model: model,
        status: SummaryStatus.SUCCESS
      }
    } catch (error) {
      Debug.error('OpenAI summary API error details:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        transcriptionId: request.transcriptionId,
        model: model
      })

      const classifiedError = this.classifyOpenAIError(error as Error, model)
      throw new Error(classifiedError)
    }
  }

  private getDefaultSummaryTemplate(): string {
    return `Analyze this meeting transcript and create a structured summary with the following sections:

## Executive Summary
Brief 2-3 sentence overview of the meeting's main purpose and outcomes.

## Key Discussion Points
- Main topics discussed with specific details
- Important decisions made during the meeting
- Any concerns or issues raised

## Action Items
| Task | Owner | Due Date | Priority |
|------|-------|----------|----------|
| [Extract specific tasks with owners and deadlines] |

## Decisions Made
- List all concrete decisions with rationale
- Include who made the decision and when

## Follow-up Items
- Next steps identified
- Future meetings scheduled
- Items requiring additional discussion

## Key Quotes
- Important statements or commitments made
- Direct quotes that capture essential points

Focus on actionable insights and specific details. Avoid generic summaries.`
  }
}
