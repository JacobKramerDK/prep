/**
 * Client-side audio chunking utility for handling large audio files
 * Uses Web Audio API to split audio into manageable chunks for OpenAI Whisper API
 */

export interface AudioChunk {
  data: ArrayBuffer
  startTime: number
  endTime: number
  index: number
}

export interface ChunkingOptions {
  chunkDurationSeconds: number
  overlapSeconds: number
  sampleRate: number
}

export class AudioChunker {
  private static readonly DEFAULT_OPTIONS: ChunkingOptions = {
    chunkDurationSeconds: 600, // 10 minutes
    overlapSeconds: 30, // 30 seconds overlap
    sampleRate: 16000
  }

  /**
   * Chunk audio data using Web Audio API
   */
  static async chunkAudioBuffer(
    audioBuffer: ArrayBuffer,
    options: Partial<ChunkingOptions> = {}
  ): Promise<AudioChunk[]> {
    const opts = { ...this.DEFAULT_OPTIONS, ...options }
    
    // Create audio context
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    
    try {
      // Decode audio data
      const decodedBuffer = await audioContext.decodeAudioData(audioBuffer.slice(0))
      
      const chunks: AudioChunk[] = []
      const totalDuration = decodedBuffer.duration
      const chunkDuration = opts.chunkDurationSeconds
      const overlap = opts.overlapSeconds
      
      let currentTime = 0
      let chunkIndex = 0
      
      while (currentTime < totalDuration) {
        const startTime = Math.max(0, currentTime - (chunkIndex > 0 ? overlap : 0))
        const endTime = Math.min(totalDuration, currentTime + chunkDuration)
        
        // Extract chunk
        const chunkBuffer = this.extractAudioChunk(decodedBuffer, startTime, endTime, audioContext)
        const chunkArrayBuffer = await this.audioBufferToArrayBuffer(chunkBuffer, audioContext)
        
        chunks.push({
          data: chunkArrayBuffer,
          startTime,
          endTime,
          index: chunkIndex
        })
        
        currentTime += chunkDuration
        chunkIndex++
      }
      
      return chunks
    } catch (error) {
      throw new Error(`Failed to chunk audio: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      // Always clean up AudioContext
      await audioContext.close()
    }
  }

  /**
   * Extract a specific time range from an AudioBuffer
   */
  private static extractAudioChunk(
    sourceBuffer: AudioBuffer,
    startTime: number,
    endTime: number,
    audioContext: AudioContext
  ): AudioBuffer {
    const sampleRate = sourceBuffer.sampleRate
    const startSample = Math.floor(startTime * sampleRate)
    const endSample = Math.floor(endTime * sampleRate)
    const chunkLength = endSample - startSample
    
    // Create new buffer for chunk
    const chunkBuffer = audioContext.createBuffer(
      sourceBuffer.numberOfChannels,
      chunkLength,
      sampleRate
    )
    
    // Copy audio data
    for (let channel = 0; channel < sourceBuffer.numberOfChannels; channel++) {
      const sourceData = sourceBuffer.getChannelData(channel)
      const chunkData = chunkBuffer.getChannelData(channel)
      
      for (let i = 0; i < chunkLength; i++) {
        chunkData[i] = sourceData[startSample + i] || 0
      }
    }
    
    return chunkBuffer
  }

  /**
   * Convert AudioBuffer to ArrayBuffer (WAV format)
   */
  private static async audioBufferToArrayBuffer(
    audioBuffer: AudioBuffer,
    audioContext: AudioContext
  ): Promise<ArrayBuffer> {
    // Simple WAV encoding
    const length = audioBuffer.length
    const numberOfChannels = audioBuffer.numberOfChannels
    const sampleRate = audioBuffer.sampleRate
    const bytesPerSample = 2 // 16-bit
    
    const buffer = new ArrayBuffer(44 + length * numberOfChannels * bytesPerSample)
    const view = new DataView(buffer)
    
    // WAV header
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i))
      }
    }
    
    writeString(0, 'RIFF')
    view.setUint32(4, 36 + length * numberOfChannels * bytesPerSample, true)
    writeString(8, 'WAVE')
    writeString(12, 'fmt ')
    view.setUint32(16, 16, true)
    view.setUint16(20, 1, true)
    view.setUint16(22, numberOfChannels, true)
    view.setUint32(24, sampleRate, true)
    view.setUint32(28, sampleRate * numberOfChannels * bytesPerSample, true)
    view.setUint16(32, numberOfChannels * bytesPerSample, true)
    view.setUint16(34, 16, true)
    writeString(36, 'data')
    view.setUint32(40, length * numberOfChannels * bytesPerSample, true)
    
    // Convert audio data
    let offset = 44
    for (let i = 0; i < length; i++) {
      for (let channel = 0; channel < numberOfChannels; channel++) {
        const sample = Math.max(-1, Math.min(1, audioBuffer.getChannelData(channel)[i]))
        view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true)
        offset += 2
      }
    }
    
    return buffer
  }

  /**
   * Estimate if audio needs chunking based on size
   */
  static needsChunking(audioSizeBytes: number): boolean {
    const maxSizeMB = 20 // Conservative limit below 25MB
    return audioSizeBytes > (maxSizeMB * 1024 * 1024)
  }
}
