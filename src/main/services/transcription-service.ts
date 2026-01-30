import { AudioRecordingService } from './audio-recording-service'
import { OpenAIService } from './openai-service'
import { SettingsManager } from './settings-manager'
import { AudioChunker } from './audio-chunker'
import { AudioProcessor } from './audio-processor-full'
import { TranscriptionRequest, TranscriptionResult, TranscriptionStatus, ChunkProgress, ChunkedTranscriptionResult } from '../../shared/types/transcription'
import { Debug } from '../../shared/utils/debug'
import { EventEmitter } from 'events'
import * as fs from 'fs'

export class TranscriptionService extends EventEmitter {
  private audioService: AudioRecordingService
  private openaiService: OpenAIService | null
  private settingsManager: SettingsManager
  private initialized: boolean = false

  constructor(audioService: AudioRecordingService, openaiService: OpenAIService | null) {
    super()
    this.audioService = audioService
    this.openaiService = openaiService
    this.settingsManager = new SettingsManager()
  }

  /**
   * Initialize the transcription service - must be called before use
   */
  async initialize(): Promise<void> {
    if (this.initialized) return
    
    try {
      const ffmpegAvailable = await AudioProcessor.initialize()
      if (ffmpegAvailable) {
        Debug.log('Audio processor initialized with FFmpeg support - unlimited recording enabled')
      } else {
        Debug.log('Audio processor initialized with fallback mode - improved chunking enabled')
      }
      this.initialized = true
    } catch (error) {
      Debug.error('Failed to initialize audio processor:', error)
      // Continue with basic functionality - the audio processor will handle fallbacks
      Debug.log('Continuing with basic audio processing capabilities')
      this.initialized = true
    }
  }

  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('TranscriptionService must be initialized before use. Call initialize() first.')
    }
  }

  async startRecording(): Promise<void> {
    this.ensureInitialized()
    try {
      await this.audioService.startRecording()
      Debug.log('Transcription recording started')
    } catch (error) {
      Debug.error('Failed to start transcription recording:', error)
      throw error
    }
  }

  async stopRecordingAndTranscribe(model?: string): Promise<TranscriptionResult> {
    this.ensureInitialized()
    try {
      const recordingState = await this.audioService.stopRecording()
      
      if (!recordingState.filePath) {
        throw new Error('No recording file available')
      }

      Debug.log('Recording stopped, starting transcription:', recordingState.filePath)

      const transcriptionModel = model || this.settingsManager.getTranscriptionModel()
      let result: TranscriptionResult
      
      // Use new audio processor for better segmentation
      if (await AudioProcessor.needsSegmentation(recordingState.filePath)) {
        Debug.log('Large/long file detected, using time-based segmentation')
        result = await this.transcribeWithSegmentation(recordingState.filePath, transcriptionModel)
      } else {
        Debug.log('Small file, using direct transcription')
        if (!this.openaiService) {
          throw new Error('OpenAI service not available. Please configure your API key in settings.')
        }
        const transcriptionRequest: TranscriptionRequest = {
          audioFilePath: recordingState.filePath,
          model: transcriptionModel
        }
        result = await this.openaiService.transcribeAudio(transcriptionRequest)
        Debug.log('Transcription completed:', result.id)
      }

      // Clean up original recording file only after successful transcription
      await this.cleanupRecordingFile(recordingState.filePath)
      
      return result
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
    this.ensureInitialized()
    try {
      const transcriptionModel = model || this.settingsManager.getTranscriptionModel()
      
      // Use new audio processor for better segmentation
      if (await AudioProcessor.needsSegmentation(filePath)) {
        Debug.log('Large/long file detected, using time-based segmentation')
        return await this.transcribeWithSegmentation(filePath, transcriptionModel)
      } else {
        if (!this.openaiService) {
          throw new Error('OpenAI service not available. Please configure your API key in settings.')
        }
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
   * Transcribe large audio files using time-based segmentation
   */
  private async transcribeWithSegmentation(filePath: string, model: string): Promise<ChunkedTranscriptionResult> {
    const startTime = Date.now()
    
    try {
      Debug.log(`Starting time-based segmentation for: ${filePath} with model: ${model}`)
      
      // Segment file using proper audio processing
      const segmentationResult = await AudioProcessor.segmentAudioFile(filePath)
      Debug.log(`File segmented into ${segmentationResult.totalSegments} segments (${segmentationResult.originalDuration.toFixed(1)}s, ${(segmentationResult.originalSize / 1024 / 1024).toFixed(2)}MB total)`)

      // Emit progress event
      this.emit('chunkProgress', {
        current: 0,
        total: segmentationResult.totalSegments,
        status: 'processing',
        estimatedTimeRemaining: AudioProcessor.estimateProcessingTime(segmentationResult.totalSegments)
      } as ChunkProgress)

      const transcriptionResults: string[] = []
      let failedSegments = 0
      
      // Process each segment
      for (let i = 0; i < segmentationResult.segments.length; i++) {
        const segment = segmentationResult.segments[i]
        Debug.log(`Processing segment ${i + 1}/${segmentationResult.totalSegments}: ${segment.duration.toFixed(1)}s (${(segment.sizeBytes / 1024 / 1024).toFixed(2)}MB)`)

        try {
          const segmentStartTime = Date.now()
          if (!this.openaiService) {
            throw new Error('OpenAI service not available. Please configure your API key in settings.')
          }
          const transcriptionRequest: TranscriptionRequest = {
            audioFilePath: segment.filePath,
            model
          }
          
          const result = await this.openaiService.transcribeAudio(transcriptionRequest)
          const segmentTime = Date.now() - segmentStartTime
          
          transcriptionResults.push(result.text)
          Debug.log(`Segment ${i + 1} completed in ${segmentTime}ms, text length: ${result.text.length} chars`)
          
          // Emit progress update
          this.emit('chunkProgress', {
            current: i + 1,
            total: segmentationResult.totalSegments,
            status: 'processing',
            estimatedTimeRemaining: AudioProcessor.estimateProcessingTime(segmentationResult.totalSegments - (i + 1))
          } as ChunkProgress)
          
        } catch (error) {
          Debug.error(`Failed to transcribe segment ${i + 1}:`, error)
          failedSegments++
          // Continue with other segments, add placeholder
          transcriptionResults.push(`[Segment ${i + 1} transcription failed: ${error instanceof Error ? error.message : 'Unknown error'}]`)
          
          // Check if failure rate exceeds threshold (20%)
          const failureRate = failedSegments / (i + 1)
          Debug.log(`Segment failure rate: ${Math.round(failureRate * 100)}% (${failedSegments}/${i + 1})`)
          
          if (failureRate > 0.2 && i > 2) { // Only check after processing at least 3 segments
            this.emit('chunkProgress', {
              current: i + 1,
              total: segmentationResult.totalSegments,
              status: 'error'
            } as ChunkProgress)
            throw new Error(`Too many segment failures (${Math.round(failureRate * 100)}%). Stopping transcription.`)
          }
        }
      }

      // Clean up segment files
      await AudioProcessor.cleanupSegments(segmentationResult.segments)

      // Combine results
      const combinedText = transcriptionResults.join(' ')
      const processingTime = Date.now() - startTime

      // Emit completion
      this.emit('chunkProgress', {
        current: segmentationResult.totalSegments,
        total: segmentationResult.totalSegments,
        status: 'completed'
      } as ChunkProgress)

      // Log completion
      if (failedSegments > 0) {
        Debug.log(`Segmented transcription completed with ${failedSegments}/${segmentationResult.totalSegments} failed segments`)
      } else {
        Debug.log(`Segmented transcription completed successfully in ${processingTime}ms`)
      }

      return {
        id: `segmented-${Date.now()}`,
        text: combinedText,
        createdAt: new Date(),
        model,
        chunks: segmentationResult.totalSegments,
        processingTime
      }
    } catch (error) {
      this.emit('chunkProgress', {
        current: 0,
        total: 0,
        status: 'error'
      } as ChunkProgress)
      
      Debug.error('Segmented transcription failed:', error)
      throw error
    }
  }

  /**
   * Transcribe large audio files using chunking (legacy method - kept for compatibility)
   */
  private async transcribeWithChunking(filePath: string, model: string): Promise<ChunkedTranscriptionResult> {
    const startTime = Date.now()
    
    try {
      Debug.log(`Starting chunked transcription for: ${filePath} with model: ${model}`)
      
      // Split file into chunks
      const chunkingResult = await AudioChunker.chunkAudioFile(filePath)
      Debug.log(`File split into ${chunkingResult.totalChunks} chunks (original: ${(chunkingResult.originalSize / 1024 / 1024).toFixed(2)}MB)`)

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
        Debug.log(`Processing chunk ${i + 1}/${chunkingResult.totalChunks}: ${chunk.filePath} (${(chunk.sizeBytes / 1024 / 1024).toFixed(2)}MB)`)

        try {
          const chunkStartTime = Date.now()
          if (!this.openaiService) {
            throw new Error('OpenAI service not available. Please configure your API key in settings.')
          }
          const transcriptionRequest: TranscriptionRequest = {
            audioFilePath: chunk.filePath,
            model
          }
          
          const result = await this.openaiService.transcribeAudio(transcriptionRequest)
          const chunkTime = Date.now() - chunkStartTime
          
          transcriptionResults.push(result.text)
          Debug.log(`Chunk ${i + 1} completed in ${chunkTime}ms, text length: ${result.text.length} chars`)
          
          // Emit progress update
          this.emit('chunkProgress', {
            current: i + 1,
            total: chunkingResult.totalChunks,
            status: 'processing',
            estimatedTimeRemaining: AudioChunker.estimateProcessingTime(chunkingResult.totalChunks - (i + 1))
          } as ChunkProgress)
          
        } catch (error) {
          Debug.error(`Failed to transcribe chunk ${i + 1}:`, error)
          failedChunks++
          // Continue with other chunks, add placeholder
          transcriptionResults.push(`[Chunk ${i + 1} transcription failed: ${error instanceof Error ? error.message : 'Unknown error'}]`)
          
          // Check if failure rate exceeds threshold (20%)
          const failureRate = failedChunks / (i + 1)
          Debug.log(`Chunk failure rate: ${Math.round(failureRate * 100)}% (${failedChunks}/${i + 1})`)
          
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

  /**
   * Clean up original recording file after successful transcription
   */
  private async cleanupRecordingFile(filePath: string): Promise<void> {
    try {
      // Check if cleanup is enabled in settings (default: true for privacy)
      const cleanupEnabled = this.settingsManager.getCleanupRecordingFiles()
      
      if (cleanupEnabled && fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath)
        Debug.log(`Cleaned up original recording file: ${filePath}`)
      } else if (!cleanupEnabled) {
        Debug.log(`Recording file cleanup disabled, keeping: ${filePath}`)
      }
    } catch (error) {
      Debug.error(`Failed to cleanup recording file ${filePath}:`, error)
      // Don't throw - transcription was successful, cleanup failure shouldn't break the flow
    }
  }

  /**
   * Get audio processor capabilities
   */
  getAudioProcessorStatus(): {
    ffmpegAvailable: boolean
    capabilities: string[]
    limitations: string[]
  } {
    const ffmpegAvailable = AudioProcessor.isFFmpegAvailable()
    
    if (ffmpegAvailable) {
      return {
        ffmpegAvailable: true,
        capabilities: [
          'Unlimited recording time for all formats',
          'Time-based segmentation (preserves audio integrity)',
          'Automatic MP3 conversion (60%+ compression)',
          'WebM support (convert to MP3 then segment)',
          'Enhanced metadata analysis',
          'Faster processing (MP3 segments)'
        ],
        limitations: []
      }
    } else {
      return {
        ffmpegAvailable: false,
        capabilities: [
          'Unlimited recording for WAV and MP3 formats',
          'Improved byte-based segmentation (20MB chunks)',
          'Better error handling with clear user guidance',
          'Basic metadata analysis for format detection',
          'Reliable fallback processing'
        ],
        limitations: [
          'WebM files > 25MB cannot be processed',
          'No MP3 conversion (larger file sizes)',
          'Limited metadata without FFmpeg',
          'Slower processing without MP3 optimization'
        ]
      }
    }
  }
}
