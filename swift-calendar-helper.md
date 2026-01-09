# Swift Calendar Helper for Electron

A native Swift CLI tool that uses EventKit to fetch calendar events quickly. This replaces the slow AppleScript approach with a native solution that typically completes in <100ms.

## Why Swift + EventKit?

| AppleScript | Swift + EventKit |
|-------------|------------------|
| 30+ seconds for large calendars | <100ms |
| String parsing prone to errors | JSON output |
| Separate code signing needed | Signed with your app |
| External dependency (icalbuddy) | Built from source |

## Project Structure

```
your-electron-app/
├── native/
│   ├── CalendarHelper.swift    # Swift source
│   └── build.sh                # Build script
├── resources/
│   └── bin/
│       └── calendar-helper     # Built binary
├── build/
│   └── entitlements.mac.plist  # Calendar permissions
└── src/
    └── main/
        └── services/
            └── calendar-manager.ts
```

## Swift Code

Create `native/CalendarHelper.swift`:

```swift
import EventKit
import Foundation

let store = EKEventStore()

// Request access (will use app's existing permission)
let semaphore = DispatchSemaphore(value: 0)
var accessGranted = false

store.requestAccess(to: .event) { granted, error in
    accessGranted = granted
    semaphore.signal()
}
semaphore.wait()

guard accessGranted else {
    fputs("ERROR:PERMISSION_DENIED\n", stderr)
    exit(1)
}

// Get today's date range
let calendar = Calendar.current
let todayStart = calendar.startOfDay(for: Date())
let todayEnd = calendar.date(byAdding: .day, value: 1, to: todayStart)!

// Get events
let predicate = store.predicateForEvents(withStart: todayStart, end: todayEnd, calendars: nil)
let events = store.events(matching: predicate)

// Output as JSON for easy parsing
let dateFormatter = ISO8601DateFormatter()
var output: [[String: Any]] = []

for event in events {
    output.append([
        "id": event.eventIdentifier ?? UUID().uuidString,
        "title": event.title ?? "Untitled",
        "startDate": dateFormatter.string(from: event.startDate),
        "endDate": dateFormatter.string(from: event.endDate),
        "calendar": event.calendar.title,
        "location": event.location ?? "",
        "isAllDay": event.isAllDay
    ])
}

if let jsonData = try? JSONSerialization.data(withJSONObject: output),
   let jsonString = String(data: jsonData, encoding: .utf8) {
    print(jsonString)
}
```

## Build Script

Create `native/build.sh`:

```bash
#!/bin/bash
set -e

cd "$(dirname "$0")"

echo "Building calendar-helper..."

# Build for both architectures
swiftc CalendarHelper.swift -O -o calendar-helper-arm64 -target arm64-apple-macosx11.0
swiftc CalendarHelper.swift -O -o calendar-helper-x64 -target x86_64-apple-macosx11.0

# Create universal binary
lipo -create -output ../resources/bin/calendar-helper calendar-helper-arm64 calendar-helper-x64

# Cleanup
rm calendar-helper-arm64 calendar-helper-x64

echo "Built universal binary: resources/bin/calendar-helper"
```

Make it executable:

```bash
chmod +x native/build.sh
mkdir -p resources/bin
```

## Build Commands

```bash
# Build manually
cd native && ./build.sh

# Or add to package.json scripts:
# "build:native": "cd native && ./build.sh"
```

## Node.js Integration

Update `calendar-manager.ts`:

```typescript
import { execFile } from 'child_process'
import { promisify } from 'util'
import { app } from 'electron'
import path from 'path'

const execFileAsync = promisify(execFile)

interface SwiftCalendarEvent {
  id: string
  title: string
  startDate: string  // ISO8601
  endDate: string    // ISO8601
  calendar: string
  location: string
  isAllDay: boolean
}

export class CalendarManager {
  private getHelperPath(): string {
    if (app.isPackaged) {
      return path.join(process.resourcesPath, 'bin', 'calendar-helper')
    }
    return path.join(__dirname, '../../resources/bin/calendar-helper')
  }

  async extractEvents(): Promise<CalendarEvent[]> {
    const helperPath = this.getHelperPath()

    try {
      const { stdout, stderr } = await execFileAsync(helperPath, [], {
        timeout: 5000  // 5 seconds is plenty
      })

      if (stderr && stderr.includes('PERMISSION_DENIED')) {
        throw new CalendarError(
          'Calendar permission required',
          'PERMISSION_DENIED'
        )
      }

      const events: SwiftCalendarEvent[] = JSON.parse(stdout)

      return events.map(event => ({
        id: event.id,
        title: event.title,
        startDate: new Date(event.startDate),
        endDate: new Date(event.endDate),
        calendarName: event.calendar,
        location: event.location || undefined,
        isAllDay: event.isAllDay,
        source: 'swift' as const,
        attendees: [],
        description: undefined
      }))

    } catch (error: any) {
      if (error.code === 'ENOENT') {
        throw new CalendarError(
          'Calendar helper not found. Run: npm run build:native',
          'HELPER_NOT_FOUND'
        )
      }
      throw error
    }
  }
}
```

## Electron Builder Configuration

Add to `electron-builder.yml` or `package.json`:

```yaml
extraResources:
  - from: "resources/bin"
    to: "bin"
    filter:
      - "**/*"

mac:
  hardenedRuntime: true
  entitlements: "build/entitlements.mac.plist"
  entitlementsInherit: "build/entitlements.mac.plist"
```

## Entitlements

Create `build/entitlements.mac.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>com.apple.security.cs.allow-jit</key>
    <true/>
    <key>com.apple.security.cs.allow-unsigned-executable-memory</key>
    <true/>
    <key>com.apple.security.personal-information.calendars</key>
    <true/>
</dict>
</plist>
```

## Package.json Scripts

```json
{
  "scripts": {
    "build:native": "cd native && ./build.sh",
    "prebuild": "npm run build:native",
    "build": "electron-builder"
  }
}
```

## Testing

```bash
# Build the helper
npm run build:native

# Test it directly
./resources/bin/calendar-helper

# Should output JSON like:
# [{"id":"...","title":"Meeting","startDate":"2026-01-09T10:00:00Z",...}]
```

## Extending the Helper

### Filter by Calendar Name

Add argument parsing to the Swift code:

```swift
// At the top of CalendarHelper.swift
let args = CommandLine.arguments
let filterCalendar = args.count > 1 ? args[1] : nil

// When getting events, filter calendars
var targetCalendars: [EKCalendar]? = nil
if let calName = filterCalendar {
    targetCalendars = store.calendars(for: .event).filter { $0.title == calName }
}

let predicate = store.predicateForEvents(
    withStart: todayStart,
    end: todayEnd,
    calendars: targetCalendars
)
```

Usage:

```typescript
await execFileAsync(helperPath, ['Work'], { timeout: 5000 })
```

### Custom Date Range

```swift
// Parse date arguments
let args = CommandLine.arguments
let dateFormatter = ISO8601DateFormatter()

let startDate: Date
let endDate: Date

if args.count >= 3,
   let start = dateFormatter.date(from: args[1]),
   let end = dateFormatter.date(from: args[2]) {
    startDate = start
    endDate = end
} else {
    // Default to today
    startDate = calendar.startOfDay(for: Date())
    endDate = calendar.date(byAdding: .day, value: 1, to: startDate)!
}
```

### List Available Calendars

Add a `--list-calendars` flag:

```swift
if args.contains("--list-calendars") {
    let calendars = store.calendars(for: .event)
    let output = calendars.map { [
        "name": $0.title,
        "id": $0.calendarIdentifier,
        "color": $0.cgColor?.components?.description ?? ""
    ]}
    if let json = try? JSONSerialization.data(withJSONObject: output),
       let str = String(data: json, encoding: .utf8) {
        print(str)
    }
    exit(0)
}
```

## Troubleshooting

### "Calendar helper not found"

```bash
# Ensure the binary exists
ls -la resources/bin/calendar-helper

# Rebuild if missing
npm run build:native
```

### "Permission denied" at runtime

The binary needs execute permission:

```bash
chmod +x resources/bin/calendar-helper
```

### Code signing issues in production

Ensure the binary is in `extraResources` and entitlements include calendar access. The binary will be signed automatically when electron-builder signs your app.

### "Operation not permitted" on macOS

The user needs to grant calendar access. This happens automatically on first run - macOS will show a permission dialog.
