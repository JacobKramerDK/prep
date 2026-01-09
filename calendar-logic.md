# Calendar Logic Documentation

## AppleScript Calendar Logic Overview

### 1. Calendar Discovery (`discoverCalendars()`)

**Purpose**: Find all available calendars on the system

**AppleScript Logic**:
```applescript
tell application "Calendar"
    set calendarList to {}
    repeat with cal in calendars
        try
            set calName to name of cal
            set calWritable to writable of cal
            set calDescription to description of cal
            set calColor to color of cal
            set end of calendarList to (calName & "|||" & calWritable & "|||" & calDescription & "|||" & calColor)
        end try
    end repeat
    return calendarList
end tell
```

**How it works**:
1. **Iterates through ALL calendars** in the Calendar app
2. **Extracts metadata** for each calendar:
   - Name (used as both name and UID)
   - Writable status (local vs subscribed)
   - Description
   - Color
3. **Concatenates data** with `|||` separator to avoid conflicts
4. **Returns comma-separated list** of calendar entries
5. **JavaScript parsing** splits by comma, then by `|||` to reconstruct calendar objects

### 2. Event Extraction (`extractAppleScriptEvents()`)

**Two Different Approaches**:

#### Approach A: Single Calendar (when calendars selected)
```applescript
tell application "Calendar"
    set todayStart to current date
    set time of todayStart to 0
    set todayEnd to todayStart + 1 * days
    
    set targetCal to calendar "CalendarName"
    set todayEvents to (events of targetCal whose start date ≥ todayStart and start date < todayEnd)
    
    set allEvents to {}
    repeat with evt in todayEvents
        try
            set eventTitle to summary of evt
            set eventStart to start date of evt as string
            set eventEnd to end date of evt as string
            set end of allEvents to (eventTitle & "|" & eventStart & "|" & eventEnd & "|" & "CalendarName")
        end try
    end repeat
    
    return allEvents
end tell
```

#### Approach B: Multiple Calendars (fallback)
```applescript
tell application "Calendar"
    set todayStart to current date
    set time of todayStart to 0
    set todayEnd to todayStart + 1 * days
    
    set allEvents to {}
    
    -- Only process first 3 calendars to avoid timeout
    repeat with i from 1 to (count of calendars)
        if i > 3 then exit repeat
        try
            set cal to calendar i
            set calName to name of cal
            set dayEvents to (events of cal whose start date ≥ todayStart and start date < todayEnd)
            
            repeat with evt in dayEvents
                try
                    set eventTitle to summary of evt
                    set eventStart to start date of evt as string
                    set eventEnd to end date of evt as string
                    set end of allEvents to (eventTitle & "|" & eventStart & "|" & eventEnd & "|" & calName)
                    if (count of allEvents) > 20 then exit repeat
                end try
            end repeat
            
            if (count of allEvents) > 20 then exit repeat
        end try
    end repeat
    
    return allEvents
end tell
```

### 3. Key Logic Flow

**Calendar Selection Logic**:
1. **User selects calendars** → Uses Approach A (single calendar)
2. **No selection/fallback** → Uses Approach B (first 3 calendars, max 20 events)

**Date Filtering**:
- **Today only**: `todayStart` (midnight) to `todayEnd` (next midnight)
- **AppleScript date filtering**: `whose start date ≥ todayStart and start date < todayEnd`

**Data Format**:
- **Event format**: `"Title|StartDate|EndDate|CalendarName"`
- **Separator**: `|` (pipe character)
- **Result**: Comma-separated list of events

**Performance Optimizations**:
- **Limits**: Max 3 calendars, max 20 events (Approach B)
- **Timeout**: 60 seconds for execution
- **Caching**: 2-minute cache to avoid repeated calls
- **Atomic operations**: Prevents concurrent executions

### 4. Error Handling

**Permission Checks**:
- Tests AppleScript access before main execution
- Detects permission denial patterns in error messages

**Timeout Protection**:
- 60-second timeout with SIGTERM kill signal
- Graceful degradation with helpful error messages

**Data Validation**:
- Filters out system calendars ('Birthdays', 'Siri Suggestions')
- Handles malformed event data gracefully
- Skips unparseable events rather than failing entirely

### 5. Security Measures

**Temporary File Approach**:
- Writes AppleScript to temp file to avoid shell injection
- Uses UUID-based filenames
- Automatic cleanup after execution

**Input Sanitization**:
- Escapes quotes in calendar names: `"` → `\"`
- Validates calendar selection input

This architecture provides robust calendar integration while handling macOS security requirements and performance constraints.
