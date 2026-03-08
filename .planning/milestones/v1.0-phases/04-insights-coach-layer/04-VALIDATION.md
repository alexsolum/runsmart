---
phase: 4
slug: insights-coach-layer
status: complete
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-06
updated: 2026-03-06
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest + React Testing Library |
| **Config file** | `vitest.config.js` |
| **Quick run command** | `npm test -- --run tests/unit/insights.test.jsx tests/unit/compute.test.js` |
| **Full suite command** | `npm test -- --run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test -- --run tests/unit/insights.test.jsx tests/unit/compute.test.js`
- **After every plan wave:** Run `npm test -- --run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** ~15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 4-01-01 | 01 | 1 | INSG-01 | unit | `npm test -- --run tests/unit/compute.test.js` | ✅ | ✅ green |
| 4-01-02 | 01 | 1 | INSG-01 | unit | `npm test -- --run tests/unit/compute.test.js` | ✅ | ✅ green |
| 4-01-03 | 01 | 1 | INSG-01 | component | `npm test -- --run tests/unit/insights.test.jsx` | ✅ | ✅ green |
| 4-01-04 | 01 | 1 | INSG-01 | component | `npm test -- --run tests/unit/insights.test.jsx` | ✅ | ✅ green |
| 4-02-01 | 02 | 2 | INSG-02 | component | `npm test -- --run tests/unit/gemini-instructions.test.jsx` | ✅ | ✅ green |
| 4-02-02 | 02 | 2 | INSG-02 | component | `npm test -- --run tests/unit/insights.test.jsx` | ✅ | ✅ green |
| 4-02-03 | 02 | 2 | INSG-02 | component | `npm test -- --run tests/unit/insights.test.jsx` | ✅ | ✅ green |
| 4-02-04 | 02 | 2 | INSG-02 | component | `npm test -- --run tests/unit/insights.test.jsx` | ✅ | ✅ green |
| 4-02-05 | 02 | 2 | INSG-02 | component | `npm test -- --run tests/unit/insights.test.jsx` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements.

All test files exist — new test cases were added to existing files during execution. No new test infrastructure was needed. `wave_0_complete: true` because no Wave 0 stub step was required.

Key test evidence:
- `describe("computeTrainingLoadState")` in `compute.test.js` at line 275 — 11 unit tests covering all 4 states, 3 trends, edge cases, return shape
- `describe("Training Load Trend overlay (INSG-01)")` in `insights.test.jsx` at line 157 — 5 component tests
- `describe("Insights — synthesis callout (INSG-02)")` in `insights.test.jsx` at line 225 — 4 component tests
- `it("INSG-02: INSIGHTS_SYNTHESIS_INSTRUCTION_SNIPPET contains synthesis-focused language")` in `gemini-instructions.test.jsx` at line 38

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Synthesis callout fits above fold on mobile (320px width) | INSG-02 | Responsive layout, requires visual inspection | Open InsightsPage on mobile viewport; confirm synthesis + KPI strip both visible without scroll |
| Overlay callout readable below Training Load chart on mobile | INSG-01 | Chart layout, requires visual inspection | Open InsightsPage on mobile; confirm overlay text below chart is not truncated or overlapping |
| Synthesis text is 2-4 sentences (Gemini output quality) | INSG-02 | Requires live Gemini call | Trigger InsightsPage load in production; confirm synthesis paragraph length and coach voice |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 15s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** complete

---

## Validation Audit 2026-03-06

| Metric | Count |
|--------|-------|
| Gaps found | 0 |
| Resolved | 9 |
| Escalated | 0 |

**Notes:** VALIDATION.md was a stale draft with all tasks in `pending` state. Retroactive audit confirmed all tasks completed during phase execution. 64 tests pass across 3 files (`compute.test.js`, `insights.test.jsx`, `gemini-instructions.test.jsx`). No new tests required — statuses updated from pending to green.
