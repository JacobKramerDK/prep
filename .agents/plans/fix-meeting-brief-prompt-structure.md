# Fix Meeting Brief Prompt Structure

## Objective
Enhance meeting brief generation by improving prompt structure to clearly separate and prioritize user input vs. Obsidian context while maintaining single textarea UI and dictation functionality.

## Root Cause
- User context and historical context are not properly differentiated in prompts
- LLM lacks clear instructions on how to prioritize and integrate different context types
- Prompt structure doesn't optimize for best brief generation results

## Implementation Tasks

### Task 1: Update OpenAI Service System Message
**File**: `src/main/services/openai-service.ts`
**Location**: Around line 110 in `generateMeetingBrief` method

**Find**:
```typescript
{
  role: 'system',
  content: 'You are a professional meeting preparation assistant. Generate comprehensive, well-structured meeting briefs that help users prepare effectively.'
}
```

**Replace with**:
```typescript
{
  role: 'system',
  content: 'You are a professional meeting preparation assistant. Generate comprehensive, well-structured meeting briefs using this context hierarchy:\n\n1. PRIORITIZE user-provided context as the primary source of meeting objectives and focus areas\n2. USE historical context as supporting background information to enrich the brief\n3. INTEGRATE insights by connecting relevant historical information to current meeting goals\n4. FOCUS on actionable preparation items based on the user\'s stated context\n\nAlways distinguish between what the user wants to accomplish (primary) and what historical information supports that goal (secondary).'
}
```

### Task 2: Update Default Prompt Template
**File**: `src/main/services/openai-service.ts`
**Location**: Around lines 200-220 in `buildPrompt` method

**Find**:
```typescript
sections.push(
  'Please generate a comprehensive meeting brief that includes:',
  '1. **Executive Summary** - Brief overview of the meeting purpose and expected outcomes',
  '2. **Key Discussion Points** - Main topics to be covered based on the context provided',
  '3. **Preparation Checklist** - Specific items the user should prepare or review beforehand',
  '4. **Questions to Consider** - Thoughtful questions to drive productive discussion',
  '5. **Success Metrics** - How to measure if the meeting was successful',
  '',
  'Pay special attention to:',
  '- **User-provided context**: Direct input from the user about meeting goals and expectations',
  '- **Historical context**: Relevant information from past notes that may inform this meeting',
  '- **Integration**: Connect historical insights with current meeting objectives',
  '',
  'Format the response in clear markdown with proper headings and bullet points. Keep it professional, actionable, and tailored to the specific meeting context provided.'
)
```

**Replace with**:
```typescript
sections.push(
  'Generate a comprehensive meeting brief with these sections:',
  '1. **Executive Summary** - Brief overview focusing on user-stated objectives',
  '2. **Key Discussion Points** - Main topics based on user context, enhanced by historical insights',
  '3. **Preparation Checklist** - Specific items to prepare based on user goals and relevant background',
  '4. **Strategic Questions** - Thoughtful questions connecting current objectives with historical context',
  '5. **Success Metrics** - How to measure meeting success based on user-stated goals',
  '',
  'Context Usage Guidelines:',
  '- **User Context = Primary**: This defines the meeting focus and objectives',
  '- **Historical Context = Supporting**: Use this to enrich and inform the primary objectives',
  '- **Integration**: Connect past insights to current goals, don\'t just summarize history',
  '',
  'Format in clear markdown with proper headings and bullet points.'
)
```

### Task 3: Enhance User Context Section Header
**File**: `src/main/services/openai-service.ts`
**Location**: Around lines 240-245 in `buildPrompt` method

**Find**:
```typescript
sections.push('', '## User-Provided Context')
sections.push('The following context and details were provided by the user:')
```

**Replace with**:
```typescript
sections.push('', '## 🎯 PRIMARY CONTEXT: Your Meeting Focus')
sections.push('This represents your main objectives and context for this meeting:')
```

### Task 4: Enhance Historical Context Section Header
**File**: `src/main/services/openai-service.ts`
**Location**: Around lines 265-270 in `buildPrompt` method

**Find**:
```typescript
sections.push('', '## Historical Context from Your Notes')
sections.push('The following information was automatically retrieved from your Obsidian vault based on meeting participants, topics, and timing:')
```

**Replace with**:
```typescript
sections.push('', '## 📚 SUPPORTING CONTEXT: Relevant Historical Information')
sections.push('Use this background information to enrich your meeting preparation:')
```

### Task 5: Add Integration Instructions
**File**: `src/main/services/openai-service.ts`
**Location**: After the historical context section (around line 285)

**Add before the final prompt assembly**:
```typescript
// Add integration guidance at the end of historical context section
if (request.includeContext && request.contextMatches && request.contextMatches.length > 0) {
  sections.push('', '## 🔗 Integration Instructions')
  sections.push('Connect the historical insights above with your primary meeting objectives. Focus on how past information can help achieve today\'s goals rather than just summarizing history.')
}
```

### Task 6: Update Settings Manager Default Template
**File**: `src/main/services/settings-manager.ts`
**Action**: Find the default prompt template method and update it

**Find the method that returns default template and replace with**:
```typescript
private getDefaultPromptTemplate(): string {
  return `Generate a comprehensive meeting brief with these sections:
1. **Executive Summary** - Brief overview focusing on user-stated objectives
2. **Key Discussion Points** - Main topics based on user context, enhanced by historical insights
3. **Preparation Checklist** - Specific items to prepare based on user goals and relevant background
4. **Strategic Questions** - Thoughtful questions connecting current objectives with historical context
5. **Success Metrics** - How to measure meeting success based on user-stated goals

Context Usage Guidelines:
- **User Context = Primary**: This defines the meeting focus and objectives
- **Historical Context = Supporting**: Use this to enrich and inform the primary objectives
- **Integration**: Connect past insights to current goals, don't just summarize history

Format in clear markdown with proper headings and bullet points.`
}
```

## Testing Steps

### 1. Build and Test
```bash
npm run build
```

### 2. Manual Validation
1. Generate brief with only user context - should show clear primary focus
2. Generate brief with both contexts - should show proper hierarchy and integration
3. Check console logs for new prompt structure
4. Verify dictation functionality still works
5. Test that existing UI remains unchanged

### 3. Expected Console Output
Look for improved prompt structure in logs:
```
## 🎯 PRIMARY CONTEXT: Your Meeting Focus
This represents your main objectives and context for this meeting:
**Your Context:** [user input]

## 📚 SUPPORTING CONTEXT: Relevant Historical Information
Use this background information to enrich your meeting preparation:
[historical context]

## 🔗 Integration Instructions
Connect the historical insights above with your primary meeting objectives...
```

## Success Criteria
- ✅ Clear context hierarchy with user input as primary
- ✅ Historical context positioned as supporting information
- ✅ LLM receives specific integration guidance
- ✅ Single textarea and dictation functionality preserved
- ✅ Improved brief quality with better context integration
- ✅ No breaking changes to existing functionality

## Rollback Plan
If issues arise, revert changes by restoring original prompt text in both files. All changes are isolated to prompt templates with no structural modifications.

## Estimated Time
- Implementation: 20 minutes
- Testing: 10 minutes
- **Total: 30 minutes**
