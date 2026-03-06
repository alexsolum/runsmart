---
phase: 3
slug: feedback-loop-integration
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-06
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3.x + React Testing Library |
| **Config file** | `vitest.config.js` |
| **Quick run command** | `npm test -- --run --reporter=dot` |
| **Full suite command** | `npm test -- --run` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test -- --run --reporter=dot`
- **After every plan wave:** Run `npm test -- --run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 3-W0-01 | W0 | 0 | FDBK-01, FDBK-02 | unit | `npm test -- --run tests/unit/gemini-instructions.test.js` | ❌ W0 | ⬜ pending |
| 3-01-01 | 01 | 1 | FDBK-01 | unit | `npm test -- --run tests/unit/coach.test.jsx` | ✅ extend | ⬜ pending |
| 3-01-02 | 01 | 1 | FDBK-01 | unit | `npm test -- --run tests/unit/` | ✅ extend mockAppData | ⬜ pending |
| 3-02-01 | 02 | 1 | RPLN-03 | unit | `npm test -- --run tests/unit/coach.test.jsx` | ✅ extend | ⬜ pending |
| 3-02-02 | 02 | 1 | RPLN-03 | unit | `npm test -- --run tests/unit/trainingplan.test.jsx` | ✅ extend | ⬜ pending |
| 3-03-01 | 03 | 1 | FDBK-02 | unit | `npm test -- --run tests/unit/gemini-instructions.test.js` | ❌ W0 | ⬜ pending |
| 3-03-02 | 03 | 1 | FDBK-02 | unit | `npm test -- --run tests/unit/gemini-instructions.test.js` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/unit/gemini-instructions.test.js` — stubs for FDBK-01 (citation mandate), FDBK-02 (methodology requirement clause and koop/bakken weight addendum)
- [ ] `tests/unit/mockAppData.js` — add `SAMPLE_CHECKINS` fixture (3 entries) and `recentCheckins` to `makeAppData` default
- [ ] `tests/unit/mockAppData.js` — add `adaptation_summary` field to `SAMPLE_PLAN_DATA` and `SAMPLE_LONG_TERM_DATA`

*Three test infrastructure gaps must be closed before phase plans can pass automated verification.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Edge function returns `adaptation_summary` in live replan call | RPLN-03 | Requires deployed edge function with real Gemini response | Trigger a manual long-term replan from LongTermPlanPage; confirm `adaptation_summary` appears in the plan UI above the weekly structure |
| Coach initial insights explicitly cite check-in values | FDBK-01 | Real Gemini response content depends on model behavior | Open Coach page, trigger initial insights with a recent check-in on file; verify at least one insight card body text references fatigue/sleep/motivation scores |
| Absent check-in acknowledged in coach output | FDBK-01 | Requires a real response with no check-in data present | Clear check-in data; trigger initial insights; verify coach acknowledges missing wellness data |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
