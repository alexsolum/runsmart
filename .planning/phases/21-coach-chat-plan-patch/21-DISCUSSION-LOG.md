# Phase 21: Coach Chat + Plan Patch - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-31
**Phase:** 21-Coach Chat + Plan Patch
**Areas discussed:** UI & Workflow Integration, Context Injection Strategy, Legacy Transition & Data Cleanliness, Coach Personality & Capability

---

## UI & Workflow Integration

| Option | Description | Selected |
|--------|-------------|----------|
| Standalone Page | Keep Coach as a standalone page for deep history and focus. | |
| Plan Contextual | Move to LongTermPlanPage (sidebar/FAB) for contextual editing. | |
| Hybrid | Standalone Page for history, Sidebar on Plan for tweaking. | ✓ |

**User's choice:** Hybrid
**Notes:** Provides both a focused chat experience and a contextual one while viewing the plan.

---

## Patch Proposal & Review Workflow

| Option | Description | Selected |
|--------|-------------|----------|
| Chat-Only Card | Show a list of changes in chat with an 'Apply' button. | ✓ |
| Visual Diff on Grid | Chat card + highlight the affected days on the plan grid. | |
| Full Preview Mode | Full 'Draft' mode: show the whole plan with proposed changes. | |

**User's choice:** Chat-Only Card
**Notes:** Keeps the initial implementation focused on the conversational flow and simplicity.

---

## Context Injection Strategy (Plan Window)

| Option | Description | Selected |
|--------|-------------|----------|
| Full Plan | Send the entire active plan. | |
| Focused Future | Send current week + 4 weeks ahead. | |
| Full Window | Send last 2 weeks + next 4 weeks. | ✓ |

**User's choice:** Full Window (+/- weeks)
**Notes:** Gives Claude enough context about recent adherence and upcoming volume to make smart decisions.

---

## Legacy Transition

| Option | Description | Selected |
|--------|-------------|----------|
| Redirect | Point legacy tab to the new system. | |
| Remove Tab | Remove the tab entirely; the Planner page is the new home. | ✓ |
| Repurpose | Keep it as an 'AI Revision' chat for the current week only. | |

**User's choice:** Remove Tab
**Notes:** A clean break from the old per-week generation model.

---

## Coach Personality & Capability (Edit Authority)

| Option | Description | Selected |
|--------|-------------|----------|
| Full Plan | Claude can suggest edits to any day in history or future. | |
| Future-Only | Claude only suggests changes for the next 4 weeks. | ✓ |
| Current Week | Claude only suggests changes for the current week. | |

**User's choice:** Future-Only
**Notes:** Prevents accidental modification of historic training data while allowing enough "look ahead" for coaching.

---

## Claude's Discretion

- Visual styling of the "Change Card" (following shadcn/tailwind patterns).
- Specific UI trigger for the contextual chat on the `LongTermPlanPage` (Sidebar vs. FAB).
- Error handling UI when a patch fails to apply.
