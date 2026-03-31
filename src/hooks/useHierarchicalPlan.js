import { useCallback, useEffect, useMemo, useReducer } from "react";
import { getSupabaseClient } from "../lib/supabaseClient";

const initialState = {
  plan: null,       // single hierarchical_plans row (or null)
  loading: false,   // initial fetch in progress
  generating: false,// claude-coach call in progress
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

  // ── generatePlan ────────────────────────────────────────────────────────────
  const generatePlan = useCallback(async (payload) => {
    if (!client) throw new Error("Supabase is not configured");

    // a. Synchronous generating flag
    dispatch({ type: "generating" });

    try {
      // b. Get session
      const { data: sessionData, error: sessionError } = await client.auth.getSession();
      if (sessionError) throw sessionError;
      const session = sessionData?.session;
      if (!session) throw new Error("No active session. Please sign in first.");

      // c. Deactivate old active plans
      await client
        .from("hierarchical_plans")
        .update({ status: "replaced" })
        .eq("user_id", userId)
        .eq("status", "active");

      // d. Call claude-coach Edge Function
      const { data: invokeData, error: invokeError } = await client.functions.invoke("claude-coach", {
        body: payload,
        headers: { Authorization: "Bearer " + session.access_token },
      });

      if (invokeError) throw invokeError;

      // f. Re-fetch the saved row by id
      const { data: savedRow, error: fetchError } = await client
        .from("hierarchical_plans")
        .select("*")
        .eq("id", invokeData.id)
        .single();

      if (fetchError) throw fetchError;

      // g. Dispatch generated
      dispatch({ type: "generated", payload: savedRow });
      return savedRow;
    } catch (err) {
      // h. Reset on error
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

    // b. No-op when same date
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

  // ── getWeek (pure accessor) ─────────────────────────────────────────────────
  const getWeek = useCallback((weekNumber) => {
    if (!state.plan || !state.plan.plan_data?.weeks) return null;
    return state.plan.plan_data.weeks.find((w) => w.weekNumber === weekNumber) ?? null;
  }, [state.plan]);

  // ── getPhases (pure accessor) ───────────────────────────────────────────────
  const getPhases = useCallback(() => {
    if (!state.plan || !state.plan.plan_data?.phases) return [];
    return state.plan.plan_data.phases;
  }, [state.plan]);

  // ── Eager load effect ───────────────────────────────────────────────────────
  useEffect(() => {
    if (userId) loadPlan();
  }, [userId, loadPlan]);

  return {
    plan: state.plan,
    loading: state.loading,
    generating: state.generating,
    error: state.error,
    loadPlan,
    generatePlan,
    applyPatch,
    toggleWorkoutCompleted,
    moveWorkout,
    getWeek,
    getPhases,
  };
}
