# Phase 20: Drag-and-Drop Rescheduling Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable Desktop users to reschedule workouts within a week by dragging cards between days, with an atomic backend move and a 5-second undo window.

**Architecture:**
- **UI:** Integration of `@dnd-kit/core` in `PlanWeekCard` to orchestrate Drag and Drop.
- **Components:** `PlanWorkoutCard` becomes a draggable source; `PlanDayCell` becomes a droppable target.
- **State:** `ToastContext` to manage global notifications and the "Undo" action state.
- **Backend:** Atomic `move_workout` RPC via `useHierarchicalPlan`.

**Tech Stack:** React 18, `@dnd-kit/core`, `framer-motion`, Supabase RPC.

---

### Task 1: Toast Infrastructure & Global Notification Layer

**Files:**
- Create: `src/components/ui/Toast.jsx`
- Create: `src/context/ToastContext.jsx`
- Modify: `src/App.jsx`
- Modify: `src/context/AppDataContext.jsx` (wire Toast into value)

- [ ] **Step 1: Create the Toast UI component**
Use `framer-motion` for slide-in/out animations. Toast should support a message, an optional "Undo" button, and a timer.

- [ ] **Step 2: Create ToastContext**
Manage a single active toast state: `{ message, type, action, duration }`. Provide `showToast(message, options)` and `dismissToast()`.

- [ ] **Step 3: Update AppDataContext**
Include `showToast` in the provider value so any hook/component can trigger it.

- [ ] **Step 4: Add ToastProvider to App root**
Ensure the toast container is rendered at the top level of the shell.

---

### Task 2: Drag and Drop Setup in PlanWeekCard

**Files:**
- Modify: `src/components/planner/PlanWeekCard.jsx`
- Modify: `src/components/planner/PlanDayCell.jsx`
- Modify: `src/components/planner/PlanWorkoutCard.jsx`

- [ ] **Step 1: Wrap Desktop Grid in DndContext**
In `PlanWeekCard`, import `DndContext` from `@dnd-kit/core`. Only enable for non-mobile views.

- [ ] **Step 2: Make PlanDayCell a Droppable Target**
Use `useDroppable` from `@dnd-kit/core`. Add a `data-testid` and visual highlight state when a card is hovered over the cell.

- [ ] **Step 3: Make PlanWorkoutCard a Draggable Source**
Use `useDraggable`. The entire card should be the handle. Ensure the card is semi-transparent while dragging.

- [ ] **Step 4: Implement DragOverlay**
Add a `DragOverlay` in `PlanWeekCard` to show a faithful clone of the `PlanWorkoutCard` under the pointer.

---

### Task 4: Move Logic & Reversible Action (Undo)

**Files:**
- Modify: `src/components/planner/PlanWeekCard.jsx` (onDragEnd)

- [ ] **Step 1: Handle onDragEnd in PlanWeekCard**
Identify the `workoutId`, `fromDate` (source), and `toDate` (target). Prevent move if source == target.

- [ ] **Step 2: Execute Move & Show Undo Toast**
Call `hierarchicalPlan.moveWorkout()`. On success, call `showToast("Workout moved", { action: { label: "Undo", onClick: () => undoMove() } })`.

- [ ] **Step 3: Implement Reversible Move**
The `undoMove` function should call `moveWorkout` with swapped `fromDate` and `toDate`.

- [ ] **Step 4: Snapback & Error Handling**
If the move fails (network/auth), show an error toast. The card should naturally return to its source day if not dropped on a valid target.

---

### Task 5: Testing & Visual Polish

- [ ] **Step 1: Verify Snapback Animation**
Ensure the card returns to its original position if the drag is cancelled or fails.

- [ ] **Step 2: Verify Multi-day Drop Targets**
Ensure dropping on "Rest Day" / "No session planned" empty cells works correctly.

- [ ] **Step 3: Smoke Test Database Persistence**
Move a workout, reload the page, and verify it stays in the new day.

- [ ] **Step 4: Verify Mobile DND is Disabled**
Check that touch interactions on mobile do not trigger drag behavior.
