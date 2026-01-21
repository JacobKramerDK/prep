# Feature: Apple Calendar Integration with Calendar Selection

The following plan should be complete, but its important that you validate documentation and codebase patterns and task sanity before you start implementing.

Pay special attention to naming of existing utils types and models. Import from the right files etc.

## Feature Description

Implement Apple Calendar integration with calendar selection functionality for macOS users. This feature allows users to choose which specific calendars from their Apple Calendar app they want to fetch events from, provides visual feedback on the front page showing connection status and calendar count, and ensures all Apple Calendar features are only visible on macOS systems.

## User Story

As a macOS user with multiple calendars in Apple Calendar
I want to select which specific calendars to sync with Prep
So that I can control which meeting data is imported and see clear connection status

## Problem Statement

Currently, the app has basic Apple Calendar integration through AppleScript and Swift backends, but lacks:
1. User control over which calendars to import from
2. Clear visual indication of Apple Calendar connection status on the front page
3. Display of how many calendars are being synced
4. Proper macOS-only visibility for Apple Calendar features

## Solution Statement

Extend the existing calendar integration architecture to add Apple Calendar-specific selection UI, connection status display, and ensure proper platform gating. This builds on the existing Google Calendar patterns while leveraging the current AppleScript/Swift calendar discovery system.

## Feature Metadata

**Feature Type**: Enhancement
**Estimated Complexity**: Medium
**Primary Systems Affected**: Calendar Manager, Calendar UI Components, Settings Management
**Dependencies**: Existing AppleScript/Swift calendar integration, OS detection system

---

## CONTEXT REFERENCES

### Relevant Codebase Files IMPORTANT: YOU MUST READ THESE FILES BEFORE IMPLEMENTING!

- `src/main/services/calendar-manager.ts` (lines 27-1092) - Why: Contains CalendarManager class with existing Apple Calendar integration patterns
- `src/renderer/components/CalendarImport.tsx` (lines 1-486) - Why: Main calendar import component with OS detection and Google Calendar patterns
- `src/renderer/components/GoogleCalendarAuth.tsx` (lines 1-185) - Why: Connection status display pattern to mirror for Apple Calendar
- `src/renderer/components/CalendarSelector.tsx` (lines 1-208) - Why: Existing calendar selection UI component
- `src/renderer/components/HomePage.tsx` (lines 1-415) - Why: Front page status display patterns
- `src/renderer/hooks/useOSDetection.ts` - Why: OS detection hook for macOS-only features
- `src/shared/types/calendar-selection.ts` - Why: Calendar selection data structures
- `src/shared/types/calendar.ts` (lines 1-95) - Why: Calendar event and source type definitions
- `src/main/index.ts` (lines 230-300) - Why: IPC handler patterns for calendar operations

### New Files to Create

- `src/renderer/components/AppleCalendarAuth.tsx` - Apple Calendar connection status component
- `src/shared/types/apple-calendar.ts` - Apple Calendar specific types and interfaces

### Relevant Documentation YOU SHOULD READ THESE BEFORE IMPLEMENTING!

- [Apple EventKit Documentation](https://developer.apple.com/videos/play/wwdc2023/10052/)
  - Specific section: Calendar access levels and permissions
  - Why: Understanding Apple Calendar integration patterns and permission requirements
- [React Component Patterns](https://react.dev/learn/thinking-in-react)
  - Specific section: Component composition and state management
  - Why: Proper React patterns for calendar selection UI

### Patterns to Follow

**OS Detection Pattern:**
```typescript
// From useOSDetection.ts and CalendarImport.tsx
const osInfo = useOSDetection()
if (osInfo.isMacOS) {
  // Show Apple Calendar features
}
```

**Connection Status Display Pattern:**
```typescript
// From GoogleCalendarAuth.tsx
<div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
  <div className="flex items-center space-x-3">
    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
    <div>
      <p className="text-sm font-medium text-green-800">Connected to Google Calendar</p>
      <p className="text-xs text-green-600">{userInfo.email}</p>
    </div>
  </div>
</div>
```

**Calendar Selection Pattern:**
```typescript
// From CalendarSelector.tsx
const handleCalendarToggle = (calendarName: string) => {
  const newSelection = selectedNames.includes(calendarName)
    ? selectedNames.filter(name => name !== calendarName)
    : [...selectedNames, calendarName]
  onSelectionChange(newSelection)
}
```

**IPC Handler Pattern:**
```typescript
// From main/index.ts
ipcMain.handle('calendar:discoverCalendars', async () => {
  return await calendarManager.discoverCalendars()
})
```

**Status Card Pattern:**
```typescript
// From HomePage.tsx CalendarStatusCard
<div className="bg-surface border border-border rounded-xl p-4 shadow-sm">
  <div className="flex items-center gap-3">
    <div className="w-10 h-10 rounded-lg bg-surface-hover border border-border flex items-center justify-center">
      <Calendar className="w-5 h-5 text-secondary" />
    </div>
    <div>
      <h3 className="text-sm font-semibold text-primary">Calendar</h3>
      <p className="text-sm text-secondary">Status message</p>
    </div>
  </div>
</div>
```

---

## IMPLEMENTATION PLAN

### Phase 1: Apple Calendar Types and Backend Extensions

Extend the existing calendar system to support Apple Calendar-specific selection and status tracking.

**Tasks:**
- Create Apple Calendar specific types
- Extend CalendarManager with Apple Calendar selection methods
- Add IPC handlers for Apple Calendar operations

### Phase 2: Apple Calendar Auth Component

Create a dedicated component for Apple Calendar connection status display, mirroring the Google Calendar pattern.

**Tasks:**
- Implement AppleCalendarAuth component
- Add connection status checking
- Integrate with existing calendar selection system

### Phase 3: Frontend Integration

Integrate Apple Calendar selection into the existing UI with proper OS detection.

**Tasks:**
- Update CalendarImport component with Apple Calendar selection
- Add Apple Calendar status to HomePage
- Ensure macOS-only visibility

### Phase 4: Settings Integration

Integrate Apple Calendar settings into the existing settings system.

**Tasks:**
- Update SettingsPage with Apple Calendar configuration
- Ensure settings persistence
- Add validation and error handling

---

## STEP-BY-STEP TASKS

IMPORTANT: Execute every task in order, top to bottom. Each task is atomic and independently testable.

### PRE-IMPLEMENTATION VALIDATION

- **VALIDATE**: Existing calendar integration works: `npm run dev` and test Apple Calendar extraction
- **VALIDATE**: OS detection works: Check `useOSDetection` hook returns correct macOS detection
- **VALIDATE**: Calendar discovery works: Test `window.electronAPI.discoverCalendars()` in dev tools
- **VALIDATE**: Permission handling works: Test calendar permission scenarios

### CREATE src/shared/types/apple-calendar.ts

- **IMPLEMENT**: Apple Calendar specific types and interfaces with comprehensive error handling
- **PATTERN**: Mirror Google Calendar types structure from `src/shared/types/google-calendar.ts`
- **IMPORTS**: Import CalendarError from calendar.ts
- **GOTCHA**: Add AppleCalendarPermissionState type: 'unknown' | 'granted' | 'denied' | 'checking'
- **GOTCHA**: Add AppleCalendarStatus interface with permission state and selected calendar count
- **GOTCHA**: Keep consistent with existing CalendarSource type in calendar.ts
- **VALIDATE**: `npm run build:main && npm run build:renderer`

### UPDATE src/shared/types/calendar.ts

- **IMPLEMENT**: Add 'apple' to CalendarSource union type if not already present
- **PATTERN**: Follow existing source type pattern - line 1
- **IMPORTS**: None required
- **GOTCHA**: Ensure 'apple' source is distinct from 'applescript' and 'swift'
- **VALIDATE**: `npm run build:main && npm run build:renderer`

### UPDATE src/main/services/calendar-manager.ts

- **IMPLEMENT**: Add Apple Calendar selection methods and status tracking with permission state caching
- **PATTERN**: Mirror Google Calendar methods structure - lines 1000-1092
- **IMPORTS**: Import AppleCalendarSettings from new types file
- **GOTCHA**: Add permission state caching to prevent repeated permission checks - cache for 5 minutes
- **GOTCHA**: Reuse existing checkAppleScriptPermissions method (line 469) - don't duplicate
- **GOTCHA**: Add isAppleCalendarAvailable() method that checks both platform and permissions
- **VALIDATE**: `npm run build:main`

### ADD src/main/index.ts

- **IMPLEMENT**: IPC handlers for Apple Calendar selection and status
- **PATTERN**: Follow existing calendar IPC handler pattern - lines 237-290
- **IMPORTS**: Import new Apple Calendar types
- **GOTCHA**: Use existing calendar manager methods, don't duplicate functionality
- **VALIDATE**: `npm run build:main`

### CREATE src/renderer/components/AppleCalendarAuth.tsx

- **IMPLEMENT**: Apple Calendar connection status component with permission state handling
- **PATTERN**: Mirror GoogleCalendarAuth.tsx structure and styling (lines 1-185)
- **IMPORTS**: React hooks, OS detection hook, Apple Calendar types, CalendarError
- **GOTCHA**: Use existing calendar discovery and selection APIs, not separate auth flow
- **GOTCHA**: Handle permission states: 'unknown' | 'granted' | 'denied' | 'checking'
- **GOTCHA**: Add retry mechanism for permission denied scenarios
- **GOTCHA**: Show helpful permission instructions for macOS System Preferences
- **VALIDATE**: `npm run build:renderer`

### UPDATE src/renderer/components/CalendarImport.tsx

- **IMPLEMENT**: Add Apple Calendar selection UI with OS detection
- **PATTERN**: Follow existing Google Calendar integration pattern - lines 1-100
- **IMPORTS**: Add AppleCalendarAuth component import
- **GOTCHA**: Only show Apple Calendar section when osInfo.isMacOS is true
- **VALIDATE**: `npm run build:renderer`

### UPDATE src/renderer/components/HomePage.tsx

- **IMPLEMENT**: Add Apple Calendar status to CalendarStatusCard
- **PATTERN**: Extend existing CalendarStatusCard component - lines 10-60
- **IMPORTS**: Add Apple Calendar status props
- **GOTCHA**: Show combined status for both Google and Apple Calendar connections
- **VALIDATE**: `npm run build:renderer`

### UPDATE src/renderer/components/SettingsPage.tsx

- **IMPLEMENT**: Add Apple Calendar settings section with OS detection
- **PATTERN**: Follow existing Google Calendar settings pattern
- **IMPORTS**: Add AppleCalendarAuth component import, OS detection hook
- **GOTCHA**: Only render Apple Calendar settings on macOS
- **VALIDATE**: `npm run build:renderer`

### UPDATE src/renderer/App.tsx

- **IMPLEMENT**: Add Apple Calendar status state management with proper status refresh mechanism
- **PATTERN**: Follow existing calendar status management pattern - lines 100-189
- **IMPORTS**: Add Apple Calendar status types
- **GOTCHA**: Create refreshCalendarStatus() method that updates both Google and Apple status
- **GOTCHA**: Add useEffect to refresh status after settings changes
- **GOTCHA**: Use combined status type: 'checking' | 'connected' | 'partial' | 'disconnected' | 'error'
- **VALIDATE**: `npm run build:renderer && npm run dev`

---

## TESTING STRATEGY

### Unit Tests

Design unit tests following existing calendar testing patterns in `tests/unit/calendar-*.test.ts`:

- Apple Calendar type validation
- Calendar selection state management
- OS detection integration
- IPC handler functionality

### Integration Tests

Following existing patterns in `tests/e2e/calendar-*.spec.ts`:

- Apple Calendar selection workflow
- macOS-only feature visibility
- Connection status display accuracy
- Settings persistence

### Edge Cases

- Non-macOS systems (features should be hidden)
- No calendars available in Apple Calendar
- Calendar permission denied scenarios
- Mixed Google + Apple Calendar usage

---

## VALIDATION COMMANDS

Execute every command to ensure zero regressions and 100% feature correctness.

### Level 1: Syntax & Style

```bash
npm run build:main
npm run build:renderer
npm run type-check
```

### Level 2: Unit Tests

```bash
npm run test:unit
npm run test:unit -- --testPathPattern=calendar
npm run test:unit -- --testPathPattern=apple-calendar
```

**Specific Test Cases to Validate:**
- Permission state caching behavior
- Error handling for permission denied scenarios
- OS detection integration
- Calendar selection state persistence
- Status refresh mechanisms

### Level 3: Integration Tests

```bash
npm run test:e2e
npm run test:e2e -- --grep "calendar"
```

### Level 4: Manual Validation

**macOS Testing:**
- Open app on macOS system
- Verify Apple Calendar section appears in Calendar Import
- Test calendar selection functionality
- Verify status display on HomePage
- Check settings integration

**Non-macOS Testing:**
- Open app on Windows/Linux system
- Verify Apple Calendar features are hidden
- Ensure no errors or broken UI elements

### Level 5: Additional Validation (Optional)

```bash
# If available via MCP servers
npm run test:accessibility
npm run test:performance
```

---

## ACCEPTANCE CRITERIA

- [ ] Apple Calendar selection UI appears only on macOS systems
- [ ] Users can select/deselect specific Apple calendars to sync
- [ ] HomePage shows Apple Calendar connection status and calendar count
- [ ] Settings page includes Apple Calendar configuration section
- [ ] All Apple Calendar features are hidden on non-macOS systems
- [ ] Integration works alongside existing Google Calendar functionality
- [ ] Calendar selection persists across app restarts
- [ ] Error handling for calendar permission issues
- [ ] UI follows existing design patterns and styling
- [ ] No regressions in existing calendar functionality

---

## COMPLETION CHECKLIST

- [ ] All tasks completed in order
- [ ] Each task validation passed immediately
- [ ] All validation commands executed successfully
- [ ] Full test suite passes (unit + integration)
- [ ] No linting or type checking errors
- [ ] Manual testing confirms feature works on macOS
- [ ] Manual testing confirms features hidden on non-macOS
- [ ] Acceptance criteria all met
- [ ] Code reviewed for quality and maintainability

---

## NOTES

**Design Decisions:**
- Reuse existing AppleScript/Swift calendar discovery rather than creating separate Apple Calendar auth flow
- Extend existing CalendarStatusCard to show combined Google + Apple status
- Follow established OS detection patterns for feature visibility
- Maintain consistency with Google Calendar UI patterns

**Technical Considerations:**
- Apple Calendar integration uses existing calendar discovery and extraction methods
- No separate authentication required (uses system calendar permissions)
- Calendar selection settings stored alongside existing calendar preferences
- Status display shows aggregate information from both calendar sources
- Permission state caching prevents repeated system calls
- Graceful degradation when permissions are denied

**Rollback Strategy:**
- All changes are additive - existing functionality remains unchanged
- Apple Calendar features are opt-in and macOS-only
- If issues arise, disable Apple Calendar features via feature flag
- Existing Google Calendar and ICS import remain fully functional

**Future Enhancements:**
- Individual calendar enable/disable toggles
- Calendar-specific sync scheduling
- Enhanced calendar metadata display (color, type, etc.)
