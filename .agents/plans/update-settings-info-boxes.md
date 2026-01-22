# Feature: Update Settings Info Boxes

The following plan should be complete, but its important that you validate documentation and codebase patterns and task sanity before you start implementing.

Pay special attention to naming of existing utils types and models. Import from the right files etc.

## Feature Description

Update the "How it works" info boxes in the settings area to:
1. Move them from bottom to top of each settings tab
2. Ensure each info box contains relevant, tab-specific information
3. Keep information concise and actionable
4. Account for OS-specific features (some settings only available on certain platforms)
5. Use existing Tailwind v4 design system consistently

## User Story

As a user navigating the settings
I want to see relevant contextual information at the top of each settings tab
So that I understand what each setting does before I configure it

## Problem Statement

Currently, the settings tabs have generic "How it works" info boxes at the bottom that don't provide tab-specific guidance. Users need contextual information upfront to understand what they're configuring, especially for OS-specific features.

## Solution Statement

Move info boxes to the top of each settings tab and customize content to be specific, concise, and relevant to each tab's functionality. Account for platform differences where features aren't available on all operating systems.

## Feature Metadata

**Feature Type**: Enhancement
**Estimated Complexity**: Low
**Primary Systems Affected**: Settings UI components
**Dependencies**: Existing Tailwind design system, OS detection hook

---

## CONTEXT REFERENCES

### Relevant Codebase Files IMPORTANT: YOU MUST READ THESE FILES BEFORE IMPLEMENTING!

- `src/renderer/components/SettingsPage.tsx` (lines 1-536) - Why: Main settings component with current info box implementation
- `src/renderer/components/RelevanceWeightSettings.tsx` (lines 1-135) - Why: Example of settings tab component structure
- `src/renderer/hooks/useOSDetection.ts` (lines 1-37) - Why: OS detection for platform-specific features
- `tailwind.config.js` (lines 1-110) - Why: Design system colors and utilities to maintain consistency

### New Files to Create

None - this is a modification of existing components

### Relevant Documentation YOU SHOULD READ THESE BEFORE IMPLEMENTING!

- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
  - Specific section: Utility classes for spacing, colors, and layout
  - Why: Ensure consistent use of design system
- [Lucide React Icons](https://lucide.dev/icons)
  - Specific section: Available icons for info boxes
  - Why: Maintain icon consistency across the application

### Patterns to Follow

**Info Box Structure Pattern (EXACT from line 512-536):**
```tsx
<div className="mb-6 p-6 bg-surface-hover rounded-xl border border-border">
  <div className="flex items-center gap-3 mb-3">
    <div className="w-8 h-8 rounded-lg bg-brand-50 dark:bg-brand-900/20 flex items-center justify-center">
      <Info className="w-4 h-4 text-brand-600 dark:text-brand-400" />
    </div>
    <h3 className="font-semibold text-primary">Tab-specific title</h3>
  </div>
  <ul className="space-y-2 text-sm text-secondary ml-1">
    <li className="flex items-center gap-2">
      <span className="w-1 h-1 rounded-full bg-tertiary"></span>
      Specific, actionable information
    </li>
  </ul>
</div>
```

**OS Detection Pattern (EXACT from line 391):**
```tsx
const { isMacOS } = useOSDetection()

// In calendar tab:
{isMacOS && (
  <button 
    onClick={handleConnectAppleCalendar}
    className="flex items-center gap-3 p-5 border-2 border-border rounded-xl hover:border-brand-500 hover:bg-surface-hover transition-all group">
    // Apple Calendar button content
  </button>
)}
```

**Conditional Rendering Pattern:**
```tsx
{isMacOS && (
  <li className="flex items-center gap-2">
    <span className="w-1 h-1 rounded-full bg-tertiary"></span>
    macOS-specific feature information
  </li>
)}
```

---

## IMPLEMENTATION PLAN

### Phase 1: Analysis and Content Planning

**Tasks:**
- Analyze current info box content and identify generic vs specific information
- Plan tab-specific content for each settings section
- Identify OS-specific features that need conditional messaging

### Phase 2: Component Updates

**Tasks:**
- Update SettingsPage.tsx to move info boxes to top of each tab
- Customize info box content for each tab (AI, Relevance, Vault, Calendar, Prompts)
- Add OS-specific conditional content where relevant

### Phase 3: Design System Consistency

**Tasks:**
- Ensure all info boxes use consistent Tailwind classes
- Verify dark mode compatibility
- Test responsive behavior

---

## STEP-BY-STEP TASKS

IMPORTANT: Execute every task in order, top to bottom. Each task is atomic and independently testable.

### UPDATE src/renderer/components/SettingsPage.tsx

- **IMPLEMENT**: Move info boxes from bottom to top of each settings tab
- **PATTERN**: Use EXACT structure from lines 512-536: `bg-surface-hover rounded-xl border border-border`
- **IMPORTS**: Info icon already imported (line 13)
- **REMOVE**: Delete existing generic info box (lines 512-536)
- **ADD**: Tab-specific info boxes at top of each tab content:
  - AI tab: After line 208 (after description paragraph)
  - Vault tab: After line 334 (after description paragraph) 
  - Calendar tab: After line 386 (after header section)
  - Prompts tab: After line 502 (after description paragraph)
- **CONTENT**: Use these EXACT titles and bullet points:
  - AI: "API Configuration" - API key security, model selection, internet requirement
  - Vault: "Vault Integration" - Obsidian connection, file indexing, local storage
  - Calendar: "Import Methods" - Platform options, privacy, sync behavior
  - Prompts: "Template Customization" - Variable usage, AI brief impact
- **OS-SPECIFIC**: In calendar info box, add conditional bullet for macOS Apple Calendar
- **VALIDATE**: `npm run build:renderer && npm run dev:renderer`

### UPDATE src/renderer/components/RelevanceWeightSettings.tsx

- **IMPLEMENT**: Add info box at top of component before the main content
- **PATTERN**: Use EXACT structure: `bg-surface-hover rounded-xl border border-border`
- **IMPORTS**: Add `Info` to existing lucide-react import (line 2)
- **POSITION**: Insert after line 78 (after description paragraph, before weightConfigs)
- **CONTENT**: Title "Relevance Scoring" with 3 bullets about weight customization
- **VALIDATE**: `npm run build:renderer && npm run dev:renderer`

---

## TESTING STRATEGY

### Unit Tests

No new unit tests required - this is a UI enhancement that maintains existing functionality.

### Integration Tests

Test that info boxes render correctly in each settings tab and display appropriate content based on OS detection.

### Edge Cases

- Test on different operating systems (macOS, Windows, Linux)
- Verify dark mode compatibility
- Test responsive behavior on different screen sizes
- Ensure info boxes don't interfere with existing functionality

---

## VALIDATION COMMANDS

Execute every command to ensure zero regressions and 100% feature correctness.

### Level 1: Syntax & Style

```bash
npm run build:renderer
```

### Level 2: Development Server

```bash
npm run dev:renderer
```

### Level 3: Full Application Test

```bash
npm run dev
```

### Level 4: Manual Validation

- Navigate to Settings page
- Verify info box appears at top of each tab
- Check content is relevant to each tab
- Test on different OS (if available)
- Verify dark mode compatibility
- Confirm existing functionality still works

---

## ACCEPTANCE CRITERIA

- [ ] Info boxes moved from bottom to top of each settings tab
- [ ] Each info box contains relevant, tab-specific information
- [ ] Content is concise and actionable (3-5 bullet points max)
- [ ] OS-specific features show conditional content
- [ ] Consistent use of Tailwind design system
- [ ] Dark mode compatibility maintained
- [ ] No regressions in existing settings functionality
- [ ] Info boxes enhance user understanding without cluttering UI

---

## COMPLETION CHECKLIST

- [ ] All tasks completed in order
- [ ] Each task validation passed immediately
- [ ] All validation commands executed successfully
- [ ] Manual testing confirms feature works across tabs
- [ ] OS-specific content displays correctly
- [ ] Design system consistency maintained
- [ ] No linting or build errors
- [ ] Acceptance criteria all met

---

## NOTES

**Content Guidelines:**
- Keep each info box to 3-5 bullet points maximum
- Focus on what the user needs to know before configuring
- Explain benefits and requirements clearly
- Use action-oriented language
- Avoid technical jargon

**OS-Specific Features:**
- Apple Calendar integration (macOS only)
- Swift calendar helper (macOS only)
- AppleScript permissions (macOS only)
- Windows/Linux users should see alternative options

**Design Consistency:**
- Use exact styling: `bg-surface-hover rounded-xl border border-border`
- Icon: `bg-brand-50 dark:bg-brand-900/20` with `text-brand-600 dark:text-brand-400`
- Typography: `font-semibold text-primary` for titles, `text-sm text-secondary` for bullets
- Keep icon usage consistent (Info icon for all boxes)

**Confidence Score**: 10/10 for one-pass success - All patterns, line numbers, and styling are precisely specified from existing codebase.
