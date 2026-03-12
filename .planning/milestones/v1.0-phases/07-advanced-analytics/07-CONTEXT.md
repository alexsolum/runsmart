# Context: Phase 7 - Advanced Analytics

**Phase Number:** 7
**Goal:** Visualize aerobic efficiency trends to prove fitness gains independent of race results.

## Decisions

### Metric & Calculation
- **Formula:** Efficiency = `(Speed in km/h) / (Average Heart Rate)`.
- **Normalization:** Prefer `gap_speed` (Grade Adjusted Pace) from Strava to reduce noise from elevation changes.
- **Invalid Data:** Strictly exclude heart rate `<= 0` and runs `< 20 minutes`.

### Filter & Scope
- **Date Window:** 150 days (approx. 5 months) of history in a single chart view.
- **Workout Filters:** Page-level toggles for "workout", "long run", and "no tag" (unlabeled aerobic runs).
- **Automation:** Fully automatic filtering based on metadata; no manual exclusion UI needed.

### Trend & Interpretation
- **Visualization:** Scatter plot with a Linear Regression (Best Fit) trend line.
- **Summary:** Include a "Trend Interpretation" text box summarizing efficiency gains (e.g., "+X% over the last 30/90 days").
- **Interactions:**
    - **Hover:** Tooltips showing `Run Name`, `Date`, `Speed`, `HR`, and `Efficiency`.
    - **Coloring:** Intensity-based coloring for scatter points (e.g., gradient based on pace or effort).

### UI Layout
- **Placement:** Dedicated full-width card positioned immediately below the "Training Load" trend chart on the Insights page.
- **Responsiveness:**
    - **Desktop:** Full detail (Points + Regression Line).
    - **Mobile:** Simplified view (Regression Line only, points hidden for clarity).

## Code Context

### Relevant Files
- `src/pages/InsightsPage.jsx`: Main analytics dashboard.
- `src/domain/compute.js`: Location for new `computeAerobicEfficiency` logic.
- `src/components/TrainingVolumeChart.jsx`: Reference for Recharts implementation patterns.

### Reusable Patterns
- **Recharts `ScatterChart`:** Use for the aerobic efficiency plot.
- **Regression Logic:** Implement a simple linear regression utility in `compute.js`.
- **Filters:** Reuse `useMemo` patterns in `InsightsPage.jsx` for data processing.

## Deferred / Out of Scope
- Manual "Hide from Analytics" toggle per activity.
- Seasonal or monthly rolling averages (Linear best-fit is the goal).
- Comparative overlay with other athletes.
