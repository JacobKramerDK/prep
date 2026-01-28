---
description: Execute an implementation plan
argument-hint: [path-to-plan]
---

# Execute: Implement from Plan

## Plan to Execute

Read plan file: `$ARGUMENTS`

## Execution Instructions

### 1. Read and Understand

- Read the ENTIRE plan carefully
- Understand all tasks and their dependencies
- Note the validation commands to run
- Review the testing strategy

### 2. Execute Tasks in Order

For EACH task in "Step by Step Tasks":

#### a. Navigate to the task
- Identify the file and action required
- Read existing related files if modifying

#### b. Implement the task
- Follow the detailed specifications exactly
- Maintain consistency with existing code patterns using Context7 MCP for best practices
- Use existing design system with Tailwind v4 classes and patterns
- Include proper type hints and documentation
- Add structured logging using `src/renderer/utils/debug.ts` for renderer or `Debug` class for main process
- Ensure cross-platform compatibility (Windows and macOS)

#### c. Verify as you go
- After each file change, check syntax
- Ensure imports are correct
- Verify types are properly defined

### 3. Implement Testing Strategy

After completing implementation tasks:

- Create all test files specified in the plan
- Implement all test cases mentioned
- Follow the testing approach outlined
- Ensure tests cover edge cases

### 4. Run Validation Commands

Execute ALL validation commands from the plan in order. Use the stable test suite for reliable validation:

```bash
# Level 1: Syntax & Build Verification
npm run build

# Level 2: Helper Utilities Testing
npm run test:helpers

# Level 3: Stable E2E Testing
npm run test:e2e:stable

# Level 4: Cross-Platform Build Testing
npm run package  # Test packaging for both Windows and macOS

# Level 5: Specific Feature Testing (if applicable)
npm run test:e2e:stable -- --grep "feature-pattern"

# Run any additional commands specified in the plan
```

**Important**: Use the stable test suite (`test:e2e:stable`) instead of legacy tests (`npm test`) to avoid flaky tests and production setting interference.

If any command fails:
- Fix the issue
- Re-run the command
- Continue only when it passes

### 5. Final Verification

Before completing:

- ✅ All tasks from plan completed
- ✅ All tests created and passing
- ✅ All validation commands pass
- ✅ Code follows project conventions
- ✅ Documentation added/updated as needed

## Output Report

Provide summary:

### Completed Tasks
- List of all tasks completed
- Files created (with paths)
- Files modified (with paths)

### Tests Added
- Test files created
- Test cases implemented
- Test results

### Validation Results
```bash
# Output from each validation command
```

### Ready for Commit
- Confirm all changes are complete
- Confirm all validations pass
- Ready for `/commit` command

## Notes

- Use Context7 MCP to query best practices for code patterns and implementation approaches
- Follow existing Tailwind v4 design system patterns from the codebase
- Use proper debug logging: `debugLog('PREFIX', 'message', data)` in renderer, `Debug.log()` in main process
- Ensure all features work on both Windows and macOS platforms
- If you encounter issues not addressed in the plan, document them
- If you need to deviate from the plan, explain why
- If tests fail, fix implementation until they pass
- Don't skip validation steps