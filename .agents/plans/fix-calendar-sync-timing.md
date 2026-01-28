# Implementation Plan: Fix Calendar Sync Timing Issue

## Overview
Fix race condition where Apple Calendar events don't appear on first app launch by implementing sequential initialization with proper loading states.

## Root Cause
App initialization runs calendar sync asynchronously while UI immediately loads meetings, causing incomplete data display on first launch.

## Solution Approach
Modify app initialization to wait for calendar sync completion before displaying meetings, with clear loading indicators for user feedback.

## Implementation Tasks

### Task 1: Modify Calendar Sync to Return Promise
**File**: `src/main/services/calendar-sync-scheduler.ts`
**Changes**: Make `startDailySync()` wait for initial sync completion

```typescript
// Current (lines 62-70)
if (shouldPerformInitialSync) {
  setImmediate(async () => {
    try {
      await this.performSync()
    } catch (error) {
      console.error('Initial sync failed:', error)
    }
  })
}

// New implementation
if (shouldPerformInitialSync) {
  // Return promise that resolves when initial sync completes
  return new Promise((resolve) => {
    setImmediate(async () => {
      try {
        const result = await this.performSync()
        resolve(result)
      } catch (error) {
        console.error('Initial sync failed:', error)
        resolve({ success: false, eventsCount: 0, syncTime: new Date(), error: error.message })
      }
    })
  })
} else {
  // No sync needed, resolve immediately
  return Promise.resolve({ success: true, eventsCount: 0, syncTime: new Date(), error: null })
}
```

**Validation**: 
- Ensure return type is `Promise<CalendarSyncResult>`
- Test both sync and no-sync scenarios

### Task 2: Update IPC Handler to Return Sync Result
**File**: `src/main/index.ts`
**Changes**: Modify IPC handler to return sync promise

```typescript
// Current (line 419-421)
ipcMain.handle('calendar:startDailySync', async () => {
  return await calendarSyncScheduler.startDailySync()
})

// Updated - already correct, just ensure it waits for completion
```

**Validation**: Test IPC call returns sync result

### Task 3: Add Calendar Sync Loading State
**File**: `src/renderer/App.tsx`
**Changes**: Add state for calendar sync progress

```typescript
// Add new state (around line 25)
const [calendarSyncLoading, setCalendarSyncLoading] = useState(false)
const [calendarSyncError, setCalendarSyncError] = useState<string | null>(null)

// Update performAutoSync function (around line 155)
const performAutoSync = async (): Promise<void> => {
  setCalendarSyncLoading(true)
  setCalendarSyncError(null)
  try {
    const result = await window.electronAPI.startDailyCalendarSync()
    if (!result.success && result.error) {
      setCalendarSyncError(result.error)
    }
  } catch (error) {
    console.error('Auto sync failed:', error)
    setCalendarSyncError('Calendar sync failed')
  } finally {
    setCalendarSyncLoading(false)
  }
}
```

**Validation**: State updates correctly during sync

### Task 4: Sequential App Initialization
**File**: `src/renderer/App.tsx`
**Changes**: Modify `initializeApp()` to run sync before loading meetings

```typescript
// Current parallel initialization (lines 175-185)
await Promise.all([
  getVersion(),
  loadExistingEvents(),
  performAutoSync(),
  checkVaultStatus(),
  checkCalendarStatus()
])

// New sequential initialization
try {
  // Run non-blocking operations in parallel
  await Promise.all([
    getVersion(),
    loadExistingEvents(),
    checkVaultStatus(),
    checkCalendarStatus()
  ])
  
  // Wait for calendar sync to complete before proceeding
  await performAutoSync()
  
} catch (error) {
  console.error('App initialization failed:', error)
} finally {
  if (mounted) {
    setIsInitializing(false)
  }
}
```

**Validation**: Sync completes before initialization ends

### Task 5: Update Loading Screen Component
**File**: `src/renderer/components/LoadingScreen.tsx`
**Changes**: Add calendar sync status to loading screen

```typescript
// Add props interface
interface LoadingScreenProps {
  calendarSyncLoading?: boolean
  calendarSyncError?: string | null
}

// Update component to show sync status
export function LoadingScreen({ calendarSyncLoading, calendarSyncError }: LoadingScreenProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Loading Prep</h2>
        
        {calendarSyncLoading && (
          <p className="text-sm text-gray-600">Syncing calendar events...</p>
        )}
        
        {calendarSyncError && (
          <p className="text-sm text-red-600 mt-2">
            Calendar sync failed: {calendarSyncError}
          </p>
        )}
        
        {!calendarSyncLoading && !calendarSyncError && (
          <p className="text-sm text-gray-600">Initializing application...</p>
        )}
      </div>
    </div>
  )
}
```

**Validation**: Loading states display correctly

### Task 6: Update App Component to Use Enhanced Loading Screen
**File**: `src/renderer/App.tsx`
**Changes**: Pass sync state to LoadingScreen

```typescript
// Update LoadingScreen usage (around line 280)
if (isInitializing) {
  return (
    <LoadingScreen 
      calendarSyncLoading={calendarSyncLoading}
      calendarSyncError={calendarSyncError}
    />
  )
}
```

**Validation**: Loading screen shows sync progress

### Task 7: Add Error Recovery for Sync Failures
**File**: `src/renderer/App.tsx`
**Changes**: Allow app to continue if sync fails

```typescript
// Update performAutoSync to not block app initialization on failure
const performAutoSync = async (): Promise<void> => {
  setCalendarSyncLoading(true)
  setCalendarSyncError(null)
  try {
    const result = await window.electronAPI.startDailyCalendarSync()
    if (!result.success && result.error) {
      console.warn('Calendar sync failed but continuing:', result.error)
      setCalendarSyncError(result.error)
      // Don't throw - allow app to continue with cached/existing events
    }
  } catch (error) {
    console.error('Auto sync failed:', error)
    setCalendarSyncError('Calendar sync failed')
    // Don't throw - allow app to continue
  } finally {
    setCalendarSyncLoading(false)
  }
}
```

**Validation**: App continues to load even if sync fails

## Testing Strategy

### Unit Tests
```bash
# Test calendar sync scheduler
npm run test:helpers
```

### Integration Tests
```bash
# Test full app initialization flow
npm run test:e2e:stable
```

### Manual Testing Scenarios

1. **First Launch Test**:
   - Clear app data: `rm -rf ~/Library/Application\ Support/prep`
   - Launch app
   - Verify loading screen shows "Syncing calendar events..."
   - Confirm all calendar events appear after sync

2. **Sync Failure Test**:
   - Disconnect internet
   - Launch app
   - Verify error message displays
   - Confirm app still loads with cached events

3. **Restart Test**:
   - Restart app after successful first launch
   - Verify faster startup (no sync needed)
   - Confirm events still display correctly

4. **Mixed Calendar Test**:
   - Configure both Google and Apple calendars
   - Clear app data
   - Launch app
   - Verify events from both sources appear

## Risk Mitigation

### Rollback Plan
If issues arise:
1. Revert `initializeApp()` to parallel execution
2. Keep loading state improvements
3. Add TODO for future fix

### Performance Considerations
- Sync timeout: 30 seconds maximum
- Fallback to cached events if sync fails
- Progress indicators prevent user confusion

### Edge Cases Handled
- No internet connection during sync
- Calendar permission denied
- Swift binary not available
- Partial sync failures (Google works, Apple fails)

## Success Criteria

✅ **Primary Goal**: Apple Calendar events appear on first app launch
✅ **User Experience**: Clear loading feedback during sync
✅ **Reliability**: App loads even if sync fails
✅ **Performance**: No significant startup delay (sync was already happening)
✅ **Compatibility**: Works with existing calendar configurations

## Deployment Notes

1. Test thoroughly on clean macOS system
2. Verify with both calendar types configured
3. Test offline scenarios
4. Confirm no regressions in restart behavior

---

**Estimated Implementation Time**: 4-6 hours
**Risk Level**: Low
**Confidence**: 9/10

Ready to implement? The changes are minimal and focused on the specific timing issue while improving overall user experience.
