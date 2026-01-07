# AppleScript Calendar Optimization Guide

## Problem

Fetching today's calendar events via AppleScript is slow due to inefficient property access patterns.

## Key Performance Issues

1. **String concatenation in loops** - Very slow in AppleScript
2. **Multiple property accesses per event** - Each `of evt` is a separate Apple Event (expensive IPC call)
3. **Date-to-string conversion** - Slow operation performed repeatedly

## Solution: Bulk Property Fetching

Instead of accessing properties one event at a time, fetch all values for each property in a single call.

### Before (Slow)

```applescript
repeat with evt in todayEvents
  set eventTitle to summary of evt        -- Apple Event #1
  set eventStart to start date of evt     -- Apple Event #2
  set eventEnd to end date of evt         -- Apple Event #3
  -- ... 3 Apple Events PER event = 3n total
end repeat
```

### After (Fast)

```applescript
-- Bulk fetch all properties - 3 Apple Events TOTAL regardless of event count
set titles to summary of todayEvents
set startDates to start date of todayEvents
set endDates to end date of todayEvents

repeat with i from 1 to (count of todayEvents)
  -- Access by index (fast, no Apple Events)
  set t to item i of titles
  set s to item i of startDates
  set e to item i of endDates
end repeat
```

## Optimized Single Calendar Script

```applescript
tell application "Calendar"
  set todayStart to current date
  set time of todayStart to 0
  set todayEnd to todayStart + 1 * days

  set targetCal to calendar "Your Calendar Name"

  -- Filter events for today
  set todayEvents to (events of targetCal whose start date ≥ todayStart and start date < todayEnd)

  -- Bulk fetch all properties (single Apple Event per property type)
  set titles to summary of todayEvents
  set startDates to start date of todayEvents
  set endDates to end date of todayEvents

  -- Build output
  set eventCount to count of todayEvents
  set allEvents to {}

  repeat with i from 1 to eventCount
    set end of allEvents to (item i of titles) & "|" & (item i of startDates as string) & "|" & (item i of endDates as string) & "|CalendarName"
  end repeat

  return allEvents
end tell
```

## Optimized Multiple Calendars Script

```applescript
tell application "Calendar"
  set todayStart to current date
  set time of todayStart to 0
  set todayEnd to todayStart + 1 * days

  set allEvents to {}

  repeat with cal in calendars
    set calName to name of cal
    set dayEvents to (events of cal whose start date ≥ todayStart and start date < todayEnd)

    if (count of dayEvents) > 0 then
      -- Bulk property fetch for this calendar's events
      set titles to summary of dayEvents
      set startDates to start date of dayEvents
      set endDates to end date of dayEvents

      repeat with i from 1 to (count of dayEvents)
        set end of allEvents to (item i of titles) & "|" & (item i of startDates as string) & "|" & (item i of endDates as string) & "|" & calName
      end repeat
    end if
  end repeat

  return allEvents
end tell
```

## Performance Comparison

| Approach | Apple Events for N events |
|----------|---------------------------|
| Property access in loop | 3 × N |
| Bulk property fetch | 3 (constant) |

For 50 events: **150 Apple Events → 3 Apple Events** (50x reduction in IPC overhead)

## Additional Optimization Tips

1. **Filter calendars early** - Skip calendars you don't need (subscriptions, holidays, birthdays)
2. **Check event count before bulk fetch** - Avoid errors on empty result sets
3. **Avoid unnecessary date formatting** - If possible, pass raw date objects and format in the calling code
4. **Cache calendar references** - If calling the script repeatedly, consider caching

## Why This Works

Each property access like `summary of evt` triggers an Apple Event - an inter-process communication call between your script and the Calendar app. These are expensive (~1-5ms each).

When you write `summary of todayEvents` (plural), AppleScript fetches all summaries in a single Apple Event and returns them as a list. This batching dramatically reduces IPC overhead.
