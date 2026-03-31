---
phase: 13-domain-logic-workout-type-registry
plan: 02
subsystem: ui
tags: [domain-logic, analytics, vitest, react]
requires:
  - phase: 13-domain-logic-workout-type-registry
    provides: Canonical workout type registry and normalization helpers
provides:
  - Weekly load statistics aggregation for planner load columns
  - Historical average and planned volume trend aggregation helpers
  - Unit coverage for planner analytics domain functions
affects: [weekly-load-column, volume-trend-header, planner-grid]
tech-stack:
  added: []
  patterns: [pure analytics helpers, UTC-safe week bucketing]
key-files:
  created: []
  modified: [src/domain/compute.js, tests/unit/compute.test.js]
key-decisions:
  - "Weekly load status is only flagged when planned distance exceeds 110% of target; under-target weeks remain on-target by design."
  - "Volume trend keeps planned distance week-specific while using historical weekly averages derived from Strava activity summaries in kilometers."
patterns-established:
  - "Planner analytics helpers stay pure inside `src/domain/compute.js` and are covered directly by Vitest."
  - "Week bucketing continues to reuse `getWeekStart()` for UTC-safe aggregation."
requirements-completed: [ANLY-01, ANLY-02, ANLY-03]
duration: 1 min
completed: 2026-03-24
---

# Phase 13 Plan 02: Compute Aggregation Summary

**Weekly load statistics and planned-vs-historical volume trend helpers added to the planner domain layer with unit coverage**

## Performance

- **Duration:** 1 min
- **Started:** 2026-03-24T10:21:21+01:00
- **Completed:** 2026-03-24T10:22:12+01:00
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Added `computeWeeklyLoadStats()` to aggregate weekly zone distribution, total hours, total kilometers, and over-target status from planner entries.
- Added `computeHistoricalAverage()` and `computeVolumeTrend()` to produce week-by-week planned and historical kilometer comparisons as the Phase 16 header foundation.
- Extended `tests/unit/compute.test.js` with coverage for weekly load calculations, duration estimation, and multi-week trend aggregation.

## Task Commits

Each task was committed atomically:

1. **Task 1: Implement computeWeeklyLoadStats** - `1ba01ba` (`feat`)
2. **Task 2: Implement computeVolumeTrend** - `5040e75` (`feat`)

**Plan metadata:** pending

## Files Created/Modified
- `src/domain/compute.js` - Added pure planner analytics helpers for weekly load stats and planned-vs-historical trend aggregation.
- `tests/unit/compute.test.js` - Added targeted coverage for the new analytics helpers while preserving existing compute test coverage.

## Decisions Made
- Kept load status intentionally asymmetric: only significant over-target weeks are flagged, matching the phase context’s injury-prevention bias.
- Used activity summaries in meters converted to kilometers for historical averages so the trend helper aligns with Strava data shape without leaking unit conversion into UI components.

## Deviations from Plan

None - plan executed exactly as written.

**Total deviations:** 0 auto-fixed
**Impact on plan:** None.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 14 can consume workout-type metadata and planner analytics helpers without duplicating domain logic.
- No blockers identified for planner primitive and grid implementation.

---
*Phase: 13-domain-logic-workout-type-registry*
*Completed: 2026-03-24*
