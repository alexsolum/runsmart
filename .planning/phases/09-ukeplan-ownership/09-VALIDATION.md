---
phase: 9
slug: ukeplan-ownership
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-13
---

# Phase 9 - Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | `vitest.config.js` |
| **Quick run command** | `npm test -- --run tests/unit/weeklyplan.test.jsx tests/unit/trainingplan.test.jsx` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~20 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test -- --run tests/unit/weeklyplan.test.jsx tests/unit/trainingplan.test.jsx`
- **After every plan wave:** Run `npm test`
- **Before `$gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 09-01-01 | 01 | 1 | UKE-01 | unit | `npm test -- --run tests/unit/weeklyplan.test.jsx` | ✅ | ⬜ pending |
| 09-01-02 | 01 | 1 | UKE-01 | unit | `npm test -- --run tests/unit/weeklyplan.test.jsx` | ✅ | ⬜ pending |
| 09-01-03 | 01 | 1 | UKE-01 | unit | `npm test -- --run tests/unit/weeklyplan.test.jsx` | ✅ | ⬜ pending |
| 09-02-01 | 02 | 2 | UKE-02 | unit | `npm test -- --run tests/unit/trainingplan.test.jsx` | ✅ | ⬜ pending |
| 09-02-02 | 02 | 2 | UKE-02 | unit | `npm test -- --run tests/unit/trainingplan.test.jsx tests/unit/weeklyplan.test.jsx` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Existing infrastructure covers all phase requirements.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Handoff from `Treningsplan` into `Ukeplan` feels like a single weekly-planning workflow | UKE-02 | Copy, hierarchy, and visual ownership are easier to judge in-browser than in jsdom | Open both pages, confirm `Treningsplan` only frames intent and the actionable generation control lives in `Ukeplan` |
| Replace confirmation communicates overwrite scope clearly | UKE-01 | The confirmation text and user expectation are UX-sensitive | Populate a week, trigger AI generation from `Ukeplan`, confirm overwrite warning appears before entries are replaced |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
