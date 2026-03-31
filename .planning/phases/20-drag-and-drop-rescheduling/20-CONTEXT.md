# Phase 20: Drag-and-Drop Rescheduling - Context

**Gathered:** 2026-03-30
**Status:** Ready for planning

<domain>
## Phase Boundary

Within-week workout rescheduling via drag-and-drop interaction for the Desktop 7-column grid view. Users can "grab" a workout card and move it to a different day in the same week, with the update persisting to the database via an atomic Postgres RPC.

</domain>

<decisions>
## Implementation Decisions

### Interaction Strategy
- **D-01: Desktop Only.** DND is enabled only for the desktop 7-column grid. Mobile users continue to use the "Edit" modal to change workout dates.
- **D-02: Whole Card Drag.** The entire `PlanWorkoutCard` serves as the drag handle.
- **D-03: DragOverlay.** A semi-transparent clone of the card follows the pointer during drag. The source card is dimmed until the move is confirmed or cancelled.

### Target Behavior
- **D-04: Append to Day.** Dropping a workout on a target day always appends it to the bottom of that day's list. No "swap" or "positional insert" logic is required for this phase.
- **D-05: Empty Day Drop Zones.** The "Rest Day" / "No session planned" placeholders in `PlanDayCell` are explicit drop targets, allowing the entire cell area to receive a workout.

### State & Feedback
- **D-06: Atomic Move.** Use the `move_workout` RPC (already in `useHierarchicalPlan`) to ensure the move is atomic.
- **D-07: The Snapback.** If the database write fails, the workout must visually "snap" back to its original day.
- **D-08: Undo Toast (Most Recent).** A 5-second "Undo" toast appears after a successful move. Only the *most recent* move can be undone; a new move replaces the existing undo toast.

### Claude's Discretion
- Styling of the "Drop Hover" state (e.g., subtle background highlight or border color change on the target `PlanDayCell`).
- Animation curve for the "snapback" on failure.
- Exact styling of the "Undo" toast (matching existing project UI patterns).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Logic & Schema
- `src/hooks/useHierarchicalPlan.js` — The `move_workout` method and state reducer.
- `src/domain/planSchema.js` — The hierarchical plan JSON structure.

### UI Components
- `src/components/planner/PlanWorkoutCard.jsx` — The draggable element.
- `src/components/planner/PlanDayCell.jsx` — The drop target container.
- `src/components/planner/PlanWeekCard.jsx` — The grid container where DND logic is orchestrated.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `useHierarchicalPlan`: Already has the `moveWorkout` action wired to the Postgres RPC.
- `framer-motion`: Available in `package.json` for drag animations if preferred over native `dnd-kit` (though `dnd-kit` was discussed in the prompt).

### Integration Points
- `PlanWeekCard`: This is where the 7-column grid lives and where the `DndContext` should likely be wrapped for desktop users.

</code_context>

<deferred>
## Deferred Ideas

- **Mobile DND:** Dragging between days in the mobile pager/swipe view (Phase 20 scope narrowed to Desktop-only).
- **Positional Sorting:** Manual reordering of multiple workouts within a single day.
- **Multi-move Undo:** A history stack for undoing a sequence of moves.

</deferred>

---

*Phase: 20-drag-and-drop-rescheduling*
*Context gathered: 2026-03-30*
