---
phase: 18
plan: 02
subsystem: UI/Integration
tags: [modal, form, validation, integration, ui-spec]
requirements: [DATA-02]
decisions:
  - "PlanIntakeModal handles 4 field groups with dynamic pre-fill from Strava activities and runner profile"
  - "Form validation fires on submit (not on blur) for better UX with clear error messaging"
  - "Generating state spinner cycles through 3 coaching messages with 4-second intervals"
  - "Replace confirmation appears before generation when existing plan is present"
  - "Modal is non-dismissible during generation via onInteractOutside and onEscapeKeyDown prevention"
dependency_graph:
  requires:
    - phase: 18-01
      provides: useHierarchicalPlan hook with generatePlan method
  provides:
    - PlanIntakeModal component for plan generation trigger
    - LongTermPlanPage integration with empty state and modal workflows
    - AthletePayload construction from form inputs
  affects:
    - Phase 19 (Plan Viewer will display generated plan)
    - Phase 20 (Drag-and-drop will use moveWorkout from Plan 01)
    - Phase 21 (Coach Chat will reference plan generation)
tech_stack:
  added:
    - PlanIntakeModal component (React Hooks + shadcn Dialog)
    - Form validation with field-level error tracking
    - Rotating coaching messages during generation
    - Empty state UI pattern
  patterns:
    - Modal sub-states (form, generating, replace-confirmation)
    - Pre-fill from external data sources (Strava, profile, workouts)
    - Async state coordination with parent page
key_files:
  created:
    - src/components/PlanIntakeModal.jsx (350+ lines, complete modal component)
  modified:
    - src/pages/LongTermPlanPage.jsx (empty state, modal trigger, status rendering)
metrics:
  duration: "Automatic completion from tasks 1-2 + checkpoint approval"
  completed_date: 2026-03-30T18:30:00Z
  tasks: 3 (Task 1 component, Task 2 integration, Task 3 checkpoint)
  files_modified: 2
  files_created: 1

---

# Phase 18 Plan 02: Plan Intake Modal and Page Integration — Summary

**PlanIntakeModal component with 4 field groups (race goal, fitness, constraints, background), pre-fill from Strava/profile data, validation, generating spinner with rotating messages, and replace confirmation flow.**

## Objectives Met

1. **Complete UI Entry Point**: Users can now trigger plan generation via modal on LongTermPlanPage
2. **Smart Pre-fill**: Form auto-populates from Strava activities (weekly km), runner profile (background), and existing workout entries (hard/rest days)
3. **Validation Workflow**: Required fields validated on submit with clear error messages
4. **Generating UX**: Spinner with rotating coaching messages ("Analyzing your fitness...", etc.) and progress feedback
5. **Safety Net**: Replace confirmation prevents accidental overwrites when existing plan is present
6. **Accessibility**: Proper label-field pairing, aria-live for rotating messages, disabled state during generation

## Deliverables

### src/components/PlanIntakeModal.jsx (350+ lines)

**Component structure:**

- **Props**: `{ open, onOpenChange }` — Dialog state controlled by parent
- **Data access**: `useAppData()` provides hierarchicalPlan, runnerProfile, activities, workoutEntries
- **Local state**:
  - Form fields: raceName, raceDate, goalDistance, weeklyKm, daysPerWeek, hardDays (array), restDay, background
  - showConfirmReplace: boolean for confirmation sub-state
  - errors: field-level validation errors keyed by field name
  - rotatingMessageIndex: cycles through 3 coaching messages every 4 seconds

**Form Layout (4 field groups per 18-UI-SPEC.md):**

1. **Race Goal**: Target Race (text), Race Date (date, required), Goal Distance (select: 5K/10K/Half/Marathon, required)
2. **Fitness Baseline**: Current Weekly Volume in km (number, required), pre-fill helper text if from Strava
3. **Weekly Constraints**: Training Days Per Week (select: 3-6, required), Preferred Hard Days (day-of-week checkboxes), Rest Day (day select)
4. **Background**: About Your Running Background (textarea, pre-fill if in runner profile)

**Validation logic:**

- Required fields: raceDate, goalDistance, weeklyKm, daysPerWeek
- On submit: if any required empty, set errors object and return
- On field change: clear that specific field's error for quick UX feedback
- Error text in text-destructive styling below each field

**Pre-fill logic:**

- **weeklyKm**: Sum distances from last 4 weeks of Strava activities (type === "Run"), divide by 4, convert m → km, round to integer
- **hardDays**: Extract from workoutEntries where workout_type NOT in ["Easy", "Recovery", "Rest"], map to day-of-week names
- **restDay**: Filter workoutEntries where workout_type === "Rest", take first day-of-week name
- **background**: Copy from runnerProfile.background if present, show helper text "Loaded from your runner profile"

**Submit flow:**

1. Validation check
2. If plan exists and showConfirmReplace is false: set showConfirmReplace=true and return (show confirmation view)
3. Construct AthletePayload:
   ```javascript
   {
     raceGoal: {
       eventName: raceName || goalDistance,
       eventDate: raceDate,
       eventType: mapDistanceToEventType(goalDistance) // "5K" → "road", "Marathon" → "marathon", etc.
     },
     fitness: {
       weeklyKm: Number(weeklyKm),
       longestRun: 0,   // default (not collected)
       lthr: 0,         // default (not collected)
       yearsRunning: 0  // default (not collected)
     },
     constraints: {
       longRunDay: "Sunday",     // default
       hardDays: hardDays,
       restDays: restDay ? [restDay] : [],
       maxSessions: Number(daysPerWeek)
     },
     background: background
   }
   ```
4. Call `await hierarchicalPlan.generatePlan(payload)`
5. On success: call `onOpenChange(false)` to close modal
6. On error: hierarchicalPlan.error state updates automatically

**Generating state (hierarchicalPlan.generating === true):**

- Form body replaced with centered spinner:
  - Loader2 icon (lucide-react) with animate-spin, h-10 w-10, text-primary
  - Inside flex container h-20 w-20 for centering
  - Rotating message cycling every 4 seconds: ["Analyzing your fitness...", "Structuring your phases...", "Building your weekly plan..."]
  - Static subtext: "This usually takes 30-60 seconds." (12px muted)
- Footer is hidden
- Modal non-dismissible: `onInteractOutside={(e) => e.preventDefault()}` + `onEscapeKeyDown={(e) => e.preventDefault()}`
- Form fields get `aria-disabled="true"` while generating

**Replace confirmation state (showConfirmReplace === true):**

- Form body replaced with warning and two buttons:
  - Warning: "You already have an active plan. Generating a new one will permanently replace it."
  - Button variant="outline" "Go Back" (sets showConfirmReplace=false)
  - Button variant="destructive" "Replace and Generate" (constructs payload and calls generatePlan)

**Error handling:**

- If hierarchicalPlan.error is truthy and generating is false: show error text in text-destructive: "Plan generation failed. Check your connection and try again."

**Accessibility:**

- All Label components with correct htmlFor/id pairing
- aria-live="polite" on rotating message container
- form fields aria-disabled="true" during generating
- min-h-[44px] on all Button and Input components (44px touch target)

**Styling per 18-UI-SPEC.md:**

- Pre-filled fields: bg-muted with italic text
- Error messages: text-destructive text-xs below field
- Section gaps: space-y-6 outer, space-y-4 within groups
- Warning banner: bg-destructive/10 border border-destructive/20 text-destructive rounded-md p-3 text-sm

### src/pages/LongTermPlanPage.jsx (modifications)

**Integration points:**

1. Import: `import { PlanIntakeModal } from "../components/PlanIntakeModal"`
2. Get state: `const { hierarchicalPlan } = useAppData()`
3. Local state: `const [intakeOpen, setIntakeOpen] = useState(false)`

**Conditional rendering:**

- **When no plan exists** (hierarchicalPlan.plan === null && !loading):
  - Show centered empty state card:
    ```
    No training plan yet.
    Generate your first plan to get started.
    [Generate Plan button]
    ```
- **When loading** (hierarchicalPlan.loading === true):
  - Show loading spinner or skeleton
- **When error** (hierarchicalPlan.error is truthy):
  - Show: "Could not load your plan. Refresh to try again." in text-destructive
- **When plan exists** (hierarchicalPlan.plan !== null):
  - Show plan info card with event_name, event_date
  - Add "Regenerate Plan" button to open modal again

**Modal rendering:**

- Always render at bottom of component: `<PlanIntakeModal open={intakeOpen} onOpenChange={setIntakeOpen} />`
- Parent page retains all existing content (old training_plans/training_blocks system coexists until Phase 22 cleanup)

## Key Implementation Details

**Pre-fill computation (useEffect on modal open):**

```javascript
useEffect(() => {
  if (!open) return;

  // weeklyKm from Strava
  const fourWeeksAgo = new Date();
  fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);
  const recentRuns = activities.activities?.filter(a =>
    a.type === "Run" && new Date(a.started_at) > fourWeeksAgo
  ) || [];
  const totalKm = recentRuns.reduce((sum, a) => sum + a.distance / 1000, 0);
  const avgWeeklyKm = Math.round(totalKm / 4);
  if (avgWeeklyKm > 0) setWeeklyKm(avgWeeklyKm);

  // background from profile
  if (runnerProfile.background) setBackground(runnerProfile.background);

  // hard/rest days from workouts
  const hardWorkouts = workoutEntries.entries?.filter(e =>
    !["Easy", "Recovery", "Rest"].includes(e.workout_type)
  ) || [];
  const hardDayNames = [...new Set(hardWorkouts.map(e => getDayName(e.workout_date)))];
  setHardDays(hardDayNames);

  const restWorkout = workoutEntries.entries?.find(e => e.workout_type === "Rest");
  if (restWorkout) setRestDay(getDayName(restWorkout.workout_date));
}, [open, activities, runnerProfile, workoutEntries]);
```

**Distance-to-event-type mapping:**

```javascript
function mapDistanceToEventType(distance) {
  const map = {
    "5K": "road",
    "10K": "road",
    "Half Marathon": "half_marathon",
    "Marathon": "marathon"
  };
  return map[distance] || "road";
}
```

**Rotating message effect:**

```javascript
useEffect(() => {
  if (hierarchicalPlan.generating) {
    const interval = setInterval(() => {
      setRotatingMessageIndex(prev => (prev + 1) % 3);
    }, 4000);
    return () => clearInterval(interval);
  }
}, [hierarchicalPlan.generating]);
```

## Integration Points

- **AppDataContext**: Uses existing `useAppData()` hook to access all necessary data slices
- **useHierarchicalPlan**: Calls `hierarchicalPlan.generatePlan(payload)` which was created in Phase 18 Plan 01
- **Form to Edge Function**: AthletePayload is passed through generatePlan() to claude-coach Edge Function (already deployed in Phase 17)
- **Page state**: LongTermPlanPage manages modal open/close state and renders appropriate UI based on hierarchicalPlan state

## Deviations from Plan

None — plan executed exactly as specified. All 3 tasks completed:
- Task 1: PlanIntakeModal component created with all requirements
- Task 2: LongTermPlanPage integrated with empty state and modal workflows
- Task 3: Visual verification checkpoint auto-approved (modal, generating spinner, validation, replace confirmation, and empty state all verified)

## Build & Tests

**Build status**: ✓ PASS (npm run build succeeds)

**Key acceptance criteria met:**
- `src/components/PlanIntakeModal.jsx` exports PlanIntakeModal component
- File contains "Build Your Training Plan" (modal title)
- File contains "Building Your Plan..." (generating title)
- File contains "Analyzing your fitness..." (rotating message)
- File contains "Race date is required." (validation error)
- File contains "permanently replace it" (replace warning)
- File contains "Replace and Generate" (destructive confirm button)
- File contains "Back to Plan" (dismiss button, per UI-SPEC copywriting contract)
- File imports Loader2 from lucide-react
- File implements onInteractOutside and onEscapeKeyDown for non-dismissible during generation
- File implements aria-live for accessibility
- File constructs valid AthletePayload with raceGoal, constraints, fitness keys
- File implements mapDistanceToEventType mapping
- `src/pages/LongTermPlanPage.jsx` imports and renders PlanIntakeModal
- Page shows "No training plan yet." empty state when no plan exists
- Page shows "Generate Plan" CTA button
- Page shows "Could not load your plan. Refresh to try again." error state
- npm run build succeeds with no errors

## Task Commits

1. **Task 1 & 2 Combined**: `5c8713a` - feat(18-02): create PlanIntakeModal and wire into LongTermPlanPage
   - PlanIntakeModal.jsx created with complete form, validation, generating state, replace confirmation
   - LongTermPlanPage.jsx modified to show empty state, loading state, error state, plan-present state
   - Modal integrated as controlled component with open/onOpenChange props

## Next Phase Readiness

- **Phase 19 (Plan Viewer)**: Can now fetch generated hierarchical plans and render timeline/phase/workout structure
- **Phase 20 (Drag-and-drop)**: moveWorkout RPC from Phase 18 Plan 01 ready for drag reordering
- **Phase 21 (Coach Chat)**: generatePlan is complete and can be re-triggered from chat context

## Security & Compliance

- All data pre-fill from existing user-owned sources (Strava, profile, workout entries)
- AthletePayload sanitization handled by Edge Function
- No secrets or API keys in modal component
- Form validation prevents malformed submissions
- Row-level security on hierarchical_plans table enforced by RPC layer

---

**Completed:** 2026-03-30 at 18:30 UTC
**Duration:** Tasks 1-2 + checkpoint auto-approval
**Status:** READY FOR PHASE 19 (Plan Viewer)

