import { useState, useRef, useCallback, useEffect } from 'react'
import { DictationState, DictationCapabilities } from '../../shared/types/dictation'
import { debugLog, debugError } from '../utils/debug'

export const useVoiceDictation = (onTranscript: (text: string) => void) => {
  const [state, setState] = useState<DictationState>({
    isRecording: false,
    isProcessing: false,
    error: null,
    transcript: '',
    isPartialResult: false,
    hasPermissions: false
  })

  const [capabilities, setCapabilities] = useState<DictationCapabilities>({
    hasOpenAIConfig: false,
    hasMicrophonePermission: false,
    isAvailable: false
  })

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioStreamRef = useRef<MediaStream | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const [currentTempFile, setCurrentTempFile] = useState<string | null>(null)

  // Helper function to test microphone access
  const testMicrophoneAccess = useCallback(async (): Promise<boolean> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      stream.getTracks().forEach(track => track.stop())
      debugLog('VOICE-DICTATION', 'Microphone access granted via getUserMedia test')
      return true
    } catch (mediaError) {
      debugError('VOICE-DICTATION', 'Microphone access denied via getUserMedia test', mediaError)
      return false
    }
  }, [])

  // Check capabilities on mount
  useEffect(() => {
    debugLog('VOICE-DICTATION', 'VOICE-DICTATION', 'Initializing voice dictation hook')
    checkCapabilities()
  }, [])

  const checkCapabilities = useCallback(async () => {
    debugLog('VOICE-DICTATION', 'Checking dictation capabilities...')
    try {
      // Check OpenAI configuration
      debugLog('VOICE-DICTATION', 'Checking OpenAI API key availability...')
      const hasOpenAI = await window.electronAPI.getOpenAIApiKey()
      debugLog('VOICE-DICTATION', 'OpenAI API key check result:', !!hasOpenAI)
      
      // Check microphone permission
      let hasMicPermission = false
      debugLog('VOICE-DICTATION', 'Checking microphone permissions...')
      
      // Feature detection for permissions API
      if ('permissions' in navigator && 'query' in navigator.permissions) {
        try {
          const permissionStatus = await navigator.permissions.query({ name: 'microphone' as PermissionName })
          hasMicPermission = permissionStatus.state === 'granted'
          debugLog('VOICE-DICTATION', 'Microphone permission status:', permissionStatus.state)
        } catch (permissionError) {
          debugLog('VOICE-DICTATION', 'Permission query failed, trying getUserMedia fallback...', permissionError)
          // Fallback to getUserMedia test
          hasMicPermission = await testMicrophoneAccess()
        }
      } else {
        debugLog('VOICE-DICTATION', 'Permissions API not available, using getUserMedia fallback...')
        // Fallback to getUserMedia test
        hasMicPermission = await testMicrophoneAccess()
      }

      const newCapabilities = {
        hasOpenAIConfig: !!hasOpenAI,
        hasMicrophonePermission: hasMicPermission,
        isAvailable: !!hasOpenAI && hasMicPermission
      }

      debugLog('VOICE-DICTATION', 'Final capabilities assessment:', newCapabilities)
      setCapabilities(newCapabilities)
      setState(prev => ({ ...prev, hasPermissions: hasMicPermission }))
    } catch (error) {
      debugError('VOICE-DICTATION', 'Failed to check dictation capabilities', error)
      const failedCapabilities = {
        hasOpenAIConfig: false,
        hasMicrophonePermission: false,
        isAvailable: false
      }
      debugLog('VOICE-DICTATION', 'Setting failed capabilities:', failedCapabilities)
      setCapabilities(failedCapabilities)
    }
  }, [])

  const startRecording = useCallback(async () => {
    debugLog('VOICE-DICTATION', 'Starting recording request...')
    if (!capabilities.isAvailable) {
      const errorMsg = 'Dictation not available. Check OpenAI settings and microphone permissions.'
      debugError('VOICE-DICTATION', 'Cannot start recording - capabilities not available', { capabilities })
      setState(prev => ({ ...prev, error: errorMsg }))
      return
    }

    try {
      debugLog('VOICE-DICTATION', 'Setting recording state and requesting microphone access...')
      setState(prev => ({ ...prev, isRecording: true, error: null, transcript: '', isPartialResult: false }))
      
      debugLog('VOICE-DICTATION', 'Requesting getUserMedia with audio constraints...')
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      debugLog('VOICE-DICTATION', 'Microphone stream obtained successfully', {
        streamId: stream.id,
        audioTracks: stream.getAudioTracks().length,
        trackSettings: stream.getAudioTracks()[0]?.getSettings()
      })
      
      audioStreamRef.current = stream
      audioChunksRef.current = []

      debugLog('VOICE-DICTATION', 'Creating MediaRecorder with webm/opus codec...')
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      })
      mediaRecorderRef.current = mediaRecorder

      debugLog('VOICE-DICTATION', 'MediaRecorder created successfully', {
        mimeType: mediaRecorder.mimeType,
        state: mediaRecorder.state
      })

      mediaRecorder.ondataavailable = (event) => {
        debugLog('VOICE-DICTATION', 'Audio data chunk received', {
          dataSize: event.data.size,
          type: event.data.type,
          totalChunks: audioChunksRef.current.length + 1
        })
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = async () => {
        debugLog('VOICE-DICTATION', 'MediaRecorder stopped, starting processing...')
        await processRecording()
      }

      mediaRecorder.onerror = (event) => {
        debugError('VOICE-DICTATION', 'MediaRecorder error occurred', event)
      }

      debugLog('VOICE-DICTATION', 'Starting MediaRecorder...')
      mediaRecorder.start()
      debugLog('VOICE-DICTATION', 'MediaRecorder started successfully')
    } catch (error) {
      debugError('VOICE-DICTATION', 'Failed to start recording', error)
      setState(prev => ({ 
        ...prev, 
        isRecording: false, 
        error: 'Failed to access microphone. Please check permissions.' 
      }))
    }
  }, [capabilities.isAvailable])

  const stopRecording = useCallback(() => {
    debugLog('VOICE-DICTATION', 'Stop recording requested', {
      hasMediaRecorder: !!mediaRecorderRef.current,
      isCurrentlyRecording: state.isRecording,
      recorderState: mediaRecorderRef.current?.state
    })
    
    if (mediaRecorderRef.current && state.isRecording) {
      debugLog('VOICE-DICTATION', 'Stopping MediaRecorder...')
      mediaRecorderRef.current.stop()
      setState(prev => ({ ...prev, isRecording: false, isProcessing: true }))
      debugLog('VOICE-DICTATION', 'MediaRecorder stop requested, state updated to processing')
    } else {
      debugLog('VOICE-DICTATION', 'Cannot stop recording - no active recorder or not recording')
    }
  }, [state.isRecording])

  const processRecording = useCallback(async () => {
    debugLog('VOICE-DICTATION', 'Starting audio processing...')
    try {
      debugLog('VOICE-DICTATION', 'Creating audio blob from chunks', {
        chunkCount: audioChunksRef.current.length,
        totalSize: audioChunksRef.current.reduce((sum, chunk) => sum + chunk.size, 0)
      })
      
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
      debugLog('VOICE-DICTATION', 'Audio blob created', {
        size: audioBlob.size,
        type: audioBlob.type,
        sizeMB: (audioBlob.size / 1024 / 1024).toFixed(2)
      })
      
      // Convert to file and transcribe using existing service
      debugLog('VOICE-DICTATION', 'Converting blob to array buffer...')
      const arrayBuffer = await audioBlob.arrayBuffer()
      const uint8Array = new Uint8Array(arrayBuffer)
      debugLog('VOICE-DICTATION', 'Uint8Array created', { length: uint8Array.length })
      
      // Create temporary file path
      const tempPath = `temp-dictation-${Date.now()}.webm`
      debugLog('VOICE-DICTATION', 'Generated temp file path:', tempPath)
      
      // Save audio file temporarily
      debugLog('VOICE-DICTATION', 'Saving audio to temp file...')
      const savedPath = await window.electronAPI.saveTempAudio(uint8Array, tempPath)
      setCurrentTempFile(savedPath)
      debugLog('VOICE-DICTATION', 'Audio saved to temp file:', savedPath)
      
      // Transcribe using existing service - use the returned full path
      debugLog('VOICE-DICTATION', 'Starting transcription with Whisper...')
      const result = await window.electronAPI.transcribeAudio(savedPath, 'whisper-1')
      debugLog('VOICE-DICTATION', 'Transcription completed', {
        hasText: !!result.text,
        textLength: result.text?.length || 0,
        textPreview: result.text?.substring(0, 100) || 'No text'
      })

      if (result.text) {
        debugLog('VOICE-DICTATION', 'Transcription successful, updating state and calling callback')
        setState(prev => ({ ...prev, transcript: result.text, isProcessing: false }))
        onTranscript(result.text)
      } else {
        debugError('VOICE-DICTATION', 'No transcription result received', result)
        throw new Error('No transcription result')
      }

      // Cleanup temp file - use the returned full path
      debugLog('VOICE-DICTATION', 'Cleaning up temp file...')
      await window.electronAPI.cleanupTempAudio(savedPath)
      setCurrentTempFile(null)
      debugLog('VOICE-DICTATION', 'Temp file cleanup completed')
    } catch (error) {
      debugError('VOICE-DICTATION', 'Transcription failed', error)
      setState(prev => ({ 
        ...prev, 
        isProcessing: false, 
        error: 'Transcription failed. Please try again.' 
      }))
    } finally {
      debugLog('VOICE-DICTATION', 'Processing completed, cleaning up resources...')
      cleanup()
    }
  }, [onTranscript])

  const cleanup = useCallback(async () => {
    debugLog('VOICE-DICTATION', 'Cleaning up audio resources...')
    if (audioStreamRef.current) {
      const tracks = audioStreamRef.current.getTracks()
      debugLog('VOICE-DICTATION', 'Stopping audio tracks', { trackCount: tracks.length })
      tracks.forEach((track, index) => {
        debugLog('VOICE-DICTATION', `Stopping track ${index}:`, { kind: track.kind, enabled: track.enabled, readyState: track.readyState })
        track.stop()
      })
      audioStreamRef.current = null
    }
    mediaRecorderRef.current = null
    audioChunksRef.current = []
    
    // Cleanup any remaining temp file
    if (currentTempFile) {
      debugLog('VOICE-DICTATION', 'Cleaning up remaining temp file on unmount:', currentTempFile)
      try {
        await window.electronAPI.cleanupTempAudio(currentTempFile)
        setCurrentTempFile(null)
        debugLog('VOICE-DICTATION', 'Temp file cleanup on unmount completed')
      } catch (error) {
        debugError('VOICE-DICTATION', 'Failed to cleanup temp file on unmount', error)
      }
    }
    
    debugLog('VOICE-DICTATION', 'Audio cleanup completed')
  }, [currentTempFile])

  const retry = useCallback(() => {
    debugLog('VOICE-DICTATION', 'Retry requested, clearing error state')
    setState(prev => ({ ...prev, error: null, transcript: '', isPartialResult: false }))
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    debugLog('VOICE-DICTATION', 'Voice dictation hook unmounting, setting up cleanup')
    return () => {
      debugLog('VOICE-DICTATION', 'Voice dictation hook cleanup triggered')
      cleanup()
    }
  }, [cleanup])

  return {
    state,
    capabilities,
    startRecording,
    stopRecording,
    retry,
    checkCapabilities
  }
}
