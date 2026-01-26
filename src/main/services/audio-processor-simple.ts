/**
 * Simplified audio processor that works without FFmpeg
 * Uses improved chunking logic while maintaining compatibility
 */

import * as fs from 'fs'
import * as path from 'path'
import { Debug } from '../../shared/utils/debug'

export interface AudioSegment {
  filePath: string
  startByte: number
  endByte: number
  index: number
  sizeBytes: number
}

export interface SegmentationResult {
  segments: AudioSegment[]
  totalSegments: number
  originalSize: number
  format: string
}

export class AudioProcessor {
  private static readonly SEGMENT_SIZE_MB = 20 // Conservative size for better reliability
  private static readonly SEGMENT_SIZE_BYTES = AudioProcessor.SEGMENT_SIZE_MB * 1024 * 1024

  /**
   * Check if file needs segmentation based on size
   */
  static async needsSegmentation(filePath: string): Promise<boolean> {
    try {
      const stats = fs.statSync(filePath)
      const fileSize = stats.size
      const sizeMB = fileSize / (1024 * 1024)
      
      Debug.log(`Audio analysis: ${sizeMB.toFixed(2)}MB`)
      
      const needsSegmentation = fileSize > this.SEGMENT_SIZE_BYTES
      Debug.log(`Segmentation needed: ${needsSegmentation}`)
      
      return needsSegmentation
    } catch (error) {
      Debug.error('Failed to check segmentation need:', error)
      return false
    }
  }

  /**
   * Segment audio file using improved chunking
   * This is a fallback method that works without FFmpeg
   */
  static async segmentAudioFile(filePath: string): Promise<SegmentationResult> {
    try {
      Debug.log(`Starting audio segmentation: ${filePath}`)
      
      if (!fs.existsSync(filePath)) {
        throw new Error(`Audio file not found: ${filePath}`)
      }

      const stats = fs.statSync(filePath)
      const fileSize = stats.size

      Debug.log(`Segmenting audio file: ${filePath} (${(fileSize / 1024 / 1024).toFixed(2)}MB)`)

      // For WebM files, we still can't safely chunk - return error with helpful message
      if (filePath.toLowerCase().endsWith('.webm') && fileSize > 25 * 1024 * 1024) {
        throw new Error(
          'WebM files larger than 25MB cannot be processed. Please record shorter segments or use a different format.'
        )
      }

      if (fileSize <= this.SEGMENT_SIZE_BYTES) {
        // No segmentation needed
        return {
          segments: [{
            filePath,
            startByte: 0,
            endByte: fileSize,
            index: 0,
            sizeBytes: fileSize
          }],
          totalSegments: 1,
          originalSize: fileSize,
          format: path.extname(filePath).toLowerCase()
        }
      }

      const segments: AudioSegment[] = []
      const segmentSize = this.SEGMENT_SIZE_BYTES
      let currentByte = 0
      let segmentIndex = 0

      while (currentByte < fileSize) {
        const endByte = Math.min(currentByte + segmentSize, fileSize)
        const originalExt = path.extname(filePath)
        const baseName = path.basename(filePath, originalExt)
        const dirName = path.dirname(filePath)
        const segmentPath = path.join(dirName, `${baseName}.segment${segmentIndex}${originalExt}`)

        // Create segment file
        await this.createSegmentFile(filePath, segmentPath, currentByte, endByte)

        segments.push({
          filePath: segmentPath,
          startByte: currentByte,
          endByte,
          index: segmentIndex,
          sizeBytes: endByte - currentByte
        })

        Debug.log(`Created segment ${segmentIndex}: ${segmentPath} (${((endByte - currentByte) / 1024 / 1024).toFixed(2)}MB)`)

        currentByte = endByte
        segmentIndex++
      }

      Debug.log(`Successfully created ${segments.length} segments from ${(fileSize / 1024 / 1024).toFixed(2)}MB file`)
      
      return {
        segments,
        totalSegments: segments.length,
        originalSize: fileSize,
        format: path.extname(filePath).toLowerCase()
      }
    } catch (error) {
      Debug.error('Audio segmentation failed:', error)
      throw new Error(`Audio segmentation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Create a segment file by copying a portion of the original file
   */
  private static async createSegmentFile(
    sourcePath: string,
    segmentPath: string,
    startByte: number,
    endByte: number
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const readStream = fs.createReadStream(sourcePath, { start: startByte, end: endByte - 1 })
      const writeStream = fs.createWriteStream(segmentPath)

      readStream.on('error', reject)
      writeStream.on('error', reject)
      writeStream.on('finish', resolve)

      readStream.pipe(writeStream)
    })
  }

  /**
   * Clean up segment files
   */
  static async cleanupSegments(segments: AudioSegment[]): Promise<void> {
    for (const segment of segments) {
      try {
        if (segment.filePath.includes('.segment') && fs.existsSync(segment.filePath)) {
          await fs.promises.unlink(segment.filePath)
          Debug.log(`Cleaned up segment: ${segment.filePath}`)
        }
      } catch (error) {
        Debug.error(`Failed to cleanup segment ${segment.filePath}:`, error)
      }
    }
  }

  /**
   * Get estimated processing time for segments
   */
  static estimateProcessingTime(totalSegments: number): number {
    // Rough estimate: 25 seconds per segment
    return totalSegments * 25
  }

  /**
   * Convert to MP3 - placeholder for future FFmpeg integration
   */
  static async convertToMP3(inputPath: string, outputPath?: string): Promise<string> {
    // For now, just return the original path
    // This will be implemented when FFmpeg is properly integrated
    Debug.log('MP3 conversion not available without FFmpeg, using original file')
    return inputPath
  }

  /**
   * Get audio metadata - placeholder for future FFmpeg integration
   */
  static async getAudioMetadata(filePath: string): Promise<{
    duration: number
    format: string
    size: number
    bitrate?: number
  }> {
    const stats = fs.statSync(filePath)
    const ext = path.extname(filePath).toLowerCase()
    
    return {
      duration: 0, // Unknown without FFmpeg
      format: ext.substring(1),
      size: stats.size,
      bitrate: undefined
    }
  }
}
