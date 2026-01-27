# Google Calendar API - Calendar Discovery and Management

## Overview

The Google Calendar API provides comprehensive calendar discovery and management through the **CalendarList** resource, which represents the collection of calendars in a user's calendar list. This is distinct from individual calendars and focuses on the user's access and management of multiple calendars.

## CalendarList.list Endpoint

### HTTP Request
```
GET https://www.googleapis.com/calendar/v3/users/me/calendarList
```

### Purpose
Returns all calendars accessible to the authenticated user, including:
- Primary calendar
- Secondary calendars (owned by user)
- Shared calendars (from other users)
- Subscribed calendars

## Request Parameters

### Optional Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `maxResults` | integer | Maximum entries per page (default: 100, max: 250) |
| `minAccessRole` | string | Minimum access role filter (`freeBusyReader`, `reader`, `writer`, `owner`) |
| `pageToken` | string | Token for pagination |
| `showDeleted` | boolean | Include deleted calendar entries (default: false) |
| `showHidden` | boolean | Include hidden calendar entries (default: false) |
| `syncToken` | string | Token for incremental synchronization |

### Access Role Filtering
- `freeBusyReader`: Read free/busy information only
- `reader`: Read calendar events (private events hidden)
- `writer`: Read and modify events
- `owner`: Full management access including ACLs

## Response Structure

### Main Response Object
```json
{
  "kind": "calendar#calendarList",
  "etag": "etag",
  "nextPageToken": "string",
  "nextSyncToken": "string", 
  "items": [/* CalendarListEntry objects */]
}
```

### CalendarListEntry Metadata

#### Core Identification
- `id`: Calendar identifier (email format for most calendars)
- `summary`: Calendar title/name
- `description`: Calendar description (read-only)
- `primary`: Boolean indicating user's primary calendar

#### Access & Permissions
- `accessRole`: User's effective access level
  - `freeBusyReader`: Free/busy access only
  - `reader`: Read access (private events hidden)
  - `writer`: Read/write access (private events visible)
  - `owner`: Full management access
- `dataOwner`: Email of calendar owner (secondary calendars only)

#### Display & Customization
- `summaryOverride`: User's custom name for the calendar
- `colorId`: Color ID reference (legacy)
- `backgroundColor`: Hex color code (e.g., "#0088aa")
- `foregroundColor`: Hex color code (e.g., "#ffffff")
- `hidden`: Whether calendar is hidden from UI
- `selected`: Whether calendar shows in UI (default: false)

#### Location & Time
- `location`: Geographic location (free-form text)
- `timeZone`: Calendar timezone

#### Notifications & Reminders
- `defaultReminders[]`: User's default reminders
  - `method`: "email" or "popup"
  - `minutes`: Minutes before event (0-40320)
- `notificationSettings`: Calendar-level notifications
  - `notifications[]`: Array of notification settings
    - `type`: "eventCreation", "eventChange", "eventCancellation", "eventResponse", "agenda"
    - `method`: "email"

#### Conference Settings
- `conferenceProperties`: Supported conference types
  - `allowedConferenceSolutionTypes[]`: "eventHangout", "eventNamedHangout", "hangoutsMeet"

#### Resource Management
- `autoAcceptInvitations`: Auto-accept for resource calendars
- `deleted`: Whether entry is deleted (read-only)
- `etag`: Resource version identifier

## Authorization Scopes

Required OAuth 2.0 scopes (choose one):
- `https://www.googleapis.com/auth/calendar.readonly` - Read-only access
- `https://www.googleapis.com/auth/calendar` - Full calendar access
- `https://www.googleapis.com/auth/calendar.calendarlist` - Calendar list management
- `https://www.googleapis.com/auth/calendar.calendarlist.readonly` - Read-only calendar list

## Pagination & Synchronization

### Pagination
- Use `maxResults` to control page size
- Use `nextPageToken` from response for subsequent pages
- Maximum 250 entries per page

### Incremental Sync
- Use `nextSyncToken` for incremental updates
- Subsequent requests with `syncToken` return only changed entries
- Handle 410 GONE response by clearing storage and full resync
- Cannot combine `syncToken` with `minAccessRole`

## Calendar Management Methods

### Available Operations
- `list`: Get all accessible calendars
- `get`: Retrieve specific calendar details
- `insert`: Add existing calendar to user's list
- `update`: Modify calendar list entry
- `patch`: Partial update (consumes 3 quota units)
- `delete`: Remove calendar from user's list
- `watch`: Set up push notifications for changes

## Implementation Examples

### Basic Calendar Discovery
```javascript
// List all accessible calendars
const response = await gapi.client.calendar.calendarList.list({
  maxResults: 250,
  showHidden: false
});

const calendars = response.result.items;
```

### Filtered Calendar Discovery
```javascript
// Get only calendars with write access
const response = await gapi.client.calendar.calendarList.list({
  minAccessRole: 'writer',
  showDeleted: false
});
```

### Calendar Metadata Extraction
```javascript
calendars.forEach(calendar => {
  console.log({
    id: calendar.id,
    name: calendar.summaryOverride || calendar.summary,
    owner: calendar.dataOwner || 'self',
    accessRole: calendar.accessRole,
    primary: calendar.primary || false,
    selected: calendar.selected || false,
    backgroundColor: calendar.backgroundColor,
    timeZone: calendar.timeZone
  });
});
```

## Key Considerations for Prep App

### Calendar Selection UI
- Use `summary` or `summaryOverride` for display names
- Show `accessRole` to indicate permissions
- Use `backgroundColor`/`foregroundColor` for visual consistency
- Filter by `selected: true` for active calendars

### Permission Management
- Check `accessRole` before allowing operations
- `reader` role limits event creation/modification
- `owner` role allows full calendar management

### Data Synchronization
- Implement `syncToken` for efficient updates
- Handle deleted/hidden calendars appropriately
- Cache calendar metadata for offline access

### Multi-Calendar Support
- Primary calendar: `primary: true`
- Secondary calendars: User-owned additional calendars
- Shared calendars: `dataOwner` field indicates external ownership
- Subscription calendars: Read-only external calendars

This comprehensive API structure enables robust calendar discovery and management for the Prep meeting assistant, supporting multi-calendar environments with proper permission handling and efficient synchronization.