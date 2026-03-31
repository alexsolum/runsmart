# Context: Phase 15 — Click-to-Edit Workflow + FAB

Decisions for the click-to-edit workflow, floating action button, and grid interactivity.

## User Decisions

### Edit UI
- **Presentation:** Adaptive Dialog/Drawer (Centered on desktop, bottom sheet on mobile).
- **Styling:** Precision Athlete (PA) styled header with navy background and glassmorphism (backdrop-blur).
- **Deletion:** Trash icon in the top-right corner of the interface, guarded by a confirmation dialog.

### Mobile FAB
- **Appearance:** Circular floating button with a `+` icon.
- **Placement:** Fixed in the bottom-right corner.
- **Behavior:** Defaults to "Today" for new workouts. Hides when scrolling down and reappears when scrolling up to maximize screen space.

### Grid Interactivity
- **Completion:** Direct-toggle via a visible checkbox on the grid cards (no need to open the modal for quick completion).
- **Visual Feedback:** Completed workouts fade to 60% opacity and display a checkmark.

### Workout Form
- **Fields:** Standard set (Type, Distance, Duration, Description).
- **Enhancements:** 
  - Iconic Type Select: The workout type dropdown shows icons (🏃, 🔥, etc.) matching the workout registry.
  - Live Color Preview: The interface provides a live preview of the card's color/style as the type is changed.
  - Editable Date: The date field is editable within the form to allow moving workouts between days.

## Code Context

### Reusable Assets
- `src/hooks/useWorkoutEntries.js`: Use `createEntry`, `updateEntry`, `deleteEntry`, and `toggleCompleted` for all data operations.
- `src/domain/workoutTypes.js`: Use `WORKOUT_TYPES` for labels, icons, and color tokens.
- `src/components/ui/dialog.jsx`: Base component for the desktop modal.
- `src/components/planner/WorkoutCard.jsx`: Will be updated to include the completion toggle and click-to-edit trigger.
- `src/components/planner/AddAffordance.jsx`: Will be wired to the "Create Workout" modal trigger.

### Integration Points
- `src/pages/WeeklyPlanPage.jsx`: The FAB will be added to the layout here (visible only on mobile).
- `src/components/planner/FourWeekGrid.jsx`: The root component for the grid interaction triggers.

### Design Tokens
- Use `--pa-type-*` tokens for live color previews.
- Use `--pa-primary` with glassmorphism for the edit header.
- Use `backdrop-blur` for the adaptive interface.

## Deferred Ideas (Out of Scope)
- Drag-and-drop workout reordering (deferred to future milestone).
- Rich text notes in workout description.
- Multiple workouts per day sorting (sorting is by creation time for now).
- Light/Dark mode toggle (design system is light-only).
