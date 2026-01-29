import React, { useState, useEffect, useRef } from 'react'
import { Mic, Square, Save, FolderOpen, AlertCircle, Clock, Users, Sparkles, Loader2 } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { TranscriptionResult, TranscriptionStatus, ChunkProgress } from '../../shared/types/transcription'
import { SummaryResult, SummaryStatus } from '../../shared/types/summary'
import { RecordingTypeSelector } from './RecordingTypeSelector'

interface MeetingTranscriptionProps {
  onNavigate: (page: string) => void
}

export const MeetingTranscription: React.FC<MeetingTranscriptionProps> = ({ onNavigate }) => {
  const [recordingStatus, setRecordingStatus] = useState<TranscriptionStatus>({ isRecording: false })
  const [transcriptionResult, setTranscriptionResult] = useState<TranscriptionResult | null>(null)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)
  const [transcriptFolder, setTranscriptFolder] = useState<string | null>(null)
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null)
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null)
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null)
  const [audioLevels, setAudioLevels] = useState<{ mic: number; system: number }>({ mic: 0, system: 0 })
  const audioLevelIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const updateAudioLevelsRef = useRef<(() => void) | null>(null)
  const isRecordingRef = useRef<boolean>(false)
  const trackCleanupRef = useRef<(() => void) | null>(null)
  const trackMonitorIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const micStreamRef = useRef<MediaStream | null>(null)
  const systemStreamRef = useRef<MediaStream | null>(null)
  const [currentTime, setCurrentTime] = useState<number>(Date.now())
  const [showRecordingSelector, setShowRecordingSelector] = useState(false)
  const [chunkProgress, setChunkProgress] = useState<ChunkProgress | null>(null)
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false)
  const [summaryResult, setSummaryResult] = useState<SummaryResult | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const cleanupTimer = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    // Only clear audio level timer if not recording (use ref for immediate state)
    if (audioLevelIntervalRef.current && !isRecordingRef.current) {
      clearInterval(audioLevelIntervalRef.current)
      audioLevelIntervalRef.current = null
    }
  }

  useEffect(() => {
    loadTranscriptFolder()
    checkRecordingStatus()
    
    // Listen for chunk progress events
    const handleChunkProgress = (progress: ChunkProgress) => {
      setChunkProgress(progress)
      if (progress.status === 'completed' || progress.status === 'error') {
        // Clear progress after completion
        setTimeout(() => setChunkProgress(null), 3000)
      }
    }

    const cleanupChunkProgress = window.electronAPI.onTranscriptionChunkProgress?.(handleChunkProgress)
    
    // Cleanup function to prevent memory leaks
    return () => {
      if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop()
      }
      if (audioStream) {
        audioStream.getTracks().forEach(track => track.stop())
      }
      if (audioContext && audioContext.state !== 'closed') {
        audioContext.close().catch(console.error)
      }
      cleanupTimer()
      // Cleanup event listener
      if (cleanupChunkProgress) {
        cleanupChunkProgress()
      }
    }
  }, [])

  // Real-time timer effect
  useEffect(() => {
    if (recordingStatus.isRecording) {
      intervalRef.current = setInterval(() => {
        setCurrentTime(Date.now())
      }, 1000)
    } else {
      cleanupTimer()
    }
    
    return cleanupTimer
  }, [recordingStatus.isRecording])

  const loadTranscriptFolder = async () => {
    try {
      const folder = await window.electronAPI.getTranscriptFolder()
      setTranscriptFolder(folder)
    } catch (error) {
      console.error('Failed to load transcript folder:', error)
    }
  }

  const checkRecordingStatus = async () => {
    try {
      const status = await window.electronAPI.getRecordingStatus()
      setRecordingStatus(status)
    } catch (error) {
      console.error('Failed to check recording status:', error)
    }
  }

  const handleStartRecording = async () => {
    setShowRecordingSelector(true)
  }

  const handleRecordingTypeSelected = async (recordFullMeeting: boolean) => {
    setShowRecordingSelector(false)
    
    // Check browser compatibility
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError('Your browser does not support audio recording')
      return
    }
    
    if (recordFullMeeting && !navigator.mediaDevices.getDisplayMedia) {
      setError('Your browser does not support system audio capture. Please use microphone-only recording.')
      return
    }
    
    try {
      setError(null)
      
      let stream: MediaStream
      
      if (recordFullMeeting) {
        // For full meeting: get BOTH microphone AND system audio, then mix properly
        try {
          const [micStream, systemStream] = await Promise.all([
            navigator.mediaDevices.getUserMedia({ 
              audio: {
                echoCancellation: true,
                noiseSuppression: true
              }
            }),
            navigator.mediaDevices.getDisplayMedia({ 
              audio: true,
              video: false
            })
          ])
          
          // Use Web Audio API to properly mix the streams
          const audioContext = new AudioContext()
          if (audioContext.state === 'suspended') {
            await audioContext.resume()
          }
          
          const micSource = audioContext.createMediaStreamSource(micStream)
          const systemSource = audioContext.createMediaStreamSource(systemStream)
          
          // Store streams in refs for proper cleanup
          micStreamRef.current = micStream
          systemStreamRef.current = systemStream
          
          // Create gain nodes for volume control
          const micGain = audioContext.createGain()
          const systemGain = audioContext.createGain()
          micGain.gain.value = 1.0
          systemGain.gain.value = 0.8
          
          // Connect sources to their gain nodes FIRST
          micSource.connect(micGain)
          systemSource.connect(systemGain)
          
          // Create destination and connect sources with PROPER MIXING
          const destination = audioContext.createMediaStreamDestination()
          
          // CRITICAL FIX: Create a single mixer node that both sources feed into
          const mixer = audioContext.createGain()
          mixer.gain.value = 1.0
          
          // Connect both gain nodes to the mixer, then mixer to destination
          micGain.connect(mixer)
          systemGain.connect(mixer)
          mixer.connect(destination)
          
          console.log('🔧 Audio routing setup:', {
            micGainConnected: true,
            systemGainConnected: true,
            mixerConnected: true,
            destinationTracks: destination.stream.getAudioTracks().length
          })
          
          // Set up audio level monitoring - connect BEFORE the destination
          const micAnalyser = audioContext.createAnalyser()
          const systemAnalyser = audioContext.createAnalyser()
          
          // CRITICAL: Also create analyzer AFTER mixing to see final output
          const mixerAnalyser = audioContext.createAnalyser()
          mixer.connect(mixerAnalyser)
          
          micAnalyser.fftSize = 256
          systemAnalyser.fftSize = 256
          mixerAnalyser.fftSize = 256
          
          // Connect analyzers to the original sources (not gain nodes)
          micSource.connect(micAnalyser)
          systemSource.connect(systemAnalyser)
          const micDataArray = new Uint8Array(micAnalyser.frequencyBinCount)
          const systemDataArray = new Uint8Array(systemAnalyser.frequencyBinCount)
          const mixerDataArray = new Uint8Array(mixerAnalyser.frequencyBinCount)
          
          const updateAudioLevels = () => {
            micAnalyser.getByteFrequencyData(micDataArray)
            systemAnalyser.getByteFrequencyData(systemDataArray)
            mixerAnalyser.getByteFrequencyData(mixerDataArray)
            
            const micLevel = Math.max(...micDataArray) / 255
            const systemLevel = Math.max(...systemDataArray) / 255
            const mixerLevel = Math.max(...mixerDataArray) / 255
            
            // Debug logging in development mode
            if (process.env.NODE_ENV === 'development') {
              console.log('🎚️ Audio levels:', {
                mic: micLevel.toFixed(3),
                system: systemLevel.toFixed(3),
                mixed: mixerLevel.toFixed(3)
              })
            }
            
            setAudioLevels({ mic: micLevel, system: systemLevel })
          }
          
          // Store function in ref for later use
          updateAudioLevelsRef.current = updateAudioLevels
          
          // Use destination stream for recording
          stream = destination.stream
          
          // CRITICAL: Verify both streams are actually flowing to destination
          console.log('🔍 Destination stream tracks:', destination.stream.getAudioTracks().map(t => ({
            id: t.id,
            label: t.label,
            enabled: t.enabled,
            readyState: t.readyState
          })))
          
          // Monitor track states during recording
          const monitorTracks = () => {
            console.log('📊 Track monitoring:', {
              micTracks: micStream.getAudioTracks().map(t => ({ 
                id: t.id, 
                enabled: t.enabled, 
                readyState: t.readyState,
                muted: t.muted 
              })),
              systemTracks: systemStream.getAudioTracks().map(t => ({ 
                id: t.id, 
                enabled: t.enabled, 
                readyState: t.readyState,
                muted: t.muted 
              })),
              destinationTracks: destination.stream.getAudioTracks().map(t => ({ 
                id: t.id, 
                enabled: t.enabled, 
                readyState: t.readyState,
                muted: t.muted 
              }))
            })
          }
          
          // Monitor every 5 seconds during recording
          trackMonitorIntervalRef.current = setInterval(monitorTracks, 5000)
          
          // Store cleanup function
          const originalCleanup = () => {
            if (trackMonitorIntervalRef.current) {
              clearInterval(trackMonitorIntervalRef.current)
              trackMonitorIntervalRef.current = null
            }
            if (micStreamRef.current) {
              micStreamRef.current.getTracks().forEach(track => track.stop())
              micStreamRef.current = null
            }
            if (systemStreamRef.current) {
              systemStreamRef.current.getTracks().forEach(track => track.stop())
              systemStreamRef.current = null
            }
          }
          
          // Store context and streams for cleanup
          setAudioContext(audioContext)
          setAudioStream(new MediaStream([
            ...micStream.getTracks(),
            ...systemStream.getTracks()
          ]))
          
          // Store cleanup function for track monitoring
          trackCleanupRef.current = originalCleanup
        } catch (error) {
          // Fallback to microphone only if system audio fails
          console.warn('System audio capture failed, using microphone only:', error)
          
          // Provide specific error message for common issues
          if (error instanceof Error) {
            if (error.name === 'NotAllowedError') {
              setError('System audio permission denied. Using microphone only. To record full meetings, please allow screen sharing when prompted.')
            } else if (error.name === 'NotSupportedError') {
              setError('System audio not supported in this browser. Using microphone only.')
            }
          }
          
          stream = await navigator.mediaDevices.getUserMedia({ 
            audio: {
              echoCancellation: true,
              noiseSuppression: true
            } 
          })
          setAudioStream(stream)
        }
      } else {
        // Microphone only
        stream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: true,
            noiseSuppression: true
          }
        })
        
        // Set up audio level monitoring for microphone-only recording
        try {
          const audioContext = new AudioContext()
          if (audioContext.state === 'suspended') {
            await audioContext.resume()
          }
          
          const micSource = audioContext.createMediaStreamSource(stream)
          const micAnalyser = audioContext.createAnalyser()
          micAnalyser.fftSize = 256
          micSource.connect(micAnalyser)
          
          const micDataArray = new Uint8Array(micAnalyser.frequencyBinCount)
          
          const updateAudioLevels = () => {
            micAnalyser.getByteFrequencyData(micDataArray)
            const micLevel = Math.max(...micDataArray) / 255
            setAudioLevels({ mic: micLevel, system: 0 })
          }
          
          updateAudioLevelsRef.current = updateAudioLevels
          setAudioContext(audioContext)
        } catch (audioError) {
          console.warn('Failed to set up audio level monitoring for microphone-only recording:', audioError)
          // Continue without audio level monitoring - recording will still work
          updateAudioLevelsRef.current = null
        }
        setAudioStream(stream)
      }
      
      // Create MediaRecorder with minimal configuration
      console.log('Creating MediaRecorder for stream with tracks:', stream.getAudioTracks().length)
      console.log('Stream tracks details:', stream.getAudioTracks().map(t => ({ 
        id: t.id, 
        enabled: t.enabled, 
        readyState: t.readyState,
        kind: t.kind,
        label: t.label
      })))
      
      // Use the most basic MediaRecorder setup
      const recorder = new MediaRecorder(stream)
      console.log('MediaRecorder created with mimeType:', recorder.mimeType)
      
      const audioChunks: Blob[] = []
      
      const handleDataAvailable = (event: BlobEvent) => {
        console.log('🎵 MediaRecorder data available:', event.data.size, 'bytes')
        if (event.data.size > 0) {
          audioChunks.push(event.data)
        }
      }
      
      const handleStop = async () => {
        console.log('🛑 MediaRecorder stopped, total chunks:', audioChunks.length)
        try {
          const audioBlob = new Blob(audioChunks, { type: recorder.mimeType || 'audio/webm' })
          console.log('📦 Final audio blob size:', audioBlob.size, 'bytes')
          
          // Validate recording has actual audio content
          if (audioBlob.size < 100) { // Lower threshold for testing
            console.error('❌ Recording too small:', audioBlob.size, 'bytes')
            setError('Recording appears to be silent. Please check your microphone and try again.')
            return
          }
          
          const arrayBuffer = await audioBlob.arrayBuffer()
          console.log('📤 Sending audio data to main process:', arrayBuffer.byteLength, 'bytes')
          await window.electronAPI.sendAudioData(arrayBuffer)
          console.log('✅ Audio data sent successfully')
        } catch (error) {
          console.error('❌ Failed to send audio data:', error)
          setError('Failed to process recorded audio')
        }
        
        // Clean up event listeners
        recorder.removeEventListener('dataavailable', handleDataAvailable)
        recorder.removeEventListener('stop', handleStop)
      }
      
      recorder.addEventListener('dataavailable', handleDataAvailable)
      recorder.addEventListener('stop', handleStop)
      
      // Add error event listener
      recorder.addEventListener('error', (event) => {
        console.error('❌ MediaRecorder error:', event)
        setError('Recording failed due to MediaRecorder error')
      })
      
      setMediaRecorder(recorder)
      
      // Start recording
      await window.electronAPI.startAudioRecording()
      console.log('🚀 Starting MediaRecorder with timeslice: 1000ms')
      
      // Add a test to see if the stream is actually active
      console.log('📊 Stream active before start:', stream.active)
      console.log('🎤 Stream tracks before start:', stream.getAudioTracks().map(t => ({
        enabled: t.enabled,
        readyState: t.readyState,
        muted: t.muted
      })))
      
      // CRITICAL: Test if MediaRecorder can actually start
      try {
        recorder.start(1000) // Request data every second
        console.log('✅ MediaRecorder.start() called successfully')
        console.log('📊 MediaRecorder state after start:', recorder.state)
      } catch (startError) {
        console.error('❌ MediaRecorder.start() failed:', startError)
        setError('Failed to start recording: ' + startError.message)
        return
      }
      
      // Test if we can manually trigger data
      setTimeout(() => {
        console.log('⏰ 2-second check - MediaRecorder state:', recorder.state)
        console.log('⏰ 2-second check - Stream still active:', stream.active)
        if (recorder.state === 'recording') {
          console.log('🔄 Requesting data manually...')
          try {
            recorder.requestData()
            console.log('✅ Manual requestData() called')
          } catch (requestError) {
            console.error('❌ Manual requestData() failed:', requestError)
          }
        } else {
          console.error('❌ MediaRecorder not in recording state after 2 seconds!')
        }
      }, 2000)
      
      // Test stream activity
      setTimeout(() => {
        const track = stream.getAudioTracks()[0]
        if (track) {
          console.log('🎤 Track state after 3 seconds:', {
            enabled: track.enabled,
            readyState: track.readyState,
            muted: track.muted
          })
        }
      }, 3000)
      
      setRecordingStatus({ isRecording: true, recordingStartTime: new Date() })
      isRecordingRef.current = true // Set ref immediately
      setTranscriptionResult(null)
      
      // Start audio level monitoring after recording status is set
      if (audioLevelIntervalRef.current === null && updateAudioLevelsRef.current) {
        const intervalId = setInterval(updateAudioLevelsRef.current, 100)
        audioLevelIntervalRef.current = intervalId
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to start recording')
    }
  }

  const handleStopRecording = async () => {
    try {
      setError(null)
      setIsTranscribing(true)
      
      // Stop MediaRecorder
      if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop()
      }
      
      // Stop audio stream
      if (audioStream) {
        audioStream.getTracks().forEach(track => track.stop())
        setAudioStream(null)
      }
      
      // Close audio context
      if (audioContext && audioContext.state !== 'closed') {
        await audioContext.close()
        setAudioContext(null)
      }
      
      // Clean up track monitoring
      if (trackCleanupRef.current) {
        trackCleanupRef.current()
        trackCleanupRef.current = null
      }
      
      // Reset audio levels
      setAudioLevels({ mic: 0, system: 0 })
      
      setMediaRecorder(null)
      
      // Wait for MediaRecorder to finish processing
      await new Promise(resolve => {
        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
          mediaRecorder.addEventListener('stop', resolve, { once: true })
        } else {
          resolve(undefined)
        }
      })
      
      // CRITICAL: Add delay to ensure all IPC audio data is sent before transcription
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      const model = await window.electronAPI.getTranscriptionModel()
      const result = await window.electronAPI.stopRecordingAndTranscribe(model)
      
      setTranscriptionResult(result)
      setRecordingStatus({ isRecording: false })
      isRecordingRef.current = false // Clear ref when recording stops
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to stop recording and transcribe')
      setRecordingStatus({ isRecording: false })
    } finally {
      setIsTranscribing(false)
    }
  }

  const handleSaveTranscript = async () => {
    if (!transcriptionResult) return

    try {
      setIsSaving(true)
      setSaveMessage(null)
      setError(null)

      const meetingTitle = `Meeting ${new Date().toLocaleDateString()}`
      const result = await window.electronAPI.saveTranscriptToObsidian(
        transcriptionResult.text,
        meetingTitle,
        transcriptionResult.id
      )

      if (result.success) {
        setSaveMessage(`Transcript saved to: ${result.filePath}`)
      } else {
        setError(result.error || 'Failed to save transcript')
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to save transcript')
    } finally {
      setIsSaving(false)
      setTimeout(() => setSaveMessage(null), 5000)
    }
  }

  const handleGenerateSummary = async () => {
    if (!transcriptionResult) return

    try {
      setIsGeneratingSummary(true)
      setError(null)

      const summaryRequest = {
        transcriptionId: transcriptionResult.id,
        transcriptionText: transcriptionResult.text
      }

      const result = await window.electronAPI.generateTranscriptionSummary(summaryRequest)
      setSummaryResult(result)
      setSaveMessage('Summary generated successfully!')
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to generate summary')
    } finally {
      setIsGeneratingSummary(false)
      setTimeout(() => setSaveMessage(null), 3000)
    }
  }

  const handleSelectFolder = async () => {
    try {
      const folderPath = await window.electronAPI.selectTranscriptFolder()
      if (folderPath) {
        await window.electronAPI.setTranscriptFolder(folderPath)
        setTranscriptFolder(folderPath)
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to select folder')
    }
  }

  const formatDuration = (startTime: Date) => {
    const duration = Math.floor((currentTime - startTime.getTime()) / 1000)
    const minutes = Math.floor(duration / 60)
    const seconds = duration % 60
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  return (
    <>
      {/* Recording Type Selection Modal */}
      {showRecordingSelector && (
        <RecordingTypeSelector
          onSelect={handleRecordingTypeSelected}
          onCancel={() => setShowRecordingSelector(false)}
        />
      )}

      <div className="bg-surface border border-border rounded-xl p-6 shadow-sm">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-lg bg-surface-hover border border-border flex items-center justify-center">
          <Mic className="w-5 h-5 text-secondary" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-primary">Meeting Transcription</h3>
            <span className="px-2 py-0.5 bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 text-xs font-medium rounded-full border border-brand-200 dark:border-brand-800">
              Beta
            </span>
          </div>
          <p className="text-sm text-secondary">Record and transcribe meetings with AI</p>
        </div>
      </div>

      {/* Recording Controls */}
      <div className="flex items-center gap-3 mb-4">
        {!recordingStatus.isRecording ? (
          <button
            onClick={handleStartRecording}
            disabled={isTranscribing}
            className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 disabled:bg-gray-400 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Mic className="w-4 h-4" />
            Start Recording
          </button>
        ) : (
          <button
            onClick={handleStopRecording}
            disabled={isTranscribing}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Square className="w-4 h-4" />
            {isTranscribing ? 'Transcribing...' : 'Stop Recording'}
          </button>
        )}

        {recordingStatus.isRecording && recordingStatus.recordingStartTime && (
          <div className="flex items-center gap-2 text-sm text-secondary">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
            Recording: {formatDuration(recordingStatus.recordingStartTime)}
          </div>
        )}
      </div>

      {/* Audio Level Indicators */}
      {recordingStatus.isRecording && (
        <div className="mb-4 p-3 bg-surface-hover border border-border rounded-lg">
          <div className="text-xs text-secondary mb-2">Audio Levels</div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Mic className="w-3 h-3 text-secondary" />
              <span className="text-xs text-secondary w-12">Mic:</span>
              <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-green-500 transition-all duration-100"
                  style={{ width: `${audioLevels.mic * 100}%` }}
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Users className="w-3 h-3 text-secondary" />
              <span className="text-xs text-secondary w-12">System:</span>
              <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-500 transition-all duration-100"
                  style={{ width: `${audioLevels.system * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Transcript Display */}
      {transcriptionResult && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium text-primary">Transcript</h4>
            <div className="flex items-center gap-2">
              {!transcriptFolder && (
                <button
                  onClick={handleSelectFolder}
                  className="flex items-center gap-1 px-3 py-1 text-xs text-secondary hover:text-primary border border-border hover:border-border-hover rounded transition-colors"
                >
                  <FolderOpen className="w-3 h-3" />
                  Select Folder
                </button>
              )}
              <button
                onClick={handleGenerateSummary}
                disabled={isGeneratingSummary}
                className="flex items-center gap-1 px-3 py-1 bg-brand-600 hover:bg-brand-700 disabled:bg-gray-400 text-white text-xs font-medium rounded transition-colors"
              >
                {isGeneratingSummary ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Summarizing...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3 h-3" />
                    Generate Summary
                  </>
                )}
              </button>
              <button
                onClick={handleSaveTranscript}
                disabled={isSaving || !transcriptFolder}
                className="flex items-center gap-1 px-3 py-1 bg-brand-600 hover:bg-brand-700 disabled:bg-gray-400 text-white text-xs font-medium rounded transition-colors"
              >
                <Save className="w-3 h-3" />
                {isSaving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
          <div className="p-3 bg-surface-hover border border-border rounded-lg text-sm text-primary max-h-40 overflow-y-auto">
            {transcriptionResult.text}
          </div>
          <div className="mt-2 text-xs text-secondary">
            Model: {transcriptionResult.model} • Created: {transcriptionResult.createdAt.toLocaleString()}
          </div>
        </div>
      )}

      {/* Summary Display */}
      {summaryResult && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium text-primary">Meeting Summary</h4>
          </div>
          <div className="p-3 bg-surface-hover border border-border rounded-lg text-sm text-primary max-h-60 overflow-y-auto">
            <div className="prose prose-sm max-w-none">
              <ReactMarkdown
                className="text-primary"
                components={{
                  h1: ({ children }) => <h1 className="text-lg font-bold mt-4 mb-2 text-primary">{children}</h1>,
                  h2: ({ children }) => <h2 className="text-base font-semibold mt-4 mb-2 text-primary">{children}</h2>,
                  h3: ({ children }) => <h3 className="text-sm font-medium mt-3 mb-1 text-primary">{children}</h3>,
                  p: ({ children }) => <p className="mb-2 text-primary">{children}</p>,
                  ul: ({ children }) => <ul className="ml-4 mb-2">{children}</ul>,
                  li: ({ children }) => <li className="text-primary mb-1">{children}</li>,
                  table: ({ children }) => <div className="overflow-x-auto mb-4"><table className="w-full border-collapse">{children}</table></div>,
                  thead: ({ children }) => <thead className="border-b border-border">{children}</thead>,
                  tbody: ({ children }) => <tbody>{children}</tbody>,
                  tr: ({ children }) => <tr className="border-b border-border">{children}</tr>,
                  th: ({ children }) => <th className="text-left py-1 px-2 text-xs font-medium text-primary">{children}</th>,
                  td: ({ children }) => <td className="py-1 px-2 text-xs text-primary">{children}</td>,
                }}
              >
                {summaryResult.content}
              </ReactMarkdown>
            </div>
          </div>
          <div className="mt-2 text-xs text-secondary">
            Model: {summaryResult.model} • Generated: {summaryResult.generatedAt.toLocaleString()}
          </div>
        </div>
      )}

      {/* Chunk Progress Display */}
      {chunkProgress && (
        <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
            <Clock className="w-4 h-4" />
            <div className="flex-1">
              <div className="text-sm font-medium">
                Processing Audio Segments
              </div>
              <div className="text-xs text-blue-600 dark:text-blue-300 mt-1">
                {chunkProgress.status === 'processing' && (
                  <>
                    Segment {chunkProgress.current} of {chunkProgress.total}
                    {chunkProgress.estimatedTimeRemaining && (
                      <span className="ml-2">
                        • ~{Math.round(chunkProgress.estimatedTimeRemaining / 60)}m remaining
                      </span>
                    )}
                  </>
                )}
                {chunkProgress.status === 'completed' && (
                  <span className="text-green-600 dark:text-green-400">
                    ✅ All segments processed successfully
                  </span>
                )}
                {chunkProgress.status === 'error' && (
                  <span className="text-red-600 dark:text-red-400">
                    ❌ Processing failed
                  </span>
                )}
              </div>
              {chunkProgress.status === 'processing' && (
                <div className="mt-2 w-full bg-blue-200 dark:bg-blue-800 rounded-full h-2">
                  <div 
                    className="bg-blue-600 dark:bg-blue-400 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(chunkProgress.current / chunkProgress.total) * 100}%` }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm">{error}</span>
          </div>
        </div>
      )}

      {/* Save Message */}
      {saveMessage && (
        <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <div className="text-green-700 dark:text-green-400 text-sm">
            {saveMessage}
          </div>
        </div>
      )}

      {/* Setup Instructions */}
      {!transcriptFolder && (
        <div className="p-3 bg-warning-light/40 dark:bg-warning-dark/20 border border-warning-light dark:border-warning-dark rounded-lg">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-warning-dark dark:text-warning-400 mt-0.5" />
            <div className="text-sm">
              <p className="text-warning-dark dark:text-warning-400 font-medium mb-1">
                Setup Required
              </p>
              <p className="text-secondary text-xs">
                Select a folder to save transcripts, or configure it in{' '}
                <button
                  onClick={() => onNavigate('settings')}
                  className="text-brand-600 hover:text-brand-700 underline"
                  data-testid="transcription-settings-link"
                >
                  Settings
                </button>
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  )
}
