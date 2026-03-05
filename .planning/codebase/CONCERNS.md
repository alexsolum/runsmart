# Concerns

## High-Priority Concerns

## 1) Dual frontend implementations increase drift risk
- Evidence:
  - Modern app runtime: `index.html` -> `src/main.jsx`.
  - Legacy monolith still present: `app.js` (large, direct DOM + direct fetch + direct Supabase usage).
- Risk:
  - Fixes may be applied in one frontend path but not the other.
  - Contributors may edit the wrong implementation.
- Suggested direction:
  - Declare legacy path deprecated and remove or archive once parity is verified.

## 2) Schema reference mismatch across code and SQL docs
- Evidence:
  - `supabase-schema.sql` defines `weekly_plan_entries`.
  - Active hook `src/hooks/useWorkoutEntries.js` reads/writes `workout_entries`.
  - Additional newer tables are used in code but not represented in the base schema document.
- Risk:
  - Local setup from `supabase-schema.sql` may not match current runtime expectations.
  - Increased onboarding and migration failure probability.
- Suggested direction:
  - Treat migrations in `supabase/migrations/*.sql` as source of truth and regenerate base schema docs.

## 3) Auth boundary is partly code-enforced for `gemini-coach`
- Evidence:
  - `supabase/functions/gemini-coach/config.toml` has `verify_jwt = false`.
  - Function still performs bearer token validation in code.
- Risk:
  - Gateway-level auth disabled can be misread as public endpoint by future maintainers.
  - Security posture depends entirely on application logic.
- Suggested direction:
  - Document rationale clearly and add tests that assert unauthorized requests are rejected.

## Medium-Priority Concerns

## 4) No explicit lint/format guardrails
- Evidence:
  - No ESLint/Prettier configs discovered at repo root.
- Risk:
  - Inconsistent style and avoidable defects in a mixed JS/TS codebase.

## 5) Encoding anomalies in source/comments
- Evidence:
  - Several files display mojibake artifacts in comments/strings (example outputs from `README.md` and edge-function comments).
- Risk:
  - Potential UI text corruption and lower maintainability.

## 6) Test strategy depends on live services for integration confidence
- Evidence:
  - Playwright integration/AI tests are networked/live.
- Risk:
  - Harder deterministic CI stability and potentially slower feedback loops.

## Lower-Priority Concerns

## 7) Incomplete architecture cleanup from migration phases
- Evidence:
  - Root-level legacy files (`config.js`, `styles.css`, `app.js`) alongside current Vite React app.
  - Duplicate deployment guidance references across README sections.
- Risk:
  - Documentation and structure ambiguity during future refactors.

## 8) Frontend remains untyped while backend edge code is typed
- Risk:
  - Contract breakage between UI and data layers is easier to miss at compile time.

## Immediate Mitigation Candidates
- Freeze legacy `app.js` (read-only/deprecated note).
- Reconcile canonical schema docs with migrations and active table usage.
- Add linting and a minimal type-safety path (JSDoc or incremental TS adoption).
- Add explicit security notes/tests for `gemini-coach` auth behavior.

