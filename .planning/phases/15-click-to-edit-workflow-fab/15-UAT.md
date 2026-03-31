---
status: complete
phase: 15-click-to-edit-workflow-fab
source: [15-01-SUMMARY.md, 15-02-SUMMARY.md, 15-03-SUMMARY.md]
started: 2026-03-25T20:30:00Z
updated: 2026-03-25T20:30:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Click-to-Edit Workout Card
expected: Click on an existing workout card in the weekly planner. A modal should open with the workout's existing data pre-filled (type, date, notes, duration, distance).
result: pass

### 2. Day-Cell Create Affordance (date prefill)
expected: Click the + button on a specific day cell. The create modal opens with that day's date already filled in the date field.
result: pass

### 3. Save New Workout
expected: Fill in the create form (type, date, optional notes/distance/duration) and click Lagre. The new workout appears in the correct day cell without a page refresh.
result: issue
reported: "It fails when i save. Response: {\"code\":\"23514\",\"details\":null,\"hint\":null,\"message\":\"new row for relation \\\"workout_entries\\\" violates check constraint \\\"workout_entries_workout_type_check\\\"\"}"
severity: blocker
resolved: "Applied migration expand_workout_type_constraint — constraint now accepts new UPPERCASE keys. User confirmed pass after fix."

### 4. Edit and Save Existing Workout
expected: Open an existing workout via click-to-edit, change a field (e.g. notes), and click Lagre. The card updates in place with the new data.
result: pass

### 5. Delete Workout
expected: Open an existing workout in the edit modal. Click the delete button. A confirmation step appears. Confirm deletion — the workout is removed from the grid.
result: pass

### 6. Completion Toggle on Card
expected: Click the checkbox/checkmark icon on a workout card. The card's opacity drops to ~60% and a checkmark indicator appears, marking it completed. Clicking again restores full opacity.
result: pass

### 7. Completed Toggle in Edit Modal
expected: Open an existing workout in edit mode. A "Fullfort" checkbox is visible. Toggling it and saving Lagre marks the workout as completed (and the card reflects the completed state).
result: pass

### 8. Live Workout-Type Color Preview
expected: Inside the workout form (create or edit), change the workout type dropdown. The preview card below/beside the form updates its color immediately to match the selected type's token color.
result: pass

### 9. Mobile FAB Trigger
expected: On a mobile viewport (or narrow window <768px), a floating action button (FAB) is visible. Tapping it opens the create workout modal.
result: pass

## Summary

total: 9
passed: 9
issues: 1
pending: 0
skipped: 0

## Gaps

- truth: "Filling the create form and clicking Lagre saves the workout and it appears in the day cell"
  status: failed
  reason: "User reported: save fails with {\"code\":\"23514\",\"message\":\"new row for relation \\\"workout_entries\\\" violates check constraint \\\"workout_entries_workout_type_check\\\"\"}"
  severity: blocker
  test: 3
  root_cause: "DB check constraint on workout_entries.workout_type only allows old-style values ('Easy', 'Long Run', etc.) but WorkoutForm sends new UPPERCASE keys ('EASY', 'LONG_RUN', etc.) from WORKOUT_TYPES domain. WeeklyPlanPage.handleFormSubmit passes workout_type through without translation."
  artifacts:
    - path: "src/components/planner/WorkoutForm.jsx"
      issue: "Sends UPPERCASE keys (EASY, LONG_RUN) from WORKOUT_TYPES, not DB-expected values"
    - path: "src/pages/WeeklyPlanPage.jsx"
      issue: "handleFormSubmit passes formData.workout_type directly to createEntry/updateEntry without mapping"
  missing:
    - "Supabase migration to update workout_entries_workout_type_check constraint to accept new UPPERCASE keys"
  debug_session: ""
