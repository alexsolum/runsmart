# Phase 11: Constraint-Aware Weekly Plans - Context

**Gathered:** 2026-03-13
**Status:** Ready for planning

<domain>
## Phase Boundary

Make AI weekly generation in `Ukeplan` respect day-by-day weekly constraints, explain tradeoffs when preferences collide, and protect manual edits from silent overwrite. This phase clarifies weekly constraint behavior inside the existing `Ukeplan` generation flow, not new calendar integrations, version history, or broader adaptive replanning.

</domain>

<decisions>
## Implementation Decisions

### Constraint setup
- Constraint entry should stay inside the existing `Ukeplan` AI setup surface rather than move to a separate heavy planning form.
- The phase should directly support these weekly constraints:
  - preferred long-run day
  - preferred hard-workout day
  - commute days
  - double-threshold allowed or forbidden
- Day preferences should be treated as preferred days with flexible fallback, not rigid absolutes.
- Constraint entry should remain optional so quick generation stays fast for simple weeks.

### Manual-edit protection
- Manual-edit protection should be day-level, not whole-week locking.
- Any saved add, delete, or change on a day should mark that day as protected.
- Normal regeneration should not silently overwrite protected days.
- Regeneration should produce a review step before writing changes when protected days exist.
- There should still be a separate, explicit full-week override path for replacing protected days when the user wants a full reset.

### Tradeoff explanation
- After generation, the app should show a single explanation summary near the AI setup / week header rather than cluttering each day card.
- The explanation should use short, normal coaching language rather than a technical rule report.
- When tradeoffs occur, the explanation must call out moved sessions and relaxed preferences.
- If the request cannot be fully satisfied, the app should still generate the best-fit week and clearly explain what had to bend.

### Claude's Discretion
- Exact control types for each constraint input, as long as the UI stays compact and structured.
- Exact wording of the review step, full-week override action, and tradeoff summary.
- Exact presentation of the explanation block, as long as it stays close to the AI setup / generated week context.

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/pages/WeeklyPlanPage.jsx`: already owns the AI setup card, selected-week targeting, replacement confirmation, and weekly grid where phase 11 constraints should attach.
- `src/lib/coachPayload.js`: already builds `recommendationContext` and `weekDirective`, making it the natural place to add structured weekly constraint inputs.
- `supabase/functions/gemini-coach/index.ts`: already enforces selected-week directives and returns coaching rationale, so it is the secure integration point for constraint-aware generation and tradeoff messaging.
- `src/hooks/useWorkoutEntries.js`: already applies structured plans into the week and is the key integration point for protecting edited days during regeneration.

### Established Patterns
- `Ukeplan` remains the single tactical weekly-planning surface; `Treningsplan` should continue to supply intent, not own weekly generation.
- Phase 9 already established explicit replacement confirmation for weeks with existing entries.
- Phase 10 established that selected week type and mileage remain primary directives, with philosophy acting as a guardrailed layer beneath them.
- UI flows currently favor compact inline setup over separate review workspaces, so phase 11 should extend that pattern rather than introduce a large standalone planner.

### Integration Points
- `WeeklyPlanPage.jsx` should host the constraint inputs, review behavior, and post-generation explanation summary.
- `coachPayload.js` should distinguish day-level weekly constraints from the already-existing selected-week directive contract.
- `gemini-coach/index.ts` should combine selected-week directives, weekly constraints, and explanation requirements in the secure generation path.
- `useWorkoutEntries.js` will likely need explicit support for partial/regenerated writes or protected-day review behavior.

</code_context>

<specifics>
## Specific Ideas

- The week setup should stay lightweight enough that a user can still generate quickly without filling a full scheduling form every time.
- Constraints should feel like real-life planning preferences, not like a technical rules engine exposed to the user.
- The explanation should read like a coach saying what was moved and why, not like prompt text or validation output.
- The full-week overwrite path should exist for power users, but it must be clearly separated from normal safe regeneration.

</specifics>

<deferred>
## Deferred Ideas

- Version history or restore/undo for replaced weeks.
- Multiple generated weekly variants to choose from.
- New external calendar sync or commute-data integrations.
- Mid-week automatic replanning from executed workouts.

</deferred>

---

*Phase: 11-constraint-aware-weekly-plans*
*Context gathered: 2026-03-13*
