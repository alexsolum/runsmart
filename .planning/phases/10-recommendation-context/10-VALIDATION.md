---
phase: 10
slug: recommendation-context
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-13
---

# Phase 10 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 3.x + Playwright |
| **Config file** | `vite.config.mjs` |
| **Quick run command** | `npm test -- --run tests/unit/coachPayload.test.js tests/unit/weeklyplan.test.jsx tests/unit/gemini-instructions.test.jsx` |
| **Full suite command** | `npm test -- --run tests/unit/coachPayload.test.js tests/unit/weeklyplan.test.jsx tests/unit/gemini-instructions.test.jsx tests/integration/edge-functions.spec.ts` |
| **Estimated runtime** | ~45 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test -- --run tests/unit/coachPayload.test.js tests/unit/weeklyplan.test.jsx tests/unit/gemini-instructions.test.jsx`
- **After every plan wave:** Run `npm test -- --run tests/unit/coachPayload.test.js tests/unit/weeklyplan.test.jsx tests/unit/gemini-instructions.test.jsx tests/integration/edge-functions.spec.ts`
- **Before `$gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 45 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 10-01-01 | 01 | 1 | WREC-01, WREC-02 | unit | `npm test -- --run tests/unit/coachPayload.test.js tests/unit/weeklyplan.test.jsx` | ✅ | ⬜ pending |
| 10-01-02 | 01 | 1 | WREC-01, WREC-02 | unit | `npm test -- --run tests/unit/coachPayload.test.js tests/unit/weeklyplan.test.jsx` | ✅ | ⬜ pending |
| 10-01-03 | 01 | 1 | WREC-01, WREC-02 | unit | `npm test -- --run tests/unit/coachPayload.test.js tests/unit/weeklyplan.test.jsx` | ✅ | ⬜ pending |
| 10-02-01 | 02 | 2 | WREC-01, WREC-02, WREC-03, WREC-04 | unit + integration | `npm test -- --run tests/unit/gemini-instructions.test.jsx tests/integration/edge-functions.spec.ts` | ✅ | ⬜ pending |
| 10-02-02 | 02 | 2 | WREC-03, WREC-04 | unit | `npm test -- --run tests/unit/gemini-instructions.test.jsx` | ✅ | ⬜ pending |
| 10-02-03 | 02 | 2 | WREC-01, WREC-02, WREC-03, WREC-04 | integration + unit | `npm test -- --run tests/unit/weeklyplan.test.jsx tests/integration/edge-functions.spec.ts` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Setup summary shows the same selected-week intent values that drive generation in `Ukeplan` | WREC-01, WREC-02 | Automated tests cover payload and render assertions, but a quick page check is still useful for final wording and coherence | Open `Ukeplan`, navigate to a non-current planned week, verify week type/target km/notes shown in setup summary match the generated-week context. |
| Philosophy-driven override explains itself in coaching language | WREC-03, WREC-04 | The exact text quality of the rationale is easier to judge manually than with snapshot assertions | Trigger a plan generation scenario where philosophy red lines alter the recommendation and confirm the coaching feedback briefly explains the adjustment. |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 60s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
