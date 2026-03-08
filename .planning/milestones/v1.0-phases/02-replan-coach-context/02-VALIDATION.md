---
phase: 02
slug: replan-coach-context
status: ready
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-05
updated: 2026-03-05
---

# Phase 02 - Validation Strategy

Per-phase validation contract for feedback sampling during execution.

## Test Infrastructure

| Property | Value |
|----------|-------|
| Framework | Vitest + Playwright |
| Config file | `vitest.config.js`, `playwright.config.ts` |
| Quick run command | `npm run test -- tests/unit/coach.test.jsx tests/unit/trainingplan.test.jsx tests/unit/weeklyplan.test.jsx` |
| Full suite command | `npm run test:all` |
| Estimated quick runtime | ~20-60s (local) |

## Sampling Rate

- After every task commit: run task-mapped automated command from the table below.
- After every plan wave: run `npm run test:all`.
- Before `$gsd-verify-work`: run `npm run test:all` and require green.
- Max feedback latency target: <=10 minutes per task cycle.

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 02-01-01 | 01 | 1 | PHIL-03 | integration | `npm run test:integration -- tests/integration/edge-functions.spec.ts` | yes | planned |
| 02-01-02 | 01 | 1 | PHIL-03 | integration | `npm run test:integration -- tests/integration/edge-functions.spec.ts` | yes | planned |
| 02-01-03 | 01 | 1 | RPLN-02, PHIL-03 | integration | `npm run test:integration -- tests/integration/edge-functions.spec.ts` | yes | planned |
| 02-02-01 | 02 | 1 | RPLN-02 | unit | `npm run test -- tests/unit/coach.test.jsx` | yes | planned |
| 02-02-02 | 02 | 1 | RPLN-02, PHIL-03 | unit | `npm run test -- tests/unit/coach.test.jsx` | yes | planned |
| 02-02-03 | 02 | 1 | RPLN-02 | unit | `npm run test -- tests/unit/coach.test.jsx` | yes | planned |
| 02-03-01 | 03 | 2 | RPLN-01 | unit | `npm run test -- tests/unit/trainingplan.test.jsx tests/unit/weeklyplan.test.jsx` | yes | planned |
| 02-03-02 | 03 | 2 | RPLN-01, RPLN-02 | unit | `npm run test -- tests/unit/trainingplan.test.jsx tests/unit/weeklyplan.test.jsx` | yes | planned |
| 02-03-03 | 03 | 2 | RPLN-01, RPLN-02, PHIL-03 | unit | `npm run test -- tests/unit/trainingplan.test.jsx tests/unit/weeklyplan.test.jsx` | yes | planned |

Status legend: `planned`, `green`, `red`, `flaky`.

## Sampling Continuity Check

- Wave 1 sequence (02-01-01 .. 02-02-03): 6/6 tasks include automated verification; every 3-task window has >=2 automated tasks.
- Wave 2 sequence (02-03-01 .. 02-03-03): 3/3 tasks include automated verification; every 3-task window has >=2 automated tasks.

## Wave 0 Requirements

Wave 0 bootstrap is not required for this phase.

- Existing framework/scripts already present in `package.json` (`test`, `test:integration`, `test:all`).
- Required config files already present: `vitest.config.js`, `playwright.config.ts`.
- All mapped test targets already exist:
  - `tests/integration/edge-functions.spec.ts`
  - `tests/unit/coach.test.jsx`
  - `tests/unit/trainingplan.test.jsx`
  - `tests/unit/weeklyplan.test.jsx`

## Manual-Only Verifications

None. All planned implementation tasks in this phase have automated verification commands.

## Validation Sign-Off

- [x] All implementation tasks have `<automated>` verification or explicit Wave 0 dependency.
- [x] Sampling continuity satisfied: no 3-task window with fewer than 2 automated verifications.
- [x] Wave 0 decisions documented and no missing bootstrap references remain.
- [x] Commands use non-watch execution paths.
- [x] `nyquist_compliant: true` is justified by the current plan artifacts.

Approval: approved 2026-03-05
