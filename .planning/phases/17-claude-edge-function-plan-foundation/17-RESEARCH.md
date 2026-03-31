# Phase 17: Claude Edge Function + Plan Foundation - Research

**Researched:** 2026-03-30
**Domain:** Anthropic API (raw fetch), Supabase Edge Functions (Deno), PostgreSQL/JSONB schema, React cleanup
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **Plan JSON schema**: Running-only. Keep: `meta`, `assessment`, `zones.run` (hr + pace zones), `phases`, `weeks` (with `days` and `workouts`), `raceStrategy` (pacing.run, taper, nutrition). Drop: `zones.bike`, `zones.swim`, `preferences.swim`, `preferences.bike`, multi-sport `assessment.currentForm.weeklyVolume` fields.
- **Athlete context payload**: 4 field groups (race goal + date, fitness baseline, weekly constraints, background + goals). Phase 17 uses a minimal test trigger only — no intake UI.
- **Philosophy removal scope (CLEAN-02)**: Full atomic removal in Phase 17: `AdminPhilosophyPage.jsx`, `useCoachPhilosophy.js`, `coachPhilosophy` slice in AppDataContext, AdminPhilosophyPage import and route in App.jsx, `coach-philosophy-admin/` Edge Function, migration to drop `coach_philosophy_documents` table.
- **SKILL.md embedding strategy**: Extract coaching methodology sections only (not CLI/bash/Strava OAuth sections). Embed all 6 reference files (assessment, load-management, periodization, race-day, workouts, zones). Exclude queries.md. Compose as one system prompt string at Edge Function startup. Include condensed few-shot output example from krs-smve-plan.json.
- **Claude API call**: Raw fetch to Anthropic REST API (not SDK). Auth boundary: unauthenticated POST returns 401. Token limit protection: return 4xx if payload would exceed limits.
- **Keep gemini-coach** Edge Function until Phase 22.

### Claude's Discretion
- Exact section boundaries for extracting relevant SKILL.md sections
- Whether to concatenate coaching context as one system prompt string or use the messages array `system` field
- Exact Supabase JWT verification approach (`supabase.auth.getUser` vs `supabase.auth.getClaims`)
- `hierarchical_plans` table column design beyond core (user_id, plan_id, plan_data JSONB, created_at, updated_at) — any additional metadata columns

### Deferred Ideas (OUT OF SCOPE)
- Intake UI (form for race goal, fitness baseline, constraints, background) — Phase 18 or 19
- Streaming plan generation — explicitly out of scope
- Multi-turn athlete assessment workflow (SKILL.md intake flow) — v2.1 COACH-05
- Day/date-range partial plan generation — v2.1 COACH-04
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| COACH-01 | User can generate a full training plan (all phases, weeks, and daily workouts) via Claude API in a single request using SKILL.md coaching methodology | Anthropic Messages API raw fetch pattern + system prompt construction from reference files |
| DATA-01 | Training plan is stored as a hierarchical JSONB document (plan → phases → weeks → days → workouts) in Supabase | Supabase migration pattern for JSONB table + RLS policies using auth.uid() |
| CLEAN-02 | Admin philosophy editor, coach_philosophy_documents table, and playbook system are removed — coaching context lives in SKILL.md reference files | All files to remove identified; migration drop pattern established |
</phase_requirements>

---

## Summary

Phase 17 creates the `claude-coach` Supabase Edge Function using Deno and raw `fetch()` to call the Anthropic REST API directly. The function receives a structured athlete payload, constructs a full system prompt from embedded SKILL.md coaching methodology, and returns a hierarchical plan JSON. The plan is saved to a new `hierarchical_plans` PostgreSQL table using JSONB storage with per-user RLS.

The critical risk flagged in STATE.md is now better understood: the Anthropic structured outputs feature (constrained decoding via JSON schema) has known limits — large schemas trigger "Schema is too complex for compilation" (400 error). For a 20-week plan with nested phases/weeks/days/workouts the schema would be too complex. The mitigation is to use the standard Messages API with a well-engineered system prompt that includes a concrete JSON example, and accept that JSON parsing is done on the output text (not via constrained decoding). Stop-reason checking (`stop_reason === "end_turn"`) is the truncation guard rather than schema enforcement.

The CLEAN-02 removal is mechanical: 5 files to delete, 2 imports to remove from App.jsx, and one Supabase migration to drop the `coach_philosophy_documents` table cluster.

**Primary recommendation:** Build claude-coach as a raw-fetch Deno function using the `claude-sonnet-4-6` model, embed coaching context at startup as a single `system` string, parse JSON from the text response with stop_reason validation as the truncation guard.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Deno Edge Function | Supabase runtime | Serverless execution | All existing Edge Functions use Deno |
| `@supabase/supabase-js` | `2` (via `esm.sh/@supabase/supabase-js@2`) | DB writes + JWT auth verification | Established pattern across all 4 existing functions |
| Anthropic REST API | `v1/messages` | Claude inference | Raw fetch — avoids Deno lock file v5 incompatibility with SDK |
| PostgreSQL + JSONB | Supabase managed | Plan storage | JSONB native to Supabase; enables partial-path updates in Phase 18 |

### Anthropic API Specifics

| Property | Value | Source |
|----------|-------|--------|
| Endpoint | `https://api.anthropic.com/v1/messages` | Official docs (HIGH) |
| Required headers | `x-api-key`, `anthropic-version: 2023-06-01`, `content-type: application/json` | Official docs (HIGH) |
| Recommended model | `claude-sonnet-4-6` | Models overview page (HIGH) |
| Max output tokens (Sonnet 4.6) | 64,000 | Models overview page (HIGH) |
| Context window | 1M tokens | Models overview page (HIGH) |
| `stop_reason` values | `"end_turn"` (complete), `"max_tokens"` (truncated) | Messages API docs (HIGH) |
| Response content path | `response.content[0].text` | Messages API docs (HIGH) |

### Model Selection Rationale

`claude-sonnet-4-6` is recommended over `claude-opus-4-6` for this phase because:
- Full training plans are well-structured generation tasks — they do not require Opus-level reasoning
- Sonnet 4.6 is significantly cheaper ($3/$15 per MTok vs $5/$25) and faster
- 64k output tokens is more than sufficient for a 20-week plan
- Can be upgraded to Opus if output quality proves insufficient

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Native Deno `fetch()` | built-in | HTTP calls to Anthropic API | Always — this IS the approach |
| `Deno.env.get()` | built-in | Secret access | Reading `ANTHROPIC_API_KEY` |

### Installation

No npm installs. Edge Function dependencies are imported via URL at the top of the Deno file:

```typescript
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
// No Anthropic SDK import — raw fetch only
```

Supabase Edge Function secrets to add in dashboard: `ANTHROPIC_API_KEY`.

---

## Architecture Patterns

### Recommended Project Structure

```
supabase/
├── functions/
│   └── claude-coach/
│       └── index.ts          # New Edge Function
├── migrations/
│   └── YYYYMMDD_hierarchical_plans.sql     # New table
│   └── YYYYMMDD_drop_philosophy_tables.sql # CLEAN-02 table removal
src/
├── pages/
│   └── AdminPhilosophyPage.jsx  # DELETE
├── hooks/
│   └── useCoachPhilosophy.js    # DELETE
├── context/
│   └── AppDataContext.jsx       # Remove coachPhilosophy slice
├── App.jsx                      # Remove import + route + coachPhilosophy destructure
```

### Pattern 1: Deno Edge Function with JWT Auth

The established pattern across all existing functions (strava-sync, gemini-coach):

```typescript
// Source: supabase/functions/strava-sync/index.ts (existing codebase pattern)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function getBearerToken(req: Request): string | null {
  const authHeader = req.headers.get("Authorization") || req.headers.get("authorization") || "";
  const [scheme, token] = authHeader.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) return null;
  return token;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  const accessToken = getBearerToken(req);
  if (!accessToken) {
    return new Response(JSON.stringify({ error: "Missing bearer token" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const { data: userData, error: userErr } = await supabase.auth.getUser(accessToken);
  if (userErr || !userData?.user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
  // ... proceed with user.id available
});
```

### Pattern 2: Raw Fetch to Anthropic API

```typescript
// Source: Anthropic official docs (Messages API) — HIGH confidence
const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";

const response = await fetch(ANTHROPIC_URL, {
  method: "POST",
  headers: {
    "x-api-key": Deno.env.get("ANTHROPIC_API_KEY")!,
    "anthropic-version": "2023-06-01",
    "content-type": "application/json",
  },
  body: JSON.stringify({
    model: "claude-sonnet-4-6",
    max_tokens: 32000,           // sufficient for a 16-20 week plan
    system: SYSTEM_PROMPT,       // full coaching context embedded here
    messages: [
      { role: "user", content: userPrompt }
    ],
  }),
});

const aiResult = await response.json();

// Truncation guard: stop_reason check
if (aiResult.stop_reason !== "end_turn") {
  return new Response(
    JSON.stringify({ error: "Plan generation was truncated. Reduce plan length or request shorter plan." }),
    { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

const rawText = aiResult.content?.[0]?.text;
```

### Pattern 3: Token Limit Pre-check (4xx on overflow)

The success criteria requires a 4xx return if the payload would exceed token limits. Because this is a raw-fetch approach (no SDK), the strategy is:

1. Estimate payload size before calling Claude: rough token count of system prompt + user payload (1 token ≈ 4 chars)
2. If estimated input tokens > 100,000 (conservative limit well under the 1M context window), return 413
3. After generation, check `stop_reason !== "end_turn"` — if truncated, return 422

This is a defensive guard, not a guarantee. The system prompt is fixed size (embedded at startup), so the main variable is the user payload. The pre-check should count the athlete context JSON size.

### Pattern 4: JSONB Table with RLS

```sql
-- Source: Supabase RLS docs (HIGH confidence) + established migration patterns in codebase
create table if not exists hierarchical_plans (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  plan_data   jsonb not null,
  event_name  text,
  event_date  date,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists hierarchical_plans_user_id_idx on hierarchical_plans(user_id);

alter table hierarchical_plans enable row level security;

create policy "users_own_plans_select"
  on hierarchical_plans for select
  using (auth.uid() = user_id);

create policy "users_own_plans_insert"
  on hierarchical_plans for insert
  with check (auth.uid() = user_id);

create policy "users_own_plans_update"
  on hierarchical_plans for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "users_own_plans_delete"
  on hierarchical_plans for delete
  using (auth.uid() = user_id);
```

The index on `user_id` is required — RLS policy on this column without an index causes sequential scans on every authenticated request.

### Pattern 5: CLEAN-02 — App.jsx Removal Points

Three specific removals in `src/App.jsx`:

1. **Line 14**: `import AdminPhilosophyPage from "./pages/AdminPhilosophyPage";` — delete
2. **Line 58**: `const { auth, plans, activities, checkins, coachPhilosophy } = useAppData();` — remove `coachPhilosophy` from destructure
3. **Lines 64-75**: The `useMemo` that reads `coachPhilosophy.isAdmin` and conditionally pushes the admin nav item — delete entire block

In `src/context/AppDataContext.jsx`:

1. Remove `import { useCoachPhilosophy } from "../hooks/useCoachPhilosophy";`
2. Remove `const coachPhilosophy = useCoachPhilosophy(userId);`
3. Remove `coachPhilosophy` from the `value` object in `useMemo`
4. Remove `coachPhilosophy` from the `useMemo` dependency array

### Pattern 6: System Prompt Construction

The system prompt for claude-coach is a single TypeScript string constant assembled at module load time. This avoids runtime file reads in Deno Edge Functions (no filesystem access in Supabase Edge Functions):

```typescript
// Embed coaching methodology as top-level module constants
// Each reference file content is a string literal in the .ts file
const ASSESSMENT_CONTEXT = `[content of docs/running_coach/reference/assessment.md]`;
const LOAD_MANAGEMENT_CONTEXT = `[content of docs/running_coach/reference/load-management.md]`;
const PERIODIZATION_CONTEXT = `[content of docs/running_coach/reference/periodization.md]`;
const RACE_DAY_CONTEXT = `[content of docs/running_coach/reference/race-day.md]`;
const WORKOUTS_CONTEXT = `[content of docs/running_coach/reference/workouts.md]`;
const ZONES_CONTEXT = `[content of docs/running_coach/reference/zones.md]`;
const FEW_SHOT_EXAMPLE = `[condensed 1-2 weeks from krs-smve-plan.json, swim/bike stripped]`;

const SYSTEM_PROMPT = `
You are an expert endurance running coach specializing in marathon and ultramarathon events.
[Key Coaching Principles from SKILL.md...]

## Assessment Methodology
${ASSESSMENT_CONTEXT}

## Zone Definitions
${ZONES_CONTEXT}

## Load Management
${LOAD_MANAGEMENT_CONTEXT}

## Periodization
${PERIODIZATION_CONTEXT}

## Workout Library
${WORKOUTS_CONTEXT}

## Race Strategy
${RACE_DAY_CONTEXT}

## Output Format
You MUST respond with a single valid JSON object and nothing else. No markdown fences, no explanation.
The plan must follow this exact schema:

\`\`\`
${FEW_SHOT_EXAMPLE}
\`\`\`
`;
```

### SKILL.md Section Extraction Boundaries

Include from SKILL.md:
- "Key Coaching Principles" section (11 principles)
- "Critical Reminders" section

Exclude from SKILL.md:
- "Initial Setup (First-Time Users)" — CLI commands, Strava OAuth, bash commands
- "Option A: Strava Integration" — CLI-only context
- "Option B: Manual Data Entry" — conversation format, not relevant
- "Database Access" — SQLite CLI, not applicable
- "Reference Files" table — the files are already embedded
- "Workflow Overview" — multi-turn flow, not applicable
- "Plan Output Format" — Step 2 (render to HTML) and Step 3 — not applicable; Step 1 JSON schema IS relevant

Include from SKILL.md "Plan Output Format": Step 1 JSON schema structure (the schema itself, minus swim/bike fields).

### Anti-Patterns to Avoid

- **Using Anthropic SDK via npm**: Causes Deno lock file v5 incompatibility in Supabase. Use raw `fetch()` only.
- **Fetching reference files at request time**: Supabase Edge Functions have no filesystem. All content must be embedded as string constants in the `.ts` file.
- **Using structured outputs (constrained decoding)**: Complex hierarchical schemas (plan with 20 weeks × 7 days × multiple workouts) will trigger "Schema is too complex for compilation" (400 error). Use system prompt engineering + JSON.parse on text output instead.
- **Trusting output without stop_reason check**: A `stop_reason: "max_tokens"` response means the plan was cut off mid-generation. This must return a 422, not a partial plan.
- **Missing the CORS OPTIONS handler**: All Edge Functions must handle `req.method === "OPTIONS"` before auth checks. Returning early with corsHeaders is the established pattern.
- **Using `supabase.auth.getSession()` instead of `supabase.auth.getUser()`**: `getSession()` does not verify the JWT against the server — it just decodes it. `getUser()` makes a server round-trip and validates the token properly.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| JWT validation | Custom JWT decode/verify | `supabase.auth.getUser(token)` | Server-validates token; handles expiry, signature, and user lookup in one call |
| CORS headers | Custom middleware | Copy established `corsHeaders` object from existing functions | Already battle-tested across 4 functions |
| Token estimation | Precise tokenizer | Rough character-count heuristic (1 token ≈ 4 chars) + generous buffer | Precise counting requires API call; heuristic is sufficient for a guard |
| JSON schema validation of output | Zod/ajv in Deno | Trust the model with good few-shot + validate top-level structure only | Full schema validation of 20-week plan JSON is complex; minimal check suffices |

**Key insight:** The entire auth and DB infrastructure is already in place — this phase is about assembling known patterns in the right order, not building new primitives.

---

## Common Pitfalls

### Pitfall 1: Truncated Plan with No Guard

**What goes wrong:** Claude generates a 20-week plan but hits `max_tokens` mid-JSON. The response is valid JSON up to a point, then truncated. If the Edge Function returns this, Phase 18 receives malformed data that breaks all downstream display.

**Why it happens:** 20 weeks × 7 days × ~3 workouts each is a large JSON document. At typical verbosity, this is 15,000-25,000 output tokens. Setting `max_tokens: 32000` is safe for a 20-week plan, but shorter plans generating more verbose descriptions could approach limits.

**How to avoid:** Always check `aiResult.stop_reason !== "end_turn"` before parsing. Return 422 immediately if truncated. Log the truncation for debugging.

**Warning signs:** Plans arrive with valid first N weeks but missing later weeks. JSON parse succeeds but `plan.weeks.length` is less than `plan.meta.totalWeeks`.

### Pitfall 2: Structured Output Schema Compilation Error

**What goes wrong:** Passing a complex JSON schema to the `tools` or structured output API causes a 400 error: "Schema is too complex for compilation." This is documented in the Anthropic SDK Python repo issue tracker.

**Why it happens:** The structured output feature compiles the JSON schema to a grammar. Schemas with many optional fields, nested arrays of objects, and union types multiply grammar complexity non-linearly. A full training plan schema with week arrays, day arrays, and workout arrays easily exceeds the internal compilation limit.

**How to avoid:** Do not use structured outputs for this phase. Use standard Messages API with a `system` prompt containing a few-shot JSON example. Parse `response.content[0].text` as JSON.

**Warning signs:** 400 errors with "grammar" or "schema" in the error message.

### Pitfall 3: Forgetting the CORS Preflight

**What goes wrong:** Browser calls to the Edge Function fail with CORS errors because the OPTIONS preflight is not handled.

**Why it happens:** Every existing Edge Function has this pattern but it is easy to miss when writing a new one from scratch.

**How to avoid:** The very first thing in `Deno.serve` after the function body opens: check `req.method === "OPTIONS"`, return `new Response("ok", { headers: corsHeaders })`.

### Pitfall 4: CLEAN-02 Incomplete Removal — isAdmin Reference

**What goes wrong:** `App.jsx` still references `coachPhilosophy.isAdmin` in the nav useMemo after removing the import, causing a runtime crash.

**Why it happens:** The `coachPhilosophy` destructure is at line 58 of App.jsx. The `isAdmin` consumption is in the `useMemo` at lines 64-75. Both must be removed together.

**How to avoid:** Remove both the destructure and the consuming useMemo in the same edit. Run the test suite after removal to catch broken references.

**Warning signs:** `TypeError: Cannot read properties of undefined (reading 'isAdmin')` in the browser console.

### Pitfall 5: Edge Function Missing ANTHROPIC_API_KEY Secret

**What goes wrong:** Edge Function deploys successfully but returns 500 on first real call because `Deno.env.get("ANTHROPIC_API_KEY")` returns undefined.

**Why it happens:** Supabase Edge Function secrets must be added in the Supabase dashboard under Project Settings → Edge Functions → Secrets. They do not flow from `.env.local`.

**How to avoid:** Add a `missingEnvVars()` guard at the top of `Deno.serve` (pattern from existing strava-sync function). Return a 500 with a descriptive error listing which secrets are missing.

### Pitfall 6: DB Write Using Anon Key Instead of Service Role Key

**What goes wrong:** Edge Function attempts to insert into `hierarchical_plans` but gets RLS violation errors, even though user is authenticated.

**Why it happens:** The `createClient` call must use the service role key, not the anon key, when writing from an Edge Function. RLS policies are still enforced based on the user's identity passed via `set role`/service role, but the client must have elevated permissions to bypass the anon restrictions.

**How to avoid:** Use `SUPABASE_SERVICE_ROLE_KEY` in `createClient`. This is the established pattern in all existing Edge Functions.

---

## Code Examples

### Full Edge Function Skeleton

```typescript
// Source: Established pattern from supabase/functions/strava-sync/index.ts + Anthropic official docs
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// === Embedded coaching context (populated at build time) ===
const SYSTEM_PROMPT = `...`; // assembled from 6 reference files + SKILL.md principles

function getBearerToken(req: Request): string | null {
  const authHeader = req.headers.get("Authorization") || req.headers.get("authorization") || "";
  const [scheme, token] = authHeader.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) return null;
  return token;
}

function missingEnvVars(): string[] {
  return ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "ANTHROPIC_API_KEY"]
    .filter((k) => !Deno.env.get(k));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const missing = missingEnvVars();
  if (missing.length > 0) {
    return new Response(JSON.stringify({ error: "Missing secrets", missing }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const token = getBearerToken(req);
  if (!token) {
    return new Response(JSON.stringify({ error: "Missing bearer token" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: userData, error: userErr } = await supabase.auth.getUser(token);
  if (userErr || !userData?.user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const userId = userData.user.id;
  const body = await req.json();

  // Token limit pre-check (rough heuristic: 1 token ≈ 4 chars)
  const payloadStr = JSON.stringify(body);
  const estimatedInputTokens = Math.ceil((SYSTEM_PROMPT.length + payloadStr.length) / 4);
  if (estimatedInputTokens > 100_000) {
    return new Response(JSON.stringify({ error: "Athlete context payload too large" }), {
      status: 413, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const aiRes = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": Deno.env.get("ANTHROPIC_API_KEY")!,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 32000,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: payloadStr }],
    }),
  });

  if (!aiRes.ok) {
    const errText = await aiRes.text();
    return new Response(JSON.stringify({ error: "Claude API error", detail: errText }), {
      status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const aiResult = await aiRes.json();

  if (aiResult.stop_reason !== "end_turn") {
    return new Response(
      JSON.stringify({ error: "Plan generation truncated. Try requesting a shorter plan." }),
      { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  let plan: Record<string, unknown>;
  try {
    plan = JSON.parse(aiResult.content[0].text);
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON from Claude" }), {
      status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Save to hierarchical_plans
  const { data: saved, error: saveErr } = await supabase
    .from("hierarchical_plans")
    .insert({
      user_id: userId,
      plan_data: plan,
      event_name: plan?.meta?.event ?? null,
      event_date: plan?.meta?.eventDate ?? null,
    })
    .select()
    .single();

  if (saveErr) {
    return new Response(JSON.stringify({ error: "Failed to save plan", detail: saveErr.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ plan: saved }), {
    status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
```

### Running-Only Plan JSON Schema (trimmed for Phase 17)

```json
{
  "version": "1.0",
  "meta": {
    "id": "unique-plan-id",
    "athlete": "Athlete Name",
    "event": "Race Name",
    "eventDate": "2026-10-15",
    "planStartDate": "2026-06-01",
    "planEndDate": "2026-10-15",
    "createdAt": "2026-03-30T00:00:00Z",
    "updatedAt": "2026-03-30T00:00:00Z",
    "totalWeeks": 19,
    "generatedBy": "Claude Coach"
  },
  "preferences": {
    "run": "kilometers",
    "firstDayOfWeek": "monday"
  },
  "assessment": {
    "foundation": {
      "raceHistory": ["Marathon 2024 (3:45)", "Half marathon 2023 (1:45)"],
      "peakTrainingLoad": 10,
      "foundationLevel": "intermediate",
      "yearsInSport": 3
    },
    "currentForm": {
      "weeklyVolume": { "total": 45, "run": 45 },
      "longestSessions": { "run": 22 },
      "consistency": 8
    },
    "strengths": [{ "sport": "run", "evidence": "Consistent aerobic base" }],
    "limiters": [{ "sport": "run", "evidence": "Longest run needs to reach 32+ km" }],
    "constraints": ["Long run on Sunday", "Rest on Monday"]
  },
  "zones": {
    "run": {
      "hr": {
        "lthr": 165,
        "zones": [
          { "zone": 1, "name": "Recovery", "percentLow": 0, "percentHigh": 81, "hrLow": 0, "hrHigh": 134 },
          { "zone": 2, "name": "Aerobic", "percentLow": 81, "percentHigh": 89, "hrLow": 134, "hrHigh": 147 }
        ]
      },
      "pace": {
        "easy": "6:00-6:30/km",
        "aerobic": "5:30-6:00/km",
        "tempo": "5:00-5:20/km",
        "threshold": "4:45-5:00/km"
      }
    }
  },
  "phases": [
    {
      "name": "Base",
      "startWeek": 1,
      "endWeek": 6,
      "focus": "Aerobic foundation",
      "weeklyHoursRange": { "low": 6, "high": 8 },
      "keyWorkouts": ["Long run", "Easy aerobic runs"],
      "physiologicalGoals": ["Improve fat oxidation", "Build aerobic base"]
    }
  ],
  "weeks": [
    {
      "weekNumber": 1,
      "startDate": "2026-06-01",
      "endDate": "2026-06-07",
      "phase": "Base",
      "focus": "Establish aerobic routine",
      "targetHours": 6,
      "isRecoveryWeek": false,
      "days": [
        {
          "date": "2026-06-01",
          "dayOfWeek": "Monday",
          "workouts": [
            {
              "id": "w1-mon-rest",
              "sport": "run",
              "type": "rest",
              "name": "Rest Day",
              "description": "Full recovery",
              "completed": false
            }
          ]
        }
      ],
      "summary": {
        "totalHours": 6,
        "bySport": {
          "run": { "sessions": 5, "hours": 6, "km": 45 }
        }
      }
    }
  ],
  "raceStrategy": {
    "event": { "name": "Race Name", "date": "2026-10-15", "type": "marathon" },
    "pacing": {
      "run": { "targetPace": "5:20/km", "targetHR": "<155", "notes": "Negative split strategy" }
    },
    "nutrition": {
      "preRace": "3 hours before: 100g carbs",
      "during": { "carbsPerHour": 60, "fluidPerHour": "600ml" }
    },
    "taper": {
      "startDate": "2026-10-01",
      "volumeReduction": 50,
      "notes": "Maintain intensity, cut volume"
    }
  }
}
```

### CLEAN-02 Migration Pattern

```sql
-- Source: Established Supabase migration patterns in codebase
-- File: supabase/migrations/YYYYMMDD_drop_philosophy_tables.sql

drop table if exists coach_admin_audit cascade;
drop table if exists coach_philosophy_versions cascade;
drop table if exists coach_philosophy_documents cascade;
drop table if exists coach_admins cascade;

-- Note: coach_playbook_entries from 20260305_coach_playbook_entries.sql
-- is also part of the philosophy system — include if orphaned
drop table if exists coach_playbook_entries cascade;
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Gemini AI with weekly JSON plan | Claude API with full hierarchical plan JSON | Phase 17 (v2.0) | Deeper coaching context, full plan in one request |
| Philosophy stored in `coach_philosophy_documents` Supabase table | Coaching context embedded in Edge Function from SKILL.md files | Phase 17 | No admin UI required; coaching knowledge in code review |
| Per-week plan generation (7 days) | Full plan generation (all phases + weeks + days) | Phase 17 | Enables plan viewer in Phase 19 |
| Anthropic SDK (TypeScript) | Raw `fetch()` to Anthropic REST API | Decision in STATE.md | Deno lock file v5 incompatibility avoided |

**Deprecated/outdated:**
- `coach-philosophy-admin` Edge Function: Removed in this phase — superseded by SKILL.md embedding
- `coach_philosophy_documents` table: Dropped in this phase — data was static coaching text now embedded in code
- `gemini-coach` Edge Function: Kept through Phase 22 for parallel operation; not removed until new system is proven

---

## Open Questions

1. **System prompt size vs max context**
   - What we know: 6 reference files range from ~2KB to ~8KB each, totaling ~30KB of coaching context + SKILL.md principles ~3KB + few-shot example ~5KB ≈ ~38KB ≈ ~9,500 tokens system prompt
   - What's unclear: Whether 9,500 input tokens + ~32,000 output tokens is within budget for a 20-week plan
   - Recommendation: Set `max_tokens: 32000` for initial implementation; Sonnet 4.6 has 64k max output tokens so there is headroom. Monitor token usage in first test calls.

2. **coach_playbook_entries table scope in CLEAN-02**
   - What we know: `20260305_coach_playbook_entries.sql` creates a separate `coach_playbook_entries` table. The CONTEXT.md lists `coach_philosophy_documents` for removal but does not explicitly list `coach_playbook_entries`.
   - What's unclear: Whether `coach_playbook_entries` is actively used anywhere or orphaned.
   - Recommendation: Check `useCoachPhilosophy.js` and `coach-philosophy-admin` for any references to `coach_playbook_entries`. If unused, include in the drop migration for completeness.

3. **mockAppData.js update after coachPhilosophy removal**
   - What we know: `tests/unit/mockAppData.js` exports `makeAppData()` which builds the AppDataContext value for tests. If `coachPhilosophy` is in that value, it must be removed.
   - What's unclear: Whether any test currently exercises the `coachPhilosophy.isAdmin` branch.
   - Recommendation: Check `mockAppData.js` for `coachPhilosophy` and remove it. Check `coach.test.jsx` and `gemini-instructions.test.jsx` for any `isAdmin` assertions that need to be removed.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest (unit + component projects) |
| Config file | `vitest.config.js` |
| Quick run command | `npm test -- --run --project unit` |
| Full suite command | `npm test -- --run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| COACH-01 | Edge Function returns valid plan JSON with stop_reason check | Integration (curl/script) | `curl` test against deployed function | ❌ Wave 0 |
| COACH-01 | Running-only JSON schema validates correctly (no swim/bike fields) | Unit | `npm test -- --run --project unit` | ❌ Wave 0 |
| DATA-01 | hierarchical_plans table accepts JSONB insert and returns by user_id | Integration | Supabase SQL test or migration verify | ❌ Wave 0 |
| DATA-01 | Unauthenticated POST returns 401 | Integration (curl) | `curl` without auth header | ❌ Wave 0 |
| CLEAN-02 | AdminPhilosophyPage import removed — no React import errors | Component | `npm test -- --run --project components` | ✅ (existing test suite) |
| CLEAN-02 | coachPhilosophy removed from mockAppData — no broken context | Unit | `npm test -- --run --project unit` | ✅ (existing suite) |

### Sampling Rate
- **Per task commit:** `npm test -- --run`
- **Per wave merge:** `npm test -- --run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `tests/unit/claudeCoach.schema.test.js` — validates running-only plan JSON shape (no swim/bike, required fields present), covers COACH-01 schema correctness
- [ ] Manual curl test script documented in VERIFICATION.md — covers COACH-01 end-to-end and DATA-01 auth boundary

*(Test infrastructure (Vitest) already installed — no framework install needed)*

---

## Sources

### Primary (HIGH confidence)
- Anthropic Platform Docs — Models Overview (`platform.claude.com/docs/en/about-claude/models/overview`) — confirmed model IDs, context windows, max output tokens for Claude Sonnet 4.6 and Opus 4.6
- Anthropic Platform Docs — Messages API (`platform.claude.com/docs/en/api/messages`) — request structure, required headers, stop_reason values, response format
- Supabase Docs — Securing Edge Functions (`supabase.com/docs/guides/functions/auth`) — JWT verification pattern, getClaims/getUser approaches
- Supabase Docs — Row Level Security (`supabase.com/docs/guides/database/postgres/row-level-security`) — RLS policy patterns with auth.uid()
- `supabase/functions/strava-sync/index.ts` — CORS headers, getBearerToken, supabase.auth.getUser() auth pattern (codebase)
- `supabase/functions/gemini-coach/index.ts` — CORS headers, system prompt construction, response handling patterns (codebase)
- `docs/running_coach/output/krs-smve-plan.json` — Concrete running-only plan output example (codebase)
- `supabase/migrations/20260305_coach_philosophy_documents.sql` — Tables to drop in CLEAN-02 (codebase)
- `src/App.jsx` — Exact import/route/destructure lines to remove for CLEAN-02 (codebase)
- `src/context/AppDataContext.jsx` — coachPhilosophy integration points to remove (codebase)

### Secondary (MEDIUM confidence)
- GitHub Issue — anthropics/anthropic-sdk-python #1185 — "compiled grammar is too large" error for complex schemas. Confirms structured outputs are not viable for full plan schema. Verified against Anthropic's structured outputs docs page.
- WebSearch result — Anthropic structured outputs docs: "Schema is too complex for compilation" 400 error, 180-second compilation timeout. Consistent with the research flag in STATE.md.

### Tertiary (LOW confidence)
- Token size estimates for 20-week plan output (15,000-25,000 tokens) — derived from krs-smve-plan.json size + token ratio heuristic, not measured against API

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — Anthropic API docs + existing codebase patterns directly verified
- Architecture: HIGH — all patterns sourced from official docs or existing working code in the repo
- Pitfalls: HIGH — structured output limit is documented in official SDK issue tracker; other pitfalls observed directly from codebase

**Research date:** 2026-03-30
**Valid until:** 2026-04-30 (Anthropic model IDs may change; check models overview if implementing after this date)
