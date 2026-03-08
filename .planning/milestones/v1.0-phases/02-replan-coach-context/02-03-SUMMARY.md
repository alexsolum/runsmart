---
phase: 02-replan-coach-context
plan: 03
subsystem: ui
tags: [replan, weekly-plan, coach, react, vitest]
requires:
  - phase: 02-01
    provides: philosophy-aware plan_revision runtime in gemini-coach
  - phase: 02-02
    provides: shared refresh-first coach payload builder
provides:
  - manual long-term replan trigger with full request lifecycle states
  - structured weekly plan preview with explicit user-confirmed apply flow
  - workout entry persistence helper for safe replace-and-apply of structured plans
affects: [long-term-plan, weekly-plan, workout-entries, unit-tests]
tech-stack:
  added: []
  patterns: [shared payload usage for replan invocation, explicit preview-before-apply workflow]
key-files:
  created:
    - .planning/phases/02-replan-coach-context/02-03-SUMMARY.md
  modified:
    - src/pages/LongTermPlanPage.jsx
    - src/pages/WeeklyPlanPage.jsx
    - src/hooks/useWorkoutEntries.js
    - tests/unit/trainingplan.test.jsx
    - tests/unit/weeklyplan.test.jsx
key-decisions:
  - "Long-term replanning reuses buildCoachPayload and gemini-coach plan_revision mode to keep context freshness and philosophy behavior aligned with coach flows."
  - "Applying replans replaces entries only within the returned date span and requires explicit confirmation before persistence."
  - "Weekly rendering normalizes coach-style date/distance formats to protect UI contract stability."
patterns-established:
  - "Manual replans should always render a preview before persistence and provide clear loading/error/success copy."
  - "Structured plan persistence should be centralized in useWorkoutEntries rather than duplicated in page components."
requirements-completed: [RPLN-01, RPLN-02, PHIL-03]
duration: 35min
completed: 2026-03-05
---

# Phase 02 Plan 03 Summary

**Long-term planning now supports manual coach-triggered replanning with preview-first weekly output and explicit safe apply into weekly workouts**

## Performance

- **Duration:** 35 min
- **Started:** 2026-03-05T22:00:00+01:00
- **Completed:** 2026-03-05T22:35:00+01:00
- **Tasks:** 3
- **Files modified:** 6

## Accomplishments

- Added a manual `Replan with AI Coach` trigger in long-term planning that invokes `gemini-coach` via `plan_revision` using `buildCoachPayload`.
- Implemented preview-first rendering of returned `structured_plan` and an explicit `Apply to Weekly Plan` confirmation path.
- Added `applyStructuredPlan` in `useWorkoutEntries` to normalize structured days, replace existing range entries safely, and persist weekly workouts.
- Hardened weekly rendering against coach-style payload shapes (`date` + string numeric fields).
- Added regression tests for replan trigger, payload invocation path, explicit apply behavior, and weekly renderability of applied entries.

## Task Commits

Each task was completed in this execution session. No git commits were created as part of this step.

## Files Created/Modified

- `src/pages/LongTermPlanPage.jsx` - Manual replan lifecycle, preview UI, explicit apply confirmation and persistence hook integration.
- `src/hooks/useWorkoutEntries.js` - New `applyStructuredPlan` helper with normalization, range replacement, and insert flow.
- `src/pages/WeeklyPlanPage.jsx` - Normalization layer for robust rendering of applied coach-plan entries.
- `tests/unit/trainingplan.test.jsx` - Coverage for trigger visibility, shared payload path, and explicit apply behavior.
- `tests/unit/weeklyplan.test.jsx` - Coverage for weekly rendering when entries arrive with coach-style date/string metrics.
- `.planning/phases/02-replan-coach-context/02-03-SUMMARY.md` - Plan execution summary.

## Decisions Made

- Kept plan apply persistence in `useWorkoutEntries` to avoid direct DB writes in long-term page and maintain a shared contract.
- Preserved explicit user confirmation (`window.confirm`) before replacing any existing date-range entries.

## Deviations from Plan

None - plan executed as written.

## Issues Encountered

- Initial required test command failed in sandbox with `Error: spawn EPERM` (esbuild spawn). Reran the same command with escalated permissions; verification passed.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Long-term replan flow now produces and safely applies structured weekly output.
- Weekly page can render applied entries reliably even with coach-style field shapes.

---
*Phase: 02-replan-coach-context*
*Completed: 2026-03-05*
