# Phase 9: Ukeplan Ownership - Context

**Gathered:** 2026-03-13
**Status:** Ready for planning

<domain>
## Phase Boundary

Make `Ukeplan` the single tactical weekly-planning surface while `Treningsplan` remains the source of weekly intent. This phase clarifies ownership and workflow location, not richer recommendation logic or advanced constraint handling.

</domain>

<decisions>
## Implementation Decisions

### Ukeplan entry
- AI generation should not appear as a dominant hero module in `Ukeplan`.
- On an empty week, AI generation should still be the first recommended action.
- Show a brief setup summary before generation so the user sees the relevant week context.
- Generated sessions should land directly in the existing weekly grid rather than in a separate review workspace.

### Treningsplan handoff
- `Treningsplan` should become read-only weekly intent for this phase.
- `Treningsplan` should include an explicit CTA or handoff into `Ukeplan`.
- The handoff should carry the selected week's type, target mileage, and notes.
- `Treningsplan` should no longer show a generated weekly structure preview once ownership moves to `Ukeplan`.

### Replace flow
- If the selected week already has entries, the user must explicitly confirm replacement before AI generation writes a new week.
- All existing entries count as protected for phase 9, not only manually edited ones.
- The confirmation can be a simple warning rather than a detailed before/after diff.
- No dedicated restore/versioning feature is required in this phase after replacement is confirmed.

### Claude's Discretion
- Exact visual styling of the `Ukeplan` AI entry point, as long as it is not hero-dominant.
- Exact wording for the handoff CTA and replacement warning.
- Whether the brief setup summary appears inline above the grid or inside the generation panel.

</decisions>

<specifics>
## Specific Ideas

- The ownership shift should be obvious through workflow, not by making AI visually overpower the page.
- `Ukeplan` should feel like the place where the user actually works on the week.
- `Treningsplan` should stay useful for intent and targets, but not compete as a second weekly-generation surface.

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/pages/WeeklyPlanPage.jsx`: already has the day-grid workspace, week summary, and manual add/edit/delete/toggle flows that the new AI entry should integrate into.
- `src/pages/LongTermPlanPage.jsx`: already owns the macro plan, training blocks, and current weekly AI/replan behavior that will need to hand off instead of generating in place.
- `src/lib/coachPayload.js`: already builds plan context and recent training context for coach calls.

### Established Patterns
- Weekly execution is already modeled as entries written into the existing weekly grid rather than separate schedule objects.
- Macro planning and tactical weekly planning are already split across two pages, but current AI ownership is blurred by generation behavior in `LongTermPlanPage`.
- Published coaching philosophy is already loaded at runtime inside `gemini-coach`, so phase 9 should preserve that broader architecture rather than move AI logic client-side.

### Integration Points
- `WeeklyPlanPage.jsx` is the primary UI integration point for the new AI generation entry.
- `LongTermPlanPage.jsx` is the primary place to remove or reduce weekly-generation ownership and add the explicit handoff into `Ukeplan`.
- `supabase/functions/gemini-coach/index.ts` remains the secure AI generation path, even if richer context wiring belongs to later phases.

</code_context>

<deferred>
## Deferred Ideas

- Constraint-priority logic and richer day-by-day preference handling belong to Phase 11.
- Deeper recommendation context from `coach_philosophy_documents` and training-block inputs belongs to Phase 10.
- Restore/version history for replaced weeks is out of scope for Phase 9.

</deferred>

---

*Phase: 09-ukeplan-ownership*
*Context gathered: 2026-03-13*
