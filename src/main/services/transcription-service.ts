import { AudioRecordingService } from './audio-recording-service'
import { OpenAIService } from './openai-service'
import { SettingsManager } from './settings-manager'
import { AudioChunker } from './audio-chunker'
import { TranscriptionRequest, TranscriptionResult, TranscriptionStatus, ChunkProgress, ChunkedTranscriptionResult } from '../../shared/types/transcription'
import { Debug } from '../../shared/utils/debug'
import { EventEmitter } from 'events'

export class TranscriptionService extends EventEmitter {
  private audioService: AudioRecordingService
  private openaiService: OpenAIService
  private settingsManager: SettingsManager

  constructor(audioService: AudioRecordingService, openaiService: OpenAIService) {
    super()
    this.audioService = audioService
    this.openaiService = openaiService
    this.settingsManager = new SettingsManager()
  }

  async startRecording(): Promise<void> {
    try {
      await this.audioService.startRecording()
      Debug.log('Transcription recording started')
    } catch (error) {
      Debug.error('Failed to start transcription recording:', error)
      throw error
    }
  }

  async stopRecordingAndTranscribe(model?: string): Promise<TranscriptionResult> {
    try {
      const recordingState = await this.audioService.stopRecording()
      
      if (!recordingState.filePath) {
        throw new Error('No recording file available')
      }

      Debug.log('Recording stopped, starting transcription:', recordingState.filePath)

      const transcriptionModel = model || this.settingsManager.getTranscriptionModel()
      
      // Check if file needs chunking
      if (AudioChunker.needsChunking(recordingState.filePath)) {
        Debug.log('Large file detected, using chunked transcription')
        return await this.transcribeWithChunking(recordingState.filePath, transcriptionModel)
      } else {
        Debug.log('Small file, using direct transcription')
        const transcriptionRequest: TranscriptionRequest = {
          audioFilePath: recordingState.filePath,
          model: transcriptionModel
        }
        const result = await this.openaiService.transcribeAudio(transcriptionRequest)
        Debug.log('Transcription completed:', result.id)
        return result
      }
    } catch (error) {
      Debug.error('Failed to stop recording and transcribe:', error)
      throw error
    }
  }

  getRecordingStatus(): TranscriptionStatus {
    const recordingState = this.audioService.getRecordingState()
    return {
      isRecording: recordingState.isRecording,
      recordingStartTime: recordingState.startTime,
      currentFilePath: recordingState.filePath
    }
  }

  async transcribeFile(filePath: string, model?: string): Promise<TranscriptionResult> {
    try {
      const transcriptionModel = model || this.settingsManager.getTranscriptionModel()
      
      // Check if file needs chunking
      if (AudioChunker.needsChunking(filePath)) {
        Debug.log('Large file detected, using chunked transcription')
        return await this.transcribeWithChunking(filePath, transcriptionModel)
      } else {
        const transcriptionRequest: TranscriptionRequest = {
          audioFilePath: filePath,
          model: transcriptionModel
        }
        return await this.openaiService.transcribeAudio(transcriptionRequest)
      }
    } catch (error) {
      Debug.error('Failed to transcribe file:', error)
      throw error
    }
  }

  /**
   * Transcribe large audio files using chunking
   */
  private async transcribeWithChunking(filePath: string, model: string): Promise<ChunkedTranscriptionResult> {
    const startTime = Date.now()
    
    try {
      // Split file into chunks
      const chunkingResult = await AudioChunker.chunkAudioFile(filePath)
      Debug.log(`File split into ${chunkingResult.totalChunks} chunks`)

      // Emit progress event
      this.emit('chunkProgress', {
        current: 0,
        total: chunkingResult.totalChunks,
        status: 'processing',
        estimatedTimeRemaining: AudioChunker.estimateProcessingTime(chunkingResult.totalChunks)
      } as ChunkProgress)

      const transcriptionResults: string[] = []
      let failedChunks = 0
      
      // Process each chunk
      for (let i = 0; i < chunkingResult.chunks.length; i++) {
        const chunk = chunkingResult.chunks[i]
        Debug.log(`Processing chunk ${i + 1}/${chunkingResult.totalChunks}: ${chunk.filePath}`)

        try {
          const transcriptionRequest: TranscriptionRequest = {
            audioFilePath: chunk.filePath,
            model
          }
          
          const result = await this.openaiService.transcribeAudio(transcriptionRequest)
          transcriptionResults.push(result.text)
          
          // Emit progress update
          this.emit('chunkProgress', {
            current: i + 1,
            total: chunkingResult.totalChunks,
            status: 'processing',
            estimatedTimeRemaining: AudioChunker.estimateProcessingTime(chunkingResult.totalChunks - (i + 1))
          } as ChunkProgress)
          
        } catch (error) {
          Debug.error(`Failed to transcribe chunk ${i}:`, error)
          failedChunks++
          // Continue with other chunks, add placeholder
          transcriptionResults.push(`[Chunk ${i + 1} transcription failed]`)
          
          // Check if failure rate exceeds threshold (20%)
          const failureRate = failedChunks / (i + 1)
          if (failureRate > 0.2 && i > 2) { // Only check after processing at least 3 chunks
            this.emit('chunkProgress', {
              current: i + 1,
              total: chunkingResult.totalChunks,
              status: 'error'
            } as ChunkProgress)
            throw new Error(`Too many chunk failures (${Math.round(failureRate * 100)}%). Stopping transcription.`)
          }
        }
      }

      // Clean up chunk files
      await AudioChunker.cleanupChunks(chunkingResult.chunks)

      // Combine results
      const combinedText = transcriptionResults.join(' ')
      const processingTime = Date.now() - startTime

      // Emit completion with warning if there were failures
      const status = failedChunks > 0 ? 'completed' : 'completed'
      this.emit('chunkProgress', {
        current: chunkingResult.totalChunks,
        total: chunkingResult.totalChunks,
        status
      } as ChunkProgress)

      // Log warning if chunks failed
      if (failedChunks > 0) {
        Debug.log(`Chunked transcription completed with ${failedChunks}/${chunkingResult.totalChunks} failed chunks`)
      } else {
        Debug.log(`Chunked transcription completed successfully in ${processingTime}ms`)
      }

      return {
        id: `chunked-${Date.now()}`,
        text: combinedText,
        createdAt: new Date(),
        model,
        chunks: chunkingResult.totalChunks,
        processingTime
      }
    } catch (error) {
      this.emit('chunkProgress', {
        current: 0,
        total: 0,
        status: 'error'
      } as ChunkProgress)
      
      Debug.error('Chunked transcription failed:', error)
      throw error
    }
  }

  async cleanup(): Promise<void> {
    await this.audioService.cleanup()
  }
}
