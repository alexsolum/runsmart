# Quick Task 9 Summary

## Outcome

- Replaced the Innsikt aerobic-reference chart with an endurance-efficiency trend based on flat, aerobic runs and rides.
- Added a secondary decoupling-vs-duration scatter plot that uses split data when available and falls back to an empty state when it is not.
- Removed the old reference-workout filtering UI and updated tooltips, explanatory copy, and test coverage to match the new chart model.

## Implementation Notes

- `src/domain/compute.js` now derives efficiency factor, inferred max-HR gating, 30-day rolling averages, and split-based Pa:HR decoupling.
- `src/pages/InsightsPage.jsx` now renders the new primary and secondary charts and hardens synthesis cache behavior so stale AI callouts do not appear when no activity data exists.
- Tests were updated in `tests/unit/compute.test.js` and `tests/unit/insights.test.jsx`, and shared component setup now provides a stable `localStorage` stub.

## Verification

- `npx vitest run --project unit tests/unit/compute.test.js`
- `npx vitest run --project components tests/unit/insights.test.jsx`
