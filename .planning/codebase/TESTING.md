# Testing

## Test Stack
- Unit/component runner: Vitest (`vitest.config.js`).
- DOM assertions: React Testing Library + `@testing-library/jest-dom`.
- Browser/e2e/integration runner: Playwright (`playwright.config.ts`).

## Test Suites by Layer
- Pure compute logic:
  - `tests/unit/compute.test.js` (Node environment).
- Component and UI contract:
  - `tests/unit/**/*.test.jsx`
  - `tests/ui/**/*.test.jsx`
- E2E:
  - `tests/e2e/auth.spec.ts`
  - `tests/e2e/navigation.spec.ts`
  - `tests/e2e/dashboard.spec.ts`
- Integration (live backend behavior):
  - `tests/integration/supabase-crud.spec.ts`
  - `tests/integration/edge-functions.spec.ts`
- AI/live behavior:
  - `tests/ai/coach.spec.ts`

## Playwright Project Orchestration
- `setup` project logs in and saves storage state.
- `seed` project seeds data after setup.
- `authenticated` depends on `seed`.
- `integration` depends on `seed`.
- `ai` depends on `setup`.
- All configured in `playwright.config.ts` with single-worker execution.

## Environment Assumptions
- `.env.test` expected for test credentials.
- Local app server launched through `webServer.command = npm run dev`.
- Live integration tests require reachable Supabase project and valid test user.

## Test Setup Utilities
- `tests/unit/setup.js` includes pointer/scroll polyfills for Radix UI compatibility in jsdom.
- `tests/setup/auth.setup.ts` and `tests/setup/seed.setup.ts` prepare authenticated test context.

## Coverage Observations
- Strong presence of component tests for major pages and layouts.
- Integration and edge-function tests exist (good for regressions around backend contracts).
- No explicit coverage tooling/report config found.
- No explicit snapshot testing framework in use.

## Risk Areas with Limited Test Signals
- Legacy `app.js` appears largely untested by current React-oriented suites.
- Mixed table naming/schema drift risks (example: `weekly_plan_entries` vs `workout_entries`) need integration assertions tied to current schema.
- AI outputs are validated by smoke/sanity patterns, not deterministic golden tests.

## Recommended Next Testing Improvements
- Add CI-enforced lint + type checks (or JSDoc/type tests) before e2e.
- Add targeted tests around migration/schema compatibility for all referenced tables.
- Add contract tests for edge-function auth behavior when JWT is invalid/missing.
- Add regression tests covering i18n language switch and encoding-sensitive text paths.

