---
phase: 15
slug: click-to-edit-workflow-fab
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-24
---

# Phase 15 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest + React Testing Library |
| **Config file** | `vitest.config.js` |
| **Quick run command** | `npm test -- --run tests/weeklyplan.test.jsx` |
| **Full suite command** | `npm test -- --run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test -- --run tests/weeklyplan.test.jsx`
- **After every plan wave:** Run `npm test -- --run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 15-xx-01 | TBD | 0 | EDIT-01 | UI | `npm test -- --run tests/weeklyplan.test.jsx` | ❌ W0 | ⬜ pending |
| 15-xx-02 | TBD | 0 | EDIT-02 | UI | `npm test -- --run tests/weeklyplan.test.jsx` | ❌ W0 | ⬜ pending |
| 15-xx-03 | TBD | 0 | EDIT-03 | Unit/UI | `npm test -- --run tests/weeklyplan.test.jsx` | ❌ W0 | ⬜ pending |
| 15-xx-04 | TBD | 0 | EDIT-04 | Unit/UI | `npm test -- --run tests/weeklyplan.test.jsx` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

> Task IDs will be finalized after planning. Update this table once PLAN.md files are created.

---

## Wave 0 Requirements

- [ ] `src/hooks/useScrollDirection.js` — stub + tests for FAB scroll behavior (EDIT-02)
- [ ] `src/components/ui/ResponsiveModal.jsx` — stub for responsive dialog/drawer wrapper (EDIT-01, EDIT-02)
- [ ] `src/components/ui/Drawer.jsx` — `vaul` installation and drawer setup (EDIT-01, EDIT-02)
- [ ] `tests/weeklyplan.test.jsx` — extend with edit modal, FAB, completion toggle, and delete tests

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| FAB hides on scroll-down, reappears on scroll-up | EDIT-02 | Requires real scroll events on a mobile viewport — jsdom doesn't simulate scroll direction | Open planner on mobile viewport, scroll down 100px, verify FAB hidden; scroll up, verify FAB visible |
| Drawer swipe-to-dismiss on mobile | EDIT-01 | Touch gesture simulation not reliable in jsdom | Open edit modal on mobile, swipe drawer down, verify it closes |
| Virtual keyboard doesn't cover inputs | EDIT-01, EDIT-02 | Requires real mobile device or emulation | Open form on iOS/Android, focus a text input, verify form fields remain visible above keyboard |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
