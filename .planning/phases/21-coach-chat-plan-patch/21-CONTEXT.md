# Phase 21: Coach Chat + Plan Patch - Context

**Gathered:** 2026-03-31
**Status:** Ready for planning

<domain>
## Phase Boundary

Conversational coaching chat powered by Claude that integrates with the hierarchical training plan. Users can ask for advice grounded in their current plan and recent Strava data. The coach can propose specific modifications (patches) to future workouts, which the user can review and apply atomically via the existing `applyPatch` RPC.

</domain>

<decisions>
## Implementation Decisions

### UI & Workflow Integration
- **D-01: Hybrid Coach UI.** The coach lives in two places:
  - **Standalone Page:** `CoachPage.jsx` remains the home for deep conversation history.
  - **Contextual Sidebar/FAB:** A new chat interface (sidebar or floating action button) is added to `LongTermPlanPage.jsx` for quick tweaks while viewing the plan.
- **D-02: Chat-Only Patch Review.** Proposed plan changes are displayed as an inline "Change Card" within the chat message history. The card lists specific edits (e.g., "Mon Oct 12: Easy Run -> 45 min").
- **D-03: Explicit Apply.** Changes are only applied when the user clicks an "Apply Changes" button on the Change Card. No visual diff on the plan grid is required for this phase.

### Context Injection Strategy
- **D-04: +/- Window Context.** Claude receives a focused slice of the training plan:
  - Last 2 weeks of completed/skipped workouts.
  - Current week.
  - Next 4 weeks of scheduled workouts.
- **D-05: Activity Context.** Recent Strava activity data (last 7-14 days) is included in the payload to help Claude understand actual performance vs. the plan.

### Legacy Transition
- **D-06: Remove Legacy 'Weekly Plan' Tab.** The "Weekly Plan" tab in `CoachPage.jsx` (which uses Gemini and `workout_entries`) is removed. The `LongTermPlanPage` is now the primary destination for plan management.
- **D-07: Claude as Primary Backend.** The `gemini-coach` invocation path is replaced by `claude-coach` for all conversational coaching features.

### Coach Personality & Capability
- **D-08: Future-Only Authority.** Claude is authorized to suggest patches only for the **current week and next 4 weeks**. Historic plan data is read-only for context.
- **D-09: Tweak over Overhaul.** Claude focuses on targeted patches (moving workouts, adjusting duration/distance). For a "whole new plan," it should recommend the user use the "Regenerate Plan" feature in the `LongTermPlanPage`.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Logic & Data
- `src/hooks/useHierarchicalPlan.js` — The `applyPatch` method and plan state management.
- `src/hooks/useCoachConversations.js` — Persistence logic for chat history.
- `src/lib/coachPayload.js` — The utility used to gather context for AI coach calls.
- `supabase/functions/claude-coach/index.ts` — The Edge Function implementation (system prompts and JSON schema).

### UI Reference
- `src/pages/CoachPage.jsx` — Current standalone chat UI.
- `src/pages/LongTermPlanPage.jsx` — The planner interface where the contextual chat will be added.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `useHierarchicalPlan`: Already exposes `applyPatch(patchArray)` which handles the atomic Postgres RPC.
- `useCoachConversations`: Manages the `coach_conversations` and `coach_messages` tables.
- `coachPayload.js`: Needs to be extended to include the hierarchical plan "window".

### Integration Points
- `LongTermPlanPage.jsx`: Needs to host the new "Contextual Chat" UI component.
- `CoachPage.jsx`: Needs to switch its backend from `gemini-coach` to `claude-coach` and remove the legacy tab.

</code_context>

<specifics>
## Specific Ideas

- **Change Card Schema:** The AI should return a structured JSON block alongside its text response when suggesting a patch. The frontend will parse this to render the review card.
- **Drafting:** The "Change Card" should show the current value vs the proposed value for clarity.

</specifics>

<deferred>
## Deferred Ideas

- **Visual Diff on Grid:** Highlighting affected days on the planner grid during patch review.
- **Mobile Chat DND:** Full drag-and-drop within the chat interface.
- **Automatic Replanning:** AI adjusting the plan without user confirmation (Explicitly out of scope).

</deferred>

---

*Phase: 21-coach-chat-plan-patch*
*Context gathered: 2026-03-31*
