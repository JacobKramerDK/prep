# Feature: Simplify Brief Generator User Input

The following plan should be complete, but its important that you validate documentation and codebase patterns and task sanity before you start implementing.

Pay special attention to naming of existing utils types and models. Import from the right files etc.

## Feature Description

Simplify the BriefGenerator component's user input interface by consolidating multiple separate textboxes (userContext, meetingPurpose, keyTopics, attendees, additionalNotes) into a single, unified context textbox. This change will reduce user confusion and provide a more streamlined experience while maintaining all existing functionality and following the current Tailwind v4 design system.

## User Story

As a meeting participant preparing for a meeting
I want to provide relevant context in a single, clear textbox
So that I can quickly add any relevant information without being confused by multiple separate fields

## Problem Statement

The current BriefGenerator component presents users with multiple separate textboxes (Purpose, Key Topics, Attendees, Additional Notes, etc.) which creates confusion and cognitive overhead. Users find it unclear what should go in each field and often leave most fields empty, reducing the effectiveness of the AI brief generation.

## Solution Statement

Replace the multiple separate input fields with a single, well-labeled textarea that accepts any relevant context the user wants to include in their meeting brief. This maintains the same data flow to the AI service while providing a much cleaner, more intuitive user experience.

## Feature Metadata

**Feature Type**: Enhancement
**Estimated Complexity**: Low
**Primary Systems Affected**: BriefGenerator component, BriefGenerationRequest interface
**Dependencies**: Tailwind CSS v4 design system

---

## CONTEXT REFERENCES

### Relevant Codebase Files IMPORTANT: YOU MUST READ THESE FILES BEFORE IMPLEMENTING!

- `src/renderer/components/BriefGenerator.tsx` (lines 25-35, 125-165) - Why: Contains current form structure and input handling logic
- `src/shared/types/brief.ts` (lines 3-16) - Why: BriefGenerationRequest interface that may need updates
- `src/renderer/hooks/useBriefGeneration.ts` (lines 30-45) - Why: Hook that processes the brief generation request
- `tailwind.config.js` (lines 30-60) - Why: Current design system colors and spacing
- `src/renderer/index.css` (lines 30-50) - Why: CSS custom properties and design tokens

### New Files to Create

None - this is a modification of existing component

### Relevant Documentation YOU SHOULD READ THESE BEFORE IMPLEMENTING!

- [Tailwind CSS v4 Documentation](https://tailwindcss.com/docs)
  - Specific section: Form styling and design tokens
  - Why: Ensure compliance with Tailwind v4 patterns
- [React Forms Best Practices](https://react.dev/reference/react-dom/components/textarea)
  - Specific section: Textarea component usage
  - Why: Proper textarea implementation patterns

### Patterns to Follow

**Input Styling Pattern** (from BriefGenerator.tsx:129):
```tsx
className="w-full p-2 border border-border rounded-lg text-sm bg-background text-primary placeholder-tertiary resize-vertical min-h-[80px] disabled:opacity-60"
```

**Label Pattern** (from BriefGenerator.tsx:120):
```tsx
<label className="block text-sm font-medium text-primary mb-1">
  Context <span className="text-tertiary font-normal">(Optional)</span>
</label>
```

**Form State Management Pattern**:
```tsx
const [formData, setFormData] = useState({
  userContext: '',
  includeContext: true
})

const handleInputChange = (field: keyof typeof formData, value: string) => {
  setFormData(prev => ({ ...prev, [field]: value }))
}
```

**Design System Colors**:
- Background: `bg-background`
- Surface: `bg-surface` 
- Text: `text-primary`, `text-secondary`, `text-tertiary`
- Border: `border-border`
- Brand: `bg-brand-600`, `hover:bg-brand-700`

---

## IMPLEMENTATION PLAN

### Phase 1: Component State Simplification

Simplify the form state to only include the essential fields needed for the new single-input design.

**Tasks:**
- Remove unused form fields from component state
- Update form data interface to match simplified design
- Preserve context inclusion toggle functionality

### Phase 2: UI Restructuring

Replace the multiple input fields with a single, well-designed textarea that follows the existing design patterns.

**Tasks:**
- Replace multiple input fields with single textarea
- Update textarea styling to match design system
- Improve placeholder text and labeling
- Maintain responsive grid layout for context controls

### Phase 3: Data Flow Updates

Ensure the simplified input data flows correctly to the brief generation service.

**Tasks:**
- Update form submission handler
- Ensure BriefGenerationRequest compatibility
- Maintain context retrieval integration
- Preserve all existing functionality

### Phase 4: Testing & Validation

Validate that the simplified interface works correctly and maintains all existing functionality.

**Tasks:**
- Test form submission with various input scenarios
- Verify context retrieval still works
- Validate design system compliance
- Test responsive behavior

---

## STEP-BY-STEP TASKS

IMPORTANT: Execute every task in order, top to bottom. Each task is atomic and independently testable.

### UPDATE src/renderer/components/BriefGenerator.tsx

- **IMPLEMENT**: Simplify formData state to only include userContext and includeContext
- **PATTERN**: Follow existing useState pattern from line 25
- **IMPORTS**: No new imports needed
- **GOTCHA**: Preserve includeContext boolean handling logic
- **VALIDATE**: `npm run build:renderer`

### UPDATE src/renderer/components/BriefGenerator.tsx

- **IMPLEMENT**: Replace multiple input fields (lines 135-165) with single textarea
- **PATTERN**: Use existing textarea styling from line 129
- **IMPORTS**: No new imports needed  
- **GOTCHA**: Maintain disabled state handling and responsive design
- **VALIDATE**: `npm run dev:renderer` and visually inspect form

### UPDATE src/renderer/components/BriefGenerator.tsx

- **IMPLEMENT**: Update handleSubmit function to work with simplified form data
- **PATTERN**: Follow existing BriefGenerationRequest structure from brief.ts
- **IMPORTS**: No new imports needed
- **GOTCHA**: Ensure userContext field contains all user input, set optional fields to undefined (not empty arrays/strings)
- **VALIDATE**: `console.log(request)` before onGenerate call to verify structure

### UPDATE src/renderer/components/BriefGenerator.tsx

- **IMPLEMENT**: Update handleRefreshContext to work with simplified context
- **PATTERN**: Follow existing context refresh logic from line 60
- **IMPORTS**: No new imports needed
- **GOTCHA**: Remove references to removed form fields, pass empty object for additionalContext
- **VALIDATE**: `console.log(additionalContext)` to verify empty object structure

### UPDATE src/renderer/components/BriefGenerator.tsx

- **IMPLEMENT**: Improve textarea placeholder and label text for clarity
- **PATTERN**: Follow existing label pattern from line 120
- **IMPORTS**: No new imports needed
- **GOTCHA**: Make placeholder text descriptive and helpful
- **VALIDATE**: Review UI text for clarity and helpfulness

---

## TESTING STRATEGY

### Unit Tests

Create specific test to validate BriefGenerationRequest structure:
- Test that simplified form produces valid request object
- Verify optional fields are undefined (not empty strings/arrays)
- Confirm userContext contains all user input

### Integration Tests

Test the complete brief generation flow with the simplified input:
- Form submission with various input lengths
- Context retrieval integration with simplified form
- Error handling scenarios
- Loading states
- Verify OpenAI service receives correct prompt structure

### Edge Cases

- Empty input submission (should use default userContext)
- Very long input text (>1000 characters)
- Special characters and markdown in input
- Context retrieval with simplified input
- Form behavior when context indexing is disabled
- Verify existing tests still pass with new request structure

---

## VALIDATION COMMANDS

Execute every command to ensure zero regressions and 100% feature correctness.

### Level 1: Syntax & Style

```bash
npm run build:renderer
```

### Level 2: Development Testing

```bash
npm run dev:renderer
# Manually test form in browser at http://localhost:5173
```

### Level 3: Existing Test Validation

```bash
npm test -- --testPathPattern="openai-service"
# Verify existing OpenAI service tests still pass
```

### Level 4: Full Application Testing

```bash
npm run dev
# Test complete brief generation flow in Electron app
```

### Level 5: Manual Validation

- Open BriefGenerator component in both inline and modal modes
- Test form submission with various input scenarios
- Verify context retrieval still works correctly
- Confirm design matches existing patterns
- Test responsive behavior on different screen sizes
- **CRITICAL**: Generate actual brief and verify AI output quality matches previous version

---

## ACCEPTANCE CRITERIA

- [ ] BriefGenerator component has single textarea instead of multiple inputs
- [ ] Textarea follows existing design system patterns and styling
- [ ] Form submission works correctly with simplified input
- [ ] Context retrieval integration remains functional
- [ ] All existing functionality preserved (inline/modal modes, loading states, error handling)
- [ ] UI text is clear and helpful for users
- [ ] Component maintains responsive design
- [ ] No TypeScript compilation errors
- [ ] No visual regressions in design system compliance
- [ ] Brief generation produces same quality output as before
- [ ] **CRITICAL**: All existing OpenAI service tests pass without modification
- [ ] **CRITICAL**: BriefGenerationRequest structure maintains backward compatibility
- [ ] **CRITICAL**: Generated briefs contain same information quality as multi-field version

---

## COMPLETION CHECKLIST

- [ ] All tasks completed in order
- [ ] Each task validation passed immediately
- [ ] All validation commands executed successfully
- [ ] Manual testing confirms simplified form works
- [ ] No TypeScript or build errors
- [ ] Design system compliance maintained
- [ ] Acceptance criteria all met
- [ ] Code follows existing patterns and conventions

---

## NOTES

**Design Decision**: Consolidating multiple fields into a single textarea reduces cognitive load while maintaining the same information flow to the AI service. The AI can extract relevant information from free-form text just as effectively as from structured fields.

**Backward Compatibility**: The BriefGenerationRequest interface supports this change since userContext was already the primary field, and the other fields were optional enhancements.

**User Experience**: The simplified interface aligns with modern AI interaction patterns where users provide context in natural language rather than filling structured forms.

**Technical Approach**: This is primarily a UI simplification that removes form complexity without changing the underlying data processing or AI integration logic. The OpenAI service already handles optional fields gracefully, so setting them to undefined instead of providing structured data will not impact brief quality.

**Validation Strategy**: The key to 10/10 confidence is ensuring existing tests pass and that the AI service receives equivalent information. The buildPrompt method in OpenAI service shows it handles missing optional fields correctly, so the simplified approach is fully compatible.

**Risk Mitigation**: Added specific validation steps to verify request structure and test compatibility with existing OpenAI service tests to ensure zero regressions.
