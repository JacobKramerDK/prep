# Implementation Plan: Enhanced FFprobe Integration with Better Error Handling

## Overview
Fix the FFprobe duration extraction in `audio-processor-full.ts` to use actual audio duration instead of file size estimation when FFprobe is available.

## Root Cause
The `getAudioMetadata()` method is failing to extract duration from FFprobe output and falling back to `duration: 0`, which triggers file size estimation instead of using actual audio duration.

## Implementation Tasks

### Task 1: Add Detailed FFprobe Logging
**File**: `src/main/services/audio-processor-full.ts`
**Method**: `getAudioMetadata()`
**Changes**:
- Add debug logging for FFprobe command execution
- Log FFprobe stdout/stderr for troubleshooting
- Log parsed metadata before returning

### Task 2: Fix FFprobe Command Execution
**File**: `src/main/services/audio-processor-full.ts`
**Method**: `getAudioMetadata()`
**Changes**:
- Verify FFprobe command arguments are correct
- Add error handling for JSON parsing
- Validate metadata structure before accessing duration

### Task 3: Improve Duration Extraction Logic
**File**: `src/main/services/audio-processor-full.ts`
**Method**: `getAudioMetadata()`
**Changes**:
- Check multiple duration sources in FFprobe output
- Add validation for duration values
- Ensure proper fallback when duration is invalid

### Task 4: Add FFprobe Status Logging
**File**: `src/main/services/audio-processor-full.ts`
**Method**: `segmentAudioFile()`
**Changes**:
- Log whether FFprobe or estimation is being used
- Show actual vs estimated duration comparison
- Add warning when falling back to estimation

## Code Changes

### 1. Enhanced getAudioMetadata() Method
```typescript
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
            Debug.log('FFprobe returned zero or invalid duration')
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
```

### 2. Enhanced segmentAudioFile() Logging
```typescript
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
```

## Testing Strategy

### Manual Testing
1. **Test FFprobe directly**:
   ```bash
   ffprobe -v quiet -print_format json -show_format -show_streams /path/to/audio.webm
   ```

2. **Test with various audio formats**:
   - WebM recordings
   - MP3 files
   - WAV files

3. **Test fallback behavior**:
   - Temporarily rename ffprobe to test fallback
   - Verify estimation still works

### Validation Steps
1. Record a long meeting (>10 minutes)
2. Check logs for "Using FFprobe duration" message
3. Verify segments are created with accurate timing
4. Ensure transcription quality remains high

### Success Criteria
- Logs show "Using FFprobe duration for time-based segmentation" instead of "Estimating duration from file size"
- Actual audio duration is extracted and used
- Fallback to estimation still works when FFprobe fails
- No regression in transcription functionality

## Risk Mitigation

### Rollback Plan
If issues arise:
1. Revert changes to `getAudioMetadata()`
2. Keep enhanced logging for troubleshooting
3. File size estimation continues to work as before

### Testing Safeguards
- Test with user's specific audio format (WebM from long meeting)
- Verify existing stable tests still pass
- Test both FFprobe success and failure scenarios

## Deployment

### Files to Modify
- `src/main/services/audio-processor-full.ts` (primary changes)

### No Breaking Changes
- All existing functionality preserved
- Fallback behavior maintained
- API remains unchanged

## Timeline
- **Implementation**: 1 hour
- **Testing**: 30 minutes
- **Total**: 1.5 hours

This plan will fix the FFprobe integration while maintaining all existing fallback behavior and improving debugging capabilities.
