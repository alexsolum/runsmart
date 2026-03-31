---
phase: 14
slug: planner-primitives-4-week-grid
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-24
---

# Phase 14 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | vitest.config.js |
| **Quick run command** | `npm test -- --run` |
| **Full suite command** | `npm test -- --run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test -- --run`
- **After every plan wave:** Run `npm test -- --run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 14-01-01 | 01 | 1 | GRID-01 | component | `npm test -- --run` | ❌ W0 | ⬜ pending |
| 14-01-02 | 01 | 1 | GRID-02 | component | `npm test -- --run` | ❌ W0 | ⬜ pending |
| 14-01-03 | 01 | 1 | GRID-03 | component | `npm test -- --run` | ❌ W0 | ⬜ pending |
| 14-01-04 | 01 | 1 | GRID-04 | component | `npm test -- --run` | ❌ W0 | ⬜ pending |
| 14-01-05 | 01 | 1 | GRID-05 | component | `npm test -- --run` | ❌ W0 | ⬜ pending |
| 14-01-06 | 01 | 1 | GRID-06 | component | `npm test -- --run` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/planner-grid.test.jsx` — component test stubs for GRID-01 through GRID-06
- [ ] `tests/mockAppData.js` — update with planner grid fixtures if needed

*Existing vitest infrastructure covers framework setup.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Color-coded workout cards match Precision Athlete palette | GRID-03 | Visual color verification | Render grid with intensity/recovery/long-run entries, visually confirm navy/blue/amber |
| Constraint dashed-border styling | GRID-04 | CSS visual check | Render constraint day, confirm dashed border and reason icon visible |
| Race/event gold trophy card prominence | GRID-05 | Visual prominence check | Render race day, confirm gold trophy styling distinct from normal cards |
| Mobile swipe/pager interaction | GRID-01 | Interaction feel | On mobile viewport, swipe between weeks, confirm smooth pager behavior |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
