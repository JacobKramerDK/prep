# Feature: Enhanced Google Calendar Management with Disconnect and Visibility

The following plan should be complete, but its important that you validate documentation and codebase patterns and task sanity before you start implementing.

Pay special attention to naming of existing utils types and models. Import from the right files etc.

## Feature Description

Transform the existing single-account Google Calendar integration into a proper multi-account system with full visibility and individual account management. Currently, the system only stores one Google account at a time (last connected account overwrites previous), but users expect to connect multiple Google accounts simultaneously and manage them individually with full transparency.

## User Story

As a meeting preparation user
I want to connect multiple Google Calendar accounts and see all connected accounts with their email addresses
So that I can manage each account individually, disconnect specific accounts, and have full control over which calendars provide meeting context

## Problem Statement

The current Google Calendar integration has fundamental multi-account limitations:
- **Single-account storage**: Only stores one refresh token, overwriting previous connections
- **No account visibility**: Users cannot see which Google accounts are actually connected
- **No individual management**: Cannot disconnect specific accounts without losing all connections
- **Misleading behavior**: Users think multiple accounts work, but only the last connected account is actually stored

## Solution Statement

Redesign the Google Calendar integration with proper multi-account architecture:
- **Multi-account storage**: Store array of connected accounts with individual tokens and metadata
- **Account visibility**: Display list of connected accounts with email addresses and names
- **Individual management**: Disconnect specific accounts while preserving others
- **5-account limit**: Prevent API quota issues with reasonable user limit
- **Event tagging**: Tag events with source account email for clarity
- **Migration**: Automatically migrate existing single-account users to new structure

## Feature Metadata

**Feature Type**: Enhancement (with breaking architectural changes)
**Estimated Complexity**: Medium-High
**Primary Systems Affected**: Settings storage schema, OAuth manager, Calendar manager, GoogleCalendarAuth component, IPC handlers
**Dependencies**: Google Calendar API v3 (calendarList.list, userinfo endpoints), existing OAuth infrastructure

---

## CONTEXT REFERENCES

### Relevant Codebase Files IMPORTANT: YOU MUST READ THESE FILES BEFORE IMPLEMENTING!

- `src/renderer/components/GoogleCalendarAuth.tsx` (lines 1-405) - Why: Current single-account UI that needs multi-account transformation
- `src/main/services/calendar-manager.ts` (lines 774-900) - Why: Contains single-account authentication logic that needs multi-account support
- `src/main/services/google-calendar-manager.ts` (lines 40-80) - Why: Shows calendar discovery patterns and event transformation
- `src/main/services/google-oauth-manager.ts` (lines 200-230) - Why: Current single-token storage that needs multi-token architecture
- `src/main/services/settings-manager.ts` (lines 264-300) - Why: Single-account storage schema that needs complete redesign
- `src/main/index.ts` (lines 414-450) - Why: Current single-account IPC handlers
- `src/main/preload.ts` (lines 152-170) - Why: Current API exposure patterns
- `src/shared/types/google-calendar.ts` - Why: Existing type definitions that need multi-account extensions

### New Files to Create

- `src/shared/types/multi-account-calendar.ts` - Multi-account type definitions and interfaces
- `src/main/services/multi-account-google-manager.ts` - Service for managing multiple Google accounts

### Relevant Documentation YOU SHOULD READ THESE BEFORE IMPLEMENTING!

- [Google Calendar API v3 - CalendarList](https://developers.google.com/calendar/api/v3/reference/calendarList)
  - Specific section: calendarList.list endpoint
  - Why: Required for discovering connected calendars and extracting metadata
- [Google Calendar API - Calendar Resource](https://developers.google.com/calendar/api/v3/reference/calendars)
  - Specific section: Calendar metadata structure
  - Why: Understanding calendar properties for display and management

### Patterns to Follow

**Multi-Account Storage Pattern** (new architecture):
```typescript
// Replace single-account storage with array-based storage
interface GoogleAccount {
  email: string
  name?: string
  refreshToken: string
  tokenExpiry: string
  connectedAt: Date
}

// Settings storage
googleAccounts: GoogleAccount[]  // Replace single googleCalendarRefreshToken
```

**Event Tagging Pattern** (for account identification):
```typescript
// Tag events with source account for clarity
const transformedEvent: CalendarEvent = {
  ...event,
  source: 'google' as const,
  sourceAccountEmail: account.email,  // NEW: Tag with account email
  calendarName: calendarName,
  calendarId: calendarId
}
```

**Component State Pattern** (from GoogleCalendarAuth.tsx):
```tsx
// Multi-account state management
const [connectedAccounts, setConnectedAccounts] = useState<GoogleAccount[]>([])
const [isConnected, setIsConnected] = useState(false)

useEffect(() => {
  loadConnectedAccounts()
}, [])
```

**Settings Migration Pattern** (backward compatibility):
```typescript
// Auto-migrate existing single account to new structure
async migrateToMultiAccount(): Promise<void> {
  const existingToken = await this.store.get('googleCalendarRefreshToken')
  if (existingToken && !this.store.get('googleAccounts')) {
    // Migrate single account to array format
    const existingEmail = await this.store.get('googleCalendarUserEmail')
    const migratedAccount = { email: existingEmail, refreshToken: existingToken, ... }
    await this.store.set('googleAccounts', [migratedAccount])
  }
}
```

**Error Handling Pattern** (from calendar-manager.ts):
```typescript
// Account-specific error handling
try {
  const events = await this.fetchAccountEvents(account)
  Debug.log(`[MULTI-GOOGLE] Retrieved ${events.length} events from ${account.email}`)
} catch (error) {
  Debug.error(`[MULTI-GOOGLE] Failed to fetch events from ${account.email}:`, error)
  // Continue with other accounts, don't fail entire sync
}
```

**UI Display Pattern** (Tailwind design system):
```tsx
// Connected accounts list with individual disconnect
{connectedAccounts.map(account => (
  <div key={account.email} className="flex items-center justify-between p-3 bg-surface border border-border rounded-lg">
    <div className="flex items-center space-x-3">
      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
      <div>
        <p className="text-sm font-medium text-primary">{account.name || account.email}</p>
        <p className="text-xs text-secondary">{account.email}</p>
      </div>
    </div>
    <button 
      onClick={() => handleDisconnectAccount(account.email)}
      className="px-3 py-1 text-xs font-medium text-red-600 bg-white border border-red-300 rounded hover:bg-red-50"
    >
      Disconnect
    </button>
  </div>
))}
```

---

## IMPLEMENTATION PLAN

### Phase 1: Foundation - Multi-Account Architecture

Redesign the storage and type system to support multiple Google accounts instead of single-account storage.

**Tasks:**
- Create multi-account type definitions and interfaces
- Design new storage schema for account arrays
- Plan migration strategy from single-account to multi-account storage

### Phase 2: Backend Services - Multi-Account Management

Implement backend services to manage multiple Google accounts with individual tokens and metadata.

**Tasks:**
- Create multi-account Google manager service
- Implement account discovery and user info fetching
- Add storage methods for account arrays with migration
- Update OAuth manager for multi-account token handling

### Phase 3: Integration Layer - IPC and Calendar Manager

Update the integration layer to work with multiple accounts and aggregate events from all connected accounts.

**Tasks:**
- Update calendar manager to fetch from multiple accounts
- Create new IPC handlers for multi-account operations
- Implement event aggregation with account tagging
- Add account limit enforcement (5 accounts max)

### Phase 4: Frontend Transformation - Multi-Account UI

Transform the GoogleCalendarAuth component to display and manage multiple connected accounts.

**Tasks:**
- Add connected accounts list display
- Implement individual account disconnect functionality
- Update authentication flow for adding additional accounts
- Add account limit UI feedback

---

## STEP-BY-STEP TASKS

IMPORTANT: Execute every task in order, top to bottom. Each task is atomic and independently testable.

### CREATE src/shared/types/multi-account-calendar.ts

- **IMPLEMENT**: Multi-account type definitions and interfaces
- **PATTERN**: Follow existing type definition patterns from `src/shared/types/google-calendar.ts`
- **IMPORTS**: No external imports needed for type definitions
- **GOTCHA**: Include migration types and account limit constants (MAX_GOOGLE_ACCOUNTS = 5)
- **VALIDATE**: `npx tsc --noEmit src/shared/types/multi-account-calendar.ts`

### UPDATE src/shared/types/ipc.ts

- **IMPLEMENT**: Add IPC method signatures for multi-account operations
- **PATTERN**: Follow existing IPC method patterns like `authenticateGoogleCalendar: () => Promise<string>`
- **IMPORTS**: Import new multi-account types
- **GOTCHA**: Replace single-account methods with multi-account equivalents
- **VALIDATE**: `npx tsc --noEmit src/shared/types/ipc.ts`

### CREATE src/main/services/multi-account-google-manager.ts

- **IMPLEMENT**: Service class for managing multiple Google accounts
- **PATTERN**: Mirror structure from `google-oauth-manager.ts` with account array handling
- **IMPORTS**: Import Google APIs, SettingsManager, Debug utilities, and new types
- **GOTCHA**: Implement account limit enforcement and user info fetching per account
- **VALIDATE**: `npx tsc --noEmit src/main/services/multi-account-google-manager.ts`

### UPDATE src/main/services/settings-manager.ts

- **IMPLEMENT**: Multi-account storage methods with automatic migration
- **PATTERN**: Replace single-account methods with array-based storage
- **IMPORTS**: Import new multi-account types
- **GOTCHA**: Implement migration from existing single-account storage in constructor
- **VALIDATE**: `npx tsc --noEmit src/main/services/settings-manager.ts`

### UPDATE src/main/services/google-oauth-manager.ts

- **IMPLEMENT**: Multi-account token management
- **PATTERN**: Extend existing OAuth flow to work with account arrays
- **IMPORTS**: Import new multi-account types and updated SettingsManager
- **GOTCHA**: Store account metadata (email, name) along with tokens
- **VALIDATE**: `npx tsc --noEmit src/main/services/google-oauth-manager.ts`

### UPDATE src/main/services/google-calendar-manager.ts

- **IMPLEMENT**: Multi-account event fetching with account tagging
- **PATTERN**: Extend existing getEvents method to accept account parameter
- **IMPORTS**: Import new multi-account types
- **GOTCHA**: Tag events with sourceAccountEmail for identification
- **VALIDATE**: `npx tsc --noEmit src/main/services/google-calendar-manager.ts`

### UPDATE src/main/services/calendar-manager.ts

- **IMPLEMENT**: Multi-account integration and event aggregation
- **PATTERN**: Replace single-account calls with multi-account iteration
- **IMPORTS**: Import MultiAccountGoogleManager and new types
- **GOTCHA**: Aggregate events from all accounts, handle per-account errors gracefully
- **VALIDATE**: `npx tsc --noEmit src/main/services/calendar-manager.ts`

### UPDATE src/main/index.ts

- **IMPLEMENT**: New IPC handlers for multi-account operations
- **PATTERN**: Replace existing single-account handlers with multi-account versions
- **IMPORTS**: No new imports needed, use existing calendarManager
- **GOTCHA**: Maintain backward compatibility for existing method names where possible
- **VALIDATE**: `npx tsc --noEmit src/main/index.ts`

### UPDATE src/main/preload.ts

- **IMPLEMENT**: Expose new multi-account methods to renderer
- **PATTERN**: Replace single-account API exposure with multi-account methods
- **IMPORTS**: No new imports needed
- **GOTCHA**: Update method signatures to return arrays instead of single values
- **VALIDATE**: `npx tsc --noEmit src/main/preload.ts`

### UPDATE src/renderer/components/GoogleCalendarAuth.tsx

- **IMPLEMENT**: Multi-account UI with connected accounts list and individual disconnect
- **PATTERN**: Transform existing single-account state to multi-account array state
- **IMPORTS**: No new imports needed, use existing React hooks and Lucide icons
- **GOTCHA**: Replace single userInfo state with connectedAccounts array, add account limit feedback
- **VALIDATE**: `npm run dev:renderer` and check component renders without errors

### UPDATE src/shared/types/ipc.d.ts

- **IMPLEMENT**: Update ElectronAPI interface for multi-account methods
- **PATTERN**: Follow existing method signature patterns
- **IMPORTS**: Import new multi-account types
- **GOTCHA**: Ensure method names match exactly with preload.ts implementations
- **VALIDATE**: `npx tsc --noEmit src/shared/types/ipc.d.ts`

---

## TESTING STRATEGY

### Unit Tests

**Scope**: Test multi-account functionality and migration logic
- MultiAccountGoogleManager account storage and retrieval
- Settings manager multi-account storage and migration from single-account
- Component state management for multiple connected accounts
- Account limit enforcement (5 accounts max)

**Framework**: Follow existing Jest patterns in `tests/helpers/` directory

### Integration Tests

**Scope**: Test end-to-end multi-account workflows
- Multiple account authentication and storage
- Individual account disconnection without affecting others
- Event aggregation from multiple accounts with proper tagging
- UI state updates after multi-account operations

**Framework**: Use existing Playwright E2E test patterns from `tests/e2e-stable/`

### Edge Cases

**Specific edge cases that must be tested for this feature:**
- Migration from existing single-account to multi-account storage
- Connecting 5 accounts (limit) and attempting to connect 6th account
- Disconnecting account while events are being fetched from multiple accounts
- OAuth token refresh failure for one account while others remain connected
- Multiple accounts with same email domain but different names
- Account disconnection when only one account remains (should not break UI)
- Event deduplication when multiple accounts have identical events

---

## VALIDATION COMMANDS

Execute every command to ensure zero regressions and 100% feature correctness.

### Level 1: Syntax & Style

```bash
# TypeScript compilation check
npx tsc --noEmit

# ESLint check (if configured)
npm run lint
```

### Level 2: Unit Tests

```bash
# Run existing helper tests to ensure no regressions
npm run test:helpers

# Run specific tests for new functionality (if created)
npm test -- --testPathPattern=connected-calendar
```

### Level 3: Integration Tests

```bash
# Run stable E2E tests to ensure no regressions
npm run test:e2e:stable

# Run Google Calendar specific tests
npm test -- --testPathPattern=google-credential-management
```

### Level 4: Manual Validation

**Feature-specific manual testing steps:**

1. **Multi-Account Connection Flow**:
   ```bash
   npm run dev
   # Navigate to Settings → Calendar → Google Calendar
   # Connect first Google Calendar account
   # Verify account appears in connected accounts list with email
   # Click "Connect Google Calendar" again to add second account
   # Verify both accounts appear in list
   ```

2. **Individual Account Disconnect**:
   ```bash
   # In connected accounts section
   # Click disconnect on first account
   # Verify only first account removed from list
   # Verify second account remains connected
   # Verify events from disconnected account no longer appear
   ```

3. **Account Limit Testing**:
   ```bash
   # Connect 5 different Google accounts
   # Attempt to connect 6th account
   # Verify limit warning appears
   # Verify 6th account is not added
   ```

4. **Migration Testing**:
   ```bash
   # Test with existing single-account installation
   # Start app with new multi-account code
   # Verify existing account migrated to new structure
   # Verify existing events still appear
   ```

### Level 5: Additional Validation (Optional)

```bash
# Build production version to test packaging
npm run build

# Test cross-platform compatibility (if on macOS)
npm run package
```

---

## ACCEPTANCE CRITERIA

- [ ] Users can connect up to 5 different Google Calendar accounts simultaneously
- [ ] Each connected account displays with email address and name (when available) in a list
- [ ] Each connected account has an individual disconnect button
- [ ] Disconnecting an account removes only that account and its events, preserving others
- [ ] Events are tagged with source account email for identification
- [ ] Existing single-account users are automatically migrated to multi-account structure
- [ ] Account limit (5) is enforced with user-friendly feedback
- [ ] "Connect Google Calendar" button works for adding additional accounts
- [ ] All existing Google Calendar functionality continues to work without regression
- [ ] UI follows existing Tailwind v4 design system patterns
- [ ] Feature works on both Windows and macOS
- [ ] All validation commands pass with zero errors
- [ ] Connected accounts list updates automatically after authentication
- [ ] Migration preserves existing calendar events and settings

---

## COMPLETION CHECKLIST

- [ ] All tasks completed in order
- [ ] Each task validation passed immediately
- [ ] All validation commands executed successfully
- [ ] Full test suite passes (unit + integration)
- [ ] No linting or type checking errors
- [ ] Manual testing confirms feature works
- [ ] Acceptance criteria all met
- [ ] Code reviewed for quality and maintainability
- [ ] Cross-platform compatibility verified
- [ ] Existing functionality regression tested

---

## NOTES

**Design Decisions:**
- **Multi-account storage**: Replace single-account fields with GoogleAccount[] array for proper multi-account support
- **Event tagging**: Add sourceAccountEmail to events for user clarity and debugging
- **Account identification**: Display email + name (when available) for user-friendly identification
- **Authentication flow**: Reuse existing "Connect Google Calendar" button, change text to "Add Another Account" when accounts exist
- **Account limit**: 5 accounts maximum to prevent API quota issues and maintain performance
- **Migration strategy**: Automatic migration from single-account to multi-account on first startup

**Trade-offs:**
- **Breaking changes acceptable**: Beta product allows storage schema changes without backward compatibility
- **Complexity vs. functionality**: Multi-account architecture adds complexity but provides essential user control
- **API quota management**: 5-account limit balances functionality with Google API quota constraints
- **Storage migration**: One-time migration complexity vs. clean multi-account architecture

**Performance Considerations:**
- **Account limit**: 5 accounts maximum prevents API quota exhaustion and maintains reasonable sync times
- **Event aggregation**: Events from all accounts fetched in parallel with per-account error handling
- **Storage efficiency**: Account metadata cached locally to avoid repeated API calls for user info
- **Migration performance**: One-time migration on startup, subsequent operations use optimized multi-account storage

**Security Considerations:**
- **Token isolation**: Each account's refresh token stored separately for individual revocation
- **Account disconnection**: Removes local storage only, doesn't revoke OAuth tokens (user can revoke in Google settings)
- **Event tagging**: Source account email helps users identify data sources for privacy awareness
- **API scope**: Uses existing calendar.readonly scope, no additional permissions required
