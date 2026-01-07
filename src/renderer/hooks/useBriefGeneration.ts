import { useState, useCallback } from 'react'
import { BriefGenerationRequest, BriefGenerationResult, BriefGenerationStatus, MeetingBrief } from '../../shared/types/brief'

interface UseBriefGenerationState {
  isGenerating: boolean
  error: string | null
  generatedBriefs: Map<string, MeetingBrief>
}

const MAX_CACHED_BRIEFS = 50 // Limit to prevent memory leaks

interface UseBriefGenerationReturn extends UseBriefGenerationState {
  generateBrief: (request: BriefGenerationRequest) => Promise<MeetingBrief | null>
  clearError: () => void
  getBrief: (meetingId: string) => MeetingBrief | undefined
  hasBrief: (meetingId: string) => boolean
}

export const useBriefGeneration = (): UseBriefGenerationReturn => {
  const [state, setState] = useState<UseBriefGenerationState>({
    isGenerating: false,
    error: null,
    generatedBriefs: new Map()
  })

  const generateBrief = useCallback(async (request: BriefGenerationRequest): Promise<MeetingBrief | null> => {
    setState(prev => ({
      ...prev,
      isGenerating: true,
      error: null
    }))

    try {
      const result: BriefGenerationResult = await window.electronAPI.generateMeetingBrief(request)
      
      if (result.success && result.brief) {
        setState(prev => {
          const newBriefs = new Map(prev.generatedBriefs)
          
          // Implement LRU-like cleanup: remove oldest entries if we exceed limit
          if (newBriefs.size >= MAX_CACHED_BRIEFS) {
            const oldestKey = newBriefs.keys().next().value
            if (oldestKey) {
              newBriefs.delete(oldestKey)
            }
          }
          
          newBriefs.set(request.meetingId, result.brief!)
          return {
            ...prev,
            isGenerating: false,
            generatedBriefs: newBriefs
          }
        })
        return result.brief
      } else {
        setState(prev => ({
          ...prev,
          isGenerating: false,
          error: result.error || 'Failed to generate brief'
        }))
        return null
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      setState(prev => ({
        ...prev,
        isGenerating: false,
        error: errorMessage
      }))
      return null
    }
  }, [])

  const clearError = useCallback(() => {
    setState(prev => ({
      ...prev,
      error: null
    }))
  }, [])

  const getBrief = useCallback((meetingId: string): MeetingBrief | undefined => {
    return state.generatedBriefs.get(meetingId)
  }, [state.generatedBriefs])

  const hasBrief = useCallback((meetingId: string): boolean => {
    return state.generatedBriefs.has(meetingId)
  }, [state.generatedBriefs])

  return {
    ...state,
    generateBrief,
    clearError,
    getBrief,
    hasBrief
  }
}
