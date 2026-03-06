---
phase: 04-insights-coach-layer
plan: 01
subsystem: ui
tags: [react, compute, training-load, coach-overlay, tdd]

# Dependency graph
requires:
  - phase: 03-feedback-loop-integration
    provides: coach-adaptation-note CSS class established in CoachPage
provides:
  - computeTrainingLoadState pure function (state + trend classification from TSB series)
  - load-state-callout overlay rendered below Training Load Trend chart in InsightsPage
affects:
  - 04-02-PLAN (InsightsPage context already established)
  - any future plan consuming training load state classification

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Pure function TSB classification with locked thresholds (tsb > 10 = good_form, >= -5 = neutral, >= -15 = accumulating_fatigue, else overreaching_risk)
    - 15-day trend window with 2-point dead-band for Improving/Declining/Stable
    - Module-level OVERLAY_MESSAGES constant for coach-voice text with {tsb} placeholder interpolation

key-files:
  created: []
  modified:
    - src/domain/compute.js
    - src/pages/InsightsPage.jsx
    - tests/unit/compute.test.js
    - tests/unit/insights.test.jsx

key-decisions:
  - "computeTrainingLoadState uses locked TSB thresholds from CONTEXT.md — tsb > 10 good_form, >= -5 neutral, >= -15 accumulating_fatigue, else overreaching_risk"
  - "Trend window uses index Math.max(0, series.length - 15) as reference, with dead-band of ±2 to avoid noise on stable periods"
  - "Overlay reuses existing coach-adaptation-note CSS class from Phase 3 — no new CSS required"
  - "loadState overlay placed inside {!isLoading && hasData} guard, after the Training Load chart card — invisible when no data or loading"

patterns-established:
  - "TSB state classification: locked 4-state enum with deterministic pure function — add to compute.js, wire in page via useMemo"
  - "Coach overlay pattern: OVERLAY_MESSAGES constant at module level, data-testid on callout div, string.replace() for value interpolation"

requirements-completed: [INSG-01]

# Metrics
duration: 15min
completed: 2026-03-06
---

# Phase 4 Plan 01: Training Load Trend Overlay Summary

**Deterministic TSB state classifier (computeTrainingLoadState) and coach-voice overlay callout rendered below the Training Load Trend chart in InsightsPage**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-03-06T11:37:00Z
- **Completed:** 2026-03-06T11:52:38Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Added `computeTrainingLoadState(series)` pure function to compute.js — classifies TSB into 4 states and 3 trend directions using a 15-day window
- Exported function and covered with 11 unit tests (all states, trends, edge cases, return shape)
- Wired overlay callout into InsightsPage.jsx below the Training Load Trend chart with `data-testid="load-state-callout"`
- Coach-voice messages for all 12 state/trend combinations with TSB value interpolation
- 5 new component tests covering presence, state label, trend label, empty state, and loading state

## Task Commits

Each task was committed atomically:

1. **Task 1: Add computeTrainingLoadState to compute.js** - `95bd3e5` (feat)
2. **Task 2: Wire overlay callout into InsightsPage** - `265fcee` (feat)

**Plan metadata:** (pending final commit)

_Note: TDD tasks had two commits — RED (tests in task commit) + GREEN (implementation in same task commit per plan structure)_

## Files Created/Modified
- `src/domain/compute.js` - Added computeTrainingLoadState function and export
- `tests/unit/compute.test.js` - Added 11 unit tests for computeTrainingLoadState
- `src/pages/InsightsPage.jsx` - Added import, OVERLAY_MESSAGES constant, loadState useMemo, and JSX callout
- `tests/unit/insights.test.jsx` - Added 5 overlay callout component tests (Training Load Trend overlay describe block)

## Decisions Made
- Used locked TSB thresholds from CONTEXT.md rather than deriving from generateCoachingInsights() to keep the function truly independent and deterministic
- Trend window of 15 entries (approximately 2 weeks of daily data) with ±2 dead-band avoids noise on stable training periods
- Placed overlay after the chart card but inside the `{!isLoading && hasData}` guard — matches the plan spec and ensures no rendering when loading or empty
- Reused existing `.coach-adaptation-note` CSS class — consistent with Phase 3 adaptation callout styling, no new CSS added

## Deviations from Plan

None - plan executed exactly as written.

The insights.test.jsx file had pre-existing tests for `synthesis-callout` (INSG-02) added by a prior agent run (commit `712eb4b`). These were not modified and continued to pass.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- `computeTrainingLoadState` is available as a tested, exported pure function for reuse in other plans
- InsightsPage overlay is live; athletes reading the Training Load chart now see coach-voice interpretation
- Phase 4 Plan 02 (synthesis callout via Gemini edge function) was already partially executed — edge function mode exists, InsightsPage has the fetch logic

---
*Phase: 04-insights-coach-layer*
*Completed: 2026-03-06*

## Self-Check: PASSED

- FOUND: src/domain/compute.js
- FOUND: src/pages/InsightsPage.jsx
- FOUND: tests/unit/compute.test.js
- FOUND: tests/unit/insights.test.jsx
- FOUND: .planning/phases/04-insights-coach-layer/04-01-SUMMARY.md
- FOUND commit 95bd3e5 (Task 1)
- FOUND commit 265fcee (Task 2)
- All 387 tests pass (npm test -- --run)
