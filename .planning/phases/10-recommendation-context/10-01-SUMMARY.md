# Plan 10-01 Summary

## Outcome

Made the selected week a first-class recommendation contract in `Ukeplan` so the same week intent now drives both the setup summary and the AI generation payload.

## What Changed

- Refactored `WeeklyPlanPage` to resolve one normalized selected-week intent with explicit `weekStart`, `weekEnd`, `trainingType`, `targetMileageKm`, and `notes`.
- Preserved `Treningsplan` handoff precedence when the selected plan and week match the stored handoff, while falling back to training-block intent for regular navigation.
- Extended `buildCoachPayload()` with an optional `recommendationWeek` input and a returned `recommendationContext` contract.
- Updated the `gemini-coach` invoke body from `WeeklyPlanPage` to include `recommendationContext` while keeping `targetWeekStart` and `targetWeekEnd` for compatibility.
- Added regression coverage for both current-week and handoff-driven week anchoring.

## Verification

- `npm test -- --run tests/unit/coachPayload.test.js`
- `npm test -- --run tests/unit/weeklyplan.test.jsx`

## Key Files

- `src/pages/WeeklyPlanPage.jsx`
- `src/lib/coachPayload.js`
- `tests/unit/weeklyplan.test.jsx`
- `tests/unit/coachPayload.test.js`

## Notes

- This plan intentionally stops at the frontend contract boundary. The secure prompt precedence and philosophy guardrails remain plan `10-02`.
