# Feature: Restructure Main Interface for Meeting-Focused Dashboard

The following plan should be complete, but its important that you validate documentation and codebase patterns and task sanity before you start implementing.

Pay special attention to naming of existing utils types and models. Import from the right files etc.

## Feature Description

Restructure the main application interface to prioritize scheduled meetings and vault status on the front page, while moving secondary features (Vault Browser and Calendar Import) to the Settings screen. This creates a cleaner, more focused user experience where the primary dashboard shows only essential daily information, while configuration and management tools are accessible but not prominent.

## User Story

As a knowledge worker using Prep for meeting preparation
I want to see my scheduled meetings and vault status immediately when I open the app
So that I can quickly assess my day and meeting preparation needs without navigating through setup tools

## Problem Statement

The current main interface displays both primary daily-use features (meetings, vault status) and secondary setup/configuration features (vault browser, calendar import) with equal prominence. This creates visual clutter and makes it harder for users to focus on their core daily workflow of meeting preparation.

## Solution Statement

Restructure the interface to create a clean, meeting-focused dashboard that shows:
1. Today's scheduled meetings with preparation status
2. Obsidian vault connection and indexing status
3. Quick access to Settings for configuration

Move the Vault Browser and Calendar Import functionality to the Settings screen as configuration tools that users access occasionally rather than daily.

## Feature Metadata

**Feature Type**: Enhancement
**Estimated Complexity**: Medium
**Primary Systems Affected**: Main App component, Settings component, UI layout
**Dependencies**: Existing React components, state management patterns

---

## CONTEXT REFERENCES

### Relevant Codebase Files IMPORTANT: YOU MUST READ THESE FILES BEFORE IMPLEMENTING!

- `src/renderer/App.tsx` (lines 1-300) - Why: Main application component with current navigation and layout logic
- `src/renderer/components/Settings.tsx` (lines 1-400) - Why: Current settings screen that needs to be expanded with vault and calendar tools
- `src/renderer/components/TodaysMeetings.tsx` (lines 1-50) - Why: Meeting display component that will become more prominent
- `src/renderer/components/VaultBrowser.tsx` (lines 1-50) - Why: Component to be moved to Settings
- `src/renderer/components/CalendarImport.tsx` (lines 1-50) - Why: Component to be moved to Settings

### New Files to Create

No new files needed - this is a restructuring of existing components.

### Relevant Documentation YOU SHOULD READ THESE BEFORE IMPLEMENTING!

- [React Conditional Rendering](https://react.dev/learn/conditional-rendering)
  - Specific section: Conditional rendering patterns
  - Why: Current app uses conditional rendering for navigation
- [React State Management](https://react.dev/learn/managing-state)
  - Specific section: Lifting state up
  - Why: Need to manage navigation state properly

### Patterns to Follow

**Navigation Pattern** (from App.tsx lines 95-110):
```typescript
if (showSettings) {
  return <Settings onBackToHome={() => setShowSettings(false)} />
}
```

**Status Display Pattern** (from App.tsx lines 180-200):
```typescript
{vaultPath && (
  <div style={{ 
    marginBottom: '24px',
    padding: '12px',
    backgroundColor: vaultIndexed ? '#f0fdf4' : '#fef3c7',
    border: `1px solid ${vaultIndexed ? '#bbf7d0' : '#fbbf24'}`,
    borderRadius: '6px'
  }}>
```

**Settings Card Pattern** (from Settings.tsx lines 150-160):
```typescript
<div style={{
  backgroundColor: '#f8fafc',
  padding: '24px',
  borderRadius: '8px',
  border: '1px solid #e2e8f0',
  marginBottom: '24px'
}}>
```

**Tab Navigation Pattern** (recommended for Settings):
```typescript
const [activeTab, setActiveTab] = useState<'openai' | 'vault' | 'calendar'>('openai')

<div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', marginBottom: '24px' }}>
  {[
    { id: 'openai', label: '🤖 AI Configuration' },
    { id: 'vault', label: '📚 Vault Management' },
    { id: 'calendar', label: '📅 Calendar Import' }
  ].map(tab => (
    <button
      key={tab.id}
      onClick={() => setActiveTab(tab.id)}
      style={{
        padding: '12px 16px',
        border: 'none',
        backgroundColor: 'transparent',
        borderBottom: activeTab === tab.id ? '2px solid #2563eb' : '2px solid transparent',
        color: activeTab === tab.id ? '#2563eb' : '#64748b',
        cursor: 'pointer',
        fontSize: '14px',
        fontWeight: '500'
      }}
    >
      {tab.label}
    </button>
  ))}
</div>
```

**Component Integration Pattern** (for Settings tabs):
```typescript
const renderVaultSettings = () => <VaultBrowser />
const renderCalendarSettings = () => <CalendarImport onEventsImported={handleEventsImported} />

const handleEventsImported = (events: CalendarEvent[]) => {
  setSaveMessage(`Successfully imported ${events.length} calendar events!`)
  setTimeout(() => setSaveMessage(null), 3000)
}
```

---

## IMPLEMENTATION PLAN

### Phase 1: Simplify Main Dashboard

Remove secondary features from the main dashboard and focus on meeting-centric content.

**Tasks:**
- Remove Vault Browser and Calendar Import buttons from main dashboard
- Enhance meeting display prominence
- Improve vault status visibility
- Streamline main interface layout

### Phase 2: Expand Settings Screen

Add vault management and calendar import functionality to the Settings screen as configuration tools.

**Tasks:**
- Add navigation tabs or sections to Settings
- Integrate VaultBrowser component into Settings
- Integrate CalendarImport component into Settings
- Update Settings navigation and layout

### Phase 3: Update Navigation Flow

Ensure proper navigation between screens and maintain existing functionality.

**Tasks:**
- Update navigation state management
- Test all navigation paths
- Ensure proper back navigation
- Validate component integration

### Phase 4: Polish and Validation

Refine the user experience and ensure all functionality works correctly.

**Tasks:**
- Improve visual hierarchy on main dashboard
- Test vault and calendar functionality in Settings
- Validate meeting workflow remains intact
- Ensure responsive layout

---

## STEP-BY-STEP TASKS

IMPORTANT: Execute every task in order, top to bottom. Each task is atomic and independently testable.

### UPDATE src/renderer/App.tsx

- **REMOVE**: Vault Browser and Calendar Import button grid (lines ~260-300)
- **PATTERN**: Keep existing conditional rendering pattern for navigation
- **IMPORTS**: No new imports needed
- **GOTCHA**: Preserve all existing state variables and handlers for Settings navigation
- **VALIDATE**: `npm run dev:renderer` - main dashboard should show only meetings and vault status

### UPDATE src/renderer/App.tsx

- **ENHANCE**: Make TodaysMeetings section more prominent when hasVault is true
- **PATTERN**: Use existing meeting display styling but increase visual prominence
- **IMPORTS**: No changes needed
- **GOTCHA**: Maintain existing meeting loading and refresh functionality
- **VALIDATE**: Check that meetings display prominently when vault is connected

### UPDATE src/renderer/App.tsx

- **IMPROVE**: Vault status display to be more prominent and informative
- **PATTERN**: Use existing vault status styling but make it more prominent
- **IMPORTS**: No changes needed
- **GOTCHA**: Keep existing vault status logic and state management
- **VALIDATE**: Vault status should be clearly visible and informative

### UPDATE src/renderer/App.tsx

- **ADD**: Call-to-action for Settings when no vault is connected
- **PATTERN**: Use existing button styling pattern
- **IMPORTS**: No changes needed
- **GOTCHA**: Should guide users to Settings to configure vault
- **VALIDATE**: When no vault connected, user should see clear path to Settings

### UPDATE src/renderer/components/Settings.tsx

- **ADD**: Tab navigation state and interface
- **PATTERN**: `const [activeTab, setActiveTab] = useState<'openai' | 'vault' | 'calendar'>('openai')`
- **IMPORTS**: No new imports initially
- **GOTCHA**: Maintain existing OpenAI API settings functionality
- **VALIDATE**: Settings should show tabbed interface with underline active state

### UPDATE src/renderer/components/Settings.tsx

- **ADD**: Tab navigation UI with exact styling pattern
- **PATTERN**: Use flex layout with borderBottom active state (see plan details)
- **IMPORTS**: No additional imports needed
- **GOTCHA**: Match existing gray card styling for consistency
- **VALIDATE**: Tab switching should work and maintain visual consistency

### UPDATE src/renderer/components/Settings.tsx

- **REFACTOR**: Extract existing OpenAI settings into separate component function
- **PATTERN**: `const renderOpenAISettings = () => { /* existing OpenAI JSX */ }`
- **IMPORTS**: No changes needed
- **GOTCHA**: Preserve all existing state variables and handlers
- **VALIDATE**: OpenAI settings functionality should remain identical

### UPDATE src/renderer/components/Settings.tsx

- **ADD**: Vault Management tab with VaultBrowser integration
- **PATTERN**: `const renderVaultSettings = () => <VaultBrowser />` (no onBackToHome prop)
- **IMPORTS**: `import { VaultBrowser } from './VaultBrowser'`
- **GOTCHA**: VaultBrowser onBackToHome prop is optional - omit it for Settings context
- **VALIDATE**: Vault browser should work fully within Settings tab

### UPDATE src/renderer/components/Settings.tsx

- **ADD**: Calendar Management tab with CalendarImport integration
- **PATTERN**: `const renderCalendarSettings = () => <CalendarImport onEventsImported={handleEventsImported} />`
- **IMPORTS**: `import { CalendarImport } from './CalendarImport'`
- **GOTCHA**: Handle onEventsImported callback to show success message in Settings
- **VALIDATE**: Calendar import should work and show feedback in Settings

### UPDATE src/renderer/components/Settings.tsx

- **ADD**: Event handler for calendar import success
- **PATTERN**: `const handleEventsImported = (events: CalendarEvent[]) => { /* show success message */ }`
- **IMPORTS**: `import type { CalendarEvent } from '../../shared/types/calendar'`
- **GOTCHA**: Use existing saveMessage state pattern for user feedback
- **VALIDATE**: Calendar import success should show user feedback message

### UPDATE src/renderer/App.tsx

- **REMOVE**: showVault and showCalendar state variables and related handlers
- **PATTERN**: Keep only showSettings navigation state
- **IMPORTS**: Remove VaultBrowser and CalendarImport imports
- **GOTCHA**: Ensure no references to removed state variables remain
- **VALIDATE**: `npm run build:renderer` - should compile without errors

### UPDATE src/renderer/App.tsx

- **ENHANCE**: Main dashboard layout for better visual hierarchy
- **PATTERN**: Use existing styling patterns but improve spacing and prominence
- **IMPORTS**: No changes needed
- **GOTCHA**: Maintain responsive design principles
- **VALIDATE**: Main dashboard should look clean and focused

---

## TESTING STRATEGY

### Unit Tests

No new unit tests required - this is a UI restructuring that maintains existing functionality.

### Integration Tests

Test navigation flows and component integration within Settings.

### Manual Testing Scenarios

1. **Main Dashboard Flow**:
   - Open app → Should see meetings and vault status prominently
   - No vault connected → Should see clear path to Settings
   - Vault connected → Should see meeting list and vault status

2. **Settings Navigation Flow**:
   - Click Settings → Should open Settings with tabs/sections
   - Navigate between Settings sections → Should work smoothly
   - Use Vault Browser in Settings → Should function normally
   - Use Calendar Import in Settings → Should function normally
   - Back to Home → Should return to main dashboard

3. **Existing Functionality Preservation**:
   - Meeting brief generation → Should work unchanged
   - Vault indexing → Should work unchanged
   - Calendar event import → Should work unchanged
   - OpenAI API configuration → Should work unchanged

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

1. **Main Dashboard Test**:
   - Open app → Should show clean interface with only meetings and vault status
   - No vault connected → Should see "Connect vault in Settings" message
   - Vault connected → Should see prominent meeting list and vault status
   - Settings button → Should navigate to Settings

2. **Settings Tab Navigation Test**:
   - Open Settings → Should show AI Configuration tab active by default
   - Click Vault Management tab → Should show VaultBrowser component
   - Click Calendar Import tab → Should show CalendarImport component
   - Tab visual states → Active tab should have blue underline and text

3. **Settings Functionality Test**:
   - **AI Configuration**: Test API key validation, model selection, save/clear
   - **Vault Management**: Test vault connection, file browsing, disconnection
   - **Calendar Import**: Test calendar import, event display, success feedback
   - **Navigation**: Back to Home button should return to main dashboard

4. **Integration Test**:
   - Connect vault in Settings → Return to main → Should see vault status updated
   - Import calendar in Settings → Return to main → Should see meetings updated
   - Generate meeting brief → Should work with vault connected via Settings

5. **Error Handling Test**:
   - Invalid API key → Should show error in AI Configuration tab
   - Vault connection failure → Should show error in Vault Management tab
   - Calendar import failure → Should show error in Calendar Import tab

### Level 5: Build Validation

```bash
npm run build
npm run package
```

---

## ACCEPTANCE CRITERIA

- [ ] Main dashboard shows only meetings and vault status (no vault/calendar buttons)
- [ ] Settings screen includes Vault Management and Calendar Management sections
- [ ] All existing functionality (vault browsing, calendar import, meeting briefs) works unchanged
- [ ] Navigation between main dashboard and Settings works smoothly
- [ ] Settings has clear internal navigation between different configuration areas
- [ ] Visual hierarchy on main dashboard prioritizes meetings and vault status
- [ ] Users can access all configuration tools through Settings
- [ ] No regressions in existing meeting preparation workflow
- [ ] App maintains responsive design and consistent styling
- [ ] All validation commands pass with zero errors

---

## COMPLETION CHECKLIST

- [ ] All tasks completed in order
- [ ] Each task validation passed immediately
- [ ] All validation commands executed successfully
- [ ] Manual testing confirms restructured interface works
- [ ] No regressions in existing functionality
- [ ] Settings integration works smoothly
- [ ] Main dashboard is clean and focused
- [ ] Navigation flows are intuitive
- [ ] All components properly integrated

---

## NOTES

**Design Philosophy**: This restructure follows the principle of progressive disclosure - showing users what they need daily (meetings, status) while keeping configuration tools accessible but not prominent.

**User Experience**: The change reduces cognitive load on the main screen while maintaining full functionality through logical organization in Settings.

**Technical Approach**: Leverages existing component architecture and navigation patterns to minimize code changes while maximizing UX improvement.

**Backward Compatibility**: All existing functionality is preserved, just reorganized for better user experience.
