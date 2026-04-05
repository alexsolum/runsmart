# Debug Session: CoachFAB Missing On Training Plan

## Symptom

During Phase 21 UAT, the user reported: "There is no CoachFAB on the training plan page".

Expected behavior:
- The training plan page exposes the contextual coaching entry point so a conversation can continue across Coach page and Training Plan.

## Investigation

Reviewed the Phase 21 summaries and the current implementation:

- `src/components/CoachFAB.jsx` exists and renders the floating button plus chat overlay.
- `src/pages/LongTermPlanPage.jsx` imports `CoachFAB` and mounts it at the end of the page.
- The mount is guarded by `hierarchicalPlan.plan && (...)`.
- Earlier in the same page, when `hierarchicalPlan.plan === null`, the UI renders the "No training plan yet" empty state and only shows a "Generate Plan" button.

## Root Cause

`LongTermPlanPage` only renders `CoachFAB` when a generated hierarchical plan object exists. In the user's current empty-plan state, `hierarchicalPlan.plan` is null, so the FAB is never mounted at all. That makes the cross-surface coach entry point unavailable precisely when the user has not yet generated a plan.

## Evidence

- `src/pages/LongTermPlanPage.jsx`: `CoachFAB` is wrapped in `{hierarchicalPlan.plan && (...)}`.
- `src/pages/LongTermPlanPage.jsx`: empty-plan branch renders "No training plan yet" and no alternative coach entry point.
- `src/components/CoachFAB.jsx`: component implementation itself exists; absence is caused by parent gating, not missing component code.

## Fix Direction

- Relax the mount condition so the FAB can render on the training plan page even when no hierarchical plan exists yet, or
- explicitly redefine the product behavior and UAT expectation so the FAB is unavailable until a plan has been generated.

If the intended UX is cross-surface conversation continuity, the safer fix is:
- render the FAB whenever the training plan page is available to the signed-in user,
- pass nullable plan context into `ChatPanel`,
- disable patch-application actions or show a "generate a plan first" explanation when plan-specific changes are requested.
