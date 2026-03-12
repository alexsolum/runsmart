---
phase: quick-5
plan: 01
subsystem: insights
tags: [charts, aerobic-efficiency, i18n, tooltip, regression]
dependency_graph:
  requires: []
  provides: [enriched-aerobic-efficiency-chart]
  affects: [src/pages/InsightsPage.jsx]
tech_stack:
  added: []
  patterns: [useMemo-copy-pattern, recharts-tooltip-component]
key_files:
  created: []
  modified:
    - src/pages/InsightsPage.jsx
decisions:
  - rStrength thresholds: >=0.5=strong, >=0.25=moderate, else weak (per plan spec)
  - Pace format: M:SS min/km using Math.floor + padStart(2,"0") for consistent display
  - Zero-speed guard: returns em dash "—" when speed=0 to avoid division-by-zero
metrics:
  duration: "~15 minutes"
  completed: "2026-03-12"
  tasks_completed: 2
  files_changed: 1
---

# Phase quick-5 Plan 01: Aerobic Efficiency Chart Improvements Summary

Improved the aerobic efficiency trend chart with a 180-day window, regression quality badge (R², strength label, run count), and enriched tooltip showing pace in M:SS min/km alongside existing speed/HR/efficiency fields.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Extend time window and compute regression quality in useMemo | 62b1916 | src/pages/InsightsPage.jsx |
| 2 | Update regression quality badge and enrich EfficiencyTooltip | 2e00225 | src/pages/InsightsPage.jsx |

## Changes Made

### Task 1: Time window + regression quality data

- Changed `windowDays` from 150 to 180 in `aerobicEfficiencyData` useMemo
- After regression computation, derives `rStrength` and `count`:
  - `rStrength`: `"strong"` (R²>=0.5), `"moderate"` (R²>=0.25), `"weak"` (else)
  - `count`: number of runs in the regression window
- Added `count` and `rStrength` to the useMemo return value alongside existing `points`, `regression`, `gain`, `r2`
- Updated `aerobicEfficiencyDesc` in both locales:
  - Norwegian: "...de siste 180 dagene."
  - English: "...over the past 180 days."
- Added new copy keys to both locale objects in the `copy` useMemo:
  - `rStrengthLabels: { strong, moderate, weak }` (localized)
  - `runs` (Norwegian: "løp", English: "runs")
  - `pace` (Norwegian: "Tempo", English: "Pace")

### Task 2: Badge and tooltip updates

- **Regression quality badge** (CardHeader): Replaced simple `R² {r2}` span with enriched inline display: `R² {r2} · {Sterk|Moderat|Svak} · {N} løp` (Norwegian) / `R² {r2} · {Strong|Moderate|Weak} · {N} runs` (English)
- **EfficiencyTooltip**: Added pace computation and display row:
  - `paceMinPerKm = data.speed > 0 ? 60 / data.speed : null`
  - Formatted as `M:SS min/km` using `Math.floor` + `.padStart(2, "0")`
  - Fallback to `"—"` when speed is 0 or null
  - New pace row inserted after avg HR row in the 2-column grid

## Verification

- `npm test -- --run` passes with same pre-existing failure count (6 failing tests unrelated to this work: `insights.test.jsx` fails due to a pre-existing `localStorage.getItem is not a function` in test environment, `dashboard.test.jsx` has 2 unrelated failures, `gemini-instructions.test.jsx` has 3 unrelated failures, `weeklyplan.rolling.test.jsx` has 1 timeout)
- All 280 passing tests remain passing after both changes
- windowDays is confirmed 180 in source
- Badge renders: "R² {n} · {label} · {N} løp/runs"
- Tooltip pace row computes from speed field with M:SS format

## Deviations from Plan

None - plan executed exactly as written.

## Self-Check: PASSED

- `src/pages/InsightsPage.jsx` modified and committed
- Commit 62b1916 exists: `feat(quick-5): extend aerobic efficiency window...`
- Commit 2e00225 exists: `feat(quick-5): update regression badge and add pace row...`
