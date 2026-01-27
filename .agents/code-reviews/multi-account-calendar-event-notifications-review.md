# Code Review: Multi-Account Google Calendar Implementation with Event Notifications

## Review Summary

**Stats:**
- Files Modified: 12
- Files Added: 2
- Files Deleted: 0
- New lines: 540
- Deleted lines: 87

## Overview

This review covers the implementation of multi-account Google Calendar OAuth authentication with real-time event notifications. The changes include a new `MultiAccountGoogleManager` class, enhanced OAuth flow, race condition fixes, and automatic UI refresh when calendar events are updated.

## Issues Found

### CRITICAL Issues

**severity: critical**
**file: src/main/services/calendar-manager.ts**
**line: 996-1006**
**issue: Hardcoded Electron module import in business logic**
**detail: The code uses `require('electron')` directly in the business logic layer, which violates separation of concerns and makes the code harder to test. This creates tight coupling between the calendar manager and Electron's main process.**
**suggestion: Pass the BrowserWindow instance as a dependency or use an event emitter pattern to decouple the notification logic.**

**severity: critical**
**file: src/main/services/calendar-manager.ts**
**line: 830-840**
**issue: Duplicate hardcoded Electron module import**
**detail: Same issue as above - another instance of hardcoded `require('electron')` in business logic. This pattern is repeated, indicating a systemic architectural issue.**
**suggestion: Create a notification service or pass the main window reference through dependency injection.**

### HIGH Issues

**severity: high**
**file: src/main/services/multi-account-google-manager.ts**
**line: 60-65**
**issue: Simple string-based mutex implementation**
**detail: The operation lock uses a simple Set with string keys, which could lead to issues if multiple operations use the same lock key. The current implementation only uses 'account-addition' but this pattern could be error-prone if extended.**
**suggestion: Use a more robust locking mechanism or at minimum use unique lock keys per operation type.**

**severity: high**
**file: src/main/services/google-oauth-manager.ts**
**line: 253-254**
**issue: Credentials set after token retrieval without validation**
**detail: The code calls `oauth2Client.setCredentials(tokens)` without validating that the tokens object contains the required fields. If tokens is malformed, this could cause runtime errors.**
**suggestion: Add validation for tokens object before setting credentials.**

**severity: high**
**file: src/shared/types/multi-account-calendar.ts**
**line: 15**
**issue: Sensitive data stored in plain object**
**detail: The GoogleAccount interface stores refreshToken as a plain string property. While the SettingsManager may encrypt it, the type definition doesn't indicate this security requirement.**
**suggestion: Add documentation or use a branded type to indicate that refreshToken should be encrypted when stored.**

### MEDIUM Issues

**severity: medium**
**file: src/main/services/multi-account-google-manager.ts**
**line: 200-230**
**issue: Inconsistent error handling in retry logic**
**detail: The makeRequestWithRetry method handles different error types but doesn't have consistent logging levels. Some errors are logged as warnings, others as errors, without clear criteria.**
**suggestion: Standardize error logging levels based on severity and recoverability.**

**severity: medium**
**file: src/renderer/App.tsx**
**line: 225-235**
**issue: Event listener cleanup dependency array**
**detail: The useEffect for calendar events listener includes `loadTodaysMeetings` in the dependency array, which could cause unnecessary re-registrations of the event listener.**
**suggestion: Use useCallback with stable dependencies for loadTodaysMeetings or remove it from the dependency array if it's stable.**

**severity: medium**
**file: src/main/services/google-oauth-manager.ts**
**line: 275-285**
**issue: User info validation logic inconsistency**
**detail: The code checks for `response.data.email` but doesn't validate the email format or other required fields. This could lead to invalid user info being stored.**
**suggestion: Add proper validation for email format and other required user info fields.**

### LOW Issues

**severity: low**
**file: src/shared/types/multi-account-calendar.ts**
**line: 67-75**
**issue: Error class with hardcoded error codes**
**detail: MultiAccountGoogleCalendarError uses union types for error codes, which is good, but the codes are not documented or centralized.**
**suggestion: Consider creating an enum or constants for error codes to improve maintainability.**

**severity: low**
**file: src/main/services/multi-account-google-manager.ts**
**line: 15-17**
**issue: Interface forward declaration for circular dependency**
**detail: Using interface forward declaration suggests architectural coupling that could be improved with better dependency injection.**
**suggestion: Consider restructuring dependencies to avoid circular references.**

## Security Considerations

1. **Token Storage**: ✅ Properly uses SettingsManager which implements encryption
2. **OAuth Scopes**: ✅ Well documented and justified
3. **State Validation**: ✅ OAuth state parameter properly validated
4. **Error Handling**: ✅ No sensitive information exposed in error messages
5. **Input Validation**: ⚠️ Could be improved for user info validation

## Performance Considerations

1. **Event Notifications**: The new notification system is efficient and only triggers when needed
2. **Race Condition Prevention**: Simple but effective mutex implementation
3. **Retry Logic**: Well-implemented with exponential backoff for rate limiting
4. **Memory Management**: No obvious memory leaks, but Electron module imports could be optimized

## Testing Coverage

✅ **Build**: Successful compilation
✅ **Helper Tests**: 31/31 tests passing
✅ **Google E2E Tests**: 5/5 tests passing
✅ **Functionality**: OAuth flow and event notifications working correctly

## Positive Aspects

1. **Code Organization**: Well-structured separation of concerns
2. **Error Handling**: Comprehensive error handling with proper logging
3. **Type Safety**: Strong TypeScript typing throughout
4. **Documentation**: Good inline documentation for OAuth scopes
5. **Testing**: Stable test suite with 100% pass rate
6. **User Experience**: Real-time UI updates improve user experience significantly

## Recommendations

1. **Refactor Electron Dependencies**: Create a notification service to decouple business logic from Electron APIs
2. **Enhance Validation**: Add proper validation for OAuth tokens and user info
3. **Improve Locking**: Use more robust locking mechanism for concurrent operations
4. **Standardize Error Handling**: Consistent error logging and handling patterns
5. **Add Integration Tests**: Consider adding tests for the notification flow

## Overall Assessment

The implementation successfully adds multi-account Google Calendar support with real-time event notifications. The core functionality is solid with good error handling and type safety. However, there are architectural concerns around tight coupling with Electron APIs that should be addressed. The security implementation is sound, and the user experience improvements are significant.

**Recommendation: Approve with required fixes for critical architectural issues before production deployment.**
