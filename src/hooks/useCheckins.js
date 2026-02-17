import { useCallback, useMemo, useReducer } from "react";
import { getSupabaseClient } from "../lib/supabaseClient";

const initialState = {
  checkins: [],
  loading: false,
  error: null,
  success: false,
};

function reducer(state, action) {
  switch (action.type) {
    case "pending":
      return { ...state, loading: true, error: null, success: false };
    case "loaded":
      return { ...state, checkins: action.payload, loading: false, success: true };
    case "added":
      return { ...state, checkins: [action.payload, ...state.checkins], loading: false, success: true };
    case "error":
      return { ...state, loading: false, error: action.payload, success: false };
    default:
      return state;
  }
}

export function useCheckins(userId) {
  const client = useMemo(() => getSupabaseClient(), []);
  const [state, dispatch] = useReducer(reducer, initialState);

  const loadCheckins = useCallback(async () => {
    dispatch({ type: "pending" });
    const query = client.from("athlete_feedback").select("*").order("week_of", { ascending: false }).limit(8);
    const { data, error } = userId ? await query.eq("user_id", userId) : await query;
    if (error) {
      dispatch({ type: "error", payload: error });
      throw error;
    }
    dispatch({ type: "loaded", payload: data ?? [] });
    return data ?? [];
  }, [client, userId]);

  const createCheckin = useCallback(
    async (checkin) => {
      if (!userId) throw new Error("User is required to create check-in");
      dispatch({ type: "pending" });
      const { data, error } = await client
        .from("athlete_feedback")
        .insert([{ ...checkin, user_id: userId }])
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

  return {
    checkins: state.checkins,
    loading: state.loading,
    error: state.error,
    success: state.success,
    loadCheckins,
    createCheckin,
  };
}
