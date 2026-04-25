import { useCallback, useMemo, useReducer } from "react";
import { getSupabaseClient } from "../lib/supabaseClient";

const initialState = {
  plans: [],
  loading: false,
  error: null,
};

function reducer(state, action) {
  switch (action.type) {
    case "pending":
      return { ...state, loading: true, error: null };
    case "loaded":
      return { ...state, plans: action.payload, loading: false };
    case "added":
      return { ...state, plans: [action.payload, ...state.plans], loading: false };
    case "updated":
      return {
        ...state,
        plans: state.plans.map((p) => (p.id === action.payload.id ? action.payload : p)),
        loading: false,
      };
    case "deleted":
      return {
        ...state,
        plans: state.plans.filter((p) => p.id !== action.payload),
        loading: false,
      };
    case "error":
      return { ...state, loading: false, error: action.payload };
    default:
      return state;
  }
}

const SELECT = "*, season_plan_races(*, race:races(*))";

async function fetchPlanWithRaces(client, planId) {
  const { data, error } = await client
    .from("season_plans")
    .select(SELECT)
    .eq("id", planId)
    .single();
  if (error) throw error;
  return data;
}

export function useSeasonPlans(userId) {
  const client = useMemo(() => getSupabaseClient(), []);
  const [state, dispatch] = useReducer(reducer, initialState);

  const loadPlans = useCallback(async () => {
    if (!client || !userId) return [];
    dispatch({ type: "pending" });
    const { data, error } = await client
      .from("season_plans")
      .select(SELECT)
      .eq("user_id", userId)
      .order("season_year", { ascending: false });
    if (error) {
      dispatch({ type: "error", payload: error });
      throw error;
    }
    dispatch({ type: "loaded", payload: data ?? [] });
    return data ?? [];
  }, [client, userId]);

  const createPlan = useCallback(async ({ name, season_year, goal_summary = null, is_active = false }) => {
    if (!client) throw new Error("Supabase is not configured");
    if (!userId) throw new Error("User is required");
    // Enforce single active: if requesting active, deactivate others first.
    if (is_active) {
      await client.from("season_plans").update({ is_active: false }).eq("user_id", userId).eq("is_active", true);
    }
    const { data, error } = await client
      .from("season_plans")
      .insert([{ user_id: userId, name, season_year, goal_summary, is_active }])
      .select(SELECT)
      .single();
    if (error) {
      dispatch({ type: "error", payload: error });
      throw error;
    }
    dispatch({ type: "added", payload: data });
    return data;
  }, [client, userId]);

  const updatePlan = useCallback(async (id, patch) => {
    if (!client) throw new Error("Supabase is not configured");
    const { error } = await client.from("season_plans").update(patch).eq("id", id);
    if (error) {
      dispatch({ type: "error", payload: error });
      throw error;
    }
    const updated = await fetchPlanWithRaces(client, id);
    dispatch({ type: "updated", payload: updated });
    return updated;
  }, [client]);

  const deletePlan = useCallback(async (id) => {
    if (!client) throw new Error("Supabase is not configured");
    const { error } = await client.from("season_plans").delete().eq("id", id);
    if (error) {
      dispatch({ type: "error", payload: error });
      throw error;
    }
    dispatch({ type: "deleted", payload: id });
  }, [client]);

  const setActive = useCallback(async (id) => {
    if (!client || !userId) throw new Error("Supabase is not configured");
    // Deactivate the rest, then activate this one. The partial unique index
    // prevents two rows with is_active=true so we deactivate first.
    await client.from("season_plans").update({ is_active: false }).eq("user_id", userId).eq("is_active", true);
    const { error } = await client.from("season_plans").update({ is_active: true }).eq("id", id);
    if (error) {
      dispatch({ type: "error", payload: error });
      throw error;
    }
    // Reload all so every plan reflects the new active flag.
    await loadPlans();
  }, [client, userId, loadPlans]);

  const addRaceToPlan = useCallback(async (seasonPlanId, { race_id, priority = "B", target_date = null, notes = null, position = null }) => {
    if (!client) throw new Error("Supabase is not configured");
    const { error } = await client
      .from("season_plan_races")
      .insert([{ season_plan_id: seasonPlanId, race_id, priority, target_date, notes, position }]);
    if (error) throw error;
    const updated = await fetchPlanWithRaces(client, seasonPlanId);
    dispatch({ type: "updated", payload: updated });
    return updated;
  }, [client]);

  const updateRaceInPlan = useCallback(async (seasonPlanRaceId, seasonPlanId, patch) => {
    if (!client) throw new Error("Supabase is not configured");
    const { error } = await client.from("season_plan_races").update(patch).eq("id", seasonPlanRaceId);
    if (error) throw error;
    const updated = await fetchPlanWithRaces(client, seasonPlanId);
    dispatch({ type: "updated", payload: updated });
    return updated;
  }, [client]);

  const removeRaceFromPlan = useCallback(async (seasonPlanRaceId, seasonPlanId) => {
    if (!client) throw new Error("Supabase is not configured");
    const { error } = await client.from("season_plan_races").delete().eq("id", seasonPlanRaceId);
    if (error) throw error;
    const updated = await fetchPlanWithRaces(client, seasonPlanId);
    dispatch({ type: "updated", payload: updated });
    return updated;
  }, [client]);

  const reorderRacesInPlan = useCallback(async (seasonPlanId, orderedIds) => {
    if (!client) throw new Error("Supabase is not configured");
    // Apply position values matching the incoming order.
    const updates = orderedIds.map((id, idx) =>
      client.from("season_plan_races").update({ position: idx }).eq("id", id)
    );
    const results = await Promise.all(updates);
    const failed = results.find((r) => r.error);
    if (failed?.error) throw failed.error;
    const updated = await fetchPlanWithRaces(client, seasonPlanId);
    dispatch({ type: "updated", payload: updated });
    return updated;
  }, [client]);

  return {
    plans: state.plans,
    loading: state.loading,
    error: state.error,
    loadPlans,
    createPlan,
    updatePlan,
    deletePlan,
    setActive,
    addRaceToPlan,
    updateRaceInPlan,
    removeRaceFromPlan,
    reorderRacesInPlan,
  };
}
