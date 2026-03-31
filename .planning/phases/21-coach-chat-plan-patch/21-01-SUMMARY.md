---
phase: 21
plan: 01
type: execute
subsystem: Coach Chat Backend Contract
status: complete
tags: [coach-backend, edge-function, hierarchical-plan, chat-mode, patch-schema]
duration: 15 minutes
completed: 2026-03-31T18:45:07Z
---

# Phase 21 Plan 01: Coach Chat Backend Contract — Summary

**Goal:** Create the chat mode backend contract for conversational coaching. The claude-coach Edge Function gains a `mode: "chat"` branch that accepts conversation history and returns prose + optional patch suggestions. The coachPayload.js module exports a `buildHierarchicalPlanWindow` function that slices the hierarchical plan into a 4-back + current + 6-forward week window.

**One-liner:** Claude Edge Function chat mode with hierarchical plan context injection and atomic patch validation.

## Execution Summary

### Tasks Completed

**Task 1: Extend coachPayload.js with buildHierarchicalPlanWindow and chat mode** ✓
- Status: ALREADY IMPLEMENTED
- Verification: `npm test -- --run tests/unit/coachPayload.test.js` passed all 16 tests
- Changes: Verified existing implementation was correct

**Task 2: Add chat mode to claude-coach Edge Function** ✓
- Status: IMPLEMENTED AND TESTED
- Files modified: `supabase/functions/claude-coach/index.ts`
- Verification: `npm test -- --run tests/unit/claudeCoach.schema.test.js` passed all 21 tests

## Deliverables

### Backend Contracts Defined

1. **Chat Mode Edge Function Handler**
   - File: `supabase/functions/claude-coach/index.ts`
   - Mode dispatcher: `if (payload.mode === "chat")`
   - System prompt: `CHAT_SYSTEM_PROMPT` (75 lines, includes patch schema with examples)
   - Max tokens: `CHAT_MAX_OUTPUT_TOKENS = 4096`

2. **Hierarchical Plan Window Builder**
   - File: `src/lib/coachPayload.js`
   - Exported: `buildHierarchicalPlanWindow(planData, todayIso, weeksBack=4, weeksForward=6)`
   - Returns: `{ pastWeeks: [...], currentWeek: {...}, futureWeeks: [...] }`
   - Past weeks: Stripped to summary fields (id, name, completed only) for token savings
   - Future weeks: Full workout objects preserved for patchability

3. **Payload Windows**
   - File: `src/lib/coachPayload.js`
   - Entry: `PAYLOAD_WINDOWS_BY_MODE.chat`
   - Windows: `{ summaryWeeks: 4, activityDays: 24, logDays: 7 }`

4. **Chat Response Schema**
   - Format: JSON with `{ text, patch, patchSummary, usage }`
   - Patch validation: `validatePatchArray(patch)` enforces exact structure
   - Patch fields: `{ week, dayDate, workoutId, fields: {...} }`

### Helper Functions Added

1. **buildChatMessages** — Constructs multi-turn message array for Anthropic API
   - Injects context: plan window, recent activities, daily logs, check-ins, runner profile
   - Prepends system-like acknowledge response to establish baseline
   - Appends current user message and full conversation history

2. **validatePatchArray** — Validates patch structure before returning to client
   - Checks: all patches have week (integer), dayDate (YYYY-MM-DD), workoutId (non-empty string), fields (object)
   - Rejects: non-array values, missing fields, invalid date format
   - Allows: null patch (advice-only responses)

### Test Coverage

| Test File | Tests | Status |
|-----------|-------|--------|
| `tests/unit/coachPayload.test.js` | 16 | ✓ PASS |
| `tests/unit/claudeCoach.schema.test.js` | 21 | ✓ PASS |
| **Total** | **37** | **✓ PASS** |

Key test scenarios:
- `buildHierarchicalPlanWindow` returns correctly windowed plan slices for all date cases
- Chat system prompt includes exact patch schema with examples
- Patch validation rejects invalid structures and formats
- `PAYLOAD_WINDOWS_BY_MODE.chat` has correct activity window (24 days)

## Key Implementation Details

### Past Week Stripping
Past weeks (4 weeks back) are aggressively stripped to minimize context tokens:
- Kept fields: `weekNumber, startDate, phase, focus`
- Stripped from workouts: Keep only `id, name, completed` (no duration, distance, zone info)
- Reason: Past weeks are read-only for context; Claude should not suggest changes to them

### Chat System Prompt
- Authorizes changes only to current week and future weeks (no past changes)
- Includes two worked examples: one with patch, one without
- Specifies exact JSON envelope (no markdown, no extra text)
- Emphasizes tweaks over overhaul (recommend "Regenerate Plan" feature for full rework)

### Mode Dispatch
The Edge Function now has dual behavior:
- **`mode === "chat"`**: Conversational coaching with optional patches (4096 token limit)
- **No mode or `mode === "generate"`**: Full plan generation (32000 token limit)
- Both modes share `KEY_COACHING_PRINCIPLES` but use different system prompts

### Error Handling
Chat mode validates before returning:
1. Payload size check (MAX_INPUT_CHARS)
2. API key check (ANTHROPIC_API_KEY)
3. Truncation guard (stop_reason === "end_turn")
4. Response JSON parse
5. Text field presence check
6. Patch array structure validation (if patch present)

## Success Criteria Met

- [x] claude-coach Edge Function has mode="chat" branch alongside existing "generate" mode
- [x] buildHierarchicalPlanWindow exported from coachPayload.js returns 4+1+6 week window
- [x] buildCoachPayload accepts mode="chat" with activity and plan windows
- [x] CHAT_SYSTEM_PROMPT instructs Claude to return { text, patch, patchSummary } JSON
- [x] Edge Function validates patch array structure before returning
- [x] Unit tests pass for buildHierarchicalPlanWindow
- [x] Schema validation tests pass for chat response format
- [x] All changes committed atomically

## Files Created/Modified

| File | Type | Changes |
|------|------|---------|
| `supabase/functions/claude-coach/index.ts` | Modified | Added chat mode, CHAT_SYSTEM_PROMPT, helper functions |
| `src/lib/coachPayload.js` | Modified | Verified buildHierarchicalPlanWindow, extended for chat mode |
| `tests/unit/coachPayload.test.js` | Verified | All 16 tests passing |
| `tests/unit/claudeCoach.schema.test.js` | Verified | All 21 tests passing |

## Deviations from Plan

None — plan executed exactly as written. Task 1 was already implemented; Task 2 was completed and tested.

## Downstream Dependencies

This plan defines the data contract that both UI surfaces (CoachPage and CoachFAB) depend on:
- **CoachPage.jsx** will wire to claude-coach with `mode: "chat"`
- **CoachFAB.jsx** (new component in Phase 21 Plan 02) will use the same `buildCoachPayload` flow
- **ChangeCard.jsx** component will render patch arrays from `response.patch`
- **LongTermPlanPage.jsx** will invoke `hierarchicalPlan.applyPatch(patch)` when user accepts changes

## Next Steps

Plan 21-02 will implement the UI surfaces:
1. Refactor CoachPage to use claude-coach chat mode (remove gemini-coach)
2. Create ChangeCard component for patch review and acceptance
3. Create ChatPanel component (reusable by CoachPage and CoachFAB)
4. Add CoachFAB component to LongTermPlanPage with overlay chat panel

## Metrics

- **Duration:** 15 minutes
- **Tasks:** 2 (1 verified, 1 implemented)
- **Files modified:** 2 (1 core, 1 test)
- **Tests:** 37 passed
- **Commits:** 1

---

*Executed by: Claude Code*
*Timestamp: 2026-03-31T18:45:07Z*
