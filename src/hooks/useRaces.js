import { useCallback, useMemo, useReducer } from "react";
import { getSupabaseClient } from "../lib/supabaseClient";

const initialState = {
  races: [],
  loading: false,
  error: null,
};

function reducer(state, action) {
  switch (action.type) {
    case "pending":
      return { ...state, loading: true, error: null };
    case "loaded":
      return { ...state, races: action.payload, loading: false };
    case "added":
      return { ...state, races: [action.payload, ...state.races], loading: false };
    case "updated":
      return {
        ...state,
        races: state.races.map((r) => (r.id === action.payload.id ? action.payload : r)),
        loading: false,
      };
    case "deleted":
      return {
        ...state,
        races: state.races.filter((r) => r.id !== action.payload),
        loading: false,
      };
    case "error":
      return { ...state, loading: false, error: action.payload };
    default:
      return state;
  }
}

async function fetchRaceWithChildren(client, raceId) {
  const { data, error } = await client
    .from("races")
    .select("*, race_participations(*), race_resources(*)")
    .eq("id", raceId)
    .single();
  if (error) throw error;
  return data;
}

export function useRaces(userId) {
  const client = useMemo(() => getSupabaseClient(), []);
  const [state, dispatch] = useReducer(reducer, initialState);

  const loadRaces = useCallback(async () => {
    if (!client) return [];
    dispatch({ type: "pending" });
    const { data, error } = await client
      .from("races")
      .select("*, race_participations(*), race_resources(*)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) {
      dispatch({ type: "error", payload: error });
      throw error;
    }
    dispatch({ type: "loaded", payload: data ?? [] });
    return data ?? [];
  }, [client, userId]);

  const createRace = useCallback(async (raceData) => {
    if (!client) throw new Error("Supabase is not configured");
    if (!userId) throw new Error("User is required");
    dispatch({ type: "pending" });
    const { data, error } = await client
      .from("races")
      .insert([{ ...raceData, user_id: userId }])
      .select("*, race_participations(*), race_resources(*)")
      .single();
    if (error) {
      dispatch({ type: "error", payload: error });
      throw error;
    }
    dispatch({ type: "added", payload: data });

    // Kick off AI image generation in the background when no image was provided.
    // The race is visible immediately; the image_url updates when generation completes.
    if (!raceData.image_url) {
      (async () => {
        // Step 1: fetch race info via claude-coach (best-effort enrichment)
        let raceInfo = null;
        try {
          const { data: infoData, error: infoError } = await client.functions.invoke("claude-coach", {
            body: { mode: "race_info", raceName: data.name },
          });
          if (!infoError) raceInfo = infoData?.raceInfo ?? null;
        } catch {
          // race_info lookup failed — proceed without enrichment
        }

        // Step 2: generate image with all available data
        const { data: imgData } = await client.functions.invoke("race-image", {
          body: {
            raceId: data.id,
            raceName: data.name,
            location: data.location ?? raceInfo?.location ?? undefined,
            distanceKm: data.distance_km ?? raceInfo?.distanceKm ?? undefined,
            elevationGainM: data.elevation_gain_m ?? raceInfo?.elevationGainM ?? undefined,
            terrain: raceInfo?.terrain ?? undefined,
            keyFacts: raceInfo?.keyFacts ?? undefined,
            description: data.description ?? undefined,
            raceDate: data.next_race_date ?? undefined,
          },
        });

        if (imgData?.imageUrl) {
          dispatch({
            type: "updated",
            payload: { ...data, image_url: imgData.imageUrl },
          });
        }
      })().catch(() => {
        // Image generation is best-effort — silently ignore failures.
      });
    }

    return data;
  }, [client, userId]);

  const updateRace = useCallback(async (id, raceData) => {
    if (!client) throw new Error("Supabase is not configured");
    dispatch({ type: "pending" });
    const { error } = await client
      .from("races")
      .update(raceData)
      .eq("id", id);
    if (error) {
      dispatch({ type: "error", payload: error });
      throw error;
    }
    const updated = await fetchRaceWithChildren(client, id);
    dispatch({ type: "updated", payload: updated });
    return updated;
  }, [client]);

  const deleteRace = useCallback(async (id) => {
    if (!client) throw new Error("Supabase is not configured");
    dispatch({ type: "pending" });
    const { error } = await client
      .from("races")
      .delete()
      .eq("id", id);
    if (error) {
      dispatch({ type: "error", payload: error });
      throw error;
    }
    dispatch({ type: "deleted", payload: id });
  }, [client]);

  const addParticipation = useCallback(async (raceId, participationData) => {
    if (!client) throw new Error("Supabase is not configured");
    if (!userId) throw new Error("User is required");
    const { error } = await client
      .from("race_participations")
      .insert([{ ...participationData, race_id: raceId, user_id: userId }]);
    if (error) throw error;
    const updated = await fetchRaceWithChildren(client, raceId);
    dispatch({ type: "updated", payload: updated });
    return updated;
  }, [client, userId]);

  const updateParticipation = useCallback(async (participationId, raceId, participationData) => {
    if (!client) throw new Error("Supabase is not configured");
    const { error } = await client
      .from("race_participations")
      .update(participationData)
      .eq("id", participationId);
    if (error) throw error;
    const updated = await fetchRaceWithChildren(client, raceId);
    dispatch({ type: "updated", payload: updated });
    return updated;
  }, [client]);

  const deleteParticipation = useCallback(async (participationId, raceId) => {
    if (!client) throw new Error("Supabase is not configured");
    const { error } = await client
      .from("race_participations")
      .delete()
      .eq("id", participationId);
    if (error) throw error;
    const updated = await fetchRaceWithChildren(client, raceId);
    dispatch({ type: "updated", payload: updated });
    return updated;
  }, [client]);

  const addResource = useCallback(async (raceId, resourceData) => {
    if (!client) throw new Error("Supabase is not configured");
    if (!userId) throw new Error("User is required");
    const { error } = await client
      .from("race_resources")
      .insert([{ ...resourceData, race_id: raceId, user_id: userId }]);
    if (error) throw error;
    const updated = await fetchRaceWithChildren(client, raceId);
    dispatch({ type: "updated", payload: updated });
    return updated;
  }, [client, userId]);

  const deleteResource = useCallback(async (resourceId, raceId) => {
    if (!client) throw new Error("Supabase is not configured");
    const { error } = await client
      .from("race_resources")
      .delete()
      .eq("id", resourceId);
    if (error) throw error;
    const updated = await fetchRaceWithChildren(client, raceId);
    dispatch({ type: "updated", payload: updated });
    return updated;
  }, [client]);

  return {
    races: state.races,
    loading: state.loading,
    error: state.error,
    loadRaces,
    createRace,
    updateRace,
    deleteRace,
    addParticipation,
    updateParticipation,
    deleteParticipation,
    addResource,
    deleteResource,
  };
}
