# Phase 19: Plan Viewer UI - Research

**Researched:** 2026-03-30
**Domain:** Full-plan viewer UI on top of the hierarchical plan JSONB contract
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
### Plan navigation
- The plan viewer defaults to one continuous vertical scroll through the full plan in chronological order.
- The phase bar at the top is clickable jump navigation, not a filter control.
- The initial landing point should bias toward the first current-or-upcoming week rather than week 1 or race week.
- Only past phases may collapse into a compact summary strip. Current and future phases stay expanded.
- Preferred behavior: assess a sticky/floating phase bar so phase navigation remains visible while the user is deep in the plan.

### Workout card vs modal
- Workout cards show workout type, short name, and one key metric line.
- Workout cards may include a one-line structure preview when useful, but should not become mini detail panels.
- Completion is controlled only inside the workout detail modal, not directly on the card.
- The workout modal opens in read-only summary mode first, with a clear `Edit workout` action that transitions into editing.

### Week row density
- Each week row needs a clearly readable row header with week number and focus text.
- The weekly summary belongs in a dedicated summary band above the seven day cells, inside the week card, rather than in a separate summary column at the edge.
- That summary band should include the week label, phase label, focus text, and right-aligned weekly metrics.
- Weekly metrics in the summary band should lead with kilometers, with hours as secondary supporting context.
- Empty day cells should render as explicit rest/no-session states rather than nearly blank containers.
- Desktop density should be balanced: enough information to scan several weeks without making the board feel cramped.

### Claude's Discretion
- Exact mechanics for auto-scrolling or focusing the first current-or-upcoming week on initial load.
- Exact visual treatment of collapsed past-phase summary strips.
- Exact choice of the "one key metric line" on workout cards when both distance and duration exist.
- Exact visual treatment of explicit rest/no-session day cells within the week board.
- Exact sticky implementation details for the floating phase bar and its responsive behavior.

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| VIEW-01 | User sees a color-coded phase timeline bar at the top of the plan matching the plan's phase structure | Use `plan.plan_data.phases` as the only source of truth; build a clickable timeline from week spans, not from legacy `trainingBlocks` rows |
| VIEW-02 | User sees scrollable week rows with 7-day columns, week focus text, and weekly hours + km summary per row | Use a dedicated full-plan week-card layout with a summary band above day cells; do not stretch the old four-week grid |
| VIEW-03 | User can click a workout card to see a detail modal with zone info, duration, workout structure, and mark-complete button | Reuse `ResponsiveModal`; render read-only detail first; wire completion to `toggleWorkoutCompleted(workoutId, weekNumber, dayDate)` |
| VIEW-04 | User can edit a workout from the detail modal (sport, type, name, description, duration, distance) and save changes | Reuse `WorkoutForm` patterns where possible, but patch hierarchical fields through `applyPatch()` and reset form state per selected workout |
</phase_requirements>

## Summary

Phase 19 is mostly a frontend composition phase, not a data-model phase. The backend contract already exists in [`useHierarchicalPlan.js`](../../../src/hooks/useHierarchicalPlan.js), and the plan payload already contains the viewer-facing structure needed for this phase: `phases[]`, `weeks[]`, `days[]`, workout `primaryZone`, `humanReadable`, `completed`, and week `summary` fields. The plan viewer should therefore be built as a dedicated hierarchical-plan UI, not as another variation of the old four-week weekly planner.

The safest implementation is to keep all mutations flowing through the existing hierarchical-plan RPC surface: `applyPatch()` for field edits and `toggleWorkoutCompleted()` for completion. Reusing the existing responsive dialog/drawer pattern is also the right move, but the content model must change: card click opens a read-only workout detail view first, then an explicit transition into edit mode. That keeps browsing, completion, and editing aligned with the phase decisions.

The main planning risk is UI structure, not API uncertainty. A sticky phase bar, continuous scroll, collapsible past phases, and a dense seven-day week card all interact with mobile layout, scroll containers, and modal state reset. Plan the work around those seams first.

**Primary recommendation:** Build a new full-plan viewer component tree on top of `useHierarchicalPlan`, reuse `ResponsiveModal` and mutation APIs, and avoid extending `FourWeekGrid` beyond reference-level reuse.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | `18.3.1` in repo; registry latest `19.2.4` published 2026-01-26 | Page and component composition | The repo already ships React 18; this phase is UI delivery, not a framework-upgrade phase |
| Tailwind CSS | `4.2.1` in repo | Layout, spacing, responsive behavior | The current app already uses utility-class-heavy JSX and token-driven styling |
| Local hook: `useHierarchicalPlan` | current repo API | Fetching, patching, completion, week/phase access | It is the canonical frontend contract for hierarchical plans in this milestone |
| Local design tokens: `pa-tokens.css` | current repo tokens | Editorial surfaces, spacing, semantic color | The phase must stay inside the Precision Athlete language and no-line rule |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@radix-ui/react-dialog` | `1.1.15` in repo and latest; published 2025-08-13 | Accessible desktop modal behavior | Use through `ResponsiveModal` for desktop workout detail/edit UI |
| `vaul` | `1.1.2` in repo and latest; published 2024-12-14 | Mobile drawer behavior | Use only through existing `Drawer`/`ResponsiveModal` wrapper |
| `@testing-library/react` | `16.3.2` in repo and latest; published 2026-01-19 | Component interaction testing | Use for modal open/edit/save and visible grid semantics |
| `vitest` | `3.0.0` in repo; registry latest `4.1.2` published 2026-03-26 | Fast unit/component test runner | Keep existing runner for this phase; do not bundle a test-framework upgrade |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| New dedicated plan viewer | Extending `FourWeekGrid`/`WeekRow` directly | Faster initially, but it bakes old weekly-planner assumptions into a full-plan UI and fights the required summary-band layout |
| `ResponsiveModal` wrapper | New one-off dialog/drawer implementation | Unnecessary duplication; current wrapper already handles desktop/mobile split cleanly |
| Simple full DOM render | Virtualized scrolling | Virtualization only makes sense if real plan size creates measurable performance issues; it complicates sticky navigation, jump links, and modal state |

**Installation:**
```bash
# No new package install is recommended for Phase 19.
```

**Version verification:**
- `react`: latest registry `19.2.4`, published 2026-01-26
- `@radix-ui/react-dialog`: latest registry `1.1.15`, published 2025-08-13
- `vaul`: latest registry `1.1.2`, published 2024-12-14
- `vitest`: latest registry `4.1.2`, published 2026-03-26
- `@testing-library/react`: latest registry `16.3.2`, published 2026-01-19

## Architecture Patterns

### Recommended Project Structure
```text
src/
├── components/
│   └── planner/
│       ├── PlanViewer.jsx          # top-level full-plan viewer for LongTermPlanPage
│       ├── PhaseTimeline.jsx       # clickable phase jump bar
│       ├── PlanWeekCard.jsx        # summary band + 7 day cells
│       ├── PlanDayCell.jsx         # explicit rest/no-session or workout stack
│       ├── PlanWorkoutCard.jsx     # compact card for grid browsing
│       └── WorkoutDetailModal.jsx  # read-only detail + edit transition
└── pages/
    └── LongTermPlanPage.jsx        # integrates viewer and existing regenerate flow
```

### Pattern 1: Dedicated Viewer Root Over Hook Contract
**What:** Treat `hierarchicalPlan.plan.plan_data` as the sole viewer input and normalize it once at the viewer root.
**When to use:** Always; this phase should not mix legacy `trainingBlocks` data into the full hierarchical viewer.
**Example:**
```jsx
const planData = hierarchicalPlan?.plan?.plan_data;
const phases = planData?.phases ?? [];
const weeks = planData?.weeks ?? [];

return (
  <PlanViewer
    phases={phases}
    weeks={weeks}
    onPatch={hierarchicalPlan.applyPatch}
    onToggleCompleted={hierarchicalPlan.toggleWorkoutCompleted}
  />
);
```
**Source:** local contract audit of `src/hooks/useHierarchicalPlan.js`

### Pattern 2: Summary-First Week Card
**What:** Each week renders as one card with a summary band first, then seven day columns underneath.
**When to use:** For every full-plan week row; this directly matches the locked design decisions and avoids a detached metrics column.
**Example:**
```jsx
<article className="rounded-[var(--pa-radius-card)] bg-[var(--pa-surface-container-lowest)]">
  <header className="grid gap-3 px-4 py-4 md:grid-cols-[minmax(0,1fr)_auto]">
    <div>{/* week badge, phase badge, focus text */}</div>
    <div className="text-right">{/* km first, hours second */}</div>
  </header>
  <div className="grid grid-cols-1 gap-3 px-4 pb-4 md:grid-cols-7">
    {/* day cells */}
  </div>
</article>
```
**Source:** locked decisions in `19-CONTEXT.md` plus existing planner density references from Phase 14

### Pattern 3: Read-Only Detail First, Edit Second
**What:** Open workout details into a summary state first; switch into an embedded edit form only after explicit user action.
**When to use:** For all card interactions in this phase.
**Example:**
```jsx
<ResponsiveModal open={open} onOpenChange={setOpen}>
  <ResponsiveModalContent>
    {mode === "summary" ? (
      <WorkoutDetailView workout={selectedWorkout} onEdit={() => setMode("edit")} />
    ) : (
      <WorkoutEditForm key={`${selectedWorkout.id}-edit`} workout={selectedWorkout} />
    )}
  </ResponsiveModalContent>
</ResponsiveModal>
```
**Source:** [`ResponsiveModal.jsx`](../../../src/components/ui/ResponsiveModal.jsx) and React state reset guidance

### Pattern 4: Keyed Edit Form Reset
**What:** Key the edit subtree by workout identity and mode so stale form state does not bleed between cards.
**When to use:** When switching quickly between workouts or moving from summary to edit mode.
**Example:**
```jsx
<WorkoutFormShell
  key={`${selectedWorkout.id}:${mode}`}
  workout={selectedWorkout}
  mode={mode}
/>
```
**Source:** React docs on resetting state with `key`

### Anti-Patterns to Avoid
- **Reusing the old four-week planner grid as-is:** It assumes a rolling window, separate load column, and weekly entry schema that do not match the hierarchical viewer.
- **Deriving viewer state from both `trainingBlocks` and `plan.plan_data.phases`:** That creates conflicting phase/date truth sources.
- **Allowing direct card completion toggles:** This contradicts the locked interaction model and clutters dense cards.
- **Keeping modal form state alive across workout switches without a reset strategy:** This leads to stale fields and wrong-save bugs.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Responsive desktop/mobile modal split | A custom media-query modal system | `ResponsiveModal` + existing `Dialog`/`Drawer` wrappers | The wrapper already encapsulates the desktop/mobile behavior and accessibility primitives |
| Workout patch persistence | Ad hoc local reducers and manual deep JSON mutation | `hierarchicalPlan.applyPatch()` | The RPC path already owns atomic plan updates and keeps frontend state in sync |
| Completion persistence | A new completion API | `hierarchicalPlan.toggleWorkoutCompleted()` | The server contract already expects `workoutId + weekNumber + dayDate` |
| Editing schema and validation UX | A second custom workout editor from scratch | Reuse `WorkoutForm` patterns and field semantics | Existing tests and user workflow already cover edit-mode behavior |
| Sticky jump navigation behavior | JS scroll listeners for everything | Native anchor/`scrollIntoView` + CSS `position: sticky` where viable | Lower complexity and fewer repaint issues; JS should only handle initial focus/jump behavior |

**Key insight:** This phase should compose existing primitives around a new layout, not invent new mutation or modal infrastructure.

## Common Pitfalls

### Pitfall 1: Mixing legacy plan data with hierarchical plan data
**What goes wrong:** The phase bar or weekly summaries drift because one part uses `trainingBlocks` and another uses `plan.plan_data`.
**Why it happens:** `LongTermPlanPage` still contains the old long-term block editor.
**How to avoid:** Treat `hierarchicalPlan.plan.plan_data` as the viewer source of truth; legacy block CRUD can remain on the page, but the viewer should not depend on it.
**Warning signs:** Phase spans or week focus text do not match the generated plan payload.

### Pitfall 2: Sticky phase bar inside the wrong scroll container
**What goes wrong:** The phase bar stops sticking, clips behind headers, or causes jank.
**Why it happens:** `position: sticky` depends on scroll container boundaries, and sticky/fixed content can trigger repaint costs.
**How to avoid:** Keep the viewer in one primary scroll container; use one sticky bar near the top only; if needed, add `will-change: transform` conservatively after measuring.
**Warning signs:** Sticky works on desktop but not mobile, or the bar flickers while scrolling.

### Pitfall 3: Modal accessibility regressions
**What goes wrong:** Focus does not trap, close behavior is inconsistent, or screen-reader labeling is weak.
**Why it happens:** Customizing dialog content without keeping title/description and controlled open state aligned.
**How to avoid:** Keep `ResponsiveModal` as the shell and always provide a title plus optional description for summary/edit modes.
**Warning signs:** Tests need class selectors instead of semantic queries, or Escape/close interactions behave differently across breakpoints.

### Pitfall 4: Stale edit form state between workouts
**What goes wrong:** Opening workout B shows edits from workout A or saves the wrong payload.
**Why it happens:** React preserves component state when the subtree stays in the same position.
**How to avoid:** Key the edit subtree by workout id and mode; derive form defaults from the selected workout each time.
**Warning signs:** Switching cards without closing the modal preserves old field values.

### Pitfall 5: Over-dense cards that become unreadable
**What goes wrong:** The grid turns into a mini-detail dashboard and becomes hard to scan.
**Why it happens:** Too much data is pushed onto cards instead of letting the modal hold detail.
**How to avoid:** Keep cards to type, short name, one metric line, and optional one-line structure preview; push completion and full structure to the modal.
**Warning signs:** Cards need multiple text wraps or differ wildly in height.

### Pitfall 6: Depending too heavily on `vaul`
**What goes wrong:** Planning assumes extensive new mobile drawer customization on top of a dependency whose upstream repo is marked unmaintained.
**Why it happens:** The existing mobile drawer works, so it is tempting to expand it.
**How to avoid:** Reuse the current wrapper, avoid deep dependency-specific behavior, and keep mobile customization shallow.
**Warning signs:** The implementation starts relying on undocumented drawer internals.

## Code Examples

Verified patterns from official sources and local code:

### Controlled accessible modal shell
```jsx
<ResponsiveModal open={open} onOpenChange={setOpen}>
  <ResponsiveModalContent>
    <ResponsiveModalHeader>
      <ResponsiveModalTitle>{title}</ResponsiveModalTitle>
    </ResponsiveModalHeader>
    {children}
  </ResponsiveModalContent>
</ResponsiveModal>
```
**Source:** [`ResponsiveModal.jsx`](../../../src/components/ui/ResponsiveModal.jsx), built on Radix Dialog and Vaul Drawer

### Completion mutation through the existing hook
```jsx
await hierarchicalPlan.toggleWorkoutCompleted(
  selectedWorkout.id,
  selectedWeek.weekNumber,
  selectedDay.date,
);
```
**Source:** [`useHierarchicalPlan.js`](../../../src/hooks/useHierarchicalPlan.js)

### Field edit patch through the existing hook
```jsx
await hierarchicalPlan.applyPatch([
  {
    week: selectedWeek.weekNumber,
    dayDate: selectedDay.date,
    workoutId: selectedWorkout.id,
    fields: {
      sport,
      type,
      name,
      description,
      durationMinutes,
      distanceKm,
    },
  },
]);
```
**Source:** local hook contract plus existing `apply_plan_patch` test coverage in [`useHierarchicalPlan.test.jsx`](../../../tests/unit/useHierarchicalPlan.test.jsx)

### Resetting form state with a key
```jsx
{mode === "edit" ? (
  <WorkoutEditor key={`${selectedWorkout.id}:edit`} workout={selectedWorkout} />
) : (
  <WorkoutSummary key={`${selectedWorkout.id}:summary`} workout={selectedWorkout} />
)}
```
**Source:** React docs on preserving and resetting state

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Rolling four-week weekly planner | Full hierarchical plan viewer with continuous chronological scroll | v2.0 / Phase 18-19 | The UI now browses the stored plan document directly instead of synthesizing a short planning window |
| Card-level completion toggles in the weekly planner | Modal-owned completion for the full-plan viewer | locked in Phase 19 context on 2026-03-30 | Cards stay compact and consistent |
| Multiple plan-shape assumptions across pages | Single hierarchical plan contract in `plan_data` | Phase 18 | Viewer planning can rely on one payload shape |
| Separate page for editing flows | In-place modal editing on the same page | Phase 19 goal | Editing must preserve page context and not navigate away |

**Deprecated/outdated:**
- Extending `FourWeekGrid` as the primary implementation path: useful as a composition reference only
- Building a second workout edit form: unnecessary duplication while `WorkoutForm` patterns already exist

## Open Questions

1. **How aggressive should initial current-week focusing be?**
   - What we know: the first current-or-upcoming week should be the landing bias, not week 1.
   - What's unclear: whether the page should auto-scroll immediately on mount, only after an explicit “Jump to current week” affordance, or only when the current week is outside the first viewport.
   - Recommendation: plan for non-jarring initial focus first. Prefer an initial `scrollIntoView` only when the current/upcoming week is well below the fold.

2. **How compact can collapsed past-phase strips be without hiding useful context?**
   - What we know: only past phases may collapse.
   - What's unclear: how much summary content belongs in the collapsed strip.
   - Recommendation: keep collapsed strips to phase label, date range, and week count. Do not include hidden workout content in the collapsed state.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest `3.0.0` in repo with React Testing Library `16.3.2` |
| Config file | `vitest.config.js` |
| Quick run command | `npx vitest run tests/unit/trainingplan.test.jsx tests/workoutForm.test.jsx tests/unit/useHierarchicalPlan.test.jsx` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| VIEW-01 | Phase timeline renders correct labels, colors, and jump targets from `phases[]` | component | `npx vitest run tests/unit/trainingplan.test.jsx` | ✅ expand existing |
| VIEW-02 | Week cards render summary band, 7 day cells, focus text, and explicit rest states | component | `npx vitest run tests/unit/trainingplan.test.jsx` | ✅ expand existing |
| VIEW-03 | Clicking a workout card opens detail modal with zone, duration, sport, structure, and completion action | component | `npx vitest run tests/unit/trainingplan.test.jsx` | ✅ expand existing |
| VIEW-04 | Editing from the modal saves sport/type/name/description/duration/distance changes back into the grid | component + hook contract | `npx vitest run tests/unit/trainingplan.test.jsx tests/unit/useHierarchicalPlan.test.jsx` | ✅ expand existing |

### Sampling Rate
- **Per task commit:** `npx vitest run tests/unit/trainingplan.test.jsx`
- **Per wave merge:** `npx vitest run tests/unit/trainingplan.test.jsx tests/workoutForm.test.jsx tests/unit/useHierarchicalPlan.test.jsx`
- **Phase gate:** `npm test`

### Wave 0 Gaps
- [ ] `tests/unit/trainingplan.test.jsx` — add hierarchical-plan viewer coverage for VIEW-01 through VIEW-04
- [ ] `tests/unit/mockAppData.js` — add a realistic `hierarchicalPlan.plan.plan_data` fixture with phases, multiple weeks, empty days, and editable workouts
- [ ] `tests/unit/useHierarchicalPlan.test.jsx` — add explicit patch-shape assertions for Phase 19 workout field edits if the final patch payload shape changes

## Sources

### Primary (HIGH confidence)
- Internal code audit:
  - `src/hooks/useHierarchicalPlan.js` — canonical load/mutate contract
  - `src/components/ui/ResponsiveModal.jsx` — responsive modal wrapper
  - `src/components/planner/WorkoutForm.jsx` — existing workout form semantics
  - `src/pages/LongTermPlanPage.jsx` — current integration surface
  - `tests/unit/claudeCoach.schema.test.js` — hierarchical plan fixture shape
- MDN CSS `position`: https://developer.mozilla.org/en-US/docs/Web/CSS/position
  - checked sticky behavior, repaint caveats, and accessibility/performance notes
- Radix Dialog docs: https://www.radix-ui.com/primitives/docs/components/dialog
  - checked controlled open state, title/description semantics, focus trap, and close behavior
- React docs, Preserving and Resetting State: https://react.dev/learn/preserving-and-resetting-state
  - checked `key`-driven form reset behavior
- Testing Library queries docs: https://testing-library.com/docs/queries/about/
  - checked semantic-query priority and async query guidance

### Secondary (MEDIUM confidence)
- npm registry metadata via `npm view` on 2026-03-30
  - verified latest published versions and publication dates for React, Radix Dialog, Vaul, Vitest, and Testing Library React

### Tertiary (LOW confidence)
- Vaul GitHub repository: https://github.com/emilkowalski/vaul
  - used only to note the upstream repo currently states it is unmaintained; this is relevant as a planning risk, not as a reason to replace it in this phase

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - the phase can reuse the existing repo stack and verified hook/modal surfaces without adding dependencies
- Architecture: HIGH - the local codebase and locked decisions strongly constrain the right structure
- Pitfalls: HIGH - most risks are already visible from the current page structure, modal stack, and official sticky/dialog guidance

**Research date:** 2026-03-30
**Valid until:** 2026-04-29
