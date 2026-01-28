# Feature: Voice Dictation for Meeting Brief Context Input

## Feature Description

Add voice dictation capability to the meeting brief context textarea, allowing users to speak their input instead of typing. This feature leverages the existing OpenAI Whisper transcription infrastructure and provides a seamless voice-to-text experience integrated with the current meeting brief generation workflow.

## User Story

As a knowledge worker preparing for meetings
I want to dictate my context input instead of typing
So that I can quickly provide meeting context while multitasking or when typing is inconvenient

## Problem Statement

Users often need to provide context for meeting briefs while multitasking, on mobile devices, or when they have accessibility needs that make typing difficult. The current text-only input method creates friction in the meeting preparation workflow.

## Solution Statement

Integrate a voice dictation button next to the existing context textarea that uses the app's existing OpenAI Whisper transcription service. The feature will provide real-time audio recording with visual feedback and append transcribed text to the existing textarea content.

## Feature Metadata

**Feature Type**: Enhancement
**Estimated Complexity**: Medium
**Primary Systems Affected**: BriefGenerator component, TranscriptionService, SettingsManager
**Dependencies**: OpenAI Whisper API (existing), Web Audio API, existing transcription infrastructure

---

## CONTEXT REFERENCES

### Relevant Codebase Files IMPORTANT: YOU MUST READ THESE FILES BEFORE IMPLEMENTING!

- `src/renderer/components/BriefGenerator.tsx` (lines 80-95) - Why: Contains the context textarea that needs dictation integration
- `src/renderer/components/MeetingTranscription.tsx` (lines 1-50) - Why: Audio recording patterns and UI states to mirror
- `src/main/services/transcription-service.ts` (lines 200-250) - Why: Existing transcription service integration patterns
- `src/main/services/settings-manager.ts` (lines 263-290) - Why: OpenAI API key and model validation patterns
- `src/shared/types/transcription.ts` - Why: Type definitions for transcription requests and responses
- `src/renderer/index.css` (lines 1-50) - Why: Design system colors and styling patterns

### New Files to Create

- `src/renderer/components/VoiceDictationButton.tsx` - Voice dictation UI component
- `src/renderer/hooks/useVoiceDictation.ts` - Voice dictation logic hook
- `src/shared/types/dictation.ts` - Type definitions for dictation functionality

### Relevant Documentation YOU SHOULD READ THESE BEFORE IMPLEMENTING!

- [MDN Web Speech API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API)
  - Specific section: SpeechRecognition interface
  - Why: Primary API for real-time voice recognition
- [OpenAI Whisper API Documentation](https://platform.openai.com/docs/guides/speech-to-text)
  - Specific section: Audio file transcription
  - Why: Fallback transcription service integration
- [MDN MediaRecorder API](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder)
  - Specific section: Audio recording
  - Why: Audio capture for Whisper fallback

### Patterns to Follow

**Component Structure Pattern:**
```tsx
// From BriefGenerator.tsx - textarea with button integration
<div className="relative">
  <textarea {...props} />
  <button className="absolute right-2 top-2 transition-all duration-200">
    <Mic className={isRecording ? "animate-pulse text-red-500" : ""} />
  </button>
</div>
```

**Audio Recording Pattern:**
```tsx
// From MeetingTranscription.tsx - recording state management
const [recordingStatus, setRecordingStatus] = useState<TranscriptionStatus>({ isRecording: false })
const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null)
```

**Error Handling Pattern:**
```tsx
// From BriefGenerator.tsx - user-friendly error messages
{error && (
  <div className="p-3 bg-danger-light/30 border border-danger/30 rounded-lg">
    <p className="text-sm text-danger-dark">{error}</p>
    {error.includes('API key') && (
      <p className="text-xs text-danger-dark/80 mt-2">
        💡 Go to Settings → OpenAI to update your API key
      </p>
    )}
  </div>
)}
```

**Settings Validation Pattern:**
```tsx
// From SettingsManager.ts - API key and model validation
async getOpenAIApiKey(): Promise<string | null> {
  return this.store.get('openaiApiKey')
}

validateApiKeyFormat(apiKey: string): boolean {
  return apiKey.startsWith('sk-') && apiKey.length >= 20
}
```

---

## IMPLEMENTATION PLAN

### Phase 1: Foundation

Set up type definitions and core infrastructure for voice dictation functionality.

**Tasks:**
- Create dictation type definitions
- Set up feature availability detection
- Establish settings validation patterns

### Phase 2: Core Implementation

Implement the voice dictation hook and UI component with progressive enhancement.

**Tasks:**
- Create voice dictation custom hook with Web Speech API
- Implement fallback Whisper transcription service
- Build dictation button component with visual states
- Add error handling and user feedback

### Phase 3: Integration

Integrate dictation functionality into the existing meeting brief form.

**Tasks:**
- Modify BriefGenerator component to include dictation button
- Connect to existing settings validation
- Implement feature availability checks
- Add proper cleanup and memory management

### Phase 4: Testing & Validation

Ensure cross-platform compatibility and proper error handling.

**Tasks:**
- Test Web Speech API availability across browsers
- Validate Whisper fallback functionality
- Test settings integration and error states
- Verify accessibility and keyboard navigation

---

## STEP-BY-STEP TASKS

IMPORTANT: Execute every task in order, top to bottom. Each task is atomic and independently testable.

### CREATE src/shared/types/dictation.ts

- **IMPLEMENT**: Type definitions for dictation functionality
- **PATTERN**: Mirror transcription types structure from `src/shared/types/transcription.ts`
- **IMPORTS**: None (pure type definitions)
- **GOTCHA**: Keep types minimal and focused on dictation-specific needs
- **VALIDATE**: `npx tsc --noEmit`

```typescript
export interface DictationState {
  isRecording: boolean
  isProcessing: boolean
  error: string | null
  transcript: string
  isPartialResult: boolean
  hasPermissions: boolean
}

export interface DictationCapabilities {
  hasOpenAIConfig: boolean
  hasMicrophonePermission: boolean
  isAvailable: boolean
}

export type DictationMethod = 'existing-transcription-service'
```

### CREATE src/renderer/hooks/useVoiceDictation.ts

- **IMPLEMENT**: Custom hook for voice dictation with progressive enhancement
- **PATTERN**: Mirror audio recording patterns from `src/renderer/components/MeetingTranscription.tsx:20-50`
- **IMPORTS**: React hooks, dictation types, existing transcription service
- **GOTCHA**: Handle browser compatibility gracefully, clean up resources properly
- **VALIDATE**: `npm run build:renderer`

### CREATE src/renderer/components/VoiceDictationButton.tsx

- **IMPLEMENT**: Dictation button component positioned inside textarea with recording animation
- **PATTERN**: Mirror button styling from `src/renderer/components/BriefGenerator.tsx:180-200`
- **IMPORTS**: React, Lucide icons (Mic, Square, Loader2, AlertTriangle), useVoiceDictation hook
- **GOTCHA**: Use absolute positioning inside textarea, animate pulse during recording, show warning icon for partial results
- **VALIDATE**: Component renders without errors in development

### UPDATE src/renderer/components/BriefGenerator.tsx

- **IMPLEMENT**: Integrate dictation button inside context textarea with relative positioning wrapper
- **PATTERN**: Follow existing textarea structure at lines 80-95, add relative wrapper
- **IMPORTS**: Add VoiceDictationButton import
- **GOTCHA**: Maintain existing form validation and state management, ensure textarea padding accommodates button
- **VALIDATE**: Brief generation form still works with typing input

### ADD microphone permission check to useVoiceDictation

- **IMPLEMENT**: Check microphone permissions before enabling dictation
- **PATTERN**: Use navigator.permissions.query() with graceful fallback
- **IMPORTS**: Browser permissions API
- **GOTCHA**: Handle permission denied gracefully, disable button if no permissions
- **VALIDATE**: Button disabled state works correctly when permissions denied

### ADD retry functionality for failed transcriptions

- **IMPLEMENT**: Retry button and partial result handling with warning indicators
- **PATTERN**: Mirror retry patterns from existing transcription error handling
- **IMPORTS**: AlertTriangle icon for partial result warnings
- **GOTCHA**: Append partial results but show warning, offer retry for complete failures
- **VALIDATE**: Retry functionality works and partial results display warning

### ADD error handling and user feedback

- **IMPLEMENT**: Comprehensive error states and messages
- **PATTERN**: Mirror error handling from `src/renderer/components/BriefGenerator.tsx:50-80`
- **IMPORTS**: Existing error display components/patterns
- **GOTCHA**: Provide actionable error messages for common issues
- **VALIDATE**: Error states display correctly and provide helpful guidance

### UPDATE src/renderer/components/VoiceDictationButton.tsx

- **IMPLEMENT**: Accessibility features and keyboard navigation
- **PATTERN**: Follow existing button accessibility patterns
- **IMPORTS**: None (use existing patterns)
- **GOTCHA**: Ensure screen reader compatibility and keyboard shortcuts
- **VALIDATE**: Component passes accessibility audit

---

## TESTING STRATEGY

### Unit Tests

Test dictation hook functionality, component rendering, and error handling using existing Jest/React Testing Library patterns from the project.

**Key Test Cases:**
- Voice dictation hook state management
- Component rendering with different states
- Error handling and fallback behavior
- Settings integration and feature availability

### Integration Tests

Test end-to-end dictation workflow within the meeting brief form using existing E2E test patterns.

**Key Test Cases:**
- Dictation button integration in brief form
- Text appending to existing textarea content
- Settings validation and feature availability
- Cross-browser compatibility (Chrome, Safari, Firefox)

### Edge Cases

**Specific edge cases that must be tested for this feature:**
- Web Speech API unavailable (Firefox, older browsers)
- OpenAI API key missing or invalid
- Network connectivity issues during Whisper fallback
- Long dictation sessions (>30 seconds)
- Microphone permission denied
- Multiple rapid start/stop cycles
- Text appending to existing content vs empty textarea

---

## VALIDATION COMMANDS

Execute every command to ensure zero regressions and 100% feature correctness.

### Level 1: Syntax & Style

```bash
npx tsc --noEmit                    # TypeScript compilation check
npm run lint                        # ESLint validation
npm run format                      # Prettier formatting check
```

### Level 2: Unit Tests

```bash
npm run test:helpers                # Test utilities validation
npm test -- --testPathPattern=dictation  # Dictation-specific tests (if added)
```

### Level 3: Integration Tests

```bash
npm run test:e2e:stable            # Full E2E test suite
npm run build                      # Production build validation
```

### Level 4: Manual Validation

**Feature-specific manual testing steps:**

1. **Settings Validation:**
   ```bash
   # Test with no OpenAI key configured
   # Verify dictation button is hidden
   
   # Test with valid OpenAI key
   # Verify dictation button appears
   ```

2. **Web Speech API Testing:**
   ```bash
   # Test in Chrome/Edge (full support)
   # Test in Safari (webkit prefix)
   # Test in Firefox (limited support)
   ```

3. **Dictation Workflow:**
   ```bash
   # Test short dictation (5-10 seconds)
   # Test longer dictation (30+ seconds)
   # Test appending to existing text
   # Test error recovery
   ```

### Level 5: Additional Validation (Optional)

```bash
npm run package                    # Test packaging with new feature
npm run dev                        # Development mode validation
```

---

## ACCEPTANCE CRITERIA

- [ ] Dictation button appears inside context textarea when OpenAI is configured AND microphone permissions granted
- [ ] Button is disabled when OpenAI API key, transcription model is missing, OR microphone permissions denied
- [ ] Uses existing transcription service (same as MeetingTranscription component)
- [ ] Transcribed text appends to existing textarea content
- [ ] Visual feedback shows recording (animated pulse), processing (loader), and error states
- [ ] Partial transcription results append with warning indicator
- [ ] Failed transcriptions show retry button
- [ ] Error messages are user-friendly and actionable
- [ ] Feature works on both Windows and macOS
- [ ] Microphone permissions are checked upfront and button disabled if denied
- [ ] Audio recording cleanup prevents memory leaks
- [ ] Existing brief generation functionality remains unchanged
- [ ] Component follows existing design system patterns with proper animations
- [ ] Accessibility features work with screen readers and keyboard navigation
- [ ] Button positioned inside textarea with proper padding and responsive design

---

## COMPLETION CHECKLIST

- [ ] All tasks completed in order
- [ ] Each task validation passed immediately
- [ ] All validation commands executed successfully
- [ ] Full test suite passes (unit + integration)
- [ ] No linting or type checking errors
- [ ] Manual testing confirms feature works across browsers
- [ ] Acceptance criteria all met
- [ ] Code reviewed for quality and maintainability
- [ ] Feature availability properly gated by settings
- [ ] Error handling covers all edge cases
- [ ] Memory cleanup prevents resource leaks

---

## NOTES

**Design Decisions:**
- Progressive enhancement approach ensures functionality across all browsers
- Web Speech API for real-time experience, Whisper fallback for universal compatibility
- Feature gated by existing OpenAI settings to maintain security model
- Text appending behavior allows iterative dictation workflow

**Trade-offs:**
- Web Speech API requires internet connection and has privacy implications
- Whisper fallback adds latency but provides universal compatibility
- Feature availability depends on existing OpenAI configuration

**Performance Considerations:**
- Web Speech API provides near real-time transcription
- Whisper fallback processes audio after recording completes
- Audio cleanup prevents memory accumulation during long sessions

**Security Considerations:**
- Reuses existing OpenAI API key validation and storage
- Audio data handled according to existing transcription security patterns
- No additional API keys or external services required
