# Quick Task 5: Improve the aerobic efficiency trend chart - Context

**Gathered:** 2026-03-12
**Status:** Ready for planning

<domain>
## Task Boundary

Improve the "Trend for aerob effektivitet" chart on the Insights/Innsikt page to:
- Show more data points for better visibility of the underlying data driving the linear regression
- Add regression quality indicators so the user can judge how meaningful the trend is
- Improve hover tooltips with full run context

</domain>

<decisions>
## Implementation Decisions

### Time window
- Extend from 150 days to **180 days (6 months)** — captures a full training block cycle

### Regression quality display
- Add a plain-language **strength label** next to R² — "Sterk" / "Moderat" / "Svak" (Norwegian, matching page locale)
  - Thresholds: R² ≥ 0.5 = Sterk, R² ≥ 0.25 = Moderat, else Svak
- Add **sample count** (number of runs the regression is based on)
- R² already displayed — keep it, augment it

### Tooltip detail
- Show **full run details** on hover: date, run name, efficiency value, average HR, and pace
- Enough to identify the exact run and understand its context

### Claude's Discretion
- Exact positioning and styling of the new quality indicators
- Norwegian vs English labels (follow page locale — Norwegian when lang=no, English when lang=en)
- Pace format (min/km is standard for Norwegian runners)

</decisions>

<specifics>
## Specific Ideas

- The strength label thresholds (0.5 / 0.25) are a reasonable starting point for endurance running data — Claude may adjust if the data warrants it
- Tooltip should be custom (Recharts `content` prop) to show all fields cleanly
- Sample count can appear inline with R², e.g. "R² 0.42 · Moderat · 38 løp"

</specifics>
