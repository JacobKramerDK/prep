# Feature: Obsidian Brief Saving

The following plan should be complete, but its important that you validate documentation and codebase patterns and task sanity before you start implementing.

Pay special attention to naming of existing utils types and models. Import from the right files etc.

## Feature Description

Enable users to save AI-generated meeting briefs directly to their connected Obsidian vault in a user-specified folder. The feature includes settings configuration for the target folder and a save button in the brief display interface. The saved briefs will be in Obsidian-compatible markdown format with proper frontmatter and metadata.

## User Story

As a knowledge worker using Obsidian for note-taking
I want to save AI-generated meeting briefs directly to my Obsidian vault
So that I can integrate meeting preparation content with my existing knowledge management system

## Problem Statement

Currently, users can generate AI-powered meeting briefs but cannot save them directly to their Obsidian vault. This creates friction in their workflow as they need to manually copy and paste content, losing the opportunity to seamlessly integrate meeting preparation with their existing note-taking system.

## Solution Statement

Add a settings option to configure an Obsidian folder for saving briefs, and implement a save button in the MeetingBriefDisplay component that writes properly formatted markdown files to the specified folder. The solution ensures Obsidian compatibility and provides user feedback on save operations.

## Feature Metadata

**Feature Type**: New Capability
**Estimated Complexity**: Medium
**Primary Systems Affected**: Settings Management, File Operations, UI Components
**Dependencies**: Node.js fs module, existing vault connection

---

## CONTEXT REFERENCES

### Relevant Codebase Files IMPORTANT: YOU MUST READ THESE FILES BEFORE IMPLEMENTING!

- `src/main/services/settings-manager.ts` (lines 16-36, 38-317) - Why: Contains SettingsSchema interface and SettingsManager class patterns for adding new settings
- `src/renderer/components/SettingsPage.tsx` (lines 170-200, 370-420) - Why: Shows vault tab structure and UI patterns for settings configuration
- `src/renderer/components/MeetingBriefDisplay.tsx` (lines 1-245) - Why: Contains brief display component where save button will be added
- `src/main/preload.ts` (lines 1-219) - Why: Shows IPC API structure for adding new electron API methods
- `src/main/index.ts` (lines 164-290) - Why: Contains IPC handler patterns for adding new main process handlers
- `src/shared/types/ipc.ts` (lines 1-50) - Why: Shows ElectronAPI interface structure for adding new methods
- `src/main/services/vault-manager.ts` (lines 1-100) - Why: Shows file operations and vault path handling patterns
- `src/main/services/platform-detector.ts` (lines 1-50) - Why: Shows cross-platform detection patterns for OS-specific behavior
- `src/renderer/hooks/useOSDetection.ts` (lines 1-40) - Why: Shows frontend OS detection patterns for conditional UI
- `src/main/index.ts` (lines 187-198) - Why: Shows existing folder selection dialog pattern with showOpenDialog

### New Files to Create

- `src/shared/types/obsidian-settings.ts` - TypeScript interfaces for Obsidian settings
- No new service files needed - functionality will be added to existing services

### Relevant Documentation YOU SHOULD READ THESE BEFORE IMPLEMENTING!

- [Obsidian Markdown Format](https://help.obsidian.md/Editing+and+formatting/Basic+formatting+syntax)
  - Specific section: Frontmatter and metadata
  - Why: Required for ensuring saved briefs are fully Obsidian-compatible
- [Node.js fs.promises](https://nodejs.org/api/fs.html#promises-api)
  - Specific section: writeFile method
  - Why: Used for writing markdown files to the vault folder
- [Electron IPC](https://www.electronjs.org/docs/latest/tutorial/ipc)
  - Specific section: Main to renderer communication
  - Why: Required for implementing secure file save operations

### Patterns to Follow

**Settings Management Pattern:**
```typescript
// From settings-manager.ts
interface SettingsSchema {
  // Add new property following existing pattern
  obsidianBriefFolder: string | null
}

// Getter/setter methods following existing pattern
getObsidianBriefFolder(): string | null {
  return this.store.get('obsidianBriefFolder', null)
}

setObsidianBriefFolder(folderPath: string | null): void {
  this.store.set('obsidianBriefFolder', folderPath)
}
```

**IPC Handler Pattern:**
```typescript
// From main/index.ts
ipcMain.handle('obsidian:setBriefFolder', async (_, folderPath: string | null) => {
  return settingsManager.setObsidianBriefFolder(folderPath)
})
```

**UI Component Pattern:**
```typescript
// From SettingsPage.tsx - button interaction pattern
const handleSelectFolder = async () => {
  try {
    const folderPath = await window.electronAPI.selectObsidianBriefFolder()
    if (folderPath) {
      // Handle success
    }
  } catch (error) {
    console.error('Failed to select folder:', error)
  }
}
```

**File Operations Pattern:**
```typescript
// From vault-manager.ts - file writing pattern with cross-platform path handling
import * as fs from 'fs/promises'
import * as path from 'path'

// Cross-platform path handling
const normalizedPath = path.normalize(folderPath)
const fileName = path.join(normalizedPath, sanitizedFileName)

// Ensure directory exists and write file
await fs.mkdir(normalizedPath, { recursive: true })
await fs.writeFile(fileName, content, 'utf8')
```

**Cross-Platform Considerations:**
```typescript
// Use EXISTING PlatformDetector from main/services/platform-detector.ts
// DO NOT create new detection - use existing instance from main/index.ts (line 24)
import { PlatformDetector } from './platform-detector'

// Use existing platformDetector instance (already created in main/index.ts)
const isWindows = platformDetector.isWindows()
const isMacOS = platformDetector.isMacOS()

// Platform-specific file path handling
const sanitizeFileName = (name: string): string => {
  if (isWindows) {
    // Windows has more restrictive filename rules
    return name.replace(/[<>:"/\\|?*]/g, '_').substring(0, 255)
  }
  // macOS/Linux - less restrictive but still safe
  return name.replace(/[/\\:]/g, '_').substring(0, 255)
}
```

---

## IMPLEMENTATION PLAN

### Phase 1: Foundation

Set up the basic infrastructure for Obsidian brief saving including type definitions and settings schema updates.

**Tasks:**
- Create TypeScript interfaces for Obsidian settings
- Update SettingsSchema to include brief folder configuration
- Add settings manager methods for folder management

### Phase 2: Core Implementation

Implement the main functionality for folder selection and file saving operations.

**Tasks:**
- Add IPC handlers for folder selection and file saving
- Implement file writing logic with Obsidian-compatible formatting
- Add preload API methods for renderer communication

### Phase 3: Integration

Integrate the new functionality with existing UI components and ensure proper user experience.

**Tasks:**
- Add folder selection UI to settings page
- Add save button to MeetingBriefDisplay component
- Implement user feedback and error handling

### Phase 4: Testing & Validation

Ensure the feature works correctly and handles edge cases appropriately.

**Tasks:**
- Test folder selection and file saving operations
- Validate Obsidian markdown format compatibility
- Test error handling and user feedback

---

## STEP-BY-STEP TASKS

IMPORTANT: Execute every task in order, top to bottom. Each task is atomic and independently testable.

### CREATE src/shared/types/obsidian-settings.ts

- **IMPLEMENT**: TypeScript interfaces for Obsidian brief saving settings
- **PATTERN**: Follow existing type definition patterns from vault.ts and calendar.ts
- **IMPORTS**: No external imports needed
- **GOTCHA**: Keep interfaces simple and focused on brief saving functionality
- **VALIDATE**: `npx tsc --noEmit src/shared/types/obsidian-settings.ts`

### UPDATE src/main/services/settings-manager.ts

- **IMPLEMENT**: Add obsidianBriefFolder to SettingsSchema interface and implement getter/setter methods
- **PATTERN**: Mirror existing vault path management pattern (lines 182-187)
- **IMPORTS**: Import ObsidianBriefSettings from new types file
- **GOTCHA**: Add to both interface and defaults object, use null as default value
- **VALIDATE**: `npx tsc --noEmit src/main/services/settings-manager.ts`

### UPDATE src/shared/types/ipc.ts

- **IMPLEMENT**: Add Obsidian brief saving methods to ElectronAPI interface
- **PATTERN**: Follow existing vault and settings method patterns (lines 15-20)
- **IMPORTS**: Import ObsidianBriefSettings type
- **GOTCHA**: Use consistent naming convention with existing API methods
- **VALIDATE**: `npx tsc --noEmit src/shared/types/ipc.ts`

### UPDATE src/main/preload.ts

- **IMPLEMENT**: Add Obsidian brief saving methods to electronAPI object
- **PATTERN**: Follow existing settings methods pattern (lines 125-135)
- **IMPORTS**: No additional imports needed
- **GOTCHA**: Ensure method names match IPC interface exactly
- **VALIDATE**: `npx tsc --noEmit src/main/preload.ts`

### UPDATE src/main/index.ts

- **IMPLEMENT**: Add IPC handlers for folder selection and brief saving with cross-platform path handling
- **PATTERN**: Follow existing settings handler pattern (lines 290-320) and vault:select pattern (lines 187-198)
- **IMPORTS**: Import fs/promises, path modules - USE EXISTING platformDetector instance (line 24)
- **GOTCHA**: Use dialog.showOpenDialog for folder selection, use EXISTING platformDetector.isWindows() for platform-specific filename sanitization, ensure proper error handling
- **VALIDATE**: `npx tsc --noEmit src/main/index.ts`

### UPDATE src/renderer/components/SettingsPage.tsx

- **IMPLEMENT**: Add Obsidian brief folder configuration to vault tab
- **PATTERN**: Mirror existing vault selection UI pattern (lines 370-420)
- **IMPORTS**: Add FolderOpen icon from lucide-react
- **GOTCHA**: Place after existing vault connection section, use consistent styling
- **VALIDATE**: `npm run build:renderer`

### UPDATE src/renderer/components/MeetingBriefDisplay.tsx

- **IMPLEMENT**: Add save to Obsidian button with proper state management
- **PATTERN**: Follow existing button pattern from copy/print buttons (lines 100-150)
- **IMPORTS**: Add Save icon from lucide-react
- **GOTCHA**: Check if folder is configured before enabling button, show appropriate feedback
- **VALIDATE**: `npm run build:renderer`

---

## TESTING STRATEGY

### Unit Tests

Design unit tests following existing test patterns in tests/unit/ directory:

- Test settings manager methods for Obsidian folder configuration
- Test file writing operations with various markdown content
- Test error handling for invalid folder paths and permissions

### Integration Tests

Add tests to existing e2e-stable test suite:

- Test complete workflow from folder selection to brief saving
- Test UI interactions and state management
- Test file system integration and Obsidian compatibility

### Edge Cases

- Invalid or non-existent folder paths
- Permission denied errors during file writing
- Long meeting titles and special characters in filenames
- Concurrent save operations
- Vault disconnection during save operation

---

## VALIDATION COMMANDS

Execute every command to ensure zero regressions and 100% feature correctness.

### Level 1: Syntax & Style

```bash
npx tsc --noEmit
npm run lint
```

### Level 2: Unit Tests

```bash
npm test -- --testPathPattern="settings-manager|obsidian"
```

### Level 3: Integration Tests

```bash
npm run test:e2e-stable -- --grep "obsidian|brief.*save"
```

### Level 4: Manual Validation

- Open settings page and configure Obsidian brief folder
- Generate a meeting brief and verify save button appears
- Save brief and verify file is created in correct location
- Open saved file in Obsidian and verify formatting
- Test with various meeting titles and content types
- **Cross-Platform Testing**: Test on both Windows and macOS if available
- **Filename Edge Cases**: Test with special characters, long titles, Unicode characters
- **Permission Testing**: Test with read-only folders and permission denied scenarios

### Level 5: Additional Validation (Optional)

```bash
# Validate markdown format
npx markdownlint "path/to/saved/briefs/*.md"
```

---

## ACCEPTANCE CRITERIA

- [ ] User can configure Obsidian brief folder in settings
- [ ] Save button appears in brief display when folder is configured
- [ ] Save button is disabled when no folder is configured
- [ ] Briefs are saved in Obsidian-compatible markdown format
- [ ] Saved files include proper frontmatter with metadata
- [ ] File names are sanitized and avoid conflicts
- [ ] User receives feedback on successful/failed save operations
- [ ] All validation commands pass with zero errors
- [ ] No regressions in existing vault or brief functionality
- [ ] Settings persist across application restarts

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

**Cross-Platform Considerations:**
- **Windows**: More restrictive filename rules (no `<>:"/\|?*` characters)
- **macOS/Linux**: Less restrictive but still sanitize `/\:` characters
- **Path Handling**: Use `path.normalize()` and `path.join()` for cross-platform compatibility
- **File Permissions**: Windows doesn't support Unix-style permissions, handle gracefully
- **Directory Separators**: Let Node.js path module handle platform differences

**File Naming Convention:**
- **Primary Format**: `{YYYY-MM-DD} - Meeting Brief - {sanitized-meeting-title}.md`
- **Example**: `2026-01-22 - Meeting Brief - Q1 Planning Session.md`
- **Fallback Format**: `{YYYY-MM-DD} - Meeting Brief - {meeting-id}.md` (if no title available)
- **Example Fallback**: `2026-01-22 - Meeting Brief - mtg-abc123.md`
- **Uniqueness**: Append counter if file exists: `{base-name} (2).md`, `{base-name} (3).md`
- **Platform-Specific Sanitization**: Different rules for Windows vs macOS/Linux
- **Length Limits**: 255 characters max for compatibility across filesystems

**Filename Sanitization Rules:**
```typescript
// Date format: ISO date (YYYY-MM-DD) for proper sorting
const dateStr = new Date().toISOString().split('T')[0]

// Title sanitization (platform-specific)
const sanitizeTitle = (title: string, isWindows: boolean): string => {
  if (isWindows) {
    return title.replace(/[<>:"/\\|?*]/g, '_').trim()
  }
  return title.replace(/[/\\:]/g, '_').trim()
}

// Final filename construction
const fileName = `${dateStr} - Meeting Brief - ${sanitizedTitle}.md`
```

**Security Considerations:**
- Validate folder paths to prevent directory traversal
- Sanitize all user input in filenames and content
- Use proper file permissions for created files (Unix-style only)
- Handle permission errors gracefully across platforms
- **Windows-Specific**: Handle UNC paths and drive letters properly
- **macOS-Specific**: Handle case-insensitive filesystem properly

**Performance Considerations:**
- Use async file operations to avoid blocking UI
- Implement proper error boundaries for file operations
- Consider file size limits for very large briefs
- **Cross-Platform**: Test performance on different filesystems (NTFS, APFS, ext4)

## CONFIDENCE SCORE IMPROVEMENTS

**What Boosts Confidence to 9.5/10:**

1. **Cross-Platform Awareness**: Added platform detection and OS-specific handling
2. **Existing Pattern Reuse**: Leverages exact patterns from vault:select dialog (lines 187-198)
3. **Comprehensive Error Handling**: Platform-specific error scenarios covered
4. **Detailed File References**: Specific line numbers for all patterns and implementations
5. **Robust Testing Strategy**: Cross-platform testing and edge case coverage
6. **Security Considerations**: Platform-aware path validation and sanitization
7. **Performance Optimization**: Async operations and filesystem compatibility

**Remaining 0.5 Risk Factors:**
- Obsidian-specific markdown compatibility edge cases
- Filesystem permission variations across different OS versions
- Unicode filename handling differences between platforms

**Final Confidence Score: 9.5/10** for one-pass implementation success
