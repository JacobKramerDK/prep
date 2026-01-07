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

  async generateMeetingBrief(request: BriefGenerationRequest, meeting: Meeting): Promise<MeetingBrief> {
    if (!this.isConfigured()) {
      throw new Error('OpenAI API key not configured')
    }

    const prompt = this.buildPrompt(request, meeting)
    
    try {
      const response = await this.client!.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are a professional meeting preparation assistant. Generate comprehensive, well-structured meeting briefs that help users prepare effectively.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 2000,
        temperature: 0.7
      })

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
    const sections = [
      '# Meeting Brief Generation Request',
      '',
      '## Meeting Details',
      `**Title:** ${meeting.title}`,
      `**Date:** ${meeting.startDate.toLocaleDateString()}`,
      `**Time:** ${meeting.startDate.toLocaleTimeString()} - ${meeting.endDate.toLocaleTimeString()}`,
      meeting.location ? `**Location:** ${meeting.location}` : '',
      meeting.description ? `**Description:** ${meeting.description}` : '',
      '',
      '## User Context',
      request.userContext,
      ''
    ]

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
      '3. **Preparation Checklist** - Specific items the user should prepare or review beforehand',
      '4. **Questions to Consider** - Thoughtful questions to drive productive discussion',
      '5. **Success Metrics** - How to measure if the meeting was successful',
      '',
      'Format the response in clear markdown with proper headings and bullet points. Keep it professional, actionable, and tailored to the specific meeting context provided.'
    )

    return sections.filter(line => line !== null).join('\n')
  }

  async validateApiKey(apiKey: string): Promise<boolean> {
    try {
      const testClient = new OpenAI({ apiKey })
      await testClient.models.list()
      return true
    } catch (error) {
      console.error('API key validation failed:', error instanceof Error ? error.message : 'Unknown error')
      return false
    }
  }
}
