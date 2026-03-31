# Architecture Research

**Domain:** AI coaching backend + hierarchical plan data model (RunSmart v2.0)
**Researched:** 2026-03-29
**Confidence:** HIGH — based on direct code inspection of all affected files + Claude API official docs

---

## Standard Architecture

### System Overview

```
┌──────────────────────────────────────────────────────────────────────────┐
│                         React Frontend (Vite)                             │
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │                      AppDataContext                                  │  │
│  │  usePlans  useHierarchicalPlan  useWorkoutEntries  useCoachChat     │  │
│  └───────────────────────────┬─────────────────────────────────────────┘  │
│                              │                                             │
│  ┌────────────────┐  ┌──────────────────┐  ┌────────────────────────┐    │
│  │ WeeklyPlanPage │  │   CoachPage       │  │  LongTermPlanPage      │    │
│  │ (rebuilt)      │  │   (rebuilt)       │  │  (phase viewer)        │    │
│  └────────────────┘  └──────────────────┘  └────────────────────────┘    │
└──────────────────────────────┬───────────────────────────────────────────┘
                               │  Supabase JS client (RLS)
┌──────────────────────────────▼───────────────────────────────────────────┐
│                   Supabase Edge Functions (Deno)                          │
│                                                                           │
│  ┌──────────────────────┐   ┌──────────────────────────────────────────┐  │
│  │  claude-coach        │   │  strava-sync / strava-auth (existing)   │  │
│  │  (NEW — replaces     │   └──────────────────────────────────────────┘  │
│  │  gemini-coach)       │                                                 │
│  │                      │                                                 │
│  │  Modes:              │                                                 │
│  │  - generate_plan     │                                                 │
│  │  - coach_chat        │                                                 │
│  │  - plan_revision     │                                                 │
│  └──────────┬───────────┘                                                 │
│             │  fetch (REST)                                                │
└─────────────┼────────────────────────────────────────────────────────────┘
              │  x-api-key: ANTHROPIC_API_KEY (secret)
┌─────────────▼────────────────────────────────────────────────────────────┐
│              Anthropic Claude API  (api.anthropic.com/v1/messages)        │
│              Model: claude-sonnet-4-6  (plan gen)                         │
│              Model: claude-haiku-4-5   (chat, fast)                       │
└──────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────┐
│                     Supabase PostgreSQL                                   │
│                                                                           │
│  training_plans        ← metadata (goal, dates, athlete context)         │
│  hierarchical_plans    ← NEW: JSONB full plan document                   │
│  workout_entries       ← existing flat day-level rows (migration target) │
│  weekly_plan_day_states← existing protection flags                       │
│  coach_conversations   ← existing chat thread records                    │
│  coach_messages        ← existing per-message rows                       │
│  activities            ← Strava + manual (existing)                      │
│  ai_audit_logs         ← existing AI failure logging                     │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## Component Responsibilities

| Component | Responsibility | Status |
|-----------|---------------|--------|
| `claude-coach` Edge Function | All Claude API calls; builds system prompts from SKILL.md; returns plan JSON or chat text | NEW |
| `useHierarchicalPlan` hook | Load/save/patch hierarchical plan JSONB; derive weeks and days for UI | NEW |
| `useCoachChat` hook | Manage coach chat history; call `claude-coach` in `coach_chat` mode | NEW (splits from `useCoachConversations`) |
| `WeeklyPlanPage` | Phase bar + multi-week grid + workout cards; driven by `useHierarchicalPlan` | REWRITE |
| `LongTermPlanPage` | Phase timeline viewer; reads phase metadata from `hierarchical_plans` | MODIFY |
| `coachPayload.js` | Build context payload sent to Edge Function; extend for hierarchical model | MODIFY |
| `AppDataContext` | Compose new hooks; remove `useCoachPhilosophy` (philosophy moves to SKILL.md files) | MODIFY |
| `gemini-coach` Edge Function | Deprecated; retire after claude-coach verified in production | RETIRE |

---

## Recommended Project Structure

```
src/
├── hooks/
│   ├── useHierarchicalPlan.js   # NEW — JSONB plan load/patch/derive
│   ├── useCoachChat.js          # NEW — chat thread + claude-coach calls
│   ├── usePlans.js              # UNCHANGED
│   ├── useWorkoutEntries.js     # UNCHANGED (flat entries still used)
│   └── useTrainingBlocks.js     # UNCHANGED (parallel read during migration)
├── lib/
│   ├── coachPayload.js          # MODIFY — add hierarchical plan context
│   └── planUtils.js             # NEW — derive flat workout list from JSONB plan
├── pages/
│   ├── WeeklyPlanPage.jsx       # REWRITE — phase bar + grid + modal
│   ├── LongTermPlanPage.jsx     # MODIFY — read phase list from hierarchical plan
│   └── CoachPage.jsx            # MODIFY — use useCoachChat instead of gemini calls
└── components/ui/
    ├── WorkoutCard.jsx           # NEW — zone badge + complete toggle + drag handle
    ├── PhaseBar.jsx              # NEW — phase ribbon across top of plan view
    └── WeekSummaryCol.jsx        # NEW — hours/km summary column per week row

supabase/
├── functions/
│   ├── claude-coach/
│   │   ├── index.ts             # NEW — main Edge Function handler
│   │   ├── skill.ts             # NEW — SKILL.md coaching methodology as TS constants
│   │   ├── prompts.ts           # NEW — all system/user prompt builders per mode
│   │   └── config.toml          # NEW
│   └── gemini-coach/            # EXISTING — keep until cutover confirmed
└── migrations/
    └── 20260329_hierarchical_plans.sql  # NEW
```

---

## Architectural Patterns

### Pattern 1: Single-Column JSONB Plan Document

**What:** Store the full hierarchical plan (`meta` + `athlete` + `zones` + `phases[]` + `weeks[]`) as a single JSONB column in a new `hierarchical_plans` table, linked to `training_plans.id`. The JSON schema matches exactly what Claude returns and what `krs-smve-plan.json` demonstrates.

**When to use:** When the data is naturally a document, AI generates it in one shot, and UI needs to read it whole or by slice. This plan is ~60-200 KB (9 weeks × 7 days). Well within PostgreSQL TOAST range with minimal query patterns.

**Why JSONB over normalized tables for this plan model:**
- Plan is always read whole or by week slice — not aggregated across plans
- AI generates the full plan in one call; inserting 63 normalized rows per call is error-prone
- Drag-and-drop and completion updates modify a single workout in the JSON tree; JSONB `jsonb_set()` handles this efficiently
- The schema will evolve (new workout fields, HR data, etc.) — JSONB avoids migration overhead
- Query patterns: load plan by `plan_id` (indexed), patch a workout by path, read one week by `weekNumber`

**Trade-off:** Updates to a single workout rewrite the whole JSONB value (TOAST overhead). At 60-200 KB this is acceptable. If the plan grows beyond ~500 KB, extract `weeks[]` into a separate `plan_weeks` JSONB table (one row per week).

**Schema:**

```sql
CREATE TABLE hierarchical_plans (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id     UUID REFERENCES training_plans(id) ON DELETE CASCADE NOT NULL,
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  version     INTEGER NOT NULL DEFAULT 1,
  plan_data   JSONB NOT NULL,       -- full plan document (meta+phases+weeks+days)
  generated_by TEXT NOT NULL DEFAULT 'claude-sonnet-4-6',
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT  hierarchical_plans_plan_id_unique UNIQUE (plan_id)
);

ALTER TABLE hierarchical_plans ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_hierarchical_plans_plan_id ON hierarchical_plans (plan_id);
CREATE INDEX idx_hierarchical_plans_user_id ON hierarchical_plans (user_id);
```

**RLS:** Same pattern as `training_plans` — select/insert/update/delete own rows only.

### Pattern 2: Claude Edge Function — Mode-Dispatched Handler

**What:** One Edge Function (`claude-coach`) handles all Claude API call modes via a `mode` field in the request body. Modes: `generate_plan`, `coach_chat`, `plan_revision`. Each mode has its own system prompt builder and response parser.

**Why one function over multiple:** The Gemini function already established this pattern with `PLAN_SYSTEM_INSTRUCTION`, `FOLLOWUP_SYSTEM_INSTRUCTION`, etc. One deployment, one ANTHROPIC_API_KEY secret, one CORS config.

**Structure:**

```typescript
// supabase/functions/claude-coach/index.ts

const handler = async (req: Request) => {
  const body = await req.json();
  const { mode, ...payload } = body;

  // Auth: validate JWT, extract userId
  const userId = await validateSupabaseJwt(req);

  switch (mode) {
    case "generate_plan":
      return handleGeneratePlan(payload, userId);   // → full plan JSON
    case "coach_chat":
      return handleCoachChat(payload, userId);       // → text response + optional plan_patch
    case "plan_revision":
      return handlePlanRevision(payload, userId);    // → updated plan JSON
    default:
      return new Response(JSON.stringify({ error: "Unknown mode" }), { status: 400 });
  }
};
```

**Claude API call pattern (Deno — no npm SDK required):**

```typescript
const response = await fetch("https://api.anthropic.com/v1/messages", {
  method: "POST",
  headers: {
    "x-api-key": Deno.env.get("ANTHROPIC_API_KEY")!,
    "anthropic-version": "2023-06-01",
    "content-type": "application/json",
  },
  body: JSON.stringify({
    model: "claude-sonnet-4-6",
    max_tokens: 8192,        // plan generation needs headroom
    system: buildSystemPrompt(mode),
    messages: buildMessages(payload),
  }),
});
const data = await response.json();
const text = data.content[0].text;
```

**No streaming for plan generation.** Plan generation is a single atomic response (user clicks "Generate Plan", waits). Streaming adds complexity with no user benefit for a background generation. For `coach_chat`, streaming is desirable (chat feel) but can be added in a later phase — start with non-streaming.

### Pattern 3: SKILL.md Embedded in Edge Function (not DB)

**What:** The coaching methodology (currently `docs/running_coach/SKILL.md` + reference files) is embedded directly in the Edge Function as TypeScript string constants in `skill.ts`. Philosophy no longer lives in `coach_philosophy_documents` DB table.

**Why:** This was the stated goal in PROJECT.md — "coaching context lives in SKILL.md reference files." Embedding in the Edge Function means: no DB read on every request, no admin editor UI to maintain, the methodology is version-controlled alongside the code. The `coach_admins`, `coach_philosophy_documents`, `coach_philosophy_versions`, and `coach_playbook_entries` tables become unused.

**Implementation:**

```typescript
// supabase/functions/claude-coach/skill.ts
export const COACH_IDENTITY = `You are an expert endurance coach...`;
export const PERIODIZATION_PRINCIPLES = `... (from periodization.md) ...`;
export const ZONE_DEFINITIONS = `... (from zones.md) ...`;
export const WORKOUT_TAXONOMY = `... (from workouts.md) ...`;
export const LOAD_MANAGEMENT = `... (from load-management.md) ...`;

export function buildPlanGenerationSystemPrompt(): string {
  return [COACH_IDENTITY, PERIODIZATION_PRINCIPLES, ZONE_DEFINITIONS,
          WORKOUT_TAXONOMY, LOAD_MANAGEMENT].join("\n\n---\n\n");
}
```

### Pattern 4: Plan-Aware Coach Chat

**What:** When the coach sends a message in `coach_chat` mode, the current plan JSON is included in the context payload. If the assistant's response implies a change (e.g., "Move Wednesday's tempo to Thursday"), the response includes a structured `plan_patch` alongside the prose text.

**Why:** This is the "chat suggests changes → applies to plan" requirement. The patch format avoids full plan regeneration for small edits.

**Patch format (returned by Claude in coach_chat mode when changes apply):**

```json
{
  "chat_response": "I've moved the tempo session to Thursday to give you more recovery after Tuesday's long run.",
  "plan_patch": {
    "type": "move_workout",
    "from_date": "2026-04-01",
    "to_date": "2026-04-03",
    "workout_id": "w1-wed-tempo"
  }
}
```

The frontend applies the patch to the local JSONB plan state and persists via `useHierarchicalPlan.applyPatch()`. If no patch is needed (information-only response), `plan_patch` is `null`.

The system prompt for `coach_chat` mode instructs Claude: "If the athlete's message implies a change to the plan, include a `plan_patch` JSON object in your response. Otherwise set `plan_patch` to null. Always respond in the format `{ chat_response, plan_patch }`."

---

## Data Flow

### Flow 1: Full Plan Generation

```
User clicks "Generate Plan" on LongTermPlanPage
    ↓
Page calls useHierarchicalPlan.generatePlan(planId, athleteContext)
    ↓
coachPayload.buildGeneratePlanPayload() assembles:
  - training_plans row (goal race, dates, current mileage)
  - activities (recent Strava data)
  - daily_logs (recent wellness)
  - athlete profile (LTHR, constraints, commute days)
    ↓
Supabase Edge Function invoke: claude-coach, mode=generate_plan
    ↓
Edge Function calls Claude API (claude-sonnet-4-6, max_tokens=8192)
    ↓
Edge Function validates JSON response matches hierarchical plan schema
    ↓
Edge Function upserts result into hierarchical_plans.plan_data (JSONB)
    ↓
Front end receives { plan_id, plan_data } → stores in useHierarchicalPlan state
    ↓
WeeklyPlanPage re-renders with new plan
```

### Flow 2: Coach Chat (No Plan Change)

```
User types message in CoachPage chat input
    ↓
useCoachChat.sendMessage(message, conversationId)
    ↓
Optimistically adds user message to messages state
    ↓
coachPayload.buildChatPayload() includes:
  - full plan_data JSONB (from useHierarchicalPlan)
  - recent activities, daily logs, athlete profile
  - conversation history (last N messages)
    ↓
Supabase Edge Function invoke: claude-coach, mode=coach_chat
    ↓
Claude responds with { chat_response, plan_patch: null }
    ↓
useCoachChat persists assistant message to coach_messages
    ↓
CoachPage renders assistant response in chat thread
```

### Flow 3: Coach Chat (With Plan Patch)

```
[Same as Flow 2 up to Edge Function response]
    ↓
Claude responds with { chat_response, plan_patch: { type, from_date, to_date, workout_id } }
    ↓
CoachPage renders assistant message + "Apply change?" confirmation card
    ↓
User confirms → useHierarchicalPlan.applyPatch(planId, plan_patch)
    ↓
Frontend derives updated plan_data, upserts to hierarchical_plans
    ↓
WeeklyPlanPage re-renders with updated plan
```

### Flow 4: Workout Completion Toggle

```
User clicks checkmark on WorkoutCard in WeeklyPlanPage
    ↓
useHierarchicalPlan.toggleWorkoutCompleted(planId, workoutId, date)
    ↓
Derives updated plan_data with workout.completed toggled
    ↓
Upserts hierarchical_plans via supabase.from("hierarchical_plans")
  .update({ plan_data: updatedPlan })
  .eq("plan_id", planId)
    ↓
Local state updated → card re-renders with completed style
```

### Flow 5: Drag-and-Drop Workout Reorder

```
User drags WorkoutCard from one DayCell to another
    ↓
useHierarchicalPlan.moveWorkout(planId, workoutId, fromDate, toDate)
    ↓
Derives updated plan_data: removes workout from fromDate.workouts[],
  appends to toDate.workouts[]
    ↓
Upserts hierarchical_plans (optimistic update pattern)
    ↓
WeeklyPlanPage re-renders
```

---

## Migration Path: Flat Model → Hierarchical Model

The existing `workout_entries` table (flat rows per day) and `training_blocks` table (phase-level rows) are NOT deleted. Migration is additive and parallel.

### Phase A: Introduce hierarchical_plans table (new migration)

Add `hierarchical_plans` table. No data migration. `workout_entries` continues to be the source of truth for the existing WeeklyPlanPage until the new page is built.

### Phase B: Build new UI driven by hierarchical_plans

New WeeklyPlanPage reads from `useHierarchicalPlan`. When the athlete generates a plan via Claude, it populates `hierarchical_plans`. The old UI path (AI-generated weekly plan → `workout_entries`) is left intact but no longer the primary flow.

### Phase C: Sync hierarchical workouts to workout_entries (optional bridge)

If existing features (protected days, `weekly_plan_day_states`, Strava comparison) still depend on `workout_entries`, a sync utility can derive flat `workout_entries` rows from `hierarchical_plans.plan_data` when a plan is generated or patched. This is optional — evaluate whether these dependencies still apply after the UI rewrite.

### Phase D: Deprecate old tables (future, out of scope for v2.0)

`training_blocks`, `weekly_plan_day_states`, and `workout_entries` can be retired once all plan-driven features read from `hierarchical_plans`. Not a v2.0 concern.

**Key principle:** Never run a destructive DB migration during the feature build. Old tables survive in parallel until the new path is proven.

---

## Hook Refactoring Strategy

### useHierarchicalPlan (NEW)

Owns the new plan document lifecycle.

```javascript
// src/hooks/useHierarchicalPlan.js
export function useHierarchicalPlan(userId) {
  // state: { plan: null, loading, error }

  // loadPlan(planId) → reads hierarchical_plans by plan_id
  // generatePlan(planId, context) → calls claude-coach Edge Function, upserts result
  // applyPatch(planId, patch) → derives updated plan_data, upserts
  // toggleWorkoutCompleted(planId, workoutId, date) → jsonb patch, upserts
  // moveWorkout(planId, workoutId, fromDate, toDate) → jsonb patch, upserts
  // getWeek(weekNumber) → derives week object from plan.weeks[]
  // getPhases() → returns plan.phases[]
}
```

### useCoachChat (NEW — replaces useCoachConversations for chat UI)

```javascript
// src/hooks/useCoachChat.js
export function useCoachChat(userId) {
  // state: { conversations, activeConversationId, messages, loading, pending }

  // loadConversations() → reads coach_conversations
  // selectConversation(id) → loads coach_messages for conversation
  // sendMessage(text, planId) → builds payload, calls claude-coach, persists messages
  // createConversation(title) → new coach_conversations row
}
```

`useCoachConversations` and `useCoachPhilosophy` remain in the codebase but are no longer wired into `AppDataContext` once `useCoachChat` is confirmed working. They can be removed in a cleanup phase.

### AppDataContext changes

```javascript
// Remove: coachPhilosophy (no longer needed — philosophy in SKILL.md)
// Add: hierarchicalPlan (useHierarchicalPlan)
// Add: coachChat (useCoachChat)
// Keep: coachConversations (until useCoachChat is confirmed)
// Keep: all existing hooks unchanged
```

---

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Anthropic Claude API | REST POST from Deno Edge Function, x-api-key header | `ANTHROPIC_API_KEY` stored in Supabase secrets, never in frontend. Model `claude-sonnet-4-6` for plan gen (needs headroom), `claude-haiku-4-5` for chat (fast/cheap). |
| Strava API | Existing strava-sync Edge Function, unchanged | Activities still feed coach context payload |
| Supabase JS client | Direct from React hooks via RLS | `hierarchical_plans` needs same RLS pattern as `training_plans` |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| WeeklyPlanPage ↔ useHierarchicalPlan | Hook subscription via `useAppData()` | Page never reads `hierarchical_plans` directly |
| CoachPage ↔ useCoachChat | Hook subscription via `useAppData()` | Chat message persistence stays in `coach_messages` table |
| claude-coach ↔ SKILL.md | Compiled TS constants in `skill.ts` | Methodology is not a DB dependency — version-controlled |
| claude-coach ↔ hierarchical_plans | Edge Function writes plan after generation; frontend reads | Frontend upserts patches (not full plan rewrites on each chat message) |
| useHierarchicalPlan ↔ useWorkoutEntries | No direct coupling | Sync bridge (Phase C) is explicit function call, not implicit hook coupling |

---

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| Single user (current) | JSONB plan per user, no sharding needed. Claude API rate limits are generous for single-user workloads. |
| 100 users | JSONB plan per user still fine. Monitor ANTHROPIC_API_KEY spend. Add per-user rate limiting in Edge Function. |
| 10K users | Evaluate normalized `plan_weeks` table if plans grow beyond 500 KB. Add Edge Function queue for plan generation (avoid timeout on parallel requests). |

### Scaling Priorities

1. **First bottleneck:** Claude API latency on plan generation (~10-30 seconds for a 9-week plan). Mitigation: show progress UI, use Supabase background job pattern if Deno timeout is hit.
2. **Second bottleneck:** JSONB update amplification (full rewrite per workout toggle). Mitigation: batch multiple UI interactions before flushing, or extract `weeks[]` to separate rows.

---

## Anti-Patterns

### Anti-Pattern 1: Calling Claude API Directly from Frontend

**What people do:** Call `api.anthropic.com` from React with API key in browser env var.
**Why it's wrong:** Exposes ANTHROPIC_API_KEY in the bundle. Violates the existing security constraint that "all AI API calls go through Edge Functions."
**Do this instead:** All Claude calls go through `supabase/functions/claude-coach/`. Frontend calls `supabase.functions.invoke("claude-coach", { body: payload })`.

### Anti-Pattern 2: Storing Full Plan in workout_entries (Normalizing the Hierarchy)

**What people do:** Break the hierarchical plan into individual `workout_entries` rows at generation time, then try to reconstruct phase/week structure from flat rows.
**Why it's wrong:** Phase metadata (focus text, physiological goals, weekly hours range), zone definitions, athlete assessment, and `humanReadable` workout instructions are lost in the flat model. The UI (phase bar, week summary, zone badges) cannot be driven from flat rows without a fragile reverse-engineering step.
**Do this instead:** Store the full plan as JSONB in `hierarchical_plans`. Derive flat entries only if legacy features need them (via explicit sync bridge in Phase C).

### Anti-Pattern 3: One Edge Function Per AI Mode

**What people do:** Create `claude-plan-gen`, `claude-chat`, `claude-revision` as separate functions.
**Why it's wrong:** Three cold-start penalties, three deployment units, three CORS configs, three places to maintain the `ANTHROPIC_API_KEY` secret reference. The existing gemini-coach already demonstrates that a single function can dispatch on `mode`.
**Do this instead:** One `claude-coach` function with a `mode` dispatch switch.

### Anti-Pattern 4: Streaming Before the Basics Work

**What people do:** Implement SSE streaming for plan generation on the first pass.
**Why it's wrong:** Streaming plan JSON is complex to implement correctly (partial JSON is not valid JSON). For plan generation, the user just needs a loading state and a result. Streaming adds implementation risk to a foundational phase.
**Do this instead:** Non-streaming for plan generation. Non-streaming for the first chat implementation. Add streaming to chat in a later phase once the core flow is verified.

### Anti-Pattern 5: Destroying workout_entries During Migration

**What people do:** Run a migration that drops `workout_entries` when `hierarchical_plans` is introduced.
**Why it's wrong:** Protected days, Strava comparison, and existing coaching payload builder all read `workout_entries`. Dropping it during a feature build breaks working features.
**Do this instead:** Parallel model during v2.0. Flat entries are preserved. The new plan UI reads hierarchical_plans; existing features still read workout_entries. Deprecate in v2.1 after audit.

---

## Build Order Recommendation

Based on dependencies, the phases should build in this order:

1. **DB migration + Edge Function skeleton** — `hierarchical_plans` table + `claude-coach` stub that returns mock plan JSON. No Claude API yet. Proves the plumbing works.

2. **useHierarchicalPlan hook** — Load, generate (calling the stub), patch, toggle. Tests against mock data.

3. **Claude Edge Function — generate_plan mode** — Wire actual Claude API call with SKILL.md system prompt. Validate JSON schema of response. Persist to `hierarchical_plans`. This is the highest-risk step (prompt engineering + JSON reliability).

4. **WeeklyPlanPage rebuild** — Phase bar, week rows, day cells, workout cards, week summary column. All driven by `useHierarchicalPlan`. Drag-and-drop last.

5. **useCoachChat + CoachPage rebuild** — Chat UI using existing `coach_conversations`/`coach_messages` tables. Wire `claude-coach` in `coach_chat` mode.

6. **Plan patch via chat** — Add `plan_patch` response format to `coach_chat` mode. Frontend applies patches through `useHierarchicalPlan.applyPatch()`.

7. **Cleanup** — Retire `gemini-coach`. Remove `useCoachPhilosophy` from `AppDataContext`. Remove admin philosophy editor page.

---

## Sources

- Direct code inspection: `supabase/functions/gemini-coach/index.ts`, `src/hooks/useWorkoutEntries.js`, `src/hooks/usePlans.js`, `src/hooks/useTrainingBlocks.js`, `src/context/AppDataContext.jsx`, `src/lib/coachPayload.js`
- Direct inspection: `docs/running_coach/output/krs-smve-plan.json` (authoritative hierarchical plan schema)
- Direct inspection: `docs/running_coach/SKILL.md` + `reference/` files (coaching methodology to embed)
- Anthropic Claude API official docs: [Messages API](https://platform.claude.com/docs/en/api/messages) — HIGH confidence
- Supabase JSONB guidance: [Managing JSON](https://supabase.com/docs/guides/database/json) — HIGH confidence
- PostgreSQL JSONB TOAST behavior: [architecture-weekly.com](https://www.architecture-weekly.com/p/postgresql-jsonb-powerful-storage) — MEDIUM confidence

---

*Architecture research for: RunSmart v2.0 Claude AI coaching + hierarchical plan model*
*Researched: 2026-03-29*
