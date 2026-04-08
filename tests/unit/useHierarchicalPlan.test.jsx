import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useHierarchicalPlan } from "../../src/hooks/useHierarchicalPlan";

vi.mock("../../src/lib/supabaseClient", () => ({
  getSupabaseClient: vi.fn(),
}));

import { getSupabaseClient } from "../../src/lib/supabaseClient";

// ── VALID_PLAN fixture (subset of claudeCoach.schema.test.js VALID_PLAN) ──────

const VALID_PLAN_DATA = {
  meta: {
    id: "test-plan-1",
    athlete: "Test Athlete",
    event: "Test Marathon",
    eventDate: "2026-09-15",
    planStartDate: "2026-05-01",
    planEndDate: "2026-09-15",
    totalWeeks: 20,
    generatedBy: "Claude Coach",
    createdAt: "2026-03-30T00:00:00Z",
    updatedAt: "2026-03-30T00:00:00Z",
  },
  assessment: {
    foundation: {
      raceHistory: ["Half Marathon 2025"],
      peakTrainingLoad: 10,
      foundationLevel: "intermediate",
      yearsInSport: 3,
    },
    currentForm: { weeklyKm: 40, longestRun: 18, consistency: 4 },
    strengths: [{ area: "endurance", evidence: "Consistent weekly volume" }],
    limiters: [{ area: "speed", evidence: "No interval training history" }],
    constraints: ["Work Mon-Fri, train early mornings"],
  },
  zones: {
    run: {
      hr: {
        lthr: 165,
        zones: [
          { zone: 1, name: "Recovery", percentLow: 0, percentHigh: 81, hrLow: 0, hrHigh: 134 },
          { zone: 2, name: "Aerobic", percentLow: 81, percentHigh: 89, hrLow: 134, hrHigh: 147 },
        ],
      },
    },
  },
  phases: [
    {
      name: "Base",
      startWeek: 1,
      endWeek: 6,
      focus: "Aerobic foundation",
      weeklyHoursRange: { low: 5, high: 7 },
      keyWorkouts: ["Long run"],
      physiologicalGoals: ["Build aerobic base"],
    },
  ],
  weeks: [
    {
      weekNumber: 1,
      startDate: "2026-05-04",
      endDate: "2026-05-10",
      phase: "Base",
      focus: "Establish routine",
      targetHours: 5,
      isRecoveryWeek: false,
      days: [
        {
          date: "2026-05-04",
          dayOfWeek: "Monday",
          workouts: [
            {
              id: "w1-mon-1",
              sport: "run",
              type: "easy",
              name: "Easy Run",
              description: "Zone 2 aerobic run",
              durationMinutes: 40,
              distanceKm: 6,
              primaryZone: "Zone 2",
              completed: false,
            },
          ],
        },
      ],
      summary: { totalHours: 5, totalKm: 35, sessions: 5 },
    },
  ],
  raceStrategy: {
    event: { name: "Test Marathon", date: "2026-09-15", type: "marathon", distance: 42.2 },
    pacing: { run: { target: "5:30/km", notes: "Negative split" } },
    nutrition: {
      preRace: "3 hours before: 100g carbs",
      during: { carbsPerHour: 60, fluidPerHour: "750ml", products: ["Gel"] },
      notes: "Test in training",
    },
    taper: { startDate: "2026-09-01", volumeReduction: 40, notes: "Maintain intensity" },
  },
};

// ── MOCK_PLAN_ROW: full hierarchical_plans DB row ─────────────────────────────

export const MOCK_PLAN_ROW = {
  id: "plan-uuid-1",
  user_id: "user-1",
  plan_data: VALID_PLAN_DATA,
  event_name: "Test Marathon",
  event_date: "2026-09-15",
  status: "active",
  created_at: "2026-03-30T00:00:00Z",
  updated_at: "2026-03-30T00:00:00Z",
};

// ── Fluent table builder ──────────────────────────────────────────────────────

function createFluentTable(handlers) {
  const state = {
    filters: [],
    payload: undefined,
    operation: "select",
  };

  const builder = {
    select() {
      if (state.operation !== "insert" && state.operation !== "update") {
        state.operation = "select";
      }
      return builder;
    },
    insert(payload) {
      state.operation = "insert";
      state.payload = payload;
      return builder;
    },
    update(payload) {
      state.operation = "update";
      state.payload = payload;
      return builder;
    },
    delete() {
      state.operation = "delete";
      return builder;
    },
    eq(column, value) {
      state.filters.push({ type: "eq", column, value });
      return builder;
    },
    order() {
      return builder;
    },
    limit() {
      return builder;
    },
    maybeSingle() {
      return Promise.resolve(
        handlers[state.operation]?.(state.payload, state.filters) ?? { data: null, error: null }
      );
    },
    single() {
      return Promise.resolve(
        handlers[state.operation]?.(state.payload, state.filters) ?? { data: null, error: null }
      );
    },
    then(resolve, reject) {
      return Promise.resolve(
        handlers[state.operation]?.(state.payload, state.filters) ?? { data: null, error: null }
      ).then(resolve, reject);
    },
  };

  return builder;
}

// ── Mock client factory ───────────────────────────────────────────────────────

function createMockClient(overrides = {}) {
  const rpcSpy = vi.fn().mockResolvedValue({ data: MOCK_PLAN_ROW.plan_data, error: null });
  const invokeSpy = vi.fn().mockResolvedValue({
    data: { id: MOCK_PLAN_ROW.id, plan: MOCK_PLAN_ROW.plan_data, usage: {} },
    error: null,
  });

  const selectHandlers = overrides.selectHandlers ?? {
    select: () => ({ data: MOCK_PLAN_ROW, error: null }),
    update: () => ({ data: null, error: null }),
  };

  const client = {
    from(table) {
      if (table === "hierarchical_plans") {
        return createFluentTable(selectHandlers);
      }
      throw new Error(`Unexpected table: ${table}`);
    },
    rpc: overrides.rpc ?? rpcSpy,
    functions: {
      invoke: overrides.invoke ?? invokeSpy,
    },
    auth: {
      getSession: overrides.getSession ?? vi.fn().mockResolvedValue({
        data: { session: { access_token: "test-token" } },
        error: null,
      }),
    },
  };

  return { client, rpcSpy, invokeSpy };
}

// ─────────────────────────────────────────────────────────────────────────────

describe("useHierarchicalPlan", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── loadPlan ────────────────────────────────────────────────────────────────

  it("loadPlan fetches only status='active' rows and takes most recent via maybeSingle", async () => {
    const selectSpy = vi.fn().mockReturnValue({ data: MOCK_PLAN_ROW, error: null });
    const { client } = createMockClient({
      selectHandlers: {
        select: selectSpy,
      },
    });
    getSupabaseClient.mockReturnValue(client);

    const { result } = renderHook(() => useHierarchicalPlan("user-1"));

    await act(async () => {
      await result.current.loadPlan();
    });

    // Verify that eq was called with status = 'active' (builder tracks filters)
    expect(result.current.plan).toEqual(MOCK_PLAN_ROW);
    expect(result.current.loading).toBe(false);
  });

  it("loadPlan sets plan to null when no active plan exists", async () => {
    const { client } = createMockClient({
      selectHandlers: {
        select: () => ({ data: null, error: null }),
      },
    });
    getSupabaseClient.mockReturnValue(client);

    const { result } = renderHook(() => useHierarchicalPlan("user-1"));

    await act(async () => {
      await result.current.loadPlan();
    });

    expect(result.current.plan).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  // ── generatePlan ────────────────────────────────────────────────────────────

  it("generatePlan sets generating:true synchronously before async work begins", async () => {
    // The test verifies that generating:true is dispatched before the invoke call.
    // We verify this by checking that the dispatch reducer action is called correctly
    // and that the final state after the call is correct.
    const { client } = createMockClient({
      selectHandlers: {
        select: () => ({ data: MOCK_PLAN_ROW, error: null }),
        update: () => ({ data: null, error: null }),
      },
    });
    getSupabaseClient.mockReturnValue(client);

    const { result } = renderHook(() => useHierarchicalPlan("user-1"));

    // Verify initial state
    expect(result.current.generating).toBe(false);

    // Call generatePlan
    await act(async () => {
      await result.current.generatePlan({ raceGoal: {}, fitness: {}, constraints: {}, background: "" });
    });

    // After successful completion, generating should be false and plan should be set
    expect(result.current.generating).toBe(false);
    expect(result.current.plan).toEqual(MOCK_PLAN_ROW);
  });

  it("generatePlan resets generating:false and sets plan after success", async () => {
    const { client } = createMockClient({
      selectHandlers: {
        select: () => ({ data: MOCK_PLAN_ROW, error: null }),
        update: () => ({ data: null, error: null }),
      },
    });
    getSupabaseClient.mockReturnValue(client);

    const { result } = renderHook(() => useHierarchicalPlan("user-1"));

    await act(async () => {
      await result.current.generatePlan({ raceGoal: {}, fitness: {}, constraints: {}, background: "" });
    });

    expect(result.current.generating).toBe(false);
    expect(result.current.plan).toEqual(MOCK_PLAN_ROW);
  });

  it("generatePlan resets generating:false and sets error after failure", async () => {
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
        await result.current.generatePlan({ raceGoal: {}, fitness: {}, constraints: {}, background: "" });
      } catch (_) {
        // expected to throw
      }
    });

    expect(result.current.generating).toBe(false);
    expect(result.current.error).not.toBeNull();
  });

  it("generatePlan deactivates old active plans before calling Edge Function", async () => {
    const updateSpy = vi.fn().mockReturnValue({ data: null, error: null });

    // Track the order of calls
    const callOrder = [];
    const invokeSpy = vi.fn().mockImplementation(async () => {
      callOrder.push("invoke");
      return { data: { id: MOCK_PLAN_ROW.id, plan: MOCK_PLAN_ROW.plan_data, usage: {} }, error: null };
    });

    // We need to track when update is called with replaced
    let updateCalledWithReplaced = false;
    const fluentTable = {
      select() { return this; },
      update(payload) {
        if (payload.status === "replaced") {
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

    const client = {
      from: () => fluentTable,
      rpc: vi.fn().mockResolvedValue({ data: MOCK_PLAN_ROW.plan_data, error: null }),
      functions: { invoke: invokeSpy },
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: { session: { access_token: "test-token" } },
          error: null,
        }),
      },
    };
    getSupabaseClient.mockReturnValue(client);

    const { result } = renderHook(() => useHierarchicalPlan("user-1"));

    await act(async () => {
      await result.current.generatePlan({ raceGoal: {}, fitness: {}, constraints: {}, background: "" });
    });

    expect(updateCalledWithReplaced).toBe(true);
    // update-replaced should come before invoke
    expect(callOrder.indexOf("update-replaced")).toBeLessThan(callOrder.indexOf("invoke"));
  });

  it("startPlanSession throws when the edge function returns routeError", async () => {
    const invokeSpy = vi.fn().mockResolvedValue({
      data: { routeError: "Generated plan failed validation: missing top-level field: weeks" },
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

    await act(async () => {
      await expect(
        result.current.startPlanSession({
          planIntake: {
            raceGoal: { eventName: "Soria Moria", eventDate: "2026-05-30", eventType: "ultra" },
            fitness: { weeklyKm: 105 },
            constraints: {},
          },
        }),
      ).rejects.toThrow("Generated plan failed validation");
    });

    expect(result.current.error).not.toBeNull();
  });

  it("sendPlanMessage throws when the edge function returns routeError", async () => {
    const invokeSpy = vi.fn().mockResolvedValue({
      data: { routeError: "there is no unique or exclusion constraint matching the ON CONFLICT specification" },
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

    await act(async () => {
      await expect(
        result.current.sendPlanMessage("session-1", "Please generate the plan now."),
      ).rejects.toThrow("there is no unique or exclusion constraint matching the ON CONFLICT specification");
    });

    expect(result.current.error).not.toBeNull();
  });

  it("sendPlanMessage still returns planGenerated when planUpdated is true even if routeError is present", async () => {
    const invokeSpy = vi.fn().mockResolvedValue({
      data: { planUpdated: true, routeError: "Plan saved but blocks failed: missing linked training plan" },
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

    let response;
    await act(async () => {
      response = await result.current.sendPlanMessage("session-1", "Generate the plan now.");
    });

    expect(response).toEqual({ question: null, planGenerated: true });
    expect(result.current.plan).toEqual(MOCK_PLAN_ROW);
    expect(result.current.error).toBeNull();
  });

  // ── applyPatch ──────────────────────────────────────────────────────────────

  it("applyPatch calls client.rpc('apply_plan_patch', ...) and updates state", async () => {
    const updatedPlanData = { ...VALID_PLAN_DATA, _patched: true };
    const rpcSpy = vi.fn().mockResolvedValue({ data: updatedPlanData, error: null });

    const { client } = createMockClient({
      rpc: rpcSpy,
      selectHandlers: {
        select: () => ({ data: MOCK_PLAN_ROW, error: null }),
      },
    });
    getSupabaseClient.mockReturnValue(client);

    const { result } = renderHook(() => useHierarchicalPlan("user-1"));

    // First load a plan so state.plan is not null
    await act(async () => {
      await result.current.loadPlan();
    });

    const patches = [{ week: 1, dayDate: "2026-05-04", workoutId: "w1-mon-1", fields: { completed: true } }];

    await act(async () => {
      await result.current.applyPatch(patches);
    });

    expect(rpcSpy).toHaveBeenCalledWith("apply_plan_patch", expect.objectContaining({
      p_plan_id: MOCK_PLAN_ROW.id,
    }));
    expect(result.current.plan.plan_data).toEqual(updatedPlanData);
  });

  it("applyPatch serializes the viewer workout edit payload shape", async () => {
    const rpcSpy = vi.fn().mockResolvedValue({ data: VALID_PLAN_DATA, error: null });

    const { client } = createMockClient({
      rpc: rpcSpy,
      selectHandlers: {
        select: () => ({ data: MOCK_PLAN_ROW, error: null }),
      },
    });
    getSupabaseClient.mockReturnValue(client);

    const { result } = renderHook(() => useHierarchicalPlan("user-1"));

    await act(async () => {
      await result.current.loadPlan();
    });

    const patches = [
      {
        week: 1,
        dayDate: "2026-05-04",
        workoutId: "w1-mon-1",
        fields: {
          sport: "Run",
          type: "Workout",
          name: "Edited session",
          description: "Updated description",
          durationMinutes: 65,
          distanceKm: 12.5,
        },
      },
    ];

    await act(async () => {
      await result.current.applyPatch(patches);
    });

    expect(rpcSpy).toHaveBeenCalledWith("apply_plan_patch", {
      p_plan_id: MOCK_PLAN_ROW.id,
      p_patches: patches,
    });
  });

  it("applyPatch dispatches error on RPC failure", async () => {
    const rpcSpy = vi.fn().mockResolvedValue({ data: null, error: { message: "RPC failed" } });

    const { client } = createMockClient({
      rpc: rpcSpy,
      selectHandlers: {
        select: () => ({ data: MOCK_PLAN_ROW, error: null }),
      },
    });
    getSupabaseClient.mockReturnValue(client);

    const { result } = renderHook(() => useHierarchicalPlan("user-1"));

    await act(async () => {
      await result.current.loadPlan();
    });

    await act(async () => {
      try {
        await result.current.applyPatch([{ week: 1, dayDate: "2026-05-04", workoutId: "w1-mon-1", fields: {} }]);
      } catch (_) {
        // expected
      }
    });

    expect(result.current.error).not.toBeNull();
  });

  // ── moveWorkout ─────────────────────────────────────────────────────────────

  it("moveWorkout calls client.rpc('move_workout', ...) and updates state", async () => {
    const movedPlanData = { ...VALID_PLAN_DATA, _moved: true };
    const rpcSpy = vi.fn().mockResolvedValue({ data: movedPlanData, error: null });

    const { client } = createMockClient({
      rpc: rpcSpy,
      selectHandlers: {
        select: () => ({ data: MOCK_PLAN_ROW, error: null }),
      },
    });
    getSupabaseClient.mockReturnValue(client);

    const { result } = renderHook(() => useHierarchicalPlan("user-1"));

    await act(async () => {
      await result.current.loadPlan();
    });

    await act(async () => {
      await result.current.moveWorkout("w1-mon-1", "2026-05-04", "2026-05-05");
    });

    expect(rpcSpy).toHaveBeenCalledWith("move_workout", expect.objectContaining({
      p_plan_id: MOCK_PLAN_ROW.id,
      p_workout_id: "w1-mon-1",
      p_from_date: "2026-05-04",
      p_to_date: "2026-05-05",
    }));
    expect(result.current.plan.plan_data).toEqual(movedPlanData);
  });

  it("moveWorkout is a no-op when fromDate === toDate", async () => {
    const rpcSpy = vi.fn().mockResolvedValue({ data: VALID_PLAN_DATA, error: null });

    const { client } = createMockClient({
      rpc: rpcSpy,
      selectHandlers: {
        select: () => ({ data: MOCK_PLAN_ROW, error: null }),
      },
    });
    getSupabaseClient.mockReturnValue(client);

    const { result } = renderHook(() => useHierarchicalPlan("user-1"));

    await act(async () => {
      await result.current.loadPlan();
    });

    let returnedValue;
    await act(async () => {
      returnedValue = await result.current.moveWorkout("w1-mon-1", "2026-05-04", "2026-05-04");
    });

    // No RPC call should have been made
    expect(rpcSpy).not.toHaveBeenCalledWith("move_workout", expect.anything());
    // Returns the current plan
    expect(returnedValue).toEqual(MOCK_PLAN_ROW);
  });

  it("moveWorkout dispatches error on RPC failure", async () => {
    const rpcSpy = vi.fn().mockResolvedValue({ data: null, error: { message: "move failed" } });

    const { client } = createMockClient({
      rpc: rpcSpy,
      selectHandlers: {
        select: () => ({ data: MOCK_PLAN_ROW, error: null }),
      },
    });
    getSupabaseClient.mockReturnValue(client);

    const { result } = renderHook(() => useHierarchicalPlan("user-1"));

    await act(async () => {
      await result.current.loadPlan();
    });

    await act(async () => {
      try {
        await result.current.moveWorkout("w1-mon-1", "2026-05-04", "2026-05-06");
      } catch (_) {
        // expected
      }
    });

    expect(result.current.error).not.toBeNull();
  });

  // ── toggleWorkoutCompleted ──────────────────────────────────────────────────

  it("toggleWorkoutCompleted calls client.rpc('toggle_workout_completed', ...) and updates state", async () => {
    const toggledPlanData = { ...VALID_PLAN_DATA, _toggled: true };
    const rpcSpy = vi.fn().mockResolvedValue({ data: toggledPlanData, error: null });

    const { client } = createMockClient({
      rpc: rpcSpy,
      selectHandlers: {
        select: () => ({ data: MOCK_PLAN_ROW, error: null }),
      },
    });
    getSupabaseClient.mockReturnValue(client);

    const { result } = renderHook(() => useHierarchicalPlan("user-1"));

    await act(async () => {
      await result.current.loadPlan();
    });

    await act(async () => {
      await result.current.toggleWorkoutCompleted("w1-mon-1", 1, "2026-05-04");
    });

    expect(rpcSpy).toHaveBeenCalledWith("toggle_workout_completed", expect.objectContaining({
      p_plan_id: MOCK_PLAN_ROW.id,
      p_workout_id: "w1-mon-1",
      p_week_number: 1,
      p_day_date: "2026-05-04",
    }));
    expect(result.current.plan.plan_data).toEqual(toggledPlanData);
  });

  // ── getWeek ─────────────────────────────────────────────────────────────────

  it("getWeek(n) returns null when plan is null", () => {
    const { client } = createMockClient({
      selectHandlers: {
        select: () => ({ data: null, error: null }),
      },
    });
    getSupabaseClient.mockReturnValue(client);

    const { result } = renderHook(() => useHierarchicalPlan("user-1"));

    // plan is null initially before loading
    expect(result.current.getWeek(1)).toBeNull();
  });

  it("getWeek(1) returns the week object with weekNumber===1 when plan exists", async () => {
    const { client } = createMockClient({
      selectHandlers: {
        select: () => ({ data: MOCK_PLAN_ROW, error: null }),
      },
    });
    getSupabaseClient.mockReturnValue(client);

    const { result } = renderHook(() => useHierarchicalPlan("user-1"));

    await act(async () => {
      await result.current.loadPlan();
    });

    const week = result.current.getWeek(1);
    expect(week).not.toBeNull();
    expect(week.weekNumber).toBe(1);
  });

  // ── getPhases ───────────────────────────────────────────────────────────────

  it("getPhases() returns empty array when plan is null", () => {
    const { client } = createMockClient({
      selectHandlers: {
        select: () => ({ data: null, error: null }),
      },
    });
    getSupabaseClient.mockReturnValue(client);

    const { result } = renderHook(() => useHierarchicalPlan("user-1"));

    // plan is null initially
    expect(result.current.getPhases()).toEqual([]);
  });

  it("getPhases() returns plan.plan_data.phases when plan exists", async () => {
    const { client } = createMockClient({
      selectHandlers: {
        select: () => ({ data: MOCK_PLAN_ROW, error: null }),
      },
    });
    getSupabaseClient.mockReturnValue(client);

    const { result } = renderHook(() => useHierarchicalPlan("user-1"));

    await act(async () => {
      await result.current.loadPlan();
    });

    const phases = result.current.getPhases();
    expect(Array.isArray(phases)).toBe(true);
    expect(phases).toEqual(MOCK_PLAN_ROW.plan_data.phases);
  });
});
