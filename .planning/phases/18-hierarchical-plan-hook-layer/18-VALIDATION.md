---
phase: 18
slug: hierarchical-plan-hook-layer
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-30
---

# Phase 18 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (existing) |
| **Config file** | `vitest.config.js` (root) |
| **Quick run command** | `npm test -- --run --reporter=verbose --project=components tests/unit/useHierarchicalPlan.test.jsx` |
| **Full suite command** | `npm test -- --run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test -- --run --reporter=verbose --project=components tests/unit/useHierarchicalPlan.test.jsx`
- **After every plan wave:** Run `npm test -- --run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 18-01-01 | 01 | 1 | DATA-02 | unit | `npm test -- --run --project=components tests/unit/useHierarchicalPlan.test.jsx` | ❌ W0 | ⬜ pending |
| 18-01-02 | 01 | 1 | DATA-02 | unit | `npm test -- --run --project=components tests/unit/useHierarchicalPlan.test.jsx` | ❌ W0 | ⬜ pending |
| 18-01-03 | 01 | 1 | DATA-03 | unit | `npm test -- --run --project=components tests/unit/useHierarchicalPlan.test.jsx` | ❌ W0 | ⬜ pending |
| 18-01-04 | 01 | 1 | DATA-03 | unit | `npm test -- --run --project=components tests/unit/useHierarchicalPlan.test.jsx` | ❌ W0 | ⬜ pending |
| 18-01-05 | 01 | 1 | implicit | unit | `npm test -- --run --project=components tests/unit/useHierarchicalPlan.test.jsx` | ❌ W0 | ⬜ pending |
| 18-02-01 | 02 | 2 | implicit | unit | `npm test -- --run` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/unit/useHierarchicalPlan.test.jsx` — stubs for DATA-02, DATA-03, and hook lifecycle
- [ ] `tests/mockAppData.js` — add `hierarchicalPlan` slice to `makeAppData()` fixture

*If none: "Existing infrastructure covers all phase requirements."*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Intake modal pre-fills from existing profile/activities | implicit | UI interaction, no automated form fill test pattern | Open plan page, trigger modal, verify race goal / weekly km / hard days pre-populated |
| 30-60s generation spinner shows coaching messages | implicit | timing-dependent visual state | Trigger plan generation, observe spinner + rotating messages during wait |
| "Replace plan" confirmation shown when plan already exists | implicit | UI conditional flow | With active plan present, open modal, verify confirmation message before submit |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
