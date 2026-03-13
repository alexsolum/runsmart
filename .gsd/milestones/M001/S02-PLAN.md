# S02: Advanced Analytics

**Vision:** Visualize aerobic efficiency trends to prove fitness gains independent of race results.

## Success Criteria

1. Chart displays individual "Easy Run" scatter points with regression trend line.
2. Filter logic correctly excludes short runs (<10m) and invalid HR (0).
3. Trend line updates reactively when data changes.

## Implementation Tasks

### 1. Domain Logic & Math
- [ ] **T01: Linear Regression Utility:** Implement `linearRegression(points)` to return `{ slope, intercept, rSquared }`.
- [ ] **T02: Minetti GAP Factor:** Implement `getMinettiFactor(grade)` using the 5th-order polynomial.
- [ ] **T03: computeAerobicEfficiency:**
    - Filter activities: duration >= 20m, type === 'run', HR > 0.
    - Calculate adjusted speed using GAP.
    - Return points: `[{ date, x, y, name, intensityScore }]`.
- [ ] **T04: calculateTrendGain:** Calculate % gain from start to end of regression line.

### 2. Frontend Visualization
- [ ] **T05: Aerobic Efficiency Chart:** Implement the scatter plot with regression line using Recharts or D3.
- [ ] **T06: Regression Quality Badge:** Show R² strength (strong/moderate/weak).
- [ ] **T07: Trend Gain Badge:** Show the % improvement or decline in aerobic efficiency over the selected window (default 180 days).

## Summary

This slice is planned for v1.1, building on the initial work in the quick tasks (S00) where pace/HR axis and regression quality were prototyped.
The core logic will be moved to the shared `compute.js` utility for consistency.
