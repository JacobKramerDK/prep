import React, { useState, useEffect } from 'react'
import { Mic, Square, Save, FolderOpen, AlertCircle } from 'lucide-react'
import { TranscriptionResult, TranscriptionStatus } from '../../shared/types/transcription'

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

  useEffect(() => {
    loadTranscriptFolder()
    checkRecordingStatus()
    
    // Cleanup function to prevent memory leaks
    return () => {
      if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop()
      }
      if (audioStream) {
        audioStream.getTracks().forEach(track => track.stop())
      }
    }
  }, [])

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
    try {
      setError(null)
      
      // Ask user what type of audio to record
      const recordFullMeeting = window.confirm(
        'Record full meeting audio?\n\n' +
        'OK = Full meeting (your voice + others)\n' +
        'Cancel = Microphone only (just your voice)'
      )
      
      let stream: MediaStream
      
      if (recordFullMeeting) {
        // For full meeting: get BOTH microphone AND system audio separately, then combine
        try {
          const [micStream, systemStream] = await Promise.all([
            navigator.mediaDevices.getUserMedia({ 
              audio: {
                sampleRate: 16000,
                channelCount: 1,
                echoCancellation: true,
                noiseSuppression: true
              } 
            }),
            navigator.mediaDevices.getDisplayMedia({ 
              audio: true,
              video: false
            })
          ])
          
          // Create a combined stream with both audio tracks
          const combinedStream = new MediaStream()
          micStream.getAudioTracks().forEach(track => combinedStream.addTrack(track))
          systemStream.getAudioTracks().forEach(track => combinedStream.addTrack(track))
          
          stream = combinedStream
          
          // Store both streams for cleanup
          setAudioStream(new MediaStream([
            ...micStream.getTracks(),
            ...systemStream.getTracks()
          ]))
        } catch (error) {
          // Fallback to microphone only if system audio fails
          console.warn('System audio capture failed, using microphone only:', error)
          stream = await navigator.mediaDevices.getUserMedia({ 
            audio: {
              sampleRate: 16000,
              channelCount: 1,
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
            sampleRate: 16000,
            channelCount: 1,
            echoCancellation: true,
            noiseSuppression: true
          } 
        })
        setAudioStream(stream)
      }
      
      // Create MediaRecorder
      const recorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      })
      
      const audioChunks: Blob[] = []
      
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.push(event.data)
        }
      }
      
      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' })
        const arrayBuffer = await audioBlob.arrayBuffer()
        await window.electronAPI.sendAudioData(arrayBuffer)
      }
      
      setMediaRecorder(recorder)
      
      // Start recording
      await window.electronAPI.startAudioRecording()
      recorder.start(1000)
      
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
      
      setMediaRecorder(null)
      
      // Wait a moment for data to be sent
      await new Promise(resolve => setTimeout(resolve, 500))
      
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
    const now = new Date()
    const duration = Math.floor((now.getTime() - startTime.getTime()) / 1000)
    const minutes = Math.floor(duration / 60)
    const seconds = duration % 60
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  return (
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
  )
}
