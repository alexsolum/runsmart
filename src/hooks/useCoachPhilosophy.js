import { useCallback, useEffect, useMemo, useReducer } from "react";
import { getSupabaseClient } from "../lib/supabaseClient";

const REQUIRED_SECTIONS = ["principles", "dos", "donts", "workout_examples", "phase_notes"];

const initialState = {
  document: null,
  versions: [],
  loading: false,
  saving: false,
  publishing: false,
  error: null,
  isAdmin: false,
};

function reducer(state, action) {
  switch (action.type) {
    case "loading":
      return { ...state, loading: true, error: null };
    case "loaded":
      return {
        ...state,
        loading: false,
        document: action.payload.document,
        versions: action.payload.versions,
        error: null,
        isAdmin: action.payload.isAdmin,
      };
    case "saving":
      return { ...state, saving: true, error: null };
    case "saved":
      return { ...state, saving: false, document: action.payload, error: null };
    case "publishing":
      return { ...state, publishing: true, error: null };
    case "published":
      return {
        ...state,
        publishing: false,
        document: action.payload.document,
        versions: action.payload.versions ?? state.versions,
        error: null,
      };
    case "error":
      return { ...state, loading: false, saving: false, publishing: false, error: action.payload };
    default:
      return state;
  }
}

function validateSections(payload) {
  const errors = [];
  for (const key of REQUIRED_SECTIONS) {
    if (!String(payload[key] ?? "").trim()) {
      errors.push(`${key} is required`);
    }
  }
  if (!Number.isFinite(Number(payload.koop_weight)) || Number(payload.koop_weight) < 0 || Number(payload.koop_weight) > 100) {
    errors.push("koop_weight must be between 0 and 100");
  }
  if (!Number.isFinite(Number(payload.bakken_weight)) || Number(payload.bakken_weight) < 0 || Number(payload.bakken_weight) > 100) {
    errors.push("bakken_weight must be between 0 and 100");
  }
  return errors;
}

export function useCoachPhilosophy(userId) {
  const client = useMemo(() => getSupabaseClient(), []);
  const [state, dispatch] = useReducer(reducer, initialState);

  const invokeAdminFunction = useCallback(async (body) => {
    if (!client) throw new Error("Supabase is not configured");
    const { data, error } = await client.functions.invoke("coach-philosophy-admin", { body });
    if (error) throw new Error(error.message);
    if (data?.error) throw new Error(data.error);
    return data;
  }, [client]);

  const load = useCallback(async () => {
    if (!client || !userId) return;
    dispatch({ type: "loading" });
    try {
      const [adminRow, readData] = await Promise.all([
        client
          .from("coach_admins")
          .select("role")
          .eq("user_id", userId)
          .maybeSingle(),
        invokeAdminFunction({ action: "read" }),
      ]);

      const isAdmin = Boolean(adminRow.data?.role);
      dispatch({
        type: "loaded",
        payload: {
          document: readData.document ?? null,
          versions: readData.versions ?? [],
          isAdmin,
        },
      });
    } catch (err) {
      dispatch({ type: "error", payload: err.message || String(err) });
    }
  }, [client, invokeAdminFunction, userId]);

  const saveDraft = useCallback(async (payload) => {
    if (!client) throw new Error("Supabase is not configured");
    dispatch({ type: "saving" });
    try {
      const errors = validateSections(payload);
      if (errors.length) throw new Error(errors.join("; "));
      const data = await invokeAdminFunction({ action: "save_draft", payload });
      dispatch({ type: "saved", payload: data.document });
      return data.document;
    } catch (err) {
      dispatch({ type: "error", payload: err.message || String(err) });
      throw err;
    }
  }, [client, invokeAdminFunction]);

  const publish = useCallback(async (changelogNote) => {
    if (!client) throw new Error("Supabase is not configured");
    dispatch({ type: "publishing" });
    try {
      if (!String(changelogNote || "").trim()) {
        throw new Error("Publish changelog note is required.");
      }
      const data = await invokeAdminFunction({ action: "publish", changelog_note: changelogNote });
      const refreshed = await invokeAdminFunction({ action: "read" });
      dispatch({
        type: "published",
        payload: { document: data.document, versions: refreshed.versions ?? [] },
      });
      return data.document;
    } catch (err) {
      dispatch({ type: "error", payload: err.message || String(err) });
      throw err;
    }
  }, [client, invokeAdminFunction]);

  const rollback = useCallback(async (versionId) => {
    if (!client) throw new Error("Supabase is not configured");
    dispatch({ type: "publishing" });
    try {
      const data = await invokeAdminFunction({ action: "rollback", version_id: versionId });
      const refreshed = await invokeAdminFunction({ action: "read" });
      dispatch({
        type: "published",
        payload: { document: data.document, versions: refreshed.versions ?? [] },
      });
      return data.document;
    } catch (err) {
      dispatch({ type: "error", payload: err.message || String(err) });
      throw err;
    }
  }, [client, invokeAdminFunction]);

  const exportPayload = useCallback(async () => {
    if (!client) throw new Error("Supabase is not configured");
    const data = await invokeAdminFunction({ action: "export" });
    return data.export;
  }, [client, invokeAdminFunction]);

  useEffect(() => {
    if (!userId) return;
    load();
  }, [userId, load]);

  return {
    ...state,
    load,
    saveDraft,
    publish,
    rollback,
    exportPayload,
  };
}
