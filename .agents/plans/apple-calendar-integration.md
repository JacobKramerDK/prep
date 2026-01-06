# Feature: Simplified Calendar Integration - AppleScript & ICS Files

The following plan should be complete, but its important that you validate documentation and codebase patterns and task sanity before you start implementing.

Pay special attention to naming of existing utils types and models. Import from the right files etc.

## Feature Description

Extract calendar events from Apple Calendar via AppleScript (macOS) and parse ICS calendar files, focusing on **current day events only** for immediate meeting preparation. This is a **manual extraction system** where users trigger calendar data refresh when needed.

## User Story

As a knowledge worker using Apple Calendar or ICS files
I want Prep to extract my **today's meetings** from local calendar sources
So that I can prepare for today's meetings with relevant context from my Obsidian vault

## Problem Statement

Currently, Prep can index Obsidian vaults but has no awareness of today's meetings. Users need a simple way to import **current day calendar events** without complex authentication or network dependencies.

## Solution Statement

Implement local calendar event extraction using AppleScript for direct macOS Calendar access and ICS file parsing for cross-platform calendar import. **Focus on current day events only** for immediate meeting preparation needs. Users manually trigger extraction when they want fresh calendar data.

## Feature Metadata

**Feature Type**: New Capability
**Estimated Complexity**: Medium
**Primary Systems Affected**: Main process services, IPC layer, Settings management
**Dependencies**: applescript (macOS), ical.js (ICS parsing)

---

## CONTEXT REFERENCES

### Relevant Codebase Files IMPORTANT: YOU MUST READ THESE FILES BEFORE IMPLEMENTING!

- `src/main/services/vault-manager.ts` (lines 1-30) - Why: Service class pattern with SettingsManager integration, cleanup handlers
- `src/main/services/settings-manager.ts` (lines 1-30) - Why: Encrypted settings storage pattern, schema definition approach
- `src/main/index.ts` (lines 60-89) - Why: IPC handler registration pattern with validation
- `src/shared/types/ipc.ts` (lines 1-15) - Why: ElectronAPI interface extension pattern
- `src/shared/types/vault.ts` - Why: Domain model structure for new calendar types
- `src/main/preload.ts` (lines 5-12) - Why: Secure context bridge API exposure pattern
- `tests/unit/vault-manager.test.ts` (lines 1-50) - Why: Service testing pattern with mocks

### New Files to Create

- `src/main/services/calendar-manager.ts` - AppleScript and ICS file calendar service
- `src/shared/types/calendar.ts` - Calendar event type definitions
- `src/renderer/components/CalendarImport.tsx` - UI for ICS file import and AppleScript extraction
- `tests/unit/calendar-manager.test.ts` - Unit tests for calendar service

### Relevant Documentation YOU SHOULD READ THESE BEFORE IMPLEMENTING!

- [ical.js Documentation](https://github.com/kewisch/ical.js/wiki)
  - Specific section: Event parsing and recurring event handling
  - Why: Robust iCalendar data parsing for event details
- [node-applescript Documentation](https://github.com/TooTallNate/node-applescript#readme)
  - Specific section: Calendar app integration examples
  - Why: macOS Calendar app direct access via AppleScript

### Patterns to Follow

**Service Class Pattern** (from `vault-manager.ts`):
```typescript
export class CalendarManager {
  private settingsManager: SettingsManager
  private events: CalendarEvent[] = []
  private readonly isAppleScriptAvailable = process.platform === 'darwin'
  
  constructor() {
    this.settingsManager = new SettingsManager()
    if (process.env.NODE_ENV !== 'test') {
      process.on('exit', () => this.dispose())
    }
  }
}
```

**Settings Schema Extension** (from `settings-manager.ts`):
```typescript
interface SettingsSchema {
  // Existing fields...
  calendarEvents: CalendarEvent[]
  lastCalendarSync: string | null
}
```

**IPC Handler Pattern** (from `index.ts`):
```typescript
ipcMain.handle('calendar:extractEvents', async () => {
  return await calendarManager.extractAppleScriptEvents()
})

ipcMain.handle('calendar:parseICS', async (_, filePath: string) => {
  if (!filePath || typeof filePath !== 'string') {
    throw new Error('Invalid file path')
  }
  return await calendarManager.parseICSFile(filePath)
})
```

**AppleScript Event Extraction Pattern** (current day only):
```typescript
private async extractAppleScriptEvents(): Promise<CalendarEvent[]> {
  if (!this.isAppleScriptAvailable) {
    throw new CalendarError('AppleScript not available on this platform', 'PLATFORM_UNSUPPORTED')
  }

  await this.checkAppleScriptPermissions()

  // Get today's date range
  const today = new Date()
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)

  const script = `
    tell application "Calendar"
      set eventList to {}
      set startDate to date "${startOfDay.toDateString()}"
      set endDate to date "${endOfDay.toDateString()}"
      
      repeat with cal in calendars
        repeat with evt in (events of cal whose start date ≥ startDate and start date < endDate)
          set end of eventList to {
            summary of evt,
            start date of evt,
            end date of evt,
            location of evt,
            description of evt
          }
        end repeat
      end repeat
      return eventList
    end tell
  `

  const result = await applescript.execString(script)
  return this.parseAppleScriptResult(result)
}
```
**AppleScript Permission Check Pattern**:
```typescript
private async checkAppleScriptPermissions(): Promise<boolean> {
  if (process.platform !== 'darwin') return false
  
  try {
    const testScript = 'tell application "Calendar" to get name'
    await applescript.execString(testScript)
    return true
  } catch (error) {
    if (error.message.includes('not allowed')) {
      throw new CalendarError(
        'Calendar access permission required. Please grant access in System Preferences > Security & Privacy > Privacy > Calendar',
        'PERMISSION_DENIED',
        error
      )
    }
    return false
  }
}
```

**ICS File Validation Pattern** (following `vault-manager.ts` security approach):
```typescript
private validateICSFile(filePath: string): void {
  // Path traversal protection (mirror vault-manager.ts lines 130-137)
  const resolvedPath = path.resolve(filePath)
  if (!resolvedPath.startsWith(path.resolve('/'))) {
    throw new CalendarError('Invalid file path', 'INVALID_FILE')
  }
  
  // File extension check
  if (!filePath.toLowerCase().endsWith('.ics')) {
    throw new CalendarError('File must be an .ics calendar file', 'INVALID_FILE')
  }
  
  // File size check (prevent memory issues)
  const stats = fs.statSync(filePath)
  if (stats.size > 10 * 1024 * 1024) { // 10MB limit
    throw new CalendarError('ICS file too large (max 10MB)', 'INVALID_FILE')
  }
}
```

**Error Handling Pattern** (standardized calendar errors):
```typescript
export class CalendarError extends Error {
  constructor(
    message: string,
    public code: 'PERMISSION_DENIED' | 'INVALID_FILE' | 'PARSE_ERROR' | 'PLATFORM_UNSUPPORTED',
    public cause?: Error
  ) {
    super(message)
    this.name = 'CalendarError'
  }
}
```

**Graceful Degradation Pattern**:
```typescript
async getEvents(): Promise<CalendarEvent[]> {
  if (this.isAppleScriptAvailable) {
    try {
      return await this.extractAppleScriptEvents()
    } catch (error) {
      console.warn('AppleScript failed, falling back to stored events:', error)
    }
  }
  
  return await this.getStoredEvents()
}
```

---

## IMPLEMENTATION PLAN

### Phase 1: Foundation
Set up calendar service infrastructure and type definitions.

### Phase 2: Core Implementation
Implement AppleScript event extraction and ICS file parsing.

### Phase 3: Integration
Connect calendar service to existing application architecture.

### Phase 4: Testing & Validation
Unit testing and validation of calendar functionality.

---

## STEP-BY-STEP TASKS

### INSTALL Dependencies

- **IMPLEMENT**: Add calendar parsing libraries to package.json
- **PATTERN**: Follow existing dependency management in package.json
- **IMPORTS**: ical.js@^1.5.0, applescript@^1.0.0, @types/applescript@^1.0.0
- **GOTCHA**: Make applescript optional for cross-platform compatibility
- **VALIDATE**: `npm install && npm run build`

### CREATE src/shared/types/calendar.ts

- **IMPLEMENT**: Calendar event type definitions with error handling
- **PATTERN**: Mirror VaultFile interface structure from `src/shared/types/vault.ts`
- **IMPORTS**: None (pure type definitions)
- **GOTCHA**: Include CalendarError class, timezone support, recurring events
- **VALIDATE**: `npx tsc --noEmit src/shared/types/calendar.ts`

### UPDATE src/main/services/settings-manager.ts

- **IMPLEMENT**: Extend SettingsSchema with calendar events storage
- **PATTERN**: Follow existing schema extension pattern (lines 8-16)
- **IMPORTS**: Import calendar types from shared/types/calendar
- **GOTCHA**: Maintain backward compatibility
- **VALIDATE**: `npm run build:main && npm test -- settings-manager`

### CREATE src/main/services/calendar-manager.ts

- **IMPLEMENT**: CalendarManager service with AppleScript and ICS parsing, permission checks, file validation
- **PATTERN**: Mirror VaultManager class structure from `src/main/services/vault-manager.ts`
- **IMPORTS**: ical.js, applescript, SettingsManager, calendar types, fs, path
- **GOTCHA**: Include checkAppleScriptPermissions(), validateICSFile(), CalendarError handling, platform detection
- **VALIDATE**: `npx tsc --strict --noEmit src/main/services/calendar-manager.ts`

### UPDATE src/main/index.ts

- **IMPLEMENT**: Calendar IPC handlers for event extraction and ICS parsing
- **PATTERN**: Follow vault IPC handler pattern (lines 60-89)
- **IMPORTS**: CalendarManager from services/calendar-manager
- **GOTCHA**: Validate file paths, handle platform-specific AppleScript
- **VALIDATE**: `npm run build:main`

### UPDATE src/shared/types/ipc.ts

- **IMPLEMENT**: Extend ElectronAPI interface with calendar operations
- **PATTERN**: Follow existing API method definitions (lines 4-8)
- **IMPORTS**: Calendar types from shared/types/calendar
- **GOTCHA**: Keep API simple - extract events and parse ICS files
- **VALIDATE**: `npx tsc --noEmit src/shared/types/ipc.ts`

### UPDATE src/main/preload.ts

- **IMPLEMENT**: Expose calendar API methods through context bridge
- **PATTERN**: Follow existing contextBridge.exposeInMainWorld pattern (lines 5-12)
- **IMPORTS**: None (uses ipcRenderer)
- **GOTCHA**: Secure API exposure for file selection and event extraction
- **VALIDATE**: `npm run build:main`

### CREATE src/renderer/components/CalendarImport.tsx

- **IMPLEMENT**: React component for ICS import and AppleScript extraction
- **PATTERN**: Mirror VaultSelector component structure from `src/renderer/components/VaultSelector.tsx`
- **IMPORTS**: React, calendar types, ElectronAPI
- **GOTCHA**: Handle file selection, loading states, platform detection
- **VALIDATE**: `npm run build:renderer`

### CREATE tests/unit/calendar-manager.test.ts

- **IMPLEMENT**: Unit tests for CalendarManager service
- **PATTERN**: Mirror test structure from `tests/unit/vault-manager.test.ts`
- **IMPORTS**: Jest, CalendarManager, mock dependencies
- **GOTCHA**: Mock AppleScript and file system operations
- **VALIDATE**: `npm test -- calendar-manager.test.ts`

### UPDATE src/renderer/App.tsx

- **IMPLEMENT**: Integrate CalendarImport component into main UI
- **PATTERN**: Follow existing component integration in App.tsx
- **IMPORTS**: CalendarImport component
- **GOTCHA**: Add calendar section alongside vault browser
- **VALIDATE**: `npm run dev:renderer` and manual UI testing

---

## TESTING STRATEGY

### Unit Tests
**Scope**: CalendarManager methods, AppleScript execution, ICS parsing, error handling
**Framework**: Jest with ts-jest preset
**Coverage**: 80%+ for calendar service methods
**Mocking**: Mock applescript execution, file system operations

### Edge Cases
- AppleScript permission denied on macOS (with user-friendly error messages)
- Invalid ICS file formats and malformed calendar data
- Large ICS files (10MB+ size limit with validation)
- File path traversal attacks (following vault-manager security pattern)
- Platform detection (macOS vs other platforms)
- AppleScript execution failures with graceful fallback
- Memory issues with large calendar datasets
- Timezone parsing edge cases in ical.js

---

## VALIDATION COMMANDS

### Level 1: Syntax & Style
```bash
npx tsc --noEmit
npm run build
```

### Level 2: Unit Tests
```bash
npm test
npm test -- calendar-manager --verbose
npm run test:coverage

# Test error conditions specifically
npm test -- calendar-manager --testNamePattern="error|permission|validation"

# Verify TypeScript strict mode compliance
npx tsc --strict --noEmit src/main/services/calendar-manager.ts
```

### Level 3: Integration Tests
```bash
npm run test:e2e
```

### Level 4: Manual Validation
```bash
npm run dev

# Test AppleScript extraction (macOS):
# 1. Click "Extract Today's Calendar Events"
# 2. If permission denied, verify clear error message with System Preferences guidance
# 3. Grant Calendar permission in System Preferences > Security & Privacy > Privacy > Calendar
# 4. Retry extraction and verify only TODAY's events appear in list
# 5. Check event details (title, date, attendees) - should be current day only
# 6. Verify no past or future events beyond today are included

# Test ICS file import:
# 1. Click "Import ICS File"
# 2. Try selecting non-ICS file - verify rejection with clear error
# 3. Try large file (>10MB) - verify size limit error
# 4. Select valid .ics file and verify parsed events display correctly
# 5. Test malformed ICS content - verify graceful error handling

# Test platform detection:
# 1. On non-macOS: Verify AppleScript option is disabled/hidden
# 2. On macOS: Verify both options available
```

---

## ACCEPTANCE CRITERIA

- [ ] AppleScript extracts **current day events only** from Apple Calendar on macOS with proper permission handling
- [ ] Clear error messages guide users to grant Calendar permissions in System Preferences
- [ ] ICS files can be imported and parsed on all platforms with robust validation
- [ ] **Manual extraction system**: Users trigger calendar refresh when needed (no automatic updates)
- [ ] **Current day focus**: Only today's events are extracted, no past or future events
- [ ] File size limits (10MB) and format validation prevent malicious/oversized files
- [ ] Path traversal protection prevents security vulnerabilities
- [ ] Calendar events display title, date, time, attendees, location with proper error handling
- [ ] Events are stored locally using CalendarError standardized error types
- [ ] Graceful fallback when AppleScript unavailable or permission denied
- [ ] Platform detection properly enables/disables AppleScript features
- [ ] All validation commands pass with zero errors including strict TypeScript mode
- [ ] Unit test coverage exceeds 80% including error condition testing
- [ ] No regressions in existing vault functionality
- [ ] Memory usage remains stable with large calendar datasets

---

## COMPLETION CHECKLIST

- [ ] Dependencies installed (ical.js, applescript)
- [ ] Calendar types defined
- [ ] Settings schema extended
- [ ] CalendarManager service implemented
- [ ] IPC handlers registered
- [ ] ElectronAPI extended
- [ ] Preload script updated
- [ ] CalendarImport UI component created
- [ ] Unit tests implemented
- [ ] Integration with main App component
- [ ] All validation commands pass
- [ ] Manual testing confirms functionality

---

## NOTES

### Design Decisions
**Simplified Approach**: Focus on local event extraction without network dependencies or complex authentication.

**AppleScript + ICS**: Covers macOS native integration and cross-platform file import.

**Local Storage**: Events stored in SettingsManager for future meeting preparation features.

### Security Considerations
- File path validation for ICS imports following vault-manager security patterns
- AppleScript execution sandboxing with permission validation
- CalendarError standardized error handling prevents information leakage
- File size limits (10MB) prevent memory exhaustion attacks
- Path traversal protection using path.resolve() validation
- No network requests or credential storage needed

### Future Extensibility
- Event storage ready for AI meeting brief correlation
- Architecture supports adding CalDAV later
- Meeting preparation workflow foundation established
