# Feature: Add Transcription Summary

The following plan should be complete, but its important that you validate documentation and codebase patterns and task sanity before you start implementing.

Pay special attention to naming of existing utils types and models. Import from the right files etc.

## Feature Description

Add a transcription summary feature that allows users to generate AI-powered meeting summaries from completed transcriptions. When a transcription is finished, users can click a "Generate Summary" button to create a structured meeting summary using OpenAI's models. The feature includes customizable summary prompts in the settings screen and reuses existing OpenAI integration patterns.

## User Story

As a meeting participant
I want to generate a structured summary from my meeting transcription
So that I can quickly extract key insights, action items, and decisions without manually reviewing the entire transcript

## Problem Statement

Users currently have meeting transcriptions but lack an efficient way to extract actionable insights from them. Manual review of long transcripts is time-consuming and prone to missing important details. A structured AI summary would provide immediate value by highlighting key discussion points, decisions, and action items.

## Solution Statement

Extend the existing transcription interface with a "Generate Summary" button that leverages the current OpenAI service to create structured meeting summaries. Add a customizable summary prompt setting that allows users to tailor the summary format to their needs. The solution reuses existing patterns for API calls, error handling, loading states, and settings management.

## Feature Metadata

**Feature Type**: Enhancement
**Estimated Complexity**: Medium
**Primary Systems Affected**: Transcription UI, OpenAI Service, Settings Management, IPC Communication
**Dependencies**: OpenAI API (existing), Settings Manager (existing), Transcription Service (existing)

---

## CONTEXT REFERENCES

### Relevant Codebase Files IMPORTANT: YOU MUST READ THESE FILES BEFORE IMPLEMENTING!

- `src/main/services/openai-service.ts` (lines 75-170) - Why: Contains existing OpenAI API patterns, model capabilities, error handling, and validation cache
- `src/main/services/openai-service.ts` (lines 185-290) - Why: Shows buildPrompt method pattern and custom template usage for meeting briefs
- `src/main/services/settings-manager.ts` (lines 414-422) - Why: Contains prompt template storage patterns (getPromptTemplate, setPromptTemplate, clearPromptTemplate)
- `src/renderer/components/MeetingTranscription.tsx` (lines 680-710) - Why: Shows transcription result display section where summary button should be added
- `src/renderer/components/PromptTemplateEditor.tsx` (lines 1-100) - Why: Contains existing prompt editor component pattern to clone for summary prompt
- `src/main/preload.ts` (lines 242-244) - Why: Shows IPC method patterns for prompt template operations
- `src/main/index.ts` (lines 723-742) - Why: Shows IPC handler patterns for prompt template operations
- `src/shared/types/ipc.ts` (lines 113-115) - Why: Shows IPC type definitions for prompt template methods

### New Files to Create

- `src/shared/types/summary.ts` - TypeScript interfaces for summary request/response types
- `src/renderer/components/SummaryPromptEditor.tsx` - Settings component for customizing summary prompts

### Relevant Documentation YOU SHOULD READ THESE BEFORE IMPLEMENTING!

- [transcription-ref.md](transcription-ref.md) - Comprehensive best practices for meeting transcription and summarization
  - Specific sections: Summarization Pipeline, Prompt Templates, Structured Output Schemas
  - Why: Contains industry best practices for meeting summarization, prompt engineering patterns, and error handling approaches

### Patterns to Follow

**Cross-Platform Considerations:**
- Windows and macOS compatibility requirements (already handled by existing OpenAI service)
- File path handling using existing patterns in settings manager

**Design System Patterns:**
- Use existing Tailwind v4 classes: `bg-brand-600 hover:bg-brand-700` for AI operation buttons
- Follow existing loading state patterns: `<Loader2 className="w-4 h-4 animate-spin" />`
- Use consistent error display: `bg-red-50 border border-red-200 rounded-lg` with AlertCircle icon
- Success messages: `bg-green-50 border border-green-200 rounded-lg` with auto-dismiss

**Naming Conventions:**
- Service methods: `generateTranscriptionSummary()`
- IPC handlers: `transcription:generateSummary`
- Settings keys: `transcriptionSummaryPrompt`
- Component names: `SummaryPromptEditor`

**Error Handling:**
- Use existing `classifyOpenAIError()` method from OpenAIService
- Follow try/catch patterns with user-friendly error messages
- Leverage existing API key validation cache

**Logging Pattern:**
- Use `Debug.log()` in main process for service operations
- Use `debugLog('SUMMARY', 'message', data)` in renderer components

**API Integration Pattern:**
- Extend existing OpenAIService class with new method
- Reuse existing model capabilities detection
- Follow existing request parameter patterns with temperature and token limits
- Use existing validation cache for API key checks

---

## IMPLEMENTATION PLAN

### Phase 1: Foundation

Set up TypeScript interfaces and extend existing services with summary functionality.

**Tasks:**
- Create summary type definitions following existing patterns
- Extend OpenAI service with summary generation method
- Add summary prompt settings to settings manager

### Phase 2: Core Implementation

Implement the core summary generation functionality in the main process.

**Tasks:**
- Add IPC handlers for summary operations
- Implement summary generation logic using existing OpenAI patterns
- Add summary prompt management to settings

### Phase 3: Integration

Integrate summary functionality into the transcription UI and settings screen.

**Tasks:**
- Add summary button to transcription results display
- Create summary prompt editor component for settings
- Implement loading states and error handling in UI

### Phase 4: Testing & Validation

Ensure the feature works correctly and follows existing patterns.

**Tasks:**
- Test summary generation with various transcript lengths
- Validate error handling and edge cases
- Verify settings persistence and UI consistency

---

## STEP-BY-STEP TASKS

IMPORTANT: Execute every task in order, top to bottom. Each task is atomic and independently testable.

### CREATE src/shared/types/summary.ts

- **IMPLEMENT**: TypeScript interfaces for summary request and response
- **PATTERN**: Mirror existing types in `src/shared/types/brief.ts` and `src/shared/types/transcription.ts`
- **IMPORTS**: None required (pure type definitions)
- **EXACT CODE**:
```typescript
export interface SummaryRequest {
  transcriptionId: string
  transcriptionText: string
  model?: string
}

export interface SummaryResult {
  id: string
  transcriptionId: string
  content: string
  generatedAt: Date
  model: string
  status: SummaryStatus
}

export enum SummaryStatus {
  IDLE = 'idle',
  GENERATING = 'generating',
  SUCCESS = 'success',
  ERROR = 'error'
}

export interface SummaryGenerationResult {
  success: boolean
  summary?: SummaryResult
  error?: string
}
```
- **VALIDATE**: `npx tsc --noEmit` (check TypeScript compilation)

### UPDATE src/main/services/openai-service.ts

- **IMPLEMENT**: Add `generateTranscriptionSummary` method to OpenAIService class
- **PATTERN**: Mirror `generateMeetingBrief` method structure (lines 75-170)
- **IMPORTS**: Add summary types from `../../shared/types/summary`
- **EXACT METHOD SIGNATURE**:
```typescript
async generateTranscriptionSummary(request: SummaryRequest, model: string = 'gpt-4o-mini'): Promise<SummaryResult>
```
- **EXACT IMPLEMENTATION PATTERN**:
  1. Configuration check: `if (!this.isConfigured()) throw new Error('OpenAI API key not configured. Please set your API key in settings.')`
  2. API validation: `const isValid = await this.isApiKeyValidCached()`
  3. Build prompt using custom template or default
  4. Create RequestParams with model capabilities
  5. Make OpenAI API call with try-catch
  6. Return SummaryResult with `randomUUID()`, `new Date()`, `SummaryStatus.SUCCESS`
- **GOTCHA**: Use existing `getModelCapabilities()`, `isApiKeyValidCached()`, and `classifyOpenAIError()` methods
- **VALIDATE**: `npx tsc --noEmit` and test method exists

### UPDATE src/main/services/settings-manager.ts

- **IMPLEMENT**: Add summary prompt methods: `getTranscriptionSummaryPrompt()`, `setTranscriptionSummaryPrompt()`, `clearTranscriptionSummaryPrompt()`
- **PATTERN**: Mirror existing prompt template methods (lines 414-422)
- **IMPORTS**: None required
- **EXACT METHODS**:
```typescript
getTranscriptionSummaryPrompt(): string | null {
  return this.store.get('transcriptionSummaryPrompt', null)
}

setTranscriptionSummaryPrompt(template: string): void {
  this.store.set('transcriptionSummaryPrompt', template)
}

clearTranscriptionSummaryPrompt(): void {
  this.store.delete('transcriptionSummaryPrompt')
}
```
- **GOTCHA**: Use exact key naming: `transcriptionSummaryPrompt`
- **VALIDATE**: Check methods exist and store operations work

### UPDATE src/shared/types/ipc.ts

- **IMPLEMENT**: Add IPC method signatures for summary operations
- **PATTERN**: Mirror existing prompt template IPC methods (lines 113-115)
- **IMPORTS**: Add summary types
- **EXACT SIGNATURES**:
```typescript
generateTranscriptionSummary(request: SummaryRequest, model?: string): Promise<SummaryResult>
getTranscriptionSummaryPrompt(): Promise<string | null>
setTranscriptionSummaryPrompt(template: string): Promise<{ success: boolean }>
clearTranscriptionSummaryPrompt(): Promise<{ success: boolean }>
```
- **GOTCHA**: Follow exact naming convention and return types
- **VALIDATE**: `npx tsc --noEmit` (check TypeScript compilation)

### UPDATE src/main/preload.ts

- **IMPLEMENT**: Expose summary IPC methods to renderer process
- **PATTERN**: Mirror existing prompt template preload methods (lines 242-244)
- **IMPORTS**: None required
- **EXACT METHODS**:
```typescript
generateTranscriptionSummary: (request: SummaryRequest, model?: string) => 
  ipcRenderer.invoke('transcription:generateSummary', request, model),
getTranscriptionSummaryPrompt: () => 
  ipcRenderer.invoke('get-transcription-summary-prompt'),
setTranscriptionSummaryPrompt: (template: string) => 
  ipcRenderer.invoke('set-transcription-summary-prompt', template),
clearTranscriptionSummaryPrompt: () => 
  ipcRenderer.invoke('clear-transcription-summary-prompt'),
```
- **GOTCHA**: Use consistent naming and parameter passing
- **VALIDATE**: Check methods are exposed in electronAPI object

### UPDATE src/main/index.ts

- **IMPLEMENT**: Add IPC handlers for summary operations
- **PATTERN**: Mirror existing prompt template handlers (lines 723-742)
- **IMPORTS**: Add summary types
- **EXACT HANDLERS**:
```typescript
ipcMain.handle('transcription:generateSummary', async (_, request: SummaryRequest, model?: string) => {
  try {
    return await openaiService.generateTranscriptionSummary(request, model)
  } catch (error) {
    throw error
  }
})

ipcMain.handle('get-transcription-summary-prompt', async () => {
  return settingsManager.getTranscriptionSummaryPrompt()
})

ipcMain.handle('set-transcription-summary-prompt', async (_, template: string) => {
  try {
    settingsManager.setTranscriptionSummaryPrompt(template)
    return { success: true }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('clear-transcription-summary-prompt', async () => {
  try {
    settingsManager.clearTranscriptionSummaryPrompt()
    return { success: true }
  } catch (error) {
    return { success: false, error: error.message }
  }
})
```
- **GOTCHA**: Use existing openaiService instance, handle errors consistently
- **VALIDATE**: `npm run build:main` (check main process builds)

### CREATE src/renderer/components/SummaryPromptEditor.tsx

- **IMPLEMENT**: React component for editing summary prompts in settings
- **PATTERN**: Clone and adapt `PromptTemplateEditor.tsx` structure (lines 1-100)
- **IMPORTS**: React hooks, Lucide icons, summary types
- **EXACT DEFAULT TEMPLATE**:
```typescript
const getDefaultSummaryTemplate = () => {
  return `Analyze this meeting transcript and create a structured summary with the following sections:

## Executive Summary
Brief 2-3 sentence overview of the meeting's main purpose and outcomes.

## Key Discussion Points
- Main topics discussed with specific details
- Important decisions made during the meeting
- Any concerns or issues raised

## Action Items
| Task | Owner | Due Date | Priority |
|------|-------|----------|----------|
| [Extract specific tasks with owners and deadlines] |

## Decisions Made
- List all concrete decisions with rationale
- Include who made the decision and when

## Follow-up Items
- Next steps identified
- Future meetings scheduled
- Items requiring additional discussion

## Key Quotes
- Important statements or commitments made
- Direct quotes that capture essential points

Focus on actionable insights and specific details. Avoid generic summaries.`
}
```
- **GOTCHA**: Update all method calls to use summary-specific IPC methods (`getTranscriptionSummaryPrompt`, `setTranscriptionSummaryPrompt`, `clearTranscriptionSummaryPrompt`)
- **VALIDATE**: Component renders without errors in settings

### UPDATE src/renderer/components/MeetingTranscription.tsx

- **IMPLEMENT**: Add "Generate Summary" button next to Save button in transcript display
- **PATTERN**: Follow existing button patterns in transcript header (lines 680-710)
- **IMPORTS**: Add summary types, Sparkles icon from lucide-react
- **EXACT PLACEMENT**: Insert button between folder selector and save button in the button group
- **EXACT STATE MANAGEMENT**:
```typescript
const [isGeneratingSummary, setIsGeneratingSummary] = useState(false)
const [summaryResult, setSummaryResult] = useState<SummaryResult | null>(null)
```
- **EXACT BUTTON JSX**:
```jsx
<button
  onClick={handleGenerateSummary}
  disabled={isGeneratingSummary}
  className="flex items-center gap-1 px-3 py-1 bg-brand-600 hover:bg-brand-700 disabled:bg-gray-400 text-white text-xs font-medium rounded transition-colors"
>
  {isGeneratingSummary ? (
    <>
      <Loader2 className="w-3 h-3 animate-spin" />
      Summarizing...
    </>
  ) : (
    <>
      <Sparkles className="w-3 h-3" />
      Generate Summary
    </>
  )}
</button>
```
- **GOTCHA**: Add loading state, error handling, and success message following existing patterns
- **VALIDATE**: Button appears and handles click events

### UPDATE src/renderer/components/SettingsPage.tsx

- **IMPLEMENT**: Add SummaryPromptEditor to AI tab in settings
- **PATTERN**: Follow existing PromptTemplateEditor integration pattern
- **IMPORTS**: Add SummaryPromptEditor component
- **GOTCHA**: Place in appropriate section within AI settings tab
- **VALIDATE**: Component appears in settings and saves correctly

---

## TESTING STRATEGY

### Unit Tests

Follow existing testing patterns in `tests/e2e-stable/` directory:
- Test summary generation with mock transcription data
- Validate error handling for invalid API keys and network issues
- Test settings persistence for custom summary prompts
- Verify UI state management during summary generation

### Integration Tests

- Test end-to-end flow: transcription → summary generation → display
- Validate OpenAI API integration with different models
- Test custom prompt functionality with various templates
- Verify cross-platform compatibility (Windows/macOS)

### Edge Cases

- Empty or very short transcriptions
- Very long transcriptions (token limit handling)
- Network failures during summary generation
- Invalid custom prompt templates
- API key validation failures

---

## VALIDATION COMMANDS

Execute every command to ensure zero regressions and 100% feature correctness.

### Level 1: Syntax & Style

```bash
npx tsc --noEmit
npm run build:main
npm run build:renderer
```

### Level 2: Unit Tests

```bash
npm run test:e2e:stable
npm run test:helpers
```

### Level 3: Integration Tests

```bash
# Start app in development mode
npm run dev

# Test summary generation manually:
# 1. Record and transcribe a short audio clip
# 2. Click "Generate Summary" button
# 3. Verify summary appears with proper formatting
# 4. Test custom prompt in settings
```

### Level 4: Manual Validation

**Feature-specific manual testing steps:**

1. **Basic Summary Generation:**
   - Record a 30-second test audio
   - Complete transcription
   - Click "Generate Summary" button
   - Verify structured summary appears

2. **Custom Prompt Testing:**
   - Go to Settings > AI tab
   - Modify summary prompt template
   - Generate new summary
   - Verify custom format is used

3. **Error Handling:**
   - Test with invalid API key
   - Test with network disconnected
   - Verify appropriate error messages

4. **Loading States:**
   - Verify spinner appears during generation
   - Check button disabled state
   - Confirm success message displays

### Level 5: Additional Validation (Optional)

```bash
# Check for memory leaks during summary generation
# Verify no console errors in development tools
# Test with various transcript lengths (short, medium, long)
```

---

## ACCEPTANCE CRITERIA

- [ ] Summary button appears next to Save button in transcription results
- [ ] Clicking summary button generates structured meeting summary using OpenAI
- [ ] Summary uses same model selection as other AI features
- [ ] Custom summary prompt can be configured in settings
- [ ] Loading states and error handling follow existing UI patterns
- [ ] Summary generation reuses existing OpenAI service patterns
- [ ] All validation commands pass with zero errors
- [ ] Feature works on both Windows and macOS
- [ ] No regressions in existing transcription functionality
- [ ] Settings persistence works correctly for custom prompts

---

## COMPLETION CHECKLIST

- [ ] All tasks completed in order
- [ ] Each task validation passed immediately
- [ ] All validation commands executed successfully
- [ ] Full test suite passes (unit + integration)
- [ ] No linting or type checking errors
- [ ] Manual testing confirms feature works
- [ ] Acceptance criteria all met
- [ ] Code reviewed for quality and maintainability

---

## NOTES

**Implementation Guidelines:**
- Reuse existing OpenAI service patterns to avoid code duplication
- Follow established UI patterns for consistency
- Use existing error handling and validation approaches
- Maintain cross-platform compatibility
- Ensure proper TypeScript typing throughout

**Key Design Decisions:**
- Summary button placement: Next to Save button for logical workflow
- Settings location: AI tab alongside existing prompt template editor
- API integration: Extend existing OpenAI service rather than create new service
- Error handling: Leverage existing error classification system
- Model selection: Use same model as other AI features for consistency

**Performance Considerations:**
- Leverage existing API key validation cache
- Use appropriate token limits based on model capabilities
- Handle long transcriptions gracefully with existing patterns
- Maintain responsive UI during summary generation

**Security Considerations:**
- Reuse existing secure API key storage
- Follow established IPC communication patterns
- Validate user inputs in summary prompts
- Use existing OpenAI client configuration

---

## CONFIDENCE ASSESSMENT

**Confidence Score**: 9.5/10 for one-pass implementation success

**Improvements Made:**
- **Exact TypeScript interfaces** with precise naming and structure
- **Complete method signatures** matching existing patterns exactly  
- **Specific JSX placement** with exact className and state patterns
- **Full code snippets** for critical implementation sections
- **Precise IPC handler patterns** with error handling
- **Default template content** optimized for meeting summaries
- **Detailed validation steps** for each implementation phase

**Remaining 0.5 Risk Factors:**
- Potential edge cases with very long transcriptions (>100k characters)
- Minor UI layout adjustments that may be needed for button spacing
