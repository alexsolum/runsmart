# Conventions

## Code Style Patterns
- Frontend uses JavaScript + JSX (not TypeScript) under `src/`.
- Predominant React style: function components + hooks.
- Hook modules often use `useReducer` with explicit action strings (`pending`, `loaded`, `error`, etc.).
- Edge functions use TypeScript with explicit interfaces and helper utilities.

## State Management Conventions
- Domain-local state in each hook, returned as `{data, loading, error, success, actions...}`.
- App-wide composition in `src/context/AppDataContext.jsx`.
- Lazy/conditional loading based on authenticated `userId`.

## Data Access Conventions
- Supabase client access centralized via `getSupabaseClient()` in `src/lib/supabaseClient.js`.
- Domain hooks map roughly one-to-one with table aggregates (plans, activities, blocks, workout entries).
- Query ordering conventions:
  - Most recent first for activity feeds/conversations.
  - Ascending date order where timeline rendering is required.

## Error Handling Patterns
- Hooks usually capture and expose errors in state.
- Most write actions throw upstream errors after state update.
- UI-level handlers in pages/components decide user messaging.
- Edge functions return JSON objects with `error` details and HTTP status codes.

## Auth and Session Conventions
- Session-first pattern:
  - read active session from Supabase client
  - pass bearer token to Edge Functions
- In edge runtime, tokens are revalidated with `supabase.auth.getUser`.

## i18n Conventions
- Translation keys are flat strings (`"nav.trainingPlan"`, `"coach.aiLoading"`).
- `t(key)` fallback chain: current language -> English -> raw key.
- Language persisted in `localStorage` key `runsmart-lang`.

## UI Conventions
- Component naming:
  - Pages: `*Page.jsx`
  - Widgets: descriptive noun (`MiniBarChart`, `KoopTimeline`, `CoachAvatar`)
  - Primitive controls under `src/components/ui/`
- Utility-class-heavy JSX with occasional custom app-shell classes in `src/App.jsx`.

## Test Conventions
- Unit compute tests isolated in Node environment.
- Component/UI tests use jsdom and shared setup in `tests/unit/setup.js`.
- Playwright project dependencies enforce auth/setup/seed order.

## Gaps in Conventions
- No ESLint/Prettier config found in root, so formatting/linting conventions are implicit.
- Mixed old/new architecture (`app.js` + React app) creates inconsistent coding patterns.
- Some text encoding artifacts appear in comments/strings, suggesting file encoding inconsistency.

