# Plan Intake Modal Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the plan generation bug (missing DB columns), rewrite the PlanIntakeModal as a 3-step wizard with race lookup, Ultra support, a 7-day schedule grid, and an inline Q&A step where Claude asks assessment questions before generating the plan.

**Architecture:** DB migration drops the old coach_conversations schema and creates the new flat message-per-row schema. The edge function gains a `race_info` mode. `useHierarchicalPlan` replaces `generatePlan` with `startPlanSession` + `sendPlanMessage` + `lookupRace`. `PlanIntakeModal` is fully rewritten as a 3-step wizard (Step 1: Race Goal, Step 2: Fitness & Schedule, Step 3: Q&A with Claude).

**Tech Stack:** Supabase Edge Functions (Deno/TypeScript), Supabase MCP, React 18 + hooks, Vitest + React Testing Library, shadcn/ui Dialog/Button/Input/Label/Textarea/Select

---

### Task 1: Fix the coach_conversations migration

**Files:**
- Modify: `supabase/migrations/20260405180000_coach_conversations.sql`

- [ ] **Step 1: Replace the migration file with DROP + CREATE**

Replace the entire contents of `supabase/migrations/20260405180000_coach_conversations.sql`:

```sql
-- Drop old schema (coach_messages has FK to coach_conversations, drop first)
drop table if exists coach_messages;
drop table if exists coach_conversations;

-- New flat schema: one row per message turn, grouped by session_id
create table coach_conversations (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  session_id  uuid not null,
  role        text not null check (role in ('user', 'assistant')),
  content     jsonb not null,
  created_at  timestamptz default now()
);

create index coach_conversations_user_session_idx
  on coach_conversations(user_id, session_id, created_at);

alter table coach_conversations enable row level security;

create policy "users_own_conversations"
  on coach_conversations for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

- [ ] **Step 2: Apply the migration via Supabase MCP**

Use the `mcp__supabase__apply_migration` tool with:
- `name`: `20260405180000_coach_conversations`
- `query`: the full SQL above

- [ ] **Step 3: Verify the table schema**

Use `mcp__supabase__execute_sql`:
```sql
select column_name, data_type
from information_schema.columns
where table_name = 'coach_conversations'
order by ordinal_position;
```

Expected output includes columns: `id`, `user_id`, `session_id`, `role`, `content`, `created_at`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260405180000_coach_conversations.sql
git commit -m "fix(db): drop old coach_conversations schema and recreate with role+content columns"
```

---

### Task 2: Add race_info mode to claude-coach edge function

**Files:**
- Modify: `supabase/functions/claude-coach/index.ts`

- [ ] **Step 1: Add the race_info handler**

In `supabase/functions/claude-coach/index.ts`, find the `insights_synthesis` mode block (around line 377):

```typescript
    if (payload.mode === "insights_synthesis") {
```

Add the `race_info` handler immediately **before** this block (after line 375, `const payload = await req.json();`):

```typescript
    // ── Race info lookup mode ──
    if (payload.mode === "race_info") {
      const raceName = payload.raceName;
      if (!raceName) return jsonResponse({ raceInfo: null });

      const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
      if (!anthropicKey) return jsonResponse({ error: "ANTHROPIC_API_KEY not configured" }, 500);

      const raceResponse = await fetchWithRetry(ANTHROPIC_URL, {
        method: "POST",
        headers: {
          "x-api-key": anthropicKey,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: ANTHROPIC_MODEL,
          max_tokens: 400,
          system: `You are a running race database. Return ONLY a valid JSON object — no markdown, no code fences, no explanation.
If you know the race, return exactly:
{"displayName":"<official full name>","distanceKm":<number>,"elevationGainM":<number or null>,"terrain":"<brief description>","location":"<City, Country>","keyFacts":"<1-2 sentences on key training implications, e.g. vert, altitude, terrain type>"}
If you do not know the race, return exactly: {"unknown":true}`,
          messages: [{ role: "user", content: `Race: ${raceName}` }],
        }),
      });

      if (!raceResponse.ok) return jsonResponse({ raceInfo: null });

      const raceData = await raceResponse.json();
      const text = (raceData.content?.[0]?.text ?? "").trim();
      try {
        const parsed = JSON.parse(text);
        if (parsed.unknown) return jsonResponse({ raceInfo: null });
        return jsonResponse({ raceInfo: parsed });
      } catch {
        return jsonResponse({ raceInfo: null });
      }
    }
```

- [ ] **Step 2: Deploy the edge function**

Use `mcp__supabase__deploy_edge_function` with function name `claude-coach`.

- [ ] **Step 3: Smoke-test the new mode**

Use `mcp__supabase__execute_sql` or verify manually: if you have access to the deployed URL, POST `{ "mode": "race_info", "raceName": "UTMB" }` with a valid JWT. Expected: `{ "raceInfo": { "displayName": "...", "distanceKm": 171, ... } }`.

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/claude-coach/index.ts
git commit -m "feat(edge-fn): add race_info mode to claude-coach for race preview cards"
```

---

### Task 3: Replace generatePlan with startPlanSession + sendPlanMessage + lookupRace

**Files:**
- Modify: `src/hooks/useHierarchicalPlan.js`
- Modify: `tests/unit/useHierarchicalPlan.test.jsx`

- [ ] **Step 1: Write the failing tests for the new hook API**

Replace the three `generatePlan` test blocks in `tests/unit/useHierarchicalPlan.test.jsx` (the `describe("useHierarchicalPlan")` section, all tests under `// ── generatePlan ──`) with these new tests. Keep all other tests unchanged.

```javascript
  // ── startPlanSession ────────────────────────────────────────────────────────

  it("startPlanSession deactivates old active plans before calling Edge Function", async () => {
    const callOrder = [];
    let updateCalledWithReplaced = false;

    const fluentTable = {
      select() { return this; },
      update(payload) {
        if (payload?.status === "replaced") {
          updateCalledWithReplaced = true;
          callOrder.push("update-replaced");
        }
        return this;
      },
      eq() { return this; },
      order() { return this; },
      limit() { return this; },
      maybeSingle: () => Promise.resolve({ data: MOCK_PLAN_ROW, error: null }),
      single: () => Promise.resolve({ data: MOCK_PLAN_ROW, error: null }),
      then: (resolve) => Promise.resolve({ data: MOCK_PLAN_ROW, error: null }).then(resolve),
    };

    const invokeSpy = vi.fn().mockImplementation(async () => {
      callOrder.push("invoke");
      return { data: { type: "conversation", content: "What is your goal?" }, error: null };
    });

    const client = {
      from: () => fluentTable,
      rpc: vi.fn(),
      functions: { invoke: invokeSpy },
      auth: { getSession: vi.fn().mockResolvedValue({ data: { session: { access_token: "tok" } }, error: null }) },
    };
    getSupabaseClient.mockReturnValue(client);

    const { result } = renderHook(() => useHierarchicalPlan("user-1"));

    await act(async () => {
      await result.current.startPlanSession({ raceGoal: { eventName: "UTMB", eventDate: "2026-08-29", eventType: "ultra", ultraDistanceKm: 171, goalType: "finish" }, fitness: { weeklyKm: 80, longestRecentRun: 32 }, constraints: { hardDays: ["Tuesday"], restDays: ["Monday"], longRunDay: "Saturday", maxSessions: 6 }, background: "5 years running." });
    });

    expect(updateCalledWithReplaced).toBe(true);
    expect(callOrder.indexOf("update-replaced")).toBeLessThan(callOrder.indexOf("invoke"));
  });

  it("startPlanSession returns { done:false, sessionId, question } when Claude responds with conversation", async () => {
    const invokeSpy = vi.fn().mockResolvedValue({
      data: { type: "conversation", content: "What is your longest recent run?" },
      error: null,
    });

    const { client } = createMockClient({
      invoke: invokeSpy,
      selectHandlers: {
        select: () => ({ data: null, error: null }),
        update: () => ({ data: null, error: null }),
      },
    });
    getSupabaseClient.mockReturnValue(client);

    const { result } = renderHook(() => useHierarchicalPlan("user-1"));

    let returnValue;
    await act(async () => {
      returnValue = await result.current.startPlanSession({ raceGoal: { eventName: "Test", eventDate: "2026-09-01", eventType: "marathon", goalType: "finish" }, fitness: { weeklyKm: 50 }, constraints: { hardDays: [], restDays: [], longRunDay: null, maxSessions: 5 }, background: "" });
    });

    expect(returnValue.done).toBe(false);
    expect(typeof returnValue.sessionId).toBe("string");
    expect(returnValue.question).toBe("What is your longest recent run?");
    expect(result.current.generating).toBe(false);
  });

  it("startPlanSession returns { done:true } and saves plan when Claude immediately returns full-plan", async () => {
    const invokeSpy = vi.fn().mockResolvedValue({
      data: { type: "full-plan", planUpdated: true },
      error: null,
    });

    const { client } = createMockClient({
      invoke: invokeSpy,
      selectHandlers: {
        select: () => ({ data: MOCK_PLAN_ROW, error: null }),
        update: () => ({ data: null, error: null }),
      },
    });
    getSupabaseClient.mockReturnValue(client);

    const { result } = renderHook(() => useHierarchicalPlan("user-1"));

    let returnValue;
    await act(async () => {
      returnValue = await result.current.startPlanSession({ raceGoal: { eventName: "Test", eventDate: "2026-09-01", eventType: "marathon", goalType: "finish" }, fitness: { weeklyKm: 50 }, constraints: { hardDays: [], restDays: [], longRunDay: null, maxSessions: 5 }, background: "" });
    });

    expect(returnValue.done).toBe(true);
    expect(result.current.plan).toEqual(MOCK_PLAN_ROW);
    expect(result.current.generating).toBe(false);
  });

  it("startPlanSession sets error and throws on invoke failure", async () => {
    const invokeSpy = vi.fn().mockResolvedValue({
      data: null,
      error: { message: "Edge Function error" },
    });

    const { client } = createMockClient({
      invoke: invokeSpy,
      selectHandlers: {
        select: () => ({ data: null, error: null }),
        update: () => ({ data: null, error: null }),
      },
    });
    getSupabaseClient.mockReturnValue(client);

    const { result } = renderHook(() => useHierarchicalPlan("user-1"));

    await act(async () => {
      try {
        await result.current.startPlanSession({ raceGoal: {}, fitness: {}, constraints: {}, background: "" });
      } catch (_) {}
    });

    expect(result.current.error).not.toBeNull();
  });

  it("startPlanSession invokes claude-coach with sessionId, newMessage containing race name, and athleteContext", async () => {
    const invokeSpy = vi.fn().mockResolvedValue({
      data: { type: "conversation", content: "Any injuries?" },
      error: null,
    });

    const { client } = createMockClient({
      invoke: invokeSpy,
      selectHandlers: {
        select: () => ({ data: null, error: null }),
        update: () => ({ data: null, error: null }),
      },
    });
    getSupabaseClient.mockReturnValue(client);

    const payload = { raceGoal: { eventName: "Berlin Marathon", eventDate: "2026-09-27", eventType: "marathon", goalType: "finish" }, fitness: { weeklyKm: 52, longestRecentRun: 24 }, constraints: { hardDays: ["Tuesday"], restDays: ["Friday"], longRunDay: "Sunday", maxSessions: 5 }, background: "4 years running." };

    const { result } = renderHook(() => useHierarchicalPlan("user-1"));

    await act(async () => {
      await result.current.startPlanSession(payload);
    });

    expect(invokeSpy).toHaveBeenCalledWith(
      "claude-coach",
      expect.objectContaining({
        body: expect.objectContaining({
          sessionId: expect.any(String),
          newMessage: expect.stringContaining("Berlin Marathon"),
          athleteContext: expect.objectContaining({ planIntake: payload }),
        }),
      }),
    );
  });

  // ── sendPlanMessage ─────────────────────────────────────────────────────────

  it("sendPlanMessage returns { done:false, question } on conversation response", async () => {
    const invokeSpy = vi.fn().mockResolvedValue({
      data: { type: "conversation", content: "Tell me more about your injury." },
      error: null,
    });

    const { client } = createMockClient({ invoke: invokeSpy });
    getSupabaseClient.mockReturnValue(client);

    const { result } = renderHook(() => useHierarchicalPlan("user-1"));

    let returnValue;
    await act(async () => {
      returnValue = await result.current.sendPlanMessage("session-abc", "My knee is fine now.");
    });

    expect(returnValue.done).toBe(false);
    expect(returnValue.question).toBe("Tell me more about your injury.");
  });

  it("sendPlanMessage returns { done:true } and saves plan on full-plan response", async () => {
    const invokeSpy = vi.fn().mockResolvedValue({
      data: { type: "full-plan", planUpdated: true },
      error: null,
    });

    const { client } = createMockClient({
      invoke: invokeSpy,
      selectHandlers: {
        select: () => ({ data: MOCK_PLAN_ROW, error: null }),
        update: () => ({ data: null, error: null }),
      },
    });
    getSupabaseClient.mockReturnValue(client);

    const { result } = renderHook(() => useHierarchicalPlan("user-1"));

    let returnValue;
    await act(async () => {
      returnValue = await result.current.sendPlanMessage("session-abc", "No injuries, good to go.");
    });

    expect(returnValue.done).toBe(true);
    expect(result.current.plan).toEqual(MOCK_PLAN_ROW);
  });

  it("sendPlanMessage sends to the correct sessionId", async () => {
    const invokeSpy = vi.fn().mockResolvedValue({
      data: { type: "conversation", content: "Got it." },
      error: null,
    });

    const { client } = createMockClient({ invoke: invokeSpy });
    getSupabaseClient.mockReturnValue(client);

    const { result } = renderHook(() => useHierarchicalPlan("user-1"));

    await act(async () => {
      await result.current.sendPlanMessage("my-session-id", "Hello.");
    });

    expect(invokeSpy).toHaveBeenCalledWith(
      "claude-coach",
      expect.objectContaining({
        body: expect.objectContaining({
          sessionId: "my-session-id",
          newMessage: "Hello.",
        }),
      }),
    );
  });
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- --run --reporter=verbose 2>&1 | grep -E "(PASS|FAIL|startPlanSession|sendPlanMessage)"
```

Expected: tests for `startPlanSession` and `sendPlanMessage` fail with "not a function".

- [ ] **Step 3: Rewrite useHierarchicalPlan.js**

Replace the full contents of `src/hooks/useHierarchicalPlan.js`:

```javascript
import { useCallback, useEffect, useMemo, useReducer } from "react";
import { getSupabaseClient } from "../lib/supabaseClient";

const initialState = {
  plan: null,
  loading: false,
  generating: false,
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
      return { ...state, plan: action.payload };
    case "error":
      return { ...state, loading: false, generating: false, error: action.payload };
    default:
      return state;
  }
}

// Build the first message sent to claude-coach when starting a plan session.
function buildPlanStartMessage(payload) {
  const { raceGoal, fitness, raceInfo } = payload;
  const distanceLabel = raceGoal.ultraDistanceKm
    ? `${raceGoal.ultraDistanceKm}km ultra`
    : raceGoal.eventType;
  const parts = [
    `The athlete wants to generate a training plan.`,
    `Race: ${raceGoal.eventName || raceGoal.eventType}, ${distanceLabel}, on ${raceGoal.eventDate}.`,
    `Goal: ${raceGoal.goalType || "finish"}.`,
    `Current weekly volume: ${fitness.weeklyKm}km.`,
    fitness.longestRecentRun != null ? `Longest recent run: ${fitness.longestRecentRun}km.` : null,
    raceInfo?.keyFacts ? `Race characteristics: ${raceInfo.keyFacts}.` : null,
    `Please ask 1-2 targeted assessment questions to validate your key assumptions (per assessment methodology), then generate the full plan once satisfied.`,
  ].filter(Boolean);
  return parts.join(" ");
}

// Helper: fetch the most recent active plan row after generation
async function fetchActivePlan(client, userId) {
  const { data, error } = await client
    .from("hierarchical_plans")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Plan generation completed, but no active plan was found.");
  return data;
}

export function useHierarchicalPlan(userId) {
  const client = useMemo(() => getSupabaseClient(), []);
  const [state, dispatch] = useReducer(reducer, initialState);

  // ── loadPlan ────────────────────────────────────────────────────────────────
  const loadPlan = useCallback(async () => {
    if (!client) return null;
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
      throw error;
    }
    dispatch({ type: "loaded", payload: data ?? null });
    return data ?? null;
  }, [client, userId]);

  // ── lookupRace ──────────────────────────────────────────────────────────────
  const lookupRace = useCallback(async (raceName) => {
    if (!client) throw new Error("Supabase is not configured");
    const { data: sessionData } = await client.auth.getSession();
    const session = sessionData?.session;
    if (!session) throw new Error("No active session.");

    const { data, error } = await client.functions.invoke("claude-coach", {
      body: { mode: "race_info", raceName },
      headers: { Authorization: "Bearer " + session.access_token },
    });
    if (error) throw error;
    return data?.raceInfo ?? null;
  }, [client]);

  // ── startPlanSession ────────────────────────────────────────────────────────
  // Sends the intake as the first message. Returns:
  //   { done: false, sessionId, question }  — Claude asked a question
  //   { done: true, plan }                  — Claude immediately generated the plan
  const startPlanSession = useCallback(async (payload) => {
    if (!client) throw new Error("Supabase is not configured");

    try {
      const { data: sessionData, error: sessionError } = await client.auth.getSession();
      if (sessionError) throw sessionError;
      const session = sessionData?.session;
      if (!session) throw new Error("No active session. Please sign in first.");

      // Deactivate old active plans
      await client
        .from("hierarchical_plans")
        .update({ status: "replaced" })
        .eq("user_id", userId)
        .eq("status", "active");

      const sessionId = crypto.randomUUID();

      const { data: invokeData, error: invokeError } = await client.functions.invoke("claude-coach", {
        body: {
          sessionId,
          newMessage: buildPlanStartMessage(payload),
          athleteContext: { planIntake: payload, activePlan: null },
        },
        headers: { Authorization: "Bearer " + session.access_token },
      });

      if (invokeError) throw invokeError;
      if (invokeData?.routeError) throw new Error(invokeData.routeError);

      // Claude immediately generated the plan
      if (invokeData?.type === "full-plan" || invokeData?.planUpdated) {
        dispatch({ type: "generating" });
        const savedRow = await fetchActivePlan(client, userId);
        dispatch({ type: "generated", payload: savedRow });
        return { done: true, plan: savedRow };
      }

      // Claude asked a question
      return { done: false, sessionId, question: invokeData?.content ?? "" };
    } catch (err) {
      dispatch({ type: "error", payload: err });
      throw err;
    }
  }, [client, userId]);

  // ── sendPlanMessage ─────────────────────────────────────────────────────────
  // Sends a follow-up message in an existing plan session. Returns:
  //   { done: false, question }  — Claude asked another question
  //   { done: true, plan }       — Claude generated the plan
  const sendPlanMessage = useCallback(async (sessionId, message) => {
    if (!client) throw new Error("Supabase is not configured");

    try {
      const { data: sessionData, error: sessionError } = await client.auth.getSession();
      if (sessionError) throw sessionError;
      const session = sessionData?.session;
      if (!session) throw new Error("No active session. Please sign in first.");

      const { data: invokeData, error: invokeError } = await client.functions.invoke("claude-coach", {
        body: {
          sessionId,
          newMessage: message,
          athleteContext: null,
        },
        headers: { Authorization: "Bearer " + session.access_token },
      });

      if (invokeError) throw invokeError;
      if (invokeData?.routeError) throw new Error(invokeData.routeError);

      // Claude generated the plan
      if (invokeData?.type === "full-plan" || invokeData?.planUpdated) {
        dispatch({ type: "generating" });
        const savedRow = await fetchActivePlan(client, userId);
        dispatch({ type: "generated", payload: savedRow });
        return { done: true, plan: savedRow };
      }

      // Claude has another question
      return { done: false, question: invokeData?.content ?? "" };
    } catch (err) {
      dispatch({ type: "error", payload: err });
      throw err;
    }
  }, [client, userId]);

  // ── applyPatch ──────────────────────────────────────────────────────────────
  const applyPatch = useCallback(async (patchArray) => {
    if (!client || !state.plan) throw new Error("No active plan");

    const { data, error } = await client.rpc("apply_plan_patch", {
      p_plan_id: state.plan.id,
      p_patches: JSON.stringify(patchArray),
    });

    if (error) {
      dispatch({ type: "error", payload: error });
      throw error;
    }
    dispatch({ type: "patched", payload: { ...state.plan, plan_data: data } });
    return data;
  }, [client, state.plan]);

  // ── toggleWorkoutCompleted ──────────────────────────────────────────────────
  const toggleWorkoutCompleted = useCallback(async (workoutId, weekNumber, dayDate) => {
    if (!client || !state.plan) throw new Error("No active plan");

    const { data, error } = await client.rpc("toggle_workout_completed", {
      p_plan_id: state.plan.id,
      p_workout_id: workoutId,
      p_week_number: weekNumber,
      p_day_date: dayDate,
    });

    if (error) {
      dispatch({ type: "error", payload: error });
      throw error;
    }
    dispatch({ type: "patched", payload: { ...state.plan, plan_data: data } });
    return data;
  }, [client, state.plan]);

  // ── moveWorkout ─────────────────────────────────────────────────────────────
  const moveWorkout = useCallback(async (workoutId, fromDate, toDate) => {
    if (!client || !state.plan) throw new Error("No active plan");

    if (fromDate === toDate) return state.plan;

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
    dispatch({ type: "patched", payload: { ...state.plan, plan_data: data } });
    return data;
  }, [client, state.plan]);

  // ── getWeek ─────────────────────────────────────────────────────────────────
  const getWeek = useCallback((weekNumber) => {
    if (!state.plan || !state.plan.plan_data?.weeks) return null;
    return state.plan.plan_data.weeks.find((w) => w.weekNumber === weekNumber) ?? null;
  }, [state.plan]);

  // ── getPhases ───────────────────────────────────────────────────────────────
  const getPhases = useCallback(() => {
    if (!state.plan || !state.plan.plan_data?.phases) return [];
    return state.plan.plan_data.phases;
  }, [state.plan]);

  // ── Eager load ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (userId) loadPlan();
  }, [userId, loadPlan]);

  return {
    plan: state.plan,
    loading: state.loading,
    generating: state.generating,
    error: state.error,
    loadPlan,
    lookupRace,
    startPlanSession,
    sendPlanMessage,
    applyPatch,
    toggleWorkoutCompleted,
    moveWorkout,
    getWeek,
    getPhases,
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- --run --reporter=verbose 2>&1 | grep -E "(PASS|FAIL|✓|✗)"
```

Expected: all tests in `useHierarchicalPlan.test.jsx` pass. The old `generatePlan` tests are gone and replaced by `startPlanSession` / `sendPlanMessage` tests.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useHierarchicalPlan.js tests/unit/useHierarchicalPlan.test.jsx
git commit -m "feat(hook): replace generatePlan with startPlanSession + sendPlanMessage + lookupRace"
```

---

### Task 4: Rewrite PlanIntakeModal — Steps 1 & 2

**Files:**
- Modify: `src/components/PlanIntakeModal.jsx`

This is a full rewrite. The current file (609 lines) is replaced entirely.

- [ ] **Step 1: Write the full rewrite of PlanIntakeModal.jsx**

Replace the entire contents of `src/components/PlanIntakeModal.jsx`:

```jsx
import React, { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { useAppData } from "../context/AppDataContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

// ── Constants ────────────────────────────────────────────────────────────────

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const DAY_ABBR = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const SCHEDULE_TYPES = ["off", "easy", "hard", "long"];
const SCHEDULE_COLORS = {
  off:  "bg-slate-100 border-slate-300 text-slate-400",
  easy: "bg-green-100 border-green-300 text-green-700",
  hard: "bg-blue-100 border-blue-300 text-blue-700",
  long: "bg-amber-100 border-amber-300 text-amber-700",
};
const SCHEDULE_LABELS = { off: "Off", easy: "Easy", hard: "Hard", long: "Long" };

const ROTATING_MESSAGES = [
  "Analyzing your fitness...",
  "Structuring your phases...",
  "Building your weekly plan...",
];

const SKIP_MESSAGE = "No further context needed — please generate the full training plan now.";

// ── Helpers ──────────────────────────────────────────────────────────────────

function mapDistanceToEventType(distance) {
  switch (distance) {
    case "5K":
    case "10K":
      return "road";
    case "Half Marathon":
      return "half_marathon";
    case "Marathon":
      return "marathon";
    case "Ultra":
      return "ultra";
    default:
      return "road";
  }
}

function getDayOfWeekFromDate(dateStr) {
  const date = new Date(`${dateStr}T00:00:00Z`);
  const dayIndex = date.getUTCDay();
  const idx = dayIndex === 0 ? 6 : dayIndex - 1;
  return DAYS[idx];
}

function computeWeeklyKmFromActivities(activities) {
  if (!activities || activities.length === 0) return null;
  const now = new Date();
  const fourWeeksAgo = new Date(now.getTime() - 4 * 7 * 24 * 60 * 60 * 1000);
  const recentRuns = activities.filter((a) => {
    if (a.type !== "Run") return false;
    return new Date(a.started_at) >= fourWeeksAgo;
  });
  if (recentRuns.length === 0) return null;
  const total = recentRuns.reduce((s, a) => s + (a.distance || 0) / 1000, 0);
  return Math.round(total / 4);
}

function buildInitialSchedule(workoutEntries) {
  if (!workoutEntries || workoutEntries.length === 0) {
    return Array(7).fill("easy").map((_, i) => (i === 0 ? "off" : "easy"));
  }
  const hardSet = new Set();
  const offSet = new Set();
  workoutEntries.forEach((entry) => {
    const day = getDayOfWeekFromDate(entry.workout_date);
    if (entry.workout_type === "Rest") offSet.add(day);
    else if (!["Easy", "Recovery"].includes(entry.workout_type)) hardSet.add(day);
  });
  return DAYS.map((day) => {
    if (offSet.has(day)) return "off";
    if (hardSet.has(day)) return "hard";
    return "easy";
  });
}

// ── WeeklyScheduleGrid ───────────────────────────────────────────────────────

function WeeklyScheduleGrid({ schedule, onChange }) {
  function cycleDay(i) {
    const next = SCHEDULE_TYPES[(SCHEDULE_TYPES.indexOf(schedule[i]) + 1) % SCHEDULE_TYPES.length];
    const updated = [...schedule];
    if (next === "long") {
      // Clear previous long day
      updated.forEach((t, j) => { if (t === "long") updated[j] = "easy"; });
    }
    updated[i] = next;
    onChange(updated);
  }

  const hardDays = DAYS.filter((_, i) => schedule[i] === "hard");
  const longDay = DAYS.find((_, i) => schedule[i] === "long");
  const restDays = DAYS.filter((_, i) => schedule[i] === "off");
  const trainingCount = schedule.filter((t) => t !== "off").length;

  return (
    <div>
      <div className="grid grid-cols-7 gap-1.5 mb-2">
        {DAYS.map((day, i) => (
          <button
            key={day}
            type="button"
            onClick={() => cycleDay(i)}
            className={`rounded-lg border py-1.5 text-center transition-colors select-none ${SCHEDULE_COLORS[schedule[i]]}`}
          >
            <span className="block text-[10px] font-semibold text-slate-500">{DAY_ABBR[i]}</span>
            <span className="block text-[11px] font-bold mt-0.5">{SCHEDULE_LABELS[schedule[i]]}</span>
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-3 text-[11px] bg-slate-50 rounded-lg px-3 py-2 border border-slate-200">
        <span>🗓 <strong>{trainingCount}</strong> training days</span>
        {hardDays.length > 0 && <span>⚡ Hard: <strong>{hardDays.map(d => d.slice(0,3)).join(", ")}</strong></span>}
        {longDay && <span>🏃 Long: <strong>{longDay.slice(0,3)}</strong></span>}
        {restDays.length > 0 && <span>😴 Rest: <strong>{restDays.map(d => d.slice(0,3)).join(", ")}</strong></span>}
      </div>
      <p className="text-[10px] text-slate-400 mt-1">Click a day to cycle: Off → Easy → Hard → Long. One Long day max.</p>
    </div>
  );
}

// ── RaceInfoCard ─────────────────────────────────────────────────────────────

function RaceInfoCard({ raceInfo, loading, error }) {
  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-700">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Looking up race info...
      </div>
    );
  }
  if (error) {
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[12px] text-slate-500">
        Race not found in AI knowledge base — your plan will still be tailored to the race name.
      </div>
    );
  }
  if (!raceInfo) return null;
  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2.5">
      <p className="text-[11px] font-bold text-blue-800 mb-1">🏔 Race insights</p>
      <p className="text-[12px] text-blue-900 font-semibold">{raceInfo.displayName}</p>
      {raceInfo.distanceKm && (
        <p className="text-[12px] text-blue-700 mt-0.5">
          {raceInfo.distanceKm}km
          {raceInfo.elevationGainM ? ` · ${raceInfo.elevationGainM.toLocaleString()}m D+` : ""}
          {raceInfo.location ? ` · ${raceInfo.location}` : ""}
        </p>
      )}
      {raceInfo.keyFacts && (
        <p className="text-[12px] text-blue-800 mt-1.5 leading-relaxed">{raceInfo.keyFacts}</p>
      )}
      <p className="text-[10px] text-blue-500 mt-1.5">Used by Claude to tailor terrain, vert, and race-specific training.</p>
    </div>
  );
}

// ── Step indicators ──────────────────────────────────────────────────────────

function StepIndicator({ step, total }) {
  return (
    <div className="flex items-center gap-1.5 mb-1">
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className={`h-1.5 rounded-full transition-all ${
            i + 1 === step ? "w-6 bg-primary" : i + 1 < step ? "w-3 bg-primary/40" : "w-3 bg-slate-200"
          }`}
        />
      ))}
      <span className="text-[11px] text-slate-400 ml-1">{step} of {total}</span>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function PlanIntakeModal({ open, onOpenChange }) {
  const { hierarchicalPlan, runnerProfile, activities, workoutEntries } = useAppData();

  // Step state
  const [step, setStep] = useState(1);

  // Step 1 state
  const [raceName, setRaceName] = useState("");
  const [raceDate, setRaceDate] = useState("");
  const [goalDistance, setGoalDistance] = useState("");
  const [ultraKm, setUltraKm] = useState("");
  const [goalType, setGoalType] = useState("finish");
  const [raceInfo, setRaceInfo] = useState(null);
  const [raceInfoLoading, setRaceInfoLoading] = useState(false);
  const [raceInfoError, setRaceInfoError] = useState(false);

  // Step 2 state
  const [weeklyKm, setWeeklyKm] = useState("");
  const [weeklyKmPrefilled, setWeeklyKmPrefilled] = useState(false);
  const [longestRun, setLongestRun] = useState("");
  const [schedule, setSchedule] = useState(Array(7).fill("easy").map((_, i) => i === 0 ? "off" : "easy"));
  const [background, setBackground] = useState("");
  const [backgroundPrefilled, setBackgroundPrefilled] = useState(false);
  const [injuriesText, setInjuriesText] = useState("");

  // Step 3 state
  const [qaSessionId, setQaSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [qaInput, setQaInput] = useState("");
  const [qaSending, setQaSending] = useState(false);

  // Shared state
  const [errors, setErrors] = useState({});
  const [showConfirmReplace, setShowConfirmReplace] = useState(false);
  const [rotatingMessageIndex, setRotatingMessageIndex] = useState(0);

  // Pre-fill on open
  useEffect(() => {
    if (!open) return;
    setStep(1);
    setShowConfirmReplace(false);
    setErrors({});
    setMessages([]);
    setQaSessionId(null);
    setQaInput("");

    if (runnerProfile?.background && !background) {
      setBackground(runnerProfile.background);
      setBackgroundPrefilled(true);
    }
    if (!weeklyKm && activities?.activities) {
      const km = computeWeeklyKmFromActivities(activities.activities);
      if (km !== null) { setWeeklyKm(km.toString()); setWeeklyKmPrefilled(true); }
    }
    if (workoutEntries?.entries) {
      setSchedule(buildInitialSchedule(workoutEntries.entries));
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Rotating message during generating
  useEffect(() => {
    if (!hierarchicalPlan?.generating) return;
    const id = setInterval(() => setRotatingMessageIndex((p) => (p + 1) % ROTATING_MESSAGES.length), 4000);
    return () => clearInterval(id);
  }, [hierarchicalPlan?.generating]);

  // ── Derived schedule values ──────────────────────────────────────────────────
  const hardDays = DAYS.filter((_, i) => schedule[i] === "hard");
  const restDays = DAYS.filter((_, i) => schedule[i] === "off");
  const longRunDay = DAYS.find((_, i) => schedule[i] === "long") ?? null;
  const maxSessions = schedule.filter((t) => t !== "off").length;

  // ── Race lookup ──────────────────────────────────────────────────────────────
  const handleLookupRace = useCallback(async () => {
    if (!raceName.trim()) return;
    setRaceInfoLoading(true);
    setRaceInfoError(false);
    setRaceInfo(null);
    try {
      const info = await hierarchicalPlan.lookupRace(raceName.trim());
      if (info) { setRaceInfo(info); } else { setRaceInfoError(true); }
    } catch {
      setRaceInfoError(true);
    } finally {
      setRaceInfoLoading(false);
    }
  }, [raceName, hierarchicalPlan]);

  // ── Step 1 validation ────────────────────────────────────────────────────────
  const validateStep1 = useCallback(() => {
    const errs = {};
    if (!raceDate) errs.raceDate = "Race date is required.";
    if (!goalDistance) errs.goalDistance = "Please select a goal distance.";
    if (goalDistance === "Ultra" && !ultraKm) errs.ultraKm = "Enter the race distance in km.";
    return errs;
  }, [raceDate, goalDistance, ultraKm]);

  // ── Step 2 validation ────────────────────────────────────────────────────────
  const validateStep2 = useCallback(() => {
    const errs = {};
    if (!weeklyKm) errs.weeklyKm = "Enter your approximate weekly km.";
    return errs;
  }, [weeklyKm]);

  // ── Build payload ────────────────────────────────────────────────────────────
  function buildPayload() {
    return {
      raceGoal: {
        eventName: raceName || goalDistance,
        eventDate: raceDate,
        eventType: mapDistanceToEventType(goalDistance),
        ultraDistanceKm: goalDistance === "Ultra" ? Number(ultraKm) : null,
        goalType,
      },
      fitness: {
        weeklyKm: Number(weeklyKm),
        longestRecentRun: longestRun ? Number(longestRun) : null,
      },
      constraints: { hardDays, restDays, longRunDay, maxSessions },
      background,
      injuries: injuriesText || null,
      raceInfo: raceInfo ?? null,
    };
  }

  // ── Step navigation ──────────────────────────────────────────────────────────
  const handleStep1Next = useCallback(() => {
    const errs = validateStep1();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setErrors({});
    setStep(2);
  }, [validateStep1]);

  const handleStep2Next = useCallback(async () => {
    const errs = validateStep2();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setErrors({});

    if (hierarchicalPlan?.plan && !showConfirmReplace) {
      setShowConfirmReplace(true);
      return;
    }
    setShowConfirmReplace(false);

    // Start plan session — Claude may ask a question or immediately generate
    setQaSending(true);
    try {
      const result = await hierarchicalPlan.startPlanSession(buildPayload());
      if (result.done) {
        onOpenChange(false);
      } else {
        setQaSessionId(result.sessionId);
        setMessages([{ role: "assistant", content: result.question }]);
        setStep(3);
      }
    } catch (err) {
      setErrors({ submit: err.message });
    } finally {
      setQaSending(false);
    }
  }, [validateStep2, hierarchicalPlan, showConfirmReplace, buildPayload, onOpenChange]);

  // ── Step 3: send message ─────────────────────────────────────────────────────
  const handleSendMessage = useCallback(async (messageText) => {
    if (!messageText.trim() || !qaSessionId) return;
    const text = messageText.trim();
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setQaInput("");
    setQaSending(true);
    try {
      const result = await hierarchicalPlan.sendPlanMessage(qaSessionId, text);
      if (result.done) {
        onOpenChange(false);
      } else {
        setMessages((prev) => [...prev, { role: "assistant", content: result.question }]);
      }
    } catch (err) {
      setMessages((prev) => [...prev, { role: "assistant", content: `Sorry, something went wrong: ${err.message}` }]);
    } finally {
      setQaSending(false);
    }
  }, [qaSessionId, hierarchicalPlan, onOpenChange]);

  const isGenerating = hierarchicalPlan?.generating || false;

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-lg max-h-[90vh] overflow-y-auto"
        onInteractOutside={(e) => { if (isGenerating || qaSending) e.preventDefault(); }}
        onEscapeKeyDown={(e) => { if (isGenerating || qaSending) e.preventDefault(); }}
      >
        {/* ── Generating spinner ── */}
        {isGenerating ? (
          <>
            <DialogHeader>
              <DialogTitle>Building Your Plan...</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="mt-6 text-sm text-muted-foreground" aria-live="polite">
                {ROTATING_MESSAGES[rotatingMessageIndex]}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">This usually takes 30–60 seconds.</p>
            </div>
          </>
        ) : showConfirmReplace ? (
          /* ── Replace confirmation ── */
          <>
            <DialogHeader>
              <DialogTitle>Replace Your Current Plan?</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p className="text-sm text-muted-foreground mb-6">
                You already have an active plan. Generating a new one will permanently replace it.
              </p>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setShowConfirmReplace(false)}>Go Back</Button>
                <Button variant="destructive" className="flex-1" onClick={handleStep2Next}>Replace and Generate</Button>
              </div>
            </div>
          </>
        ) : step === 1 ? (
          /* ── Step 1: Race Goal ── */
          <>
            <DialogHeader>
              <StepIndicator step={1} total={3} />
              <DialogTitle>Race Goal</DialogTitle>
              <DialogDescription>Tell Claude about your target race.</DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Race name + lookup */}
              <div>
                <Label htmlFor="race-name" className="text-sm font-semibold">Target Race</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    id="race-name"
                    placeholder="e.g. UTMB, Comrades, Berlin Marathon"
                    value={raceName}
                    onChange={(e) => setRaceName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleLookupRace(); }}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleLookupRace}
                    disabled={!raceName.trim() || raceInfoLoading}
                    className="whitespace-nowrap"
                  >
                    {raceInfoLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Look up →"}
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">Enter race name to get AI-powered race insights.</p>
              </div>

              <RaceInfoCard raceInfo={raceInfo} loading={raceInfoLoading} error={raceInfoError} />

              {/* Race date */}
              <div>
                <Label htmlFor="race-date" className="text-sm font-semibold">Race Date <span className="text-destructive">*</span></Label>
                <Input id="race-date" type="date" value={raceDate} onChange={(e) => { setRaceDate(e.target.value); setErrors((p) => { const n = {...p}; delete n.raceDate; return n; }); }} className="mt-1" />
                {errors.raceDate && <p className="mt-1 text-xs text-destructive">{errors.raceDate}</p>}
              </div>

              {/* Goal distance */}
              <div>
                <Label className="text-sm font-semibold">Goal Distance <span className="text-destructive">*</span></Label>
                <Select value={goalDistance} onValueChange={(v) => { setGoalDistance(v); setErrors((p) => { const n = {...p}; delete n.goalDistance; return n; }); }}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select a distance" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5K">5K</SelectItem>
                    <SelectItem value="10K">10K</SelectItem>
                    <SelectItem value="Half Marathon">Half Marathon</SelectItem>
                    <SelectItem value="Marathon">Marathon</SelectItem>
                    <SelectItem value="Ultra">Ultra (custom km)</SelectItem>
                  </SelectContent>
                </Select>
                {errors.goalDistance && <p className="mt-1 text-xs text-destructive">{errors.goalDistance}</p>}
              </div>

              {/* Ultra km — shown only when Ultra selected */}
              {goalDistance === "Ultra" && (
                <div>
                  <Label htmlFor="ultra-km" className="text-sm font-semibold">Race Distance (km) <span className="text-destructive">*</span></Label>
                  <Input id="ultra-km" type="number" min="30" max="400" placeholder="e.g. 50, 100, 171" value={ultraKm} onChange={(e) => { setUltraKm(e.target.value); setErrors((p) => { const n = {...p}; delete n.ultraKm; return n; }); }} className="mt-1" />
                  {errors.ultraKm && <p className="mt-1 text-xs text-destructive">{errors.ultraKm}</p>}
                </div>
              )}

              {/* Goal type */}
              <div>
                <Label className="text-sm font-semibold block mb-1">Goal Type</Label>
                <div className="flex gap-2">
                  <Button type="button" variant={goalType === "finish" ? "default" : "outline"} size="sm" className="flex-1" onClick={() => setGoalType("finish")}>Finish it</Button>
                  <Button type="button" variant={goalType === "time" ? "default" : "outline"} size="sm" className="flex-1" onClick={() => setGoalType("time")}>Target time</Button>
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button className="flex-1" onClick={handleStep1Next}>Next →</Button>
            </div>
          </>
        ) : step === 2 ? (
          /* ── Step 2: Fitness & Schedule ── */
          <>
            <DialogHeader>
              <StepIndicator step={2} total={3} />
              <DialogTitle>Your Fitness & Schedule</DialogTitle>
              <DialogDescription>Help Claude understand where you're starting from.</DialogDescription>
            </DialogHeader>

            <div className="space-y-5 py-4">
              {/* Current form */}
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-2">Current Form</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="weekly-km" className="text-sm font-semibold">Weekly km <span className="text-destructive">*</span></Label>
                    <Input
                      id="weekly-km"
                      type="number"
                      placeholder="e.g. 50"
                      value={weeklyKm}
                      onChange={(e) => { setWeeklyKm(e.target.value); setErrors((p) => { const n = {...p}; delete n.weeklyKm; return n; }); }}
                      className={`mt-1 ${weeklyKmPrefilled ? "italic bg-muted" : ""}`}
                    />
                    {weeklyKmPrefilled && <p className="text-[10px] text-muted-foreground mt-0.5">From Strava ↗</p>}
                    {errors.weeklyKm && <p className="mt-1 text-xs text-destructive">{errors.weeklyKm}</p>}
                  </div>
                  <div>
                    <Label htmlFor="longest-run" className="text-sm font-semibold">Longest recent run (km)</Label>
                    <Input id="longest-run" type="number" placeholder="e.g. 32" value={longestRun} onChange={(e) => setLongestRun(e.target.value)} className="mt-1" />
                    <p className="text-[10px] text-muted-foreground mt-0.5">Helps assess gap to race distance</p>
                  </div>
                </div>
              </div>

              {/* Schedule grid */}
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-2">Your Typical Week</p>
                <WeeklyScheduleGrid schedule={schedule} onChange={setSchedule} />
              </div>

              {/* Athletic foundation */}
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-2">Athletic Foundation</p>
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="background" className="text-sm font-semibold">Racing history & background</Label>
                    <Textarea
                      id="background"
                      rows={3}
                      placeholder="e.g. 5 years running, 3 marathons, first ultra. Struggle with technical descents."
                      value={background}
                      onChange={(e) => setBackground(e.target.value)}
                      className={`mt-1 ${backgroundPrefilled ? "italic bg-muted" : ""}`}
                    />
                    {backgroundPrefilled && <p className="text-[10px] text-muted-foreground mt-0.5">From runner profile (editable)</p>}
                  </div>
                  <div>
                    <Label htmlFor="constraints" className="text-sm font-semibold">Injuries / constraints <span className="text-muted-foreground font-normal">(optional)</span></Label>
                    <Textarea id="constraints" rows={2} placeholder="e.g. Left knee niggle, avoid back-to-back efforts for now" value={injuriesText} onChange={(e) => setInjuriesText(e.target.value)} className="mt-1" />
                  </div>
                </div>
              </div>

              {hierarchicalPlan?.plan && !showConfirmReplace && (
                <div className="rounded-md border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
                  This will replace your current plan.
                </div>
              )}

              {errors.submit && (
                <div className="rounded-md border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
                  {errors.submit}
                </div>
              )}

              {hierarchicalPlan?.error && !isGenerating && !qaSending && (
                <div className="rounded-md border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
                  Something went wrong. Check your connection and try again.
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={() => setStep(1)} disabled={qaSending}>← Back</Button>
              <Button className="flex-1" onClick={handleStep2Next} disabled={qaSending}>
                {qaSending ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />Starting...</> : "Next →"}
              </Button>
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Run the full test suite to make sure nothing is broken**

```bash
npm test -- --run 2>&1 | tail -20
```

Expected: all existing tests pass. The modal has no existing tests so there are no new failures.

- [ ] **Step 3: Commit**

```bash
git add src/components/PlanIntakeModal.jsx
git commit -m "feat(modal): rewrite PlanIntakeModal as 2-step wizard with race lookup, Ultra support, and schedule grid"
```

---

### Task 5: Add Step 3 Q&A to PlanIntakeModal

**Files:**
- Modify: `src/components/PlanIntakeModal.jsx`

Step 3 is the Q&A exchange. The modal shell already has `step === 3` rendering as `null` — we add the content.

- [ ] **Step 1: Add the Step 3 render block**

In `src/components/PlanIntakeModal.jsx`, find the final `} : null}` in the ternary chain (the last condition at the bottom of the render return) and replace `null` with the Step 3 JSX:

```jsx
        ) : step === 3 ? (
          /* ── Step 3: Q&A with Claude ── */
          <>
            <DialogHeader>
              <StepIndicator step={3} total={3} />
              <DialogTitle>A few questions first</DialogTitle>
              <DialogDescription>Claude wants to validate a couple of things before building your plan.</DialogDescription>
            </DialogHeader>

            {/* Message thread */}
            <div className="space-y-3 py-4 max-h-60 overflow-y-auto">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`rounded-xl px-3.5 py-2.5 text-sm leading-relaxed ${
                    msg.role === "assistant"
                      ? "bg-slate-100 text-slate-800"
                      : "bg-primary text-primary-foreground ml-8"
                  }`}
                >
                  {msg.content}
                </div>
              ))}
              {qaSending && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Claude is thinking...
                </div>
              )}
            </div>

            {/* Input */}
            <div className="flex gap-2 pt-2">
              <Input
                placeholder="Your answer..."
                value={qaInput}
                onChange={(e) => setQaInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendMessage(qaInput); } }}
                disabled={qaSending}
                className="flex-1"
                autoFocus
              />
              <Button onClick={() => handleSendMessage(qaInput)} disabled={qaSending || !qaInput.trim()}>
                Send
              </Button>
            </div>

            {/* Skip Q&A */}
            <div className="text-center pt-1">
              <button
                type="button"
                className="text-[11px] text-muted-foreground hover:text-foreground underline underline-offset-2"
                onClick={() => handleSendMessage(SKIP_MESSAGE)}
                disabled={qaSending}
              >
                Skip Q&A — generate plan now
              </button>
            </div>
          </>
        ) : null}
```

- [ ] **Step 2: Run the test suite**

```bash
npm test -- --run 2>&1 | tail -20
```

Expected: all tests pass.

- [ ] **Step 3: Manual smoke test checklist**

Open the app locally (`npm run dev`). Verify:
- [ ] Opening the plan intake modal shows Step 1
- [ ] "Look up →" on a known race (e.g. "UTMB") shows the race info card
- [ ] Selecting "Ultra" reveals the km field; other distances hide it
- [ ] Clicking "Next →" on Step 1 advances to Step 2
- [ ] Schedule grid cycles Off → Easy → Hard → Long on click; Long clears previous Long
- [ ] Summary bar updates live
- [ ] Clicking "Next →" on Step 2 calls the edge function and shows Step 3 with Claude's question
- [ ] Typing a reply and pressing Enter / Send sends the message and shows Claude's response
- [ ] "Skip Q&A" sends the skip message and Claude generates the plan
- [ ] When plan is generated, modal closes and the plan appears on the page
- [ ] Previously broken error `column coach_conversations.role does not exist` is gone

- [ ] **Step 4: Commit**

```bash
git add src/components/PlanIntakeModal.jsx
git commit -m "feat(modal): add Step 3 inline Q&A — Claude asks assessment questions before generating plan"
```
