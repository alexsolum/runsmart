---
phase: 19
slug: plan-viewer-ui
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-30
---

# Phase 19 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | `vitest.config.js` |
| **Quick run command** | `npx vitest run tests/unit/trainingplan.test.jsx` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~45 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run tests/unit/trainingplan.test.jsx`
- **After every plan wave:** Run `npx vitest run tests/unit/trainingplan.test.jsx tests/workoutForm.test.jsx tests/unit/useHierarchicalPlan.test.jsx`
- **Before `$gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 45 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 19-01-01 | 01 | 1 | VIEW-01 | component | `npx vitest run tests/unit/trainingplan.test.jsx` | ✅ | ⬜ pending |
| 19-01-02 | 01 | 1 | VIEW-02 | component | `npx vitest run tests/unit/trainingplan.test.jsx` | ✅ | ⬜ pending |
| 19-02-01 | 02 | 2 | VIEW-03 | component | `npx vitest run tests/unit/trainingplan.test.jsx` | ✅ | ⬜ pending |
| 19-02-02 | 02 | 2 | VIEW-04 | component + hook contract | `npx vitest run tests/unit/trainingplan.test.jsx tests/unit/useHierarchicalPlan.test.jsx` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/unit/trainingplan.test.jsx` — add hierarchical-plan viewer coverage for VIEW-01 through VIEW-04
- [ ] `tests/unit/mockAppData.js` — add a realistic `hierarchicalPlan.plan.plan_data` fixture with phases, multiple weeks, empty days, and editable workouts
- [ ] `tests/unit/useHierarchicalPlan.test.jsx` — add explicit patch-shape assertions for Phase 19 workout field edits if the final patch payload shape changes

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Sticky phase bar remains visible and usable while scrolling a long plan on desktop and mobile | VIEW-01 | Scroll and sticky behavior is device/layout-sensitive and hard to assert reliably in current unit coverage | Run the app, open the training plan page with a generated hierarchical plan, scroll several weeks down on desktop and a narrow mobile viewport, and confirm the phase bar stays visible and jump navigation still works |
| Initial landing focuses the first current-or-upcoming week without a jarring jump | VIEW-02 | The desired behavior is partly editorial and depends on real viewport height and plan length | Load a plan where the current week is below the first viewport and verify the page lands near the first current/upcoming week without overscrolling or hiding the summary band |
| Workout detail modal feels correct across desktop dialog and mobile drawer modes | VIEW-03 | Responsive interaction and focus behavior differ by breakpoint | Open a workout card on desktop and mobile widths, verify summary-first mode, focus/close behavior, and the completion action |
| Editing a workout from the modal updates the visible grid immediately and preserves surrounding scroll position | VIEW-04 | Visual continuity and scroll retention are easier to confirm manually than with current unit tests | Open a workout in a mid-plan week, edit sport/type/name/description/duration/distance, save, and confirm the grid updates in place without a page reload |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 45s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
