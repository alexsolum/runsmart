# Plan: Phase 7 - Advanced Analytics

**Phase Number:** 7
**Goal:** Visualize aerobic efficiency trends to prove fitness gains independent of race results.
**Requirements:** ANLY-01, ANLY-02
**Success Criteria:** 150-day scatter plot with regression line, filtering for short/invalid runs, reactive trend line updates.

## Phase Architecture
- **Metric Logic:** Implement `computeAerobicEfficiency` in `src/domain/compute.js` using the Minetti formula for GAP estimation.
- **Trend Logic:** Use a linear regression utility to calculate the best-fit line and percentage gains over the 150-day window.
- **Analytics UI:** Add a dedicated full-width `AerobicEfficiencyCard` component to `src/pages/InsightsPage.jsx`.
- **Filtering UI:** Add top-level page filters for "Workout", "Long Run", and "Easy/Unlabeled" runs.

## Implementation Tasks

### 1. Domain Logic & Math (`compute.js`)
- [ ] **Math Utility:** Add a robust linear regression function (slope, intercept, rSquared) to `compute.js`.
- [ ] **Efficiency Calculation:**
    - [ ] Implement `getMinettiFactor(grade)` to calculate the grade-adjusted cost of running.
    - [ ] Implement `computeAerobicEfficiency(activities)`:
        - [ ] Filter: `duration >= 20min`, `type === 'run'`, `heart_rate > 0`.
        - [ ] Calculate raw efficiency: `(km/h) / avg_hr`.
        - [ ] Calculate adjusted efficiency: `(km/h * minettiFactor) / avg_hr`.
        - [ ] Return points: `[{ date, x: daysSinceStart, y: efficiency, name, intensityScore }]`.
- [ ] **Trend Summary:** Implement `calculateTrendGain(points)` to return the % change from the start to the end of the regression line.

### 2. UI Components & Filters
- [ ] **Top-level Filters:**
    - [ ] Add a `FilterStrip` component to `InsightsPage.jsx`.
    - [ ] Implement toggles for `showWorkouts`, `showLongRuns`, and `showEasyRuns` (no tag).
- [ ] **Efficiency Chart Card:**
    - [ ] Create `AerobicEfficiencyCard` using Recharts `ComposedChart`.
    - [ ] Map efficiency points to `<Scatter />` with `<Cell />` for intensity-based coloring (Emerald for Z1-Z2, Red for Z4-Z5).
    - [ ] Overlay a `<Line />` based on the linear regression results (start/end points).
    - [ ] Implement custom `<Tooltip />` showing `Run Name`, `Date`, `Speed (km/h)`, `Avg HR`, and `Efficiency`.

### 3. Insights Page Integration
- [ ] **Data Management:**
    - [ ] Use `useMemo` to process activities through the efficiency and filter pipeline.
    - [ ] Ensure the date window is fixed to the last 150 days.
- [ ] **Summary Display:**
    - [ ] Add a "Trend Interpretation" box inside the efficiency card showing the % gain and a confidence score based on `rSquared`.
- [ ] **Responsive View:**
    - [ ] Hide scatter points and show only the regression line on mobile devices.

### 4. Code Cleanup & Polish
- [ ] **Visual Polish:** Ensure the chart uses the project's color tokens and font styles.
- [ ] **Empty State:** Handle the "Not enough data" state if a user has fewer than 5 valid aerobic runs.

## Verification Plan

### Automated Tests
- [ ] **Unit:** Test `calculateTrendGain` with mock points (improving, stable, declining).
- [ ] **Unit:** Test `computeAerobicEfficiency` with varying grades and heart rates to verify Minetti adjustments.
- [ ] **Integration:** Verify the `FilterStrip` correctly updates the `InsightsPage` memoized data.

### Manual Verification (UAT)
- [ ] **Trend Line:** Confirm the regression line correctly fits the scatter points for a known 150-day dataset.
- [ ] **Filtering:** Verify that toggling "Workouts" or "Long Runs" adds/removes points from the chart reactively.
- [ ] **Mobile:** Confirm the chart hides points and remains readable on a mobile viewport.
- [ ] **Tooltip:** Verify all metrics (Speed, HR, Efficiency) are displayed correctly on hover.
