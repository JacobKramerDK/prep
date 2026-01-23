import { AudioRecordingService } from './audio-recording-service'
import { OpenAIService } from './openai-service'
import { SettingsManager } from './settings-manager'
import { TranscriptionRequest, TranscriptionResult, TranscriptionStatus } from '../../shared/types/transcription'
import { Debug } from '../../shared/utils/debug'

export class TranscriptionService {
  private audioService: AudioRecordingService
  private openaiService: OpenAIService
  private settingsManager: SettingsManager

  constructor(audioService: AudioRecordingService, openaiService: OpenAIService) {
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
      const transcriptionRequest: TranscriptionRequest = {
        audioFilePath: recordingState.filePath,
        model: transcriptionModel
      }

      const result = await this.openaiService.transcribeAudio(transcriptionRequest)
      Debug.log('Transcription completed:', result.id)
      
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
    try {
      const transcriptionModel = model || this.settingsManager.getTranscriptionModel()
      const transcriptionRequest: TranscriptionRequest = {
        audioFilePath: filePath,
        model: transcriptionModel
      }

      return await this.openaiService.transcribeAudio(transcriptionRequest)
    } catch (error) {
      Debug.error('Failed to transcribe file:', error)
      throw error
    }
  }

  async cleanup(): Promise<void> {
    await this.audioService.cleanup()
  }
}
