---
plan: 14-04
phase: 14-planner-primitives-4-week-grid
status: complete
completed: 2026-03-25
---

# Plan 14-04 Summary: GRID-04 Constraint Cell Gap Closure

## What Was Built

Closed the GRID-04 verification gap: constraint days now render a dashed border on the `DayCell` root `<article>` element in addition to the existing `ConstraintMarker` icon/reason display.

`DayCell.jsx` changes:
- Added `const hasConstraint = Boolean(constraintEntry)`
- Applied `borderWidth: "1px"`, `borderStyle: "dashed"`, `borderColor: "var(--pa-outline)"` in the root article `style` merge when `hasConstraint` is true
- Existing `ConstraintMarker` render path (`{constraintEntry ? <ConstraintMarker reason={constraintEntry.description} /> : null}`) preserved unchanged
- `WorkoutCard`/`RaceCard`/`RestCard` routing logic untouched

`tests/unit/planner-grid.test.jsx` changes:
- Replaced basic constraint marker test with 3 explicit GRID-04 tests:
  1. Dashed border assertions (`border-style: dashed`, `border-width: 1px`, `border-color: var(--pa-outline)`)
  2. Coexistence test: constraint + workout renders both "3 x 10 min threshold" and constraint marker
  3. Negative test: unconstrained day does not contain `border-style: dashed`
- Removed standalone `describe("ConstraintMarker")` block (folded into DayCell tests)

## Key Files

- `src/components/planner/DayCell.jsx` — dashed border added
- `tests/unit/planner-grid.test.jsx` — GRID-04 assertions added

## Self-Check: PASSED

- ✓ `DayCell.jsx` contains `const hasConstraint = Boolean(constraintEntry)`
- ✓ `DayCell.jsx` contains `borderStyle: "dashed"` in root article style merge
- ✓ `DayCell.jsx` still contains `{constraintEntry ? <ConstraintMarker reason={constraintEntry.description} /> : null}`
- ✓ Tests assert `border-style: dashed`, `border-width: 1px`, `border-color: var(--pa-outline)`
- ✓ `npx vitest run --project components tests/unit/planner-grid.test.jsx` — 26/26 pass
- ✓ `npm run build` passes

## Deviations

Test coexistence entry used `description: "3 x 10 min threshold"` (unique string) rather than `"Tempo Run"` to avoid duplicate text match since `WorkoutCard` renders both type label and description text.

## Commit

`50f8068 feat(14-04): close GRID-04 gap — dashed constraint cell border + hardened tests`
