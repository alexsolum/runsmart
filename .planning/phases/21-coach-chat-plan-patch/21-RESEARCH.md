# Phase 21: Coach Chat + Plan Patch - Research

**Researched:** 2026-03-31
**Domain:** Conversational AI coaching with hierarchical plan context injection and structured patch proposals
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01: Hybrid Coach UI.** The coach lives in two places:
  - **Standalone Page:** `CoachPage.jsx` remains the home for deep conversation history.
  - **Contextual Sidebar/FAB:** A new chat interface (sidebar or floating action button) is added to `LongTermPlanPage.jsx` for quick tweaks while viewing the plan.
- **D-02: Chat-Only Patch Review.** Proposed plan changes are displayed as an inline "Change Card" within the chat message history. The card lists specific edits (e.g., "Mon Oct 12: Easy Run -> 45 min").
- **D-03: Explicit Apply.** Changes are only applied when the user clicks an "Apply Changes" button on the Change Card. No visual diff on the plan grid is required for this phase.
- **D-04: +/- Window Context.** Claude receives a focused slice of the training plan: Last 4 weeks of completed/skipped workouts + Current week + Next 6 weeks of scheduled workouts.
- **D-05: Activity Context.** Recent Strava activity data (last 24 days) is included in the payload.
- **D-06: Remove Legacy 'Weekly Plan' Tab.** The "Weekly Plan" tab in `CoachPage.jsx` (Gemini + `workout_entries`) is removed.
- **D-07: Claude as Primary Backend.** The `gemini-coach` invocation path is replaced by `claude-coach` for all conversational coaching features.
- **D-08: Future-Only Authority.** Claude is authorized to suggest patches only for the current week and forward to the goal race. Historic plan data is read-only for context.
- **D-09: Tweak over Overhaul.** Claude focuses on targeted patches (moving workouts, adjusting duration/distance). Whole-plan replacement recommends the Regenerate Plan feature.

### Claude's Discretion
None specified — all decisions are locked.

### Deferred Ideas (OUT OF SCOPE)
- Visual Diff on Grid: Highlighting affected days on the planner grid during patch review.
- Mobile Chat DND: Full drag-and-drop within the chat interface.
- Automatic Replanning: AI adjusting the plan without user confirmation.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| COACH-02 | User can chat with Claude coach that has full plan context + recent Strava activity data, receiving personalized coaching advice | Requires new `chat` mode in claude-coach Edge Function; coachPayload.js needs hierarchical plan window extension |
| COACH-03 | Claude coach chat can suggest specific plan modifications that the user can review and apply to their stored plan | Requires structured patch JSON in Edge Function response; ChangeCard UI component; wiring to `applyPatch` RPC |
</phase_requirements>

---

## Summary

Phase 21 builds conversational coaching on top of the fully shipped hierarchical plan stack (Phases 17-20). The core infrastructure is already in place: `useHierarchicalPlan.applyPatch()` handles atomic plan writes via Postgres RPC, `useCoachConversations` handles conversation/message persistence, and the `claude-coach` Edge Function has a proven Anthropic API integration. What does not exist yet is a chat mode in the Edge Function, a hierarchical plan window in the payload builder, and the UI surfaces for both the standalone chat overhaul and the in-plan FAB/sidebar.

The biggest design challenge is the dual-output response format. In "chat" mode the Edge Function must return both a prose reply AND an optional structured patch proposal in a single response. The patch schema must be parseable client-side without special libraries. Because the current Edge Function only handles full plan generation (mode=generate), all chat routing is new work.

The legacy "Weekly Plan" tab removal involves deleting approximately 150 lines of CoachPage JSX plus the `gemini-coach` invocation paths (`fetchWeeklyPlan`, `handleRevisionRequest`, `handleAcceptPlan`, `fetchInitialInsights`). The new `handleSendMessage` will call `claude-coach` with `mode: "chat"`.

**Primary recommendation:** Build the Edge Function chat mode first (defines the contract for both UI surfaces), then wire the standalone CoachPage, then add the contextual FAB/panel to LongTermPlanPage as the final integration.

---

## Standard Stack

### Core (already in project, no new installs)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Supabase JS | 2.x | Edge Function invocation via `client.functions.invoke` | Established pattern in all hooks |
| React 18 | 18.x | UI, hooks, state | Project baseline |
| Tailwind + shadcn/ui | current | Styling and primitive components | Project baseline |
| Vitest + RTL | current | Tests | Project baseline |

### No New Dependencies Required
All needed capabilities are already installed. The plan-patch architecture uses the existing `apply_plan_patch` Postgres RPC. The Edge Function uses raw fetch to Anthropic (established pattern from Phase 17). No new npm packages are needed.

**Installation:** No new packages.

---

## Architecture Patterns

### Recommended Project Structure Changes
```
supabase/functions/claude-coach/
  index.ts                          # ADD: chat mode branch alongside existing generate mode

src/lib/
  coachPayload.js                   # EXTEND: add buildHierarchicalPlanWindow(planData)

src/pages/
  CoachPage.jsx                     # REWORK: remove gemini-coach paths, remove "Weekly Plan" tab,
                                    #         wire new chat mode to claude-coach

src/components/
  CoachFAB.jsx                      # NEW: floating action button for in-plan chat
  chat/
    ChangeCard.jsx                  # NEW: patch review card rendered inside chat thread
    ChatPanel.jsx                   # NEW: reusable chat panel (used by CoachPage + CoachFAB)
```

### Pattern 1: Edge Function Chat Mode (Dual-Output)

**What:** The `claude-coach` Edge Function gains a `mode` discriminator. When `mode === "chat"`, it returns a prose reply plus an optional `patch` array. When `mode === "generate"`, existing behavior is unchanged.

**The response schema for chat mode:**
```json
{
  "text": "Here's what I'd recommend...",
  "patch": [
    {
      "week": 3,
      "dayDate": "2026-04-14",
      "workoutId": "w3-mon-easy",
      "fields": {
        "durationMinutes": 45,
        "description": "Reduced to 45 min given fatigue signals this week"
      }
    }
  ],
  "patchSummary": "Mon Apr 14: Easy Run duration reduced from 60 min to 45 min"
}
```

`patch` is `null` when Claude is giving advice without proposing a modification. `patch` is a non-null array when Claude proposes specific changes. The frontend uses `response.patch !== null` to decide whether to render a ChangeCard.

**The system prompt addition for chat mode:**
- Authorize future-only patches (current week through race week)
- Instruct Claude to return patch in the exact `patch` JSON array format matching `applyPatch` expectations
- Instruct Claude to keep patches minimal (tweak, not overhaul)
- Provide the hierarchical plan window as a user message section

**Conversation history format** (for multi-turn chat):
```json
[
  { "role": "user", "content": "Can you lighten Monday?" },
  { "role": "assistant", "content": "<prior AI response text>" }
]
```
The Edge Function must pass `messages` array to Anthropic API with full history, not just the latest message.

### Pattern 2: applyPatch Contract (already implemented)

`useHierarchicalPlan.applyPatch(patchArray)` accepts:
```javascript
[
  {
    week: 3,                    // weekNumber (integer)
    dayDate: "2026-04-14",      // ISO date string
    workoutId: "w3-mon-easy",   // workout id string
    fields: {                   // partial workout fields to update
      sport: "run",
      type: "aerobic",
      name: "Easy Run",
      description: "...",
      durationMinutes: 45,
      distanceKm: 10
    }
  }
]
```

`applyPatch` calls the `apply_plan_patch` Postgres RPC with `p_plan_id` and `p_patches` (JSON-serialized). On success it dispatches `"patched"` which updates `state.plan.plan_data`. The plan viewer re-renders automatically because it reads from `hierarchicalPlan.plan.plan_data` via `useAppData()`.

**Key insight:** The patch array from Claude's JSON response can be passed directly into `applyPatch`. The field names in the schema must match exactly. `week` is `weekNumber` from `plan_data.weeks[n].weekNumber`.

### Pattern 3: Hierarchical Plan Window for coachPayload.js

`coachPayload.js` currently builds context from `activePlan` (training_plans table row) and `trainingBlocks` (training_blocks table). It has no knowledge of `hierarchical_plans.plan_data`.

**New function to add:**
```javascript
function buildHierarchicalPlanWindow(planData, weeksBack = 4, weeksForward = 6) {
  // Returns: { pastWeeks: [...], currentWeek: {...}, futureWeeks: [...] }
  // pastWeeks: last N weeks (completed/skipped workouts only — historic context)
  // currentWeek: current ISO week
  // futureWeeks: next N weeks (scheduled workouts — patchable range)
}
```

The window is added as `hierarchicalPlanWindow` in the `buildCoachPayload` return object. The Edge Function in chat mode includes this in the user prompt as a structured section.

**Activity window change:** D-05 specifies 24 days for chat mode vs the current default of 7 days. A new `PAYLOAD_WINDOWS_BY_MODE` entry for `"chat"` mode is needed.

### Pattern 4: ChangeCard Component

Rendered inside the chat message thread when `msg.patch !== null`. Structure:

```jsx
function ChangeCard({ patch, patchSummary, onAccept, onDismiss, applying, applied }) {
  // Shows: patchSummary (human-readable from AI)
  // Shows per-entry: week number, date, workout name, what changes
  // "Apply Changes" button → onAccept(patch)
  // "Dismiss" button → onDismiss()
  // After apply: shows "Changes applied — visible in plan viewer" confirmation
}
```

`coach_messages` stores the assistant message including the patch array. When rendering a persisted assistant message that has `content.patch !== null`, the ChangeCard is rendered below the text. The `applied` state is local (not persisted) — if the user re-enters a conversation, the ChangeCard will re-show but applying again will overwrite the same fields.

### Pattern 5: CoachFAB/Sidebar in LongTermPlanPage

```jsx
// In LongTermPlanPage return JSX:
<>
  <PlanViewer ... />
  <CoachFAB planData={planData} onPatchApplied={handleApplyPatch} />
</>
```

`CoachFAB` opens a fixed-position overlay panel (bottom-right). The panel contains a standalone `ChatPanel` component with its own message state. On `onPatchApplied`, the FAB calls `hierarchicalPlan.applyPatch()` from its parent context.

### Anti-Patterns to Avoid
- **Two-step JSON parse:** Don't try to extract patch JSON via regex from prose. Claude must return a clean JSON response envelope. The system prompt must enforce the response format explicitly.
- **Persisting applied state:** Don't add an `applied: boolean` column to `coach_messages`. Applied state is derived at render time. If re-applying a patch, it's idempotent.
- **Auto-apply on page load:** Never call `applyPatch` automatically when loading a conversation with a patch message. Explicit user action only (D-03).
- **Calling gemini-coach for chat:** All new chat functionality must use `claude-coach`. The gemini-coach endpoint is deprecated (CLEAN-01, Phase 22).

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Atomic plan writes | Custom JSONB mutation logic | `applyPatch` → `apply_plan_patch` RPC | Already built with row-level locking; custom logic risks partial writes |
| Conversation persistence | Local state only | `useCoachConversations` | DB-backed hook already tested; handles create/add/load |
| Multi-turn history | Rolling window trimming | Pass full `messages` array from loaded conversation | Anthropic API context window is large; trimming adds complexity without benefit at current scale |
| Markdown rendering | Custom parser | Plain `<p>` text rendering (current pattern) | Coach replies are coaching prose, not markdown docs |

**Key insight:** The entire data layer for this phase is already built. The work is: (1) new Edge Function mode, (2) payload extension, (3) UI composition.

---

## Common Pitfalls

### Pitfall 1: Chat Mode JSON Response Truncation
**What goes wrong:** Claude returns a long patch array + long prose response and `stop_reason !== "end_turn"` causes the Edge Function to return 422.
**Why it happens:** Chat responses are shorter than full plan generation, but if the plan window is too large the combined response can still truncate.
**How to avoid:** Cap `MAX_OUTPUT_TOKENS` for chat mode at 4096 (vs 32000 for generate). Keep the plan window to the exact specified window (4 back + current + 6 forward = 11 weeks max). Strip completed workout fields from past weeks (only keep date, name, completed flag).
**Warning signs:** 422 responses from Edge Function; `stop_reason: "max_tokens"` in raw Anthropic response.

### Pitfall 2: Patch Schema Mismatch
**What goes wrong:** Claude returns `weekNumber` instead of `week`, or `workoutDate` instead of `dayDate`, causing `applyPatch` to silently fail or throw.
**Why it happens:** Claude infers field names from context rather than following the exact schema.
**How to avoid:** The system prompt must show a literal example of the exact patch array format. Include the exact TypeScript-style schema comment in the prompt. The Edge Function must validate patch array structure before returning it to the client.
**Warning signs:** `applyPatch` throws "No matching workout found" (Postgres RPC error); plan appears unchanged after accepting.

### Pitfall 3: Gemini References Left Behind
**What goes wrong:** CoachPage calls `gemini-coach` for the initial insights load after the tab removal, or the `useAppData` shape includes `workoutEntries` usage in the coach that was only used for the weekly plan tab.
**Why it happens:** The CoachPage currently uses `workoutEntries` in its `useAppData` destructure for the accept-plan handler. Removing the tab must also remove this destructure.
**How to avoid:** Audit all `gemini-coach` and `workoutEntries` references in CoachPage as part of the removal task.
**Warning signs:** Network requests to `gemini-coach` visible in browser devtools; unused variable lint warnings for `workoutEntries`.

### Pitfall 4: Duplicate Plan Window Builds
**What goes wrong:** Both CoachPage and CoachFAB independently implement plan window logic, producing inconsistent slices.
**Why it happens:** Temptation to add plan window logic inline in each component.
**How to avoid:** All plan context building goes through `coachPayload.js`. Both surfaces call `buildCoachPayload` with the same interface.

### Pitfall 5: ChangeCard Rendering on Historical Messages
**What goes wrong:** Every message loaded from `coach_messages` with a `patch` field renders an "Apply Changes" button, including patches applied months ago.
**Why it happens:** No persistent `applied` tracking in the DB.
**How to avoid:** The ChangeCard "Apply Changes" button is always available (clicking it again is idempotent). Add a `"(previously applied)"` label based on the message's age, or accept the UX tradeoff. Do not add a DB column to track applied state (out of scope).

---

## Code Examples

### applyPatch Call Site (frontend)
```javascript
// Source: src/hooks/useHierarchicalPlan.js line 104
// patchArray comes directly from the AI response
const updatedPlanData = await hierarchicalPlan.applyPatch([
  {
    week: 3,
    dayDate: "2026-04-14",
    workoutId: "w3-mon-easy",
    fields: { durationMinutes: 45, description: "Reduced for recovery" }
  }
]);
// hierarchicalPlan.plan.plan_data is now updated; plan viewer re-renders
```

### Edge Function Chat Mode Dispatch (Deno)
```typescript
// New branch in claude-coach/index.ts Deno.serve handler
if (payload.mode === "chat") {
  const userMessages = buildChatMessages(payload); // history + new user msg + plan window
  const aiResponse = await fetch(ANTHROPIC_URL, {
    method: "POST",
    headers: { "x-api-key": anthropicKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: 4096,          // much smaller than generate mode
      system: CHAT_SYSTEM_PROMPT, // separate system prompt with patch schema instructions
      messages: userMessages,
    }),
  });
  // Parse response, extract patch if present, return { text, patch, patchSummary }
}
```

### Plan Window Builder (coachPayload.js)
```javascript
// New export to add to src/lib/coachPayload.js
export function buildHierarchicalPlanWindow(planData, todayIso) {
  if (!planData?.weeks) return null;
  const today = new Date(todayIso);
  // Find current week index
  // Return { pastWeeks, currentWeek, futureWeeks }
  // pastWeeks: only { weekNumber, startDate, phase, focus, days: [{ date, workouts: [{ id, name, completed }] }] }
  // futureWeeks: full workout objects (patchable)
}
```

### Persisting Chat Messages with Patch
```javascript
// coach_messages.content shape for assistant messages with patch:
// { text: "...", patch: [...] | null, patchSummary: "..." | null }
// Stored as JSONB in coach_messages.content column
// Current schema stores content as any type — no migration needed
await coachConversations.addMessage(conv.id, "assistant", {
  text: response.text,
  patch: response.patch ?? null,
  patchSummary: response.patchSummary ?? null,
});
```

---

## Current State Inventory

### What Exists (can be reused directly)

| Asset | Location | Reuse |
|-------|----------|-------|
| `applyPatch(patchArray)` | `useHierarchicalPlan.js:104` | Direct call — exact API is stable |
| `useCoachConversations` | `src/hooks/useCoachConversations.js` | Full reuse: `createConversation`, `addMessage`, `loadMessages`, `loadConversations` |
| Conversation sidebar UI | `CoachPage.jsx:730-790` | Extract as `<ConversationSidebar>` component |
| Chat message thread UI | `CoachPage.jsx:801-860` | Extract as `<ChatThread>` component |
| Chat input area | `CoachPage.jsx:837-858` | Extract as `<ChatInput>` component |
| `buildCoachPayload` | `src/lib/coachPayload.js` | Extend — add `hierarchicalPlanWindow` and `chat` mode windows |
| `claude-coach` Edge Function | `supabase/functions/claude-coach/index.ts` | Extend — add `chat` mode branch |
| Anthropic API raw fetch pattern | `index.ts:827-840` | Copy pattern for chat mode call |

### What Must Be Built

| Asset | Where | Notes |
|-------|-------|-------|
| `buildHierarchicalPlanWindow` | `coachPayload.js` | New export function |
| `chat` mode in Edge Function | `claude-coach/index.ts` | New branch in Deno.serve handler |
| `CHAT_SYSTEM_PROMPT` | `claude-coach/index.ts` | Separate from plan-generation prompt; includes patch schema |
| `ChangeCard` component | `src/components/chat/ChangeCard.jsx` | Renders inside chat thread |
| `ChatPanel` component | `src/components/chat/ChatPanel.jsx` | Reusable; used in CoachPage and CoachFAB |
| `CoachFAB` component | `src/components/CoachFAB.jsx` | FAB + overlay panel for LongTermPlanPage |
| LongTermPlanPage integration | `src/pages/LongTermPlanPage.jsx` | Mount CoachFAB with plan context |
| CoachPage rework | `src/pages/CoachPage.jsx` | Remove gemini-coach paths, remove Weekly Plan tab, wire claude-coach |

### What Must Be Deleted

| Asset | Location | Reason |
|-------|----------|--------|
| `fetchInitialInsights` handler | `CoachPage.jsx:489` | Called `gemini-coach` with `mode: "initial"` |
| `handleSendFollowup` gemini call | `CoachPage.jsx:518` | Called `gemini-coach` with `mode: "followup"` |
| `fetchWeeklyPlan` handler | `CoachPage.jsx:559` | Called `gemini-coach` with `mode: "plan"` |
| `handleRevisionRequest` handler | `CoachPage.jsx:588` | Called `gemini-coach` with `mode: "plan_revision"` |
| `handleAcceptPlan` handler | `CoachPage.jsx:622` | Wrote to `workout_entries` table |
| "Weekly Plan" tab UI | `CoachPage.jsx:864-end` | Entire `activeTab === "plan"` section |
| Weekly plan state | `CoachPage.jsx:408-415` | `planLoading`, `planError`, `planData`, etc. |
| `workoutEntries` destructure | `CoachPage.jsx:392` | Only used for accept-plan handler |
| `WeeklyPlanTable` component | `CoachPage.jsx:297` | Legacy weekly plan display |
| `PlanRevisionMessage` component | `CoachPage.jsx:368` | Legacy plan revision chat display |
| Tab switcher UI | `CoachPage.jsx:694-717` | "Coaching Chat" / "Weekly Plan" tabs |

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Gemini Flash for coaching | Claude Sonnet 4.6 | Phase 17 (complete) | Edge Function already using Anthropic API |
| Per-week workout_entries table | Hierarchical JSONB plan document | Phase 17-18 (complete) | `applyPatch` RPC replaces all direct table writes for plan data |
| Inline plan building in component | `useHierarchicalPlan` hook | Phase 18 (complete) | Stable data contract available |
| Standalone coach page only | Dual surface (standalone + contextual FAB) | Phase 21 (this phase) | LongTermPlanPage becomes the primary plan interaction surface |

---

## Open Questions

1. **Conversation isolation for FAB chat**
   - What we know: `useCoachConversations` creates named conversations with `user_id` filtering.
   - What's unclear: Should the FAB chat create a separate conversation (visible in the standalone CoachPage sidebar), or use a hidden "contextual" conversation type?
   - Recommendation: Create a regular conversation titled "Plan chat — [plan event name]". It appears in the CoachPage conversation list, which helps the user trace their coaching history. No schema change needed.

2. **Plan window size and token budget**
   - What we know: 11 weeks of hierarchical plan data (4 back + current + 6 forward) could be 50-100 workouts. At ~200 chars each, that is ~10-20k chars of plan context added to the payload.
   - What's unclear: Does this push total input tokens above the comfortable range for chat responsiveness?
   - Recommendation: Strip past workout fields to minimum (date, name, completed boolean) in `buildHierarchicalPlanWindow`. Future workouts include full details. Test total payload size before finalizing.

3. **Chat system prompt scope**
   - What we know: The current `SYSTEM_PROMPT` in `claude-coach/index.ts` is ~10,000 chars of training methodology. This is the plan generation prompt.
   - What's unclear: Should the chat mode reuse the same system prompt or use a shorter, chat-optimized one?
   - Recommendation: Create a `CHAT_SYSTEM_PROMPT` that is a condensed version. Include: key coaching principles (abbreviated), the exact patch schema with example, and the future-only authority rule (D-08, D-09). The full training methodology is not needed for chat tweaks.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest + React Testing Library |
| Config file | `vitest.config.js` at project root |
| Quick run command | `npm test -- --run tests/unit/coachPayload.test.js` |
| Full suite command | `npm test -- --run` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| COACH-02 | `buildHierarchicalPlanWindow` returns correct 4+1+6 week slice | unit | `npm test -- --run tests/unit/coachPayload.test.js` | Wave 0 |
| COACH-02 | Claude-coach Edge Function chat mode returns `{ text, patch: null }` for advice-only responses | unit | `npm test -- --run tests/unit/claudeCoach.schema.test.js` | Extend existing |
| COACH-02 | CoachPage renders chat without Weekly Plan tab after removal | component | `npm test -- --run tests/unit/coach.test.jsx` | Extend existing |
| COACH-03 | Claude-coach Edge Function chat mode returns `{ text, patch: [...] }` when modification suggested | unit | `npm test -- --run tests/unit/claudeCoach.schema.test.js` | Extend existing |
| COACH-03 | ChangeCard renders with correct current vs proposed values and Apply/Dismiss buttons | component | `npm test -- --run tests/unit/ChangeCard.test.jsx` | Wave 0 |
| COACH-03 | Clicking "Apply Changes" calls `hierarchicalPlan.applyPatch` with the patch array | component | `npm test -- --run tests/unit/coach.test.jsx` | Wave 0 (test case) |

### Sampling Rate
- **Per task commit:** `npm test -- --run tests/unit/coachPayload.test.js tests/unit/claudeCoach.schema.test.js`
- **Per wave merge:** `npm test -- --run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/unit/ChangeCard.test.jsx` — covers COACH-03 ChangeCard rendering and interactions
- [ ] New test cases in `tests/unit/coachPayload.test.js` — covers `buildHierarchicalPlanWindow` function
- [ ] New test cases in `tests/unit/claudeCoach.schema.test.js` — covers chat mode response schema validation
- [ ] New test cases in `tests/unit/coach.test.jsx` — covers gemini removal, new chat wiring, ChangeCard rendering

---

## Sources

### Primary (HIGH confidence)
- Direct file read: `src/hooks/useHierarchicalPlan.js` — `applyPatch` signature, patch array shape, RPC call pattern
- Direct file read: `src/hooks/useCoachConversations.js` — full hook API surface, DB schema usage
- Direct file read: `src/lib/coachPayload.js` — all existing payload-building functions, mode windows
- Direct file read: `supabase/functions/claude-coach/index.ts` — system prompt structure, Anthropic API call pattern, response handling
- Direct file read: `src/pages/CoachPage.jsx` — all existing chat UI, gemini references, message persistence pattern
- Direct file read: `src/pages/LongTermPlanPage.jsx` — page structure, `hierarchicalPlan` usage, `applyPatch` call site

### Secondary (MEDIUM confidence)
- Direct file read: `tests/unit/coach.test.jsx` — existing test coverage to understand what must be preserved or updated
- Direct file read: `tests/unit/mockAppData.js` — fixture shapes for `makeAppData()` context mock

---

## Metadata

**Confidence breakdown:**
- Current state inventory (what exists vs. what to build): HIGH — read directly from source files
- applyPatch contract: HIGH — read from hook and confirmed by existing usage in LongTermPlanPage
- coachPayload extension points: HIGH — read full module, all entry points visible
- Edge Function extension pattern: HIGH — existing mode/dispatch pattern is clear
- Chat system prompt design: MEDIUM — recommended approach, needs validation against token budget
- ChangeCard UX: MEDIUM — schema clear, exact interaction detail left to implementation

**Research date:** 2026-03-31
**Valid until:** 2026-04-28 (30 days — stack is stable)
