# Feature: Add New OpenAI Transcription Models and Simplify Recording

## Feature Description

Add support for OpenAI's new transcription models (`gpt-4o-mini-transcribe` and `gpt-4o-transcribe`) and improve the recording workflow by replacing the confusing native popup with a proper UI component that clearly explains recording options. This enhancement provides better transcription quality options while fixing the user experience confusion around recording choices.

## User Story

As a meeting participant using Prep
I want to have better transcription model options and a clear recording selection interface
So that I can choose the right recording type without confusion and get higher quality transcripts

## Problem Statement

1. **Limited Transcription Models**: Currently only supports `whisper-1`, missing newer OpenAI models with token-based billing
2. **Confusing Recording UI**: Native `window.confirm()` popup where "Cancel" still starts recording, creating user confusion
3. **Inconsistent UX**: Native popup doesn't match the app's design system
4. **Model Limitations**: Missing newer models that offer different cost structures and capabilities

## Solution Statement

1. **Expand Model Support**: Add `gpt-4o-mini-transcribe` and `gpt-4o-transcribe` with proper response format handling
2. **Improve Recording UI**: Replace native popup with proper modal component using existing design system
3. **Clear User Communication**: Make recording options explicit and eliminate confusion about "Cancel" behavior
4. **Maintain Compatibility**: Ensure cross-platform support (macOS primary, Windows secondary) and backward compatibility

## Feature Metadata

**Feature Type**: Enhancement
**Estimated Complexity**: Medium
**Primary Systems Affected**: Audio Recording, Transcription Service, Settings UI
**Dependencies**: OpenAI API, MediaDevices API, Electron Store

---

## CONTEXT REFERENCES

### Relevant Codebase Files IMPORTANT: YOU MUST READ THESE FILES BEFORE IMPLEMENTING!

- `src/shared/types/transcription.ts` - All transcription interfaces and types
- `src/main/services/openai-service.ts` (lines 443-504) - Current transcribeAudio implementation with whisper-1
- `src/main/services/settings-manager.ts` (lines 353-365) - Transcription model get/set methods
- `src/renderer/components/MeetingTranscription.tsx` (lines 67-90) - Recording popup logic and audio capture
- `src/renderer/components/SettingsPage.tsx` (lines 468-481) - Transcription model dropdown UI
- `src/main/index.ts` (lines 913-917) - IPC handlers for transcription model settings

### New Files to Create

None - all changes are modifications to existing files

### Relevant Documentation YOU SHOULD READ THESE BEFORE IMPLEMENTING!

- [OpenAI Transcription API](https://platform.openai.com/docs/api-reference/audio/transcriptions)
  - Specific section: Model parameters and response format differences
  - Why: Required for implementing new model support with different response formats
- [OpenAI Speech-to-Text Guide](https://platform.openai.com/docs/guides/speech-to-text)
  - Specific section: Model comparison and capabilities
  - Why: Understanding model-specific features and limitations

**CRITICAL API FINDINGS**:
- ✅ API Key Verified: All models available and functional
- ⚠️ **Response Format Differences**: GPT-4o models do NOT support `verbose_json` format
- ⚠️ **Usage Tracking**: whisper-1 uses duration-based billing, GPT-4o models use token-based
- ✅ **Model Quality**: whisper-1 most reliable, GPT-4o models offer token optimization

### Patterns to Follow

**Model Configuration Pattern:**
```typescript
// From settings-manager.ts - with validation for new models
getTranscriptionModel(): string {
  return this.store.get('transcriptionModel', 'whisper-1')
}
```

**Response Format Handling Pattern:**
```typescript
// CRITICAL: GPT-4o models only support 'json' and 'text' formats
const response = await this.client!.audio.transcriptions.create({
  file: audioFile,
  model: request.model || 'whisper-1',
  response_format: model.startsWith('gpt-4o') ? 'json' : 'json' // No verbose_json for GPT-4o
})
```

**Recording UI Pattern:**
```typescript
// Replace window.confirm() with proper modal component
const [showRecordingSelector, setShowRecordingSelector] = useState(false)
// Modal with clear options, no confusing "Cancel" behavior
```

**Cross-Platform Audio Pattern:**
```typescript
// macOS-optimized with Windows fallback
const isWindows = navigator.platform.includes('Win')
// Prioritize system audio on macOS, microphone reliability on Windows
```

---

## IMPLEMENTATION PLAN

### Phase 1: Foundation

Update type definitions and model validation to support new transcription models.

**Tasks:**
- Add new model constants and validation
- Update settings manager default handling
- Ensure backward compatibility with existing whisper-1 model

### Phase 2: Core Implementation

Implement new model support in OpenAI service and update settings UI.

**Tasks:**
- Update OpenAI service to handle new models
- Expand settings UI dropdown with new model options
- Add model descriptions and recommendations

### Phase 3: Recording UI Improvement

Replace confusing native popup with proper modal component that clearly explains recording options.

**Tasks:**
- Create RecordingTypeSelector modal component using design system
- Replace window.confirm() with proper React modal
- Add clear visual indicators and descriptions for each option
- Eliminate confusion about "Cancel" behavior

### Phase 4: Testing & Validation

Ensure all changes work correctly across platforms and scenarios.

**Tasks:**
- Test new models with actual audio files
- Verify cross-platform recording functionality
- Validate settings persistence and UI updates
- Test error handling and fallback scenarios

---

## STEP-BY-STEP TASKS

IMPORTANT: Execute every task in order, top to bottom. Each task is atomic and independently testable.

### UPDATE src/shared/types/transcription.ts

- **ADD**: New transcription model type definitions
- **PATTERN**: Existing interface patterns in same file
- **IMPORTS**: None required
- **GOTCHA**: Maintain backward compatibility with existing TranscriptionRequest interface
- **VALIDATE**: `npm run build:main && npm run build:renderer`

### UPDATE src/main/services/settings-manager.ts

- **IMPLEMENT**: Model validation for new transcription models
- **PATTERN**: Existing getTranscriptionModel/setTranscriptionModel methods (lines 353-365)
- **IMPORTS**: None required
- **GOTCHA**: Keep whisper-1 as default for backward compatibility
- **VALIDATE**: `npm run build:main`

### CREATE src/renderer/components/RecordingTypeSelector.tsx

- **CREATE**: New modal component for recording type selection
- **PATTERN**: Existing modal patterns and design system from app
- **IMPORTS**: React hooks, Lucide icons, existing UI components
- **GOTCHA**: Must clearly indicate both options start recording (no "Cancel" confusion)
- **VALIDATE**: `npm run build:renderer`

### UPDATE src/main/services/openai-service.ts

- **IMPLEMENT**: Support for gpt-4o-mini-transcribe and gpt-4o-transcribe models
- **PATTERN**: Existing transcribeAudio method (lines 443-504)
- **IMPORTS**: None required - uses existing OpenAI client
- **GOTCHA**: GPT-4o models do NOT support verbose_json format, only json/text
- **VALIDATE**: `npm run build:main`

### UPDATE src/renderer/components/MeetingTranscription.tsx

- **REPLACE**: window.confirm() with RecordingTypeSelector modal
- **IMPLEMENT**: State management for modal visibility
- **PATTERN**: Existing recording logic (lines 75-90)
- **IMPORTS**: Import new RecordingTypeSelector component
- **GOTCHA**: Maintain existing recording functionality, just improve UI
- **VALIDATE**: `npm run dev:renderer` and test recording functionality

### UPDATE src/renderer/components/SettingsPage.tsx

- **IMPLEMENT**: Expand transcription model dropdown with new options and descriptions
- **PATTERN**: Existing select element with design system classes (lines 468-481)
- **IMPORTS**: None required
- **GOTCHA**: Add clear descriptions about token vs duration billing differences
- **VALIDATE**: `npm run build:renderer`

---

## TESTING STRATEGY

### Unit Tests

Test new model validation and settings persistence using existing test patterns in `tests/` directory.

**Scope:**
- Settings manager model validation
- OpenAI service model parameter handling
- Error handling for invalid models

### Integration Tests

Test full recording and transcription workflow with new models.

**Scope:**
- End-to-end recording with automatic full meeting capture
- Transcription with each new model (if API keys available)
- Settings UI updates and persistence

### Edge Cases

**Model Compatibility:**
- Test with invalid model names
- Verify fallback to default model
- Test API error handling for unsupported models

**Recording Scenarios:**
- System audio permission denied
- Microphone permission denied
- Both permissions denied
- Cross-platform recording behavior

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
```

### Level 3: Integration Tests

```bash
npm run test:e2e:stable
```

### Level 4: Manual Validation

**Recording UI:**
1. Navigate to Meeting Transcription
2. Click "Start Recording"
3. Verify RecordingTypeSelector modal appears with clear options
4. Test both "Full Meeting" and "Microphone Only" options
5. Verify both options start recording immediately (no confusion)
6. Test modal close/cancel behavior (should not start recording)

**Model Selection:**
1. Open Settings → AI Configuration
2. Verify transcription model dropdown shows all three options:
   - whisper-1 (Original - Duration Billing)
   - gpt-4o-mini-transcribe (Fast & Accurate - Token Billing)
   - gpt-4o-transcribe (Highest Quality - Token Billing)
3. Select each model and verify setting persists after app restart

**Transcription Quality:**
1. Record short audio sample with each model
2. Compare transcription accuracy and speed
3. Verify token usage reporting for GPT-4o models
4. Test on both macOS and Windows if available

### Level 5: Additional Validation (Optional)

```bash
# Test with actual OpenAI API if keys available
npm run dev
# Manual testing of transcription quality with different models
```

---

## ACCEPTANCE CRITERIA

- [ ] New transcription models (gpt-4o-mini-transcribe, gpt-4o-transcribe) available in settings
- [ ] RecordingTypeSelector modal replaces confusing native popup
- [ ] Settings UI shows all three models with billing type descriptions
- [ ] Model selection persists across app restarts
- [ ] Recording options clearly explained (no "Cancel" confusion)
- [ ] Cross-platform compatibility maintained (macOS primary, Windows secondary)
- [ ] Existing whisper-1 model continues to work with duration billing
- [ ] GPT-4o models work with token-based billing and proper response format handling
- [ ] All validation commands pass with zero errors
- [ ] UI maintains existing design system consistency

---

## COMPLETION CHECKLIST

- [ ] All tasks completed in order
- [ ] Each task validation passed immediately
- [ ] All validation commands executed successfully
- [ ] Full test suite passes (unit + integration)
- [ ] No linting or type checking errors
- [ ] Manual testing confirms feature works on target platforms
- [ ] Acceptance criteria all met
- [ ] Code reviewed for quality and maintainability
- [ ] Settings migration handled for existing users
- [ ] Error handling covers all edge cases

---

## NOTES

**Model Selection Rationale:**
- `whisper-1`: Keep as default for reliability and duration-based billing
- `gpt-4o-mini-transcribe`: Fast option with token-based cost optimization
- `gpt-4o-transcribe`: Highest quality option for critical meetings

**API Compatibility:**
- ✅ All models verified working with provided API key
- ⚠️ GPT-4o models limited to json/text response formats (no verbose_json)
- ✅ Different billing models: duration vs tokens

**UI Improvement:**
- Eliminates user confusion about "Cancel" behavior
- Maintains user choice while improving clarity
- Uses proper React modal instead of native popup

**Cross-Platform Considerations:**
- macOS: Primary target with better system audio support
- Windows: Secondary support with microphone reliability focus
- Graceful degradation ensures functionality on both platforms

**Performance Impact:**
- Token-based billing may be more cost-effective for short recordings
- Duration-based billing better for long meetings
- User can choose based on use case
