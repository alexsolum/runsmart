import { useCallback, useMemo, useReducer } from "react";
import { getSupabaseClient } from "../lib/supabaseClient";

const initialState = {
  background: "",
  loading: false,
  error: null,
};

function reducer(state, action) {
  switch (action.type) {
    case "pending":
      return { ...state, loading: true, error: null };
    case "loaded":
      return { ...state, background: action.payload ?? "", loading: false };
    case "saved":
      return { ...state, background: action.payload, loading: false };
    case "error":
      return { ...state, loading: false, error: action.payload };
    default:
      return state;
  }
}

export function useRunnerProfile(userId) {
  const client = useMemo(() => getSupabaseClient(), []);
  const [state, dispatch] = useReducer(reducer, initialState);

  const loadProfile = useCallback(async () => {
    if (!client || !userId) return;
    dispatch({ type: "pending" });
    const { data, error } = await client
      .from("runner_profiles")
      .select("background")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) {
      dispatch({ type: "error", payload: error.message });
      return;
    }
    dispatch({ type: "loaded", payload: data?.background ?? "" });
  }, [client, userId]);

  const saveProfile = useCallback(
    async (background) => {
      if (!client || !userId) return;
      dispatch({ type: "pending" });
      const { error } = await client
        .from("runner_profiles")
        .upsert(
          { user_id: userId, background, updated_at: new Date().toISOString() },
          { onConflict: "user_id" },
        );
      if (error) {
        dispatch({ type: "error", payload: error.message });
        return;
      }
      dispatch({ type: "saved", payload: background });
    },
    [client, userId],
  );

  return {
    background: state.background,
    loading: state.loading,
    error: state.error,
    loadProfile,
    saveProfile,
  };
}
