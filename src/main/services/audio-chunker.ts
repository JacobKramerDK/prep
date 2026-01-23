/**
 * Server-side audio chunking service for handling large audio files
 * Splits audio files into manageable chunks for OpenAI Whisper API
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
  private static readonly CHUNK_SIZE_MB = 20 // Conservative limit below 25MB
  private static readonly CHUNK_SIZE_BYTES = AudioChunker.CHUNK_SIZE_MB * 1024 * 1024

  /**
   * Check if file needs chunking based on size
   */
  static needsChunking(filePath: string): boolean {
    try {
      const stats = fs.statSync(filePath)
      return stats.size > AudioChunker.CHUNK_SIZE_BYTES
    } catch (error) {
      Debug.error('Failed to check file size:', error)
      return false
    }
  }

  /**
   * Split audio file into chunks using simple file splitting
   */
  static async chunkAudioFile(filePath: string): Promise<ChunkingResult> {
    try {
      if (!fs.existsSync(filePath)) {
        throw new Error(`Audio file not found: ${filePath}`)
      }

      const stats = fs.statSync(filePath)
      const fileSize = stats.size

      Debug.log(`Chunking audio file: ${filePath} (${fileSize} bytes)`)

      if (fileSize <= AudioChunker.CHUNK_SIZE_BYTES) {
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
        const chunkPath = `${filePath}.chunk${chunkIndex}`

        // Create chunk file
        await this.createChunkFile(filePath, chunkPath, currentByte, endByte)

        chunks.push({
          filePath: chunkPath,
          startByte: currentByte,
          endByte,
          index: chunkIndex,
          sizeBytes: endByte - currentByte
        })

        Debug.log(`Created chunk ${chunkIndex}: ${chunkPath} (${endByte - currentByte} bytes)`)

        currentByte = endByte
        chunkIndex++
      }

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
   * Get estimated processing time for chunks
   */
  static estimateProcessingTime(totalChunks: number): number {
    // Rough estimate: 30 seconds per chunk for transcription
    return totalChunks * 30
  }
}
