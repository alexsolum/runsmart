---
phase: 4
slug: insights-coach-layer
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-06
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
| 4-01-01 | 01 | 1 | INSG-01 | unit | `npm test -- --run tests/unit/compute.test.js` | ✅ | ⬜ pending |
| 4-01-02 | 01 | 1 | INSG-01 | unit | `npm test -- --run tests/unit/compute.test.js` | ✅ | ⬜ pending |
| 4-01-03 | 01 | 1 | INSG-01 | component | `npm test -- --run tests/unit/insights.test.jsx` | ✅ | ⬜ pending |
| 4-01-04 | 01 | 1 | INSG-01 | component | `npm test -- --run tests/unit/insights.test.jsx` | ✅ | ⬜ pending |
| 4-02-01 | 02 | 2 | INSG-02 | component | `npm test -- --run tests/unit/gemini-instructions.test.jsx` | ✅ | ⬜ pending |
| 4-02-02 | 02 | 2 | INSG-02 | component | `npm test -- --run tests/unit/insights.test.jsx` | ✅ | ⬜ pending |
| 4-02-03 | 02 | 2 | INSG-02 | component | `npm test -- --run tests/unit/insights.test.jsx` | ✅ | ⬜ pending |
| 4-02-04 | 02 | 2 | INSG-02 | component | `npm test -- --run tests/unit/insights.test.jsx` | ✅ | ⬜ pending |
| 4-02-05 | 02 | 2 | INSG-02 | component | `npm test -- --run tests/unit/insights.test.jsx` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements.

All test files exist — new test cases are added to existing files, not new files. No new test infrastructure needed.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Synthesis callout fits above fold on mobile (320px width) | INSG-02 | Responsive layout, requires visual inspection | Open InsightsPage on mobile viewport; confirm synthesis + KPI strip both visible without scroll |
| Overlay callout readable below Training Load chart on mobile | INSG-01 | Chart layout, requires visual inspection | Open InsightsPage on mobile; confirm overlay text below chart is not truncated or overlapping |
| Synthesis text is 2-4 sentences (Gemini output quality) | INSG-02 | Requires live Gemini call | Trigger InsightsPage load in staging; confirm synthesis paragraph length |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
