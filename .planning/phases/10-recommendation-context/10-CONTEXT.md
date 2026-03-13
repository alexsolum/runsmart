# Phase 10: Recommendation Context - Context

**Gathered:** 2026-03-13
**Status:** Ready for planning

<domain>
## Phase Boundary

Feed weekly recommendations in `Ukeplan` with the selected week's intent from `Treningsplan` plus the active admin coaching philosophy from `coach_philosophy_documents`. This phase clarifies the recommendation contract and precedence rules, not deeper day-by-day constraint solving or new admin authoring features.

</domain>

<decisions>
## Implementation Decisions

### Selected week intent
- The selected week type from `Treningsplan` should be treated as a hard planning directive for weekly AI recommendations.
- The selected target mileage should be treated as a strong target that the recommendation should stay close to unless a guardrail forces an adjustment.
- Week notes should always be included in recommendation context when they exist.
- `Ukeplan` should show week type, target mileage, and notes in the setup summary before generation rather than repeating them throughout generated session output.

### Coaching philosophy influence
- The active admin coaching philosophy should act as a guiding coaching layer, not the primary driver over the selected week intent.
- Philosophy should shape both week-level planning choices and the rationale for key sessions.
- Explicit red-line rules from the philosophy should be treated as guardrails the recommendation should avoid violating.
- Philosophy influence should be visible implicitly through the recommendation's rationale and choices, not by quoting or foregrounding admin-document text in the UI.

### Conflict handling
- Selected week intent should win by default when it conflicts with broader coaching philosophy preferences.
- Philosophy may override the selected week intent only when following the selected intent would violate an explicit philosophy red-line rule.
- If such an override is necessary, the recommendation should preserve the intended week type before preserving exact target mileage.
- When an override changes the recommendation, the user should get a brief coaching rationale rather than a raw rule dump or silent change.

### Claude's Discretion
- Exact wording of the setup summary, coaching rationale, and any adjustment messaging.
- Exact payload shape used to pass selected week intent and philosophy-derived context into the existing coach generation flow.
- Whether the setup summary is presented inside the existing AI card, adjacent to it, or in a nearby inline section on `Ukeplan`.

</decisions>

<specifics>
## Specific Ideas

- `Treningsplan` already passes week type, target mileage, and notes into the handoff; phase 10 should make those fields materially shape generated recommendations rather than stay as passive display data.
- The recommendation should feel like it is following a coherent coach, but the admin philosophy should stay in the background instead of reading like exposed internal prompt text.
- If a guardrail forces a change, the recommendation should explain the adjustment in normal coaching language.

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/pages/WeeklyPlanPage.jsx`: already renders the AI setup card and displays handoff intent from `Treningsplan`, making it the main place to surface the selected week summary.
- `src/lib/coachPayload.js`: already centralizes the payload sent to coaching flows and is the natural place to add selected-week context for phase 10.
- `supabase/functions/gemini-coach/index.ts`: already loads active philosophy from Supabase and applies it to plan-mode system instructions, so phase 10 can extend the recommendation contract without introducing a new secure fetch path.

### Established Patterns
- AI generation remains routed through the `gemini-coach` Edge Function; philosophy and secure prompt construction stay server-side.
- `Ukeplan` now owns tactical weekly generation while `Treningsplan` provides read-only weekly intent via handoff state.
- Current `planContext` is still anchored to the active plan/current block rather than the specifically selected week, which is the main context gap phase 10 needs to close.

### Integration Points
- `WeeklyPlanPage.jsx` needs to pass the selected week intent into the generation flow and keep the setup summary aligned with what the AI actually uses.
- `coachPayload.js` needs to distinguish selected-week recommendation context from broader active-plan context.
- `gemini-coach/index.ts` and its plan prompt builder need to combine selected-week intent with philosophy guardrails and rationale rules.

</code_context>

<deferred>
## Deferred Ideas

- Day-by-day schedule constraints, preference ranking, and richer conflict resolution beyond explicit red lines belong to Phase 11.
- New admin editing UX or schema changes for coaching philosophy documents are out of scope for Phase 10.
- Exposing philosophy documents directly in the frontend UI is out of scope for this phase.

</deferred>

---

*Phase: 10-recommendation-context*
*Context gathered: 2026-03-13*
