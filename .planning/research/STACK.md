# Stack Research — Weekly Planning Intelligence

## Recommendation

No major stack expansion is required for this milestone.

- Reuse the current React + Vite frontend and the existing page split between `Treningsplan` and `Ukeplan`.
- Reuse Supabase for persistence and the existing Edge Function pattern for AI recommendation generation.
- Prefer extending current weekly-plan and admin-guidance data flows over introducing a separate planning service.

## Likely Additions

- Shared weekly-planning payload builder so `Ukeplan` can combine:
  - long-term block context
  - target weekly mileage / workout type
  - admin weekly principles and focus guidance
  - athlete-specific day constraints
- Persistent weekly constraint model.
  - Best fit is either a new `weekly_plan_preferences` table or JSONB attached to the existing weekly plan domain.
- Clear conflict metadata so the UI can explain when requested constraints cannot all be satisfied.

## What Not To Add Yet

- Do not add a new external orchestration service just for weekly AI planning.
- Do not add drag-and-drop calendar libraries unless the milestone explicitly grows into heavy visual scheduling.
- Do not split planning logic across frontend and backend; keep rule assembly and AI prompt building server-side for consistency and security.

## Source Notes

- TrainingPeaks emphasizes adapting weekly structure to real-life schedule while preserving hard/easy spacing and balanced workout distribution: https://www.trainingpeaks.com/blog/customize-your-training-plan/
- Strava’s schedule examples reinforce repeatable weekly rhythm, rest spacing, and fixed routine anchors: https://stories.strava.com/pt/articles/couch-to-5k-training-plan
