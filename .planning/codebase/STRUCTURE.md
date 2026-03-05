# Structure

## Top-Level Layout
- `src/` modern React application source.
- `supabase/` Edge Functions and SQL migrations.
- `tests/` unit, ui contract, e2e, integration, and ai tests.
- `public/` runtime config and static assets.
- Legacy/static artifacts remain at root (`app.js`, `styles.css`, `config.js`).

## Source Tree (`src/`)
- `src/main.jsx` app bootstrap.
- `src/App.jsx` shell layout, navigation, auth gate.
- `src/pages/` route-like page components:
  - `AuthPage.jsx`, `HeroPage.jsx`, `LongTermPlanPage.jsx`, `WeeklyPlanPage.jsx`, `CoachPage.jsx`, `InsightsPage.jsx`, `DataPage.jsx`, `DailyLogPage.jsx`, `RoadmapPage.jsx`, `MobilePage.jsx`
- `src/components/` feature and shared UI blocks.
- `src/components/ui/` shadcn/Radix style primitives (`button.jsx`, `dialog.jsx`, `select.jsx`, etc.).
- `src/context/` app context container (`AppDataContext.jsx`).
- `src/hooks/` domain hooks per table/service.
- `src/domain/` pure compute utilities.
- `src/i18n/` translation store and dictionaries.
- `src/config/` runtime configuration loader.
- `src/lib/` low-level helpers (`supabaseClient.js`, `utils.js`).
- `src/styles/` CSS and token files.
- `src/legacy/` legacy markup adapters.

## Backend Tree (`supabase/`)
- `supabase/functions/`
  - `strava-auth/`
  - `strava-sync/`
  - `gemini-coach/`
- `supabase/migrations/`
  - `20260225_runner_profile_and_plan_goal.sql`
  - `20260226_coach_conversations.sql`
  - `20260226_fix_schema_cache.sql`
  - `20260305_coach_playbook_entries.sql`

## Tests Tree (`tests/`)
- `tests/unit/` domain and component unit tests.
- `tests/ui/` UI contract tests.
- `tests/e2e/` public + authenticated navigation/auth flows.
- `tests/integration/` live Supabase and edge-function checks.
- `tests/ai/` AI response sanity tests.
- `tests/setup/` auth and seed setup steps for Playwright projects.

## Important Config Files
- `package.json` scripts and dependency graph.
- `vite.config.mjs` build + base path behavior.
- `vitest.config.js` split Node/jsdom test projects.
- `playwright.config.ts` multi-project test orchestration.
- `vercel.json` deployment config.
- `components.json` shadcn configuration.

## Naming and Organization Patterns
- Hooks follow `useX.js` naming and often reducer-based state transitions.
- Pages use `*Page.jsx`.
- Chart components use descriptive feature names (`TrainingVolumeChart.jsx`, `WeeklyProgressChart.jsx`).
- SQL migrations follow timestamp + description naming.

