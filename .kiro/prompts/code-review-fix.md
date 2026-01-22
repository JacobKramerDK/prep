---
description: Process to fix bugs found in manual/AI code review
---

I ran/performed a code review and found these issues:

Code-review (file or description of issues): $1

Please fix these issues one by one. If the Code-review is a file read the entire file first to understand all of the issue(s) presented there.

Scope: Disregard Low issues unless it is a very simple fix. Any other issues should be adressed.

For each fix:
1. Explain what was wrong
2. Show the fix
3. Create and run relevant tests to verify. Use the stable test suite for reliable validation:
   - For helper utilities: `npm run test:helpers`
   - For e2e functionality: `npm run test:e2e:stable`
   - For specific test patterns: `npm run test:e2e:stable -- --grep "pattern"`
   - Use Playwright MCP when available for advanced test scenarios

After all fixes, run the validation commands:
1. `npm run build` - Verify syntax and compilation
2. `npm run test:helpers` - Test helper utilities
3. `npm run test:e2e:stable` - Run stable e2e tests
4. Avoid running `npm test` (legacy unit tests) unless specifically needed

This ensures fixes are validated with reliable, non-flaky tests that don't interfere with production settings.