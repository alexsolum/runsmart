# Plan 10-03 Summary

## Outcome

`Ukeplan` now lets the user target any currently visible week for AI planning, and the same selected week drives the setup card, confirmation copy, and Replace-with-AI request.

## What Changed

- Split the 4-week window anchor from the AI target week so navigation still moves in 4-week chunks while AI planning can target week 1, 2, 3, or 4 inside the visible window.
- Added explicit week-selection controls to the AI setup card and kept handoff-driven non-current weeks selected when they arrive from `Treningsplan`.
- Rewired generation and replacement confirmation to use the selected AI week instead of `planningStartDate` / `visibleWeeks[0]`.
- Added a regression proving a non-first visible week stays plannable and sends its own dates through the `gemini-coach` request.

## Verification

- `npm test -- --run tests/unit/weeklyplan.test.jsx`

## Key Files

- `src/pages/WeeklyPlanPage.jsx`
- `tests/unit/weeklyplan.test.jsx`

## Notes

- The visible 4-week window remains the same navigation model; this change only removes the hidden first-week-only coupling from AI planning.
