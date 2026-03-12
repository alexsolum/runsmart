# Quick Task 6: Improve aerobic efficiency trend chart - Context

**Gathered:** 2026-03-12
**Status:** Ready for planning

<domain>
## Task Boundary

Improve the "Trend for aerob effektivitet" chart on the Insights/Innsikt page:
1. Make dots larger and more visible
2. Change Y-axis to pace (min/km) — showing "pace at aerobic HR" concept
3. Improve workout classification using HR-based thresholds
4. Keep existing Recharts popup tooltip (no UX redesign)

</domain>

<decisions>
## Implementation Decisions

### Y-axis
- Change from aerobic efficiency (GAP/HR) to **pace (min/km)**
- Show only **easy/aerobic runs** (HR-based filter) — making this "pace at aerobic HR"
- The chart now answers: "Is my easy running pace improving over time?"
- **Invert the Y-axis** so that improvement (faster pace = lower min/km number) trends visually UPWARD — more intuitive for the user
- Update chart title/description accordingly in both locales

### Dot hover overlay
- **Keep existing small Recharts popup** — no redesign needed
- Ensure tooltip shows pace clearly as the primary metric (already done in quick-5)

### Workout classification
- Replace name-keyword heuristics with **HR-based thresholds**:
  - `easy`: avg HR < 75% of estimated max HR
  - `workout`: avg HR ≥ 85% of estimated max HR OR intensityScore > 75
  - `long`: duration > 4500 seconds (75 min) AND avg HR < 85% max HR
  - Default/all: unfiltered
- **Max HR estimation**: use the **95th percentile** of all recorded HR values across activities — avoids single outlier spikes while capturing true high-effort peaks
- This logic lives in `InsightsPage.jsx` (useMemo for aerobicEfficiencyData) — no changes to compute.js needed unless the classification helper is cleaner there

### Dot visibility
- Increase dot size (Recharts `r` prop or shape prop on Scatter) — make each run clearly visible as a distinct point
- Keep color coding (green/amber/red by intensity) and fillOpacity

### Claude's Discretion
- Exact Y-axis tick format (e.g. "5:30" vs "5.5")
- Whether to keep "aerobic efficiency" as a secondary tooltip field or remove it
- How to handle the regression line direction labeling when axis is inverted

</decisions>

<specifics>
## Specific Ideas

- Y-axis ticks should format as "M:SS" (e.g. "5:30 min/km") since that's the standard Norwegian running format
- 95th percentile max HR: compute from `activities` array passed into the useMemo — take all `average_heartrate` values, sort, pick index at 95%
- The chart description text should explain "easy runs only, pace trending down = getting faster"
- Regression line should still show trend direction (slope) but now over pace values — a downward slope means improvement

</specifics>
