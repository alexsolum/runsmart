---
phase: 21
plan: 04
type: execute
subsystem: CoachFAB Empty-Plan Gap Closure
status: complete
tags: [coach-fab, gap-closure, empty-plan, null-plan-safety, regression-tests]
duration: 30 minutes
completed: 2026-04-05T17:23:45.5709565+02:00
---

# Phase 21 Plan 04: CoachFAB Empty-Plan Gap Closure — Summary

**Goal:** Restore coach access on the Training Plan page when no hierarchical plan exists yet, while keeping plan-patch actions safely unavailable until a plan is generated.

**One-liner:** CoachFAB now stays visible in empty-plan state, patch cards degrade to explicit guidance when no plan exists, and regression coverage locks the behavior in.

## Execution Summary

### Tasks Completed

**Task 1: Remove the mount gate hiding CoachFAB in empty-plan state** ✓
- Status: COMPLETE
- Files modified: `src/pages/LongTermPlanPage.jsx`
- Result: CoachFAB is rendered for authenticated users even when `hierarchicalPlan.plan` is null

**Task 2: Make null-plan chat and patch UX explicit** ✓
- Status: COMPLETE
- Files modified: `src/components/CoachFAB.jsx`, `src/components/chat/ChatPanel.jsx`
- Result: FAB copy adapts to empty-plan state and patch proposals render a non-apply guidance card instead of actionable controls

**Task 3: Add regression coverage for empty-plan CoachFAB behavior** ✓
- Status: COMPLETE
- Files modified: `tests/unit/trainingplan.test.jsx`
- Result: Tests cover CoachFAB visibility in empty-plan state and null-plan patch gating

**Task 4: Re-run focused verification** ✓
- Status: COMPLETE
- Verification:
  - `npm test -- --run tests/unit/trainingplan.test.jsx`
  - `npm run build`

## Deliverables

1. **Training Plan page keeps CoachFAB visible before plan generation**
   - File: `src/pages/LongTermPlanPage.jsx`
   - Change: CoachFAB render no longer depends on `hierarchicalPlan.plan`
   - Guard: still limited to authenticated users

2. **CoachFAB communicates empty-plan mode clearly**
   - File: `src/components/CoachFAB.jsx`
   - Change: subtitle switches from plan-specific copy to first-plan setup guidance
   - Change: forwards explicit patch-availability controls to ChatPanel

3. **ChatPanel safely handles patch responses without plan context**
   - File: `src/components/chat/ChatPanel.jsx`
   - Change: patch cards render an amber guidance note when patch application is unavailable
   - Change: `handleApplyPatch` throws a deliberate user-facing message if invoked without patch capability

4. **Regression tests cover the gap**
   - File: `tests/unit/trainingplan.test.jsx`
   - Added:
     - CoachFAB visible when `hierarchicalPlan.plan` is null
     - CoachFAB panel opens in empty-plan state
     - Patch proposals render guidance instead of Apply controls when no plan exists

## Test Coverage

| Check | Status |
|------|--------|
| `npm test -- --run tests/unit/trainingplan.test.jsx` | ✓ PASS |
| `npm run build` | ✓ PASS |

## Files Created/Modified

| File | Type | Changes |
|------|------|---------|
| `src/pages/LongTermPlanPage.jsx` | Modified | Keep CoachFAB mounted for signed-in users even with no plan |
| `src/components/CoachFAB.jsx` | Modified | Add empty-plan copy and patch gating props |
| `src/components/chat/ChatPanel.jsx` | Modified | Render patch-unavailable guidance and guard apply handler |
| `tests/unit/trainingplan.test.jsx` | Modified | Add empty-plan CoachFAB and null-plan patch regression tests |

## Deviations from Plan

Minor: regression coverage was added to `tests/unit/trainingplan.test.jsx` rather than a new dedicated Coach file because the affected behavior lives on the Training Plan surface.

## Commits

- Pending orchestrator commit

## UAT Re-test Focus

Re-run these UAT checks after deployment:
1. CoachFAB visibility on `/train` with no generated plan
2. Cross-surface conversation continuity once a plan exists again

---

*Executed by: Codex*
*Timestamp: 2026-04-05T17:23:45.5709565+02:00*
