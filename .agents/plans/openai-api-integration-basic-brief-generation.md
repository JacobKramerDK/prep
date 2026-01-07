# Feature 2: OpenAI API Integration & Basic Brief Generation

## Feature Description

Implement OpenAI API integration and basic meeting brief generation functionality. Users can trigger brief generation from today's meetings, provide custom context input, and receive AI-generated meeting preparation documents.

## User Story

As a knowledge worker using Prep
I want to generate AI-powered meeting briefs for today's meetings by providing custom context
So that I can receive professional meeting preparation documents tailored to my specific needs

## Problem Statement

Users can see today's meetings but have no way to generate AI-powered preparation materials. They need the ability to provide context about meetings and receive structured, professional briefs to improve meeting effectiveness.

## Solution Statement

Integrate OpenAI API for brief generation, create user input forms for meeting context, implement prompt engineering for quality briefs, and provide brief display and management functionality.

## Feature Metadata

**Feature Type**: New Feature  
**Estimated Complexity**: High  
**Primary Systems Affected**: Main process (OpenAI service), Renderer (UI forms, brief display), Settings (API key management)  
**Dependencies**: Feature 1 (Calendar Integration & Meeting Detection) - MUST be complete

---

## CONTEXT REFERENCES

### Relevant Codebase Files - READ BEFORE IMPLEMENTING!

- `src/main/services/meeting-detector.ts` - Meeting data structures and detection logic
- `src/renderer/components/TodaysMeetings.tsx` - Meeting display component to extend
- `src/shared/types/meeting.ts` - Meeting types to extend with brief data
- `src/main/services/settings-manager.ts` - Settings patterns for API key storage
- `src/renderer/App.tsx` - Main app state management patterns
- `src/shared/types/ipc.ts` - IPC method naming conventions

### New Files to Create

- `src/main/services/openai-service.ts` - OpenAI API integration service
- `src/renderer/components/BriefGenerator.tsx` - Brief generation form component
- `src/renderer/components/MeetingBrief.tsx` - Brief display component
- `src/shared/types/brief.ts` - Brief-related types and interfaces
- `src/renderer/hooks/useBriefGeneration.ts` - Brief generation state management

---

## Step by Step Tasks

### Task 1: Create Brief Types and Interfaces

**File**: `src/shared/types/brief.ts`
**Action**: Create new file

**Requirements**:
- Define `BriefGenerationRequest` interface with meeting ID, user context, additional notes
- Define `MeetingBrief` interface with content, generated timestamp, meeting reference
- Define `BriefGenerationStatus` enum (idle, generating, success, error)
- Define IPC method types for brief generation

### Task 2: Extend Meeting Types

**File**: `src/shared/types/meeting.ts`
**Action**: Modify existing file

**Requirements**:
- Add optional `brief?: MeetingBrief` property to Meeting interface
- Add brief-related properties to support UI state

### Task 3: Update IPC Types

**File**: `src/shared/types/ipc.ts`
**Action**: Modify existing file

**Requirements**:
- Add `generateMeetingBrief` method signature
- Add `getBriefGenerationStatus` method signature
- Follow existing naming conventions

### Task 4: Create OpenAI Service

**File**: `src/main/services/openai-service.ts`
**Action**: Create new file

**Requirements**:
- OpenAI API client setup with configurable API key
- Meeting brief generation method with prompt engineering
- Error handling for API failures, rate limits, invalid keys
- Structured prompt template for meeting briefs
- Response parsing and validation

### Task 5: Extend Settings for API Key Management

**File**: `src/main/services/settings-manager.ts`
**Action**: Modify existing file

**Requirements**:
- Add `openaiApiKey` setting with secure storage
- Add validation method for API key format
- Add getter/setter methods following existing patterns

### Task 6: Add IPC Handlers for Brief Generation

**File**: `src/main/index.ts`
**Action**: Modify existing file

**Requirements**:
- Register `generateMeetingBrief` IPC handler
- Integrate OpenAI service with meeting data
- Error handling and status reporting
- Follow existing IPC handler patterns

### Task 7: Update Preload Script

**File**: `src/main/preload.ts`
**Action**: Modify existing file

**Requirements**:
- Expose brief generation methods to renderer
- Follow existing security patterns
- Maintain type safety

### Task 8: Create Brief Generation Hook

**File**: `src/renderer/hooks/useBriefGeneration.ts`
**Action**: Create new file

**Requirements**:
- State management for brief generation process
- API call handling with loading states
- Error handling and user feedback
- Integration with meeting data

### Task 9: Create Brief Generator Component

**File**: `src/renderer/components/BriefGenerator.tsx`
**Action**: Create new file

**Requirements**:
- Form for user context input (meeting purpose, key topics, attendees)
- Generate brief button with loading state
- Integration with brief generation hook
- Validation and error display
- Consistent styling with existing components

### Task 10: Create Meeting Brief Display Component

**File**: `src/renderer/components/MeetingBrief.tsx`
**Action**: Create new file

**Requirements**:
- Display generated brief content with proper formatting
- Show generation timestamp and meeting reference
- Copy to clipboard functionality
- Print/export options
- Responsive design matching app theme

### Task 11: Integrate Brief Generation into TodaysMeetings

**File**: `src/renderer/components/TodaysMeetings.tsx`
**Action**: Modify existing file

**Requirements**:
- Add "Generate Brief" button for each meeting
- Show brief generation status
- Display generated briefs
- Maintain existing meeting display functionality

### Task 12: Add Settings UI for OpenAI API Key

**File**: `src/renderer/App.tsx` or create new settings component
**Action**: Modify existing or create new

**Requirements**:
- API key input field with secure handling
- Validation and testing functionality
- Clear instructions for obtaining API key
- Integration with settings manager

---

## Testing Strategy

### Unit Tests
- OpenAI service with mocked API responses
- Brief generation hook with various states
- Settings manager API key validation
- Type validation for brief interfaces

### Integration Tests
- End-to-end brief generation workflow
- IPC communication for brief methods
- Settings persistence for API keys
- Error handling scenarios

### Manual Testing
- Generate briefs for different meeting types
- Test with invalid/missing API keys
- Verify brief quality and formatting
- Test UI responsiveness and error states

---

## Validation Commands

```bash
# Install dependencies (if new ones added)
npm install

# Type checking
npm run build:main
npm run build:renderer

# Run tests
npm test

# Start application and test manually
npm run dev
```

## Success Criteria

- [ ] Users can configure OpenAI API key in settings
- [ ] Users can generate meeting briefs from today's meetings
- [ ] Brief generation form collects relevant user context
- [ ] Generated briefs are well-formatted and useful
- [ ] Error handling works for API failures
- [ ] UI provides clear feedback during generation process
- [ ] Briefs are properly stored and displayed

## Security Considerations

- API keys stored securely using electron-store encryption
- No API keys logged or exposed in error messages
- Validate all user inputs before sending to OpenAI
- Handle API rate limits gracefully
- Secure IPC communication for sensitive operations

## Performance Requirements

- Brief generation completes within 30 seconds
- UI remains responsive during generation
- Proper loading states and progress indicators
- Efficient API usage to minimize costs
- Graceful handling of network issues
