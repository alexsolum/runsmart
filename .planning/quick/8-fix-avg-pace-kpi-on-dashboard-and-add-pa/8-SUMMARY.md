---
phase: quick-8
plan: "01"
subsystem: dashboard
tags: [kpi, activities, pagination, hr-zones, ui]
dependency_graph:
  requires: []
  provides: [avg-pace-kpi-fix, alle-lop-tab]
  affects: [HeroPage, ActivitiesTable]
tech_stack:
  added: []
  patterns: [HR zone visualization, paginated table component]
key_files:
  created: []
  modified:
    - src/pages/HeroPage.jsx
    - src/components/dashboard/ActivitiesTable.jsx
    - tests/unit/dashboard.test.jsx
decisions:
  - "avgPaceSpm filters to Run/Walk only — pace is not meaningful for Ride/Swim/Workout"
  - "Duration format kept as H:MM:SS for backward compatibility with existing tests"
  - "Dashboard tests updated from getByText to getAllByText for duration values that now appear in both Activity History and Alle løp tables"
  - "Alle løp tab uses all activities (not date-filtered) sorted newest-first"
metrics:
  duration: "~6 minutes"
  completed_date: "2026-03-12"
  tasks_completed: 2
  files_changed: 3
---

# Quick Task 8: Fix Avg Pace KPI and Add Alle løp Tab — Summary

**One-liner:** Fixed broken avg-pace KPI (was reading non-existent `average_speed`; now reads `average_pace` s/km) and added a paginated "Alle løp" tab with HR zone bar effort visualization.

## What Was Implemented

### Task 1: Fix Avg Pace KPI (commit e6137e2)

The dashboard "Avg. Pace" KPI was always showing "—" because the `avgSpeed` helper filtered on `a.average_speed` — a field never stored by the Strava sync edge function.

Fix:
- Replaced `avgSpeed` with `avgPaceSpm` which reads `average_pace` (seconds/km as stored) with a fallback to `(moving_time / distance) * 1000`
- Filters to Run/Walk activities only (pace is only meaningful for foot sports)
- Updated `fmtPaceDisplay` to accept seconds-per-km directly instead of m/s
- Delta logic inverted: lower s/km = faster = positive improvement

### Task 2: Alle løp Tab + Redesigned ActivitiesTable (commit a42ba8b)

**ActivitiesTable.jsx** completely redesigned:
- Added pagination with `useState(page)`, `useEffect` to reset page on activities change
- New `HRZoneBar` component: 5 colored segments proportional to HR zone seconds (Z1=slate, Z2=blue, Z3=green, Z4=amber, Z5=red). Falls back to single-color suffer_score bar, then slate placeholder
- New columns: Activity (name + relative date), Distance, Duration, Pace, HR (bpm), Effort (zone bar)
- Pagination controls: "Forrige / N of M / Neste" with disabled states at boundaries

**HeroPage.jsx**:
- Added "Alle løp" tab trigger (enabled, not disabled) in TabsList
- New TabsContent renders all activities sorted newest-first via ActivitiesTable with pageSize=10
- Existing Overview tab Activity History card unchanged (still shows recentActivities)

**tests/unit/dashboard.test.jsx**:
- Updated 2 tests from `getByText` to `getAllByText` for duration values — the same activities now appear in both the Overview Activity History table and the Alle løp table

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Dashboard tests broke when duration text appeared in two tables**
- **Found during:** Task 2 verification
- **Issue:** Dashboard tests used `screen.getByText("0:52:00")` expecting a single match. Adding the Alle løp tab created a second ActivitiesTable rendering the same activities, causing "multiple elements found" errors.
- **Fix:** Changed tests to `screen.getAllByText("0:52:00").length).toBeGreaterThan(0)` — semantically identical assertion that handles multiple matches
- **Files modified:** tests/unit/dashboard.test.jsx
- **Commit:** a42ba8b (included in same task commit)

## Self-Check: PASSED

- src/pages/HeroPage.jsx: FOUND
- src/components/dashboard/ActivitiesTable.jsx: FOUND
- Commit e6137e2 (avg pace fix): FOUND
- Commit a42ba8b (alle-lop tab): FOUND
