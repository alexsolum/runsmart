import { useCallback, useMemo, useReducer } from "react";
import { getSupabaseClient } from "../lib/supabaseClient";

const initialState = {
  logs: [],
  loading: false,
  error: null,
};

function reducer(state, action) {
  switch (action.type) {
    case "pending":
      return { ...state, loading: true, error: null };
    case "loaded":
      return { ...state, logs: action.payload, loading: false };
    case "upserted": {
      const existing = state.logs.findIndex((l) => l.log_date === action.payload.log_date);
      const updated =
        existing >= 0
          ? state.logs.map((l, i) => (i === existing ? action.payload : l))
          : [action.payload, ...state.logs];
      return { ...state, logs: updated, loading: false };
    }
    case "error":
      return { ...state, loading: false, error: action.payload };
    default:
      return state;
  }
}

export function useDailyLogs(userId) {
  const client = useMemo(() => getSupabaseClient(), []);
  const [state, dispatch] = useReducer(reducer, initialState);

  const loadLogs = useCallback(async () => {
    if (!client) return [];
    dispatch({ type: "pending" });
    const query = client
      .from("daily_logs")
      .select("*")
      .order("log_date", { ascending: false })
      .limit(60);
    const { data, error } = userId ? await query.eq("user_id", userId) : await query;
    if (error) {
      dispatch({ type: "error", payload: error });
      throw error;
    }
    dispatch({ type: "loaded", payload: data ?? [] });
    return data ?? [];
  }, [client, userId]);

  const saveLog = useCallback(
    async (logData) => {
      if (!client) throw new Error("Supabase is not configured");
      if (!userId) throw new Error("User is required to save a daily log");
      dispatch({ type: "pending" });
      const { data, error } = await client
        .from("daily_logs")
        .upsert([{ ...logData, user_id: userId }], { onConflict: "user_id,log_date" })
        .select()
        .single();
      if (error) {
        dispatch({ type: "error", payload: error });
        throw error;
      }
      dispatch({ type: "upserted", payload: data });
      return data;
    },
    [client, userId],
  );

  return {
    logs: state.logs,
    loading: state.loading,
    error: state.error,
    loadLogs,
    saveLog,
  };
}
