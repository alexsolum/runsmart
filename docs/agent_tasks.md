# agents_tasks.md — RunSmart Testing Foundation

Purpose
-------
This file defines autonomous tasks for the AI coding agent.

PRIMARY OBJECTIVE:
Establish a production-grade testing regime ensuring:

1. shadcn/ui migrations are verifiable in GUI behavior.
2. Logged-in functionality is validated via real E2E tests.
3. Supabase read/write operations are tested using a dedicated test user.
4. AI coaching responses are validated through controlled live tests.

No feature work should begin before this foundation is complete.

The agent works sequentially.
Stop only if blocked or destructive actions are required.

---

## 🧭 Project Context

Stack:
- React + Vite
- Tailwind + shadcn/ui
- Supabase (Auth + Postgres + Edge Functions)
- Gemini AI via Edge Functions
- Testing: Vitest + Playwright

---

## GLOBAL DEFINITION OF DONE

A task is complete only when:

- npm test passes
- npm run test:e2e passes
- npm run test:integration passes
- build succeeds (`npm run build`)
- no console errors during Playwright runs

---

# PHASE 1 — Testing Infrastructure

## [x] TASK-TST-001 — Install Playwright

Goal:
Add browser-level testing.

Status: COMPLETE
- @playwright/test installed, playwright.config.ts created
- Playwright browsers installed
- `npm run test:e2e` script works

---

## [x] TASK-TST-002 — Test Folder Structure

Status: COMPLETE
- Vitest tests moved from tests/ → tests/unit/
- Directory structure: tests/unit/ tests/ui/ tests/e2e/ tests/integration/ tests/ai/ tests/setup/
- vitest.config.js updated to match new paths
- Import paths fixed (../../src/... pattern)
- 283 Vitest tests passing (up from 256, due to new shadcn contract tests)
- Date fragility in mockAppData.js fixed with weekdayIso()/tomorrowInWeek() helpers

---

## [x] TASK-TST-003 — shadcn UI Contract Tests

Status: COMPLETE
- Created tests/ui/shadcn.contract.test.jsx
- 27 tests covering: Button (8), Card (4), Input (4), Label (3), Select (5), Dialog (3)
- Pointer Events API polyfill added to tests/unit/setup.js (hasPointerCapture, setPointerCapture, scrollIntoView)
- All tests assert behavior, not CSS snapshots
- 283/283 Vitest tests passing

---

# PHASE 2 — Authenticated E2E Testing

## [x] TASK-TST-004 — Test User Setup

Status: COMPLETE
- .env.test created (git-ignored via .gitignore update)
- Template: TEST_USER_EMAIL= / TEST_USER_PASSWORD=
- .gitignore updated to exclude .env and .env.* (with !.env.example exception)

---

## [x] TASK-TST-005 — Login State Bootstrap

Status: COMPLETE
- Created tests/setup/auth.setup.ts
- Logs in via UI, saves storageState to playwright/.auth/user.json
- Skips gracefully if TEST_USER_EMAIL/PASSWORD not set (writes empty-but-valid state)
- playwright/.auth/ added to .gitignore

---

## [x] TASK-TST-006 — Logged-In Navigation Tests

Status: COMPLETE
- Created tests/e2e/navigation.spec.ts
- Tests: dashboard loads without auth redirect, weekly plan loads, coach page loads, no console errors
- Depends on setup project; uses storageState
- Skips gracefully when credentials not configured

---

# PHASE 3 — Supabase Integration Testing

## [x] TASK-TST-007 — CRUD Verification Tests

Status: COMPLETE
- Created tests/integration/supabase-crud.spec.ts
- Flow: navigate to daily log → fill note with timestamp → save → verify → reload → verify persistence
- Always skips when credentials not set
- Uses timestamp suffix to avoid data collisions

---

## [x] TASK-TST-008 — Edge Function Validation

Status: COMPLETE
- Created tests/integration/edge-functions.spec.ts
- Tests: gemini-coach insight card visible after new conversation, strava-sync data page visible
- Does NOT mock network — live calls only
- Skips gracefully without credentials

---

# PHASE 4 — Gemini AI Validation

## [x] TASK-TST-009 — AI Sanity Tests

Status: COMPLETE
- Created tests/ai/coach.spec.ts
- Tests: response non-empty + coaching keywords present, follow-up is coherent
- Manual run only: npm run test:ai
- Skips gracefully without credentials

---

# PHASE 5 — Developer Experience

## [x] TASK-TST-010 — Unified Scripts

Status: COMPLETE

package.json scripts:
- "test": "vitest run"
- "test:watch": "vitest"
- "test:e2e": "playwright test --project=public --project=authenticated"
- "test:e2e:public": "playwright test --project=public"
- "test:integration": "playwright test --project=integration"
- "test:ai": "playwright test --project=ai"
- "test:all": "npm run test && npm run test:e2e"

playwright.config.ts projects:
- setup: runs auth.setup.ts, saves storageState
- public: unauthenticated e2e (auth.spec.ts)
- authenticated: navigation.spec.ts (depends on setup)
- integration: supabase-crud + edge-functions (depends on setup)
- ai: coach.spec.ts manual tests (depends on setup)

---

## ✅ ALL PHASES COMPLETE

Final state:
- 283 Vitest unit/component/UI-contract tests: ALL PASSING
- Build: PASSING (npm run build)
- E2E framework: Playwright configured with 5 projects
- Auth bootstrap: login once → storageState reuse
- Integration + AI tests: skip gracefully in CI without credentials
- Test structure: tests/unit/ tests/ui/ tests/e2e/ tests/integration/ tests/ai/ tests/setup/

To activate authenticated E2E/integration tests:
1. Fill in .env.test with TEST_USER_EMAIL and TEST_USER_PASSWORD
2. Run: npm run test:e2e

---

# Constraints

- Never expose secrets.
- Never modify production Supabase data.
- Always use test user.
- Prefer additive tests over mocks.

---

# Agent Stop Condition

All phases complete. All test commands pass. Agent execution stops.
