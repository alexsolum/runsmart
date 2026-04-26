# Control Center Backlog

This is the remaining backlog after the Sprint 3-5 Control Center pass.
The Control Center is now the primary dense desktop shell; narrow screens
show a desktop-only notice until a dedicated mobile redesign is built.

## Next Structural Work

- Mobile redesign: replace the desktop-only notice with a native narrow-screen information architecture instead of compressing enterprise grids.
- i18n: move visible copy into `src/i18n/translations.js` before adding more locales or copy variants.
- Daily log schema: add an explicit `daily_logs.is_training` column so rest-day intent is not inferred from nullable training fields.
- Toolbar wiring: connect visual actions such as log workout, sync Strava, add race, edit week, export CSV, and AI trend/deep-dive buttons to existing app flows.

## AI Modes Pending

- `dashboard_insights`: dashboard coaching bullets generated from recent activities, load, current plan week, and check-ins.
- `plan_review`: plan quality review plus suggested or applied patches through the existing plan patch path.
- `career_analysis`: race history narrative for the Race Center career panel.
- `analytics_deep_dive`: narrative interpretation for the active analytics report and visible data window.
- `daily_log_patterns`: sleep, fatigue, mood, stress, alcohol, and training-quality pattern analysis from daily logs.

## Data Model Pending

- `races.race_type`: classify goal, tune-up, and bucket races without relying on participation absence or free-form status.
- `activities.plan_workout_id`: link executed activities to planned workouts for planned-vs-actual analytics.
- `runner_profiles.display_name` and `runner_profiles.avatar_url`: replace email-prefix identity in the app bar.

## Nice To Have

- Tweaks panel for density and optional AI visibility once the desktop workflow stabilizes.
