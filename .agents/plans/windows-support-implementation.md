# Feature: Windows Support Implementation

The following plan should be complete, but its important that you validate documentation and codebase patterns and task sanity before you start implementing.

Pay special attention to naming of existing utils types and models. Import from the right files etc.

## Feature Description

Add Windows compatibility to the Prep meeting assistant, ensuring cross-platform functionality for file system operations and UI components. The system should detect Windows environments and hide macOS-specific features like Apple Calendar integration while maintaining full functionality with existing Google Calendar and ICS file imports.

## User Story

As a Windows user
I want to use Prep meeting assistant with existing calendar connectors
So that I can prepare for meetings using my Obsidian vault and Google Calendar/ICS files without encountering macOS-specific errors or Apple Calendar options

## Problem Statement

The current Prep application has macOS-specific assumptions that prevent Windows users from using the application effectively:

1. **Calendar System Dependencies**: AppleScript and Swift-based calendar access cause errors on Windows
2. **File System Incompatibilities**: Unix-style paths, permissions, and signal handling
3. **Build System Issues**: Bash scripts and macOS-specific build tools
4. **UI Platform Assumptions**: Apple Calendar options shown regardless of platform

## Solution Statement

Implement Windows compatibility by:

1. **Platform Detection**: Robust OS detection throughout the application
2. **Conditional UI**: Hide Apple Calendar integration on Windows, show only Google Calendar and ICS imports
3. **Cross-Platform File Handling**: Proper path normalization and permissions
4. **Windows Build System**: Windows-compatible build process
5. **Error Prevention**: Prevent macOS-specific code execution on Windows

## Feature Metadata

**Feature Type**: Enhancement
**Estimated Complexity**: Medium
**Primary Systems Affected**: File System Operations, Build System, UI Components, Platform Detection
**Dependencies**: Windows PowerShell, electron-builder Windows configuration

---

## CONTEXT REFERENCES

### Relevant Codebase Files IMPORTANT: YOU MUST READ THESE FILES BEFORE IMPLEMENTING!

- `src/main/services/calendar-manager.ts` (lines 31, 468) - Contains hardcoded macOS detection that needs Windows alternatives
- `src/main/services/swift-calendar-manager.ts` (lines 32, 45) - macOS-only Swift calendar integration
- `src/main/index.ts` (line 148) - Platform-specific app lifecycle handling
- `src/renderer/hooks/useOSDetection.ts` - Existing OS detection hook to extend
- `src/renderer/components/SettingsPage.tsx` (lines 200-250) - Calendar integration UI that needs conditional rendering
- `src/renderer/components/CalendarImport.tsx` (lines 100-150) - Apple Calendar import that needs Windows alternatives
- `native/build.sh` - macOS-only build script needing Windows equivalent
- `package.json` (lines 12-13, 101-103) - Build scripts and electron-builder Windows config

### New Files to Create

- `src/main/services/platform-detector.ts` - Centralized platform detection service
- `native/build.ps1` - PowerShell build script for Windows (no-op for consistency)
- `native/build.bat` - Batch file wrapper for PowerShell script
- `build/entitlements.win.xml` - Windows application manifest

### Relevant Documentation YOU SHOULD READ THESE BEFORE IMPLEMENTING!

- [Node.js Path Module Cross-Platform](https://nodejs.org/api/path.html)
  - Specific section: Platform-specific path handling
  - Why: Ensures proper file system path normalization
- [Electron Builder Windows Configuration](https://www.electron.build/configuration/win)
  - Specific section: Windows target configuration and NSIS installer
  - Why: Proper Windows packaging and distribution setup

### Patterns to Follow

**Platform Detection Pattern:**
```typescript
// From src/main/services/calendar-manager.ts:31
private readonly isAppleScriptAvailable = process.platform === 'darwin'

// Extend to:
private readonly isWindows = process.platform === 'win32'
private readonly isMacOS = process.platform === 'darwin'
```

**File Path Handling Pattern:**
```typescript
// From src/main/services/vault-manager.ts:200-210
// Already uses path.join() correctly - follow this pattern
const filePath = path.join(vaultPath, relativePath)
```

**Service Registration Pattern:**
```typescript
// From src/main/index.ts - follow existing IPC handler registration
ipcMain.handle('calendar:getEvents', async () => {
  return await calendarManager.getEvents()
})
```

**React Hook Pattern:**
```typescript
// From src/renderer/hooks/useOSDetection.ts - extend existing hook
const [osInfo, setOSInfo] = useState<OSInfo>({
  isWindows: false,
  isMacOS: false,
  isAppleScriptSupported: false
})
```

---

## IMPLEMENTATION PLAN

### Phase 1: Platform Detection Infrastructure

Establish robust cross-platform detection to prevent macOS-specific code execution on Windows.

**Tasks:**
- Create centralized platform detection service
- Update existing OS detection to be more comprehensive
- Add Windows-specific capability detection

### Phase 2: Cross-Platform File System Compatibility

Ensure all file operations work correctly on Windows.

**Tasks:**
- Audit and fix file path handling throughout codebase
- Update file permissions and signal handling for Windows
- Create Windows-compatible temporary file management

### Phase 3: Windows Build System

Create Windows-compatible build and packaging system.

**Tasks:**
- Create PowerShell build scripts (no-op for consistency)
- Update package.json for Windows build commands
- Configure Windows-specific electron-builder settings
- Add Windows application manifest

### Phase 4: UI Platform Adaptation

Update React components to hide Apple Calendar options on Windows.

**Tasks:**
- Update calendar integration components for conditional rendering
- Enhance OS detection hook with Windows capabilities
- Hide Apple Calendar options on Windows
- Ensure Google Calendar and ICS imports work on Windows

---

## STEP-BY-STEP TASKS

IMPORTANT: Execute every task in order, top to bottom. Each task is atomic and independently testable.

### CREATE src/main/services/platform-detector.ts

- **IMPLEMENT**: Centralized platform detection service with comprehensive OS and capability detection
- **PATTERN**: Service class pattern from existing managers - file:src/main/services/calendar-manager.ts:20-40
- **IMPORTS**: `import { app } from 'electron'`, `import * as os from 'os'`, `import * as path from 'path'`, `import { PlatformInfo } from '../../shared/types/platform'`
- **GOTCHA**: Use `process.platform === 'win32'` for Windows detection (not 'windows')
- **EXACT IMPLEMENTATION**: Class with `getPlatformInfo(): PlatformInfo`, `isWindows(): boolean`, `isMacOS(): boolean`, `hasAppleScript(): boolean` methods
- **VALIDATE**: `npm run build:main && node -e "const { PlatformDetector } = require('./dist/main/src/main/services/platform-detector.js'); console.log(new PlatformDetector().getPlatformInfo())"`

### UPDATE src/renderer/hooks/useOSDetection.ts

- **IMPLEMENT**: Extend existing hook to include comprehensive Windows detection and capabilities
- **PATTERN**: Existing useState and useEffect pattern - file:src/renderer/hooks/useOSDetection.ts:8-35
- **IMPORTS**: Keep existing imports, add `import { PlatformInfo } from '../../shared/types/platform'`
- **GOTCHA**: Ensure fallback to Windows detection when AppleScript is not supported
- **EXACT CHANGES**: Replace `OSInfo` interface with `PlatformInfo`, add `isLinux` property, update `electronAPI.getPlatformInfo()` call
- **VALIDATE**: `npm run build:renderer && echo "Hook updated successfully"`

### CREATE src/shared/types/platform.ts

- **IMPLEMENT**: TypeScript interfaces for platform detection and capabilities
- **PATTERN**: Existing type definitions structure - file:src/shared/types/calendar.ts:1-30
- **IMPORTS**: No external imports needed, pure type definitions
- **GOTCHA**: Include Windows-specific capability flags for future extensibility
- **EXACT TYPES NEEDED**: `PlatformInfo { isWindows: boolean; isMacOS: boolean; isLinux: boolean; hasAppleScript: boolean; hasSwift: boolean; platform: NodeJS.Platform }`
- **VALIDATE**: `npx tsc --noEmit src/shared/types/platform.ts`

### UPDATE src/main/services/calendar-manager.ts

- **IMPLEMENT**: Add platform detection to prevent macOS-specific code execution on Windows
- **PATTERN**: Existing platform detection pattern - file:src/main/services/calendar-manager.ts:31
- **IMPORTS**: Add `import { PlatformDetector } from './platform-detector'`
- **GOTCHA**: Ensure AppleScript and Swift calendar methods return appropriate errors on Windows
- **EXACT CHANGES**: Replace `process.platform === 'darwin'` with `this.platformDetector.isMacOS()`, add early returns for Windows in `isAppleScriptSupported()` and `extractAppleScriptEvents()`
- **VALIDATE**: `npm run build:main && node -e "const { CalendarManager } = require('./dist/main/src/main/services/calendar-manager.js'); console.log('Calendar manager updated')"`

### UPDATE src/main/index.ts

- **IMPLEMENT**: Add Windows-specific app lifecycle handling and platform detection IPC handlers
- **PATTERN**: Existing IPC handler registration - file:src/main/index.ts:200-250
- **IMPORTS**: Add `import { PlatformDetector } from './services/platform-detector'`
- **GOTCHA**: Windows uses different app lifecycle events than macOS (window-all-closed behavior)
- **EXACT CHANGES**: Add `ipcMain.handle('platform:getPlatformInfo', () => platformDetector.getPlatformInfo())`, update `app.on('window-all-closed')` to check `!platformDetector.isMacOS()`
- **VALIDATE**: `npm run build:main && electron dist/main/src/main/index.js --version`

### CREATE native/build.ps1

- **IMPLEMENT**: PowerShell script for Windows build process (no-op for consistency since no native binary needed)
- **PATTERN**: Simple success script that maintains build system consistency
- **IMPORTS**: No imports, pure PowerShell script
- **GOTCHA**: PowerShell execution policy may block script execution - include instructions
- **EXACT CONTENT**: `Write-Host "Windows build completed successfully (no native binary required)" -ForegroundColor Green; exit 0`
- **VALIDATE**: `powershell -ExecutionPolicy Bypass -File native/build.ps1`

### CREATE native/build.bat

- **IMPLEMENT**: Batch file wrapper to call PowerShell script with proper execution policy
- **PATTERN**: Simple wrapper script calling PowerShell with bypass policy
- **IMPORTS**: No imports, calls PowerShell script
- **GOTCHA**: Must handle both PowerShell Core and Windows PowerShell
- **EXACT CONTENT**: `@echo off\npowershell.exe -ExecutionPolicy Bypass -File "%~dp0build.ps1"\nif %ERRORLEVEL% neq 0 exit /b %ERRORLEVEL%`
- **VALIDATE**: `native\build.bat`

### UPDATE package.json

- **IMPLEMENT**: Add Windows-specific build commands and update electron-builder Windows configuration
- **PATTERN**: Existing build script structure - file:package.json:8-15
- **IMPORTS**: No imports, JSON configuration
- **GOTCHA**: Windows build commands should use batch files, not bash scripts
- **EXACT CHANGES**: Add `"build:native:win": "native\\build.bat"`, update `"prebuild"` to use conditional native build, enhance `"win"` section with proper target and icon
- **VALIDATE**: `npm run build:native:win && npm run package`

### CREATE build/entitlements.win.xml

- **IMPLEMENT**: Windows application manifest for basic file system permissions
- **PATTERN**: XML manifest structure for Windows applications
- **IMPORTS**: No imports, XML manifest file
- **GOTCHA**: Must declare file system capabilities for proper Windows operation
- **VALIDATE**: `xmllint --noout build/entitlements.win.xml || echo "XML validation not available, manual review required"`

### UPDATE src/renderer/components/SettingsPage.tsx

- **IMPLEMENT**: Add conditional rendering for Windows calendar integration options
- **PATTERN**: Existing conditional rendering with useOSDetection - file:src/renderer/components/SettingsPage.tsx:200-250
- **IMPORTS**: Add `import { useOSDetection } from '../hooks/useOSDetection'`
- **GOTCHA**: Ensure Windows users see only Google Calendar and ICS options, not Apple Calendar
- **EXACT CHANGES**: Wrap Apple Calendar section with `{osInfo.isMacOS && ...}`, add Windows-specific messaging about available calendar options
- **VALIDATE**: `npm run build:renderer && echo "Settings page updated for Windows"`

### UPDATE src/renderer/components/CalendarImport.tsx

- **IMPLEMENT**: Hide Apple Calendar import functionality on Windows, keep Google Calendar and ICS imports
- **PATTERN**: Existing conditional rendering with useOSDetection - file:src/renderer/components/CalendarImport.tsx:100-150
- **IMPORTS**: Add `import { useOSDetection } from '../hooks/useOSDetection'`
- **GOTCHA**: Ensure Windows users only see Google Calendar and ICS file import options
- **EXACT CHANGES**: Wrap Apple Calendar button with `{osInfo.isMacOS && ...}`, update calendar source filtering to exclude Apple Calendar on Windows
- **VALIDATE**: `npm run build:renderer && echo "Calendar import updated for Windows"`

### CREATE src/renderer/components/WindowsCalendarAuth.tsx

- **IMPLEMENT**: Windows-specific calendar authentication component for Microsoft Graph OAuth
- **PATTERN**: GoogleCalendarAuth component structure - file:src/renderer/components/GoogleCalendarAuth.tsx:1-50
- **IMPORTS**: React hooks, Windows calendar types, IPC communication
- **GOTCHA**: Microsoft Graph requires different scopes and redirect handling than Google
- **VALIDATE**: `npm run build:renderer && echo "Windows calendar auth component created"`

### UPDATE src/main/preload.ts

- **IMPLEMENT**: Add Windows platform detection IPC API methods
- **PATTERN**: Existing IPC API structure - file:src/main/preload.ts:50-100
- **IMPORTS**: Add contextBridge methods for platform detection
- **GOTCHA**: Ensure type safety between main and renderer processes for platform detection APIs
- **EXACT CHANGES**: Add `getPlatformInfo: () => ipcRenderer.invoke('platform:getPlatformInfo')` to electronAPI object, update existing `isAppleScriptSupported` to use platform info
- **VALIDATE**: `npm run build:main && echo "Preload script updated with platform detection APIs"`

### CREATE tests/unit/platform-detector.test.ts

- **IMPLEMENT**: Comprehensive unit tests for platform detection service
- **PATTERN**: Existing service test structure - file:tests/unit/calendar-manager.test.ts:1-50
- **IMPORTS**: Jest testing utilities, PlatformDetector service, mock process.platform
- **GOTCHA**: Mock process.platform for different OS scenarios
- **EXACT TESTS**: Test Windows detection, macOS detection, capability detection, error handling
- **VALIDATE**: `npm test -- platform-detector.test.ts`

### CREATE tests/unit/windows-compatibility.test.ts

- **IMPLEMENT**: Test Windows-specific compatibility scenarios
- **PATTERN**: Existing compatibility test patterns
- **IMPORTS**: Jest utilities, services that need Windows compatibility
- **GOTCHA**: Test that macOS-specific methods fail gracefully on Windows
- **EXACT TESTS**: Test calendar manager Windows behavior, file path handling, UI conditional rendering
- **VALIDATE**: `npm test -- windows-compatibility.test.ts`

---

## TESTING STRATEGY

### Unit Tests

Design unit tests following existing Jest patterns in `tests/unit/` directory:

- **Platform Detection Tests**: Verify correct OS detection and capability reporting
- **File Path Handling Tests**: Verify cross-platform path normalization
- **UI Component Tests**: Test conditional rendering based on platform detection
- **Calendar Manager Tests**: Test that macOS-specific methods fail gracefully on Windows

### Integration Tests

Following existing Playwright patterns in `tests/e2e/` directory:

- **Cross-Platform File Operations**: Vault scanning and file watching on Windows
- **Build System Tests**: Verify Windows build process and packaging
- **UI Platform Detection**: Test that Apple Calendar options are hidden on Windows

### Edge Cases

- **Mixed Platform Environments**: WSL (Windows Subsystem for Linux) detection and handling
- **File System Limitations**: Windows path length limits and special characters
- **Permission Failures**: Windows file access scenarios
- **Network Connectivity**: Offline behavior for existing Google Calendar integration

---

## VALIDATION COMMANDS

Execute every command to ensure zero regressions and 100% feature correctness.

### Level 1: Syntax & Style

```bash
# TypeScript compilation
npx tsc --noEmit
npx tsc -p tsconfig.main.json --noEmit

# Linting (if configured)
npm run lint || echo "Linting not configured"
```

### Level 2: Unit Tests

```bash
# Run all unit tests
npm test

# Run Windows-specific tests
npm test -- --testNamePattern="windows|Windows"

# Run platform detection tests
npm test -- --testNamePattern="platform|Platform"
```

### Level 3: Integration Tests

```bash
# Run E2E tests
npm run test:e2e

# Run calendar integration tests
npm run test:e2e -- --grep "calendar"

# Run Windows-specific E2E tests
npm run test:e2e -- --grep "windows"
```

### Level 4: Manual Validation

```bash
# Build for Windows
npm run build
npm run package

# Test Windows calendar detection
node -e "
const { app } = require('electron');
app.whenReady().then(() => {
  const { PlatformDetector } = require('./dist/main/src/main/services/platform-detector.js');
  console.log(new PlatformDetector().getPlatformInfo());
  app.quit();
});
"

# Verify Windows build artifacts
ls -la out/ | grep -i win || echo "Windows build artifacts not found"
```

### Level 5: Additional Validation (Optional)

```bash
# Test on actual Windows machine (if available)
# npm run package && copy out/*.exe to Windows machine

# Verify existing Google Calendar integration still works
# npm test -- --testNamePattern="google-calendar"
```

---

## ACCEPTANCE CRITERIA

- [ ] Application detects Windows platform correctly and shows appropriate UI
- [ ] Apple Calendar integration is hidden on Windows systems
- [ ] Google Calendar and ICS file imports work correctly on Windows
- [ ] All file system operations work correctly on Windows (paths, permissions)
- [ ] Windows build process completes successfully and produces installable .exe
- [ ] Cross-platform file path handling works without hardcoded Unix assumptions
- [ ] UI components conditionally render based on platform capabilities
- [ ] No macOS-specific code executes on Windows systems
- [ ] Windows application manifest includes necessary permissions
- [ ] All existing functionality continues to work on macOS (no regressions)

---

## COMPLETION CHECKLIST

- [ ] All tasks completed in order
- [ ] Each task validation passed immediately
- [ ] All validation commands executed successfully
- [ ] Full test suite passes (unit + integration)
- [ ] No linting or type checking errors
- [ ] Manual testing confirms Windows support works
- [ ] Acceptance criteria all met
- [ ] Code reviewed for cross-platform compatibility

---

## NOTES

### Design Decisions

1. **No Windows Calendar Integration**: Focusing only on existing Google Calendar and ICS file imports to maintain simplicity and avoid additional API dependencies.

2. **Conditional Service Loading**: Calendar services are loaded conditionally based on platform to avoid importing macOS-specific dependencies on Windows.

3. **Build System Approach**: Maintaining separate build scripts for each platform rather than trying to create a universal script, ensuring platform-specific optimizations.

4. **UI Platform Detection**: Using capability-based detection (AppleScript support) rather than just OS detection for more robust platform-specific UI rendering.

### Trade-offs

- **Limited Windows Calendar Integration**: No native Windows calendar integration, but existing Google Calendar and ICS imports provide calendar functionality
- **Build Maintenance**: Separate build scripts require maintenance but ensure platform-specific optimization
- **Simplified Approach**: Focusing on compatibility rather than Windows-specific features reduces complexity

### Future Considerations

- **Windows Calendar Integration**: Microsoft Graph API integration can be added later if needed
- **Linux Support**: The platform detection infrastructure can be extended for Linux support in the future
- **Windows Store Distribution**: The Windows manifest enables potential Windows Store distribution
