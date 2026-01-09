# Feature: Google Calendar Integration

The following plan should be complete, but its important that you validate documentation and codebase patterns and task sanity before you start implementing.

Pay special attention to naming of existing utils types and models. Import from the right files etc.

## Feature Description

Add Google Calendar integration to the Prep meeting assistant, enabling users to authenticate with Google and extract events from their Google Calendar alongside existing Apple Calendar and ICS file support. This integration will use OAuth 2.0 with PKCE for secure authentication and the Google Calendar API v3 for event retrieval.

## User Story

As a knowledge worker using Google Calendar
I want to connect my Google Calendar to Prep
So that I can automatically surface relevant context from my Obsidian vault for Google Calendar meetings

## Problem Statement

Currently, Prep only supports Apple Calendar (via AppleScript/Swift) and ICS file imports. Many users rely on Google Calendar as their primary calendar system, especially in cross-platform environments or organizations using Google Workspace. Without Google Calendar integration, these users cannot benefit from Prep's meeting preparation features.

## Solution Statement

Implement Google Calendar API integration using OAuth 2.0 authentication with PKCE for desktop applications. The solution will follow existing calendar integration patterns, adding Google Calendar as a third source alongside AppleScript and ICS parsing. Users will authenticate once, with refresh tokens stored securely for ongoing access.

## Feature Metadata

**Feature Type**: New Capability
**Estimated Complexity**: High
**Primary Systems Affected**: CalendarManager, SettingsManager, CalendarImport UI, Settings UI
**Dependencies**: googleapis npm package, OAuth 2.0 flow implementation

---

## CONTEXT REFERENCES

### Relevant Codebase Files IMPORTANT: YOU MUST READ THESE FILES BEFORE IMPLEMENTING!

- `src/main/services/calendar-manager.ts` (lines 1-50, 100-200) - Why: Main calendar orchestration patterns, caching, error handling
- `src/main/services/settings-manager.ts` (lines 1-50) - Why: Secure storage patterns with electron-store encryption
- `src/shared/types/calendar.ts` - Why: Calendar event interfaces and IPC serialization patterns
- `src/shared/types/calendar-selection.ts` - Why: Calendar selection and discovery patterns
- `src/main/preload.ts` (lines 1-50) - Why: IPC handler patterns and date serialization
- `src/shared/types/ipc.ts` - Why: IPC interface definitions and method signatures
- `src/renderer/components/CalendarImport.tsx` - Why: Calendar import UI patterns and error handling
- `src/renderer/components/Settings.tsx` - Why: Settings UI patterns for API key management
- `package.json` - Why: Current dependencies and build configuration

### New Files to Create

- `src/main/services/google-calendar-manager.ts` - Google Calendar API service implementation
- `src/main/services/google-oauth-manager.ts` - OAuth 2.0 authentication flow management
- `src/shared/types/google-calendar.ts` - Google Calendar specific types and interfaces
- `src/renderer/components/GoogleCalendarAuth.tsx` - Google Calendar authentication UI component
- `tests/unit/google-calendar-manager.test.ts` - Unit tests for Google Calendar service
- `tests/unit/google-oauth-manager.test.ts` - Unit tests for OAuth manager

### Relevant Documentation YOU SHOULD READ THESE BEFORE IMPLEMENTING!

- [Google Calendar API v3 Reference](https://developers.google.com/calendar/api/v3/reference)
  - Specific section: Events.list endpoint
  - Why: Primary endpoint for retrieving calendar events
- [OAuth 2.0 for Desktop Apps](https://developers.google.com/identity/protocols/oauth2/native-app)
  - Specific section: PKCE implementation
  - Why: Required security pattern for desktop OAuth flows
- [googleapis Node.js Client](https://github.com/googleapis/google-api-nodejs-client)
  - Specific section: Authentication setup
  - Why: Official Node.js client library for Google APIs
- [Google Calendar API Scopes](https://developers.google.com/calendar/api/auth)
  - Specific section: calendar.readonly scope
  - Why: Minimum required permissions for read-only access

### Patterns to Follow

**Naming Conventions:**
- Services: kebab-case files (e.g., `google-calendar-manager.ts`)
- Components: PascalCase (e.g., `GoogleCalendarAuth.tsx`)
- Types: kebab-case files (e.g., `google-calendar.ts`)

**Error Handling:**
```typescript
export class GoogleCalendarError extends Error {
  constructor(
    message: string,
    public code: 'AUTH_FAILED' | 'API_ERROR' | 'RATE_LIMITED' | 'NETWORK_ERROR',
    public cause?: Error
  ) {
    super(message)
    this.name = 'GoogleCalendarError'
  }
}
```

**Settings Storage Pattern:**
```typescript
// In SettingsManager - follow existing openaiApiKey pattern
googleCalendarRefreshToken: string | null
googleCalendarTokenExpiry: string | null
googleCalendarUserEmail: string | null
```

**CRITICAL IMPLEMENTATION PATTERNS (Risk Mitigation):**

**OAuth 2.0 PKCE Pattern:**
```typescript
// PROVEN PATTERN - Use exactly this implementation
const codeVerifier = crypto.randomBytes(32).toString('base64url')
const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url')
// Always use S256 method, never plain
```

**Rate Limiting with Exponential Backoff:**
```typescript
// PROVEN PATTERN - Google Calendar API specific
const delay = Math.min(1000 * Math.pow(2, attempt) + Math.random() * 1000, 30000)
// Respect retry-after header, max 30s delay
```

**Token Storage with Electron safeStorage:**
```typescript
// PROVEN PATTERN - Use Electron's secure storage
import { safeStorage } from 'electron'
const encryptedToken = safeStorage.encryptString(refreshToken)
// Store as base64 string in electron-store
```

**OAuth Redirect Handling:**
```typescript
// PROVEN PATTERN - Local server for development
const server = express().listen(8080, 'localhost')
const redirectUri = 'http://localhost:8080/oauth/callback'
// Timeout after 5 minutes, proper cleanup
```

**IPC Handler Pattern:**
```typescript
// Follow existing calendar: namespace
ipcMain.handle('calendar:authenticateGoogle', async () => { ... })
ipcMain.handle('calendar:getGoogleEvents', async () => { ... })
ipcMain.handle('calendar:disconnectGoogle', async () => { ... })
```

---

## CRITICAL CODE TEMPLATES (Copy Exactly)

**OAuth Manager Core Structure:**
```typescript
export class GoogleOAuthManager {
  private readonly CLIENT_ID = 'your-client-id'
  private readonly SCOPES = ['https://www.googleapis.com/auth/calendar.readonly']
  private readonly REDIRECT_URI = 'http://localhost:8080/oauth/callback'
  
  async initiateOAuthFlow(): Promise<string> {
    const codeVerifier = crypto.randomBytes(32).toString('base64url')
    const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url')
    
    // Store verifier temporarily (NOT in settings)
    this.tempStorage.set('codeVerifier', codeVerifier)
    
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${new URLSearchParams({
      client_id: this.CLIENT_ID,
      redirect_uri: this.REDIRECT_URI,
      response_type: 'code',
      scope: this.SCOPES.join(' '),
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
      state: crypto.randomBytes(16).toString('hex')
    })}`
    
    return authUrl
  }
}
```

**Rate Limiting Implementation:**
```typescript
private async makeRequestWithRetry<T>(request: () => Promise<T>, maxRetries = 3): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await request()
    } catch (error: any) {
      if (error.code === 429 || error.code === 403) {
        const delay = Math.min(1000 * Math.pow(2, attempt) + Math.random() * 1000, 30000)
        await new Promise(resolve => setTimeout(resolve, delay))
        continue
      }
      throw error
    }
  }
  throw new Error('Max retries exceeded')
}
```

**Event Transformation Pattern:**
```typescript
private transformGoogleEvent(googleEvent: any): CalendarEvent {
  const startDate = googleEvent.start?.dateTime 
    ? new Date(googleEvent.start.dateTime)
    : new Date(googleEvent.start.date + 'T00:00:00')
    
  const endDate = googleEvent.end?.dateTime
    ? new Date(googleEvent.end.dateTime) 
    : new Date(googleEvent.end.date + 'T23:59:59')
    
  return {
    id: `google-${googleEvent.id}`,
    title: googleEvent.summary || 'Untitled Event',
    description: googleEvent.description,
    startDate,
    endDate,
    location: googleEvent.location,
    attendees: googleEvent.attendees?.map((a: any) => a.email) || [],
    isAllDay: !googleEvent.start?.dateTime,
    source: 'google' as const,
    calendarName: 'Google Calendar'
  }
}
```

---

## IMPLEMENTATION PLAN

### Phase 1: Foundation

Set up Google Calendar API dependencies, OAuth infrastructure, and core type definitions.

**Tasks:**
- Install googleapis npm package and configure OAuth client
- Create Google Calendar specific types and error classes
- Set up OAuth 2.0 manager with PKCE implementation
- Add Google Calendar settings to SettingsManager schema

### Phase 2: Core Implementation

Implement Google Calendar API service and OAuth authentication flow.

**Tasks:**
- Create GoogleOAuthManager for authentication flow
- Implement GoogleCalendarManager for API interactions
- Add secure token storage and refresh logic
- Integrate with existing CalendarManager orchestration

### Phase 3: Integration

Connect Google Calendar service to existing calendar infrastructure and UI.

**Tasks:**
- Add Google Calendar source to CalendarManager
- Update calendar selection UI to include Google Calendar
- Create Google Calendar authentication component
- Add Google Calendar settings to Settings UI

### Phase 4: Testing & Validation

Implement comprehensive testing and validate integration.

**Tasks:**
- Create unit tests for OAuth and API managers
- Add integration tests for calendar event retrieval
- Test error handling and token refresh scenarios
- Validate UI flows and user experience

---

## STEP-BY-STEP TASKS

IMPORTANT: Execute every task in order, top to bottom. Each task is atomic and independently testable.

### PRE-IMPLEMENTATION VALIDATION

**MANDATORY: Execute these checks before starting any implementation:**

1. **Verify Current Calendar Integration:**
   ```bash
   # Ensure existing calendar system works
   npm run dev
   # Test Apple Calendar import in UI
   # Verify events appear in Today's Meetings
   ```

2. **Validate Dependencies:**
   ```bash
   # Check current dependencies are working
   npm install
   npm run build
   # Ensure no existing build errors
   ```

3. **Confirm Settings Manager Pattern:**
   ```bash
   # Verify settings encryption works
   grep -n "openaiApiKey" src/main/services/settings-manager.ts
   # Confirm encryption pattern at line ~50
   ```

4. **Test IPC Communication:**
   ```bash
   # Verify existing IPC handlers work
   grep -n "calendar:" src/main/index.ts
   # Confirm handler registration pattern
   ```

**STOP**: Do not proceed unless all pre-implementation validations pass.

---

### CREATE src/shared/types/google-calendar.ts

- **IMPLEMENT**: Google Calendar specific types and interfaces
- **PATTERN**: Mirror calendar.ts structure for consistency
- **IMPORTS**: None (pure type definitions)
- **GOTCHA**: Use same CalendarEvent interface, add 'google' as source type
- **VALIDATE**: `npx tsc --noEmit src/shared/types/google-calendar.ts`

### UPDATE package.json

- **IMPLEMENT**: Add googleapis and express dependencies
- **PATTERN**: Follow existing dependency structure
- **IMPORTS**: Add `"googleapis": "^144.0.0"` and `"express": "^4.18.2"` to dependencies
- **GOTCHA**: googleapis v144+ has breaking changes, express needed for OAuth redirect server
- **CRITICAL**: Also add `"@types/express": "^4.17.21"` to devDependencies
- **VALIDATE**: `npm install && npm ls googleapis express`

### CREATE src/main/services/google-oauth-manager.ts

- **IMPLEMENT**: OAuth 2.0 authentication flow with PKCE
- **PATTERN**: Follow settings-manager.ts error handling and async patterns
- **IMPORTS**: `import { google } from 'googleapis'`, `import { safeStorage } from 'electron'`, `import * as crypto from 'crypto'`, `import * as express from 'express'`
- **GOTCHA**: Use `crypto.randomBytes(32).toString('base64url')` for code verifier, SHA256 for challenge, localhost:8080 redirect
- **CRITICAL**: Include complete OAuth state machine with timeout handling
- **VALIDATE**: `npx tsc --noEmit src/main/services/google-oauth-manager.ts`

### CREATE src/main/services/google-calendar-manager.ts

- **IMPLEMENT**: Google Calendar API service for event retrieval
- **PATTERN**: Mirror swift-calendar-manager.ts structure and error handling
- **IMPORTS**: `import { google } from 'googleapis'`, `GoogleOAuthManager`, `CalendarEvent` types
- **GOTCHA**: Use `singleEvents: true`, handle `dateTime` vs `date` fields, implement exponential backoff with jitter
- **CRITICAL**: Include rate limiting queue system and proper event transformation
- **VALIDATE**: `npx tsc --noEmit src/main/services/google-calendar-manager.ts`

### UPDATE src/main/services/settings-manager.ts

- **IMPLEMENT**: Add Google Calendar settings to schema
- **PATTERN**: Follow existing openaiApiKey encryption pattern
- **IMPORTS**: No new imports needed
- **GOTCHA**: Use safeStorage for token encryption, add proper defaults
- **CRITICAL**: Add these exact fields to SettingsSchema:
  ```typescript
  googleCalendarRefreshToken: string | null
  googleCalendarTokenExpiry: string | null  
  googleCalendarUserEmail: string | null
  googleCalendarConnected: boolean
  ```
- **VALIDATE**: `npx tsc --noEmit src/main/services/settings-manager.ts`

### UPDATE src/shared/types/calendar.ts

- **IMPLEMENT**: Add 'google' to CalendarEvent source union type
- **PATTERN**: Extend existing source type union
- **IMPORTS**: No new imports needed
- **GOTCHA**: Update all related type guards and serialization functions
- **VALIDATE**: `npx tsc --noEmit src/shared/types/calendar.ts`

### UPDATE src/main/services/calendar-manager.ts

- **IMPLEMENT**: Integrate GoogleCalendarManager into existing orchestration
- **PATTERN**: Follow existing Swift/AppleScript integration pattern
- **IMPORTS**: GoogleCalendarManager, GoogleCalendarError
- **GOTCHA**: Add to extractAppleScriptEvents method, handle Google-specific errors
- **VALIDATE**: `npx tsc --noEmit src/main/services/calendar-manager.ts`

### UPDATE src/main/preload.ts

- **IMPLEMENT**: Add Google Calendar IPC methods
- **PATTERN**: Follow existing calendar method patterns with date serialization
- **IMPORTS**: No new imports needed
- **GOTCHA**: Ensure proper date serialization for Google Calendar events
- **VALIDATE**: `npx tsc --noEmit src/main/preload.ts`

### UPDATE src/shared/types/ipc.ts

- **IMPLEMENT**: Add Google Calendar methods to ElectronAPI interface
- **PATTERN**: Follow existing calendar method naming convention
- **IMPORTS**: No new imports needed
- **GOTCHA**: Use consistent naming (authenticateGoogle, getGoogleEvents, etc.)
- **VALIDATE**: `npx tsc --noEmit src/shared/types/ipc.ts`

### UPDATE src/main/index.ts

- **IMPLEMENT**: Register Google Calendar IPC handlers
- **PATTERN**: Follow existing IPC handler registration pattern
- **IMPORTS**: GoogleCalendarManager, GoogleOAuthManager
- **GOTCHA**: Initialize managers in proper order, handle async initialization
- **VALIDATE**: `npx tsc --noEmit src/main/index.ts`

### CREATE src/renderer/components/GoogleCalendarAuth.tsx

- **IMPLEMENT**: Google Calendar authentication UI component
- **PATTERN**: Mirror Settings.tsx API key management patterns
- **IMPORTS**: React hooks, ElectronAPI types
- **GOTCHA**: Handle OAuth flow states (unauthenticated, authenticating, authenticated, error)
- **VALIDATE**: `npx tsc --noEmit src/renderer/components/GoogleCalendarAuth.tsx`

### UPDATE src/renderer/components/CalendarImport.tsx

- **IMPLEMENT**: Add Google Calendar option to import sources
- **PATTERN**: Follow existing AppleScript/ICS source patterns
- **IMPORTS**: GoogleCalendarAuth component
- **GOTCHA**: Handle Google Calendar authentication state in UI flow
- **VALIDATE**: `npx tsc --noEmit src/renderer/components/CalendarImport.tsx`

### UPDATE src/renderer/components/Settings.tsx

- **IMPLEMENT**: Add Google Calendar settings section
- **PATTERN**: Follow existing OpenAI API key section structure
- **IMPORTS**: GoogleCalendarAuth component
- **GOTCHA**: Show connection status, allow disconnection, handle errors gracefully
- **VALIDATE**: `npx tsc --noEmit src/renderer/components/Settings.tsx`

### CREATE tests/unit/google-oauth-manager.test.ts

- **IMPLEMENT**: Unit tests for OAuth manager
- **PATTERN**: Follow existing test structure and mocking patterns
- **IMPORTS**: Jest, GoogleOAuthManager, mock googleapis
- **GOTCHA**: Mock external dependencies, test error scenarios
- **VALIDATE**: `npm test tests/unit/google-oauth-manager.test.ts`

### CREATE tests/unit/google-calendar-manager.test.ts

- **IMPLEMENT**: Unit tests for Google Calendar manager
- **PATTERN**: Follow existing service test patterns
- **IMPORTS**: Jest, GoogleCalendarManager, mock googleapis
- **GOTCHA**: Test rate limiting, error handling, event conversion
- **VALIDATE**: `npm test tests/unit/google-calendar-manager.test.ts`

---

## TESTING STRATEGY

### Unit Tests

Design unit tests with fixtures and assertions following existing Jest patterns in the project.

**GoogleOAuthManager Tests:**
- OAuth flow initiation and completion
- Token refresh and storage
- Error handling for network failures
- PKCE implementation validation

**GoogleCalendarManager Tests:**
- Event retrieval and conversion
- Rate limiting and retry logic
- Authentication error handling
- API response parsing

### Integration Tests

**End-to-End Calendar Flow:**
- Complete OAuth authentication flow
- Event retrieval from Google Calendar
- Integration with existing calendar selection
- Error recovery and user feedback

### Edge Cases

- Network connectivity issues during OAuth flow
- Expired or revoked refresh tokens
- Rate limiting from Google Calendar API
- Large calendar datasets (1000+ events)
- Concurrent authentication attempts

---

## VALIDATION COMMANDS

Execute every command to ensure zero regressions and 100% feature correctness.

### Level 1: Syntax & Style

```bash
npx tsc --noEmit
npm run build:main
npm run build:renderer
```

### Level 2: Unit Tests

```bash
npm test
npm run test:coverage
```

### Level 3: Integration Tests

```bash
npm run test:e2e
```

### Level 4: Manual Validation

**Google Calendar Authentication:**
```bash
# Start app in development mode
npm run dev
# Navigate to Settings > Google Calendar
# Click "Connect Google Calendar"
# Complete OAuth flow in browser
# Verify connection status shows "Connected"
```

**Event Retrieval:**
```bash
# With authenticated Google Calendar
# Navigate to Calendar Import
# Select "Google Calendar" source
# Click "Import Events"
# Verify events appear in Today's Meetings
```

### Level 5: Additional Validation (Optional)

**API Rate Limiting:**
- Test with high-frequency requests to verify rate limiting
- Verify exponential backoff implementation

**Token Refresh:**
- Test token refresh after expiration
- Verify seamless re-authentication

---

## ACCEPTANCE CRITERIA

- [ ] Users can authenticate with Google Calendar using OAuth 2.0
- [ ] Google Calendar events are retrieved and displayed alongside other sources
- [ ] Refresh tokens are stored securely and refreshed automatically
- [ ] Rate limiting is handled gracefully with exponential backoff
- [ ] Authentication state is persisted across app restarts
- [ ] Users can disconnect Google Calendar and clear stored tokens
- [ ] Error messages are user-friendly and actionable
- [ ] All validation commands pass with zero errors
- [ ] Unit test coverage meets requirements (80%+)
- [ ] Integration tests verify end-to-end workflows
- [ ] Code follows project conventions and patterns
- [ ] No regressions in existing calendar functionality

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

---

## TROUBLESHOOTING GUIDE

**OAuth Flow Issues:**
- **Error**: "invalid_client" → Check CLIENT_ID matches Google Console
- **Error**: "redirect_uri_mismatch" → Verify localhost:8080 is registered
- **Error**: "invalid_grant" → Code verifier/challenge mismatch, regenerate

**API Rate Limiting:**
- **Error**: 429 Too Many Requests → Exponential backoff not working
- **Solution**: Check retry logic includes jitter: `Math.random() * 1000`

**Token Storage Issues:**
- **Error**: safeStorage not available → Add development fallback
- **Solution**: Use `safeStorage.isEncryptionAvailable()` check

**Event Transformation Errors:**
- **Error**: Invalid date format → Google uses ISO 8601, handle timezone
- **Solution**: Use `new Date(dateTime)` for dateTime, `new Date(date + 'T00:00:00')` for date

**Common Implementation Mistakes:**
1. Storing code verifier in persistent storage (security risk)
2. Not handling all-day events (date vs dateTime fields)
3. Missing rate limit headers in retry logic
4. Not cleaning up OAuth redirect server
5. Forgetting to add 'google' to CalendarEvent source union type

---

## CONFIDENCE SCORE: 9.5/10

**Confidence Boosters Added:**
- ✅ Complete OAuth PKCE implementation template
- ✅ Proven rate limiting pattern with exponential backoff + jitter  
- ✅ Exact event transformation code
- ✅ Pre-implementation validation checklist
- ✅ Comprehensive troubleshooting guide
- ✅ Critical code templates eliminate guesswork
- ✅ Specific import statements and dependency versions
- ✅ Common mistake prevention guide

**Remaining 0.5 Risk:**
- Google OAuth client configuration (external dependency)
- Network connectivity during development testing

**Security Considerations:**
- Refresh tokens are encrypted using electron-store encryption
- OAuth flow uses PKCE to prevent authorization code interception
- Loopback redirect URI prevents custom scheme vulnerabilities
- API keys and tokens are never logged or exposed in error messages

**Performance Considerations:**
- Google Calendar API has rate limits (100 requests/100 seconds/user)
- Implement exponential backoff for rate limit errors
- Cache events locally to minimize API calls
- Use incremental sync when possible (sync tokens)

**User Experience:**
- OAuth flow opens in system browser for better security
- Clear authentication states and error messages
- Graceful degradation when Google Calendar is unavailable
- Consistent UI patterns with existing calendar sources

**Future Enhancements:**
- Real-time event updates using Google Calendar webhooks
- Support for multiple Google accounts
- Calendar-specific settings and preferences
- Incremental sync for better performance
