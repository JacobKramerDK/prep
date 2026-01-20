import { useState, useCallback } from 'react'
import type { ContextRetrievalResult, ContextMatch } from '../../shared/types/context'
import { contextRetrievalResultFromIPC } from '../../shared/types/context'

interface UseContextRetrievalState {
  matches: ContextMatch[]
  isLoading: boolean
  error: string | null
  isIndexed: boolean
  indexedFileCount: number
}

interface UseContextRetrievalReturn extends UseContextRetrievalState {
  findRelevantContext: (meetingId: string) => Promise<void>
  findRelevantContextEnhanced: (meetingId: string, additionalContext?: {
    meetingPurpose?: string
    keyTopics?: string[]
    additionalNotes?: string
  }) => Promise<void>
  checkIndexStatus: () => Promise<void>
  clearContext: () => void
}

export const useContextRetrieval = (): UseContextRetrievalReturn => {
  const [state, setState] = useState<UseContextRetrievalState>({
    matches: [],
    isLoading: false,
    error: null,
    isIndexed: false,
    indexedFileCount: 0
  })

  const findRelevantContext = useCallback(async (meetingId: string) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))
    
    try {
      const resultIPC = await window.electronAPI.findRelevantContext(meetingId)
      const result = contextRetrievalResultFromIPC(resultIPC)
      
      setState(prev => ({
        ...prev,
        matches: result.matches,
        isLoading: false,
        error: null
      }))
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      setState(prev => ({
        ...prev,
        matches: [],
        isLoading: false,
        error: errorMessage
      }))
    }
  }, [])

  const findRelevantContextEnhanced = useCallback(async (meetingId: string, additionalContext?: {
    meetingPurpose?: string
    keyTopics?: string[]
    additionalNotes?: string
  }) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))
    
    try {
      const resultIPC = await window.electronAPI.findRelevantContextEnhanced(meetingId, additionalContext)
      const result = contextRetrievalResultFromIPC(resultIPC)
      
      setState(prev => ({
        ...prev,
        matches: result.matches,
        isLoading: false,
        error: null
      }))
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      setState(prev => ({
        ...prev,
        matches: [],
        isLoading: false,
        error: errorMessage
      }))
    }
  }, [])

  const checkIndexStatus = useCallback(async () => {
    try {
      const [isIndexed, indexedFileCount] = await Promise.all([
        window.electronAPI.isContextIndexed(),
        window.electronAPI.getContextIndexedFileCount()
      ])
      
      setState(prev => ({
        ...prev,
        isIndexed,
        indexedFileCount
      }))
    } catch (error) {
      console.error('Failed to check index status:', error)
      setState(prev => ({
        ...prev,
        isIndexed: false,
        indexedFileCount: 0
      }))
    }
  }, [])

  const clearContext = useCallback(() => {
    setState(prev => ({
      ...prev,
      matches: [],
      error: null
    }))
  }, [])

  return {
    ...state,
    findRelevantContext,
    findRelevantContextEnhanced,
    checkIndexStatus,
    clearContext
  }
}
