---
description: "Comprehensive troubleshooting with codebase analysis, root cause identification, and solution planning"
---

# Troubleshoot Issue

## Issue Description: $ARGUMENTS

## Mission

Transform an issue or problem into a **comprehensive root cause analysis** and **actionable solution plan** through systematic codebase investigation, deep reasoning, and strategic problem-solving.

**Core Principle**: We analyze first, understand deeply, then propose solutions. No quick fixes - we find the real root cause and provide multiple well-reasoned solution paths.

**Key Philosophy**: Context-driven debugging. Every issue exists within a system - we must understand the system, the intended behavior, and the failure mode to propose lasting solutions.

## Troubleshooting Process

### Phase 1: Issue Understanding & Context Gathering

**Deep Issue Analysis:**
- Extract the specific problem symptoms and error conditions
- Identify affected systems, components, and user workflows
- Determine issue type: Bug/Performance/Integration/Configuration/Design
- Assess severity: Critical/High/Medium/Low
- Map when the issue started occurring (if known)

**Gather Initial Context:**
- Collect error messages, logs, or failure descriptions
- Identify reproduction steps if available
- Note environmental factors (OS, browser, versions)
- Understand user impact and business consequences

**Clarify Ambiguities:**
- If the issue description is vague or incomplete, ask specific clarifying questions
- Request additional details about error conditions, reproduction steps, or expected behavior
- Get specific examples of the problem occurring
- Resolve any unclear requirements before proceeding to analysis

### Phase 2: Codebase Intelligence & Investigation

**Use specialized subagents for parallel analysis when beneficial:**

**1. Affected Code Analysis**
- Search for components mentioned in the issue description
- Find related functions, classes, modules, and files
- Identify integration points and dependencies
- Locate configuration files and environment settings
- Map data flow through affected systems

**2. Pattern Recognition & Similar Issues**
- Search for similar error patterns in codebase
- Check for recent changes to affected areas using git history
- Identify related bug fixes or known issues
- Look for TODO comments or known limitations
- Find similar implementations that work correctly

**3. System Architecture Understanding**
- Understand how affected components fit into overall architecture
- Map dependencies and integration points
- Identify potential failure modes and edge cases
- Check error handling and validation patterns
- Understand expected vs actual behavior

**4. Testing & Validation Analysis**
- Find existing tests for affected functionality
- Identify test gaps or missing edge cases
- Check if tests are passing or failing
- Understand testing patterns and validation approaches
- Use stable test suite for reliable validation:
  - Helper utilities: `npm run test:helpers`
  - E2E functionality: `npm run test:e2e:stable`
  - Avoid flaky legacy tests unless specifically needed

### Phase 3: Deep Reasoning & Root Cause Analysis

**Think Systematically About:**
- What is the actual vs expected behavior?
- What assumptions might be incorrect?
- Are there timing issues, race conditions, or async problems?
- Could this be an edge case or boundary condition?
- Are there input validation or data integrity issues?
- Is this a configuration or environment problem?
- Could recent changes have introduced this issue?

**Root Cause Investigation:**
- Trace the issue back to its fundamental cause
- Distinguish between symptoms and root causes
- Consider multiple potential causes and validate each
- Use debugging techniques: logging, breakpoints, data inspection
- Test hypotheses systematically

**Impact Assessment:**
- How widespread is this issue?
- What other systems or features might be affected?
- Are there security or data integrity implications?
- What are the performance or user experience impacts?

### Phase 4: Solution Development & Options Analysis

**Generate Multiple Solution Approaches:**

For each potential solution, analyze:
- **Implementation Complexity**: Low/Medium/High
- **Risk Level**: Low/Medium/High  
- **Time to Implement**: Hours/Days/Weeks
- **Maintenance Burden**: Ongoing complexity
- **Side Effects**: Potential unintended consequences
- **Backward Compatibility**: Breaking changes required?

**Solution Categories to Consider:**
1. **Quick Fix**: Minimal change to resolve immediate issue
2. **Proper Fix**: Address root cause comprehensively
3. **Architectural Fix**: Redesign to prevent similar issues

### Phase 5: Recommendation & Planning

**Present findings in this structure:**

## Root Cause Analysis

### Issue Summary
- **Problem**: [Clear description of the actual issue]
- **Symptoms**: [Observable behaviors and error conditions]
- **Affected Components**: [List of files, functions, systems]
- **Severity**: [Critical/High/Medium/Low with justification]

### Root Cause
[Detailed explanation of the fundamental cause]

**Why This Occurs:**
[Technical explanation of the failure mechanism]

**Code Location:**
```
[File path:line numbers]
[Relevant code snippet showing the issue]
```

**Contributing Factors:**
- [List any secondary causes or conditions]

### Impact Assessment
- **Scope**: [How widespread is this issue?]
- **User Impact**: [Effect on user experience]
- **System Impact**: [Effect on system performance/stability]
- **Business Impact**: [Effect on business operations]

## Solution Options

### Option 1: [Solution Name] (Recommended)
**Approach**: [High-level description]
**Pros**:
- [Advantage 1]
- [Advantage 2]
**Cons**:
- [Disadvantage 1]
- [Disadvantage 2]
**Implementation Complexity**: [Low/Medium/High]
**Risk Level**: [Low/Medium/High]
**Time Estimate**: [Hours/Days/Weeks]
**Confidence Score**: [X/10] - [Brief justification for confidence level]

### Option 2: [Solution Name]
**Approach**: [High-level description]
**Pros**:
- [Advantage 1]
- [Advantage 2]
**Cons**:
- [Disadvantage 1]
- [Disadvantage 2]
**Implementation Complexity**: [Low/Medium/High]
**Risk Level**: [Low/Medium/High]
**Time Estimate**: [Hours/Days/Weeks]
**Confidence Score**: [X/10] - [Brief justification for confidence level]

### Option 3: [Solution Name]
**Approach**: [High-level description]
**Pros**:
- [Advantage 1]
- [Advantage 2]
**Cons**:
- [Disadvantage 1]
- [Disadvantage 2]
**Implementation Complexity**: [Low/Medium/High]
**Risk Level**: [Low/Medium/High]
**Time Estimate**: [Hours/Days/Weeks]
**Confidence Score**: [X/10] - [Brief justification for confidence level]

## Recommendation

**Recommended Solution**: Option [X] - [Solution Name]

**Rationale**: [Why this option is best given current constraints and requirements]

**Next Steps**:
1. [Immediate action needed]
2. [Follow-up actions]
3. [Long-term considerations]

## Implementation Readiness

**Ready to Proceed**: [Yes/No]

If Yes: "I can create a detailed implementation plan in `.agents/plans/` when you decide on a solution approach."

If No: "Additional information needed: [List what's missing]"

## Validation Strategy

**Testing Approach**:
- [How to verify the fix works]
- [How to ensure no regressions]
- [Edge cases to validate]

**Validation Commands**:
```bash
# Syntax and compilation
npm run build

# Helper utilities testing
npm run test:helpers

# Stable e2e testing
npm run test:e2e:stable

# Manual validation steps
[Specific commands or steps to verify fix]
```

## Prevention

**Future Prevention**:
- [How to prevent similar issues]
- [Monitoring or alerting to add]
- [Process improvements]
- [Additional testing needed]

---

## User Decision Point

Once you've reviewed the analysis and solution options, let me know which approach you'd like to pursue, and I'll create a detailed implementation plan in `.agents/plans/fix-[issue-name].md` following the comprehensive planning template.

The plan will include:
- Step-by-step implementation tasks
- Code patterns to follow from the existing codebase
- Testing requirements and validation commands
- Risk mitigation strategies
- Rollback procedures if needed

**Choose your preferred solution option, and I'll create the implementation plan immediately.**
