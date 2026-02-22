import { useCallback, useMemo, useReducer } from "react";
import { getSupabaseClient } from "../lib/supabaseClient";

const initialState = {
  blocks: [],
  loading: false,
  error: null,
  success: false,
};

function reducer(state, action) {
  switch (action.type) {
    case "pending":
      return { ...state, loading: true, error: null, success: false };
    case "loaded":
      return { ...state, blocks: action.payload, loading: false, success: true };
    case "created":
      return {
        ...state,
        blocks: [...state.blocks, action.payload].sort(
          (a, b) => new Date(a.start_date) - new Date(b.start_date),
        ),
        loading: false,
        success: true,
      };
    case "updated":
      return {
        ...state,
        blocks: state.blocks
          .map((b) => (b.id === action.payload.id ? action.payload : b))
          .sort((a, b) => new Date(a.start_date) - new Date(b.start_date)),
        loading: false,
        success: true,
      };
    case "deleted":
      return {
        ...state,
        blocks: state.blocks.filter((b) => b.id !== action.payload),
        loading: false,
        success: true,
      };
    case "error":
      return { ...state, loading: false, error: action.payload, success: false };
    default:
      return state;
  }
}

export function useTrainingBlocks(userId) {
  const client = useMemo(() => getSupabaseClient(), []);
  const [state, dispatch] = useReducer(reducer, initialState);

  const loadBlocks = useCallback(
    async (planId) => {
      if (!client || !planId) return [];
      dispatch({ type: "pending" });
      const { data, error } = await client
        .from("training_blocks")
        .select("*")
        .eq("plan_id", planId)
        .order("start_date", { ascending: true });
      if (error) {
        dispatch({ type: "error", payload: error });
        throw error;
      }
      dispatch({ type: "loaded", payload: data ?? [] });
      return data ?? [];
    },
    [client],
  );

  const createBlock = useCallback(
    async (block) => {
      if (!client) throw new Error("Supabase is not configured");
      if (!userId) throw new Error("User is required to create a training block");
      dispatch({ type: "pending" });
      const payload = { ...block, user_id: userId };
      const { data, error } = await client
        .from("training_blocks")
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

  const updateBlock = useCallback(
    async (id, patch) => {
      if (!client) throw new Error("Supabase is not configured");
      dispatch({ type: "pending" });
      const { data, error } = await client
        .from("training_blocks")
        .update(patch)
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

  const deleteBlock = useCallback(
    async (id) => {
      if (!client) throw new Error("Supabase is not configured");
      dispatch({ type: "pending" });
      const { error } = await client.from("training_blocks").delete().eq("id", id);
      if (error) {
        dispatch({ type: "error", payload: error });
        throw error;
      }
      dispatch({ type: "deleted", payload: id });
    },
    [client],
  );

  return {
    blocks: state.blocks,
    loading: state.loading,
    error: state.error,
    success: state.success,
    loadBlocks,
    createBlock,
    updateBlock,
    deleteBlock,
  };
}
