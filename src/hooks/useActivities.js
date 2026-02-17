import { useCallback, useMemo, useReducer } from "react";
import { getSupabaseClient } from "../lib/supabaseClient";

const initialState = {
  activities: [],
  loading: false,
  error: null,
  success: false,
};

function reducer(state, action) {
  switch (action.type) {
    case "pending":
      return { ...state, loading: true, error: null, success: false };
    case "loaded":
      return { ...state, activities: action.payload, loading: false, success: true };
    case "added":
      return { ...state, activities: [action.payload, ...state.activities], loading: false, success: true };
    case "updated":
      return {
        ...state,
        activities: state.activities.map((activity) =>
          activity.id === action.payload.id ? action.payload : activity,
        ),
        loading: false,
        success: true,
      };
    case "error":
      return { ...state, loading: false, error: action.payload, success: false };
    default:
      return state;
  }
}

export function useActivities(userId) {
  const client = useMemo(() => getSupabaseClient(), []);
  const [state, dispatch] = useReducer(reducer, initialState);

  const loadActivities = useCallback(
    async ({ limit = 20, ascending = false } = {}) => {
      dispatch({ type: "pending" });
      const query = client
        .from("activities")
        .select("*")
        .order("started_at", { ascending })
        .limit(limit);
      const { data, error } = userId ? await query.eq("user_id", userId) : await query;
      if (error) {
        dispatch({ type: "error", payload: error });
        throw error;
      }
      dispatch({ type: "loaded", payload: data ?? [] });
      return data ?? [];
    },
    [client, userId],
  );

  const createManualActivity = useCallback(
    async (activity) => {
      if (!userId) throw new Error("User is required to create activity");
      dispatch({ type: "pending" });
      const { data, error } = await client
        .from("activities")
        .insert([{ ...activity, user_id: userId }])
        .select()
        .single();
      if (error) {
        dispatch({ type: "error", payload: error });
        throw error;
      }
      dispatch({ type: "added", payload: data });
      return data;
    },
    [client, userId],
  );

  const updateActivityRpe = useCallback(
    async (id, effortRating) => {
      dispatch({ type: "pending" });
      const { data, error } = await client
        .from("activities")
        .update({ effort_rating: effortRating })
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

  return {
    activities: state.activities,
    loading: state.loading,
    error: state.error,
    success: state.success,
    loadActivities,
    createManualActivity,
    updateActivityRpe,
  };
}
