import { useCallback, useMemo, useReducer } from "react";
import { getSupabaseClient } from "../lib/supabaseClient";

const initialState = {
  entries: [],
  loading: false,
  error: null,
  success: false,
};

function reducer(state, action) {
  switch (action.type) {
    case "pending":
      return { ...state, loading: true, error: null, success: false };
    case "loaded":
      return { ...state, entries: action.payload, loading: false, success: true };
    case "created":
      return {
        ...state,
        entries: [...state.entries, action.payload].sort(
          (a, b) => new Date(a.workout_date) - new Date(b.workout_date),
        ),
        loading: false,
        success: true,
      };
    case "updated":
      return {
        ...state,
        entries: state.entries.map((e) => (e.id === action.payload.id ? action.payload : e)),
        loading: false,
        success: true,
      };
    case "deleted":
      return {
        ...state,
        entries: state.entries.filter((e) => e.id !== action.payload),
        loading: false,
        success: true,
      };
    case "error":
      return { ...state, loading: false, error: action.payload, success: false };
    default:
      return state;
  }
}

function isoDateOffset(isoDate, days) {
  const d = new Date(`${isoDate}T00:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

export function useWorkoutEntries(userId) {
  const client = useMemo(() => getSupabaseClient(), []);
  const [state, dispatch] = useReducer(reducer, initialState);

  const loadEntriesForWeek = useCallback(
    async (planId, weekStartIso) => {
      if (!client || !planId || !weekStartIso) return [];
      const weekEndIso = isoDateOffset(weekStartIso, 6);
      dispatch({ type: "pending" });
      const { data, error } = await client
        .from("workout_entries")
        .select("*")
        .eq("plan_id", planId)
        .gte("workout_date", weekStartIso)
        .lte("workout_date", weekEndIso)
        .order("workout_date", { ascending: true });
      if (error) {
        dispatch({ type: "error", payload: error });
        throw error;
      }
      dispatch({ type: "loaded", payload: data ?? [] });
      return data ?? [];
    },
    [client],
  );

  const createEntry = useCallback(
    async (entry) => {
      if (!client) throw new Error("Supabase is not configured");
      if (!userId) throw new Error("User is required to create a workout entry");
      dispatch({ type: "pending" });
      const payload = { ...entry, user_id: userId };
      const { data, error } = await client
        .from("workout_entries")
        .insert([payload])
        .select()
        .single();
      if (error) {
        dispatch({ type: "error", payload: error });
        throw error;
      }
      dispatch({ type: "created", payload: data });
      return data;
    },
    [client, userId],
  );

  const updateEntry = useCallback(
    async (id, patch) => {
      if (!client) throw new Error("Supabase is not configured");
      dispatch({ type: "pending" });
      const { data, error } = await client
        .from("workout_entries")
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();
      if (error) {
        dispatch({ type: "error", payload: error });
        throw error;
      }
      dispatch({ type: "updated", payload: data });
      return data;
    },
    [client],
  );

  const deleteEntry = useCallback(
    async (id) => {
      if (!client) throw new Error("Supabase is not configured");
      dispatch({ type: "pending" });
      const { error } = await client.from("workout_entries").delete().eq("id", id);
      if (error) {
        dispatch({ type: "error", payload: error });
        throw error;
      }
      dispatch({ type: "deleted", payload: id });
    },
    [client],
  );

  const toggleCompleted = useCallback(
    (id, current) => updateEntry(id, { completed: !current }),
    [updateEntry],
  );

  return {
    entries: state.entries,
    loading: state.loading,
    error: state.error,
    success: state.success,
    loadEntriesForWeek,
    createEntry,
    updateEntry,
    deleteEntry,
    toggleCompleted,
  };
}
