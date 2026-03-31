# Phase 9 Research: Ukeplan Ownership

**Date:** 2026-03-13
**Phase:** 9 - Ukeplan Ownership
**Goal:** Make `Ukeplan` the single tactical weekly-planning surface while `Treningsplan` remains the source of weekly intent.

## What Exists Today

- `src/pages/WeeklyPlanPage.jsx` already owns the editable 4-week grid, manual add/edit/delete flows, summary stats, and range loading through `workoutEntries.loadEntriesForRange`.
- `src/hooks/useWorkoutEntries.js` already exposes `applyStructuredPlan(planId, structuredPlan)`, which deletes and rewrites workout entries across a date range. This is the correct persistence primitive for week-level AI output.
- `src/pages/LongTermPlanPage.jsx` currently owns a weekly AI workflow through `handleManualReplan` and `handleApplyReplan`, including `gemini-coach` invocation, weekly preview UI, and writeback via `applyLongTermWeeklyStructure`.
- `src/pages/CoachPage.jsx` already demonstrates the week-plan generation pattern for `mode: "plan"` and accepts returned `structured_plan` into `workout_entries`. That page is a useful implementation reference even if ownership is moving to `Ukeplan`.
- Existing unit coverage already targets the relevant page surfaces:
  - `tests/unit/weeklyplan.test.jsx`
  - `tests/unit/weeklyplan.rolling.test.jsx`
  - `tests/unit/trainingplan.test.jsx`

## Implementation Implications

### 1. Ukeplan should call the existing weekly plan mode

Phase 9 does not need a new edge function contract. `Ukeplan` can invoke `gemini-coach` with the same weekly planning mode already used in `CoachPage`, then persist returned `structured_plan` through `workoutEntries.applyStructuredPlan`.

### 2. Replace protection belongs in page state, not backend schema

The requirement is explicit confirmation before overwrite, not versioning. Existing entries are already loaded into `WeeklyPlanPage`, so the page can detect week occupancy and block apply behind a confirmation dialog or inline confirm step.

### 3. LongTermPlanPage should stop acting like a second weekly planner

`LongTermPlanPage` should still expose upstream week intent and guidance, but the current "preview + apply weeks into workout entries" UI conflicts with the ownership model. Phase 9 should remove or downgrade that behavior into a handoff CTA that routes users to `Ukeplan`.

### 4. Handoff context likely needs a shared week-intent helper

`Treningsplan` needs to expose selected week type, target mileage, and notes to `Ukeplan`. The cleanest path is a shared selector/helper that derives the current or chosen week intent from training blocks / replan preview data and passes it via route state, URL params, or shared page state. Route state is the lightest-weight option for this phase.

### 5. Generated workouts must land in the existing weekly grid

The context explicitly rejects a detached review workspace. That means `WeeklyPlanPage` should show setup context near the selected week, generate into local preview/apply state only long enough to confirm overwrite, and then write directly into `workout_entries` so the visible grid becomes the source of truth.

## Risks And Constraints

- `WeeklyPlanPage` currently shows four visible weeks. The plan must define which week AI generation targets. The safest phase-9 default is the currently focused first visible week (`planningStartDate`) with clear copy.
- `applyStructuredPlan` replaces every entry inside the returned plan date range. The generated plan must stay bounded to one week so overwrite scope is predictable.
- `LongTermPlanPage` tests currently assert `Replan with AI Coach` and `applyLongTermWeeklyStructure` behavior. Those tests will need to be rewritten around read-only intent and handoff.
- `CoachPage` still has a separate weekly-plan tab. Phase 9 requirement scope only names `Ukeplan` vs `Treningsplan`, so removing Coach ownership is not required here. That should stay untouched unless it directly confuses page ownership.

## Recommended Plan Shape

### Plan 01
- Add AI week generation entry, setup summary, overwrite protection, and direct apply-to-grid behavior inside `WeeklyPlanPage`.
- Reuse `buildCoachPayload`, `gemini-coach`, and `applyStructuredPlan`.
- Add unit tests for empty week CTA, generation request, and replace confirmation.

### Plan 02
- Convert `LongTermPlanPage` weekly AI area into read-only weekly intent + explicit handoff to `Ukeplan`.
- Remove competing weekly preview/apply ownership from that page.
- Add unit tests proving `Treningsplan` no longer applies generated weeks and instead exposes the handoff context.

## Validation Architecture

Phase 9 can be validated primarily with existing Vitest page tests because the ownership shift is UI and page-flow heavy, not database-schema heavy.

- Fast loop: targeted unit tests for `WeeklyPlanPage` and `LongTermPlanPage`
- Full loop: full `vitest run`
- Manual spot-check: confirm the handoff from `Treningsplan` opens `Ukeplan` with visible week-intent summary and that overwrite confirmation appears when the week already contains entries

## Phase Requirement Coverage

- `UKE-01`: Covered by moving AI generation into `WeeklyPlanPage`
- `UKE-02`: Covered by reducing `LongTermPlanPage` to intent + handoff and preserving day-by-day editing in `WeeklyPlanPage`
