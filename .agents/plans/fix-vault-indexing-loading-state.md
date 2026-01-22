# Feature: Fix Vault Indexing Loading State

The following plan should be complete, but its important that you validate documentation and codebase patterns and task sanity before you start implementing.

Pay special attention to naming of existing utils types and models. Import from the right files etc.

## Feature Description

Fix the vault connection user experience where users see "0 indexed files" immediately after connecting a vault, even though the correct file count appears later on the main page. The issue occurs due to a race condition between frontend initialization and asynchronous vault indexing. Users should see proper loading states during vault indexing with progress feedback.

## User Story

As a user connecting an Obsidian vault
I want to see accurate loading states and progress during vault indexing
So that I understand the system is working and know when indexing is complete

## Problem Statement

Currently, when a user connects an Obsidian vault:
1. The UI immediately shows "0 indexed files" with the vault path
2. The main page later shows the correct indexed file count
3. There's no visual feedback that indexing is in progress
4. Users may think the vault connection failed or is incomplete

This happens because:
- `loadExistingVault()` runs asynchronously during app startup
- Frontend queries vault status before background indexing completes
- VaultIndexer starts empty (`documents.size = 0`) until `indexFiles()` finishes
- No progress events are emitted during the indexing process

## Solution Statement

Add proper loading states and progress tracking for vault indexing by:
1. Adding indexing status/progress IPC handlers to track indexing state
2. Emitting progress events during vault scanning and indexing
3. Creating reusable loading components for vault indexing states
4. Updating UI components to show loading states until indexing completes
5. Ensuring consistent behavior across vault connection flows (VaultSelector and SettingsPage)

## Feature Metadata

**Feature Type**: Enhancement
**Estimated Complexity**: Medium
**Primary Systems Affected**: Electron main process (vault services), React frontend (vault components), IPC communication
**Dependencies**: Existing Tailwind design system, LoadingScreen component patterns

---

## CONTEXT REFERENCES

### Relevant Codebase Files IMPORTANT: YOU MUST READ THESE FILES BEFORE IMPLEMENTING!

- `src/main/index.ts` (lines 70-100) - Why: Contains `loadExistingVault()` async flow and IPC handlers setup
- `src/main/services/vault-manager.ts` (lines 45-106) - Why: Contains `scanVault()` method that needs progress tracking
- `src/renderer/App.tsx` (lines 25-60) - Why: Contains `checkVaultStatus()` that queries vault state
- `src/renderer/components/LoadingScreen.tsx` - Why: Existing loading component pattern to reuse
- `src/renderer/components/VaultSelector.tsx` (lines 35-60) - Why: Vault selection flow with existing loading state
- `src/renderer/components/SettingsPage.tsx` (lines 170-185) - Why: Alternative vault connection flow that needs updating
- `src/shared/types/ipc.ts` (lines 50-60) - Why: IPC interface definitions for new handlers
- `src/main/preload.ts` (lines 120-130) - Why: IPC method exposure to renderer

### New Files to Create

- `src/renderer/components/VaultIndexingLoader.tsx` - Reusable vault indexing loading component
- `src/shared/types/vault-status.ts` - TypeScript interfaces for vault indexing status

### Relevant Documentation YOU SHOULD READ THESE BEFORE IMPLEMENTING!

- [Electron IPC Documentation](https://www.electronjs.org/docs/latest/tutorial/ipc)
  - Specific section: Main to Renderer communication
  - Why: Required for implementing progress event emission
- [React useEffect Hook](https://react.dev/reference/react/useEffect)
  - Specific section: Effect cleanup and dependencies
  - Why: Proper cleanup of event listeners for progress updates

### Patterns to Follow

**Loading Component Pattern** (from LoadingScreen.tsx):
```tsx
<div className="animate-pulse">
  <AppIcon size={80} />
</div>
<div className="w-8 h-8 border-2 border-brand-200 border-t-brand-600 rounded-full animate-spin"></div>
```

**IPC Handler Pattern** (from index.ts):
```typescript
ipcMain.handle('context:getIndexedFileCount', async () => {
  return contextRetrievalService.getIndexedFileCount()
})
```

**Async State Management Pattern** (from App.tsx):
```typescript
const checkVaultStatus = useCallback(async (): Promise<void> => {
  try {
    const [isIndexed, fileCount, vaultPath] = await Promise.all([
      window.electronAPI.isContextIndexed(),
      window.electronAPI.getContextIndexedFileCount(),
      window.electronAPI.getVaultPath()
    ])
    // Update state...
  } catch (error) {
    console.error('Failed to check vault status:', error)
  }
}, [mounted])
```

**Component Cleanup Pattern** (from App.tsx):
```typescript
const [mounted, setMounted] = useState(true)

useEffect(() => {
  return () => setMounted(false)
}, [])

// In async operations:
if (mounted) {
  setVaultIndexed(isIndexed)
}
```

**Loading State Pattern** (from VaultSelector.tsx):
```typescript
const [loading, setLoading] = useState(false)
// In component:
{loading && <div>Loading...</div>}
```

**NEW: Event-Based IPC Pattern** (to implement):
```typescript
// Main process - emit progress events
const webContents = BrowserWindow.getFocusedWindow()?.webContents
webContents?.send('vault:indexing-progress', { current: 5, total: 100, stage: 'scanning' })

// Preload - expose event listener with cleanup
onVaultIndexingProgress: (callback: (data: VaultIndexingProgress) => void) => {
  const handler = (_: any, data: VaultIndexingProgress) => callback(data)
  ipcRenderer.on('vault:indexing-progress', handler)
  return () => ipcRenderer.removeListener('vault:indexing-progress', handler)
}

// Renderer - use with cleanup
useEffect(() => {
  const cleanup = window.electronAPI.onVaultIndexingProgress((progress) => {
    if (mounted) setProgress(progress)
  })
  return cleanup
}, [mounted])
```

---

## IMPLEMENTATION PLAN

### Phase 1: Backend Progress Tracking

Add vault indexing status tracking and progress events to the main process.

**Tasks:**
- Create vault indexing status types and interfaces
- Add progress tracking to VaultManager.scanVault()
- Implement IPC handlers for indexing status and progress
- Add event emission during indexing process

### Phase 2: Frontend Loading Components

Create reusable loading components and update existing vault UI components.

**Tasks:**
- Create VaultIndexingLoader component following existing patterns
- Add vault indexing status types to shared types
- Update IPC interface definitions for new handlers

### Phase 3: Integration & State Management

Integrate progress tracking into existing vault connection flows.

**Tasks:**
- Update App.tsx to handle indexing progress events
- Update VaultSelector.tsx to show indexing progress
- Update SettingsPage.tsx vault connection flow
- Add progress event listeners and cleanup

### Phase 4: Testing & Validation

Ensure loading states work correctly across all vault connection scenarios.

**Tasks:**
- Test vault connection from VaultSelector
- Test vault connection from SettingsPage  
- Test app startup with existing vault
- Validate loading states and progress feedback

---

## STEP-BY-STEP TASKS

IMPORTANT: Execute every task in order, top to bottom. Each task is atomic and independently testable.

### CREATE src/shared/types/vault-status.ts

- **IMPLEMENT**: TypeScript interfaces for vault indexing status and progress
- **PATTERN**: Follow existing type definitions in `src/shared/types/ipc.ts`
- **IMPORTS**: No external dependencies needed
- **GOTCHA**: Use consistent naming with existing vault-related types
- **SPECIFIC TYPES NEEDED**:
  ```typescript
  export interface VaultIndexingProgress {
    stage: 'scanning' | 'indexing' | 'complete' | 'error'
    current: number
    total: number
    currentFile?: string
    error?: string
  }
  
  export interface VaultIndexingStatus {
    isIndexing: boolean
    progress?: VaultIndexingProgress
  }
  ```
- **VALIDATE**: `npx tsc --noEmit src/shared/types/vault-status.ts`

### UPDATE src/shared/types/ipc.ts

- **IMPLEMENT**: Add new IPC method signatures for vault indexing status and progress events
- **PATTERN**: Follow existing IPC method pattern (lines 50-60)
- **IMPORTS**: Import VaultIndexingStatus, VaultIndexingProgress from vault-status.ts
- **GOTCHA**: Maintain alphabetical ordering of methods
- **SPECIFIC METHODS TO ADD**:
  ```typescript
  getVaultIndexingStatus: () => Promise<VaultIndexingStatus>
  onVaultIndexingProgress: (callback: (progress: VaultIndexingProgress) => void) => () => void
  ```
- **VALIDATE**: `npx tsc --noEmit src/shared/types/ipc.ts`

### UPDATE src/main/services/vault-manager.ts

- **IMPLEMENT**: Add progress tracking and event emission to scanVault method
- **PATTERN**: Use existing Debug.log pattern for logging (line 47)
- **IMPORTS**: Import BrowserWindow from 'electron' for webContents access
- **GOTCHA**: Emit progress events at key milestones (start, file scanning, indexing, complete)
- **SPECIFIC PROGRESS POINTS**:
  1. **Start scanning**: `{ stage: 'scanning', current: 0, total: 0 }`
  2. **Files found**: `{ stage: 'scanning', current: files.length, total: files.length }`
  3. **Start indexing**: `{ stage: 'indexing', current: 0, total: files.length }`
  4. **Indexing complete**: `{ stage: 'complete', current: files.length, total: files.length }`
  5. **On error**: `{ stage: 'error', current: 0, total: 0, error: errorMessage }`
- **IMPLEMENTATION LOCATION**: Insert progress emissions at lines 47, 65, 87, 98, and in catch block
- **VALIDATE**: `npx tsc --noEmit src/main/services/vault-manager.ts`

### UPDATE src/main/services/vault-indexer.ts

- **IMPLEMENT**: Add progress tracking during file indexing loop
- **PATTERN**: Use existing Debug.log pattern and for loop structure (lines 55-65)
- **IMPORTS**: Import BrowserWindow from 'electron' for webContents access
- **GOTCHA**: Emit progress every 10 files to avoid overwhelming the UI
- **SPECIFIC IMPLEMENTATION**:
  ```typescript
  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    try {
      await this.indexFile(file)
      
      // Emit progress every 10 files or on last file
      if (i % 10 === 0 || i === files.length - 1) {
        const webContents = BrowserWindow.getFocusedWindow()?.webContents
        webContents?.send('vault:indexing-progress', {
          stage: 'indexing',
          current: i + 1,
          total: files.length,
          currentFile: file.path
        })
      }
    } catch (error) {
      console.error(`Failed to index file ${file.path}:`, error)
    }
  }
  ```
- **VALIDATE**: `npx tsc --noEmit src/main/services/vault-indexer.ts`

### UPDATE src/main/index.ts

- **IMPLEMENT**: Add IPC handlers for vault indexing status and track indexing state
- **PATTERN**: Follow existing IPC handler pattern (lines 200-210)
- **IMPORTS**: Import VaultIndexingStatus, VaultIndexingProgress types
- **GOTCHA**: Place new handlers with other vault-related handlers around line 210
- **SPECIFIC IMPLEMENTATION**:
  ```typescript
  // Add global indexing status tracking
  let currentIndexingStatus: VaultIndexingStatus = { isIndexing: false }
  
  // Update loadExistingVault to set indexing status
  const loadExistingVault = async (): Promise<void> => {
    currentIndexingStatus = { isIndexing: true }
    // ... existing code ...
    currentIndexingStatus = { isIndexing: false }
  }
  
  // Add IPC handler
  ipcMain.handle('vault:getIndexingStatus', async () => {
    return currentIndexingStatus
  })
  ```
- **VALIDATE**: `npx tsc --noEmit src/main/index.ts`

### UPDATE src/main/preload.ts

- **IMPLEMENT**: Expose new IPC methods and event listeners to renderer process
- **PATTERN**: Follow existing method exposure pattern (lines 120-130)
- **IMPORTS**: No additional imports needed
- **GOTCHA**: Maintain alphabetical ordering and consistent naming
- **SPECIFIC METHODS TO ADD**:
  ```typescript
  getVaultIndexingStatus: () => ipcRenderer.invoke('vault:getIndexingStatus'),
  onVaultIndexingProgress: (callback: (progress: VaultIndexingProgress) => void) => {
    const handler = (_: any, data: VaultIndexingProgress) => callback(data)
    ipcRenderer.on('vault:indexing-progress', handler)
    return () => ipcRenderer.removeListener('vault:indexing-progress', handler)
  }
  ```
- **VALIDATE**: `npx tsc --noEmit src/main/preload.ts`

### CREATE src/renderer/components/VaultIndexingLoader.tsx

- **IMPLEMENT**: Reusable loading component for vault indexing with progress display
- **PATTERN**: Mirror LoadingScreen.tsx structure and styling
- **IMPORTS**: React, VaultIndexingProgress type, Tailwind classes
- **GOTCHA**: Use existing Tailwind spinner and pulse animations
- **SPECIFIC IMPLEMENTATION**:
  ```tsx
  interface Props {
    progress?: VaultIndexingProgress
  }
  
  export function VaultIndexingLoader({ progress }: Props) {
    const getProgressText = () => {
      if (!progress) return 'Preparing vault...'
      
      switch (progress.stage) {
        case 'scanning': return 'Scanning vault files...'
        case 'indexing': return `Indexing files... (${progress.current}/${progress.total})`
        case 'complete': return 'Vault ready!'
        case 'error': return `Error: ${progress.error}`
        default: return 'Processing vault...'
      }
    }
    
    const getProgressPercentage = () => {
      if (!progress || progress.total === 0) return 0
      return Math.round((progress.current / progress.total) * 100)
    }
    
    return (
      <div className="text-center p-6">
        <div className="mb-4 flex justify-center">
          <div className="animate-pulse">
            <Database className="w-12 h-12 text-brand-600" />
          </div>
        </div>
        
        <p className="text-secondary mb-4">{getProgressText()}</p>
        
        {progress && progress.stage !== 'error' && (
          <div className="w-full bg-surface-hover rounded-full h-2 mb-2">
            <div 
              className="bg-brand-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${getProgressPercentage()}%` }}
            />
          </div>
        )}
        
        <div className="flex justify-center">
          <div className="w-6 h-6 border-2 border-brand-200 border-t-brand-600 rounded-full animate-spin"></div>
        </div>
      </div>
    )
  }
  ```
- **VALIDATE**: `npx tsc --noEmit src/renderer/components/VaultIndexingLoader.tsx`

### UPDATE src/renderer/App.tsx

- **IMPLEMENT**: Add vault indexing progress event listeners and state management
- **PATTERN**: Follow existing useCallback and useEffect patterns (lines 25-60)
- **IMPORTS**: Add VaultIndexingStatus, VaultIndexingProgress types
- **GOTCHA**: Clean up event listeners in useEffect cleanup function
- **SPECIFIC IMPLEMENTATION**:
  ```typescript
  const [vaultIndexingStatus, setVaultIndexingStatus] = useState<VaultIndexingStatus>({ isIndexing: false })
  const [vaultIndexingProgress, setVaultIndexingProgress] = useState<VaultIndexingProgress | null>(null)
  
  // Add progress event listener
  useEffect(() => {
    const cleanup = window.electronAPI.onVaultIndexingProgress((progress) => {
      if (mounted) {
        setVaultIndexingProgress(progress)
        
        // Update indexing status based on progress
        if (progress.stage === 'complete') {
          setVaultIndexingStatus({ isIndexing: false })
          // Refresh vault status after completion
          checkVaultStatus()
        } else if (progress.stage === 'error') {
          setVaultIndexingStatus({ isIndexing: false })
        } else {
          setVaultIndexingStatus({ isIndexing: true, progress })
        }
      }
    })
    
    return cleanup
  }, [mounted, checkVaultStatus])
  
  // Check indexing status on mount
  useEffect(() => {
    const checkIndexingStatus = async () => {
      try {
        const status = await window.electronAPI.getVaultIndexingStatus()
        if (mounted) {
          setVaultIndexingStatus(status)
        }
      } catch (error) {
        console.error('Failed to check indexing status:', error)
      }
    }
    
    checkIndexingStatus()
  }, [mounted])
  ```
- **VALIDATE**: `npx tsc --noEmit src/renderer/App.tsx`

### UPDATE src/renderer/components/VaultSelector.tsx

- **IMPLEMENT**: Show VaultIndexingLoader during vault scanning and indexing
- **PATTERN**: Use existing loading state pattern (lines 35-60)
- **IMPORTS**: Import VaultIndexingLoader component and progress types
- **GOTCHA**: Replace generic loading with specific vault indexing loader
- **SPECIFIC IMPLEMENTATION**:
  ```typescript
  // Add progress state
  const [indexingProgress, setIndexingProgress] = useState<VaultIndexingProgress | null>(null)
  
  // Add progress listener
  useEffect(() => {
    const cleanup = window.electronAPI.onVaultIndexingProgress((progress) => {
      setIndexingProgress(progress)
      
      if (progress.stage === 'complete') {
        setLoading(false)
        checkIndexStatus()
      } else if (progress.stage === 'error') {
        setLoading(false)
        setError(progress.error || 'Vault indexing failed')
      }
    })
    
    return cleanup
  }, [])
  
  // Update render to show VaultIndexingLoader when loading
  {loading && <VaultIndexingLoader progress={indexingProgress} />}
  ```
- **VALIDATE**: `npx tsc --noEmit src/renderer/components/VaultSelector.tsx`

### UPDATE src/renderer/components/SettingsPage.tsx

- **IMPLEMENT**: Add loading state during vault selection and scanning
- **PATTERN**: Follow VaultSelector loading pattern
- **IMPORTS**: Import VaultIndexingLoader, useState for loading state, progress types
- **GOTCHA**: Update handleSelectVault to show loading during entire process
- **SPECIFIC IMPLEMENTATION**:
  ```typescript
  const [vaultLoading, setVaultLoading] = useState(false)
  const [vaultIndexingProgress, setVaultIndexingProgress] = useState<VaultIndexingProgress | null>(null)
  
  // Add progress listener
  useEffect(() => {
    const cleanup = window.electronAPI.onVaultIndexingProgress((progress) => {
      setVaultIndexingProgress(progress)
      
      if (progress.stage === 'complete' || progress.stage === 'error') {
        setVaultLoading(false)
      }
    })
    
    return cleanup
  }, [])
  
  const handleSelectVault = async () => {
    setVaultLoading(true)
    setVaultIndexingProgress(null)
    
    try {
      const vaultPath = await window.electronAPI.selectVault()
      if (vaultPath) {
        await window.electronAPI.scanVault(vaultPath)
        // Loading state will be cleared by progress event listener
      } else {
        setVaultLoading(false)
      }
    } catch (error) {
      console.error('Failed to select vault:', error)
      setVaultLoading(false)
    }
  }
  
  // Add loading display in vault section
  {vaultLoading && <VaultIndexingLoader progress={vaultIndexingProgress} />}
  ```
- **VALIDATE**: `npx tsc --noEmit src/renderer/components/SettingsPage.tsx`
- **PATTERN**: Follow VaultSelector loading pattern
- **IMPORTS**: Import VaultIndexingLoader and useState for loading state
- **GOTCHA**: Update handleSelectVault to show loading during entire process
- **VALIDATE**: `npx tsc --noEmit src/renderer/components/SettingsPage.tsx`

---

## TESTING STRATEGY

### Unit Tests

Test vault indexing status tracking and progress events in isolation:

**VaultManager Progress Emission:**
```typescript
// Test progress events are emitted at correct stages
describe('VaultManager progress tracking', () => {
  it('should emit scanning progress when starting vault scan', async () => {
    const progressEvents: VaultIndexingProgress[] = []
    
    // Mock webContents.send to capture events
    const mockSend = jest.fn((channel, data) => {
      if (channel === 'vault:indexing-progress') {
        progressEvents.push(data)
      }
    })
    
    // Test that scanning stage is emitted first
    expect(progressEvents[0]).toEqual({
      stage: 'scanning',
      current: 0,
      total: 0
    })
  })
})
```

**IPC Handler Responses:**
```typescript
// Test indexing status handler returns correct state
describe('Vault indexing IPC handlers', () => {
  it('should return correct indexing status', async () => {
    const status = await ipcMain.handle('vault:getIndexingStatus')
    expect(status).toHaveProperty('isIndexing')
    expect(typeof status.isIndexing).toBe('boolean')
  })
})
```

**VaultIndexingLoader Component:**
```typescript
// Test component renders different states correctly
describe('VaultIndexingLoader', () => {
  it('should show scanning message during scanning stage', () => {
    const progress = { stage: 'scanning', current: 0, total: 100 }
    render(<VaultIndexingLoader progress={progress} />)
    expect(screen.getByText('Scanning vault files...')).toBeInTheDocument()
  })
  
  it('should show progress bar during indexing', () => {
    const progress = { stage: 'indexing', current: 50, total: 100 }
    render(<VaultIndexingLoader progress={progress} />)
    expect(screen.getByRole('progressbar')).toHaveStyle('width: 50%')
  })
})
```

### Integration Tests

Test complete vault connection flows with loading states:

**App Startup with Existing Vault:**
```typescript
describe('App startup vault loading', () => {
  it('should show loading state during vault indexing on startup', async () => {
    // Mock existing vault path
    mockElectronAPI.getVaultPath.mockResolvedValue('/test/vault')
    mockElectronAPI.getVaultIndexingStatus.mockResolvedValue({ isIndexing: true })
    
    render(<App />)
    
    // Should show loading state initially
    expect(screen.getByTestId('vault-indexing-loader')).toBeInTheDocument()
    
    // Simulate progress completion
    act(() => {
      mockProgressCallback({ stage: 'complete', current: 100, total: 100 })
    })
    
    // Loading should disappear
    await waitFor(() => {
      expect(screen.queryByTestId('vault-indexing-loader')).not.toBeInTheDocument()
    })
  })
})
```

**VaultSelector Connection Flow:**
```typescript
describe('VaultSelector vault connection', () => {
  it('should show progress during vault selection and indexing', async () => {
    render(<VaultSelector onVaultSelected={jest.fn()} />)
    
    const selectButton = screen.getByText('Select Vault')
    fireEvent.click(selectButton)
    
    // Should show loading immediately
    expect(screen.getByTestId('vault-indexing-loader')).toBeInTheDocument()
    
    // Simulate indexing progress
    act(() => {
      mockProgressCallback({ stage: 'indexing', current: 25, total: 100 })
    })
    
    expect(screen.getByText('Indexing files... (25/100)')).toBeInTheDocument()
  })
})
```

### Edge Cases

**Vault Indexing Fails Midway:**
```typescript
it('should handle indexing failure gracefully', async () => {
  render(<VaultSelector onVaultSelected={jest.fn()} />)
  
  // Start vault selection
  fireEvent.click(screen.getByText('Select Vault'))
  
  // Simulate indexing error
  act(() => {
    mockProgressCallback({ 
      stage: 'error', 
      current: 0, 
      total: 0, 
      error: 'Failed to read file permissions' 
    })
  })
  
  // Should show error message
  expect(screen.getByText('Error: Failed to read file permissions')).toBeInTheDocument()
  
  // Loading should stop
  expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
})
```

**User Disconnects Vault During Indexing:**
```typescript
it('should handle vault disconnection during indexing', async () => {
  // Start indexing
  mockElectronAPI.getVaultIndexingStatus.mockResolvedValue({ isIndexing: true })
  
  render(<App />)
  
  // Simulate vault disconnection
  act(() => {
    mockProgressCallback({ stage: 'error', current: 0, total: 0, error: 'Vault path no longer exists' })
  })
  
  // Should clear vault state and stop loading
  await waitFor(() => {
    expect(screen.queryByTestId('vault-indexing-loader')).not.toBeInTheDocument()
  })
})
```

**Multiple Vault Connections Attempted:**
```typescript
it('should prevent multiple simultaneous vault connections', async () => {
  render(<VaultSelector onVaultSelected={jest.fn()} />)
  
  const selectButton = screen.getByText('Select Vault')
  
  // First click starts loading
  fireEvent.click(selectButton)
  expect(screen.getByTestId('vault-indexing-loader')).toBeInTheDocument()
  
  // Second click should be disabled/ignored
  fireEvent.click(selectButton)
  expect(mockElectronAPI.selectVault).toHaveBeenCalledTimes(1)
})
```

**App Restart During Vault Indexing:**
```typescript
it('should resume indexing status check on app restart', async () => {
  // Mock app restart with indexing in progress
  mockElectronAPI.getVaultIndexingStatus.mockResolvedValue({ 
    isIndexing: true,
    progress: { stage: 'indexing', current: 50, total: 100 }
  })
  
  render(<App />)
  
  // Should immediately show indexing state
  expect(screen.getByTestId('vault-indexing-loader')).toBeInTheDocument()
  expect(screen.getByText('Indexing files... (50/100)')).toBeInTheDocument()
})
```

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
npm test -- --testPathPattern="vault"
npm test -- --testPathPattern="loading"
```

### Level 3: Integration Tests

```bash
npm run test:e2e-stable
```

### Level 4: Manual Validation

**Test Vault Connection from VaultSelector:**
1. Start app without existing vault: `npm run dev`
2. Navigate to vault selection screen
3. Click "Select Vault" and choose a test vault with 50+ markdown files
4. **Expected**: Loading spinner appears immediately
5. **Expected**: Progress text shows "Scanning vault files..." first
6. **Expected**: Progress text changes to "Indexing files... (X/Y)" with progress bar
7. **Expected**: Progress bar fills from 0% to 100%
8. **Expected**: Loading disappears when complete
9. **Expected**: Correct file count appears in UI
10. **Validation Command**: Check browser console for no errors

**Test Vault Connection from SettingsPage:**
1. Navigate to Settings page: Click gear icon
2. Scroll to "Obsidian Vault" section
3. Click "Select Vault" button and choose test vault
4. **Expected**: VaultIndexingLoader appears in settings section
5. **Expected**: Progress updates show in real-time
6. **Expected**: Settings page updates with vault info after completion
7. **Validation Command**: `window.electronAPI.getVaultPath()` in console should return correct path

**Test App Startup with Existing Vault:**
1. Connect vault using above steps and close app
2. Restart app: `npm run dev`
3. **Expected**: Loading state appears during app initialization
4. **Expected**: Main page shows correct file count after loading
5. **Expected**: No "0 indexed files" message appears
6. **Validation Command**: Check main process logs for vault loading messages

**Test Error Handling:**
1. Start vault connection process
2. Quickly disconnect external drive or change vault permissions
3. **Expected**: Error message appears in loading component
4. **Expected**: Loading state stops gracefully
5. **Expected**: User can retry vault connection
6. **Validation Command**: Check error logs in browser console

**Test Progress Event Cleanup:**
1. Start vault connection
2. Navigate away from page before completion
3. Navigate back to page
4. **Expected**: No duplicate event listeners
5. **Expected**: Progress updates work correctly
6. **Validation Command**: Check for memory leaks in browser dev tools

### Level 5: Cross-Platform Validation

**macOS Specific Tests:**
```bash
# Test with typical macOS vault path
mkdir -p ~/Documents/TestVault
echo "# Test Note" > ~/Documents/TestVault/test.md
# Connect vault and verify loading works

# Test with iCloud Drive vault
mkdir -p ~/Library/Mobile\ Documents/iCloud~md~obsidian/Documents/TestVault
# Test loading with cloud-synced vault
```

**Windows Specific Tests (via WSL):**
```bash
# Test with Windows-style paths
mkdir -p /mnt/c/Users/$USER/Documents/TestVault
echo "# Test Note" > /mnt/c/Users/$USER/Documents/TestVault/test.md
# Verify cross-platform path handling works

# Test with OneDrive vault
mkdir -p /mnt/c/Users/$USER/OneDrive/TestVault
# Test loading with cloud-synced vault
```

**Performance Validation:**
```bash
# Create large test vault
mkdir -p TestVault
for i in {1..1000}; do
  echo "# Note $i" > TestVault/note_$i.md
  echo "Content for note $i with some text to index" >> TestVault/note_$i.md
done

# Test indexing performance
# Expected: Progress updates every 10 files
# Expected: Total indexing time < 30 seconds for 1000 files
# Expected: UI remains responsive during indexing
```

---

## ACCEPTANCE CRITERIA

- [ ] Vault connection no longer shows "0 indexed files" immediately
- [ ] Loading states appear during vault indexing process
- [ ] Progress feedback shows indexing is in progress
- [ ] Correct file count appears after indexing completes
- [ ] Loading states work in both VaultSelector and SettingsPage
- [ ] App startup with existing vault shows proper loading
- [ ] All validation commands pass with zero errors
- [ ] Loading components follow existing Tailwind design patterns
- [ ] Cross-platform compatibility maintained
- [ ] No regressions in existing vault functionality

---

## COMPLETION CHECKLIST

- [ ] All tasks completed in order
- [ ] Each task validation passed immediately
- [ ] All validation commands executed successfully
- [ ] Full test suite passes (unit + integration)
- [ ] No linting or type checking errors
- [ ] Manual testing confirms loading states work
- [ ] Cross-platform testing completed
- [ ] Acceptance criteria all met
- [ ] Code reviewed for quality and maintainability

---

## NOTES

**Key Design Decisions:**
- Reuse existing LoadingScreen patterns for consistency
- Emit progress events at key milestones rather than continuous updates
- Maintain backward compatibility with existing vault connection flows
- Use existing Tailwind design system for loading components

**Performance Considerations:**
- Progress events should not impact vault indexing performance (< 1ms overhead per event)
- Event listeners must be properly cleaned up to prevent memory leaks
- Loading states should be responsive and not block UI interactions
- Progress updates should be batched (every 10 files) to avoid excessive re-renders

**Cross-Platform Considerations:**
- File path handling already works cross-platform in existing code
- Loading animations use CSS and should work consistently
- No platform-specific loading logic needed
- Progress events use standard Electron IPC which works on all platforms

**Error Handling Patterns:**
```typescript
// In VaultManager.scanVault() - emit error progress
catch (error) {
  const webContents = BrowserWindow.getFocusedWindow()?.webContents
  webContents?.send('vault:indexing-progress', {
    stage: 'error',
    current: 0,
    total: 0,
    error: error instanceof Error ? error.message : 'Unknown error'
  })
  throw error
}

// In React components - handle error progress
useEffect(() => {
  const cleanup = window.electronAPI.onVaultIndexingProgress((progress) => {
    if (progress.stage === 'error') {
      setError(progress.error || 'Vault indexing failed')
      setLoading(false)
    }
  })
  return cleanup
}, [])
```

**Memory Management:**
- Event listeners must be cleaned up in useEffect return functions
- Progress events should be throttled (every 10 files) to prevent UI flooding
- VaultIndexingProgress objects should be lightweight (no large file contents)
- Use mounted flags to prevent state updates after component unmount
