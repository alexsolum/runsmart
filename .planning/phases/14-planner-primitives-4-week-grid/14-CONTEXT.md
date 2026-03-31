# Phase 14: Planner Primitives + 4-Week Grid - Context

**Gathered:** 2026-03-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Build the first visible 4-week planner UI for desktop using the Precision Athlete design system and the Phase 13 domain helpers. This phase delivers the 4-week grid, color-coded workout cards, date labeling, constraint rendering, race/rest states, and the weekly load column. It does not add the full edit workflow, drag-and-drop, or the Phase 16 volume trend header/app shell redesign.

</domain>

<decisions>
## Implementation Decisions

### Grid density and day card detail
- Desktop day cells use balanced cards: enough information to be useful without becoming dense or editorially heavy.
- If a day has multiple workouts, stack all workout cards in the same day cell rather than collapsing them behind a count.
- Workout type is the primary emphasis inside a card; metrics support the training intent rather than leading it.
- Each workout card shows one short description line, clipped after that line.
- Empty day cells include a subtle in-cell add affordance.
- Day columns should use moderate tonal separation, not hard boxed borders.
- Today gets a subtle highlight.
- Weekends do not receive special styling distinct from weekdays.

### Load column presentation
- The weekly load column should be medium width relative to a day column.
- The load column should present both kilometers and hours/minutes.
- Kilometers are the primary planning metric and must lead visually.
- Hours/minutes are secondary supporting context.
- The stacked load bar remains present, but smaller and subordinate to the kilometer readout.
- Status should be color-only with no text label.
- The load column should not show explicit target/reference numbers.
- The stacked bar should be compact.
- The load column should feel slightly distinct from the day cells, but still read as attached to the grid.
- The stacked bar should reuse the exact workout-type color families from Phase 13.
- Empty weeks should show an explicit zero state.

### Constraint and special-day rendering
- Constraint days remain mostly normal day cells, with a clear constraint marker inside the cell rather than turning the whole cell into a constraint state.
- If a day has both a workout and a constraint, the workout remains visually primary and the constraint is supporting context.
- Race/event days should receive a more prominent hero treatment than normal workout cards.
- Rest days should use a quiet labeled card.

### Mobile behavior
- Mobile does not keep the full 4-week board visible; it shows one week at a time.
- Mobile week switching should feel like a swipe/pager interaction.
- Mobile keeps a reduced weekly load summary instead of the full desktop load column.
- Mobile should use a day-first drill-in pattern: the week strip selects a day, and the selected day's full workout list is shown below.

### Claude's Discretion
- Exact component decomposition and naming for grid primitives, day cells, and load column widgets.
- Exact visual treatment of the subtle today highlight and moderate column separation.
- Exact iconography for constraint markers and race/rest states.
- Exact micro-layout of kilometers, hours/minutes, and compact stacked bar within the load column.
- Exact animation and implementation mechanics of the mobile swipe/pager feel.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase requirements and roadmap
- `.planning/ROADMAP.md` — Phase 14 goal, success criteria, and dependency chain within v1.3.
- `.planning/REQUIREMENTS.md` — GRID-01 through GRID-06 define the user-visible requirements for this phase.
- `.planning/PROJECT.md` — Milestone-level intent and current product constraints for the weekly planner redesign.
- `.planning/STATE.md` — Current milestone position and carried-forward decisions from previous phases.

### Prior phase context
- `.planning/phases/12-design-token-foundation/12-CONTEXT.md` — Precision Athlete token strategy, typography, tonal surface rules, and no-line rule.
- `.planning/phases/13-domain-logic-workout-type-registry/13-CONTEXT.md` — Workout type taxonomy, semantic color mapping, and weekly load helper behavior.

### Design references
- `DESIGN.md` — Precision Athlete design language, typography, and surface/elevation guidance.
- `docs/stitch_weekly_planner/screen.png` — Visual reference for the target planner direction.
- `src/styles/pa-tokens.css` — Existing Precision Athlete token file that Phase 14 components must consume.

### Existing implementation surfaces
- `src/pages/WeeklyPlanPage.jsx` — Current weekly planning UI and the primary replacement/integration surface for the desktop planner.
- `src/pages/MobilePage.jsx` — Current mobile weekly planning flow and the integration surface for Phase 14 mobile behavior.
- `src/hooks/useWorkoutEntries.js` — Workout entry loading, creation, update, delete, and protected-day behavior that the grid must sit on top of.
- `src/domain/workoutTypes.js` — Canonical workout type metadata and semantic token references for card rendering.
- `src/domain/compute.js` — Weekly load computation helpers already available for the load column.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/pages/WeeklyPlanPage.jsx`: already contains date helpers, visible-week logic, and the current 4-week loading pattern that can be refactored into planner primitives.
- `src/pages/MobilePage.jsx`: already uses a day-first drill-in structure that aligns with the chosen mobile direction.
- `src/hooks/useWorkoutEntries.js`: already supports range loading, protected-day preview/apply flows, and CRUD actions needed under the new grid.
- `src/components/ui/card.jsx`, `button.jsx`, `dialog.jsx`, `input.jsx`, `textarea.jsx`, `label.jsx`: existing UI primitives that should anchor the new planner components.
- `src/domain/workoutTypes.js`: exposes labels, icons, groups, and semantic tokens as the single source of truth for workout cards.
- `src/domain/compute.js`: already exposes `computeWeeklyLoadStats()` for the Phase 14 load column.

### Established Patterns
- Frontend is JavaScript/JSX with function components and hooks, not TypeScript.
- The app already uses a utility-class-heavy React style layered on top of shared UI primitives.
- Existing workout entry flows are handled through hook actions exposed by `useWorkoutEntries()`, with UI components owning the interaction state.
- Precision Athlete styling is additive and namespaced through `--pa-*` tokens; Phase 14 should consume those tokens rather than introduce parallel color maps.

### Integration Points
- Desktop planner work should replace/refactor the current `WeekSection`, `DayColumn`, `WorkoutEntry`, and related card logic in `src/pages/WeeklyPlanPage.jsx`.
- Mobile planner behavior should evolve the existing `WeekTab` flow in `src/pages/MobilePage.jsx`, not invent a separate disconnected planner model.
- The load column should consume Phase 13 analytics helpers from `src/domain/compute.js`.
- Workout card rendering should consume canonical type metadata from `src/domain/workoutTypes.js`.

</code_context>

<specifics>
## Specific Ideas

- The planner should read as training intent first, not as a spreadsheet of numbers.
- The load column still matters, but kilometers should lead because that is the more intuitive planning metric.
- Race/event days should feel like standout anchors inside the board rather than just another colored card.
- Constraint visibility matters, but it should not overpower the planned workout when both exist.

</specifics>

<deferred>
## Deferred Ideas

- Full tap-to-edit modal workflow, create/edit/delete behavior, and completion actions belong to Phase 15.
- Volume trend header UI belongs to Phase 16; only the Phase 13 computation foundation exists now.
- App shell redesign (sidebar, topbar, mobile nav shell) belongs to Phase 16.
- Drag-and-drop, dark mode, and navigation beyond the 4-week planner window remain out of scope for this phase.

</deferred>

---

*Phase: 14-planner-primitives-4-week-grid*
*Context gathered: 2026-03-24*
