# Phase 18: Hierarchical Plan Hook Layer — Research

**Researched:** 2026-03-30
**Domain:** React custom hook lifecycle management, Supabase JSONB atomic operations, Postgres RPCs
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Intake form scope**
- Phase 18 includes the athlete intake form UI — `generatePlan()` needs a caller
- Form lives in a modal triggered from the plan page (not a dedicated route)
- Pre-fill from existing data wherever possible: runner profile `background` field, recent Strava activities for weekly km estimate, existing plan constraints for hard/rest day fields
- Four field groups: race goal, fitness baseline, weekly constraints, background
- When a plan already exists: show a "This will replace your current plan." confirmation before submitting
- On confirm: old plan is replaced, new generation begins

**Single active plan model**
- `useHierarchicalPlan` manages one active plan per user — no list, no selection UI
- Auto-selects the latest row where `status = 'active'`
- Loads eagerly on mount when `userId` is available (same pattern as `usePlans`)
- When no plan exists: `plan: null`, `loading: false`, `error: null` — pages check `plan` directly and show a "Generate your first plan" prompt

**Hook API surface**
- `generatePlan(payload)` — calls `claude-coach` Edge Function, updates hook state on completion
- `applyPatch(patchArray)` — Postgres RPC for atomic surgical patch
- `toggleWorkoutCompleted(workoutId, weekNumber, dayDate)` — marks a workout done/undone in the JSONB doc
- `moveWorkout(workoutId, fromDate, toDate)` — atomic Postgres RPC for date swap (DATA-03)
- `getWeek(weekNumber)` — pure accessor, returns a single week from `plan.weeks`
- `getPhases()` — pure accessor, returns `plan.phases`

**applyPatch design**
- Surgical: patches target specific workouts/days, not the full plan document
- Postgres RPC for atomicity — same approach as `moveWorkout`. Race conditions and partial writes are impossible
- Patch format (array of targeted workout changes):
  ```json
  [{ "week": 3, "dayDate": "2026-05-13", "workoutId": "w-xyz", "fields": { "type": "Easy", "duration": 45 } }]
  ```
- NOT RFC 6902 JSON Patch

**Generation UX / loading states**
- Synchronous wait: frontend POST to `claude-coach` waits for the full response (~30-60s), then the Edge Function writes to DB and returns the saved plan. No polling needed.
- During generation: modal stays open showing a spinner + rotating coaching-flavored messages
- Hook exposes separate `generating` flag:
  ```js
  { plan, loading, generating, error }
  // loading = initial plan fetch
  // generating = waiting for Claude to return a new plan
  ```

### Claude's Discretion
- Exact field validation logic inside the intake form (what's required vs optional)
- Exact Postgres function signature for `applyPatch` RPC (parameter names, return type)
- How `moveWorkout` RPC handles the same-day edge case (source and target are the same date)
- Routing coaching-flavored messages (static array vs randomized)

### Deferred Ideas (OUT OF SCOPE)
- Plan history / multiple plans — hook is single-plan only; history browsing is a future phase
- Streaming plan generation — explicitly out of scope per REQUIREMENTS.md
- Multi-turn athlete assessment intake (SKILL.md full assessment flow) — v2.1 COACH-05
- Partial plan regeneration (regenerate specific weeks only) — v2.1 COACH-04
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DATA-02 | User's plan modifications from chat (plan-patch) are applied atomically to the stored JSONB document | Postgres RPC `apply_plan_patch` with jsonb_set operations; use `WITH` CTE to make the entire patch array atomic in one DB call |
| DATA-03 | Workout date swaps use an atomic Postgres RPC to prevent half-persisted state during drag-and-drop | Postgres RPC `move_workout` with a JSONB path update; single transaction prevents partial writes; hook calls `.rpc()` via Supabase JS client |
</phase_requirements>

---

## Summary

Phase 18 builds `useHierarchicalPlan` — a React hook that owns the full JSONB plan lifecycle on the `hierarchical_plans` table. The hook replaces direct Supabase table writes with two Postgres RPCs for all mutations that must be atomic: `apply_plan_patch` (DATA-02) and `move_workout` (DATA-03). These RPCs execute JSONB path surgery inside a single transaction on the Postgres side, making partial writes impossible regardless of network conditions.

The hook follows the existing project pattern exactly: `useReducer` with `{pending, loaded, error}` action types, `useMemo(() => getSupabaseClient(), [])` for the client singleton, and `useCallback` with explicit dependency arrays for all async methods. It integrates into `AppDataContext` the same way every other hook does: instantiated with `userId`, spread into the context `value`. The `generating` flag is new — it distinguishes "first load in progress" from "Claude is computing a plan" and is critical for accurate UI states in the intake modal.

The intake form modal pre-fills from three existing context slices (`runnerProfile.background`, a computed weekly km estimate from `activities.activities`, and day constraints from `workoutEntries.entries`). The form maps directly to the `AthletePayload` interface already defined in `supabase/functions/claude-coach/index.ts`. Calling the Edge Function follows the same auth pattern used in `useStrava`: get the session via `client.auth.getSession()`, pass `Authorization: Bearer ${session.access_token}` in the fetch headers, call the function URL with `client.functions.invoke()`.

**Primary recommendation:** Build the hook, RPCs, and modal as a single cohesive unit in two plans: Plan 1 for the DB migration (RPCs) and hook core, Plan 2 for the intake form modal and AppDataContext wiring.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 18 (existing) | Hook and state management | Project baseline |
| `@supabase/supabase-js` | 2 (existing) | Supabase JS client, `.rpc()`, `.functions.invoke()` | Project baseline |
| Vitest + React Testing Library | existing | Hook tests via `renderHook` + `act` | Project test standard |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `src/domain/planSchema.js` | project file | `validatePlanSchema()` for post-generation validation | Call inside `generatePlan()` after Edge Function returns |
| `@testing-library/react` | existing | `renderHook`, `act` for async hook testing | All hook tests |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `useReducer` | `useState` with multiple setters | `useReducer` is project convention; `useState` scatters dispatch logic |
| Postgres RPC for atomic patch | Client-side read-modify-write | RPC eliminates TOCTOU race; client-side approach can corrupt concurrent edits |
| `client.functions.invoke()` | Raw `fetch` to Edge Function URL | `functions.invoke()` handles the URL resolution and auth token attachment transparently |

**Installation:** No new packages. Everything required exists in the project already.

---

## Architecture Patterns

### Recommended File Structure
```
src/
├── hooks/
│   └── useHierarchicalPlan.js     # NEW: the hook
├── components/
│   └── PlanIntakeModal.jsx        # NEW: intake form modal
├── context/
│   └── AppDataContext.jsx         # MODIFIED: add useHierarchicalPlan
tests/
├── unit/
│   ├── useHierarchicalPlan.test.jsx  # NEW: hook tests
│   └── mockAppData.js             # MODIFIED: add hierarchicalPlan slice
supabase/
└── migrations/
    └── 20260330_plan_rpcs.sql     # NEW: apply_plan_patch + move_workout RPCs
```

### Pattern 1: Hook Structure (replicate usePlans)

The hook uses `useReducer` + `useCallback`, identical to every other hook in the project. The only additions are the `generating` flag and the `plan` single-item shape (not an array).

```javascript
// Source: src/hooks/usePlans.js (project pattern)
const initialState = {
  plan: null,        // single active plan row (or null if none exists)
  loading: false,    // initial fetch in progress
  generating: false, // claude-coach Edge Function call in progress
  error: null,
};

function reducer(state, action) {
  switch (action.type) {
    case "pending":
      return { ...state, loading: true, error: null };
    case "generating":
      return { ...state, generating: true, error: null };
    case "loaded":
      return { ...state, plan: action.payload, loading: false };
    case "generated":
      return { ...state, plan: action.payload, generating: false };
    case "patched":
      return { ...state, plan: action.payload, loading: false };
    case "error":
      return { ...state, loading: false, generating: false, error: action.payload };
    default:
      return state;
  }
}
```

### Pattern 2: Edge Function Call (replicate useStrava callEdgeFunction)

The established project pattern for calling Edge Functions uses `client.auth.getSession()` to get the current access token, then passes it as `Authorization: Bearer` header via `client.functions.invoke()`.

```javascript
// Source: src/hooks/useStrava.js (project pattern)
const callEdgeFunction = useCallback(async (functionName, body) => {
  if (!client) throw new Error("Supabase is not configured.");
  const { data: { session }, error: sessionError } = await client.auth.getSession();
  if (sessionError) throw sessionError;
  if (!session) throw new Error("No active session. Please sign in first.");

  const { data, error: invokeError } = await client.functions.invoke(functionName, {
    body,
    headers: { Authorization: `Bearer ${session.access_token}` },
  });
  if (invokeError) throw new Error(`${functionName}: ${invokeError.message}`);
  return data;
}, [client]);
```

The `generatePlan(payload)` method in `useHierarchicalPlan` follows this exact pattern, calling `claude-coach` with an `AthletePayload` body. After a successful response, the Edge Function has already written to `hierarchical_plans` and returns `{ id, plan, usage }`. The hook can either use the returned `plan` directly or re-fetch from the DB.

**Important:** Dispatch `{ type: "generating" }` immediately before the fetch (synchronously), so the modal spinner appears before any async work begins.

### Pattern 3: Postgres RPC via Supabase JS

Supabase JS exposes `.rpc(functionName, params)` for calling Postgres functions. The function returns `{ data, error }` identically to all other Supabase queries.

```javascript
// Source: Supabase JS v2 official docs
const { data, error } = await client.rpc("move_workout", {
  p_plan_id: planId,
  p_workout_id: workoutId,
  p_from_date: fromDate,
  p_to_date: toDate,
});
```

### Pattern 4: Postgres RPC Design for JSONB Atomic Update

The RPCs must perform JSONB path surgery inside a single transaction. The `hierarchical_plans.plan_data` column is a JSONB document with structure `{ ..., weeks: [ { days: [ { workouts: [...] } ] } ] }`.

**`move_workout` RPC pattern:** Rather than attempting complex JSONB path updates to move a workout object between two `days` arrays, the cleanest atomic approach is to pass the entire updated `plan_data` JSONB (after the move is computed client-side) and do a conditional UPDATE with an optimistic concurrency check. This avoids the complexity of computing JSONB path indices for arbitrary positions inside nested arrays, which varies with every plan.

Alternative: pass the full updated `plan_data` document computed by the hook client-side, with the RPC doing a conditional `UPDATE ... WHERE id = p_plan_id AND user_id = auth.uid()`. This is still atomic — the update either succeeds entirely or fails; no partial state is possible.

**`apply_plan_patch` RPC pattern:** Given the patch format is an array of `{week, dayDate, workoutId, fields}`, the RPC iterates over the patch array and applies `jsonb_set()` calls. Each `jsonb_set` call targets a specific workout inside the JSONB document. Since all patches are in one transaction, either all succeed or none do.

The key design question (Claude's discretion) is whether the RPC uses a PL/pgSQL loop over the patch array or a CTE chain. Both achieve atomicity. A PL/pgSQL `FOR item IN SELECT * FROM jsonb_array_elements(p_patches) LOOP` approach is clearest for maintainability.

### Pattern 5: AppDataContext Integration

```javascript
// Source: src/context/AppDataContext.jsx (project pattern)
// In AppDataProvider:
const hierarchicalPlan = useHierarchicalPlan(userId);

// In value useMemo:
const value = useMemo(() => ({
  // ... existing slices ...
  hierarchicalPlan,
}), [/* ... existing deps ... */, hierarchicalPlan]);
```

The hook object returned by `useHierarchicalPlan` is spread directly into the context value — no wrapper callbacks needed (unlike `checkins` which needed `normalizeCheckin` wrapping).

### Pattern 6: Hook Test Structure (replicate useWorkoutEntries.test.jsx)

The test file uses a `createFluentTable` helper that builds a chainable builder object matching the Supabase JS query builder API. This allows tests to mock the Supabase client without importing Supabase at all.

```javascript
// Source: tests/unit/useWorkoutEntries.test.jsx (project pattern)
vi.mock("../../src/lib/supabaseClient", () => ({
  getSupabaseClient: vi.fn(),
}));
import { getSupabaseClient } from "../../src/lib/supabaseClient";

// In tests:
getSupabaseClient.mockReturnValue(createClient({
  selectPlan: () => ({ data: MOCK_PLAN_ROW, error: null }),
  rpc: vi.fn().mockResolvedValue({ data: MOCK_PLAN_ROW, error: null }),
}));
```

The test file uses `renderHook` + `act` from `@testing-library/react` for all async operations. Every async method call is wrapped in `await act(async () => { ... })`.

### Anti-Patterns to Avoid

- **Bare `vi.fn()` for async mocks in `makeAppData`**: Always `vi.fn().mockResolvedValue(...)`. Bare `vi.fn()` returns `undefined` which crashes `.then()` / `.catch()` chains in effects. This is documented in CLAUDE.md.
- **Re-fetching full plan after patch**: After `applyPatch()` or `toggleWorkoutCompleted()`, the RPC returns the updated row. Use the returned data directly to update hook state — don't make a second SELECT query.
- **Calling `getSession()` on every render**: Call it inside the `useCallback` for `generatePlan()` only, not in the hook's top level. The session is only needed when calling the Edge Function.
- **Forgetting to set `generating: false` on error**: The `error` action type must reset both `loading` and `generating` to false, or the modal will be stuck in spinner state on Edge Function failures.
- **Using `useState` for `plan`**: Use `useReducer`. All other hooks use it. Mixing patterns makes the codebase harder to reason about.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Atomic multi-field JSONB update | Client-side read-modify-write loop | Postgres RPC with jsonb_set in one transaction | TOCTOU race condition possible with client-side approach if two sessions have the plan open |
| Session token retrieval | Manual JWT parsing | `client.auth.getSession()` | Supabase JS handles token refresh automatically |
| Edge Function URL construction | Hardcode env var URL | `client.functions.invoke(functionName, ...)` | URL resolves from project config; works across environments |
| Plan schema validation | Re-implement field checks | `validatePlanSchema()` from `src/domain/planSchema.js` | Already exists, tested in `claudeCoach.schema.test.js` |
| Fluent Supabase mock in tests | Real Supabase connection | `createFluentTable()` helper pattern from `useWorkoutEntries.test.jsx` | Pattern is established and complete; copying it is the right approach |

**Key insight:** The JSONB atomicity requirement (DATA-02, DATA-03) is the main reason Postgres RPCs exist. Any approach that reads, modifies, and writes JSONB in separate round-trips can produce partial writes under concurrent access or network failure.

---

## Common Pitfalls

### Pitfall 1: Forgetting the `status = 'active'` filter on plan load
**What goes wrong:** The query returns ALL plan rows for the user (including failed/replaced plans), and the hook exposes the wrong plan.
**Why it happens:** `hierarchical_plans` supports `status IN ('active', 'generating', 'failed')`. Older plans remain in the table.
**How to avoid:** `query.eq("status", "active").order("created_at", { ascending: false }).limit(1).maybeSingle()` — explicitly filter by status and take the most recent.
**Warning signs:** Plan viewer shows stale data after regeneration.

### Pitfall 2: `generating` flag not reset on Edge Function error
**What goes wrong:** User submits the intake form, Claude returns an error (timeout, API error), but the spinner stays on screen permanently.
**Why it happens:** Only the `"generated"` action resets `generating: false` — but on error the `"error"` action fires, and if `generating` isn't reset there, the modal freezes.
**How to avoid:** The `"error"` action in the reducer must return `{ ...state, loading: false, generating: false, error: action.payload }`.
**Warning signs:** Spinner visible even after console shows an error.

### Pitfall 3: Old active plan not deactivated before inserting new one
**What goes wrong:** After calling `generatePlan()` a second time, both the old plan and the new plan have `status = 'active'`, causing the hook to return whichever was inserted first (or last, depending on sort order).
**Why it happens:** The Edge Function inserts a new row with `status = 'active'` without deactivating the previous active plan. Phase 18 must handle this: either the Edge Function updates the old plan first, or `generatePlan()` calls a Supabase UPDATE to set the old plan's status to `'replaced'` before calling the Edge Function.
**How to avoid:** Before dispatching `generating`, update all existing `status = 'active'` plans for the user to `status = 'replaced'` via `client.from("hierarchical_plans").update({ status: "replaced" }).eq("user_id", userId).eq("status", "active")`. Do this as a pre-step in `generatePlan()`.
**Warning signs:** `loadPlan()` returns the old plan after regeneration.

### Pitfall 4: Mock `plan` in `makeAppData` missing the `generating` flag
**What goes wrong:** Tests that check the `generating` state crash or behave incorrectly because the mock doesn't expose it.
**Why it happens:** `makeAppData` is updated to add a `hierarchicalPlan` slice, but the reviewer forgets `generating: false` in the initial mock shape.
**How to avoid:** The `makeAppData` update must mirror the full hook return shape: `{ plan: null, loading: false, generating: false, error: null, generatePlan: vi.fn(), ... }`.

### Pitfall 5: `getWeek` / `getPhases` called before plan loads
**What goes wrong:** `getWeek(1)` returns `undefined`, and Phase 19's plan viewer crashes with "Cannot read properties of undefined".
**Why it happens:** The pure accessors assume `plan` is non-null and that `plan.weeks` is an array.
**How to avoid:** Add null-safe guards: `getWeek(n)` returns `null` if `!plan || !plan.weeks`. Document this contract in the hook's JSDoc. Phase 19 implementations must check `plan !== null` before calling accessors.

### Pitfall 6: The intake form submits raw form values without constructing `AthletePayload`
**What goes wrong:** The Edge Function receives incorrectly structured data and either returns 400 or generates a plan without the constraints field.
**Why it happens:** The form collects values in a shape convenient for HTML inputs (e.g., `hardDays` as a comma-separated string, `maxSessions` as a string).
**How to avoid:** The `generatePlan(payload)` caller (or a helper function) must construct a valid `AthletePayload` object matching the interface in `supabase/functions/claude-coach/index.ts` — converting strings to numbers, arrays from comma-separated inputs, etc.

---

## Code Examples

Verified patterns from existing project code:

### Loading the active plan (eager on mount)
```javascript
// Pattern from src/hooks/usePlans.js — adapted for single-plan model
const loadPlan = useCallback(async () => {
  if (!client || !userId) return;
  dispatch({ type: "pending" });
  const { data, error } = await client
    .from("hierarchical_plans")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    dispatch({ type: "error", payload: error });
    return;
  }
  dispatch({ type: "loaded", payload: data ?? null });
}, [client, userId]);

// Eager load effect
useEffect(() => {
  if (userId) loadPlan();
}, [userId, loadPlan]);
```

### Calling the claude-coach Edge Function
```javascript
// Pattern from src/hooks/useStrava.js callEdgeFunction
const generatePlan = useCallback(async (payload) => {
  if (!client || !userId) throw new Error("Not authenticated");
  dispatch({ type: "generating" });
  try {
    const { data: { session }, error: sessionError } = await client.auth.getSession();
    if (sessionError || !session) throw new Error("No active session");

    // Deactivate old plan before generating new one
    await client
      .from("hierarchical_plans")
      .update({ status: "replaced" })
      .eq("user_id", userId)
      .eq("status", "active");

    const { data, error: invokeError } = await client.functions.invoke("claude-coach", {
      body: payload,
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (invokeError) throw new Error(`claude-coach: ${invokeError.message}`);

    // Edge Function returns { id, plan, usage } — re-fetch the saved row
    // (or use the returned plan directly if it matches the DB row shape)
    const { data: savedRow, error: fetchError } = await client
      .from("hierarchical_plans")
      .select("*")
      .eq("id", data.id)
      .single();
    if (fetchError) throw fetchError;

    dispatch({ type: "generated", payload: savedRow });
    return savedRow;
  } catch (err) {
    dispatch({ type: "error", payload: err });
    throw err;
  }
}, [client, userId]);
```

### Calling an RPC atomically
```javascript
// Source: Supabase JS v2 .rpc() API
const moveWorkout = useCallback(async (workoutId, fromDate, toDate) => {
  if (!client || !state.plan) throw new Error("No active plan");
  dispatch({ type: "pending" });
  const { data, error } = await client.rpc("move_workout", {
    p_plan_id: state.plan.id,
    p_workout_id: workoutId,
    p_from_date: fromDate,
    p_to_date: toDate,
  });
  if (error) {
    dispatch({ type: "error", payload: error });
    throw error;
  }
  // RPC returns the updated plan row
  dispatch({ type: "patched", payload: data });
  return data;
}, [client, state.plan]);
```

### Postgres RPC for move_workout (migration)
```sql
-- Conceptual pattern — exact implementation is Claude's discretion
-- The RPC receives the full updated plan_data and does a conditional UPDATE.
-- This is the simplest approach that guarantees atomicity.
create or replace function move_workout(
  p_plan_id uuid,
  p_workout_id text,
  p_from_date text,
  p_to_date text
)
returns hierarchical_plans
language plpgsql
security definer
as $$
declare
  v_row hierarchical_plans;
begin
  -- The actual JSONB manipulation logic:
  -- Find the workout in p_from_date day, remove it, append to p_to_date day.
  -- All in one UPDATE statement or CTE — single transaction.
  update hierarchical_plans
  set
    plan_data = /* jsonb path surgery here */,
    updated_at = now()
  where id = p_plan_id
    and user_id = auth.uid()
  returning * into v_row;

  if not found then
    raise exception 'Plan not found or access denied';
  end if;

  return v_row;
end;
$$;
```

**Note on `security definer` vs `security invoker`:** The existing RLS policies on `hierarchical_plans` use `auth.uid()` checks. RPCs should use `security invoker` (the default) so the RLS policies apply. If `security definer` is used, the `WHERE user_id = auth.uid()` check must be added explicitly inside the function body.

### Hook test structure
```javascript
// Source: tests/unit/useWorkoutEntries.test.jsx (project pattern)
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useHierarchicalPlan } from "../../src/hooks/useHierarchicalPlan";

vi.mock("../../src/lib/supabaseClient", () => ({
  getSupabaseClient: vi.fn(),
}));
import { getSupabaseClient } from "../../src/lib/supabaseClient";

describe("useHierarchicalPlan", () => {
  beforeEach(() => {
    getSupabaseClient.mockReturnValue(createMockClient());
  });

  it("loads active plan on mount when userId is provided", async () => {
    const { result } = renderHook(() => useHierarchicalPlan("user-1"));
    await act(async () => { /* wait for effect */ });
    expect(result.current.plan).toEqual(MOCK_PLAN_ROW);
    expect(result.current.loading).toBe(false);
  });

  it("generatePlan sets generating:true then resolves with saved plan", async () => {
    const { result } = renderHook(() => useHierarchicalPlan("user-1"));
    await act(async () => {
      await result.current.generatePlan(MOCK_ATHLETE_PAYLOAD);
    });
    expect(result.current.generating).toBe(false);
    expect(result.current.plan).toBeDefined();
  });
});
```

### makeAppData hierarchicalPlan slice
```javascript
// Add to tests/unit/mockAppData.js makeAppData()
hierarchicalPlan: {
  plan: null,
  loading: false,
  generating: false,
  error: null,
  loadPlan: vi.fn().mockResolvedValue(null),
  generatePlan: vi.fn().mockResolvedValue(MOCK_HIERARCHICAL_PLAN_ROW),
  applyPatch: vi.fn().mockResolvedValue(MOCK_HIERARCHICAL_PLAN_ROW),
  toggleWorkoutCompleted: vi.fn().mockResolvedValue(MOCK_HIERARCHICAL_PLAN_ROW),
  moveWorkout: vi.fn().mockResolvedValue(MOCK_HIERARCHICAL_PLAN_ROW),
  getWeek: vi.fn().mockImplementation((n) =>
    MOCK_HIERARCHICAL_PLAN_ROW?.plan_data?.weeks?.find(w => w.weekNumber === n) ?? null
  ),
  getPhases: vi.fn().mockReturnValue(
    MOCK_HIERARCHICAL_PLAN_ROW?.plan_data?.phases ?? []
  ),
},
```

---

## Key Integration Points

### Edge Function response shape
The `claude-coach` Edge Function (Phase 17) responds with:
```json
{ "id": "<uuid>", "plan": { /* JSONB plan document */ }, "usage": { ... } }
```
The `id` is the `hierarchical_plans` row ID. The `plan` is the `plan_data` JSONB content (not the full DB row). To update hook state with the full row shape (including `id`, `status`, `created_at`), either use the returned `id` to re-fetch the row, or reconstruct the row shape locally.

### AthletePayload interface (from claude-coach/index.ts)
```typescript
interface AthletePayload {
  raceGoal: {
    eventName: string;
    eventDate: string;
    eventType: string; // "marathon" | "ultra" | "trail"
  };
  fitness: {
    weeklyKm: number;
    longestRun: number;
    lthr: number;
    yearsRunning: number;
  };
  constraints: {
    longRunDay: string;
    hardDays: string[];
    restDays: string[];
    maxSessions: number;
  };
  background: string;
}
```
The `PlanIntakeModal` form must construct exactly this shape before calling `generatePlan(payload)`.

### Pre-fill data sources
| Form field | Source hook | Property | Transform needed |
|-----------|-------------|----------|-----------------|
| `background` | `runnerProfile` | `.background` | None — plain text |
| `fitness.weeklyKm` | `activities` | `.activities` array | Sum last 4 weeks' distances, divide by 4, convert metres to km |
| `constraints.hardDays` | `workoutEntries` | `.entries` array | Filter by workout_type not in ["Easy", "Recovery", "Rest"], map to day-of-week strings |
| `constraints.restDays` | `workoutEntries` | `.entries` array | Filter by workout_type === "Rest", map to day-of-week strings |

### JSONB path for toggleWorkoutCompleted
`toggleWorkoutCompleted(workoutId, weekNumber, dayDate)` must find the workout in `plan_data.weeks[weekIndex].days[dayIndex].workouts[workoutIndex].completed` and toggle it. Since this is a targeted single-field update, it can be done with a Supabase `jsonb_set` RPC rather than client-side read-modify-write. The RPC approach maintains the DATA-02 atomicity principle. Alternatively, if the plan is small enough (< 32KB typical), a client-side document update followed by a full `UPDATE plan_data = $newDoc` is also safe for this single-user, single-plan scenario — this is a discretion area for the implementer.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Multiple plan rows queried as an array (`usePlans`) | Single `status = 'active'` row fetched with `maybeSingle()` | Phase 18 | Hook exposes `plan` (object or null), not `plans` (array) |
| AI coaching via Gemini Edge Function + per-week generation | Full plan generation via Claude Edge Function returning JSONB | Phase 17 | Hook calls `claude-coach`, not `gemini-coach` |
| Workout entries stored in `workout_entries` relational table | Workouts stored inside `plan_data` JSONB in `hierarchical_plans` | Phase 17 | All plan mutations now target JSONB, not relational rows |

**Deprecated/outdated:**
- `usePlans` hook: still in use for the old `training_plans` table, but `useHierarchicalPlan` is the new data contract for the v2.0 plan system. The two coexist until Phase 22 cleanup.
- `gemini-coach` Edge Function: still deployed, not yet called from Phase 18+ pages.

---

## Open Questions

1. **`toggleWorkoutCompleted` implementation: RPC or client-side document update?**
   - What we know: Both approaches achieve atomicity for single-user single-session usage. RPCs are more robust under concurrent access.
   - What's unclear: Whether concurrent access is a real concern for a single-user app. A full document UPDATE is simpler to implement and test.
   - Recommendation: Use a lightweight RPC for consistency with DATA-02/DATA-03 pattern, but if implementation time is constrained, a client-side compute + full document UPDATE is acceptable for Phase 18 and can be upgraded later.

2. **`move_workout` RPC: JSONB path surgery vs full document replacement**
   - What we know: JSONB path surgery (`jsonb_set`) is complex when the target is inside a nested array at an unknown index. Full document replacement is simpler.
   - What's unclear: The Postgres `jsonb_path_query` / `jsonb_set` approach requires computing the array indices of the source and destination days.
   - Recommendation: Pass the pre-computed updated `plan_data` from the hook (after client-side move computation) and have the RPC do `UPDATE ... SET plan_data = p_new_plan_data WHERE id = p_plan_id AND user_id = auth.uid()`. This keeps the JSONB traversal logic in JavaScript (easier to test and debug) while preserving the atomicity guarantee (single transaction, RLS enforced).

3. **Same-day edge case in `moveWorkout`**
   - What we know: CONTEXT.md marks this as Claude's discretion.
   - Recommendation: If `fromDate === toDate`, the RPC should be a no-op (return the unchanged plan row immediately). Add this check at the hook level before calling the RPC.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (existing) |
| Config file | `vitest.config.js` (root) |
| Quick run command | `npm test -- --run --reporter=verbose --project=components` |
| Full suite command | `npm test -- --run` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DATA-02 | `applyPatch()` applies array of patch objects atomically (calls `.rpc("apply_plan_patch", ...)`) | unit | `npm test -- --run --project=components tests/unit/useHierarchicalPlan.test.jsx` | No — Wave 0 |
| DATA-02 | `applyPatch()` updates hook state with returned plan row | unit | same | No — Wave 0 |
| DATA-02 | `applyPatch()` dispatches `error` action on RPC failure | unit | same | No — Wave 0 |
| DATA-03 | `moveWorkout()` calls `.rpc("move_workout", {...})` with correct params | unit | same | No — Wave 0 |
| DATA-03 | `moveWorkout()` is a no-op when `fromDate === toDate` | unit | same | No — Wave 0 |
| DATA-03 | `moveWorkout()` updates hook state with returned plan row | unit | same | No — Wave 0 |
| (implicit) | `generatePlan()` sets `generating: true` synchronously before async work | unit | same | No — Wave 0 |
| (implicit) | `generatePlan()` resets `generating: false` after success | unit | same | No — Wave 0 |
| (implicit) | `generatePlan()` resets `generating: false` after error | unit | same | No — Wave 0 |
| (implicit) | `getWeek(n)` returns null when plan is null | unit | same | No — Wave 0 |
| (implicit) | `getPhases()` returns empty array when plan is null | unit | same | No — Wave 0 |
| (implicit) | `loadPlan()` fetches only `status = 'active'` rows | unit | same | No — Wave 0 |
| (implicit) | `makeAppData` hierarchicalPlan slice present in mock | unit | `npm test -- --run` (all tests pass with updated mock) | No — Wave 0 |

### Sampling Rate
- **Per task commit:** `npm test -- --run --project=components tests/unit/useHierarchicalPlan.test.jsx`
- **Per wave merge:** `npm test -- --run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/unit/useHierarchicalPlan.test.jsx` — covers DATA-02, DATA-03, and all hook lifecycle methods
- [ ] `MOCK_HIERARCHICAL_PLAN_ROW` fixture in `tests/unit/mockAppData.js` — a sample `hierarchical_plans` DB row with `plan_data` matching `VALID_PLAN` from `claudeCoach.schema.test.js`
- [ ] `hierarchicalPlan` slice added to `makeAppData()` in `tests/unit/mockAppData.js`

*(Framework install not needed — Vitest is already configured and running)*

---

## Sources

### Primary (HIGH confidence)
- `src/hooks/usePlans.js` — exact hook reducer and useCallback pattern
- `src/hooks/useWorkoutEntries.js` — complex hook with async operations pattern
- `src/hooks/useStrava.js` — Edge Function call pattern with `client.auth.getSession()` + `client.functions.invoke()`
- `src/context/AppDataContext.jsx` — how hooks wire into context
- `supabase/functions/claude-coach/index.ts` — AthletePayload interface, response shape `{ id, plan, usage }`, auth pattern (Bearer JWT verification)
- `supabase/migrations/20260330_hierarchical_plans.sql` — table schema: columns, RLS policies
- `src/domain/planSchema.js` — `validatePlanSchema()` reusable validator
- `tests/unit/useWorkoutEntries.test.jsx` — hook test pattern with `createFluentTable` mock helper
- `tests/unit/claudeCoach.schema.test.js` — `VALID_PLAN` fixture reusable as mock plan data
- `tests/unit/mockAppData.js` — `makeAppData()` factory pattern for context mocks

### Secondary (MEDIUM confidence)
- Supabase JS v2 `.rpc()` method: standard `{ data, error }` return shape consistent with all other Supabase queries observed throughout the codebase
- Postgres `jsonb_set()` for JSONB surgery: well-documented Postgres built-in, no version concerns

### Tertiary (LOW confidence)
- None — all critical claims are directly supported by existing project source code

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already in use, versions confirmed from package.json
- Architecture: HIGH — patterns are directly derived from existing hook implementations in the project
- Pitfalls: HIGH — derived from CLAUDE.md documented gotchas and code inspection of existing hooks
- RPC design: MEDIUM — the approach is correct but exact JSONB path surgery implementation has complexity that should be validated during implementation

**Research date:** 2026-03-30
**Valid until:** 2026-04-30 (stable — no fast-moving dependencies)
