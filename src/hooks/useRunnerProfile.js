import { useCallback, useMemo, useReducer } from "react";
import { getSupabaseClient } from "../lib/supabaseClient";

const initialState = {
  background: "",
  insightRefreshIntervalHours: null,
  loading: false,
  error: null,
};

function reducer(state, action) {
  switch (action.type) {
    case "pending":
      return { ...state, loading: true, error: null };
    case "loaded":
      return {
        ...state,
        background: action.payload?.background ?? "",
        insightRefreshIntervalHours: action.payload?.insightRefreshIntervalHours ?? null,
        loading: false,
      };
    case "saved":
      return {
        ...state,
        background: action.payload?.background ?? "",
        insightRefreshIntervalHours: action.payload?.insightRefreshIntervalHours ?? null,
        loading: false,
      };
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
      .select("background, insight_refresh_interval_hours")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) {
      dispatch({ type: "error", payload: error.message });
      return;
    }
    dispatch({
      type: "loaded",
      payload: {
        background: data?.background ?? "",
        insightRefreshIntervalHours: data?.insight_refresh_interval_hours ?? null,
      },
    });
  }, [client, userId]);

  const saveProfile = useCallback(
    async (background, insightRefreshIntervalHours) => {
      if (!client || !userId) return;
      dispatch({ type: "pending" });
      const payload = {
        user_id: userId,
        background,
        updated_at: new Date().toISOString(),
      };
      if (typeof insightRefreshIntervalHours === "number") {
        payload.insight_refresh_interval_hours = insightRefreshIntervalHours;
      }
      const { error } = await client
        .from("runner_profiles")
        .upsert(payload, { onConflict: "user_id" });
      if (error) {
        dispatch({ type: "error", payload: error.message });
        return;
      }
      dispatch({
        type: "saved",
        payload: {
          background,
          insightRefreshIntervalHours:
            typeof insightRefreshIntervalHours === "number"
              ? insightRefreshIntervalHours
              : state.insightRefreshIntervalHours,
        },
      });
    },
    [client, state.insightRefreshIntervalHours, userId],
  );

  return {
    background: state.background,
    insightRefreshIntervalHours: state.insightRefreshIntervalHours,
    loading: state.loading,
    error: state.error,
    loadProfile,
    saveProfile,
  };
}
