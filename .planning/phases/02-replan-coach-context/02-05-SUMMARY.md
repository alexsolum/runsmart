---
phase: 02-replan-coach-context
plan: 05
subsystem: ui
tags: [replan, long-term-planning, weekly-plan, payload, unit-tests]
requires:
  - phase: 02-04
    provides: long_term_replan edge contract with weekly_structure horizon output
provides:
  - long-term page invokes long_term_replan and previews horizon weeks
  - explicit week-selection apply flow for persisting selected horizon weeks
  - render-safe workout entry persistence path for long-horizon output
affects: [training-plan-page, workout-entries-hook, weekly-plan-rendering, phase-2-completion]
tech-stack:
  added: []
  patterns:
    - preview-first long-horizon apply with explicit selection and confirmation
    - shared refresh-first coach payload usage across replan entry points
key-files:
  created:
    - .planning/phases/02-replan-coach-context/02-05-SUMMARY.md
  modified:
    - src/pages/LongTermPlanPage.jsx
    - src/lib/coachPayload.js
    - src/hooks/useWorkoutEntries.js
    - tests/unit/trainingplan.test.jsx
    - tests/unit/weeklyplan.test.jsx
key-decisions:
  - "Long-term UI now uses mode=long_term_replan and consumes weekly_structure/horizon metadata directly instead of plan_revision."
  - "Applying replans requires explicit per-week selection and confirmation before replacing workout entries in the selected date range."
  - "Selected long-horizon weeks are converted into render-safe workout_entries rows using deterministic workout-type inference."
patterns-established:
  - "Long-horizon output should be previewed with selectable weeks before persistence to avoid destructive overwrites."
  - "Week-level replan contracts can be persisted safely by deterministic conversion into daily workout rows."
requirements-completed: [RPLN-01, RPLN-02, PHIL-03]
duration: 42min
completed: 2026-03-05
---

# Phase 02 Plan 05: Long-Horizon UI + Persistence Summary

**Long Term Plan now triggers long-horizon replanning through race date, previews selectable weekly structure, and applies selected weeks into render-safe Weekly Plan entries**

## Performance

- **Duration:** 42 min
- **Started:** 2026-03-05T21:53:00Z
- **Completed:** 2026-03-05T22:35:00Z
- **Tasks:** 3
- **Files modified:** 5

## Accomplishments

- Switched manual long-term replanning flow to `long_term_replan` and surfaced horizon metadata plus weekly structure preview in `LongTermPlanPage`.
- Added explicit apply safety: user selects exactly which weeks to persist, confirms replacement range, then applies selected weeks only.
- Added `useWorkoutEntries.applyLongTermWeeklyStructure` to replace only the selected horizon range and insert schema-safe workout rows.
- Kept invocation on the shared refresh-first payload path and added goal-race aliases in plan context for compatibility.
- Added unit coverage for request mode selection, horizon preview, explicit apply behavior, and weekly rendering safety after long-horizon persistence.

## Task Commits

1. **Task 1 + Task 2: long-horizon trigger lifecycle, fresh payload path, explicit apply persistence** - `0fe4e39` (feat)
2. **Task 3: horizon/apply regression tests** - `df714c2` (test)

Plan metadata commit is recorded below.

## Files Created/Modified

- `.planning/phases/02-replan-coach-context/02-05-SUMMARY.md` - Plan completion summary.
- `src/pages/LongTermPlanPage.jsx` - Long-horizon replan mode call, horizon preview UI, week selection state, and explicit apply confirmation flow.
- `src/lib/coachPayload.js` - Shared payload plan-context aliases for goal-race fields.
- `src/hooks/useWorkoutEntries.js` - Added `applyLongTermWeeklyStructure` with bounded delete/insert persistence and render-safe row shaping.
- `tests/unit/trainingplan.test.jsx` - Added assertions for `long_term_replan`, horizon preview metadata, and selected-week apply behavior.
- `tests/unit/weeklyplan.test.jsx` - Added regression coverage for rendering long-horizon applied entries.

## Decisions Made

- Used `long_term_replan` directly from Long Term Plan UI to align with the dedicated API contract introduced in 02-04.
- Kept apply behavior confirmation-gated and selection-based to prevent accidental destructive overwrites.
- Persisted week-level output via deterministic conversion to daily workout entries so Weekly Plan keeps its existing rendering contract.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- Local git index lock required elevated permissions for commits in this environment; execution proceeded after elevated commit commands.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 2 plan stack is now complete (5/5) with long-horizon contract wired through UI + persistence.
- Ready to transition to Phase 3 (Feedback Loop Integration).

## Self-Check: PASSED

---
*Phase: 02-replan-coach-context*
*Completed: 2026-03-05*

