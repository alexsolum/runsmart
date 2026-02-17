import { useCallback, useMemo, useReducer } from "react";
import { getSupabaseClient } from "../lib/supabaseClient";

const initialState = {
  plans: [],
  loading: false,
  error: null,
  success: false,
};

function reducer(state, action) {
  switch (action.type) {
    case "pending":
      return { ...state, loading: true, error: null, success: false };
    case "loaded":
      return { ...state, plans: action.payload, loading: false, success: true };
    case "created":
      return { ...state, plans: [action.payload, ...state.plans], loading: false, success: true };
    case "deleted":
      return {
        ...state,
        plans: state.plans.filter((plan) => plan.id !== action.payload),
        loading: false,
        success: true,
      };
    case "error":
      return { ...state, loading: false, error: action.payload, success: false };
    default:
      return state;
  }
}

export function usePlans(userId) {
  const client = useMemo(() => getSupabaseClient(), []);
  const [state, dispatch] = useReducer(reducer, initialState);

  const loadPlans = useCallback(async () => {
    dispatch({ type: "pending" });
    const query = client.from("training_plans").select("*").order("created_at", { ascending: false });
    const { data, error } = userId ? await query.eq("user_id", userId) : await query;
    if (error) {
      dispatch({ type: "error", payload: error });
      throw error;
    }
    dispatch({ type: "loaded", payload: data ?? [] });
    return data ?? [];
  }, [client, userId]);

  const createPlan = useCallback(
    async (plan) => {
      if (!userId) throw new Error("User is required to create plan");
      dispatch({ type: "pending" });
      const payload = { ...plan, user_id: userId };
      const { data, error } = await client.from("training_plans").insert([payload]).select().single();
      if (error) {
        dispatch({ type: "error", payload: error });
        throw error;
      }
      dispatch({ type: "created", payload: data });
      return data;
    },
    [client, userId],
  );

  const deletePlan = useCallback(
    async (id) => {
      dispatch({ type: "pending" });
      const { error } = await client.from("training_plans").delete().eq("id", id);
      if (error) {
        dispatch({ type: "error", payload: error });
        throw error;
      }
      dispatch({ type: "deleted", payload: id });
    },
    [client],
  );

  return {
    plans: state.plans,
    loading: state.loading,
    error: state.error,
    success: state.success,
    loadPlans,
    createPlan,
    deletePlan,
  };
}
