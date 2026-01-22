# Feature: Improve Testing Setup - Fix Flaky E2E Tests and API Key Issues

The following plan should be complete, but its important that you validate documentation and codebase patterns and task sanity before you start implementing.

Pay special attention to naming of existing utils types and models. Import from the right files etc.

## Feature Description

Improve the testing infrastructure to eliminate flaky e2e tests and prevent tests from modifying stored API keys and LLM model configurations. Maintain Playwright MCP integration while ensuring reliable, isolated test execution.

## User Story

As a developer
I want reliable, non-flaky e2e tests that don't interfere with production settings
So that I can confidently run tests without worrying about API key corruption or test failures

## Problem Statement

The current e2e test suite has several critical issues:
1. **Flaky Tests**: Tests fail intermittently due to timing issues, shared state, and external dependencies
2. **API Key Corruption**: Tests modify and clear stored API keys, affecting development workflow
3. **Model Configuration Issues**: Tests change LLM model settings that persist across runs
4. **Poor Test Isolation**: Shared Electron app instances cause state pollution between tests
5. **External Dependencies**: Tests depend on actual calendar APIs and network access

## Solution Statement

Implement a robust testing architecture with proper test isolation, mocked external dependencies, and environment-specific configuration that prevents production setting contamination while maintaining Playwright MCP integration.

## Feature Metadata

**Feature Type**: Refactor
**Estimated Complexity**: High
**Primary Systems Affected**: Testing infrastructure, Settings management, E2E test suite
**Dependencies**: Playwright, electron-store, Playwright MCP server

## Risk Mitigation Strategies

**Critical Risk Factors Identified:**
1. **Global Service Singletons**: Main process services persist across tests
2. **IPC Handler Conflicts**: Handlers accumulate without cleanup
3. **electron-store Persistence**: Test data contaminates file system
4. **Async Service Dependencies**: Complex initialization/teardown timing

**Mitigation Approach:**
- Service factory pattern instead of global singletons
- IPC handler cleanup with channel tracking
- Test-scoped store instances with automatic cleanup
- Robust async service disposal with dependency ordering

---

## CONTEXT REFERENCES

### Relevant Codebase Files IMPORTANT: YOU MUST READ THESE FILES BEFORE IMPLEMENTING!

- `playwright.config.ts` - Current Playwright configuration with timing and retry settings
- `tests/e2e/settings-api-key-management.spec.ts` - Example of problematic API key test patterns
- `tests/e2e/brief-generation.spec.ts` - Example of flaky test with hardcoded timeouts
- `src/main/settings-manager.ts` - Settings persistence architecture with test isolation
- `src/main/index.ts` - Main process IPC handlers that affect global state
- `.kiro/settings/mcp.json` - Playwright MCP server configuration
- `tests/setup.ts` - Current test setup configuration

### New Files to Create

- `tests/helpers/test-app-factory.ts` - Isolated Electron app factory for tests
- `tests/helpers/mock-settings-manager.ts` - Mock settings manager for test isolation
- `tests/helpers/test-data-factory.ts` - Test data generation utilities
- `tests/helpers/playwright-mcp-helper.ts` - Playwright MCP integration utilities
- `tests/config/test-environment.ts` - Test environment configuration
- `tests/e2e-stable/` - New directory for stable, non-flaky tests
- `jest.config.e2e.js` - Separate Jest config for e2e test utilities

### Relevant Documentation YOU SHOULD READ THESE BEFORE IMPLEMENTING!

- [Playwright Test Isolation](https://playwright.dev/docs/test-isolation)
  - Specific section: Test fixtures and beforeEach patterns
  - Why: Required for proper test isolation without shared state
- [Electron Testing Best Practices](https://www.electronjs.org/docs/latest/tutorial/automated-testing)
  - Specific section: Testing with Playwright
  - Why: Shows proper Electron app lifecycle management in tests
- [Playwright MCP Documentation](https://github.com/microsoft/playwright/tree/main/packages/playwright-mcp)
  - Specific section: MCP server integration patterns
  - Why: Required for maintaining MCP functionality in tests

### Patterns to Follow

**Test Isolation Pattern:**
```typescript
// Each test gets fresh app instance
test.beforeEach(async () => {
  electronApp = await createTestApp({
    testId: test.info().testId,
    mockSettings: true
  })
})
```

**Settings Mocking Pattern:**
```typescript
// Mock settings to prevent production contamination
const mockSettings = {
  openaiApiKey: 'test-key-' + Date.now(),
  openaiModel: 'gpt-4o-mini'
}
```

**Async Waiting Pattern:**
```typescript
// Replace fixed timeouts with proper waiting
await page.waitForSelector('[data-testid="api-validation-result"]')
await page.waitForFunction(() => !document.querySelector('[data-testid="loading"]'))
```

**Data Test ID Pattern:**
```typescript
// Use data-testid instead of text selectors
await page.click('[data-testid="settings-button"]')
await expect(page.locator('[data-testid="api-key-input"]')).toBeVisible()
```

---

## IMPLEMENTATION PLAN

### Phase 1: Test Infrastructure Foundation

**Tasks:**
- Create test app factory with proper isolation
- Implement mock settings manager for test environments
- Set up test data factories for consistent state
- Configure separate test environment variables

### Phase 2: Test Isolation Implementation

**Tasks:**
- Refactor existing tests to use isolated app instances
- Replace shared beforeAll with individual beforeEach
- Implement proper cleanup in afterEach hooks
- Add test-specific temporary directories

### Phase 3: Mock External Dependencies

**Tasks:**
- Mock OpenAI API calls in test environment
- Mock calendar API interactions
- Mock file system operations for vault integration
- Implement network request interception

### Phase 4: Stable Test Suite Creation

**Tasks:**
- Identify and migrate stable tests to new structure
- Remove or fix flaky tests with timing dependencies
- Add proper data-testid attributes to components
- Implement Playwright MCP integration helpers

---

## STEP-BY-STEP TASKS

IMPORTANT: Execute every task in order, top to bottom. Each task is atomic and independently testable.

### CREATE tests/helpers/test-app-factory.ts

- **IMPLEMENT**: Isolated Electron app factory with test-specific configuration
- **PATTERN**: Environment-specific store names from `src/main/settings-manager.ts:15-25`
- **IMPORTS**: `import { _electron as electron } from 'playwright'`, `import { randomUUID } from 'crypto'`
- **GOTCHA**: Must set NODE_ENV=test and unique store names per test
- **RISK MITIGATION**: Include IPC handler cleanup and service disposal
- **VALIDATE**: `npm run build:main && node -e "console.log(require('./dist/tests/helpers/test-app-factory.js'))"`

### CREATE tests/helpers/main-process-isolator.ts

- **IMPLEMENT**: Main process isolation utility for proper test cleanup
- **PATTERN**: IPC handler registration from `src/main/index.ts:50-100`
- **IMPORTS**: `import { ipcMain } from 'electron'`, `import { randomUUID } from 'crypto'`
- **GOTCHA**: Must track and cleanup all IPC handlers to prevent conflicts
- **RISK MITIGATION**: Handles global service singleton cleanup
- **VALIDATE**: `npm run test -- --testPathPattern=main-process-isolator`

### CREATE tests/helpers/mock-settings-manager.ts

- **IMPLEMENT**: Mock settings manager that doesn't persist to disk
- **PATTERN**: SettingsManager interface from `src/main/settings-manager.ts:20-50`
- **IMPORTS**: `import { SettingsManager } from '../../src/main/settings-manager'`
- **GOTCHA**: Must implement all IPC handlers without actual persistence
- **RISK MITIGATION**: Include service reinitialization edge case handling
- **VALIDATE**: `npm run test -- --testPathPattern=mock-settings-manager`

### CREATE tests/helpers/robust-wait-patterns.ts

- **IMPLEMENT**: Reliable waiting utilities to replace fixed timeouts
- **PATTERN**: Async waiting from existing test files
- **IMPORTS**: `import { Page } from '@playwright/test'`
- **GOTCHA**: Must handle both DOM ready state and IPC API availability
- **RISK MITIGATION**: Eliminates timing-based test flakiness
- **VALIDATE**: `npm run test -- --testPathPattern=robust-wait-patterns`

### CREATE tests/helpers/test-data-factory.ts

- **IMPLEMENT**: Factory functions for consistent test data generation
- **PATTERN**: Settings structure from `src/main/settings-manager.ts:60-80`
- **IMPORTS**: `import { randomUUID } from 'crypto'`
- **GOTCHA**: API keys must follow sk-* format for validation
- **VALIDATE**: `npm run test -- --testPathPattern=test-data-factory`

### CREATE tests/helpers/playwright-mcp-helper.ts

- **IMPLEMENT**: Playwright MCP server integration utilities
- **PATTERN**: MCP configuration from `.kiro/settings/mcp.json`
- **IMPORTS**: `import { test, expect } from '@playwright/test'`
- **GOTCHA**: MCP server must be started before tests and cleaned up after
- **VALIDATE**: `npx playwright test --grep "mcp-helper"`

### CREATE tests/config/test-environment.ts

- **IMPLEMENT**: Test environment configuration and constants
- **PATTERN**: Environment detection from `src/main/settings-manager.ts:10-15`
- **IMPORTS**: `import { tmpdir } from 'os'`, `import { join } from 'path'`
- **GOTCHA**: Must ensure test isolation without affecting production
- **VALIDATE**: `node -e "console.log(require('./dist/tests/config/test-environment.js'))"`

### UPDATE playwright.config.ts

- **IMPLEMENT**: Enhanced configuration with test isolation and MCP integration
- **PATTERN**: Current config structure from `playwright.config.ts:1-25`
- **IMPORTS**: `import { defineConfig, devices } from '@playwright/test'`
- **GOTCHA**: Must maintain CI/local environment differences
- **VALIDATE**: `npx playwright test --list`

### CREATE tests/e2e-stable/settings-management.spec.ts

- **IMPLEMENT**: Stable settings test using new isolation patterns
- **PATTERN**: Test structure from `tests/e2e/settings-api-key-management.spec.ts:1-50`
- **IMPORTS**: `import { test, expect } from '@playwright/test'`, `import { createTestApp } from '../helpers/test-app-factory'`
- **GOTCHA**: Must use data-testid selectors instead of text-based
- **VALIDATE**: `npx playwright test tests/e2e-stable/settings-management.spec.ts`

### CREATE tests/e2e-stable/brief-generation.spec.ts

- **IMPLEMENT**: Stable brief generation test with mocked API calls
- **PATTERN**: Test structure from `tests/e2e/brief-generation.spec.ts:1-30`
- **IMPORTS**: `import { test, expect } from '@playwright/test'`, `import { mockOpenAIService } from '../helpers/mock-settings-manager'`
- **GOTCHA**: Must mock OpenAI API to prevent network dependencies
- **VALIDATE**: `npx playwright test tests/e2e-stable/brief-generation.spec.ts`

### CREATE tests/e2e-stable/app-lifecycle.spec.ts

- **IMPLEMENT**: Basic app lifecycle tests without external dependencies
- **PATTERN**: App launch pattern from `tests/e2e/app.spec.ts:1-20`
- **IMPORTS**: `import { test, expect } from '@playwright/test'`, `import { createTestApp } from '../helpers/test-app-factory'`
- **GOTCHA**: Must test app startup without calendar or API dependencies
- **VALIDATE**: `npx playwright test tests/e2e-stable/app-lifecycle.spec.ts`

### UPDATE src/renderer/components/Settings/AIConfiguration.tsx

- **IMPLEMENT**: Add data-testid attributes for reliable test selectors
- **PATTERN**: Component structure from existing Settings components
- **IMPORTS**: Existing imports from component
- **GOTCHA**: Must not break existing functionality while adding test attributes
- **VALIDATE**: `npm run build:renderer && npm run test:e2e -- --grep "settings"`

### UPDATE src/renderer/components/BriefGenerator.tsx

- **IMPLEMENT**: Add data-testid attributes and loading state indicators
- **PATTERN**: Component structure from existing BriefGenerator
- **IMPORTS**: Existing imports from component
- **GOTCHA**: Must maintain existing UI/UX while adding test hooks
- **VALIDATE**: `npm run build:renderer && npm run test:e2e -- --grep "brief"`

### CREATE tests/e2e-stable/playwright-mcp-integration.spec.ts

- **IMPLEMENT**: Test Playwright MCP server integration
- **PATTERN**: MCP usage patterns from `.kiro/settings/mcp.json`
- **IMPORTS**: `import { test, expect } from '@playwright/test'`, `import { PlaywrightMCPHelper } from '../helpers/playwright-mcp-helper'`
- **GOTCHA**: MCP server must be available and responsive during tests
- **VALIDATE**: `npx playwright test tests/e2e-stable/playwright-mcp-integration.spec.ts`

### UPDATE package.json

- **IMPLEMENT**: Add new test scripts for stable test suite
- **PATTERN**: Existing scripts structure from `package.json:6-20`
- **IMPORTS**: N/A
- **GOTCHA**: Must maintain existing script functionality
- **VALIDATE**: `npm run test:e2e:stable`

### CREATE .github/workflows/test-stable.yml

- **IMPLEMENT**: CI workflow for stable test suite only
- **PATTERN**: Standard GitHub Actions workflow for Node.js/Electron
- **IMPORTS**: N/A
- **GOTCHA**: Must handle Electron app dependencies in CI environment
- **VALIDATE**: `git push` and check GitHub Actions

---

## TESTING STRATEGY

### Unit Tests

**Mock Settings Manager Tests:**
- Test mock implementation matches real interface
- Verify no disk persistence occurs
- Test data isolation between test runs

**Test Data Factory Tests:**
- Validate generated test data formats
- Test unique data generation per test
- Verify API key format compliance

### Integration Tests

**Test App Factory Integration:**
- Test isolated app instance creation
- Verify proper cleanup after tests
- Test environment variable isolation

**Playwright MCP Integration:**
- Test MCP server lifecycle management
- Verify MCP commands work in test environment
- Test MCP server cleanup

### Stable E2E Tests

**Settings Management:**
- Test UI interactions without API key persistence
- Verify model selection without global state changes
- Test validation UI without network calls

**Brief Generation:**
- Test form interactions with mocked API
- Verify loading states and error handling
- Test UI responsiveness without external dependencies

**App Lifecycle:**
- Test app startup and shutdown
- Verify window management
- Test basic navigation without external services

---

## VALIDATION COMMANDS

Execute every command to ensure zero regressions and 100% feature correctness.

### Level 1: Syntax & Style

```bash
npm run build
npm run build:main
npm run build:renderer
```

### Level 2: Unit Tests

```bash
npm run test
npm run test:coverage
```

### Level 3: Stable E2E Tests

```bash
npm run test:e2e:stable
npx playwright test tests/e2e-stable/
```

### Level 4: Manual Validation

```bash
# Test app launches without affecting production settings
npm run dev
# Verify settings page doesn't modify actual API keys
# Test brief generation with mock data
```

### Level 5: Risk Validation Commands

```bash
# Test IPC handler cleanup
npm run test -- --testPathPattern="ipc.*cleanup"
# Test service isolation
npm run test -- --testPathPattern="service.*isolation"
# Test store cleanup
npm run test -- --testPathPattern="store.*cleanup"
# Test concurrent app instances
npm run test:e2e:stable -- --workers=4
# Test CI environment compatibility
NODE_ENV=ci npm run test:e2e:stable
```

---

## ACCEPTANCE CRITERIA

- [ ] All stable e2e tests pass consistently (0% flake rate)
- [ ] Tests never modify production API keys or model settings
- [ ] Each test runs in complete isolation with fresh app instance
- [ ] External dependencies (OpenAI, Calendar APIs) are properly mocked
- [ ] Playwright MCP integration works in test environment
- [ ] Test execution time reduced by 50% through better isolation
- [ ] CI pipeline runs stable tests only, skipping flaky ones
- [ ] Test data factories provide consistent, valid test data
- [ ] All UI components have data-testid attributes for reliable selection
- [ ] Test cleanup prevents any state leakage between runs

---

## COMPLETION CHECKLIST

- [ ] Test app factory creates isolated instances
- [ ] Mock settings manager prevents disk persistence
- [ ] Test data factory generates valid, unique data
- [ ] Playwright MCP helper manages server lifecycle
- [ ] Stable test suite passes with 0% flake rate
- [ ] UI components have proper test attributes
- [ ] External dependencies are mocked
- [ ] CI workflow runs stable tests only
- [ ] Documentation updated for new test patterns
- [ ] All validation commands pass

---

## NOTES

**Key Design Decisions:**
- **Test Isolation**: Each test gets fresh Electron app instance to prevent state pollution
- **Settings Mocking**: Mock settings manager prevents production API key corruption
- **External Mocking**: Mock all external APIs to eliminate network dependencies
- **Stable Test Suite**: Separate directory for reliable tests, leaving flaky ones for future improvement
- **MCP Integration**: Maintain Playwright MCP functionality while ensuring test isolation

**Performance Considerations:**
- Fresh app instances per test may increase execution time but ensure reliability
- Mock implementations should be lightweight to maintain test speed
- Test data factories should generate minimal required data

**Security Considerations:**
- Test API keys must never be real production keys
- Test environment must be completely isolated from production settings
- Mock implementations must not expose sensitive data patterns

## Confidence Score Enhancement

**Updated Confidence Score: 9.5/10**

**Risk Mitigation Improvements Added:**
1. **Main Process Isolator**: Handles global service singleton cleanup and IPC handler conflicts
2. **Robust Wait Patterns**: Eliminates timing-based flakiness with proper async waiting
3. **Service Factory Pattern**: Prevents global state leakage between tests
4. **Comprehensive Risk Validation**: Specific commands to test isolation edge cases
5. **CI Environment Compatibility**: Platform-specific handling and timeout adjustments

**Remaining 0.5 Risk**: Potential platform-specific edge cases in CI environments, mitigated by comprehensive validation commands.
