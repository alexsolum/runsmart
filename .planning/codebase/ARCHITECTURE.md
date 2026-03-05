# Architecture

## High-Level Pattern
- Single-page React application with client-side state orchestration.
- Backend-as-a-service architecture via Supabase.
- Sensitive and third-party API operations are routed through Supabase Edge Functions.
- Domain computation is mostly isolated in pure helpers in `src/domain/compute.js`.

## Frontend Layering
- Entry: `src/main.jsx`.
- Root composition: `src/App.jsx`.
- App-wide state boundary: `src/context/AppDataContext.jsx`.
- Data-access layer: custom hooks in `src/hooks/`.
- Presentation layer:
  - page components in `src/pages/`
  - reusable visual components in `src/components/`
  - UI primitives in `src/components/ui/`

## Data Flow
1. User authenticates via Supabase (`useAuth`).
2. AppDataProvider builds feature hooks using `userId`.
3. UI pages call hook actions (load/create/update/delete).
4. Hooks read/write Supabase tables or call Edge Functions.
5. Domain computations transform activity data for dashboards and plans.

## Key Architectural Decisions
- Hook-per-domain pattern for isolated CRUD concerns.
- Reducer-based local state in many hooks (predictable pending/loaded/error transitions).
- Serverless function boundary for:
  - Strava token exchange and sync
  - Gemini prompt construction and model calling
- Local i18n store via `useSyncExternalStore` in `src/i18n/translations.js`.

## Coach Subsystem Architecture
- UI orchestration: `src/pages/CoachPage.jsx`.
- Conversation persistence: `src/hooks/useCoachConversations.js` with `coach_conversations` + `coach_messages`.
- AI inference endpoint: `supabase/functions/gemini-coach/index.ts`.
- Dynamic playbook overlay from DB table `coach_playbook_entries`.

## Planning Subsystem Architecture
- Long-term plan object persists in `training_plans`.
- Week-level plan edits persisted in `workout_entries` (current hook usage) and historically `weekly_plan_entries` (legacy references exist).
- Compute logic (blocks, weekly calendar, load) in `src/domain/compute.js`.

## Coexisting Legacy Architecture
- Legacy monolithic DOM script still present in `app.js` with direct Supabase and fetch usage.
- Modern React app in `src/` appears to be active runtime (`index.html` -> `src/main.jsx`).
- Legacy presence increases maintenance surface and potential divergence.

## Entry Points and Runtime Boundaries
- Browser app: `index.html` + `src/main.jsx`.
- Edge runtime: `supabase/functions/*/index.ts`.
- Test runtime:
  - Vitest for unit/component
  - Playwright for e2e/integration/ai projects

