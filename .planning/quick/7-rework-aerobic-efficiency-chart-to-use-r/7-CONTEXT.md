# Quick Task 7: Rework aerobic efficiency chart to reference workout HR tracking - Context

**Gathered:** 2026-03-12
**Status:** Ready for planning

<domain>
## Task Boundary

The current chart (quick-6) is broken: all 159 easy runs cluster at ~5:24 min/km with R²=0.01,
making the regression meaningless. Pace doesn't vary enough across easy runs to show development.

The fix: reframe the chart entirely around "reference workouts" — find your most commonly run
distance, and track how average HR changes over time for those comparable runs. Lower HR for the
same distance = better aerobic fitness.

</domain>

<decisions>
## Implementation Decisions

### Reference workout selection
- **Auto-detect most common distance**: bucket all runs into 1 km bins, find the most frequent bin
- Use runs within **±15% of the modal distance** as the reference group
- Within that group, also filter by pace: exclude outliers beyond **±20% of the median pace**
  (removes races, very tired days, GPS errors)
- Minimum 5 runs required to display the chart; show an empty state message if fewer

### Y-axis
- **Average HR in bpm** — lower = better aerobic fitness
- **Invert the axis** so improvement (falling HR) trends visually UPWARD
- Ticks labeled as integers (e.g. "145", "150", "155 bpm")
- Domain: auto with a small padding

### Chart concept
- Each dot = one reference run, plotted as (date, avg HR)
- Color coding: keep existing green/amber/red by intensity score
- Regression line shows HR trend over time — downward slope = improving fitness
- Trend badge: negative % (HR falling) = green (improvement)
- R² and strength label still shown ("Sterk / Moderat / Svak")

### Chart title & description
- Title: "Aerob utvikling" (no) / "Aerobic Development" (en)
- Description: explain the reference distance and how many runs are in the group
  e.g. "Snitt-puls på løp rundt {X} km de siste 180 dagene. Fallende linje = bedre form."
  i.e. "Average HR on runs around {X} km. Falling line = better fitness."

### Claude's Discretion
- Exact bucket/bin logic for modal distance (1 km bins is fine)
- Whether to show the reference distance in the chart description dynamically or hardcode
- Fallback behavior if no modal distance has ≥5 runs

</decisions>

<specifics>
## Specific Ideas

- The modal distance bin can be computed in the `aerobicEfficiencyData` useMemo from `activities`
- Store `referenceKm` (rounded to 1 decimal) to display in the chart subtitle
- Keep the filter buttons (All / Aerob / Workout / Langtur) — they now filter the REFERENCE GROUP
  further, or can be hidden if the reference group is already "easy runs only"
- Regression gain badge: show HR change in bpm (e.g. "-3 bpm") alongside % for clarity

</specifics>
