# RunSmart — Weekly Plan Refactor

**STATUS: COMPLETE — All tasks implemented on branch `feature/weekly-plan-rolling-4week` (2026-03-02)**

Purpose
-------
Improve WeeklyPlanPage so it:

1. Works correctly on web and mobile (no horizontal overflow).
2. Shows a rolling FOUR-WEEK planning cycle:
   - current week
   - next three weeks
3. Allows navigation forward/backward in 4-week blocks.
4. Keeps all existing training logic intact.

This is a UI + presentation evolution with minimal logic extension.

Do NOT change backend schema unless explicitly required.

---

## GLOBAL RULES

DO:
- reuse existing hooks (usePlans, useWorkoutEntries, useAppData)
- keep Supabase interactions unchanged
- refactor presentation layer safely
- extend date logic only where necessary

DO NOT:
- rewrite compute.js logic
- change database tables
- introduce new state libraries
- break existing tests

---

## GLOBAL DEFINITION OF DONE

All must pass:

npm test -- --run
npm run build

AND:

- No horizontal scrolling on mobile.
- Weekly plan looks balanced on desktop.
- Four weeks visible simultaneously.
- Navigation loads next 4-week block correctly.

---

# PHASE 1 — Responsive Layout Fix

## TASK-001: Constrain Page Width

Ensure WeeklyPlanPage root container uses:

w-full max-w-screen-xl mx-auto px-4 sm:px-6 overflow-x-hidden

Page must be centered on desktop and clamped on mobile.

---

## TASK-002: Fix Weekly Grid Responsiveness

Replace fixed layout with responsive grid:

Desktop:
grid-cols-7

Tablet:
md:grid-cols-2

Mobile:
sm:grid-cols-1

No fixed column widths allowed.

---

## TASK-003: Allow Layout Shrinking

Add `min-w-0` to:

- DayColumn root container
- Card containers
- flex/grid children

This prevents overflow.

---

## TASK-004: Fix Text Overflow

Replace:

whitespace-nowrap overflow-hidden text-ellipsis

with:

break-words line-clamp-2

Workout descriptions must wrap.

---

## TASK-005: Header Layout Refactor

Header must behave:

Desktop:
- controls aligned horizontally

Mobile:
- stacked vertically

Use:

flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between

Remove all min-width constraints.

---

# PHASE 2 — Introduce Rolling 4-Week Planning Model

## Concept

WeeklyPlanPage should display:

Week 0  → Current week  
Week +1 → Next week  
Week +2 → Two weeks ahead  
Week +3 → Three weeks ahead  

Total visible horizon = 4 weeks.

Navigation shifts the window by 4 weeks.

---

## TASK-006: Create Planning Window State

Add state:


planningStartDate


Rules:

- defaults to start of current week
- represents FIRST week in 4-week window

---

## TASK-007: Generate Visible Weeks

Create derived array:


visibleWeeks = [
planningStartDate,
+1 week,
+2 weeks,
+3 weeks
]


Use existing UTC date helpers.

---

## TASK-008: Update Navigation Controls

Change arrows behavior:

Previous:
← subtract 4 weeks

Next:
→ add 4 weeks

Today:
reset to current week start.

---

## TASK-009: Render Four Week Sections

Replace single week rendering with:


visibleWeeks.map(weekStart => (
<WeekSection />
))


Each section contains:

- week header
- totals summary
- 7-day grid

Reuse existing DayColumn component.

---

## TASK-010: Layout for Multi-Week View

Desktop:
- weeks stacked vertically
- each week full width

Mobile:
- same stacked layout
- reduced spacing

Use:

space-y-6

between weeks.

---

# PHASE 3 — Visual Improvements (Web Balance)

## TASK-011: Equal Card Behavior

Day cards must use:

flex flex-col min-w-0 h-full

Ensure equal visual rhythm.

---

## TASK-012: Week Section Card

Wrap each week in:

<Card>
  <CardHeader>
  <CardContent>
</Card>

Improves visual grouping.

---

# PHASE 4 — Tests

## TASK-013: Component Test

Create:

tests/weeklyplan.rolling.test.jsx

Verify:

- four week headers render
- navigation shifts window
- current week resets correctly

---

## TASK-014: Mobile Safety Test

Add viewport test:

confirm no horizontal overflow.

---

# ACCEPTANCE CRITERIA

Mobile:
✓ No sideways scrolling (overflow-x-hidden + min-w-0 on all day columns)
✓ Weeks stack cleanly (space-y-6 between WeekSection cards)
✓ Controls readable (flex-col on mobile, flex-row on desktop)

Desktop:
✓ Four-week planning visible (4 WeekSection components)
✓ Balanced layout (Card wrapper per week, 7-col grid per week)
✓ Navigation intuitive (← / → / Today buttons in header)

Behavior:
✓ Next/Previous moves 4 weeks (±28 days)
✓ Today resets window (resets planningStartDate to current Monday)
✓ Existing plan data unchanged (loadEntriesForRange added to hook, no schema changes)

All 322 tests pass (45 in weeklyplan.* files). Build succeeds.
Agent stops when all criteria satisfied. ✅