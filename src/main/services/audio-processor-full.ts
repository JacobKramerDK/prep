/**
 * Full-featured audio processor with FFmpeg integration
 * Provides time-based segmentation and format conversion for unlimited recording
 */

import * as fs from 'fs'
import * as path from 'path'
import { spawn } from 'child_process'
import { Debug } from '../../shared/utils/debug'

export interface AudioSegment {
  filePath: string
  startTime: number // seconds
  duration: number // seconds
  index: number
  sizeBytes: number
}

export interface SegmentationResult {
  segments: AudioSegment[]
  totalSegments: number
  originalDuration: number
  originalSize: number
  format: string
}

export interface AudioMetadata {
  duration: number
  format: string
  size: number
  bitrate?: number
  sampleRate?: number
  channels?: number
}

export class AudioProcessor {
  private static readonly SEGMENT_DURATION_SECONDS = 600 // 10 minutes per segment
  private static readonly MAX_FILE_SIZE_MB = 24 // Just under 25MB OpenAI limit
  private static ffmpegPath: string | null = null

  // Configurable audio conversion parameters
  private static readonly AUDIO_PARAMS = {
    bitrate: process.env.AUDIO_BITRATE || '128k',
    channels: process.env.AUDIO_CHANNELS || '1',
    sampleRate: process.env.AUDIO_SAMPLE_RATE || '44100'
  }

  /**
   * Initialize FFmpeg path
   */
  static async initialize(): Promise<boolean> {
    try {
      // Try ffmpeg-static first with proper error handling
      try {
        const ffmpegStatic = require('ffmpeg-static')
        if (ffmpegStatic && typeof ffmpegStatic === 'string') {
          this.ffmpegPath = ffmpegStatic
          Debug.log('Using ffmpeg-static:', this.ffmpegPath)
          return true
        }
      } catch (requireError) {
        Debug.log('ffmpeg-static module not available:', requireError instanceof Error ? requireError.message : 'Unknown error')
      }
    } catch (error) {
      Debug.log('ffmpeg-static not available, trying system ffmpeg')
    }

    // Try system ffmpeg
    try {
      const result = await this.runCommand('ffmpeg', ['-version'])
      if (result.success) {
        this.ffmpegPath = 'ffmpeg'
        Debug.log('Using system ffmpeg')
        return true
      }
    } catch (error) {
      Debug.log('System ffmpeg not available')
    }

    Debug.log('FFmpeg not available - falling back to basic segmentation')
    return false
  }

  /**
   * Check if FFmpeg is available
   */
  static isFFmpegAvailable(): boolean {
    return this.ffmpegPath !== null
  }

  /**
   * Run FFmpeg command with argument validation
   */
  private static async runCommand(command: string, args: string[]): Promise<{
    success: boolean
    stdout: string
    stderr: string
  }> {
    return new Promise((resolve) => {
      // Validate command is one of the allowed FFmpeg commands
      const allowedCommands = ['ffmpeg', 'ffprobe']
      const commandName = path.basename(command)
      if (!allowedCommands.includes(commandName) && !command.includes('ffmpeg')) {
        resolve({
          success: false,
          stdout: '',
          stderr: 'Invalid command: only FFmpeg commands are allowed'
        })
        return
      }

      // Validate arguments don't contain dangerous patterns
      const dangerousPatterns = [';', '&&', '||', '|', '`', '$', '>', '<', '&']
      for (const arg of args) {
        if (dangerousPatterns.some(pattern => arg.includes(pattern))) {
          resolve({
            success: false,
            stdout: '',
            stderr: `Dangerous pattern detected in argument: ${arg}`
          })
          return
        }
      }

      const process = spawn(command, args, { shell: false }) // Disable shell to prevent injection
      let stdout = ''
      let stderr = ''

      process.stdout?.on('data', (data) => {
        stdout += data.toString()
      })

      process.stderr?.on('data', (data) => {
        stderr += data.toString()
      })

      process.on('close', (code) => {
        resolve({
          success: code === 0,
          stdout,
          stderr
        })
      })

      process.on('error', (error) => {
        resolve({
          success: false,
          stdout,
          stderr: error.message
        })
      })
    })
  }

  /**
   * Get audio file metadata using FFprobe
   */
  static async getAudioMetadata(filePath: string): Promise<AudioMetadata> {
    if (!this.isFFmpegAvailable()) {
      // Fallback to basic metadata
      const stats = fs.statSync(filePath)
      return {
        duration: 0,
        format: path.extname(filePath).substring(1),
        size: stats.size
      }
    }

    // Try multiple ffprobe paths
    const possiblePaths = [
      'ffprobe',
      this.ffmpegPath!.replace('ffmpeg', 'ffprobe'),
      this.ffmpegPath!.replace(/ffmpeg$/, 'ffprobe')
    ]

    for (const ffprobePath of possiblePaths) {
      try {
        const result = await this.runCommand(ffprobePath, [
          '-v', 'quiet',
          '-print_format', 'json',
          '-show_format',
          '-show_streams',
          filePath
        ])

        if (result.success && result.stdout.trim()) {
          const metadata = JSON.parse(result.stdout)
          const audioStream = metadata.streams?.find((s: any) => s.codec_type === 'audio')
          const stats = fs.statSync(filePath)

          return {
            duration: parseFloat(metadata.format?.duration || '0'),
            format: metadata.format?.format_name || 'unknown',
            size: stats.size,
            bitrate: audioStream?.bit_rate ? parseInt(audioStream.bit_rate) : undefined,
            sampleRate: audioStream?.sample_rate ? parseInt(audioStream.sample_rate) : undefined,
            channels: audioStream?.channels || undefined
          }
        }
      } catch (error) {
        Debug.log(`Failed to use ${ffprobePath}:`, error)
        continue
      }
    }

    // Fallback to basic metadata if ffprobe fails
    Debug.log('FFprobe not available, using basic metadata')
    const stats = fs.statSync(filePath)
    return {
      duration: 0,
      format: path.extname(filePath).substring(1),
      size: stats.size
    }
  }

  /**
   * Convert audio file to MP3 format
   */
  static async convertToMP3(inputPath: string, outputPath?: string): Promise<string> {
    if (!this.isFFmpegAvailable()) {
      Debug.log('FFmpeg not available, skipping conversion')
      return inputPath
    }

    const finalOutputPath = outputPath || inputPath.replace(path.extname(inputPath), '.mp3')
    
    Debug.log(`Converting to MP3: ${inputPath} -> ${finalOutputPath}`)
    
    const result = await this.runCommand(this.ffmpegPath!, [
      '-i', inputPath,
      '-acodec', 'libmp3lame',
      '-ab', this.AUDIO_PARAMS.bitrate,
      '-ac', this.AUDIO_PARAMS.channels,
      '-ar', this.AUDIO_PARAMS.sampleRate,
      '-y', // Overwrite output file
      finalOutputPath
    ])

    if (!result.success) {
      throw new Error(`Audio conversion failed: ${result.stderr}`)
    }

    Debug.log(`Conversion completed: ${finalOutputPath}`)
    return finalOutputPath
  }

  /**
   * Check if file needs segmentation
   */
  static async needsSegmentation(filePath: string): Promise<boolean> {
    try {
      const metadata = await this.getAudioMetadata(filePath)
      const sizeMB = metadata.size / (1024 * 1024)
      
      Debug.log(`Audio analysis: ${metadata.duration}s, ${sizeMB.toFixed(2)}MB, format: ${metadata.format}`)
      
      // Need segmentation if file is too large OR too long (if duration is available)
      const tooLarge = sizeMB > this.MAX_FILE_SIZE_MB
      const tooLong = metadata.duration > 0 && metadata.duration > this.SEGMENT_DURATION_SECONDS
      const needsSegmentation = tooLarge || tooLong
      
      Debug.log(`Segmentation needed: ${needsSegmentation} (size: ${tooLarge}, duration: ${tooLong})`)
      return needsSegmentation
    } catch (error) {
      Debug.error('Failed to check segmentation need:', error)
      // Fallback to size-based check
      const stats = fs.statSync(filePath)
      return stats.size > this.MAX_FILE_SIZE_MB * 1024 * 1024
    }
  }

  /**
   * Segment audio file using time-based splitting
   */
  static async segmentAudioFile(filePath: string): Promise<SegmentationResult> {
    try {
      Debug.log(`Starting audio segmentation: ${filePath}`)
      
      // Get metadata first
      const metadata = await this.getAudioMetadata(filePath)
      const totalDuration = metadata.duration
      
      if (totalDuration <= this.SEGMENT_DURATION_SECONDS && metadata.size <= this.MAX_FILE_SIZE_MB * 1024 * 1024) {
        // No segmentation needed
        return {
          segments: [{
            filePath,
            startTime: 0,
            duration: totalDuration,
            index: 0,
            sizeBytes: metadata.size
          }],
          totalSegments: 1,
          originalDuration: totalDuration,
          originalSize: metadata.size,
          format: 'original'
        }
      }

      // Convert to MP3 first if not already MP3 and FFmpeg is available
      let workingFile = filePath
      if (this.isFFmpegAvailable() && !filePath.toLowerCase().endsWith('.mp3')) {
        const mp3Path = filePath.replace(path.extname(filePath), '.converted.mp3')
        workingFile = await this.convertToMP3(filePath, mp3Path)
        Debug.log(`Converted to MP3 for segmentation: ${workingFile}`)
      }

      // Use time-based segmentation if FFmpeg is available
      if (this.isFFmpegAvailable()) {
        // If duration is unknown (0), estimate based on file size for segmentation
        const effectiveDuration = totalDuration > 0 ? totalDuration : this.estimateDurationFromSize(metadata.size)
        return await this.createTimeBasedSegments(workingFile, effectiveDuration)
      } else {
        // Fallback to improved byte-based segmentation
        return await this.createByteBasedSegments(workingFile)
      }
    } catch (error) {
      Debug.error('Audio segmentation failed:', error)
      throw new Error(`Audio segmentation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Estimate audio duration from file size when metadata is unavailable
   * Uses conservative estimate for WebM/MP3 files
   */
  private static estimateDurationFromSize(sizeBytes: number): number {
    // Conservative estimate: ~1MB per minute for compressed audio
    // This ensures we create enough segments rather than too few
    const estimatedMinutes = sizeBytes / (1024 * 1024)
    const estimatedSeconds = estimatedMinutes * 60
    
    Debug.log(`Estimating duration from file size: ${(sizeBytes / 1024 / 1024).toFixed(2)}MB → ~${estimatedSeconds.toFixed(0)}s`)
    
    return Math.max(estimatedSeconds, this.SEGMENT_DURATION_SECONDS) // At least one segment
  }

  /**
   * Create time-based segments using FFmpeg
   */
  private static async createTimeBasedSegments(filePath: string, totalDuration: number): Promise<SegmentationResult> {
    const segmentDuration = this.SEGMENT_DURATION_SECONDS
    const totalSegments = Math.ceil(totalDuration / segmentDuration)
    const segments: AudioSegment[] = []

    Debug.log(`Creating ${totalSegments} time-based segments of ${segmentDuration}s each`)

    for (let i = 0; i < totalSegments; i++) {
      const startTime = i * segmentDuration
      const duration = Math.min(segmentDuration, totalDuration - startTime)
      const segmentPath = this.generateSegmentPath(filePath, i)
      
      const result = await this.runCommand(this.ffmpegPath!, [
        '-i', filePath,
        '-ss', startTime.toString(),
        '-t', duration.toString(),
        '-acodec', 'libmp3lame',
        '-ab', this.AUDIO_PARAMS.bitrate,
        '-ac', this.AUDIO_PARAMS.channels,
        '-y',
        segmentPath
      ])

      if (!result.success) {
        throw new Error(`Failed to create segment ${i}: ${result.stderr}`)
      }

      const segmentStats = fs.statSync(segmentPath)
      
      segments.push({
        filePath: segmentPath,
        startTime,
        duration,
        index: i,
        sizeBytes: segmentStats.size
      })

      Debug.log(`Created segment ${i + 1}/${totalSegments}: ${duration.toFixed(1)}s, ${(segmentStats.size / 1024 / 1024).toFixed(2)}MB`)
    }

    const originalStats = fs.statSync(filePath)
    
    return {
      segments,
      totalSegments: segments.length,
      originalDuration: totalDuration,
      originalSize: originalStats.size,
      format: 'mp3'
    }
  }

  /**
   * Create byte-based segments (fallback when FFmpeg not available)
   */
  private static async createByteBasedSegments(filePath: string): Promise<SegmentationResult> {
    const stats = fs.statSync(filePath)
    const fileSize = stats.size
    const segmentSize = 20 * 1024 * 1024 // 20MB segments
    const totalSegments = Math.ceil(fileSize / segmentSize)
    const segments: AudioSegment[] = []

    Debug.log(`Creating ${totalSegments} byte-based segments of 20MB each (FFmpeg fallback)`)

    for (let i = 0; i < totalSegments; i++) {
      const startByte = i * segmentSize
      const endByte = Math.min(startByte + segmentSize, fileSize)
      const segmentPath = this.generateSegmentPath(filePath, i)

      await this.createByteSegment(filePath, segmentPath, startByte, endByte)

      segments.push({
        filePath: segmentPath,
        startTime: 0, // Unknown without FFmpeg
        duration: 0, // Unknown without FFmpeg
        index: i,
        sizeBytes: endByte - startByte
      })

      Debug.log(`Created segment ${i + 1}/${totalSegments}: ${((endByte - startByte) / 1024 / 1024).toFixed(2)}MB`)
    }

    return {
      segments,
      totalSegments: segments.length,
      originalDuration: 0, // Unknown without FFmpeg
      originalSize: fileSize,
      format: path.extname(filePath).substring(1)
    }
  }

  /**
   * Create byte-based segment
   */
  private static async createByteSegment(
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
   * Generate segment file path
   */
  private static generateSegmentPath(originalPath: string, index: number): string {
    const ext = this.isFFmpegAvailable() ? '.mp3' : path.extname(originalPath)
    const baseName = path.basename(originalPath, path.extname(originalPath))
    const dirName = path.dirname(originalPath)
    return path.join(dirName, `${baseName}.segment${index}${ext}`)
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
    // MP3 segments process faster than WAV
    return totalSegments * (this.isFFmpegAvailable() ? 15 : 25)
  }
}
