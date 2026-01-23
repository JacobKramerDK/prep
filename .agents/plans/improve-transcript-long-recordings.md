# Feature: Improve Transcript Feature for Long Recordings

The following plan should be complete, but its important that you validate documentation and codebase patterns and task sanity before you start implementing.

Pay special attention to naming of existing utils types and models. Import from the right files etc.

## Feature Description

Enhance the existing transcript feature to support longer recordings (1+ hour meetings) by implementing audio chunking for the OpenAI Whisper API's 25MB file size limit, and add real-time recording timer display that continuously updates during recording instead of only showing duration after stopping.

## User Story

As a meeting participant
I want to record and transcribe hour-long meetings with a live recording timer
So that I can capture complete meeting discussions without file size limitations and see recording progress in real-time

## Problem Statement

The current transcript feature has two critical limitations:
1. **File Size Constraint**: OpenAI Whisper API has a 25MB limit, causing failures for recordings longer than ~15-20 minutes
2. **Timer Display Issue**: Recording timer shows "0:00" during recording and only updates when stopping, providing no real-time feedback

## Solution Statement

Implement client-side audio chunking with overlap handling to split long recordings into multiple API calls, and add a real-time timer that updates every second during recording. Maintain the existing file design system and cross-platform compatibility.

## Feature Metadata

**Feature Type**: Enhancement
**Estimated Complexity**: Medium
**Primary Systems Affected**: Audio Recording Service, Transcription Service, MeetingTranscription Component
**Dependencies**: Web Audio API (browser), OpenAI Whisper API

---

## CONTEXT REFERENCES

### Relevant Codebase Files IMPORTANT: YOU MUST READ THESE FILES BEFORE IMPLEMENTING!

- `src/renderer/components/MeetingTranscription.tsx` (lines 228-235) - Why: Contains current formatDuration function and timer display logic
- `src/main/services/audio-recording-service.ts` (lines 50-90) - Why: Current audio chunking and file creation patterns
- `src/main/services/transcription-service.ts` (lines 28-50) - Why: Current transcription flow that needs chunking support
- `src/main/services/openai-service.ts` (lines 443-504) - Why: Current Whisper API integration with 25MB limit validation
- `src/shared/types/transcription.ts` - Why: Type definitions that may need extension for chunking
- `src/main/index.ts` (lines 833-880) - Why: IPC handlers for transcription that may need updates
- `tests/e2e-stable/transcription.spec.ts` - Why: Test patterns to follow for new functionality

### New Files to Create

- `src/main/services/audio-chunker.ts` - Server-side file-based audio chunking service
- `tests/helpers/mock-audio-generator.ts` - Synthetic WAV file generator for testing
- `tests/e2e-stable/chunked-transcription.spec.ts` - Tests for chunked transcription functionality

### Relevant Documentation YOU SHOULD READ THESE BEFORE IMPLEMENTING!

- [OpenAI Whisper API Documentation](https://platform.openai.com/docs/guides/speech-to-text)
  - Specific section: File upload limits and supported formats
  - Why: Understanding 25MB limit and optimal chunking strategies
- [Web Audio API Documentation](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
  - Specific section: AudioBuffer and audio processing
  - Why: Required for client-side audio chunking implementation

### Patterns to Follow

**Timer Pattern (Least Error-Prone):**
```typescript
const intervalRef = useRef<NodeJS.Timeout | null>(null)

useEffect(() => {
  if (isRecording) {
    intervalRef.current = setInterval(() => {
      setCurrentTime(Date.now())
    }, 1000)
  }
  
  return () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }
}, [isRecording])
```

**File Chunking Pattern (Least Error-Prone):**
```typescript
private chunkFile(filePath: string, chunkSizeMB: number = 20): string[] {
  const stats = fs.statSync(filePath)
  const chunkSize = chunkSizeMB * 1024 * 1024
  const chunks: string[] = []
  
  // Simple file splitting without audio processing
  for (let i = 0; i < stats.size; i += chunkSize) {
    const chunkPath = `${filePath}.chunk${chunks.length}`
    // Copy file chunk using fs operations
    chunks.push(chunkPath)
  }
  return chunks
}
```

**Progress Pattern (Simple):**
```typescript
interface ChunkProgress {
  current: number
  total: number
  status: 'processing' | 'completed' | 'error'
}
```

---

## IMPLEMENTATION PLAN

### Phase 1: Real-time Timer Implementation (Least Error-Prone: Pure React State)

Implement continuous timer updates using React state with proper cleanup patterns.

**Tasks:**
- Add useEffect with setInterval for 1-second timer updates
- Use useRef to store interval ID for proper cleanup
- Update MeetingTranscription component with simple state management

### Phase 2: Server-side Chunking Infrastructure (Least Error-Prone: Main Process)

Create main process audio chunking to avoid browser memory limitations and complexity.

**Tasks:**
- Implement post-recording chunking in AudioRecordingService
- Add simple file-based chunking with 10-minute segments
- Use existing Buffer patterns from current implementation

### Phase 3: Simple Progress Tracking (Least Error-Prone: Basic Progress)

Add basic progress indication without over-engineering the solution.

**Tasks:**
- Update TranscriptionService with simple chunk progress events
- Add basic "Processing chunk X of Y" UI feedback
- Use existing IPC patterns for progress communication

### Phase 4: Testing with Mock Data (Least Error-Prone: Controlled Testing)

Ensure reliability using synthetic test data and controlled scenarios.

**Tasks:**
- Create mock long audio files for testing (synthetic WAV generation)
- Test chunking with 2-3 chunk scenarios only
- Focus on error handling and basic functionality

---

## STEP-BY-STEP TASKS

IMPORTANT: Execute every task in order, top to bottom. Each task is atomic and independently testable.

### CREATE src/renderer/utils/audio-chunker.ts

- **IMPLEMENT**: Client-side audio chunking utility using Web Audio API
- **PATTERN**: Service class pattern from existing codebase
- **IMPORTS**: Web Audio API types, shared constants
- **GOTCHA**: Ensure proper audio format preservation and overlap handling
- **VALIDATE**: `npm run build:renderer && echo "AudioChunker utility compiled successfully"`

### UPDATE src/renderer/components/MeetingTranscription.tsx

- **IMPLEMENT**: Real-time timer with useRef and setInterval (least error-prone pattern)
- **PATTERN**: `const intervalRef = useRef<NodeJS.Timeout | null>(null)` from React best practices
- **IMPORTS**: React hooks (useState, useEffect, useRef)
- **GOTCHA**: Always clear interval in cleanup function to prevent memory leaks
- **VALIDATE**: `npm run dev:renderer && echo "Timer updates every second in browser"`

### CREATE src/main/services/audio-chunker.ts

- **IMPLEMENT**: Server-side file-based chunking using existing Buffer patterns
- **PATTERN**: Service class pattern from audio-recording-service.ts (lines 50-90)
- **IMPORTS**: fs, path, existing audio utilities from AudioRecordingService
- **GOTCHA**: Use simple file splitting, avoid complex audio processing
- **VALIDATE**: `npm run build:main && echo "AudioChunker service compiled successfully"`

### UPDATE src/main/services/transcription-service.ts

- **IMPLEMENT**: Simple chunked workflow with basic progress tracking
- **PATTERN**: Existing async method patterns (lines 28-50)
- **IMPORTS**: AudioChunker, simple progress event emitter
- **GOTCHA**: Keep existing short recording workflow unchanged, add chunking only for large files
- **VALIDATE**: `npm run build:main && echo "TranscriptionService updated successfully"`

### UPDATE src/shared/types/transcription.ts

- **IMPLEMENT**: Minimal types for chunked transcription (ChunkProgress, ChunkedResult)
- **PATTERN**: Existing interface patterns in file
- **IMPORTS**: None (type definitions only)
- **GOTCHA**: Keep types simple, avoid complex nested structures
- **VALIDATE**: `npm run build && echo "Type definitions compiled successfully"`

### UPDATE src/main/index.ts

- **IMPLEMENT**: Simple IPC handler for chunk progress events
- **PATTERN**: Existing IPC handler pattern (lines 833-880)
- **IMPORTS**: Progress event types, existing transcription service
- **GOTCHA**: Use existing error handling patterns, don't add complexity
- **VALIDATE**: `npm run build:main && echo "IPC handlers updated successfully"`

### CREATE tests/helpers/mock-audio-generator.ts

- **IMPLEMENT**: Simple synthetic WAV file generator for testing
- **PATTERN**: Existing test data factory patterns from test-data-factory.ts
- **IMPORTS**: Buffer, fs utilities
- **GOTCHA**: Generate realistic file sizes (25MB+) but keep content simple
- **VALIDATE**: `npm run test:helpers && echo "Mock audio generator working"`

### CREATE tests/e2e-stable/chunked-transcription.spec.ts

- **IMPLEMENT**: Basic E2E tests for chunked transcription (2-3 chunks max)
- **PATTERN**: Existing test patterns from transcription.spec.ts
- **IMPORTS**: Playwright test utilities, mock audio generator
- **GOTCHA**: Use mocked API responses, don't test actual OpenAI calls
- **VALIDATE**: `npm run test:e2e:stable -- --grep "chunked" && echo "Chunked transcription tests pass"`

---

## TESTING STRATEGY

### Unit Tests

Test individual components in isolation:
- AudioChunker utility with various audio formats and sizes
- ChunkTranscriptionService with mocked API responses
- Timer functionality with React Testing Library

### Integration Tests

Test service integration:
- End-to-end chunked transcription workflow
- Real-time timer updates during recording
- Cross-platform audio processing compatibility

### Edge Cases

Test boundary conditions:
- Exactly 25MB audio files (boundary case)
- Very short recordings (< 30 seconds, no chunking needed)
- Network failures during multi-chunk transcription
- Component unmounting during active recording

---

## VALIDATION COMMANDS

Execute every command to ensure zero regressions and 100% feature correctness.

### Level 1: Syntax & Style

```bash
npm run build
npm run lint
```

### Level 2: Unit Tests

```bash
npm run test:helpers
npm run test:e2e:stable
```

### Level 3: Integration Tests

```bash
npm run test:e2e:stable -- --grep "transcription"
npm run test:e2e:stable -- --grep "long recording"
```

### Level 4: Manual Validation

1. Start application: `npm run dev`
2. Navigate to transcription section
3. Start recording and verify timer updates every second
4. Record for 2+ minutes and verify successful transcription
5. Test on both microphone-only and full meeting audio modes
6. Verify cross-platform compatibility (if available)

### Level 5: Additional Validation (Optional)

```bash
# Check bundle size impact
npm run build && du -h dist/
# Verify no memory leaks in timer
# Test with various audio formats (WebM, WAV)
```

---

## ACCEPTANCE CRITERIA

- [ ] Real-time timer displays and updates every second during recording
- [ ] Recordings longer than 25MB are automatically chunked and processed
- [ ] Chunked transcriptions are merged seamlessly with proper overlap handling
- [ ] Cross-platform compatibility maintained (macOS and Windows)
- [ ] Existing short recording workflow remains unchanged
- [ ] All validation commands pass with zero errors
- [ ] No memory leaks from timer intervals
- [ ] UI remains responsive during long transcription processing
- [ ] Error handling gracefully manages chunking failures
- [ ] Test coverage includes chunked transcription scenarios

---

## COMPLETION CHECKLIST

- [ ] All tasks completed in order
- [ ] Each task validation passed immediately
- [ ] All validation commands executed successfully
- [ ] Full test suite passes (unit + integration)
- [ ] No linting or type checking errors
- [ ] Manual testing confirms both timer and chunking work
- [ ] Cross-platform testing completed (if available)
- [ ] Acceptance criteria all met
- [ ] Code reviewed for quality and maintainability
- [ ] Performance impact assessed and acceptable

---

## NOTES

**Design Decisions:**
- **Server-side chunking** chosen over client-side to avoid browser memory limitations and Web Audio API complexity
- **Simple file splitting** selected over audio-aware chunking to minimize error-prone audio processing
- **1-second timer intervals** using useRef pattern for reliable cleanup and performance
- **Basic progress tracking** with simple "chunk X of Y" to avoid over-engineering
- **Mock testing data** using synthetic WAV generation for controlled, reliable testing

**Trade-offs:**
- **Simplicity over sophistication**: File-based chunking vs. audio-aware segmentation (chose simplicity)
- **Server-side processing** vs. client-side (chose server-side for reliability)
- **Basic progress** vs. detailed analytics (chose basic for maintainability)

**Confidence Score: 9.5/10** - Using least error-prone patterns with proven React timer cleanup, simple file operations, and existing codebase patterns.
