# Technical Code Review: Multi-Account Google Calendar Implementation

## Review Summary

**Stats:**
- Files Modified: 11
- Files Added: 2  
- Files Deleted: 0
- New lines: 352
- Deleted lines: 80

## Issues Found

### CRITICAL Issues

severity: critical
file: src/main/services/settings-manager.ts
line: 108
issue: Async method called in constructor without proper error handling
detail: The migrateToMultiAccount() method is called in the constructor without await or proper error handling. If migration fails, it could leave the application in an inconsistent state. Constructor should not perform async operations.
suggestion: Move migration to a separate initialization method that can be properly awaited and handle errors appropriately.

### HIGH Issues

severity: high
file: src/main/services/multi-account-google-manager.ts
line: 45-50
issue: Potential race condition in account limit checking
detail: Between checking the account limit and adding the account, another process could add an account, causing the limit to be exceeded. This is a classic TOCTOU (Time-of-Check-Time-of-Use) vulnerability.
suggestion: Use atomic operations or implement proper locking mechanism. Consider checking the limit again after fetching user info but before adding to the array.

severity: high
file: src/main/services/multi-account-google-manager.ts
line: 113-120
issue: API call without rate limiting or retry logic
detail: The fetchUserInfo method makes direct API calls to Google without implementing rate limiting or retry logic, which could lead to API quota exhaustion or transient failures.
suggestion: Implement exponential backoff retry logic and rate limiting similar to the existing makeRequestWithRetry pattern in GoogleCalendarManager.

severity: high
file: src/main/services/calendar-manager.ts
line: 860-875
issue: Potential memory leak with parallel account processing
detail: The code fetches events from all accounts in parallel without limiting concurrency. With 5 accounts, this could create excessive concurrent API calls and memory usage.
suggestion: Implement concurrency limiting using Promise.allSettled with a concurrency limit (e.g., 2-3 concurrent requests).

### MEDIUM Issues

severity: medium
file: src/shared/types/multi-account-calendar.ts
line: 11-16
issue: Missing validation for Date field serialization
detail: The connectedAt field is a Date object, but when stored/retrieved from electron-store, it may be serialized as a string. This could cause type mismatches.
suggestion: Add proper Date serialization/deserialization handling or use ISO string consistently.

severity: medium
file: src/main/services/multi-account-google-manager.ts
line: 55-60
issue: Duplicate account check is case-sensitive
detail: Email comparison for duplicate detection is case-sensitive, but email addresses should be compared case-insensitively according to RFC standards.
suggestion: Convert emails to lowercase before comparison: `account.email.toLowerCase() === userInfo.email.toLowerCase()`

severity: medium
file: src/renderer/components/GoogleCalendarAuth.tsx
line: 32-40
issue: Multiple async calls without proper error isolation
detail: Promise.all is used for loading credentials, but if one call fails, all fail. This could prevent the UI from loading even if some data is available.
suggestion: Use Promise.allSettled to handle partial failures gracefully and show available data.

severity: medium
file: src/main/services/settings-manager.ts
line: 120-140
issue: Migration logic doesn't handle partial migration state
detail: If migration partially completes (e.g., account is created but not saved), subsequent runs won't retry the migration, potentially losing data.
suggestion: Add transaction-like behavior or migration state tracking to ensure complete migration.

### LOW Issues

severity: low
file: src/main/services/multi-account-google-manager.ts
line: 25-30
issue: Redundant calculation in getMultiAccountState
detail: The hasReachedLimit calculation is performed every time, but could be derived from totalAccounts >= MAX_GOOGLE_ACCOUNTS.
suggestion: Simplify to: `hasReachedLimit: accounts.length >= MAX_GOOGLE_ACCOUNTS`

severity: low
file: src/shared/types/multi-account-calendar.ts
line: 75-80
issue: Error class doesn't extend properly for serialization
detail: Custom error classes may not serialize properly across IPC boundaries in Electron applications.
suggestion: Consider using plain objects for error results instead of custom Error classes for IPC communication.

## Security Analysis

**No critical security vulnerabilities found.** The implementation properly:
- Uses existing OAuth flow without exposing credentials
- Maintains token isolation per account
- Doesn't log sensitive information
- Uses existing secure storage mechanisms

## Performance Considerations

The implementation introduces some performance concerns:
1. Parallel API calls without concurrency limits
2. Potential memory usage with multiple account data
3. No caching of user info between sessions

## Recommendations

1. **Fix the constructor async issue immediately** - This is a critical architectural problem
2. **Implement proper concurrency control** for API calls
3. **Add comprehensive error handling** for partial failures
4. **Consider implementing account data caching** to reduce API calls
5. **Add integration tests** for multi-account scenarios

## Code Quality Assessment

The code follows existing patterns well and maintains consistency with the codebase. The multi-account architecture is well-designed, but needs refinement in error handling and concurrency management.
