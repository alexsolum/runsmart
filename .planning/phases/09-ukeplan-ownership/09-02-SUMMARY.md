# Plan 09-02 Summary

## Outcome

Removed weekly-generation ownership from `Treningsplan` and replaced it with a read-only intent handoff into `Ukeplan`.

## What Changed

- Reworked `LongTermPlanPage` so it no longer offers weekly AI preview/apply controls.
- Added a read-only weekly intent card that exposes:
  - target week dates
  - week type / phase
  - target mileage
  - notes
- Added an explicit `Open in Weekly Plan` CTA that stores handoff context and triggers app-shell navigation to `weekly-plan`.
- Added a shared navigation helper in `src/lib/appNavigation.js` to avoid ad hoc page-switch wiring.
- Updated `App.jsx` to listen for app-level navigation events from page components.
- Updated `WeeklyPlanPage` to read incoming handoff context from session storage and surface it in the AI setup summary.
- Rewrote the page-level tests so `Training Plan` now verifies the ownership handoff instead of old replan behavior.

## Verification

- `npm test -- --run tests/unit/trainingplan.test.jsx tests/unit/weeklyplan.test.jsx`
- `npm test`
  - phase-specific suites passed
  - full suite still has unrelated pre-existing failures in `tests/unit/gemini-instructions.test.jsx`, `tests/unit/i18n.test.jsx`, and `tests/unit/dashboard.layout.test.jsx`

## Key Files

- `src/pages/LongTermPlanPage.jsx`
- `src/pages/WeeklyPlanPage.jsx`
- `src/App.jsx`
- `src/lib/appNavigation.js`
- `tests/unit/trainingplan.test.jsx`

## Notes

- The handoff currently targets the current Monday-based week and matching training block.
- This phase intentionally stops at ownership and workflow location. Richer recommendation context remains phase 10 work.
