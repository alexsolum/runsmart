---
phase: quick-6
plan: "01"
subsystem: frontend/insights
tags: [chart, analytics, pace, aerobic-efficiency, i18n]
dependency_graph:
  requires: []
  provides: [easy-run-pace-trend-chart]
  affects: [InsightsPage]
tech_stack:
  added: []
  patterns: [recharts-custom-shape, hr-based-classification, pace-inversion]
key_files:
  created: []
  modified:
    - src/pages/InsightsPage.jsx
decisions:
  - "Y-axis metric changed from GAP/HR ratio to pace (min/km) — clearer user question: is my easy pace improving?"
  - "maxHR derived as 95th-percentile of all activity average_heartrate values, fallback 190 if no HR data"
  - "Tooltip reordered: pace first (data.y in M:SS), speed second, avgHR third — efficiency row removed"
  - "Trend-gain badge color inverted: negative % = faster = green, positive % = slower = red"
metrics:
  duration: "~15 min"
  completed: "2026-03-12"
  tasks_completed: 1
  files_modified: 1
---

# Phase quick-6 Plan 01: Improve Aerobic Efficiency Trend Chart Summary

**One-liner:** Rework aerobic efficiency chart to display easy-run pace (min/km) with HR-based classification, inverted Y-axis, and larger dots so visual improvement trends upward.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Replace Y-axis metric with pace, HR classification, dot size | 32c19cd | src/pages/InsightsPage.jsx |

## What Was Built

The aerobic efficiency chart now answers a cleaner question — "Is my easy running pace improving?" — instead of showing the opaque GAP/HR ratio.

Key changes in `src/pages/InsightsPage.jsx`:

1. **95th-percentile maxHR** computed from all activities before filtering; fallback to 190 bpm when no HR data present.

2. **Y metric changed to pace (min/km):** After calling `computeAerobicEfficiency()`, each point's `y` is remapped to `60 / speed` (speed is km/h). Points with zero speed are filtered out.

3. **HR-based classification** for filter modes:
   - Easy: `hr < maxHR * 0.75`
   - Workout: `hr >= maxHR * 0.85 || intensityScore > 75`
   - Long: estimated duration > 4500s AND `hr < maxHR * 0.85`

4. **Y-axis inverted** (`reversed={true}`) with `tickFormatter` showing `M:SS` format so faster pace appears higher on the chart.

5. **Dot radius = 6** via `shape` prop on `<Scatter>` rendering a custom `<circle r={6} fillOpacity={0.75} />`.

6. **Trend-gain badge** color inverted: `<= 0` gain = green (same or faster pace), `> 0` = red (pace got slower).

7. **EfficiencyTooltip** reordered: pace (from `data.y` in M:SS format) is now primary row, followed by speed and avgHR. Efficiency ratio row removed.

8. **Copy strings updated** in both locales:
   - Norwegian: "Tempo på rolige løp over tid" / "Tempo (min/km) på aerobe løp de siste 180 dagene. Linje som går ned = du løper fortere."
   - English: "Easy run pace trend" / "Pace (min/km) on aerobic runs over the past 180 days. Line trending down = getting faster."

## Verification

- All 281 previously passing tests still pass; 5 pre-existing failures unchanged (unrelated to InsightsPage).
- No new test failures introduced.

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

- [x] `src/pages/InsightsPage.jsx` modified with all 8 changes
- [x] Commit 32c19cd exists
- [x] Test suite: 281 pass / 5 pre-existing fail (unchanged baseline)
