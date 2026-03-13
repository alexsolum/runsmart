---
phase: 11
slug: constraint-aware-weekly-plans
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-03-13
---

# Phase 11 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest + Playwright |
| **Config file** | `vitest.config.js`, `playwright.config.ts` |
| **Quick run command** | `npm test -- --run tests/unit/coachPayload.test.js tests/unit/weeklyplan.test.jsx` |
| **Full suite command** | `npm test -- --run tests/unit/coachPayload.test.js tests/unit/weeklyplan.test.jsx tests/unit/gemini-instructions.test.jsx && npx playwright test tests/integration/edge-functions.spec.ts` |
| **Estimated runtime** | ~45 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test -- --run tests/unit/coachPayload.test.js tests/unit/weeklyplan.test.jsx`
- **After every plan wave:** Run `npm test -- --run tests/unit/coachPayload.test.js tests/unit/weeklyplan.test.jsx tests/unit/gemini-instructions.test.jsx && npx playwright test tests/integration/edge-functions.spec.ts`
- **Before `$gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 45 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 11-01-01 | 01 | 1 | WCON-01 | component | `npm test -- --run tests/unit/weeklyplan.test.jsx` | ✅ | ⬜ pending |
| 11-01-02 | 01 | 1 | WCON-01 | unit | `npm test -- --run tests/unit/coachPayload.test.js` | ✅ | ⬜ pending |
| 11-02-01 | 02 | 2 | WCON-01, WCON-02 | unit | `npm test -- --run tests/unit/gemini-instructions.test.jsx tests/unit/coachPayload.test.js` | ✅ | ⬜ pending |
| 11-02-02 | 02 | 2 | WCON-02 | integration | `npx playwright test tests/integration/edge-functions.spec.ts` | ✅ | ⬜ pending |
| 11-03-01 | 03 | 3 | WCON-03 | unit | `npm test -- --run tests/unit/useWorkoutEntries.test.js` | ❌ W0 | ⬜ pending |
| 11-03-02 | 03 | 3 | WCON-03 | unit | `npm test -- --run tests/unit/useWorkoutEntries.test.js` | ❌ W0 | ⬜ pending |
| 11-03-03 | 03 | 3 | WCON-03 | component | `npm test -- --run tests/unit/weeklyplan.test.jsx tests/unit/useWorkoutEntries.test.js` | ❌ W0 | ⬜ pending |
| 11-04-01 | 04 | 4 | WCON-01, WCON-02, WCON-03 | regression | `npm test -- --run tests/unit/coachPayload.test.js tests/unit/weeklyplan.test.jsx tests/unit/gemini-instructions.test.jsx tests/unit/useWorkoutEntries.test.js && npx playwright test tests/integration/edge-functions.spec.ts` | ❌ W0 | ⬜ pending |
| 11-04-02 | 04 | 4 | WCON-01, WCON-02, WCON-03 | regression | `npm test -- --run tests/unit/coachPayload.test.js tests/unit/weeklyplan.test.jsx tests/unit/gemini-instructions.test.jsx tests/unit/useWorkoutEntries.test.js && npx playwright test tests/integration/edge-functions.spec.ts` | ❌ W0 | ⬜ pending |
| 11-04-03 | 04 | 4 | WCON-01, WCON-02, WCON-03 | audit | local inspection of `.planning/phases/11-constraint-aware-weekly-plans/11-VERIFICATION.md` after the executed commands above | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/unit/useWorkoutEntries.test.js` — add hook-level protection and overwrite-policy tests
- [ ] Shared test helpers for protected-day metadata fixtures, if current `mockAppData` coverage is insufficient

*If none: "Existing infrastructure covers all phase requirements."*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Compact constraint setup feels lightweight in `Ukeplan` | WCON-01 | Product judgment on density and clarity | Open `Ukeplan`, inspect the AI setup surface on desktop and mobile, and confirm constraints remain compact and understandable without turning into a heavy planner form. |
| Review-before-write flow is understandable for protected days | WCON-03 | UX comprehension and override clarity | Manually edit a day, regenerate the week, and confirm the review/override language makes the consequence of preserving vs replacing protected days obvious. |
| Explanation summary reads like coaching, not a rule dump | WCON-02 | Tone and usefulness are subjective | Generate a week with conflicting preferences and confirm the summary near the week header explains moved sessions and relaxed preferences in normal coaching language. |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 45s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
