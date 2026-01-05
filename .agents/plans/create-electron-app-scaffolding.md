# Feature: Create Electron App Scaffolding

The following plan should be complete, but its important that you validate documentation and codebase patterns and task sanity before you start implementing.

Pay special attention to naming of existing utils types and models. Import from the right files etc.

## Feature Description

Create the foundational scaffolding for the Prep desktop application using Electron with TypeScript and React. This includes setting up the main process, renderer process, build configuration, development workflow, and basic Playwright e2e testing to ensure the application can start successfully and pass automated tests.

## User Story

As a developer working on the Prep meeting assistant
I want a properly scaffolded Electron application with TypeScript and React
So that I can build desktop features with modern tooling, type safety, and automated testing

## Problem Statement

The project currently has no application code structure. We need to establish the foundational Electron application architecture with proper TypeScript configuration, React frontend, build processes, and testing infrastructure before implementing any meeting preparation features.

## Solution Statement

Create a modern Electron application scaffold using Vite for the renderer process, TypeScript 5.0+ with project references, React 19, electron-builder for packaging, and Playwright for e2e testing. The scaffold will follow 2026 best practices for security (contextIsolation, no nodeIntegration), performance, and developer experience.

## Feature Metadata

**Feature Type**: New Capability
**Estimated Complexity**: Medium
**Primary Systems Affected**: Entire application foundation
**Dependencies**: Electron, TypeScript, React 19, Vite, electron-builder, Playwright

---

## CONTEXT REFERENCES

### Relevant Codebase Files IMPORTANT: YOU MUST READ THESE FILES BEFORE IMPLEMENTING!

- `.kiro/steering/tech.md` - Why: Contains technology stack decisions and architecture overview
- `.kiro/steering/structure.md` - Why: Defines project directory structure and file naming conventions
- `.kiro/steering/product.md` - Why: Provides product context for application requirements

### New Files to Create

- `package.json` - Project dependencies and scripts
- `tsconfig.json` - Root TypeScript configuration
- `tsconfig.main.json` - Main process TypeScript configuration  
- `tsconfig.renderer.json` - Renderer process TypeScript configuration
- `vite.config.ts` - Vite configuration for renderer build
- `electron-builder.yml` - Packaging configuration
- `src/main/index.ts` - Electron main process entry point
- `src/main/preload.ts` - Preload script for secure IPC
- `src/renderer/index.tsx` - React application entry point
- `src/renderer/App.tsx` - Main React component
- `src/renderer/index.html` - HTML template
- `src/shared/types/ipc.ts` - Shared IPC type definitions
- `playwright.config.ts` - Playwright test configuration
- `e2e-tests/app.spec.ts` - Basic e2e test
- `.gitignore` - Git ignore patterns
- `README.md` - Updated with setup instructions

### Relevant Documentation YOU SHOULD READ THESE BEFORE IMPLEMENTING!

- [Electron Security Best Practices](https://www.electronjs.org/docs/latest/tutorial/security)
  - Specific section: Context Isolation and Preload Scripts
  - Why: Required for secure IPC implementation
- [Vite Electron Integration](https://vitejs.dev/guide/backend-integration.html)
  - Specific section: Backend Integration
  - Why: Shows proper Vite configuration for Electron renderer
- [TypeScript Project References](https://www.typescriptlang.org/docs/handbook/project-references.html)
  - Specific section: Project References
  - Why: Enables proper multi-project TypeScript setup
- [Playwright Electron Testing](https://playwright.dev/docs/api/class-electron)
  - Specific section: Electron API
  - Why: Required for e2e test implementation

### Patterns to Follow

**Directory Structure Pattern:**
```
src/
├── main/          # Electron main process
├── renderer/      # React frontend  
└── shared/        # Shared types and utilities
```

**TypeScript Configuration Pattern:**
- Root tsconfig.json with project references
- Separate configs for main and renderer processes
- Strict mode enabled with explicit return types

**IPC Security Pattern:**
```typescript
// Preload script exposes safe API
contextBridge.exposeInMainWorld('electronAPI', {
  // Type-safe IPC methods
})
```

**Build Script Pattern:**
```json
{
  "dev": "concurrently \"npm run dev:renderer\" \"npm run dev:main\"",
  "build": "npm run build:renderer && npm run build:main"
}
```

**Minimal Main Process Template:**
```typescript
import { app, BrowserWindow } from 'electron'
import path from 'path'

const createWindow = () => {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  })
  
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173')
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(createWindow)
```

**Minimal React App Template:**
```typescript
import React from 'react'

const App: React.FC = () => {
  return (
    <div style={{ padding: '20px' }}>
      <h1>Prep - Meeting Assistant</h1>
      <p>Electron + React 19 + TypeScript</p>
    </div>
  )
}

export default App
```

---

## IMPLEMENTATION PLAN

### Phase 1: Foundation

Set up the basic project structure, package configuration, and TypeScript setup with proper project references for multi-process architecture.

**Tasks:**
- Initialize package.json with all required dependencies
- Configure TypeScript with project references for main/renderer separation
- Set up basic directory structure following steering document patterns

### Phase 2: Core Implementation

Implement the Electron main process, React renderer, and secure IPC communication layer with modern security practices.

**Tasks:**
- Create Electron main process with window management
- Implement secure preload script for IPC
- Set up React renderer with Vite build system
- Configure development and build workflows

### Phase 3: Integration

Connect the build system, configure electron-builder for packaging, and ensure proper development workflow with hot reload.

**Tasks:**
- Configure Vite for Electron renderer builds
- Set up electron-builder for cross-platform packaging
- Implement concurrent development scripts
- Add proper error handling and logging

### Phase 4: Testing & Validation

Set up Playwright e2e testing infrastructure and create basic tests to validate application startup and core functionality.

**Tasks:**
- Configure Playwright for Electron testing
- Create basic e2e test for application startup
- Add test scripts and validation commands
- Verify complete development workflow

---

## STEP-BY-STEP TASKS

IMPORTANT: Execute every task in order, top to bottom. Each task is atomic and independently testable.

### CREATE package.json

- **IMPLEMENT**: Complete package.json with exact dependency versions
- **PATTERN**: Follow Node.js package.json best practices with pinned versions
- **IMPORTS**: electron@^33.0.0, typescript@^5.6.0, react@^19.0.0, vite@^6.0.0, electron-builder@^25.0.0, @playwright/test@^1.52.0
- **GOTCHA**: Pin major versions to avoid breaking changes, use exact versions for stability
- **VALIDATE**: `npm install && npm ls --depth=0`

### CREATE tsconfig.json

- **IMPLEMENT**: Root TypeScript configuration with project references
- **PATTERN**: TypeScript project references for multi-project setup
- **IMPORTS**: References to main and renderer tsconfigs
- **GOTCHA**: Ensure composite: true for project references
- **VALIDATE**: `npx tsc --noEmit`

### CREATE tsconfig.main.json

- **IMPLEMENT**: Main process TypeScript configuration
- **PATTERN**: Node.js target with Electron types
- **IMPORTS**: @types/node, electron types
- **GOTCHA**: Target ES2022, module: CommonJS for main process
- **VALIDATE**: `npx tsc -p tsconfig.main.json --noEmit`

### CREATE tsconfig.renderer.json

- **IMPLEMENT**: Renderer process TypeScript configuration
- **PATTERN**: DOM target with React types
- **IMPORTS**: @types/react, @types/react-dom
- **GOTCHA**: Target ES2022, module: ESNext for Vite
- **VALIDATE**: `npx tsc -p tsconfig.renderer.json --noEmit`

### CREATE vite.config.ts

- **IMPLEMENT**: Vite configuration optimized for Electron renderer
- **PATTERN**: Vite Electron integration with proper base path
- **IMPORTS**: vite, @vitejs/plugin-react
- **GOTCHA**: Set base: './' for Electron file:// protocol
- **VALIDATE**: `npx vite build --config vite.config.ts`

### CREATE electron-builder.yml

- **IMPLEMENT**: Cross-platform packaging configuration
- **PATTERN**: electron-builder YAML configuration
- **IMPORTS**: None (configuration file)
- **GOTCHA**: Proper file patterns and security settings
- **VALIDATE**: `npx electron-builder --help`

### CREATE src/main/index.ts

- **IMPLEMENT**: Electron main process with secure window creation
- **PATTERN**: Modern Electron main process with security best practices
- **IMPORTS**: electron (app, BrowserWindow, ipcMain)
- **GOTCHA**: contextIsolation: true, nodeIntegration: false
- **VALIDATE**: `npm run build:main && node dist/main/index.js --version && echo "Main process builds successfully"`

### CHECKPOINT: Verify Main Process
- **VALIDATE**: `npm run build:main && node -e "console.log('Main process syntax valid')"`

### CREATE src/main/preload.ts

- **IMPLEMENT**: Secure preload script for IPC communication
- **PATTERN**: contextBridge API exposure pattern
- **IMPORTS**: electron (contextBridge, ipcRenderer)
- **GOTCHA**: Only expose safe, validated IPC methods
- **VALIDATE**: `npm run build:main`

### CREATE src/shared/types/ipc.ts

- **IMPLEMENT**: Shared TypeScript types for IPC communication
- **PATTERN**: Type-safe IPC interface definitions
- **IMPORTS**: None (type definitions only)
- **GOTCHA**: Keep interfaces simple and serializable
- **VALIDATE**: `npx tsc --noEmit`

### CREATE src/renderer/index.html

- **IMPLEMENT**: HTML template for React application
- **PATTERN**: Minimal HTML5 template with React root
- **IMPORTS**: None (HTML template)
- **GOTCHA**: Include proper meta tags and title
- **VALIDATE**: HTML validation (manual check)

### CREATE src/renderer/index.tsx

- **IMPLEMENT**: React application entry point with StrictMode
- **PATTERN**: React 19 createRoot pattern
- **IMPORTS**: react, react-dom/client
- **GOTCHA**: Use createRoot instead of deprecated render
- **VALIDATE**: `npm run build:renderer`

### CREATE src/renderer/App.tsx

- **IMPLEMENT**: Main React component with basic UI
- **PATTERN**: Functional component with TypeScript
- **IMPORTS**: react
- **GOTCHA**: Include basic styling and Electron API usage example
- **VALIDATE**: `npm run build:renderer`

### CREATE playwright.config.ts

- **IMPLEMENT**: Playwright configuration for Electron testing
- **PATTERN**: Playwright Electron experimental API setup
- **IMPORTS**: @playwright/test
- **GOTCHA**: Use experimental _electron import
- **VALIDATE**: `npx playwright install`

### CREATE e2e-tests/app.spec.ts

- **IMPLEMENT**: Basic e2e test for application startup with fallback strategy
- **PATTERN**: Playwright Electron test with app launch/close, fallback to simple spawn test
- **IMPORTS**: @playwright/test, _electron, child_process (fallback)
- **GOTCHA**: If Playwright fails, use simple process spawn to verify app starts
- **VALIDATE**: `npm run test:e2e` (includes both Playwright and fallback tests)

### CREATE .gitignore

- **IMPLEMENT**: Git ignore patterns for Node.js, Electron, and build artifacts
- **PATTERN**: Standard Node.js gitignore with Electron additions
- **IMPORTS**: None (configuration file)
- **GOTCHA**: Include dist/, node_modules/, and OS-specific files
- **VALIDATE**: `git status` (should show clean working directory)

### UPDATE README.md

- **IMPLEMENT**: Add development setup and build instructions
- **PATTERN**: Clear setup instructions with prerequisites
- **IMPORTS**: None (documentation)
- **GOTCHA**: Include all necessary commands and troubleshooting
- **VALIDATE**: Follow instructions manually to verify completeness

---

## TESTING STRATEGY

### Unit Tests

Not required for this scaffolding phase. Focus on e2e testing to validate the complete application startup workflow.

### Integration Tests

Basic Playwright e2e test that validates:
- Application launches successfully
- Main window is created and visible
- Basic IPC communication works
- Application closes cleanly

### Edge Cases

- Application startup with different command line arguments
- Window creation failure scenarios
- IPC communication errors
- Build process failures

---

## VALIDATION COMMANDS

Execute every command to ensure zero regressions and 100% feature correctness.

### Level 1: Syntax & Style

```bash
# TypeScript compilation check
npx tsc --noEmit

# Check all project references
npx tsc -p tsconfig.main.json --noEmit
npx tsc -p tsconfig.renderer.json --noEmit
```

### Level 2: Build Process

```bash
# Install dependencies
npm install

# Build renderer process
npm run build:renderer

# Build main process  
npm run build:main

# Full build
npm run build
```

### Level 3: Application Testing

```bash
# Start development mode (manual verification)
npm run dev

# Package application
npm run package

# Run e2e tests
npm run test:e2e
```

### Level 4: Manual Validation

- Launch application in development mode
- Verify main window opens with React content
- Check developer tools are accessible
- Confirm application closes properly
- Test packaged application launches

### Level 5: Additional Validation

```bash
# Check package vulnerabilities
npm audit

# Verify electron-builder configuration
npx electron-builder --help

# List installed packages
npm ls
```

---

## ACCEPTANCE CRITERIA

- [ ] Application launches successfully in development mode
- [ ] Main window displays React content with basic UI
- [ ] TypeScript compilation passes for all processes
- [ ] Vite build completes without errors
- [ ] electron-builder can package the application
- [ ] Playwright e2e test passes and validates startup
- [ ] Development workflow supports hot reload
- [ ] All validation commands execute successfully
- [ ] Project follows security best practices (contextIsolation, no nodeIntegration)
- [ ] Code follows TypeScript strict mode requirements
- [ ] Directory structure matches steering document specifications

---

## COMPLETION CHECKLIST

- [ ] All tasks completed in order
- [ ] Each task validation passed immediately
- [ ] All validation commands executed successfully
- [ ] Full test suite passes (e2e tests)
- [ ] No TypeScript compilation errors
- [ ] Manual testing confirms application works
- [ ] Acceptance criteria all met
- [ ] Code reviewed for quality and maintainability
- [ ] Documentation updated with setup instructions

---

## NOTES

### Design Decisions

- **Vite over Webpack**: Faster development builds and better developer experience
- **Project References**: Enables proper TypeScript separation between main/renderer
- **contextIsolation**: Security best practice, all IPC goes through preload script
- **Playwright over Spectron**: Spectron is deprecated, Playwright is the modern choice
- **React 19**: Latest stable version with improved Actions, new hooks, and better server components

### Security Considerations

- contextIsolation enabled for all windows
- nodeIntegration disabled in renderer
- All IPC communication through secure preload script
- No direct Node.js access from renderer process

### Performance Optimizations

- Vite for fast development builds
- TypeScript project references for incremental compilation
- Proper build output organization for efficient packaging

### Future Extensibility

- IPC type system ready for additional channels
- Modular main process structure for adding services
- React component structure ready for feature additions
- Testing infrastructure ready for expanded test coverage

## TROUBLESHOOTING

### Common Issues & Solutions

**Issue**: `npm install` fails with peer dependency warnings
**Solution**: Use `npm install --legacy-peer-deps` or update to compatible versions

**Issue**: TypeScript compilation fails with "Cannot find module"
**Solution**: Ensure all tsconfig.json files have correct paths and references

**Issue**: Vite dev server doesn't connect to Electron
**Solution**: Verify Vite dev server runs on port 5173 and main process loads correct URL

**Issue**: Playwright test fails with "Cannot launch Electron"
**Solution**: Ensure app is built first with `npm run build`, or use fallback spawn test

**Issue**: App window is blank in development
**Solution**: Check browser console for errors, verify React app is building correctly

**Issue**: IPC communication not working
**Solution**: Verify preload script is loaded and contextBridge is properly configured

### Validation Failures

If any validation command fails:
1. Check the specific error message
2. Verify all dependencies are installed
3. Ensure TypeScript compilation passes
4. Check file paths and imports
5. Refer to troubleshooting section above
