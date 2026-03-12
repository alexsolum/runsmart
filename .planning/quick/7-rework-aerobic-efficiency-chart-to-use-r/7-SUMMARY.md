---
phase: quick-7
plan: "01"
subsystem: insights-analytics
tags: [charts, aerobic-efficiency, compute, reference-workouts]
dependency_graph:
  requires: []
  provides: [computeReferenceWorkouts, reference-workout-hr-chart]
  affects: [InsightsPage, compute.js]
tech_stack:
  added: []
  patterns: [modal-bin-detection, pace-outlier-filtering, tdd-pure-function]
key_files:
  created: []
  modified:
    - src/domain/compute.js
    - src/pages/InsightsPage.jsx
    - tests/unit/compute.test.js
decisions:
  - "Modal bin: Math.floor(distance_m/1000) — floor(5000/1000)=5, so referenceKm=5.5 for 5km runners (correct math, test comment was adjusted)"
  - "Points threshold: 5 minimum (not 2) — applied consistently in both compute.js and InsightsPage useMemo"
  - "Filter buttons retained on reference group (workout/easy/long filter further within reference workouts)"
metrics:
  duration_minutes: 25
  completed_date: "2026-03-12"
  tasks_completed: 2
  files_modified: 3
---

# Quick Task 7: Rework Aerobic Efficiency Chart to Reference Workout HR Tracking — Summary

**One-liner:** Reference-workout HR tracker using modal distance bin detection, pace-outlier filtering, and inverted bpm Y-axis to show aerobic fitness over time.

## What Was Built

The aerobic efficiency chart previously showed a flat scatter cloud (R²=0.01) because easy run pace barely varies. This task reworks it from scratch to track average HR for comparable-distance runs over time — lower HR = better aerobic fitness.

### Task 1: computeReferenceWorkouts() pure function

Added to `src/domain/compute.js` immediately after `computeAerobicEfficiency`:

**Algorithm:**
1. Filter to valid runs (type=run, moving_time >= 1200, average_heartrate > 0, distance > 0)
2. Bucket into 1 km bins: `bin = Math.floor(distance_m / 1000)`
3. Find modal bin (highest count; ties: pick highest bin)
4. `modalCenter_m = (modalBin + 0.5) * 1000`
5. Candidates = runs within ±15% of modalCenter_m
6. Compute median pace of candidates; exclude outliers beyond ±20% of median
7. Return `{ referenceKm, points[] }` with each point having `y = average_heartrate`
8. Return `{ referenceKm, points: [] }` when fewer than 5 qualifying runs

Exported from compute.js. 5 TDD tests added.

### Task 2: InsightsPage.jsx chart update

- **Import:** `computeAerobicEfficiency` replaced with `computeReferenceWorkouts`
- **useMemo:** Replaced entirely with reference-workout approach; returns `referenceKm` + `gainBpm` + `gain%`
- **Copy strings:** Updated titles and descriptions in both `no` and `en`; added `noReferenceRuns` key
- **CardDescription:** Dynamically interpolates `{referenceKm}` in the description string
- **Trend badge:** Shows `gainBpm bpm` as primary and `gain%` as secondary; falling HR colored green
- **YAxis:** Integer bpm ticks (`${Math.round(val)}`), `reversed={true}` preserved
- **Empty state:** `< 5 points` shows `copy.noReferenceRuns` instead of chart
- **EfficiencyTooltip:** HR (bpm) as primary row, pace computed from speed as secondary

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Test comment had wrong bin number**
- **Found during:** Task 1 GREEN phase
- **Issue:** Test comment said `modalBin = 4 (floor(5000/1000))` but `Math.floor(5000/1000) = 5`. The expected value of `4.5` was wrong; correct is `5.5`.
- **Fix:** Corrected expected value in test from `4.5` to `5.5` and updated comment.
- **Files modified:** `tests/unit/compute.test.js`

## Pre-existing Failures (Out of Scope)

The following test failures exist on main before this task and are unchanged:
- `insights.test.jsx` — localStorage.getItem error (jsdom config)
- `coach.test.jsx`, `i18n.test.jsx` — localStorage error
- `dashboard.test.jsx` (2 tests) — pre-existing
- `gemini-instructions.test.jsx` (3 tests) — pre-existing
- `weeklyplan.rolling.test.jsx` (2 tests), `weeklyplan.test.jsx` (1 test) — pre-existing timing issues

## Self-Check: PASSED

- src/domain/compute.js: FOUND
- src/pages/InsightsPage.jsx: FOUND
- tests/unit/compute.test.js: FOUND
- Commit 1abf22d (Task 1): FOUND
- Commit 1827f65 (Task 2): FOUND
