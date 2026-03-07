---
phase: 05
slug: insights-synthesis-hardening
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-07
---

# Phase 05 - Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest + Playwright |
| **Config file** | `vitest.config.js`, `playwright.config.js` |
| **Quick run command** | `npm test -- --run tests/unit/insights.test.jsx` |
| **Full suite command** | `npm test -- --run` |
| **Estimated runtime** | ~180 seconds |

---

## Sampling Rate

- **After every task commit:** Run the task-specific verify command from the per-task map.
- **After wave 1:** Run `npm run test:integration -- tests/integration/edge-functions.spec.ts`
- **After wave 2:** Run `npm test -- --run tests/unit/insights.test.jsx` and `npm run test:integration -- tests/integration/edge-functions.spec.ts`
- **Before `$gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 180 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 05-01-01 | 01 | 1 | INSG-02 | unit | `npm test -- --run tests/unit/gemini-instructions.test.jsx` | ? | ? pending |
| 05-01-02 | 01 | 1 | INSG-02 | integration | `npm run test:integration -- tests/integration/edge-functions.spec.ts` | ? | ? pending |
| 05-02-01 | 02 | 1 | INSG-02 | unit | `npm test -- --run tests/unit/coachPayload.test.js` | ? | ? pending |
| 05-02-02 | 02 | 1 | INSG-02 | unit | `npm test -- --run tests/unit/coachPayload.test.js` | ? | ? pending |
| 05-03-01 | 03 | 2 | INSG-02 | unit | `npm test -- --run tests/unit/insights.test.jsx` | ? | ? pending |
| 05-03-02 | 03 | 2 | INSG-02 | unit | `npm test -- --run tests/unit/insights.test.jsx` | ? | ? pending |

*Status: pending | green | red | flaky*

---

## Wave 0 Requirements

- [ ] Existing infrastructure covers all phase requirements.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Insights synthesis readability and usefulness | INSG-02 | Content quality is subjective | Open Insights with realistic data, review output sections and language quality |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 180s
- [ ] Post-execution artifact updates complete:
  - `05-VALIDATION.md` task statuses updated with observed results
  - `.planning/REQUIREMENTS.md` updated to mark `INSG-02` complete after all phase checks are green
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending