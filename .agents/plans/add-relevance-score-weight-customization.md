# Feature: Relevance Score Weight Customization

The following plan should be complete, but its important that you validate documentation and codebase patterns and task sanity before you start implementing.

Pay special attention to naming of existing utils types and models. Import from the right files etc.

## Feature Description

Add a new settings section that allows users to customize the weight of different components that make up the relevance score for Obsidian vault context matching. Users can adjust weights for title matching, content similarity, tags, attendees, FlexSearch bonus, and recency bonus using intuitive sliders with visual feedback.

## User Story

As a Prep user
I want to customize how the AI prioritizes different aspects of my notes when finding relevant context
So that I can fine-tune the relevance scoring to match my personal note-taking patterns and preferences

## Problem Statement

The current relevance scoring algorithm uses hardcoded weights that may not align with different users' note-taking styles. Some users may prioritize recent notes more heavily, while others may want stronger emphasis on title matching or tag-based organization. The fixed weights limit the system's ability to adapt to individual workflows.

## Solution Statement

Implement a new "Relevance Scoring" tab in the settings page with sliders for each weight component. The sliders will allow real-time adjustment with visual feedback, automatic normalization to ensure weights sum appropriately, and persistent storage of user preferences. The interface will include explanations of each component and preview of how changes affect scoring.

## Feature Metadata

**Feature Type**: Enhancement
**Estimated Complexity**: Medium
**Primary Systems Affected**: Settings UI, Context Retrieval Service, Settings Manager
**Dependencies**: React slider component, electron-store for persistence

---

## CONTEXT REFERENCES

### Relevant Codebase Files IMPORTANT: YOU MUST READ THESE FILES BEFORE IMPLEMENTING!

- `src/renderer/components/SettingsPage.tsx` (lines 1-490) - Why: Main settings page structure and tab pattern to follow
- `src/main/services/context-retrieval-service.ts` (lines 289-343) - Why: Current relevance scoring implementation with hardcoded weights
- `src/main/services/settings-manager.ts` (lines 15-34, 36-306) - Why: Settings storage patterns and schema structure
- `src/shared/types/ipc.ts` (lines 1-82) - Why: IPC interface patterns for adding new settings methods
- `src/main/index.ts` (lines 1-539) - Why: IPC handler registration patterns
- `src/renderer/components/Tabs.tsx` (lines 1-51) - Why: Tab component structure for adding new tab

### New Files to Create

- `src/shared/types/relevance-weights.ts` - Type definitions for relevance weight configuration
- `src/renderer/components/RelevanceWeightSlider.tsx` - Individual slider component with label and value display
- `src/renderer/components/RelevanceWeightSettings.tsx` - Main relevance weight settings panel

### Relevant Documentation YOU SHOULD READ THESE BEFORE IMPLEMENTING!

- [React Range Slider Input](https://www.npmjs.com/package/react-range-slider-input)
  - Specific section: Basic usage and TypeScript integration
  - Why: Lightweight slider component compatible with React 19 and TypeScript
- [Electron Store Documentation](https://github.com/sindresorhus/electron-store#readme)
  - Specific section: Schema validation and default values
  - Why: Understanding settings persistence patterns used in the project

### Patterns to Follow

**Settings Tab Pattern:**
```tsx
// From SettingsPage.tsx lines 150-170 - exact tab structure
const tabs = [
  {
    id: 'relevance',
    label: 'Relevance Scoring',
    icon: <Settings className="w-4 h-4" />,
  }
]

// Tab content structure from lines 230-320
{activeTab === 'relevance' && (
  <div className="bg-surface border border-border rounded-xl p-6 shadow-sm">
    <div className="flex items-center gap-3 mb-6">
      <div className="p-2 bg-brand-50 dark:bg-brand-900/20 rounded-lg">
        <Settings className="w-6 h-6 text-brand-600 dark:text-brand-400" />
      </div>
      <h2 className="text-xl font-semibold text-primary">Relevance Scoring</h2>
    </div>
    <p className="text-secondary mb-6 max-w-2xl">Description text</p>
    <div className="space-y-6 max-w-2xl">{/* Content */}</div>
  </div>
)}
```

**Form Control Pattern:**
```tsx
// From SettingsPage.tsx lines 250-260 - exact input styling
<input
  className="flex-1 h-11 px-4 rounded-lg border border-border bg-background text-primary focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
/>

// Button pattern from lines 310-320
<button className="flex items-center gap-2 px-6 py-2.5 bg-success hover:bg-success-dark disabled:opacity-50 text-white font-medium rounded-lg shadow-sm transition-colors">
  <Save className="w-4 h-4" />
  Save Settings
</button>
```

**Range Input Styling:**
```css
/* Custom range input styling to match design system */
input[type="range"] {
  @apply w-full h-2 bg-surface border border-border rounded-lg appearance-none cursor-pointer;
}
input[type="range"]::-webkit-slider-thumb {
  @apply appearance-none w-5 h-5 bg-brand-600 rounded-full cursor-pointer border-2 border-background shadow-sm;
}
input[type="range"]::-moz-range-thumb {
  @apply w-5 h-5 bg-brand-600 rounded-full cursor-pointer border-2 border-background shadow-sm;
}
```

**Settings Manager Pattern:**
```typescript
// From settings-manager.ts - getter/setter pattern
getRelevanceWeights(): RelevanceWeights {
  return this.store.get('relevanceWeights', defaultWeights)
}

setRelevanceWeights(weights: RelevanceWeights): void {
  this.store.set('relevanceWeights', weights)
}
```

**IPC Handler Pattern:**
```typescript
// From index.ts - IPC registration pattern
ipcMain.handle('get-relevance-weights', async () => {
  return settingsManager.getRelevanceWeights()
})

ipcMain.handle('set-relevance-weights', async (_, weights: RelevanceWeights) => {
  settingsManager.setRelevanceWeights(weights)
})
```

**Component State Pattern:**
```tsx
// From SettingsPage.tsx - state management pattern
const [weights, setWeights] = useState<RelevanceWeights>(defaultWeights)
const [isSaving, setIsSaving] = useState(false)
const [saveMessage, setSaveMessage] = useState<string | null>(null)

useEffect(() => {
  const loadWeights = async () => {
    const savedWeights = await window.electronAPI.getRelevanceWeights()
    setWeights(savedWeights)
  }
  loadWeights()
}, [])
```

---

## IMPLEMENTATION PLAN

### Phase 1: Foundation

Set up type definitions and extend settings schema to support relevance weight configuration.

**Tasks:**
- Create RelevanceWeights interface with all weight components
- Extend SettingsSchema to include relevanceWeights field
- Add default weight values matching current hardcoded weights

### Phase 2: Backend Implementation

Implement settings storage and IPC handlers for relevance weight management.

**Tasks:**
- Add relevance weight getter/setter methods to SettingsManager
- Register IPC handlers for weight operations
- Update ContextRetrievalService to use configurable weights
- Add ElectronAPI interface methods

### Phase 3: UI Components

Create reusable slider components and main settings panel.

**Tasks:**
- Install react-range-slider-input dependency
- Create RelevanceWeightSlider component with label and value display
- Create RelevanceWeightSettings panel with all sliders
- Add weight normalization and validation logic

### Phase 4: Settings Integration

Integrate the new relevance scoring tab into the existing settings page.

**Tasks:**
- Add relevance tab to SettingsPage tabs array
- Implement tab content with RelevanceWeightSettings component
- Add save/reset functionality with user feedback
- Test weight persistence and real-time updates

---

## STEP-BY-STEP TASKS

IMPORTANT: Execute every task in order, top to bottom. Each task is atomic and independently testable.

### CREATE src/shared/types/relevance-weights.ts

- **IMPLEMENT**: RelevanceWeights interface with all weight components
- **PATTERN**: Follow existing type definition patterns from vault.ts and calendar.ts
- **IMPORTS**: No external imports needed
- **GOTCHA**: Ensure weight names match exactly with context-retrieval-service.ts variable names
- **VALIDATE**: `npx tsc --noEmit`

### UPDATE src/main/services/settings-manager.ts

- **IMPLEMENT**: Add relevanceWeights to SettingsSchema interface
- **PATTERN**: Follow existing schema field patterns (lines 15-34)
- **IMPORTS**: Import RelevanceWeights from shared types
- **GOTCHA**: Add to defaults object in constructor with current hardcoded values
- **VALIDATE**: `npx tsc --noEmit`

### ADD src/main/services/settings-manager.ts

- **IMPLEMENT**: getRelevanceWeights and setRelevanceWeights methods
- **PATTERN**: Mirror existing getter/setter patterns like getOpenAIApiKey/setOpenAIApiKey (lines 150-170)
- **IMPORTS**: No additional imports needed
- **GOTCHA**: Use proper return types and parameter validation
- **VALIDATE**: `npm run test:unit -- settings-manager.test.ts`

### UPDATE src/shared/types/ipc.ts

- **IMPLEMENT**: Add getRelevanceWeights and setRelevanceWeights to ElectronAPI interface
- **PATTERN**: Follow existing settings method patterns (lines 50-55)
- **IMPORTS**: Import RelevanceWeights type
- **GOTCHA**: Ensure method signatures match SettingsManager methods exactly
- **VALIDATE**: `npx tsc --noEmit`

### UPDATE src/main/index.ts

- **IMPLEMENT**: Register IPC handlers for relevance weight operations
- **PATTERN**: Follow existing settings IPC handler patterns (search for 'get-openai' around line 400)
- **IMPORTS**: No additional imports needed
- **GOTCHA**: Use consistent handler naming convention with hyphens
- **VALIDATE**: `npm run build:main`

### UPDATE src/main/services/context-retrieval-service.ts

- **IMPLEMENT**: Replace hardcoded weights object with configurable weights from settings
- **PATTERN**: Add settingsManager dependency injection pattern from other services
- **IMPORTS**: Import RelevanceWeights type and inject SettingsManager
- **GOTCHA**: Maintain backward compatibility with fallback to default weights
- **VALIDATE**: `npm run test:unit -- context-retrieval-service.test.ts`

### CREATE src/renderer/components/RelevanceWeightSlider.tsx

- **IMPLEMENT**: Individual slider component with label, value display, and description
- **PATTERN**: Mirror SettingsPage.tsx input styling (lines 250-260) - `h-11 px-4 rounded-lg border border-border bg-background text-primary focus:ring-2 focus:ring-brand-500`
- **IMPORTS**: React, lucide-react icons (Info for tooltips)
- **GOTCHA**: Use HTML input type="range" with custom CSS styling to match design system
- **VALIDATE**: `npm run build:renderer`

### CREATE src/renderer/components/RelevanceWeightSettings.tsx

- **IMPLEMENT**: Main panel with all weight sliders and normalization logic
- **PATTERN**: Mirror SettingsPage.tsx section structure (lines 230-320) - `bg-surface border border-border rounded-xl p-6 shadow-sm` with `space-y-6 max-w-2xl`
- **IMPORTS**: React hooks, RelevanceWeightSlider, Settings icon from lucide-react
- **GOTCHA**: Follow exact button styling pattern from SettingsPage - `flex items-center gap-2 px-6 py-2.5 bg-success hover:bg-success-dark text-white font-medium rounded-lg shadow-sm transition-colors`
- **VALIDATE**: `npm run build:renderer`

### UPDATE src/renderer/components/SettingsPage.tsx

- **IMPLEMENT**: Add relevance tab to tabs array and tab content section
- **PATTERN**: Exact tab structure from lines 150-170: `{ id: 'relevance', label: 'Relevance Scoring', icon: <Settings className="w-4 h-4" /> }` and content section from lines 230-320
- **IMPORTS**: Import RelevanceWeightSettings, Settings icon from lucide-react
- **GOTCHA**: Insert tab in logical position (after 'ai' tab) and maintain exact className patterns for consistency
- **VALIDATE**: `npm run dev:renderer` and manual UI testing

### UPDATE package.json

- **IMPLEMENT**: No external dependencies needed - using HTML range input with Tailwind v4 styling
- **PATTERN**: Leverage existing design system instead of external libraries
- **IMPORTS**: No imports needed
- **GOTCHA**: HTML range inputs provide better accessibility and consistency with existing form controls
- **VALIDATE**: `npm install && npm run build`

---

## TESTING STRATEGY

### Unit Tests

Design unit tests following existing patterns in tests/unit/ directory:

**SettingsManager Tests:**
- Test getRelevanceWeights returns default values initially
- Test setRelevanceWeights persists values correctly
- Test weight validation and bounds checking

**ContextRetrievalService Tests:**
- Test relevance scoring uses configurable weights
- Test fallback to default weights when settings unavailable
- Test score calculation with different weight configurations

### Integration Tests

**IPC Communication Tests:**
- Test relevance weight IPC handlers work correctly
- Test settings persistence across app restarts
- Test weight changes affect context retrieval results

### Edge Cases

- Invalid weight values (negative, NaN, extremely large)
- Missing settings file or corrupted data
- Weight normalization edge cases (all zeros, single weight at 100%)
- Concurrent weight updates from multiple UI interactions

---

## VALIDATION COMMANDS

Execute every command to ensure zero regressions and 100% feature correctness.

### Level 1: Syntax & Style

```bash
npx tsc --noEmit
npm run lint
```

### Level 2: Unit Tests

```bash
npm run test:unit -- settings-manager
npm run test:unit -- context-retrieval-service
```

### Level 3: Integration Tests

```bash
npm run test:e2e -- settings
npm run build && npm run package
```

### Level 4: Manual Validation

**Settings UI Testing:**
- Open settings page and navigate to Relevance Scoring tab
- Adjust each slider and verify real-time value updates
- Save settings and verify persistence across app restart
- Reset to defaults and verify all sliders return to original values

**Context Retrieval Testing:**
- Create test meeting with known context
- Adjust weights significantly (e.g., max title weight, min content weight)
- Generate meeting brief and verify context ranking changes appropriately
- Test with different weight combinations

### Level 5: Additional Validation (Optional)

```bash
npm run test:e2e -- functionality-verification
```

---

## ACCEPTANCE CRITERIA

- [ ] New "Relevance Scoring" tab appears in settings page
- [ ] Six sliders control: title, content, tags, attendees, FlexSearch bonus, recency bonus weights
- [ ] Each slider shows current value and descriptive label
- [ ] Weight changes persist across application restarts
- [ ] Save/Reset functionality works correctly with user feedback
- [ ] Context retrieval uses configurable weights instead of hardcoded values
- [ ] All validation commands pass with zero errors
- [ ] UI follows existing design patterns and styling
- [ ] Weight normalization prevents invalid configurations
- [ ] Performance impact is negligible (< 5ms overhead per context retrieval)

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

## NOTES

**Design Decisions:**
- Using HTML range input with Tailwind v4 custom styling to maintain perfect consistency with existing design system
- Implementing weight normalization as guidance rather than strict enforcement to allow user experimentation
- Storing weights as decimal values (0.0-1.0) to match existing scoring algorithm expectations
- Leveraging exact className patterns from SettingsPage.tsx for pixel-perfect consistency

**Performance Considerations:**
- Weight retrieval cached in ContextRetrievalService to avoid repeated IPC calls
- Settings changes trigger cache invalidation for immediate effect
- Slider updates debounced to prevent excessive re-renders during dragging

**Confidence Score:** 9.5/10 for one-pass implementation success - the plan uses exact existing patterns with specific line references, native HTML controls with design system styling, and comprehensive validation steps.

**Future Enhancements:**
- Preset weight configurations for different use cases (recent-focused, tag-heavy, etc.)
- Visual preview of how weight changes affect sample context results
- Export/import weight configurations for sharing between users
