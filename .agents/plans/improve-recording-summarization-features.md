# Feature: Improve Recording and Summarization Features

The following plan should be complete, but its important that you validate documentation and codebase patterns and task sanity before you start implementing.

Pay special attention to naming of existing utils types and models. Import from the right files etc.

## Feature Description

Enhance the meeting recording and summarization functionality with three key improvements:
1. **UI Layout Enhancement**: Move the MeetingTranscription component above Today's Meetings section for better visibility and workflow
2. **Summarization Model Selection**: Add a dedicated model selection dropdown for transcript summarization in the AI Configuration settings
3. **Summary Storage Configuration**: Allow users to choose a separate folder for storing meeting summaries, distinct from transcripts

## User Story

As a meeting participant using Prep
I want to easily access recording controls at the top of the page, choose specific AI models for summarization, and organize my summaries in a dedicated folder
So that I can efficiently record meetings, get high-quality summaries using my preferred model, and maintain organized file storage

## Problem Statement

Currently, the recording component is positioned at the bottom of the page below meetings, making it less discoverable. Users cannot choose specific models for summarization (separate from transcription), and summaries are not stored persistently in a user-configurable location, limiting organization and workflow efficiency.

## Solution Statement

Reposition the MeetingTranscription component for better UX, add a new "Summary Model" dropdown in AI Configuration settings alongside existing model selections, and implement a summary folder selection with persistent storage of generated summaries as markdown files.

## Feature Metadata

**Feature Type**: Enhancement
**Estimated Complexity**: Medium
**Primary Systems Affected**: SettingsManager, SettingsPage, HomePage layout, OpenAI service
**Dependencies**: Existing OpenAI service, SettingsManager, electron-store

**Confidence Score**: 9.5/10 for one-pass success

---

## CONTEXT REFERENCES

### Relevant Codebase Files IMPORTANT: YOU MUST READ THESE FILES BEFORE IMPLEMENTING!

- `src/renderer/components/HomePage.tsx` (lines 440-470) - Why: Contains current MeetingTranscription positioning that needs to be moved above Today's Meetings
- `src/renderer/components/SettingsPage.tsx` (lines 400-550) - Why: Contains AI Configuration section with model selection patterns to follow for summary model
- `src/main/services/settings-manager.ts` (lines 18-44) - Why: SettingsSchema interface needs new summaryModel and summaryFolder fields
- `src/main/services/settings-manager.ts` (lines 462-478) - Why: Contains setTranscriptionModel and setTranscriptFolder patterns to mirror for summary settings
- `src/main/services/openai-service.ts` - Why: Contains generateTranscriptionSummary method that needs to use configurable model
- `src/renderer/components/MeetingTranscription.tsx` (lines 1-50) - Why: Component structure and props for understanding integration points
- `src/shared/types/ipc.ts` - Why: IPC interface definitions for new settings methods

### New Files to Create

- None - all changes are modifications to existing files

### Relevant Documentation YOU SHOULD READ THESE BEFORE IMPLEMENTING!

- [OpenAI Models Documentation](https://platform.openai.com/docs/models)
  - Specific section: Chat Completions models
  - Why: Understanding model capabilities for summarization vs transcription
- [Electron Store Documentation](https://github.com/sindresorhus/electron-store#readme)
  - Specific section: Schema validation and encryption
  - Why: Required for adding new settings fields safely

### Patterns to Follow

**Cross-Platform Considerations:**
- Windows and macOS file path handling using `path.join()` and `path.resolve()`
- Native file dialog integration via `dialog.showOpenDialog()`
- Consistent folder selection patterns across platforms

**Design System Patterns:**
- Settings section styling: `space-y-6 max-w-2xl` container
- Form labels: `block text-sm font-medium text-primary mb-2`
- Select dropdowns: `w-full h-11 px-4 rounded-lg border border-border bg-background text-primary focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all appearance-none`
- Folder selection buttons: `flex items-center gap-2 px-4 py-2.5 bg-surface border border-border hover:bg-surface-hover text-secondary hover:text-primary rounded-lg transition-colors`

**Naming Conventions:**
- Settings fields: camelCase (e.g., `summaryModel`, `summaryFolder`)
- IPC handlers: `namespace:action` format (e.g., `settings:getSummaryModel`)
- Component props: camelCase with descriptive names
- File naming: kebab-case for new files, PascalCase for React components

**Error Handling:**
- Settings operations wrapped in try-catch with user-friendly messages
- IPC error responses with structured error objects
- Graceful fallbacks for missing settings (use defaults)

**Logging Pattern:**
- Use `debugLog('SETTINGS', 'message', data)` in renderer
- Use `Debug.log()` in main process for settings operations

**Settings Persistence Pattern:**
```typescript
// In SettingsManager
setSummaryModel(model: string): void {
  this.validateModelName(model) // Reuse existing validation
  this.store.set('summaryModel', model)
}

// In SettingsPage
const handleSaveSettings = async () => {
  await Promise.all([
    window.electronAPI.setSummaryModel(summaryModel),
    window.electronAPI.setSummaryFolder(summaryFolder)
  ])
}
```

---

## IMPLEMENTATION PLAN

### Phase 1: Backend Foundation (Safest - No UI Impact)

Set up the data layer for new summary model and folder settings, following existing patterns exactly.

**Tasks:**
- Extend SettingsSchema interface with new fields
- Add getter/setter methods in SettingsManager (copy existing patterns)
- Create IPC handlers for new settings (copy existing handlers)
- **VALIDATION CHECKPOINT**: `npm run build` - must pass before proceeding

### Phase 2: Settings UI Only (Isolated - Single Page Impact)

Add new controls to AI Configuration section only, no other UI changes.

**Tasks:**
- Add summary model dropdown (copy transcription model dropdown exactly)
- Add summary folder selection (copy transcript folder selection exactly)
- **VALIDATION CHECKPOINT**: Test settings page in isolation, verify save/load works

### Phase 3: Service Integration (Backend Only - No UI Changes)

Update OpenAI service to use new settings, maintain all existing behavior.

**Tasks:**
- Modify generateTranscriptionSummary to use configurable model
- Add optional summary file saving (only if folder configured)
- **VALIDATION CHECKPOINT**: Test summary generation works with new and old settings

### Phase 4: Simple Layout Change (Minimal Risk - Single Component Move)

Move MeetingTranscription component position only, no other layout changes.

**Tasks:**
- Cut and paste component in HomePage (single line change)
- **VALIDATION CHECKPOINT**: Visual comparison - component appears above meetings

---

## STEP-BY-STEP TASKS

IMPORTANT: Execute every task in order, top to bottom. STOP and validate after each phase before proceeding.

### PHASE 1: BACKEND FOUNDATION (SAFEST)

### UPDATE src/main/services/settings-manager.ts
- **IMPLEMENT**: Add `summaryModel: string` (default: 'gpt-4o-mini') and `summaryFolder: string | null` to SettingsSchema
- **PATTERN**: Copy exact structure from `transcriptionModel` and `transcriptFolder` (lines 42-43)
- **VALIDATE**: `npm run build:main` - MUST PASS before continuing

### UPDATE src/main/services/settings-manager.ts
- **IMPLEMENT**: Add getSummaryModel(), setSummaryModel(), getSummaryFolder(), setSummaryFolder() methods
- **PATTERN**: Copy-paste transcription methods and rename (lines 458-478)
- **VALIDATE**: `npm run build:main` - MUST PASS before continuing

### UPDATE src/shared/types/ipc.ts + src/main/index.ts + src/main/preload.ts
- **IMPLEMENT**: Add IPC handlers for 4 new methods
- **PATTERN**: Copy existing transcription IPC patterns exactly
- **VALIDATE**: `npm run build` - MUST PASS before continuing

**PHASE 1 CHECKPOINT**: Full build passes, no UI changes yet

---

### PHASE 2: SETTINGS UI ONLY (ISOLATED)

### UPDATE src/renderer/components/SettingsPage.tsx
- **IMPLEMENT**: Add summaryModel and summaryFolder state + loading + saving
- **PATTERN**: Copy transcription state management patterns exactly (lines 52, 64-69, 175-180)
- **VALIDATE**: Settings page loads without errors

### UPDATE src/renderer/components/SettingsPage.tsx
- **IMPLEMENT**: Add Summary Model dropdown after Transcription Model
- **PATTERN**: Copy transcription dropdown HTML exactly (lines 465-480), change variable names only
- **VALIDATE**: Dropdown appears and saves correctly

### UPDATE src/renderer/components/SettingsPage.tsx
- **IMPLEMENT**: Add Summary Folder selection after Transcript Folder
- **PATTERN**: Copy transcript folder HTML exactly (lines 482-510), change variable names only
- **VALIDATE**: Folder picker works and saves correctly

**PHASE 2 CHECKPOINT**: Settings page works completely, test save/load cycle

---

### PHASE 3: SERVICE INTEGRATION (BACKEND ONLY)

### UPDATE src/main/services/openai-service.ts
- **IMPLEMENT**: Use settingsManager.getSummaryModel() instead of hardcoded model in generateTranscriptionSummary
- **PATTERN**: Follow existing model usage in generateMeetingBrief
- **VALIDATE**: Summary generation still works with existing behavior

### UPDATE src/main/services/openai-service.ts
- **IMPLEMENT**: Add optional summary file saving when summaryFolder is configured
- **PATTERN**: Follow transcript saving patterns from transcription-service.ts
- **VALIDATE**: Summaries save to file when folder set, skip when not set

**PHASE 3 CHECKPOINT**: Summary generation works with new settings, no UI changes

---

### PHASE 4: SIMPLE LAYOUT CHANGE (MINIMAL RISK)

### UPDATE src/renderer/components/HomePage.tsx
- **IMPLEMENT**: Move MeetingTranscription component from lines 445-447 to after status cards (around line 200)
- **PATTERN**: Cut 3 lines, paste 3 lines, maintain exact spacing
- **VALIDATE**: Visual check - recording component appears above meetings

**PHASE 4 CHECKPOINT**: Layout change complete, all functionality preserved

---

## TESTING STRATEGY

### Unit Tests

**Settings Manager Tests:**
- Test getSummaryModel returns default when not set
- Test setSummaryModel validates and stores correctly
- Test getSummaryFolder/setSummaryFolder handle null values
- Test schema migration handles new fields

**OpenAI Service Tests:**
- Test generateTranscriptionSummary uses configured model
- Test summary file saving with proper metadata
- Test error handling when summary folder is invalid

### Integration Tests

**Settings Page Integration:**
- Test summary model dropdown loads and saves correctly
- Test summary folder selection and persistence
- Test settings form validation and error states

**HomePage Layout:**
- Test MeetingTranscription component appears above meetings
- Test responsive layout maintains proper spacing
- Test component interaction flows work correctly

### Edge Cases

- Summary folder doesn't exist (should create or error gracefully)
- Invalid summary model selection (should fallback to default)
- Missing OpenAI API key (should show appropriate error)
- Concurrent summary generation requests (should handle properly)

---

## VALIDATION COMMANDS

Execute after each phase to ensure stability before proceeding.

### Phase 1 Validation (Backend Foundation)
```bash
npm run build          # Must pass - no compilation errors
npm run lint           # Must pass - no style issues
```

### Phase 2 Validation (Settings UI)
```bash
npm run build:renderer # Must pass - UI compiles
npm run dev            # Manual: Open Settings → AI Configuration
                       # Verify: Summary Model dropdown appears
                       # Verify: Summary Folder selection appears
                       # Verify: Save/load cycle works
```

### Phase 3 Validation (Service Integration)
```bash
npm run build:main     # Must pass - service compiles
npm run dev            # Manual: Record short audio
                       # Verify: Summary generation works
                       # Verify: Uses selected model
                       # Verify: Saves to folder if configured
```

### Phase 4 Validation (Layout Change)
```bash
npm run dev            # Manual: Visual check
                       # Verify: Recording component above meetings
                       # Verify: All functionality still works
```

### Final Validation
```bash
npm run test:e2e:stable # All existing tests pass
npm run build           # Full build succeeds
npm run package         # App packages successfully
```

---

## ACCEPTANCE CRITERIA

- [ ] MeetingTranscription component appears above Today's Meetings section
- [ ] AI Configuration settings include Summary Model dropdown with all available models
- [ ] AI Configuration settings include Summary Folder selection with folder picker
- [ ] Summary model selection persists across app restarts
- [ ] Summary folder selection persists across app restarts
- [ ] Generated summaries use the selected model instead of hardcoded default
- [ ] Summaries are saved to configured folder when set (optional behavior)
- [ ] All existing functionality continues to work without regression
- [ ] Settings form validation prevents invalid configurations
- [ ] UI maintains consistent design patterns and responsive behavior
- [ ] All validation commands pass with zero errors
- [ ] TypeScript compilation succeeds without errors

---

## COMPLETION CHECKLIST

- [ ] All tasks completed in order
- [ ] Each task validation passed immediately
- [ ] All validation commands executed successfully
- [ ] Full test suite passes (unit + integration)
- [ ] No linting or type checking errors
- [ ] Manual testing confirms all features work
- [ ] Acceptance criteria all met
- [ ] Code reviewed for quality and maintainability
- [ ] UI/UX tested on different screen sizes
- [ ] Settings persistence verified across app restarts

---

## NOTES

**Implementation Guidelines:**
- Follow existing Tailwind v4 design system patterns and classes
- Ensure cross-platform compatibility (Windows and macOS)
- Use proper debug logging: `debugLog('SETTINGS', 'message', data)` in renderer, `Debug.log()` in main process
- Maintain consistency with existing codebase patterns and conventions
- Reuse existing validation and error handling patterns

**Design Decisions:**
- Summary model defaults to 'gpt-4o-mini' for cost efficiency while maintaining quality
- Summary folder is optional - summaries only saved to file if folder is configured
- UI positioning prioritizes recording controls for better workflow (above meetings)
- Settings grouped logically in AI Configuration for related model selections

**Trade-offs:**
- Added complexity in settings management for improved user control
- Additional storage requirements for summary files (user-controlled)
- Slight increase in UI complexity with additional settings options
