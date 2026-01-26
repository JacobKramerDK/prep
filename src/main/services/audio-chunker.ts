/**
 * Server-side audio chunking service for handling large audio files
 * Splits audio files into manageable chunks for OpenAI Whisper API
 * 
 * IMPORTANT: WebM files cannot be safely chunked using byte-splitting
 * due to their container format structure. For WebM files larger than
 * the API limit, users should record shorter segments.
 */

import * as fs from 'fs'
import * as path from 'path'
import { Debug } from '../../shared/utils/debug'

export interface AudioChunkInfo {
  filePath: string
  startByte: number
  endByte: number
  index: number
  sizeBytes: number
}

export interface ChunkingResult {
  chunks: AudioChunkInfo[]
  totalChunks: number
  originalSize: number
}

export class AudioChunker {
  private static readonly CHUNK_SIZE_MB = process.env.NODE_ENV === 'test' ? 5 : 24 // 5MB for testing, 24MB for production
  private static readonly CHUNK_SIZE_BYTES = AudioChunker.CHUNK_SIZE_MB * 1024 * 1024
  private static readonly MAX_RETRIES = 3
  private static readonly RETRY_DELAY_MS = 1000

  /**
   * Check if file needs chunking based on size and format
   */
  static needsChunking(filePath: string): boolean {
    try {
      const stats = fs.statSync(filePath)
      const fileSize = stats.size
      
      Debug.log(`Checking if file needs chunking: ${filePath} (${fileSize} bytes, ${(fileSize / 1024 / 1024).toFixed(2)}MB)`)
      
      // WebM files cannot be safely chunked by byte splitting
      if (filePath.toLowerCase().endsWith('.webm')) {
        Debug.log('WebM file detected - checking size threshold')
        // For WebM files, only chunk if they're significantly larger than the limit
        // This gives users a clear error message to record shorter segments
        const needsChunking = fileSize > (AudioChunker.CHUNK_SIZE_BYTES * 1.5)
        Debug.log(`WebM chunking needed: ${needsChunking}`)
        return needsChunking
      }
      
      const needsChunking = fileSize > AudioChunker.CHUNK_SIZE_BYTES
      Debug.log(`Standard chunking needed: ${needsChunking} (threshold: ${AudioChunker.CHUNK_SIZE_MB}MB)`)
      return needsChunking
    } catch (error) {
      Debug.error('Failed to check file size:', error)
      return false
    }
  }

  /**
   * Split audio file into chunks using simple file splitting
   * Note: This method should not be used for WebM files as they cannot be safely byte-split
   */
  static async chunkAudioFile(filePath: string): Promise<ChunkingResult> {
    try {
      if (!fs.existsSync(filePath)) {
        throw new Error(`Audio file not found: ${filePath}`)
      }

      const stats = fs.statSync(filePath)
      const fileSize = stats.size

      Debug.log(`Chunking audio file: ${filePath} (${fileSize} bytes, ${(fileSize / 1024 / 1024).toFixed(2)}MB)`)

      // Check if this is a WebM file
      if (filePath.toLowerCase().endsWith('.webm')) {
        Debug.error('WebM chunking attempted - this will likely fail')
        throw new Error(
          'WebM files cannot be chunked due to container format limitations. ' +
          'Please record shorter segments (under 25MB) or use a different audio format.'
        )
      }

      if (fileSize <= AudioChunker.CHUNK_SIZE_BYTES) {
        Debug.log('File is small enough, no chunking needed')
        // No chunking needed
        return {
          chunks: [{
            filePath,
            startByte: 0,
            endByte: fileSize,
            index: 0,
            sizeBytes: fileSize
          }],
          totalChunks: 1,
          originalSize: fileSize
        }
      }

      const chunks: AudioChunkInfo[] = []
      const chunkSize = AudioChunker.CHUNK_SIZE_BYTES
      let currentByte = 0
      let chunkIndex = 0

      while (currentByte < fileSize) {
        const endByte = Math.min(currentByte + chunkSize, fileSize)
        const originalExt = path.extname(filePath)
        const baseName = path.basename(filePath, originalExt)
        const dirName = path.dirname(filePath)
        const chunkPath = path.join(dirName, `${baseName}.chunk${chunkIndex}${originalExt}`)

        // Create chunk file
        await this.createChunkFile(filePath, chunkPath, currentByte, endByte)

        chunks.push({
          filePath: chunkPath,
          startByte: currentByte,
          endByte,
          index: chunkIndex,
          sizeBytes: endByte - currentByte
        })

        Debug.log(`Created chunk ${chunkIndex}: ${chunkPath} (${endByte - currentByte} bytes, ${((endByte - currentByte) / 1024 / 1024).toFixed(2)}MB)`)

        currentByte = endByte
        chunkIndex++
      }

      Debug.log(`Successfully created ${chunks.length} chunks from ${(fileSize / 1024 / 1024).toFixed(2)}MB file`)
      return {
        chunks,
        totalChunks: chunks.length,
        originalSize: fileSize
      }
    } catch (error) {
      Debug.error('Failed to chunk audio file:', error)
      throw new Error(`Audio chunking failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Create a chunk file by copying a portion of the original file
   */
  private static async createChunkFile(
    sourcePath: string,
    chunkPath: string,
    startByte: number,
    endByte: number
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const readStream = fs.createReadStream(sourcePath, { start: startByte, end: endByte - 1 })
      const writeStream = fs.createWriteStream(chunkPath)

      readStream.on('error', reject)
      writeStream.on('error', reject)
      writeStream.on('finish', resolve)

      readStream.pipe(writeStream)
    })
  }

  /**
   * Clean up chunk files after processing
   */
  static async cleanupChunks(chunks: AudioChunkInfo[]): Promise<void> {
    for (const chunk of chunks) {
      try {
        if (chunk.filePath.includes('.chunk') && fs.existsSync(chunk.filePath)) {
          await fs.promises.unlink(chunk.filePath)
          Debug.log(`Cleaned up chunk: ${chunk.filePath}`)
        }
      } catch (error) {
        Debug.error(`Failed to cleanup chunk ${chunk.filePath}:`, error)
      }
    }
  }

  /**
   * Generate test audio files for chunking validation
   * Creates WAV files of specific sizes for testing
   */
  static async generateTestAudioFile(targetSizeMB: number, outputPath: string): Promise<void> {
    try {
      Debug.log(`Generating test audio file: ${targetSizeMB}MB at ${outputPath}`)
      
      // Create a simple WAV file with the target size
      // WAV header is 44 bytes, so we need (targetSizeMB * 1024 * 1024 - 44) bytes of audio data
      const targetBytes = targetSizeMB * 1024 * 1024
      const audioDataBytes = targetBytes - 44
      
      // Calculate approximate duration (8-bit mono at 44100 Hz)
      const sampleRate = 44100
      const bytesPerSample = 1
      const approximateDuration = audioDataBytes / (sampleRate * bytesPerSample)
      
      // Create WAV header
      const header = Buffer.alloc(44)
      
      // RIFF header
      header.write('RIFF', 0)
      header.writeUInt32LE(targetBytes - 8, 4) // File size - 8
      header.write('WAVE', 8)
      
      // fmt chunk
      header.write('fmt ', 12)
      header.writeUInt32LE(16, 16) // fmt chunk size
      header.writeUInt16LE(1, 20) // PCM format
      header.writeUInt16LE(1, 22) // Mono
      header.writeUInt32LE(sampleRate, 24) // Sample rate
      header.writeUInt32LE(sampleRate, 28) // Byte rate
      header.writeUInt16LE(1, 32) // Block align
      header.writeUInt16LE(8, 34) // Bits per sample
      
      // data chunk
      header.write('data', 36)
      header.writeUInt32LE(audioDataBytes, 40)
      
      // Write header
      await fs.promises.writeFile(outputPath, header)
      
      // Append audio data in chunks to avoid memory issues
      const chunkSize = 1024 * 1024 // 1MB chunks
      let remainingBytes = audioDataBytes
      
      while (remainingBytes > 0) {
        const currentChunkSize = Math.min(chunkSize, remainingBytes)
        const audioChunk = Buffer.alloc(currentChunkSize, 128) // Silent audio (128 = middle value for 8-bit)
        await fs.promises.appendFile(outputPath, audioChunk)
        remainingBytes -= currentChunkSize
      }
      
      Debug.log(`Generated test audio file: ${outputPath} (${(targetBytes / 1024 / 1024).toFixed(2)}MB, ~${approximateDuration.toFixed(1)}s)`)
    } catch (error) {
      Debug.error('Failed to generate test audio file:', error)
      throw error
    }
  }

  /**
   * Get estimated processing time for chunks
   */
  static estimateProcessingTime(totalChunks: number): number {
    // Rough estimate: 30 seconds per chunk for transcription
    return totalChunks * 30
  }
}
