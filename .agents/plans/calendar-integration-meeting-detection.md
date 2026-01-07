# Feature: Calendar Integration & Meeting Detection

The following plan should be complete, but its important that you validate documentation and codebase patterns and task sanity before you start implementing.

Pay special attention to naming of existing utils types and models. Import from the right files etc.

## Feature Description

Implement calendar integration and meeting detection functionality that parses calendar data to identify today's meetings and displays them on the frontend. This feature enables users to see their daily meetings and provides the foundation for AI meeting brief generation in subsequent features.

## User Story

As a knowledge worker using Prep
I want to see today's meetings displayed on the main page when I have both an Obsidian vault configured and calendar data available
So that I can quickly identify which meetings I need to prepare for and potentially generate AI briefs

## Problem Statement

Users currently have calendar integration capabilities (Apple Calendar + ICS files) but no way to view today's meetings in a focused, actionable format on the main application page. The existing calendar import functionality shows all events but doesn't filter for today or provide a meeting-centric view optimized for preparation workflows.

## Solution Statement

Create a meeting detection service that filters calendar events for today's date, enhance the main page UI to display today's meetings when both vault and calendar are configured, and establish the foundation UI patterns for meeting management that will support AI brief generation in future features.

## Feature Metadata

**Feature Type**: Enhancement  
**Estimated Complexity**: Medium  
**Primary Systems Affected**: Main process (calendar filtering), Renderer (UI components), IPC communication  
**Dependencies**: Existing calendar-manager.ts, node-ical (already integrated)

---

## CONTEXT REFERENCES

### Relevant Codebase Files IMPORTANT: YOU MUST READ THESE FILES BEFORE IMPLEMENTING!

- `src/main/services/calendar-manager.ts` (lines 1-50, 101-109) - Why: Contains existing calendar parsing and AppleScript today filtering logic to mirror
- `src/renderer/App.tsx` (lines 1-50, 140-210) - Why: Main page component structure and state management patterns to follow
- `src/shared/types/calendar.ts` (lines 1-30) - Why: CalendarEvent interface and IPC serialization patterns
- `src/shared/types/ipc.ts` (lines 1-20) - Why: IPC method naming conventions and type patterns
- `src/main/index.ts` (lines 80-120) - Why: IPC handler registration patterns and error handling
- `src/main/preload.ts` (lines 1-30) - Why: Secure IPC exposure patterns with date handling
- `src/renderer/components/CalendarImport.tsx` (lines 270-300) - Why: Event display UI patterns and styling

### New Files to Create

- `src/main/services/meeting-detector.ts` - Service for filtering today's meetings from calendar events
- `src/renderer/components/TodaysMeetings.tsx` - Component for displaying today's meetings on main page
- `src/shared/types/meeting.ts` - Meeting-specific types and interfaces

### Relevant Documentation YOU SHOULD READ THESE BEFORE IMPLEMENTING!

- [Node-ical Documentation](https://github.com/jens-maus/node-ical#readme)
  - Specific section: Event filtering and date handling
  - Why: Required for implementing robust date filtering for today's events
- [Electron IPC Best Practices](https://www.electronjs.org/docs/latest/tutorial/ipc#pattern-2-renderer-to-main-two-way)
  - Specific section: Two-way communication patterns
  - Why: Shows proper async IPC patterns for meeting data retrieval

### Patterns to Follow

**IPC Handler Naming Convention:**
```typescript
// Pattern from src/main/index.ts lines 80-90
ipcMain.handle('calendar:getEvents', async () => {
  return await calendarManager.getEvents()
})
```

**Date Serialization Pattern:**
```typescript
// Pattern from src/shared/types/calendar.ts lines 45-55
export function calendarEventToIPC(event: CalendarEvent): CalendarEventIPC {
  return {
    ...event,
    startDate: event.startDate.toISOString(),
    endDate: event.endDate.toISOString()
  }
}
```

**Service Class Pattern:**
```typescript
// Pattern from src/main/services/calendar-manager.ts lines 15-25
export class CalendarManager {
  private settingsManager: SettingsManager
  private readonly isAppleScriptAvailable = process.platform === 'darwin'
  
  constructor() {
    this.settingsManager = new SettingsManager()
  }
}
```

**React Component State Pattern:**
```typescript
// Pattern from src/renderer/App.tsx lines 10-20
const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([])

const handleEventsImported = (events: CalendarEvent[]) => {
  setCalendarEvents(events)
}
```

**Error Handling Pattern:**
```typescript
// Pattern from src/main/index.ts lines 65-75
ipcMain.handle('vault:scan', async (_, vaultPath: string) => {
  if (!vaultPath || typeof vaultPath !== 'string') {
    throw new Error('Invalid vault path')
  }
  
  return await vaultManager.scanVault(vaultPath)
})
```

---

## IMPLEMENTATION PLAN

### Phase 1: Foundation - Meeting Detection Service

Create the core service for filtering and managing today's meetings, following existing service patterns.

**Tasks:**
- Create meeting detection service with today's date filtering logic
- Add meeting-specific types and interfaces
- Implement caching and performance optimizations

### Phase 2: IPC Integration

Extend IPC communication to support meeting detection functionality.

**Tasks:**
- Add IPC handlers for meeting detection
- Extend preload script with meeting methods
- Update TypeScript interfaces for new IPC methods

### Phase 3: Frontend Components

Create UI components for displaying today's meetings on the main page.

**Tasks:**
- Create TodaysMeetings component with event display
- Integrate component into main App.tsx
- Add conditional rendering based on vault + meetings availability

### Phase 4: Integration & State Management

Connect all components and ensure proper state management.

**Tasks:**
- Implement meeting data loading on app startup
- Add refresh functionality for meeting data
- Handle edge cases and error states

---

## STEP-BY-STEP TASKS

IMPORTANT: Execute every task in order, top to bottom. Each task is atomic and independently testable.

### CREATE src/shared/types/meeting.ts

- **IMPLEMENT**: Meeting-specific types extending CalendarEvent
- **PATTERN**: Mirror CalendarEvent structure from src/shared/types/calendar.ts:1-30
- **IMPORTS**: Import CalendarEvent and CalendarEventIPC from '../types/calendar'
- **GOTCHA**: Include IPC-safe versions with string dates for serialization
- **VALIDATE**: `npx tsc --noEmit`

### CREATE src/main/services/meeting-detector.ts

- **IMPLEMENT**: MeetingDetector service class for filtering today's meetings
- **PATTERN**: Mirror CalendarManager class structure from src/main/services/calendar-manager.ts:15-25
- **IMPORTS**: Import CalendarEvent, CalendarManager, and new meeting types
- **GOTCHA**: Handle timezone differences and all-day events correctly
- **DATE_LOGIC**: Use this exact filtering logic:
  ```typescript
  const today = new Date()
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000)
  
  return events.filter(event => {
    const eventStart = new Date(event.startDate)
    const eventEnd = new Date(event.endDate)
    
    // Event starts today OR event spans across today
    return (eventStart >= todayStart && eventStart < todayEnd) ||
           (eventStart < todayStart && eventEnd > todayStart)
  })
  ```
- **VALIDATE**: `npx tsc --noEmit`

### UPDATE src/main/index.ts

- **IMPLEMENT**: Add IPC handlers for meeting detection
- **PATTERN**: Follow existing calendar IPC handlers from src/main/index.ts:80-120
- **IMPORTS**: Import MeetingDetector service
- **GOTCHA**: Use consistent error handling and input validation patterns
- **VALIDATE**: `npx tsc --noEmit`

### UPDATE src/main/preload.ts

- **IMPLEMENT**: Expose meeting detection methods to renderer
- **PATTERN**: Mirror calendar method exposure from src/main/preload.ts:20-30
- **IMPORTS**: Update ElectronAPI interface import
- **GOTCHA**: Handle date deserialization for meeting events
- **VALIDATE**: `npx tsc --noEmit`

### UPDATE src/shared/types/ipc.ts

- **IMPLEMENT**: Add meeting detection methods to ElectronAPI interface
- **PATTERN**: Follow existing calendar method signatures from src/shared/types/ipc.ts:10-20
- **IMPORTS**: Import meeting types
- **GOTCHA**: Maintain consistent async Promise return types
- **VALIDATE**: `npx tsc --noEmit`

### CREATE src/renderer/components/TodaysMeetings.tsx

- **IMPLEMENT**: React component for displaying today's meetings
- **PATTERN**: Mirror CalendarImport component structure from src/renderer/components/CalendarImport.tsx:270-300
- **IMPORTS**: Import React, meeting types, and CalendarEvent
- **GOTCHA**: Handle empty state and loading states gracefully
- **UI_STRUCTURE**: Use this exact component structure:
  ```typescript
  interface Props {
    meetings: CalendarEvent[]
    isLoading: boolean
    onRefresh: () => void
  }
  
  export const TodaysMeetings: React.FC<Props> = ({ meetings, isLoading, onRefresh }) => {
    if (isLoading) return <div>Loading today's meetings...</div>
    if (meetings.length === 0) return <div>No meetings scheduled for today</div>
    
    return (
      <div style={{ /* mirror CalendarImport styles */ }}>
        <h3>Today's Meetings ({meetings.length})</h3>
        {meetings.map(meeting => (
          <div key={meeting.id} style={{ /* event card styles */ }}>
            {/* meeting display logic */}
          </div>
        ))}
      </div>
    )
  }
  ```
- **VALIDATE**: `npx tsc --noEmit`

### UPDATE src/renderer/App.tsx

- **IMPLEMENT**: Integrate TodaysMeetings component into main page
- **PATTERN**: Follow existing component integration from src/renderer/App.tsx:140-210
- **IMPORTS**: Import TodaysMeetings component and meeting types
- **GOTCHA**: Add conditional rendering based on vault + meetings availability
- **VALIDATE**: `npx tsc --noEmit`

### UPDATE src/renderer/App.tsx

- **IMPLEMENT**: Add meeting data loading and state management
- **PATTERN**: Mirror calendar event handling from src/renderer/App.tsx:10-30
- **IMPORTS**: Use existing electronAPI methods
- **GOTCHA**: Handle async loading and error states properly
- **STATE_LOGIC**: Add this exact state management:
  ```typescript
  const [todaysMeetings, setTodaysMeetings] = useState<CalendarEvent[]>([])
  const [meetingsLoading, setMeetingsLoading] = useState(false)
  const [hasVault, setHasVault] = useState(false)
  
  const loadTodaysMeetings = async () => {
    if (!hasVault) return
    setMeetingsLoading(true)
    try {
      const meetings = await window.electronAPI.getTodaysMeetings()
      setTodaysMeetings(meetings)
    } catch (error) {
      console.error('Failed to load meetings:', error)
      setTodaysMeetings([])
    } finally {
      setMeetingsLoading(false)
    }
  }
  ```
- **VALIDATE**: `npm run dev:renderer` and test in browser

---

## TESTING STRATEGY

### Unit Tests

Design unit tests following existing project patterns (no test framework currently configured):

**MeetingDetector Service Tests:**
- Test today's date filtering with various timezones
- Test all-day event handling
- Test empty calendar scenarios
- Test date boundary conditions (midnight, end of day)

**Component Tests:**
- Test TodaysMeetings rendering with mock data
- Test empty state display
- Test loading state handling
- Test error state display

### Integration Tests

**IPC Communication Tests:**
- Test meeting detection IPC round-trip
- Test date serialization/deserialization
- Test error propagation from main to renderer

### Edge Cases

**Date Handling Edge Cases:**
- Events spanning midnight
- All-day events
- Events in different timezones
- Daylight saving time transitions
- Invalid or malformed dates

**State Management Edge Cases:**
- No vault configured
- No calendar events available
- Calendar import in progress
- Network failures (for URL-based calendars)

---

## VALIDATION COMMANDS

Execute every command to ensure zero regressions and 100% feature correctness.

### Level 1: Syntax & Style

```bash
# TypeScript compilation check
npx tsc --noEmit

# Check main process compilation
npx tsc -p tsconfig.main.json --noEmit

# Check renderer process compilation  
npx tsc -p tsconfig.renderer.json --noEmit
```

### Level 2: Build Validation

```bash
# Build all processes
npm run build

# Verify build artifacts exist
ls -la dist/main/
ls -la dist/renderer/
```

### Level 3: Runtime Validation

```bash
# Start development mode
npm run dev

# Test in separate terminal:
# 1. Import calendar events
# 2. Verify today's meetings display
# 3. Test with no vault configured
# 4. Test with no calendar events
```

### Level 4: Manual Validation

**Feature-specific manual testing steps:**

1. **Setup Test Data:**
   ```bash
   # Create test calendar with today's events
   echo "Test today: $(date)" 
   # Configure Obsidian vault in app
   # Import calendar with events for today's date
   ```

2. **Test Main Page Display:**
   - ✅ Verify meetings show when vault + calendar configured
   - ✅ Verify "No meetings scheduled for today" when no events
   - ✅ Verify meetings section hidden when vault not configured
   - ✅ Verify loading state shows during data fetch

3. **Test Date Edge Cases:**
   ```bash
   # Test with events at these times:
   # - 12:00 AM today (midnight boundary)
   # - 11:59 PM today (end of day boundary)  
   # - All-day events for today
   # - Multi-day events spanning today
   ```

4. **Test Error Handling:**
   - Disconnect calendar source and verify graceful degradation
   - Test with malformed calendar data
   - Test with very large calendar files (100+ events)

5. **Validation Checklist:**
   - [ ] Today's date filtering works correctly
   - [ ] All-day events display properly
   - [ ] Loading states work smoothly
   - [ ] Error states show helpful messages
   - [ ] No console errors in browser dev tools
   - [ ] Component renders within 2 seconds

---

## ACCEPTANCE CRITERIA

- [ ] Today's meetings are filtered and displayed on main page when vault is configured
- [ ] UI shows appropriate states: loading, no meetings, error states
- [ ] All-day events and timed events display correctly with proper formatting
- [ ] Date filtering works correctly across timezones and edge cases
- [ ] Component integrates seamlessly with existing App.tsx layout
- [ ] IPC communication follows existing patterns and error handling
- [ ] TypeScript compilation passes with no errors
- [ ] No regressions in existing calendar or vault functionality
- [ ] Performance is acceptable for typical calendar sizes (100+ events)
- [ ] UI is responsive and matches existing design patterns

---

## COMPLETION CHECKLIST

- [ ] All tasks completed in order
- [ ] Each task validation passed immediately
- [ ] All validation commands executed successfully
- [ ] TypeScript compilation clean (no errors or warnings)
- [ ] Manual testing confirms feature works end-to-end
- [ ] Edge cases tested and handled appropriately
- [ ] No regressions in existing functionality
- [ ] Code follows existing patterns and conventions
- [ ] Acceptance criteria all met
- [ ] Performance meets requirements

---

## NOTES

**Design Decisions:**
- Used service-oriented architecture following existing CalendarManager pattern
- Implemented IPC-safe date serialization following existing calendar patterns
- Created separate meeting types to allow future enhancement without breaking calendar functionality
- Followed existing React state management patterns for consistency

**Performance Considerations:**
- Meeting filtering happens in main process to avoid large data transfer over IPC
- Caching implemented to avoid repeated date calculations
- Efficient date comparison using JavaScript Date objects

**Future Extensibility:**
- Meeting types designed to support AI brief generation metadata
- Component structure allows easy addition of meeting action buttons
- Service architecture supports future meeting management features

**Security Considerations:**
- All IPC handlers include input validation following existing patterns
- Date handling prevents injection attacks through proper Date object usage
- No additional security concerns beyond existing calendar functionality

---

## CONFIDENCE ASSESSMENT

**Confidence Score: 9.5/10**

**Very high confidence** because:
- **Exact Code Patterns**: Provided specific implementation logic for date filtering and state management
- **Proven Architecture**: Builds on well-established codebase patterns with concrete examples
- **Comprehensive Validation**: Detailed manual testing steps with specific edge cases
- **Risk Mitigation**: Addressed timezone and state management complexity with explicit solutions
- **Clear Success Criteria**: Executable validation commands and measurable acceptance criteria

**Minimal remaining risk**:
- Platform-specific date handling differences (mitigated by using standard JavaScript Date API)
- Unexpected calendar data formats (mitigated by existing calendar-manager.ts error handling patterns)
