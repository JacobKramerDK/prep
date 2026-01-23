import * as fs from 'fs'
import * as path from 'path'
import { app } from 'electron'
import { AudioRecordingState } from '../../shared/types/transcription'
import { Debug } from '../../shared/utils/debug'

export class AudioRecordingService {
  private isRecording = false
  private recordingStartTime?: Date
  private currentFilePath?: string
  private audioChunks: Buffer[] = []

  constructor() {
    // Initialize service
  }

  async startRecording(): Promise<AudioRecordingState> {
    if (this.isRecording) {
      throw new Error('Recording is already in progress')
    }

    try {
      // Generate unique filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const fileName = `recording_${timestamp}.wav`
      const recordingsDir = path.join(app.getPath('userData'), 'recordings')
      
      // Ensure recordings directory exists
      if (!fs.existsSync(recordingsDir)) {
        fs.mkdirSync(recordingsDir, { recursive: true })
      }
      
      this.currentFilePath = path.join(recordingsDir, fileName)
      this.recordingStartTime = new Date()
      this.audioChunks = []
      this.isRecording = true

      Debug.log('Started audio recording:', this.currentFilePath)

      return {
        isRecording: true,
        startTime: this.recordingStartTime,
        filePath: this.currentFilePath
      }
    } catch (error) {
      this.isRecording = false
      this.currentFilePath = undefined
      this.recordingStartTime = undefined
      Debug.error('Failed to start recording:', error)
      throw new Error(`Failed to start recording: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  addAudioData(audioData: ArrayBuffer): void {
    if (this.isRecording) {
      const buffer = Buffer.from(audioData)
      Debug.log(`Received audio data: ${buffer.length} bytes, first 4 bytes: ${buffer.toString('hex', 0, Math.min(4, buffer.length))}`)
      this.audioChunks.push(buffer)
    }
  }

  async stopRecording(): Promise<AudioRecordingState> {
    if (!this.isRecording) {
      throw new Error('No recording in progress')
    }

    try {
      let filePath = this.currentFilePath!
      
      // Create audio file from chunks
      await this.createWavFile(filePath, this.audioChunks)
      
      // Use the updated file path (might have changed from .wav to .webm)
      filePath = this.currentFilePath!
      
      // Reset state
      this.isRecording = false
      this.recordingStartTime = undefined
      const finalPath = this.currentFilePath
      this.currentFilePath = undefined
      this.audioChunks = []

      Debug.log('Stopped audio recording:', finalPath)

      return {
        isRecording: false,
        filePath: finalPath
      }
    } catch (error) {
      Debug.error('Failed to stop recording:', error)
      throw new Error(`Failed to stop recording: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  private async createWavFile(filePath: string, audioChunks: Buffer[]): Promise<void> {
    Debug.log(`Creating audio file with ${audioChunks.length} chunks`)
    
    if (audioChunks.length === 0) {
      Debug.log('No audio chunks received')
      this.createSilentWavFile(filePath)
      return
    }

    const combinedData = Buffer.concat(audioChunks)
    Debug.log(`Combined audio data: ${combinedData.length} bytes, first 8 bytes: ${combinedData.toString('hex', 0, Math.min(8, combinedData.length))}`)
    
    // Enhanced WebM validation - check magic bytes and minimum file structure
    if (this.isValidWebMFile(combinedData)) {
      Debug.log('Saving WebM data directly (Whisper supports WebM)')
      const webmPath = filePath.replace('.wav', '.webm')
      fs.writeFileSync(webmPath, combinedData)
      
      // Update the file path to point to the WebM file
      this.currentFilePath = webmPath
      Debug.log(`Saved WebM file: ${webmPath}`)
    } else {
      Debug.log('Processing as raw PCM data')
      this.createWavFromPCM(combinedData, filePath)
    }
  }

  private isValidWebMFile(data: Buffer): boolean {
    // Check minimum file size
    if (data.length < 32) return false
    
    // Check WebM magic bytes (EBML header)
    if (data.toString('hex', 0, 4) !== '1a45dfa3') return false
    
    // Additional basic structure validation - look for WebM signature
    const dataStr = data.toString('hex')
    const hasWebMSignature = dataStr.includes('7765626d') // 'webm' in hex
    
    return hasWebMSignature
  }

  private createWavFromPCM(pcmData: Buffer, filePath: string): void {
    const sampleRate = 16000
    const channels = 1
    const bitsPerSample = 16
    
    const buffer = Buffer.alloc(44 + pcmData.length)
    this.writeWavHeader(buffer, sampleRate, channels, bitsPerSample, pcmData.length)
    pcmData.copy(buffer, 44)
    
    fs.writeFileSync(filePath, buffer)
  }

  private createSilentWavFile(filePath: string): void {
    const sampleRate = 16000
    const channels = 1
    const bitsPerSample = 16
    const duration = 1
    const numSamples = sampleRate * duration
    const dataSize = numSamples * channels * (bitsPerSample / 8)
    
    const buffer = Buffer.alloc(44 + dataSize)
    this.writeWavHeader(buffer, sampleRate, channels, bitsPerSample, dataSize)
    buffer.fill(0, 44)
    
    fs.writeFileSync(filePath, buffer)
  }

  private writeWavHeader(buffer: Buffer, sampleRate: number, channels: number, bitsPerSample: number, dataSize: number): void {
    buffer.write('RIFF', 0)
    buffer.writeUInt32LE(36 + dataSize, 4)
    buffer.write('WAVE', 8)
    buffer.write('fmt ', 12)
    buffer.writeUInt32LE(16, 16)
    buffer.writeUInt16LE(1, 20)
    buffer.writeUInt16LE(channels, 22)
    buffer.writeUInt32LE(sampleRate, 24)
    buffer.writeUInt32LE(sampleRate * channels * (bitsPerSample / 8), 28)
    buffer.writeUInt16LE(channels * (bitsPerSample / 8), 32)
    buffer.writeUInt16LE(bitsPerSample, 34)
    buffer.write('data', 36)
    buffer.writeUInt32LE(dataSize, 40)
  }

  private createTestWavFile(filePath: string): void {
    // Create a test WAV file with spoken content for debugging
    const sampleRate = 16000
    const channels = 1
    const bitsPerSample = 16
    const duration = 3
    const numSamples = sampleRate * duration
    const dataSize = numSamples * channels * (bitsPerSample / 8)
    
    const buffer = Buffer.alloc(44 + dataSize)
    this.writeWavHeader(buffer, sampleRate, channels, bitsPerSample, dataSize)
    
    // Generate a more complex test signal that sounds like speech
    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate
      // Mix multiple frequencies to simulate speech-like content
      const sample = (
        Math.sin(2 * Math.PI * 300 * t) * 0.3 +
        Math.sin(2 * Math.PI * 800 * t) * 0.2 +
        Math.sin(2 * Math.PI * 1200 * t) * 0.1
      ) * 16000
      buffer.writeInt16LE(Math.round(sample), 44 + i * 2)
    }
    
    fs.writeFileSync(filePath, buffer)
  }

  getRecordingState(): AudioRecordingState {
    return {
      isRecording: this.isRecording,
      startTime: this.recordingStartTime,
      filePath: this.currentFilePath
    }
  }

  async cleanup(): Promise<void> {
    if (this.isRecording) {
      await this.stopRecording()
    }
  }
}
