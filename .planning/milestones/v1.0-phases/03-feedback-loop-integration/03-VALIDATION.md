---
phase: 3
slug: feedback-loop-integration
status: complete
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-06
updated: 2026-03-06
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
| 3-W0-01 | W0 | 0 | FDBK-01, FDBK-02 | unit | `npm test -- --run tests/unit/gemini-instructions.test.jsx` | ✅ exists | ✅ green |
| 3-01-01 | 01 | 1 | FDBK-01 | unit | `npm test -- --run tests/unit/coach.test.jsx` | ✅ extended | ✅ green |
| 3-01-02 | 01 | 1 | FDBK-01 | unit | `npm test -- --run tests/unit/` | ✅ extended mockAppData | ✅ green |
| 3-02-01 | 02 | 1 | RPLN-03 | unit | `npm test -- --run tests/unit/coach.test.jsx` | ✅ extended | ✅ green |
| 3-02-02 | 02 | 1 | RPLN-03 | unit | `npm test -- --run tests/unit/trainingplan.test.jsx` | ✅ extended | ✅ green |
| 3-03-01 | 03 | 1 | FDBK-02 | unit | `npm test -- --run tests/unit/gemini-instructions.test.jsx` | ✅ exists | ✅ green |
| 3-03-02 | 03 | 1 | FDBK-02 | unit | `npm test -- --run tests/unit/gemini-instructions.test.jsx` | ✅ exists | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `tests/unit/gemini-instructions.test.jsx` — stubs for FDBK-01 (citation mandate), FDBK-02 (methodology requirement clause and koop/bakken weight addendum) — **5 tests, all passing**
- [x] `tests/unit/mockAppData.js` — `SAMPLE_CHECKINS` fixture (3 entries) and `recentCheckins` in `makeAppData` default — **present at line 235 + 311**
- [x] `tests/unit/mockAppData.js` — `adaptation_summary` field in `SAMPLE_PLAN_DATA` — **present in coach.test.jsx local fixture at line 68**

*All three Wave 0 gaps closed during phase execution.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Edge function returns `adaptation_summary` in live replan call | RPLN-03 | Requires deployed edge function with real Gemini response | Trigger a manual long-term replan from LongTermPlanPage; confirm `adaptation_summary` appears in the plan UI above the weekly structure |
| Coach initial insights explicitly cite check-in values | FDBK-01 | Real Gemini response content depends on model behavior | Open Coach page, trigger initial insights with a recent check-in on file; verify at least one insight card body text references fatigue/sleep/motivation scores |
| Absent check-in acknowledged in coach output | FDBK-01 | Requires a real response with no check-in data present | Clear check-in data; trigger initial insights; verify coach acknowledges missing wellness data |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 30s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** complete

---

## Validation Audit 2026-03-06

| Metric | Count |
|--------|-------|
| Gaps found | 0 |
| Resolved | 7 |
| Escalated | 0 |

**Notes:** VALIDATION.md was a stale draft with all tasks in `pending` state. Retroactive audit confirmed all Wave 0 and Wave 1 tasks were completed during phase execution. All 7 test targets exist and pass in the 387-test full suite. No new tests required — status updated from pending to green across the board.
