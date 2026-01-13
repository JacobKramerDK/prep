# Code Review: Calendar Sync Enhancement and Google Calendar Detection

**Stats:**
- Files Modified: 7
- Files Added: 0
- Files Deleted: 0
- New lines: 259
- Deleted lines: 27

## Summary

This code review covers recent changes to implement Google Calendar event detection and fix calendar sync issues. The changes include enhanced event source detection, deduplication logic, and improved automatic sync functionality.

## Issues Found

### CRITICAL Issues

**severity: critical**
**file: src/main/services/calendar-manager.ts**
**line: 95**
**issue: Potential infinite recursion in Swift extraction path**
**detail: The Swift extraction path calls `this.enhanceEventSources(result.events)` which may call `extractAppleScriptEvents` again if Swift fails, creating a potential infinite loop. The Swift path should not trigger AppleScript fallback within the same method.**
**suggestion: Move Google Calendar detection to a separate method that doesn't trigger extraction, or add recursion guards.**

**severity: critical**
**file: src/main/services/calendar-manager.ts**
**line: 307**
**issue: Race condition in event storage**
**detail: `await this.settingsManager.setCalendarEvents(events)` is called before `enhanceEventSources`, but the enhanced events are returned. This means stored events don't match returned events, causing data inconsistency.**
**suggestion: Store the enhanced events instead: `await this.settingsManager.setCalendarEvents(enhancedEvents)`**

### HIGH Issues

**severity: high**
**file: src/main/services/calendar-manager.ts**
**line: 896**
**issue: Deduplication logic has reference equality bug**
**detail: `deduplicated.findIndex(e => e === existingEvent)` uses reference equality, but `existingEvent` comes from Map.get() and may not match the actual object in the array due to object creation.**
**suggestion: Use index tracking or a more reliable identification method: `const index = deduplicated.indexOf(existingEvent)`**

**severity: high**
**file: src/main/services/calendar-sync-scheduler.ts**
**line: 18**
**issue: Async constructor pattern is problematic**
**detail: `this.initializeLastSyncTime()` is called in constructor but not awaited. This can cause race conditions where `lastSyncTime` is still null when `startDailySync()` checks it.**
**suggestion: Make initialization synchronous or ensure proper async handling in `startDailySync()`**

**severity: high**
**file: native/CalendarHelper.swift**
**line: 44**
**issue: Force unwrapping of optional URL**
**detail: `attendee.url.absoluteString` force unwraps the URL without checking if it's nil, which can cause crashes.**
**suggestion: Use optional chaining: `attendee.url?.absoluteString`**

### MEDIUM Issues

**severity: medium**
**file: src/main/services/calendar-manager.ts**
**line: 1001**
**issue: Missing error handling in deduplication**
**detail: `this.enhanceEventSources(allEvents)` and `this.deduplicateEvents(enhancedEvents)` are called without try-catch, but these methods could throw errors during event processing.**
**suggestion: Wrap in try-catch block and handle gracefully to prevent sync failure**

**severity: medium**
**file: src/main/services/calendar-manager.ts**
**line: 847**
**issue: Case-sensitive string matching**
**detail: `title.startsWith('placeholder:')` is case-sensitive, but the title is already lowercased. This should be consistent.**
**suggestion: Either use `title.toLowerCase().startsWith('placeholder:')` or ensure consistent casing**

**severity: medium**
**file: src/main/services/swift-calendar-manager.ts**
**line: 135**
**issue: Inconsistent error handling**
**detail: The method maps Swift events to CalendarEvent but doesn't handle potential parsing errors for individual events (e.g., invalid dates).**
**suggestion: Add try-catch around individual event mapping to skip invalid events rather than failing entirely**

### LOW Issues

**severity: low**
**file: src/shared/types/calendar.ts**
**line: 9**
**issue: Type union could be more maintainable**
**detail: The source union type is repeated in multiple interfaces. Changes require updating multiple locations.**
**suggestion: Extract to a type alias: `type CalendarSource = 'applescript' | 'ics' | 'swift' | 'google' | 'automatic-sync'`**

**severity: low**
**file: src/main/services/calendar-manager.ts**
**line: 890**
**issue: Potential memory leak in deduplication**
**detail: The `seen` Map grows indefinitely and is never cleared. For long-running processes, this could accumulate memory.**
**suggestion: Clear the Map after processing or use WeakMap if appropriate**

## Security Considerations

**severity: medium**
**file: src/main/services/calendar-manager.ts**
**line: 847**
**issue: Potential for false positive Google Calendar detection**
**detail: The detection logic for "placeholder:" prefix could incorrectly classify legitimate Apple Calendar events as Google Calendar events.**
**suggestion: Make detection more specific or add user override capability**

## Performance Considerations

The deduplication logic has O(n²) complexity in the worst case due to `findIndex` calls. For large event sets, this could be slow. Consider using a more efficient approach with index tracking.

## Code Quality Notes

1. **Good**: Comprehensive error handling with specific error types
2. **Good**: Proper cleanup of temporary files
3. **Good**: Development-only logging to avoid production noise
4. **Improvement needed**: Some methods are becoming quite large and could benefit from decomposition
5. **Improvement needed**: Magic strings like "placeholder:" should be constants

## Recommendations

1. **Fix critical race condition** in event storage immediately
2. **Add recursion guards** to prevent infinite loops
3. **Improve async initialization** pattern in scheduler
4. **Add comprehensive error handling** around new deduplication logic
5. **Consider extracting** Google Calendar detection to a separate service class

## Overall Assessment

The changes implement important functionality for Google Calendar detection and event deduplication. However, there are several critical issues that need immediate attention, particularly around data consistency and potential infinite recursion. The code quality is generally good with proper error handling patterns, but some architectural improvements would enhance maintainability.
