# Phase 20: Drag-and-Drop Rescheduling - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-30
**Phase:** 20-Drag-and-Drop Rescheduling
**Areas discussed:** DND Trigger & Mobile Conflict, Drop Targets & Empty Days, Visual Feedback, Undo & Multi-move Queue

---

## DND Trigger & Mobile Conflict

| Option | Description | Selected |
|--------|-------------|----------|
| A | Desktop only: Enable DND for 7-column grid; disable for mobile pager. | ✓ |
| B | Hold-to-drag (Both): Complex mobile paging interaction. | |
| C | Drag handles: Add "⠿" handle to cards. | |

**User's choice:** A (Desktop only)
**Notes:** User preferred keeping mobile simple and using the existing edit modal for date changes.

---

## Drop Targets & Empty Days

| Option | Description | Selected |
|--------|-------------|----------|
| A | Append + Empty Day targets: Add to bottom of list; "Rest Day" cells are targets. | ✓ |
| B | Swap: Workouts swap days when dropped on each other. | |
| C | Positional Insert: Drop between existing workouts to determine order. | |

**User's choice:** A (Append) + Yes to empty days.
**Notes:** Standard "drop-to-add" behavior is sufficient.

---

## Visual Feedback & "The Snap"

| Option | Description | Selected |
|--------|-------------|----------|
| A | DragOverlay: Semi-transparent clone follows pointer. | ✓ |
| B | Ghost/Placeholder: Hidden original, simple ghost box under pointer. | |
| C | Full Animation (Sortable): Layout shifts as you hover. | |

**User's choice:** A (DragOverlay)
**Notes:** Standard modern SPA feel.

---

## Undo & Multi-move Queue

| Option | Description | Selected |
|--------|-------------|----------|
| A | Stacked Toasts: Multiple concurrent undo toasts. | |
| B | Single "Most Recent": New move replaces existing undo toast. | ✓ |
| C | Batch "Revert All": One toast tracking count of moves. | |

**User's choice:** B (Most Recent)
**Notes:** Cleanest for user training plans where one-at-a-time adjustments are common.

---

## Claude's Discretion

- Styling of the "Drop Hover" state on target cells.
- Animation curves for snapback and overlay.
- Undo toast visual style.
