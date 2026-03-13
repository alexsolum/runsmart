import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useWorkoutEntries } from "../../src/hooks/useWorkoutEntries";

vi.mock("../../src/lib/supabaseClient", () => ({
  getSupabaseClient: vi.fn(),
}));

import { getSupabaseClient } from "../../src/lib/supabaseClient";

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
    upsert(payload, options) {
      return Promise.resolve(handlers.upsert?.(payload, options) ?? { data: payload, error: null });
    },
    eq(column, value) {
      state.filters.push({ type: "eq", column, value });
      return builder;
    },
    gte(column, value) {
      state.filters.push({ type: "gte", column, value });
      return builder;
    },
    lte(column, value) {
      state.filters.push({ type: "lte", column, value });
      return builder;
    },
    in(column, value) {
      state.filters.push({ type: "in", column, value });
      return builder;
    },
    order() {
      return builder;
    },
    single() {
      return Promise.resolve(handlers[state.operation]?.(state.payload, state.filters) ?? { data: null, error: null });
    },
    then(resolve, reject) {
      return Promise.resolve(handlers[state.operation]?.(state.payload, state.filters) ?? { data: [], error: null }).then(resolve, reject);
    },
  };

  return builder;
}

function createClient(overrides = {}) {
  const upsertSpy = vi.fn();
  const deleteSpy = vi.fn();
  const insertSpy = vi.fn();
  const updateSpy = vi.fn();
  const selectEntries = overrides.selectEntries ?? [];
  const protectedRows = overrides.protectedRows ?? [];

  const client = {
    from(table) {
      if (table === "workout_entries") {
        return createFluentTable({
          select: () => ({ data: selectEntries, error: null }),
          insert: (payload) => {
            insertSpy(payload);
            return { data: overrides.insertRows ?? payload, error: null };
          },
          update: (payload, filters) => {
            updateSpy(payload, filters);
            return { data: overrides.updatedRow ?? { id: "entry-1", plan_id: "plan-1", workout_date: "2026-03-18", ...payload }, error: null };
          },
          delete: (_, filters) => {
            deleteSpy(filters);
            return { error: null };
          },
        });
      }

      if (table === "weekly_plan_day_states") {
        return createFluentTable({
          select: () => ({ data: protectedRows, error: null }),
          upsert: (payload, options) => {
            upsertSpy(payload, options);
            return { data: payload, error: null };
          },
        });
      }

      throw new Error(`Unexpected table ${table}`);
    },
  };

  return { client, upsertSpy, deleteSpy, insertSpy, updateSpy };
}

describe("useWorkoutEntries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("marks a day as protected after manual create", async () => {
    const { client, upsertSpy } = createClient({
      insertRows: { id: "entry-1", plan_id: "plan-1", workout_date: "2026-03-18", workout_type: "Easy" },
    });
    getSupabaseClient.mockReturnValue(client);
    const { result } = renderHook(() => useWorkoutEntries("user-1"));

    await act(async () => {
      await result.current.createEntry({
        plan_id: "plan-1",
        workout_date: "2026-03-18",
        workout_type: "Easy",
      });
    });

    expect(upsertSpy).toHaveBeenCalledWith(
      [expect.objectContaining({
        plan_id: "plan-1",
        user_id: "user-1",
        workout_date: "2026-03-18",
        is_protected: true,
      })],
      { onConflict: "plan_id,workout_date" },
    );
  });

  it("marks both the old and new day as protected after manual date changes", async () => {
    const existingEntry = { id: "entry-1", plan_id: "plan-1", workout_date: "2026-03-18", workout_type: "Easy" };
    const { client, upsertSpy } = createClient({
      selectEntries: [existingEntry],
      updatedRow: { ...existingEntry, workout_date: "2026-03-19", description: "Moved manually" },
    });
    getSupabaseClient.mockReturnValue(client);
    const { result } = renderHook(() => useWorkoutEntries("user-1"));

    await act(async () => {
      await result.current.loadEntriesForRange("plan-1", "2026-03-17", "2026-03-23");
    });

    await act(async () => {
      await result.current.updateEntry("entry-1", {
        workout_date: "2026-03-19",
        description: "Moved manually",
      });
    });

    expect(upsertSpy).toHaveBeenCalledTimes(2);
    expect(upsertSpy).toHaveBeenNthCalledWith(
      1,
      [expect.objectContaining({ workout_date: "2026-03-19", is_protected: true })],
      { onConflict: "plan_id,workout_date" },
    );
    expect(upsertSpy).toHaveBeenNthCalledWith(
      2,
      [expect.objectContaining({ workout_date: "2026-03-18", is_protected: true })],
      { onConflict: "plan_id,workout_date" },
    );
  });

  it("keeps a deleted day protected after manual delete", async () => {
    const existingEntry = { id: "entry-1", plan_id: "plan-1", workout_date: "2026-03-18", workout_type: "Easy" };
    const { client, upsertSpy } = createClient({ selectEntries: [existingEntry] });
    getSupabaseClient.mockReturnValue(client);
    const { result } = renderHook(() => useWorkoutEntries("user-1"));

    await act(async () => {
      await result.current.loadEntriesForRange("plan-1", "2026-03-17", "2026-03-23");
    });

    await act(async () => {
      await result.current.deleteEntry("entry-1");
    });

    expect(upsertSpy).toHaveBeenCalledWith(
      [expect.objectContaining({ workout_date: "2026-03-18", is_protected: true })],
      { onConflict: "plan_id,workout_date" },
    );
  });

  it("does not mark a day as protected when completion is toggled", async () => {
    const existingEntry = { id: "entry-1", plan_id: "plan-1", workout_date: "2026-03-18", workout_type: "Easy", completed: false };
    const { client, upsertSpy } = createClient({
      selectEntries: [existingEntry],
      updatedRow: { ...existingEntry, completed: true },
    });
    getSupabaseClient.mockReturnValue(client);
    const { result } = renderHook(() => useWorkoutEntries("user-1"));

    await act(async () => {
      await result.current.loadEntriesForRange("plan-1", "2026-03-17", "2026-03-23");
      await result.current.toggleCompleted("entry-1", false);
    });

    expect(upsertSpy).not.toHaveBeenCalled();
  });

  it("preserves protected days by default when applying a structured plan", async () => {
    const existingEntries = [
      { id: "entry-keep", plan_id: "plan-1", workout_date: "2026-03-18", workout_type: "Easy" },
    ];
    const { client, deleteSpy, insertSpy } = createClient({
      selectEntries: existingEntries,
      protectedRows: [{ plan_id: "plan-1", user_id: "user-1", workout_date: "2026-03-18", is_protected: true }],
      insertRows: [{ id: "entry-new", plan_id: "plan-1", workout_date: "2026-03-19", workout_type: "Tempo" }],
    });
    getSupabaseClient.mockReturnValue(client);
    const { result } = renderHook(() => useWorkoutEntries("user-1"));

    await act(async () => {
      await result.current.loadEntriesForRange("plan-1", "2026-03-17", "2026-03-23");
    });

    let applyResult;
    await act(async () => {
      applyResult = await result.current.applyStructuredPlan("plan-1", [
        { workout_date: "2026-03-18", workout_type: "Long Run", distance_km: 20, duration_min: 120, description: "Protected" },
        { workout_date: "2026-03-19", workout_type: "Tempo", distance_km: 10, duration_min: 55, description: "Replaceable" },
      ]);
    });

    expect(applyResult.preservedDates).toEqual(["2026-03-18"]);
    expect(deleteSpy).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({ type: "in", column: "workout_date", value: ["2026-03-19"] }),
    ]));
    expect(insertSpy).toHaveBeenCalledWith([
      expect.objectContaining({ workout_date: "2026-03-19", workout_type: "Tempo" }),
    ]);
  });

  it("allows explicit overwrite of protected days and clears their protection state", async () => {
    const existingEntries = [
      { id: "entry-keep", plan_id: "plan-1", workout_date: "2026-03-18", workout_type: "Easy" },
    ];
    const { client, deleteSpy, upsertSpy } = createClient({
      selectEntries: existingEntries,
      protectedRows: [{ plan_id: "plan-1", user_id: "user-1", workout_date: "2026-03-18", is_protected: true }],
      insertRows: [{ id: "entry-new", plan_id: "plan-1", workout_date: "2026-03-18", workout_type: "Long Run" }],
    });
    getSupabaseClient.mockReturnValue(client);
    const { result } = renderHook(() => useWorkoutEntries("user-1"));

    await act(async () => {
      await result.current.loadEntriesForRange("plan-1", "2026-03-17", "2026-03-23");
      await result.current.applyStructuredPlan("plan-1", [
        { workout_date: "2026-03-18", workout_type: "Long Run", distance_km: 20, duration_min: 120, description: "Override" },
      ], {
        overwritePolicy: "force-specific",
        forceOverwriteDates: ["2026-03-18"],
      });
    });

    expect(deleteSpy).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({ type: "in", column: "workout_date", value: ["2026-03-18"] }),
    ]));
    expect(upsertSpy).toHaveBeenLastCalledWith(
      [expect.objectContaining({ workout_date: "2026-03-18", is_protected: false })],
      { onConflict: "plan_id,workout_date" },
    );
  });
});
