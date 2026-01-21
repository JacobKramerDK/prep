# Feature: Update Main Page Calendar Status Display

The following plan should be complete, but its important that you validate documentation and codebase patterns and task sanity before you start implementing.

Pay special attention to naming of existing utils types and models. Import from the right files etc.

## Feature Description

Update the main page to display calendar connection status alongside the existing Obsidian vault status. Remove the unnecessary green box showing today's events count and improve the empty state experience when no connections are configured. The feature should follow the existing Tailwind v4 design system and provide clear guidance for users to set up their integrations.

## User Story

As a meeting preparation user
I want to see the status of both my Obsidian vault and calendar connections on the main page
So that I can quickly understand what integrations are active and be guided to set up missing connections

## Problem Statement

The current main page only shows Obsidian vault connection status, leaving users unaware of their calendar integration status. The green box showing today's events count is redundant information that clutters the interface. Users with no connections lack clear guidance on how to get started.

## Solution Statement

Enhance the main page status section to display both Obsidian vault and calendar connection status using consistent design patterns. Remove the redundant events count display and improve empty states with actionable guidance to connect both vault and calendar integrations.

## Feature Metadata

**Feature Type**: Enhancement
**Estimated Complexity**: Medium
**Primary Systems Affected**: HomePage component, StatusCard component, App.tsx state management
**Dependencies**: Existing calendar connection APIs, Tailwind CSS design system

---

## CONTEXT REFERENCES

### Relevant Codebase Files IMPORTANT: YOU MUST READ THESE FILES BEFORE IMPLEMENTING!

- `src/renderer/components/HomePage.tsx` (lines 1-316) - Why: Main page component that needs calendar status display
- `src/renderer/components/StatusCard.tsx` (lines 1-110) - Why: Current status card pattern to follow for calendar status
- `src/renderer/App.tsx` (lines 1-170) - Why: App state management and data flow to HomePage
- `src/main/preload.ts` (lines 150-180) - Why: Available calendar APIs including isGoogleCalendarConnected
- `src/main/services/calendar-manager.ts` (lines 795-810, 927-940) - Why: Calendar connection status methods
- `tailwind.config.js` - Why: Design system colors, spacing, and component patterns

### New Files to Create

None - this is an enhancement to existing components

### Relevant Documentation YOU SHOULD READ THESE BEFORE IMPLEMENTING!

- [Tailwind CSS Indicators](https://pagedone.io/docs/indicators)
  - Specific section: Status indicators and connection states
  - Why: Design patterns for showing connection status with proper visual hierarchy
- [Tailwind CSS Empty States](https://pagedone.io/docs/empty-states)
  - Specific section: Empty state design patterns
  - Why: Improving the no-connections experience with actionable guidance

### Patterns to Follow

**Status Card Pattern** (from StatusCard.tsx):
```tsx
// Connected state with green indicator
<div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-success-light/40 dark:bg-success-dark/20 border border-success/30 dark:border-success-dark/30">
  <div className="w-1.5 h-1.5 rounded-full bg-success dark:bg-success-400" />
  <span className="text-xs font-medium text-success-dark dark:text-success-400">Connected</span>
</div>

// Disconnected state with warning indicator  
<div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-warning-light/40 dark:bg-warning-dark/20 border border-warning/30 dark:border-warning-dark/30">
  <div className="w-1.5 h-1.5 rounded-full bg-warning dark:bg-warning-400" />
  <span className="text-xs font-medium text-warning-dark dark:text-warning-400">Not Connected</span>
</div>
```

**Card Layout Pattern** (from StatusCard.tsx):
```tsx
<div className="bg-surface border border-border rounded-xl p-4 shadow-sm hover:shadow-md transition-all duration-200">
  <div className="flex items-center justify-between gap-4">
    <div className="flex items-center gap-3 min-w-0 flex-1">
      <div className="flex-shrink-0">
        <div className="w-10 h-10 rounded-lg bg-surface-hover border border-border flex items-center justify-center">
          <Icon className="w-5 h-5 text-secondary" />
        </div>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="text-sm font-semibold text-primary">Title</h3>
          {/* Status indicator */}
        </div>
        <p className="text-sm text-secondary">Description</p>
      </div>
    </div>
  </div>
</div>
```

**Empty State Pattern** (from HomePage.tsx):
```tsx
<div className="mb-12 p-8 bg-surface border border-border rounded-xl text-center">
  <div className="flex justify-center items-center gap-3 mb-4">
    <div className="p-3 bg-brand-50 dark:bg-brand-900/20 rounded-lg">
      <Icon className="w-8 h-8 text-brand-600 dark:text-brand-400" />
    </div>
    <span className="text-xl font-semibold text-primary">Title</span>
  </div>
  <p className="text-secondary mb-6 max-w-md mx-auto">Description</p>
  <button className="px-6 py-3 bg-brand-600 hover:bg-brand-700 text-white font-medium rounded-lg shadow-sm transition-colors">
    Action
  </button>
</div>
```

---

## IMPLEMENTATION PLAN

### Phase 1: Add Calendar Status State Management

Add calendar connection status tracking to App.tsx to provide data to HomePage component.

**Tasks:**
- Add calendar connection state variables to App.tsx
- Create function to check calendar connection status
- Update useEffect to load calendar status on app start

### Phase 2: Create Calendar Status Card Component

Extend the existing StatusCard pattern to support calendar connection display or create a dedicated calendar status component.

**Tasks:**
- Analyze StatusCard component for reusability vs creating new component
- Implement calendar connection status display following existing patterns
- Add proper icons and status indicators for calendar connections

### Phase 3: Update HomePage Layout

Modify HomePage to display both vault and calendar status, remove the green events box, and improve empty states.

**Tasks:**
- Remove the green "X meetings scheduled for today" box
- Update status section to show both vault and calendar status
- Enhance empty state when no connections are configured
- Ensure responsive design and proper spacing

### Phase 4: Testing & Validation

Validate the updated interface across different connection states and ensure proper functionality.

**Tasks:**
- Test with no connections (empty state)
- Test with only vault connected
- Test with only calendar connected  
- Test with both connections active
- Verify responsive design and accessibility

---

## STEP-BY-STEP TASKS

IMPORTANT: Execute every task in order, top to bottom. Each task is atomic and independently testable.

### UPDATE App.tsx

- **IMPLEMENT**: Add calendar connection state management
- **PATTERN**: Follow existing vault status pattern in App.tsx:50-75
- **IMPORTS**: No new imports needed, use existing electronAPI
- **GOTCHA**: Calendar status check should be non-blocking and handle errors gracefully
- **VALIDATE**: `npm run dev` - App should start without errors

Add state variables for calendar connection status:
```tsx
const [hasGoogleCalendar, setHasGoogleCalendar] = useState(false)
const [calendarConnectionStatus, setCalendarConnectionStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking')
```

Create calendar status check function:
```tsx
const checkCalendarStatus = useCallback(async (): Promise<void> => {
  try {
    const isGoogleConnected = await window.electronAPI.isGoogleCalendarConnected()
    
    if (mounted) {
      setHasGoogleCalendar(isGoogleConnected)
      setCalendarConnectionStatus(isGoogleConnected ? 'connected' : 'disconnected')
    }
  } catch (error) {
    console.error('Failed to check calendar status:', error)
    if (mounted) {
      setHasGoogleCalendar(false)
      setCalendarConnectionStatus('disconnected')
    }
  }
}, [mounted])
```

Add calendar status check to existing useEffect:
```tsx
// In the existing useEffect that calls getVersion(), loadExistingEvents(), etc.
// Add: checkCalendarStatus()
```

Pass calendar status to HomePage:
```tsx
<HomePage 
  // ... existing props
  hasGoogleCalendar={hasGoogleCalendar}
  calendarConnectionStatus={calendarConnectionStatus}
/>
```

### UPDATE HomePage.tsx Interface

- **IMPLEMENT**: Add calendar status props to HomePageProps interface
- **PATTERN**: Follow existing hasVault and vaultPath pattern
- **IMPORTS**: No new imports needed
- **GOTCHA**: Make props optional with defaults for backward compatibility
- **VALIDATE**: TypeScript compilation should pass without errors

Add to HomePageProps interface:
```tsx
interface HomePageProps {
  // ... existing props
  hasGoogleCalendar?: boolean
  calendarConnectionStatus?: 'checking' | 'connected' | 'disconnected'
}
```

Update function signature with defaults:
```tsx
export function HomePage({ 
  // ... existing props
  hasGoogleCalendar = false,
  calendarConnectionStatus = 'disconnected'
}: HomePageProps) {
```

### CREATE CalendarStatusCard Component

- **IMPLEMENT**: Create calendar status card following StatusCard pattern
- **PATTERN**: Mirror StatusCard.tsx structure and styling exactly
- **IMPORTS**: Import Calendar icon from lucide-react
- **GOTCHA**: Use same responsive classes and hover effects as StatusCard
- **VALIDATE**: Component should render without console errors

Create new component in HomePage.tsx (inline component):
```tsx
const CalendarStatusCard = ({ 
  isConnected, 
  status 
}: { 
  isConnected: boolean
  status: 'checking' | 'connected' | 'disconnected'
}) => {
  if (status === 'checking') {
    return (
      <div className="bg-surface border border-border rounded-xl p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-surface-hover border border-border flex items-center justify-center">
            <Calendar className="w-5 h-5 text-secondary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-primary">Calendar</h3>
            <p className="text-sm text-secondary">Checking connection...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-surface border border-border rounded-xl p-4 shadow-sm hover:shadow-md transition-all duration-200">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 rounded-lg bg-surface-hover border border-border flex items-center justify-center">
              <Calendar className="w-5 h-5 text-secondary" />
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-sm font-semibold text-primary">Calendar</h3>
              <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full ${
                isConnected 
                  ? 'bg-success-light/40 dark:bg-success-dark/20 border border-success/30 dark:border-success-dark/30'
                  : 'bg-warning-light/40 dark:bg-warning-dark/20 border border-warning/30 dark:border-warning-dark/30'
              }`}>
                <div className={`w-1.5 h-1.5 rounded-full ${
                  isConnected ? 'bg-success dark:bg-success-400' : 'bg-warning dark:bg-warning-400'
                }`} />
                <span className={`text-xs font-medium ${
                  isConnected 
                    ? 'text-success-dark dark:text-success-400'
                    : 'text-warning-dark dark:text-warning-400'
                }`}>
                  {isConnected ? 'Connected' : 'Not Connected'}
                </span>
              </div>
            </div>
            <p className="text-sm text-secondary">
              {isConnected ? 'Google Calendar integrated' : 'Connect calendar to sync meetings'}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
```

### REMOVE Green Events Box

- **IMPLEMENT**: Remove the green box showing today's events count
- **PATTERN**: Delete the conditional render block around lines 140-146
- **IMPORTS**: No import changes needed
- **GOTCHA**: Ensure no layout shift by maintaining proper spacing
- **VALIDATE**: UI should render without the green box

Remove this block from HomePage.tsx:
```tsx
{todaysMeetings.length > 0 && (
  <div className="bg-success-light/30 border border-success/30 dark:bg-success-dark/10 dark:border-success-dark/30 rounded-lg p-3 flex items-center gap-3 text-sm font-medium text-success-dark dark:text-success-400">
    <Calendar className="w-5 h-5" />
    {todaysMeetings.length} meeting{todaysMeetings.length !== 1 ? 's' : ''} scheduled for today
  </div>
)}
```

### UPDATE Status Section Layout

- **IMPLEMENT**: Update status section to show both vault and calendar status
- **PATTERN**: Use CSS Grid with gap-4 for consistent spacing
- **IMPORTS**: No new imports needed
- **GOTCHA**: Maintain responsive design on smaller screens
- **VALIDATE**: Both status cards should display side by side on desktop, stacked on mobile

Replace the status section:
```tsx
{/* Status Section */}
<div className="space-y-4 mb-12">
  <div className="grid gap-4 md:grid-cols-2">
    <StatusCard
      isConnected={!!vaultPath}
      path={vaultPath}
      indexedCount={vaultIndexed ? vaultFileCount : 0}
      isIndexed={vaultIndexed}
    />
    
    <CalendarStatusCard
      isConnected={hasGoogleCalendar}
      status={calendarConnectionStatus}
    />
  </div>
</div>
```

### UPDATE Empty State Experience

- **IMPLEMENT**: Enhanced empty state when no connections are configured
- **PATTERN**: Follow existing empty state pattern from lines 150-170
- **IMPORTS**: Add Link icon from lucide-react
- **GOTCHA**: Show empty state only when both vault and calendar are disconnected
- **VALIDATE**: Empty state should show when no connections exist

Update the empty state condition and content:
```tsx
{/* Enhanced Empty State - show when no connections */}
{!vaultPath && !hasGoogleCalendar && (
  <div className="mb-12 p-8 bg-surface border border-border rounded-xl text-center">
    <div className="flex justify-center items-center gap-3 mb-4">
      <div className="p-3 bg-brand-50 dark:bg-brand-900/20 rounded-lg">
        <Link className="w-8 h-8 text-brand-600 dark:text-brand-400" />
      </div>
      <span className="text-xl font-semibold text-primary">
        Get Started with Prep
      </span>
    </div>
    <p className="text-secondary mb-6 max-w-md mx-auto">
      Connect your Obsidian vault and calendar to generate AI-powered meeting briefs with relevant context from your notes.
    </p>
    <div className="flex flex-col sm:flex-row gap-3 justify-center">
      <button
        onClick={() => onNavigate('settings')}
        className="px-6 py-3 bg-brand-600 hover:bg-brand-700 text-white font-medium rounded-lg shadow-sm transition-colors"
      >
        Connect Vault & Calendar
      </button>
    </div>
  </div>
)}

{/* Partial Connection State - show when only one connection exists */}
{(vaultPath && !hasGoogleCalendar) || (!vaultPath && hasGoogleCalendar) ? (
  <div className="mb-12 p-6 bg-surface border border-border rounded-xl">
    <div className="flex items-start gap-4">
      <div className="p-2 bg-warning-light/40 dark:bg-warning-dark/20 rounded-lg">
        <AlertCircle className="w-6 h-6 text-warning-dark dark:text-warning-400" />
      </div>
      <div className="flex-1">
        <h3 className="text-lg font-semibold text-primary mb-2">
          Complete Your Setup
        </h3>
        <p className="text-secondary mb-4">
          {!vaultPath && hasGoogleCalendar && "Connect your Obsidian vault to generate AI briefs with context from your notes."}
          {vaultPath && !hasGoogleCalendar && "Connect your calendar to automatically detect and prepare for meetings."}
        </p>
        <button
          onClick={() => onNavigate('settings')}
          className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          Complete Setup
        </button>
      </div>
    </div>
  </div>
) : null}
```

### ADD Required Imports

- **IMPLEMENT**: Add missing imports to HomePage.tsx
- **PATTERN**: Add to existing lucide-react import statement
- **IMPORTS**: Add Link and AlertCircle to existing import
- **GOTCHA**: Maintain alphabetical order in import statement
- **VALIDATE**: No TypeScript import errors

Update the lucide-react import:
```tsx
import { Settings, RefreshCw, Calendar, Sparkles, BookOpen, Clock, CalendarDays, Link, AlertCircle } from 'lucide-react'
```

### VERIFY API Integration

- **IMPLEMENT**: Confirm isGoogleCalendarConnected API works as expected
- **PATTERN**: Test API call in browser console: `window.electronAPI.isGoogleCalendarConnected()`
- **IMPORTS**: No imports needed
- **GOTCHA**: API might return Promise<boolean>, ensure proper async handling
- **VALIDATE**: `console.log(await window.electronAPI.isGoogleCalendarConnected())` should return boolean

### VALIDATE Color System

- **IMPLEMENT**: Confirm all Tailwind color classes exist in current config
- **PATTERN**: Check tailwind.config.js for success/warning color definitions
- **IMPORTS**: No imports needed
- **GOTCHA**: Ensure dark mode variants are properly defined
- **VALIDATE**: All color classes should be in safelist or defined in theme.extend.colors

---

## TESTING STRATEGY

### Unit Tests

Follow existing test patterns in the codebase for component testing. Focus on:
- Calendar status display logic
- Empty state conditional rendering
- Props handling and defaults

### Integration Tests

Test the full data flow from App.tsx to HomePage component:
- Calendar status loading and error handling
- State updates when calendar connection changes
- Proper rendering of different connection states

### Edge Cases

Test specific scenarios that must work correctly:
- Network errors when checking calendar status
- Rapid connection/disconnection changes
- Component unmounting during async operations
- Missing or undefined calendar status data

---

## VALIDATION COMMANDS

Execute every command to ensure zero regressions and 100% feature correctness.

### Level 1: Syntax & Style

```bash
npm run build:renderer
```

### Level 2: TypeScript Compilation

```bash
npx tsc --noEmit -p tsconfig.json
```

### Level 3: Development Server

```bash
npm run dev
```

### Level 4: Manual Validation

Test all connection states:
1. Start app with no connections - should show enhanced empty state
2. Connect only vault - should show partial connection state
3. Connect only calendar - should show partial connection state  
4. Connect both - should show both status cards without empty states
5. Verify green events box is removed
6. Test responsive design on different screen sizes

### Level 5: API Validation

Verify the calendar API integration works correctly:
```bash
# Start dev server and test in browser console
npm run dev
# Then in browser console:
# await window.electronAPI.isGoogleCalendarConnected()
```

### Level 6: Color System Validation

Verify all Tailwind classes are available:
```bash
# Check if all color classes are defined
grep -r "bg-success-light\|bg-warning-light\|text-success-dark\|text-warning-dark" tailwind.config.js
```

---

## ACCEPTANCE CRITERIA

- [ ] Calendar connection status is displayed alongside vault status
- [ ] Green "X meetings scheduled for today" box is removed
- [ ] Enhanced empty state shows when no connections exist
- [ ] Partial connection state guides users to complete setup
- [ ] Status cards use consistent design patterns and styling
- [ ] Responsive design works on mobile and desktop
- [ ] All validation commands pass with zero errors
- [ ] TypeScript compilation succeeds without warnings
- [ ] Component handles loading and error states gracefully
- [ ] UI follows existing Tailwind design system patterns

---

## COMPLETION CHECKLIST

- [ ] App.tsx updated with calendar status state management
- [ ] HomePage.tsx interface updated with calendar status props
- [ ] CalendarStatusCard component created following StatusCard pattern
- [ ] Green events count box removed from status section
- [ ] Status section updated to show both vault and calendar status
- [ ] Enhanced empty state implemented for no connections
- [ ] Partial connection state added for incomplete setup
- [ ] Required imports added (Link, AlertCircle icons)
- [ ] Calendar API integration verified and working
- [ ] All Tailwind color classes confirmed to exist in config
- [ ] All validation commands executed successfully
- [ ] Manual testing confirms all connection states work correctly
- [ ] Responsive design verified on different screen sizes
- [ ] No TypeScript errors or console warnings

---

## NOTES

**Design Consistency**: The implementation follows the existing StatusCard pattern exactly to maintain visual consistency. The calendar status card uses the same layout, spacing, colors, and interaction patterns.

**State Management**: Calendar status is managed at the App.tsx level following the same pattern as vault status, ensuring consistent data flow and error handling.

**Progressive Enhancement**: The feature gracefully handles different connection states, providing clear guidance for users to complete their setup without overwhelming them.

**Responsive Design**: The status cards are displayed in a responsive grid that stacks on mobile devices while maintaining proper spacing and readability.

**Error Handling**: Calendar status checking includes proper error handling and fallback states to ensure the UI remains functional even when API calls fail.

**API Validation**: The plan includes verification steps to confirm the `isGoogleCalendarConnected` API works as expected and returns the correct boolean values.

**Color System Verification**: All Tailwind color classes used in the implementation are validated against the current config to prevent runtime styling issues.

## Success Metrics

**One-Pass Implementation**: Execution agent can complete feature without additional research or clarification

**Validation Complete**: Every task has at least one working validation command

**Context Rich**: The Plan passes "No Prior Knowledge Test" - someone unfamiliar with codebase can implement using only Plan content

**Confidence Score**: 10/10 that execution will succeed on first attempt
