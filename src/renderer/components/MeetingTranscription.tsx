import React, { useState, useEffect, useRef } from 'react'
import { Mic, Square, Save, FolderOpen, AlertCircle, Clock, Users } from 'lucide-react'
import { TranscriptionResult, TranscriptionStatus, ChunkProgress } from '../../shared/types/transcription'
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
  const [currentTime, setCurrentTime] = useState<number>(Date.now())
  const [showRecordingSelector, setShowRecordingSelector] = useState(false)
  const [chunkProgress, setChunkProgress] = useState<ChunkProgress | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const cleanupTimer = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    if (audioLevelIntervalRef.current) {
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
          
          // Create gain nodes for volume control
          const micGain = audioContext.createGain()
          const systemGain = audioContext.createGain()
          micGain.gain.value = 1.0
          systemGain.gain.value = 0.8
          
          // Create destination and connect sources
          const destination = audioContext.createMediaStreamDestination()
          micSource.connect(micGain).connect(destination)
          systemSource.connect(systemGain).connect(destination)
          
          // Set up audio level monitoring
          const micAnalyser = audioContext.createAnalyser()
          const systemAnalyser = audioContext.createAnalyser()
          micAnalyser.fftSize = 256
          systemAnalyser.fftSize = 256
          micGain.connect(micAnalyser)
          systemGain.connect(systemAnalyser)
          
          const micDataArray = new Uint8Array(micAnalyser.frequencyBinCount)
          const systemDataArray = new Uint8Array(systemAnalyser.frequencyBinCount)
          
          const updateAudioLevels = () => {
            micAnalyser.getByteFrequencyData(micDataArray)
            systemAnalyser.getByteFrequencyData(systemDataArray)
            
            const micLevel = Math.max(...micDataArray) / 255
            const systemLevel = Math.max(...systemDataArray) / 255
            
            setAudioLevels({ mic: micLevel, system: systemLevel })
          }
          
          audioLevelIntervalRef.current = setInterval(updateAudioLevels, 100)
          
          // Use destination stream for recording
          stream = destination.stream
          
          // Store context and streams for cleanup
          setAudioContext(audioContext)
          setAudioStream(new MediaStream([
            ...micStream.getTracks(),
            ...systemStream.getTracks()
          ]))
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
      setTranscriptionResult(null)
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
