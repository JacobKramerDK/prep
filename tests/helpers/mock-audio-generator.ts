/**
 * Mock audio generator for testing chunked transcription functionality
 * Creates synthetic WAV files with realistic file sizes for testing
 */

import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'

export interface MockAudioOptions {
  durationSeconds: number
  sampleRate: number
  channels: number
  bitDepth: number
}

export class MockAudioGenerator {
  private static readonly DEFAULT_OPTIONS: MockAudioOptions = {
    durationSeconds: 60,
    sampleRate: 16000,
    channels: 1,
    bitDepth: 16
  }

  /**
   * Generate a synthetic WAV file for testing
   */
  static async generateWavFile(
    filePath: string,
    options: Partial<MockAudioOptions> = {}
  ): Promise<string> {
    const opts = { ...this.DEFAULT_OPTIONS, ...options }
    
    const numSamples = opts.durationSeconds * opts.sampleRate
    const bytesPerSample = opts.bitDepth / 8
    const dataSize = numSamples * opts.channels * bytesPerSample
    const fileSize = 44 + dataSize // WAV header is 44 bytes
    
    // Create WAV file buffer
    const buffer = Buffer.alloc(fileSize)
    let offset = 0
    
    // WAV header
    buffer.write('RIFF', offset); offset += 4
    buffer.writeUInt32LE(fileSize - 8, offset); offset += 4
    buffer.write('WAVE', offset); offset += 4
    buffer.write('fmt ', offset); offset += 4
    buffer.writeUInt32LE(16, offset); offset += 4 // PCM format chunk size
    buffer.writeUInt16LE(1, offset); offset += 2 // PCM format
    buffer.writeUInt16LE(opts.channels, offset); offset += 2
    buffer.writeUInt32LE(opts.sampleRate, offset); offset += 4
    buffer.writeUInt32LE(opts.sampleRate * opts.channels * bytesPerSample, offset); offset += 4
    buffer.writeUInt16LE(opts.channels * bytesPerSample, offset); offset += 2
    buffer.writeUInt16LE(opts.bitDepth, offset); offset += 2
    buffer.write('data', offset); offset += 4
    buffer.writeUInt32LE(dataSize, offset); offset += 4
    
    // Generate simple sine wave audio data
    for (let i = 0; i < numSamples; i++) {
      const sample = Math.sin(2 * Math.PI * 440 * i / opts.sampleRate) // 440Hz tone
      const intSample = Math.round(sample * 32767) // Convert to 16-bit integer
      
      for (let channel = 0; channel < opts.channels; channel++) {
        buffer.writeInt16LE(intSample, offset)
        offset += 2
      }
    }
    
    // Write file
    await fs.promises.writeFile(filePath, buffer)
    
    return filePath
  }

  /**
   * Generate a large audio file that will require chunking (>25MB)
   */
  static async generateLargeAudioFile(filePath?: string): Promise<string> {
    const tempDir = os.tmpdir()
    const fileName = filePath || path.join(tempDir, `large-audio-${Date.now()}.wav`)
    
    // Generate 30 minutes of audio (~50MB)
    return await this.generateWavFile(fileName, {
      durationSeconds: 1800, // 30 minutes
      sampleRate: 16000,
      channels: 1,
      bitDepth: 16
    })
  }

  /**
   * Generate a small audio file that won't require chunking (<25MB)
   */
  static async generateSmallAudioFile(filePath?: string): Promise<string> {
    const tempDir = os.tmpdir()
    const fileName = filePath || path.join(tempDir, `small-audio-${Date.now()}.wav`)
    
    // Generate 5 minutes of audio (~10MB)
    return await this.generateWavFile(fileName, {
      durationSeconds: 300, // 5 minutes
      sampleRate: 16000,
      channels: 1,
      bitDepth: 16
    })
  }

  /**
   * Generate multiple test files for various scenarios
   */
  static async generateTestFiles(): Promise<{
    small: string
    large: string
    medium: string
  }> {
    const tempDir = os.tmpdir()
    const timestamp = Date.now()
    
    const [small, large, medium] = await Promise.all([
      this.generateSmallAudioFile(path.join(tempDir, `test-small-${timestamp}.wav`)),
      this.generateLargeAudioFile(path.join(tempDir, `test-large-${timestamp}.wav`)),
      this.generateWavFile(path.join(tempDir, `test-medium-${timestamp}.wav`), {
        durationSeconds: 900, // 15 minutes (~25MB)
        sampleRate: 16000,
        channels: 1,
        bitDepth: 16
      })
    ])
    
    return { small, large, medium }
  }

  /**
   * Clean up generated test files
   */
  static async cleanupTestFiles(filePaths: string[]): Promise<void> {
    for (const filePath of filePaths) {
      try {
        if (fs.existsSync(filePath)) {
          await fs.promises.unlink(filePath)
        }
      } catch (error) {
        console.warn(`Failed to cleanup test file ${filePath}:`, error)
      }
    }
  }

  /**
   * Get file size in MB
   */
  static async getFileSizeMB(filePath: string): Promise<number> {
    const stats = await fs.promises.stat(filePath)
    return stats.size / (1024 * 1024)
  }

  /**
   * Validate that a file is a proper WAV file
   */
  static async validateWavFile(filePath: string): Promise<boolean> {
    try {
      const buffer = await fs.promises.readFile(filePath, { encoding: null })
      
      // Check WAV header
      const riffHeader = buffer.toString('ascii', 0, 4)
      const waveHeader = buffer.toString('ascii', 8, 12)
      
      return riffHeader === 'RIFF' && waveHeader === 'WAVE'
    } catch (error) {
      return false
    }
  }
}
