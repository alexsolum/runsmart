# Plan 09-01 Summary

## Outcome

Moved weekly AI generation into `Ukeplan` so the page can generate a structured week and write it directly into the existing workout grid.

## What Changed

- Added an embedded AI setup card to `WeeklyPlanPage` with:
  - focused week summary
  - upstream intent display from the matching training block
  - generate/replace CTA that is visible without becoming a hero module
- Reused `buildCoachPayload` and `gemini-coach` weekly plan mode from the existing coach flow.
- Normalized returned `structured_plan` days onto the currently focused `Ukeplan` week before applying them.
- Reused `workoutEntries.applyStructuredPlan` so generated workouts are persisted through the existing `workout_entries` model.
- Added explicit confirmation before replacing a non-empty week.
- Extended weekly plan tests and shared mock app data to cover the new flow.

## Verification

- `npm test -- --run tests/unit/weeklyplan.test.jsx`

## Key Files

- `src/pages/WeeklyPlanPage.jsx`
- `tests/unit/weeklyplan.test.jsx`
- `tests/unit/mockAppData.js`

## Notes

- The current implementation targets the focused `planningStartDate` week in `Ukeplan`.
- Returned coach dates are remapped onto the selected week locally, which keeps phase 9 unblocked by the current edge-function contract.
