# Feature: Automate Calendar Fetching with Daily Sync

The following plan should be complete, but its important that you validate documentation and codebase patterns and task sanity before you start implementing.

Pay special attention to naming of existing utils types and models. Import from the right files etc.

## Feature Description

Automate the calendar data fetching process so that when users open the app, they immediately see today's meetings from their connected Apple Calendar (macOS) and Google Calendar accounts. The app should automatically fetch fresh calendar data when opened each day, eliminating the need for manual calendar imports while maintaining the existing connection storage.

## User Story

As a knowledge worker using Prep
I want the app to automatically show today's meetings from my connected calendars when I open it
So that I can immediately see my daily schedule without manually importing calendar data each time

## Problem Statement

Currently, users must manually trigger calendar imports each time they want to see their meetings. While the calendar connections (Apple Calendar and Google Calendar) are already established and stored, the app doesn't automatically fetch fresh meeting data when opened. This creates friction in the daily workflow and reduces the app's effectiveness as a meeting preparation tool.

## Solution Statement

Implement an automatic calendar sync system that:
1. Detects existing calendar connections on app startup
2. Automatically fetches today's meetings from connected calendars
3. Updates the main page view with fresh meeting data
4. Handles daily refresh logic to ensure data stays current
5. Provides background sync capabilities with proper error handling

## Feature Metadata

**Feature Type**: Enhancement
**Estimated Complexity**: Medium
**Primary Systems Affected**: Calendar Manager, Settings Manager, Main App UI, IPC Communication
**Dependencies**: node-schedule (for scheduling), existing calendar integrations

---

## CONTEXT REFERENCES

### Relevant Codebase Files IMPORTANT: YOU MUST READ THESE FILES BEFORE IMPLEMENTING!

- `src/main/services/calendar-manager.ts` (lines 1-100) - Why: Contains existing calendar integration patterns and connection management
- `src/main/services/settings-manager.ts` (lines 1-100) - Why: Handles calendar connection storage and retrieval patterns
- `src/main/services/google-calendar-manager.ts` (lines 1-50) - Why: Google Calendar API integration patterns
- `src/main/services/swift-calendar-manager.ts` - Why: Apple Calendar integration patterns
- `src/main/index.ts` (lines 200-290) - Why: Existing IPC handlers for calendar operations
- `src/renderer/App.tsx` (lines 1-150) - Why: Current app startup and meeting loading patterns
- `src/renderer/components/TodaysMeetings.tsx` - Why: Meeting display component that needs automatic updates

### New Files to Create

- `src/main/services/calendar-sync-scheduler.ts` - Automatic sync scheduling service
- `src/shared/types/calendar-sync.ts` - Type definitions for sync operations

### Relevant Documentation YOU SHOULD READ THESE BEFORE IMPLEMENTING!

- [Node Schedule Documentation](https://www.npmjs.com/package/node-schedule)
  - Specific section: Cron-style scheduling and recurrence rules
  - Why: Required for implementing daily sync scheduling
- [Electron Power Monitor API](https://www.electronjs.org/docs/latest/api/power-monitor)
  - Specific section: Resume event handling
  - Why: Needed to handle computer sleep/wake cycles for reliable scheduling

### Patterns to Follow

**Calendar Connection Detection Pattern:**
```typescript
// From settings-manager.ts
async isGoogleCalendarConnected(): Promise<boolean> {
  return this.store.get('googleCalendarConnected', false)
}

async getGoogleCalendarRefreshToken(): Promise<string | null> {
  return this.store.get('googleCalendarRefreshToken', null)
}
```

**Calendar Event Fetching Pattern:**
```typescript
// From calendar-manager.ts
async getGoogleCalendarEvents(): Promise<CalendarImportResult> {
  const refreshToken = await this.settingsManager.getGoogleCalendarRefreshToken()
  if (!refreshToken) {
    throw new CalendarError('Google Calendar not connected', 'NOT_CONNECTED')
  }
  return await this.googleCalendarManager.getEvents(refreshToken)
}
```

**IPC Handler Pattern:**
```typescript
// From index.ts
ipcMain.handle('calendar:getEvents', async () => {
  return await calendarManager.getEvents()
})
```

**App Startup Loading Pattern:**
```typescript
// From App.tsx
useEffect(() => {
  const loadExistingEvents = async (): Promise<void> => {
    try {
      const existingEvents = await window.electronAPI.getCalendarEvents()
      if (existingEvents && existingEvents.length > 0) {
        setCalendarEvents(existingEvents)
      }
    } catch (error) {
      console.error('Failed to load existing calendar events:', error)
    }
  }
  loadExistingEvents()
}, [])
```

---

## IMPLEMENTATION PLAN

### Phase 1: Calendar Sync Scheduler Service

Create the core scheduling service that manages automatic calendar synchronization with proper error handling and computer sleep/wake support.

**Tasks:**
- Implement calendar sync scheduler with node-schedule
- Add power monitor integration for sleep/wake handling
- Create sync status tracking and error recovery

### Phase 2: Enhanced Calendar Manager Integration

Extend the existing calendar manager to support automatic sync operations and connection detection.

**Tasks:**
- Add automatic sync methods to calendar manager
- Implement connection status checking
- Add daily sync logic with proper caching

### Phase 3: App Startup Integration

Modify the main app startup flow to automatically trigger calendar sync when the app opens.

**Tasks:**
- Update main process initialization
- Add new IPC handlers for automatic sync
- Integrate sync scheduler with app lifecycle

### Phase 4: UI Updates and Error Handling

Update the React frontend to handle automatic calendar updates and provide user feedback.

**Tasks:**
- Modify App.tsx to trigger automatic sync
- Add loading states and error handling
- Update TodaysMeetings component for automatic updates

---

## STEP-BY-STEP TASKS

IMPORTANT: Execute every task in order, top to bottom. Each task is atomic and independently testable.

### CREATE src/shared/types/calendar-sync.ts

- **IMPLEMENT**: Type definitions for calendar sync operations
- **PATTERN**: Follow existing type patterns from calendar.ts and calendar-selection.ts
- **IMPORTS**: None (pure type definitions)
- **GOTCHA**: Ensure compatibility with existing CalendarEvent and CalendarImportResult types
- **VALIDATE**: `npm run build:main && npm run build:renderer`

### CREATE src/main/services/calendar-sync-scheduler.ts

- **IMPLEMENT**: Calendar sync scheduling service with node-schedule integration
- **PATTERN**: Mirror service structure from existing managers (constructor, private methods, public interface)
- **IMPORTS**: `import * as schedule from 'node-schedule'; import { powerMonitor } from 'electron'; import { CalendarManager } from './calendar-manager'`
- **SPECIFIC IMPLEMENTATION**:
  ```typescript
  // Use cron pattern '0 6 * * *' for 6 AM daily sync
  // Store job reference: private dailySyncJob: schedule.Job | null = null
  // Power monitor: powerMonitor.on('resume', () => this.rescheduleIfNeeded())
  // Sync method: private async performSync(): Promise<void>
  ```
- **GOTCHA**: Handle computer sleep/wake cycles properly to maintain reliable scheduling
- **VALIDATE**: `npm test -- --testPathPattern=calendar-sync-scheduler`

### UPDATE src/main/services/calendar-manager.ts

- **IMPLEMENT**: Add automatic sync methods and connection detection
- **PATTERN**: Follow existing method patterns like `extractAppleScriptEvents` and `getGoogleCalendarEvents`
- **IMPORTS**: Add CalendarSyncScheduler import
- **SPECIFIC METHODS TO ADD**:
  ```typescript
  async performAutomaticSync(): Promise<CalendarImportResult>
  async hasConnectedCalendars(): Promise<boolean>
  async syncTodaysEvents(): Promise<CalendarEvent[]>
  ```
- **GOTCHA**: Maintain existing caching behavior while adding automatic refresh logic
- **VALIDATE**: `npm test -- --testPathPattern=calendar-manager`

### UPDATE src/main/index.ts

- **IMPLEMENT**: Initialize calendar sync scheduler and add new IPC handlers
- **PATTERN**: Follow existing IPC handler patterns around line 260-290
- **IMPORTS**: `import { CalendarSyncScheduler } from './services/calendar-sync-scheduler'`
- **SPECIFIC ADDITIONS**:
  ```typescript
  // After line 45: const calendarSyncScheduler = new CalendarSyncScheduler(calendarManager)
  // New IPC handlers:
  ipcMain.handle('calendar:startAutoSync', async () => {})
  ipcMain.handle('calendar:getAutoSyncStatus', async () => {})
  ```
- **GOTCHA**: Ensure proper cleanup on app exit with `calendarSyncScheduler.dispose()`
- **VALIDATE**: `npm run build:main`

### UPDATE src/main/preload.ts

- **IMPLEMENT**: Add IPC methods for automatic calendar sync
- **PATTERN**: Follow existing calendar method patterns around lines 108-124
- **IMPORTS**: None (uses existing ipcRenderer)
- **GOTCHA**: Maintain type safety with existing ElectronAPI interface
- **VALIDATE**: `npm run build:main`

### UPDATE src/shared/types/ipc.ts

- **IMPLEMENT**: Add automatic sync methods to ElectronAPI interface
- **PATTERN**: Follow existing calendar method signatures
- **IMPORTS**: Add calendar-sync types
- **GOTCHA**: Ensure all new methods have proper return type definitions
- **VALIDATE**: `npm run build:renderer`

### UPDATE src/renderer/App.tsx

- **IMPLEMENT**: Add automatic calendar sync on app startup
- **PATTERN**: Follow existing `loadExistingEvents` pattern around lines 70-85
- **IMPORTS**: None (uses existing window.electronAPI)
- **SPECIFIC IMPLEMENTATION**:
  ```typescript
  // Add to existing useEffect after loadExistingEvents():
  const performAutoSync = async (): Promise<void> => {
    try {
      await window.electronAPI.startAutoSync()
      const events = await window.electronAPI.getCalendarEvents()
      setCalendarEvents(events)
    } catch (error) {
      console.error('Auto sync failed:', error)
    }
  }
  performAutoSync()
  ```
- **GOTCHA**: Handle loading states and error conditions gracefully
- **VALIDATE**: `npm run dev:renderer` and test app startup

### CREATE tests/unit/calendar-sync-scheduler.test.ts

- **IMPLEMENT**: Unit tests for calendar sync scheduler
- **PATTERN**: Follow existing test patterns from calendar-manager.test.ts
- **IMPORTS**: Jest, calendar sync scheduler, mock dependencies
- **GOTCHA**: Mock node-schedule and powerMonitor properly
- **VALIDATE**: `npm test -- --testPathPattern=calendar-sync-scheduler`

### UPDATE tests/unit/calendar-manager.test.ts

- **IMPLEMENT**: Add tests for new automatic sync methods
- **PATTERN**: Follow existing test structure and mocking patterns
- **IMPORTS**: Add calendar sync types
- **GOTCHA**: Ensure existing tests still pass
- **VALIDATE**: `npm test -- --testPathPattern=calendar-manager`

### UPDATE package.json

- **IMPLEMENT**: Add node-schedule dependency
- **PATTERN**: Follow existing dependency structure
- **IMPORTS**: None
- **SPECIFIC VERSION**: `"node-schedule": "^2.1.1"` (compatible with Node.js 18+)
- **GOTCHA**: Use compatible version with existing Node.js version
- **VALIDATE**: `npm install && npm run build`

### CREATE tests/unit/calendar-sync-scheduler.test.ts

- **IMPLEMENT**: Unit tests for calendar sync scheduler
- **PATTERN**: Follow existing test patterns from calendar-manager.test.ts
- **IMPORTS**: `import { CalendarSyncScheduler } from '../../src/main/services/calendar-sync-scheduler'`
- **SPECIFIC TESTS**:
  ```typescript
  // Mock node-schedule: jest.mock('node-schedule')
  // Mock powerMonitor: jest.mock('electron', () => ({ powerMonitor: { on: jest.fn() } }))
  // Test cases: constructor, startDailySync, handleResume, performSync, dispose
  ```
- **GOTCHA**: Mock node-schedule and powerMonitor properly
- **VALIDATE**: `npm test -- --testPathPattern=calendar-sync-scheduler`

---

## TESTING STRATEGY

### Unit Tests

Design unit tests with proper mocking for external dependencies (node-schedule, powerMonitor) and validation of sync logic, error handling, and connection detection.

### Integration Tests

Test the complete automatic sync flow from app startup through calendar data fetching and UI updates.

### Edge Cases

- Computer sleep/wake cycles during sync operations
- Network connectivity issues during automatic sync
- Calendar connection expiration handling
- Multiple calendar sources synchronization

---

## VALIDATION COMMANDS

Execute every command to ensure zero regressions and 100% feature correctness.

### Level 1: Syntax & Style

```bash
npm run build:main
npm run build:renderer
npm run build
```

### Level 2: Unit Tests

```bash
npm test -- --testPathPattern=calendar-sync-scheduler
npm test -- --testPathPattern=calendar-manager
npm test
```

### Level 3: Integration Tests

```bash
npm run dev
# Test: Open app and verify automatic calendar sync occurs
# Test: Connect/disconnect calendars and verify sync behavior
# Test: Restart app and verify meetings load automatically
```

### Level 4: Manual Validation

**Automatic Sync Testing:**
- Open app with connected calendars → Should see today's meetings automatically
- Restart app next day → Should fetch fresh meetings for new day
- Connect new calendar → Should automatically include in sync

**Error Handling Testing:**
- Disconnect internet during sync → Should handle gracefully with retry
- Revoke calendar permissions → Should show appropriate error message
- Computer sleep during sync → Should resume properly on wake

### Level 5: Additional Validation (Optional)

```bash
# Test calendar sync scheduler directly
node -e "const { CalendarSyncScheduler } = require('./dist/main/services/calendar-sync-scheduler'); console.log('Scheduler loaded successfully')"
```

---

## ACCEPTANCE CRITERIA

- [ ] App automatically fetches today's meetings on startup when calendars are connected
- [ ] Daily sync occurs automatically without user intervention
- [ ] Computer sleep/wake cycles don't break the sync schedule
- [ ] Both Apple Calendar (macOS) and Google Calendar connections work with automatic sync
- [ ] Error handling provides clear feedback when sync fails
- [ ] Existing manual calendar import functionality remains unchanged
- [ ] App startup performance is not significantly impacted
- [ ] Calendar connection status is properly detected and handled
- [ ] Sync operations respect existing caching mechanisms
- [ ] All validation commands pass with zero errors

---

## COMPLETION CHECKLIST

- [ ] Calendar sync scheduler service created and tested
- [ ] Calendar manager enhanced with automatic sync capabilities
- [ ] App startup flow updated to trigger automatic sync
- [ ] IPC communication updated for new sync operations
- [ ] React frontend handles automatic calendar updates
- [ ] Unit tests cover all new functionality
- [ ] Integration tests verify end-to-end automatic sync
- [ ] Error handling tested for various failure scenarios
- [ ] Computer sleep/wake handling verified
- [ ] Performance impact assessed and acceptable
- [ ] All acceptance criteria met
- [ ] Code reviewed for quality and maintainability

---

## NOTES

**Design Decisions:**
- Using node-schedule for reliable cross-platform scheduling
- Leveraging Electron's powerMonitor for sleep/wake handling
- Maintaining existing calendar connection storage patterns
- Preserving manual import functionality as fallback option

**Performance Considerations:**
- Sync operations use existing caching mechanisms
- Daily sync scheduled for optimal times (early morning)
- Background sync doesn't block UI operations
- Proper cleanup prevents memory leaks

**Security Considerations:**
- Existing calendar credential storage remains unchanged
- Sync operations use established authentication patterns
- Error messages don't expose sensitive information
- Network requests follow existing security practices

**Confidence Score**: 9.5/10 that execution will succeed on first attempt

**Confidence Improvements Made:**
- Added specific code snippets for critical implementations
- Provided exact import statements and method signatures
- Specified node-schedule version compatibility (^2.1.1)
- Detailed mock patterns for testing
- Clear IPC handler placement instructions
- Specific cron pattern for daily scheduling ('0 6 * * *')
- Exact powerMonitor integration approach
- Concrete method signatures for calendar manager extensions
