# Feature: Swift Calendar Integration

The following plan should be complete, but its important that you validate documentation and codebase patterns and task sanity before you start implementing.

Pay special attention to naming of existing utils types and models. Import from the right files etc.

## Feature Description

Replace the slow and unstable AppleScript-based calendar integration with a fast, native Swift CLI tool that uses EventKit to fetch calendar events in <100ms instead of 30+ seconds. This will dramatically improve user experience and reliability of calendar data extraction while maintaining full compatibility with the existing CalendarManager API.

## User Story

As a Prep user on macOS
I want calendar events to load quickly and reliably
So that I can get meeting context without waiting 30+ seconds for AppleScript to complete

## Problem Statement

The current AppleScript-based calendar integration has critical performance and reliability issues:
- **Performance**: Takes 30+ seconds for large calendars vs <100ms with Swift
- **Reliability**: AppleScript parsing is error-prone with string manipulation
- **Maintenance**: Complex quote escaping and temporary file management
- **User Experience**: Long loading times and frequent timeouts frustrate users

## Solution Statement

Implement a native Swift CLI binary that uses EventKit framework for direct calendar access, providing JSON output for easy parsing. The Swift binary will be built during the Electron packaging process and distributed with the app, eliminating external dependencies while providing native performance.

## Feature Metadata

**Feature Type**: Enhancement
**Estimated Complexity**: Medium
**Primary Systems Affected**: CalendarManager, Build System, Electron Packaging
**Dependencies**: Swift compiler (Xcode Command Line Tools), EventKit framework
**Risk Mitigation**: Toolchain validation, precompiled fallbacks, graceful degradation

---

## CONTEXT REFERENCES

### Relevant Codebase Files IMPORTANT: YOU MUST READ THESE FILES BEFORE IMPLEMENTING!

- `src/main/services/calendar-manager.ts` (lines 1-600) - Why: Contains existing AppleScript patterns, error handling, and API structure to maintain
- `src/shared/types/calendar.ts` (lines 1-100) - Why: CalendarEvent interface and IPC serialization patterns to follow
- `package.json` (lines 1-80) - Why: Build scripts and dependency patterns for native binary integration
- `electron-builder.yml` (lines 1-50) - Why: Packaging configuration for including native binaries
- `swift-calendar-helper.md` (lines 1-300) - Why: Complete Swift implementation reference and build patterns

### New Files to Create

- `native/CalendarHelper.swift` - Swift EventKit implementation for calendar extraction
- `native/build.sh` - Build script for universal Swift binary compilation with toolchain validation
- `native/precompiled/` - Directory for precompiled binaries (x64, arm64) as fallbacks
- `build/entitlements.mac.plist` - macOS entitlements for calendar access permissions
- `src/main/services/swift-calendar-manager.ts` - New Swift-based calendar service implementation

### Relevant Documentation YOU SHOULD READ THESE BEFORE IMPLEMENTING!

- [EventKit Framework Documentation](https://developer.apple.com/documentation/eventkit)
  - Specific section: EKEventStore and EKEvent classes
  - Why: Required for understanding Swift calendar API patterns
- [Electron Builder Extra Resources](https://www.electron.build/configuration/contents#extraresources)
  - Specific section: Including native binaries in packaged apps
  - Why: Shows proper binary distribution patterns
- [macOS Code Signing and Entitlements](https://developer.apple.com/documentation/security/hardened_runtime)
  - Specific section: Calendar access entitlements
  - Why: Required for calendar permission handling

### Patterns to Follow

**Error Handling Pattern** (from calendar-manager.ts lines 160-180):
```typescript
const isPermissionError = error?.code === 'EACCES' || 
                         errorMessage.includes('not allowed') || 
                         errorMessage.includes('permission')

if (isPermissionError) {
  throw new CalendarError(
    'Calendar access permission required...',
    'PERMISSION_DENIED',
    error instanceof Error ? error : undefined
  )
}
```

**Atomic Operation Pattern** (from calendar-manager.ts lines 30-50):
```typescript
if (this.isExtracting && this.appleScriptPromise) {
  return this.appleScriptPromise
}
this.isExtracting = true
this.appleScriptPromise = this.performExtraction()
```

**Date Parsing Pattern** (from calendar-manager.ts lines 200-220):
```typescript
const parsed = new Date(cleanDate)
if (isNaN(parsed.getTime())) {
  throw new Error(`Invalid date format: ${dateStr}`)
}
```

**IPC Serialization Pattern** (from calendar.ts lines 50-70):
```typescript
export function calendarEventToIPC(event: CalendarEvent): CalendarEventIPC {
  return {
    ...event,
    startDate: event.startDate.toISOString(),
    endDate: event.endDate.toISOString()
  }
}
```

---

## IMPLEMENTATION PLAN

### Phase 1: Swift Binary Foundation

Set up the Swift CLI tool with EventKit integration, build system, and toolchain validation.

**Tasks:**
- Validate Swift toolchain availability and version requirements
- Create Swift source with EventKit calendar extraction
- Implement universal binary build script with fallback handling
- Add precompiled binaries for common architectures
- Add calendar access entitlements configuration
- Integrate native build into package.json scripts with validation

### Phase 2: Node.js Integration Layer

Create the TypeScript service layer that interfaces with the Swift binary.

**Tasks:**
- Implement SwiftCalendarManager class with existing API compatibility
- Add binary path resolution for development vs packaged modes
- Add Swift binary availability detection and fallback logic
- Implement JSON parsing and CalendarEvent conversion
- Add comprehensive error handling with existing error patterns

### Phase 3: Build System Integration

Integrate Swift compilation into the Electron build and packaging process.

**Tasks:**
- Configure electron-builder to include native binary
- Add prebuild script to compile Swift binary
- Update entitlements for calendar access permissions
- Test cross-architecture builds (x64 + arm64)

### Phase 4: CalendarManager Migration

Update the existing CalendarManager to use Swift backend while maintaining API compatibility.

**Tasks:**
- Add Swift backend option to CalendarManager
- Implement feature flag for gradual rollout
- Maintain AppleScript fallback for compatibility
- Update performance metrics and caching logic

---

## STEP-BY-STEP TASKS

IMPORTANT: Execute every task in order, top to bottom. Each task is atomic and independently testable.

### VALIDATE Development Environment

- **CHECK**: Swift toolchain availability and version requirements
- **INSTALL**: Xcode Command Line Tools if Swift missing
- **VERIFY**: Binary compilation capabilities on current system
- **FALLBACK**: Precompiled binary availability for offline development
- **VALIDATE**: `swift --version && which swiftc`

### CREATE native/CalendarHelper.swift

- **IMPLEMENT**: EventKit-based calendar extraction with JSON output
- **PATTERN**: Swift date formatting using ISO8601DateFormatter - swift-calendar-helper.md:25-35
- **IMPORTS**: `import EventKit`, `import Foundation` for calendar and JSON handling
- **GOTCHA**: Must request calendar access permission before accessing events
- **VALIDATE**: `swift -v` (ensure Swift compiler available)

### CREATE native/build.sh

- **IMPLEMENT**: Universal binary compilation script with toolchain validation and fallback handling
- **PATTERN**: Multi-architecture build using lipo with error handling - swift-calendar-helper.md:45-60
- **IMPORTS**: No imports, bash script with swiftc, lipo, and validation commands
- **GOTCHA**: Must validate Swift availability before compilation, use precompiled fallback if needed
- **VALIDATE**: `chmod +x native/build.sh && ./native/build.sh`

### CREATE native/precompiled/

- **IMPLEMENT**: Directory structure with precompiled binaries for x64 and arm64
- **PATTERN**: Binary organization by architecture for fallback scenarios
- **IMPORTS**: No imports, directory structure with binary files
- **GOTCHA**: Binaries must be executable and properly signed for distribution
- **VALIDATE**: `file native/precompiled/calendar-helper-*`

### CREATE build/entitlements.mac.plist

- **IMPLEMENT**: macOS entitlements for calendar access and hardened runtime
- **PATTERN**: XML plist format with calendar permission key - swift-calendar-helper.md:120-135
- **IMPORTS**: Standard plist XML structure with Apple DTD
- **GOTCHA**: Must include both calendar access and hardened runtime entitlements
- **VALIDATE**: `plutil -lint build/entitlements.mac.plist`

### UPDATE package.json

- **IMPLEMENT**: Add check-swift, build:native scripts and prebuild hook with validation
- **PATTERN**: Script organization from existing build scripts - package.json:8-15
- **IMPORTS**: No imports, JSON configuration updates with toolchain validation
- **GOTCHA**: prebuild must validate Swift availability and use fallbacks if needed
- **VALIDATE**: `npm run check-swift && npm run build:native`

### CREATE src/main/services/swift-calendar-manager.ts

- **IMPLEMENT**: SwiftCalendarManager class with binary detection and graceful fallback
- **PATTERN**: Class structure and error handling from calendar-manager.ts:1-50
- **IMPORTS**: `import { execFile } from 'child_process'`, `import { CalendarEvent, CalendarError } from '../../shared/types/calendar'`, `import * as fs from 'fs'`
- **GOTCHA**: Must check binary availability before execution and fallback gracefully
- **VALIDATE**: `npm run build:main && node -e "require('./dist/main/src/main/services/swift-calendar-manager').SwiftCalendarManager"`

### UPDATE electron-builder.yml

- **IMPLEMENT**: Add extraResources configuration for native binary inclusion
- **PATTERN**: Resource inclusion pattern from existing files configuration - electron-builder.yml:10-20
- **IMPORTS**: No imports, YAML configuration updates
- **GOTCHA**: Binary must be in extraResources, not files, for proper packaging
- **VALIDATE**: `npm run package` (test packaging includes binary)

### UPDATE src/main/services/calendar-manager.ts

- **IMPLEMENT**: Add Swift backend integration with feature flag and fallback logic
- **PATTERN**: Existing method structure and atomic operations - calendar-manager.ts:25-75
- **IMPORTS**: `import { SwiftCalendarManager } from './swift-calendar-manager'`
- **GOTCHA**: Must maintain exact API compatibility and graceful degradation to AppleScript
- **VALIDATE**: `npm run build:main && npm run test -- --testPathPattern=calendar`

### ADD Binary Verification Task

- **IMPLEMENT**: Verification commands for binary architecture and dependencies
- **PATTERN**: Standard binary inspection using file and otool commands
- **IMPORTS**: No imports, shell commands for binary analysis
- **GOTCHA**: Commands may not be available on all systems, add conditional checks
- **VALIDATE**: `file resources/bin/calendar-helper && otool -L resources/bin/calendar-helper`

### UPDATE src/shared/types/calendar.ts

- **IMPLEMENT**: Add 'swift' source type to CalendarEvent interface
- **PATTERN**: Existing source type union - calendar.ts:10
- **IMPORTS**: No new imports, interface extension only
- **GOTCHA**: Must update all type guards and serialization functions
- **VALIDATE**: `npm run build && npm run test`

---

## TESTING STRATEGY

### Unit Tests

Design unit tests following existing Jest patterns in the project:

- **SwiftCalendarManager**: Mock execFile calls, test JSON parsing, error handling, binary detection
- **Binary Path Resolution**: Test development vs packaged path logic with fallbacks
- **Date Conversion**: Test ISO8601 parsing and CalendarEvent creation
- **Error Mapping**: Test Swift error codes to CalendarError mapping
- **Toolchain Validation**: Mock Swift availability checks and fallback behavior
- **Graceful Degradation**: Test AppleScript fallback when Swift binary unavailable

### Integration Tests

- **End-to-End Binary Execution**: Test actual Swift binary with real calendar data
- **Permission Handling**: Test calendar access permission flows
- **Performance Benchmarks**: Compare Swift vs AppleScript execution times
- **Cross-Architecture**: Test universal binary on both Intel and Apple Silicon

### Edge Cases

- **Empty Calendar Response**: Handle calendars with no events
- **Permission Denied**: Test graceful handling of calendar access denial
- **Binary Not Found**: Test fallback behavior when Swift binary missing
- **Malformed JSON**: Test parsing of corrupted Swift binary output
- **Large Calendar Sets**: Test performance with 1000+ events

---

## VALIDATION COMMANDS

Execute every command to ensure zero regressions and 100% feature correctness.

### Level 1: Syntax & Style

```bash
# Swift toolchain validation
swift --version || echo "Install Xcode Command Line Tools: xcode-select --install"
which swiftc || echo "Swift compiler not found"

# TypeScript compilation
npm run build:main
npm run build:renderer

# Swift compilation with fallback
cd native && ./build.sh

# Entitlements validation
plutil -lint build/entitlements.mac.plist

# Binary verification
file resources/bin/calendar-helper  # Verify universal binary
otool -L resources/bin/calendar-helper || echo "Binary analysis tools not available"
```

### Level 2: Unit Tests

```bash
# Run existing test suite
npm run test

# Run with coverage
npm run test:coverage

# Test specific calendar functionality with mocks
npm run test -- --testPathPattern=calendar

# Test Swift binary detection and fallback logic
npm run test -- --testNamePattern="swift.*fallback"
```

### Level 3: Integration Tests

```bash
# Test Swift binary directly
./resources/bin/calendar-helper

# Test packaged application
npm run package
open out/Prep-*.dmg

# Test calendar permissions
# Manual: Launch app and verify calendar permission dialog
```

### Level 4: Manual Validation

```bash
# Performance comparison test
time osascript -e 'tell application "Calendar" to return events'
time ./resources/bin/calendar-helper

# Calendar data accuracy test
# Manual: Compare Swift output with Calendar.app events for today

# Cross-platform build test
npm run package
ls -la out/  # Verify all platform builds succeeded
```

### Level 5: Additional Validation (Optional)

```bash
# Code signing verification (if certificates available)
codesign -dv --verbose=4 out/mac/Prep.app

# Binary architecture verification
lipo -info resources/bin/calendar-helper

# Memory usage profiling
# Manual: Monitor memory usage during large calendar extraction
```

---

## ACCEPTANCE CRITERIA

- [ ] Swift binary compiles successfully for both x64 and arm64 architectures
- [ ] Toolchain validation prevents build failures with helpful error messages
- [ ] Precompiled binary fallbacks work when Swift compiler unavailable
- [ ] Calendar extraction completes in <100ms vs 30+ seconds with AppleScript
- [ ] All existing CalendarManager API methods maintain exact compatibility
- [ ] Graceful degradation to AppleScript when Swift binary unavailable
- [ ] Calendar permission handling works identically to AppleScript version
- [ ] JSON output parsing produces identical CalendarEvent objects
- [ ] Binary is properly included in packaged Electron applications
- [ ] All existing unit tests pass without modification
- [ ] New unit tests cover binary detection and fallback scenarios
- [ ] Performance improvement is measurable and consistent
- [ ] macOS entitlements properly grant calendar access permissions

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
- [ ] Performance benchmarks show expected improvements
- [ ] Binary packaging works across all target platforms

---

## NOTES

### Design Decisions

**Universal Binary Approach**: Using lipo to create universal binaries ensures compatibility with both Intel and Apple Silicon Macs without requiring separate builds or runtime detection.

**Toolchain Validation Strategy**: Proactive Swift compiler detection with helpful error messages prevents build failures and guides developers through setup requirements.

**Precompiled Binary Fallbacks**: Including precompiled binaries in the repository ensures the application can be built and distributed even without Swift toolchain availability.

**JSON Output Format**: Swift binary outputs JSON for easy parsing, eliminating the complex string parsing required with AppleScript output.

**Gradual Migration with Feature Flag**: Maintaining AppleScript fallback allows for safe rollout and rollback if issues arise with the Swift implementation.

**Build Integration**: Using prebuild hooks with validation ensures the Swift binary is always available when packaging, preventing runtime errors.

### Performance Expectations

- **AppleScript**: 30+ seconds for large calendars
- **Swift + EventKit**: <100ms for same calendars
- **Memory Usage**: Significantly lower due to native binary vs Node.js AppleScript execution
- **Reliability**: JSON parsing vs string manipulation reduces error rates by ~90%

### Security Considerations

- **Entitlements**: Calendar access permission properly declared in entitlements
- **Code Signing**: Binary will be signed automatically during electron-builder packaging
- **Sandboxing**: EventKit provides secure calendar access without file system exposure
- **Permission Flow**: Identical to AppleScript - macOS handles permission dialogs automatically
- **Binary Integrity**: Precompiled binaries include checksums for verification
- **Fallback Security**: AppleScript fallback maintains same security model
