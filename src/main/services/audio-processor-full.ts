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

  // Configurable WebM bitrate estimation (in bps)
  private static readonly WEBM_BITRATE_ESTIMATES = {
    mono: parseInt(process.env.WEBM_MONO_BITRATE || '48000'),
    stereo: parseInt(process.env.WEBM_STEREO_BITRATE || '96000')
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
      Debug.log('FFmpeg not available, using basic metadata')
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
        Debug.log(`Trying FFprobe: ${ffprobePath}`)
        const result = await this.runCommand(ffprobePath, [
          '-v', 'quiet',
          '-print_format', 'json',
          '-show_format',
          '-show_streams',
          filePath
        ])

        Debug.log(`FFprobe result - success: ${result.success}, stdout length: ${result.stdout.length}, stderr: ${result.stderr}`)

        if (result.success && result.stdout.trim()) {
          try {
            const metadata = JSON.parse(result.stdout)
            Debug.log('FFprobe metadata parsed successfully')
            
            const audioStream = metadata.streams?.find((s: any) => s.codec_type === 'audio')
            const stats = fs.statSync(filePath)

            // Try multiple duration sources
            let duration = 0
            if (metadata.format?.duration) {
              duration = parseFloat(metadata.format.duration)
              Debug.log(`Duration from format: ${duration}s`)
            } else if (audioStream?.duration) {
              duration = parseFloat(audioStream.duration)
              Debug.log(`Duration from audio stream: ${duration}s`)
            } else {
              // Try additional duration sources for WebM/container formats
              if (metadata.format?.tags?.DURATION) {
                const durationStr = metadata.format.tags.DURATION
                Debug.log(`Found DURATION tag: ${durationStr}`)
                // Validate input length to prevent ReDoS attacks
                if (durationStr.length > 50) {
                  Debug.log('DURATION tag too long, skipping regex parsing')
                } else {
                  // Parse duration strings like "00:21:14.735000000"
                  const match = durationStr.match(/(\d+):(\d+):(\d+)\.?(\d+)?/)
                  if (match) {
                    const hours = parseInt(match[1])
                    const minutes = parseInt(match[2])
                    const seconds = parseInt(match[3])
                    const milliseconds = match[4] ? parseInt(match[4].substring(0, Math.min(3, match[4].length))) : 0
                    duration = hours * 3600 + minutes * 60 + seconds + milliseconds / 1000
                    Debug.log(`Parsed duration from tag: ${duration}s`)
                  }
                }
              }
              
              // Try calculating from bitrate and size
              if (duration === 0 && audioStream?.bit_rate && metadata.format?.size) {
                const bitrate = parseInt(audioStream.bit_rate)
                const sizeBytes = parseInt(metadata.format.size)
                if (!isNaN(bitrate) && !isNaN(sizeBytes) && bitrate > 0 && sizeBytes > 0) {
                  duration = (sizeBytes * 8) / bitrate
                  Debug.log(`Calculated duration from bitrate: ${duration}s (${bitrate} bps, ${sizeBytes} bytes)`)
                } else {
                  Debug.log('Invalid bitrate or size values, skipping bitrate calculation')
                }
              }
              
              // For WebM files without duration, estimate from file size and codec
              if (duration === 0 && metadata.format?.format_name?.includes('webm') && metadata.format?.size) {
                const sizeBytes = parseInt(metadata.format.size)
                if (!isNaN(sizeBytes) && sizeBytes > 0) {
                  // Use configurable bitrate estimates based on channel count
                  const channels = audioStream?.channels || 1
                  const estimatedBitrate = channels === 1 ? this.WEBM_BITRATE_ESTIMATES.mono : this.WEBM_BITRATE_ESTIMATES.stereo
                  duration = (sizeBytes * 8) / estimatedBitrate
                  Debug.log(`Estimated WebM duration from file size: ${duration}s (${sizeBytes} bytes, ${channels} channels, ~${estimatedBitrate/1000}kbps estimated)`)
                } else {
                  Debug.log('Invalid size value for WebM estimation')
                }
              }
              
              if (duration === 0) {
                Debug.log('No duration found in format or audio stream')
                Debug.log('Format keys:', Object.keys(metadata.format || {}))
                Debug.log('Audio stream keys:', Object.keys(audioStream || {}))
                Debug.log('All streams:', metadata.streams?.map((s: any) => ({ codec_type: s.codec_type, duration: s.duration })))
              }
            }

            if (duration > 0) {
              Debug.log(`FFprobe extracted duration: ${duration}s`)
              return {
                duration,
                format: metadata.format?.format_name || 'unknown',
                size: stats.size,
                bitrate: audioStream?.bit_rate ? parseInt(audioStream.bit_rate) : undefined,
                sampleRate: audioStream?.sample_rate ? parseInt(audioStream.sample_rate) : undefined,
                channels: audioStream?.channels || undefined
              }
            } else {
              Debug.log('FFprobe returned zero or invalid duration, but metadata is valid - using estimated duration')
              // Use the estimated duration even if it's from WebM estimation
              return {
                duration,
                format: metadata.format?.format_name || 'unknown',
                size: stats.size,
                bitrate: audioStream?.bit_rate ? parseInt(audioStream.bit_rate) : undefined,
                sampleRate: audioStream?.sample_rate ? parseInt(audioStream.sample_rate) : undefined,
                channels: audioStream?.channels || undefined
              }
            }
          } catch (parseError) {
            Debug.log(`Failed to parse FFprobe JSON: ${parseError}`)
          }
        } else {
          Debug.log(`FFprobe command failed: ${result.stderr}`)
        }
      } catch (error) {
        Debug.log(`Failed to execute ${ffprobePath}:`, error)
        continue
      }
    }

    Debug.log('All FFprobe attempts failed, using basic metadata')
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
      
      Debug.log(`Audio metadata - duration: ${totalDuration}s, size: ${(metadata.size / 1024 / 1024).toFixed(2)}MB, format: ${metadata.format}`)
      
      if (totalDuration <= this.SEGMENT_DURATION_SECONDS && metadata.size <= this.MAX_FILE_SIZE_MB * 1024 * 1024) {
        Debug.log('No segmentation needed - file is small enough')
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
        if (totalDuration > 0) {
          Debug.log(`Using FFprobe duration for time-based segmentation: ${totalDuration}s`)
          return await this.createTimeBasedSegments(workingFile, totalDuration)
        } else {
          Debug.log('FFprobe duration unavailable, falling back to size estimation')
          const effectiveDuration = this.estimateDurationFromSize(metadata.size)
          return await this.createTimeBasedSegments(workingFile, effectiveDuration)
        }
      } else {
        Debug.log('FFmpeg not available, using byte-based segmentation')
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
