# Architecture Research — Weekly Planning Intelligence

## Integration Shape

The new milestone should converge weekly planning into one pipeline:

1. `Treningsplan` remains the source of macro intent.
2. `Ukeplan` becomes the source of weekly execution and AI generation.
3. Admin weekly-planning guidance acts as a global policy layer.
4. Athlete weekly constraints act as a local policy layer.
5. Edge Function combines all context into a recommendation payload and returns the proposed week plus rationale.

## Suggested Data Flow

- Frontend:
  - `Ukeplan` page loads weekly entries, block context, active plan, and admin weekly guidance.
  - Athlete enters weekly preferences before generation.
- Backend:
  - Edge Function receives normalized context and resolves recommendation logic.
  - Returned plan includes both day placements and explanation / conflict notes.
- Persistence:
  - Store generated week entries separately from athlete-entered preferences so regeneration does not erase intent.

## Suggested Build Order

1. Move recommendation entry point and page ownership to `Ukeplan`.
2. Define the unified weekly-planning payload contract.
3. Add admin weekly-guidance source.
4. Add athlete weekly-preference source and conflict handling.
5. Update recommendation output and rationale rendering.

## New vs Modified Areas

- Modified:
  - `Ukeplan` UI and generation flow
  - existing AI planning payload / Edge Function
  - admin guidance model or settings surface
- New:
  - weekly preference model
  - conflict-resolution / rationale contract

## Source Notes

- Final Surge’s calendar model reinforces that planned workouts should live in the execution calendar and sync outward from there: https://support.finalsurge.com/hc/en-us/articles/360053782954-Final-Surge-to-Garmin-Connect-Calendar-Sync-Structured-Workouts-Not-Working
- TrainingPeaks’ schedule-adjustment guidance supports keeping macro intent stable while reshaping weekly placement around real life: https://www.trainingpeaks.com/blog/customize-your-training-plan/
