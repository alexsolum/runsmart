# Phase 19: Plan Viewer UI - Context

**Gathered:** 2026-03-30
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver the full hierarchical training plan viewer on the long-term plan page: a color-coded phase timeline bar, scrollable week-by-week rows, workout cards, a workout detail modal, and in-modal workout editing. This phase makes the stored plan fully browsable and editable in-place. Drag-and-drop rescheduling belongs to Phase 20. Coach chat and plan patch flows belong to Phase 21.

</domain>

<decisions>
## Implementation Decisions

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

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase requirements and roadmap
- `.planning/ROADMAP.md` — Phase 19 goal, success criteria, and dependency chain for the viewer.
- `.planning/REQUIREMENTS.md` — `VIEW-01`, `VIEW-02`, `VIEW-03`, and `VIEW-04` define the user-visible requirements for this phase.
- `.planning/PROJECT.md` — milestone scope, athlete-first constraints, and the v2.0 plan-viewer intent.
- `.planning/STATE.md` — carried-forward milestone decisions, especially that Phase 20 depends on this viewer being live.

### Prior phase context
- `.planning/phases/12-design-token-foundation/12-CONTEXT.md` — Precision Athlete tokens, typography, tonal surfaces, and the no-line rule.
- `.planning/phases/14-planner-primitives-4-week-grid/14-CONTEXT.md` — prior planner grid decisions that still apply, especially mobile one-week-at-a-time behavior and km-leading weekly summaries.
- `.planning/phases/15-click-to-edit-workflow-fab/15-CONTEXT.md` — prior modal/edit workflow decisions and the existing workout form direction.
- `.planning/phases/18-hierarchical-plan-hook-layer/18-CONTEXT.md` — the hook/data contract this viewer sits on top of.

### Plan data and viewer references
- `src/hooks/useHierarchicalPlan.js` — canonical frontend API for loading the active plan, accessing phases/weeks, editing workouts, and completion actions.
- `src/domain/planSchema.js` — hierarchical plan JSON shape expectations that inform what the viewer can safely assume exists.
- `tests/unit/claudeCoach.schema.test.js` — concrete running-only plan fixture showing `phases`, `weeks`, `days`, `summary`, `primaryZone`, and `humanReadable` fields the viewer should consume.
- `docs/running_coach/output/krs-smve-plan.html` — full-plan HTML viewer reference for the editorial long-form browsing direction.

### Existing implementation surfaces
- `src/pages/LongTermPlanPage.jsx` — current integration surface for the hierarchical plan viewer and regenerate flow.
- `src/components/planner/FourWeekGrid.jsx` — existing grid primitive reference that may be refactored or replaced for the full-plan viewer.
- `src/components/planner/WeekRow.jsx` — prior week-row composition reference.
- `src/components/planner/WorkoutCard.jsx` — prior card-density reference to evolve for the new plan viewer.
- `src/components/planner/WorkoutForm.jsx` — existing workout edit form to reuse behind the modal edit action.
- `src/components/ui/ResponsiveModal.jsx` — adaptive modal/drawer pattern already established for desktop and mobile.

### Design references
- `DESIGN.md` — Precision Athlete visual language, tonal layering, and anti-dashboard design rules.
- `docs/stitch_weekly_planner/screen.png` — existing planner visual target from the earlier grid work.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/pages/LongTermPlanPage.jsx`: already hosts the hierarchical plan section and is the natural home for the full viewer.
- `src/hooks/useHierarchicalPlan.js`: exposes the active plan row plus `getWeek()`, `getPhases()`, `applyPatch()`, and `toggleWorkoutCompleted()` for viewer interactions.
- `src/components/planner/WorkoutForm.jsx`: existing edit form can back the modal's edit mode instead of inventing a second workout editor.
- `src/components/ui/ResponsiveModal.jsx`: gives the established desktop dialog / mobile drawer behavior for workout details.
- `src/components/planner/FourWeekGrid.jsx`, `WeekRow.jsx`, and `WorkoutCard.jsx`: provide reference implementations for week/day/card rendering patterns, though they were built for the old weekly planner data shape.

### Established Patterns
- The app uses utility-class-heavy JSX with Precision Athlete tokens layered on shared UI primitives.
- Hierarchical plan data comes from `plan.plan_data` and is already shaped around `phases[]`, `weeks[]`, `days[]`, and workout objects containing fields like `name`, `description`, `primaryZone`, and `humanReadable`.
- Read-only summary first, edit second is compatible with the existing responsive modal workflow and keeps detail browsing separate from editing state.
- Phase 14's planner language still matters: km should lead weekly summaries, mobile stays one week at a time, and the UI should feel like training intent first rather than a spreadsheet.

### Integration Points
- The viewer should replace the current lightweight hierarchical plan summary in `src/pages/LongTermPlanPage.jsx`.
- The top phase timeline should derive from `hierarchicalPlan.plan.plan_data.phases`.
- Week cards and day cells should derive from `hierarchicalPlan.plan.plan_data.weeks`.
- Workout detail and edit flows should connect to `applyPatch()` for workout field edits and `toggleWorkoutCompleted()` for completion changes.
- The phase bar jump behavior and current/upcoming-week landing logic both anchor to week and phase dates in the hierarchical plan payload.

</code_context>

<specifics>
## Specific Ideas

- The full viewer should feel like an editorial race-prep document rather than a spreadsheet or admin dashboard.
- The preferred week composition is a card with a summary/header band first and the seven day columns underneath.
- The summary/header band should resemble the user-provided visual direction: week badge, phase badge/label, long focus sentence, and a right-aligned compact metric block.
- A sticky/floating phase bar is specifically desired if it can be implemented cleanly in the page's scroll model.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 19-plan-viewer-ui*
*Context gathered: 2026-03-30*
