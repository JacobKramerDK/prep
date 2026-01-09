# Swift Calendar Integration Setup

## Issue Resolution

The Swift calendar integration was falling back to AppleScript due to a **path resolution bug** in development mode. This has been fixed.

## Enable Swift Calendar Integration (150x Performance Boost)

To get the ~150x performance improvement (30+ seconds → <200ms):

### Option 1: Grant Permissions via App
1. Run `npm run dev`
2. Navigate to calendar extraction in the app
3. The app will request calendar permissions
4. Click "Allow" when macOS prompts for calendar access

### Option 2: Grant Permissions Manually
1. Open **System Preferences** → **Privacy & Security** → **Privacy**
2. Select **Calendar** from the left sidebar
3. Click the **+** button and add **Electron** (or your dev app)
4. Ensure the checkbox is checked

### Option 3: Test Permission Status
```bash
# Test if calendar permissions are working
./resources/bin/calendar-helper

# Expected outputs:
# - With permissions: JSON array of calendar events
# - Without permissions: ERROR:PERMISSION_DENIED
```

## Verification

After granting permissions, you should see:
- Console log: "Using Swift backend for calendar extraction"
- Extraction completes in <200ms instead of 30+ seconds
- No fallback to AppleScript

## Fallback Behavior

If Swift fails (no permissions), the system will automatically fall back to AppleScript, which should work but will be much slower (30+ seconds).
