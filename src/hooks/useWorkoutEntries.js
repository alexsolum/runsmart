import { useCallback, useMemo, useReducer } from "react";
import { getSupabaseClient } from "../lib/supabaseClient";

const initialState = {
  entries: [],
  loading: false,
  error: null,
  success: false,
};

function reducer(state, action) {
  switch (action.type) {
    case "pending":
      return { ...state, loading: true, error: null, success: false };
    case "loaded":
      return { ...state, entries: action.payload, loading: false, success: true };
    case "created":
      return {
        ...state,
        entries: [...state.entries, action.payload].sort(
          (a, b) => new Date(a.workout_date) - new Date(b.workout_date),
        ),
        loading: false,
        success: true,
      };
    case "updated":
      return {
        ...state,
        entries: state.entries.map((e) => (e.id === action.payload.id ? action.payload : e)),
        loading: false,
        success: true,
      };
    case "deleted":
      return {
        ...state,
        entries: state.entries.filter((e) => e.id !== action.payload),
        loading: false,
        success: true,
      };
    case "error":
      return { ...state, loading: false, error: action.payload, success: false };
    default:
      return state;
  }
}

function isoDateOffset(isoDate, days) {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().split("T")[0];
}

function toIsoDate(value) {
  if (!value) return null;
  const raw = String(value).trim();
  if (!raw) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().split("T")[0];
}

function numberOrNull(value) {
  if (value == null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeStructuredDay(day) {
  const workoutDate = toIsoDate(day?.date ?? day?.workout_date);
  const workoutType = day?.workout_type ? String(day.workout_type).trim() : "";
  if (!workoutDate || !workoutType) return null;
  return {
    workout_date: workoutDate,
    workout_type: workoutType,
    distance_km: numberOrNull(day?.distance_km),
    duration_min: numberOrNull(day?.duration_min),
    description: day?.description ? String(day.description) : null,
    completed: false,
  };
}

function inferWorkoutTypeFromText(text) {
  const value = String(text || "").toLowerCase();
  if (!value) return "Easy";
  if (value.includes("rest") || value.includes("off")) return "Rest";
  if (value.includes("long")) return "Long Run";
  if (value.includes("tempo") || value.includes("threshold")) return "Tempo";
  if (value.includes("interval") || value.includes("hill") || value.includes("vo2")) return "Intervals";
  if (value.includes("recover")) return "Recovery";
  if (value.includes("strength") || value.includes("gym")) return "Strength";
  if (value.includes("cross") || value.includes("bike") || value.includes("swim")) return "Cross-Train";
  return "Easy";
}

function normalizeLongTermWeek(week) {
  const weekStart = toIsoDate(week?.week_start);
  const weekEnd = toIsoDate(week?.week_end);
  if (!weekStart || !weekEnd) return null;
  const keyWorkouts = Array.isArray(week?.key_workouts)
    ? week.key_workouts.map((item) => String(item ?? "").trim()).filter(Boolean).slice(0, 4)
    : [];
  return {
    week_start: weekStart,
    week_end: weekEnd,
    phase_focus: week?.phase_focus ? String(week.phase_focus).trim() : "",
    target_km: numberOrNull(week?.target_km),
    key_workouts: keyWorkouts,
    notes: week?.notes ? String(week.notes).trim() : "",
  };
}

function buildStructuredDaysFromLongTermWeek(week) {
  const offsets = [1, 3, 5, 6];
  const workouts = week.key_workouts.length ? week.key_workouts : ["Easy aerobic volume"];
  const workoutsPerWeek = workouts.slice(0, offsets.length);
  const perWorkoutDistance = week.target_km != null && workoutsPerWeek.length > 0
    ? Number((week.target_km / workoutsPerWeek.length).toFixed(1))
    : null;

  return workoutsPerWeek.map((workoutText, index) => {
    const proposedDate = isoDateOffset(week.week_start, offsets[index]);
    const workoutDate = proposedDate > week.week_end ? week.week_end : proposedDate;
    const workoutType = inferWorkoutTypeFromText(workoutText);
    const detailParts = [week.phase_focus, workoutText, week.notes].filter(Boolean);
    return {
      workout_date: workoutDate,
      workout_type: workoutType,
      distance_km: workoutType === "Rest" ? null : perWorkoutDistance,
      duration_min: null,
      description: detailParts.join(" | ").slice(0, 500) || null,
      completed: false,
    };
  }).filter((day) => day.workout_type !== "Rest");
}

export function useWorkoutEntries(userId) {
  const client = useMemo(() => getSupabaseClient(), []);
  const [state, dispatch] = useReducer(reducer, initialState);

  const loadEntriesForWeek = useCallback(
    async (planId, weekStartIso) => {
      if (!client || !planId || !weekStartIso) return [];
      const weekEndIso = isoDateOffset(weekStartIso, 6);
      dispatch({ type: "pending" });
      const { data, error } = await client
        .from("workout_entries")
        .select("*")
        .eq("plan_id", planId)
        .gte("workout_date", weekStartIso)
        .lte("workout_date", weekEndIso)
        .order("workout_date", { ascending: true });
      if (error) {
        dispatch({ type: "error", payload: error });
        throw error;
      }
      dispatch({ type: "loaded", payload: data ?? [] });
      return data ?? [];
    },
    [client],
  );

  const loadEntriesForRange = useCallback(
    async (planId, startIso, endIso) => {
      if (!client || !planId || !startIso || !endIso) return [];
      dispatch({ type: "pending" });
      const { data, error } = await client
        .from("workout_entries")
        .select("*")
        .eq("plan_id", planId)
        .gte("workout_date", startIso)
        .lte("workout_date", endIso)
        .order("workout_date", { ascending: true });
      if (error) {
        dispatch({ type: "error", payload: error });
        throw error;
      }
      dispatch({ type: "loaded", payload: data ?? [] });
      return data ?? [];
    },
    [client],
  );

  const createEntry = useCallback(
    async (entry) => {
      if (!client) throw new Error("Supabase is not configured");
      if (!userId) throw new Error("User is required to create a workout entry");
      dispatch({ type: "pending" });
      const payload = { ...entry, user_id: userId };
      const { data, error } = await client
        .from("workout_entries")
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

  const updateEntry = useCallback(
    async (id, patch) => {
      if (!client) throw new Error("Supabase is not configured");
      dispatch({ type: "pending" });
      const { data, error } = await client
        .from("workout_entries")
        .update({ ...patch, updated_at: new Date().toISOString() })
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

  const deleteEntry = useCallback(
    async (id) => {
      if (!client) throw new Error("Supabase is not configured");
      dispatch({ type: "pending" });
      const { error } = await client.from("workout_entries").delete().eq("id", id);
      if (error) {
        dispatch({ type: "error", payload: error });
        throw error;
      }
      dispatch({ type: "deleted", payload: id });
    },
    [client],
  );

  const toggleCompleted = useCallback(
    (id, current) => updateEntry(id, { completed: !current }),
    [updateEntry],
  );

  const applyStructuredPlan = useCallback(
    async (planId, structuredPlan = []) => {
      if (!client) throw new Error("Supabase is not configured");
      if (!userId) throw new Error("User is required to apply a workout plan");
      if (!planId) throw new Error("Plan is required to apply a workout plan");

      const normalized = (Array.isArray(structuredPlan) ? structuredPlan : [])
        .map(normalizeStructuredDay)
        .filter(Boolean);
      if (normalized.length === 0) {
        throw new Error("No valid structured workout days were provided.");
      }

      const startDate = normalized.reduce(
        (min, day) => (day.workout_date < min ? day.workout_date : min),
        normalized[0].workout_date,
      );
      const endDate = normalized.reduce(
        (max, day) => (day.workout_date > max ? day.workout_date : max),
        normalized[0].workout_date,
      );

      dispatch({ type: "pending" });

      const { error: deleteError } = await client
        .from("workout_entries")
        .delete()
        .eq("plan_id", planId)
        .gte("workout_date", startDate)
        .lte("workout_date", endDate);
      if (deleteError) {
        dispatch({ type: "error", payload: deleteError });
        throw deleteError;
      }

      const rowsToInsert = normalized
        .filter((day) => day.workout_type !== "Rest")
        .map((day) => ({
          plan_id: planId,
          user_id: userId,
          ...day,
        }));

      let inserted = [];
      if (rowsToInsert.length > 0) {
        const { data, error: insertError } = await client
          .from("workout_entries")
          .insert(rowsToInsert)
          .select();
        if (insertError) {
          dispatch({ type: "error", payload: insertError });
          throw insertError;
        }
        inserted = data ?? [];
      }

      const nextEntries = [
        ...state.entries.filter(
          (entry) =>
            entry.plan_id !== planId ||
            entry.workout_date < startDate ||
            entry.workout_date > endDate,
        ),
        ...inserted,
      ].sort((a, b) => new Date(a.workout_date) - new Date(b.workout_date));

      dispatch({ type: "loaded", payload: nextEntries });
      return inserted;
    },
    [client, userId, state.entries],
  );

  const applyLongTermWeeklyStructure = useCallback(
    async (planId, weeklyStructure = []) => {
      if (!client) throw new Error("Supabase is not configured");
      if (!userId) throw new Error("User is required to apply a workout plan");
      if (!planId) throw new Error("Plan is required to apply a workout plan");

      const normalizedWeeks = (Array.isArray(weeklyStructure) ? weeklyStructure : [])
        .map(normalizeLongTermWeek)
        .filter(Boolean)
        .sort((a, b) => a.week_start.localeCompare(b.week_start));

      if (normalizedWeeks.length === 0) {
        throw new Error("No valid long-term weeks were provided.");
      }

      const startDate = normalizedWeeks[0].week_start;
      const endDate = normalizedWeeks.reduce(
        (max, week) => (week.week_end > max ? week.week_end : max),
        normalizedWeeks[0].week_end,
      );

      dispatch({ type: "pending" });

      const { error: deleteError } = await client
        .from("workout_entries")
        .delete()
        .eq("plan_id", planId)
        .gte("workout_date", startDate)
        .lte("workout_date", endDate);
      if (deleteError) {
        dispatch({ type: "error", payload: deleteError });
        throw deleteError;
      }

      const rowsToInsert = normalizedWeeks
        .flatMap(buildStructuredDaysFromLongTermWeek)
        .map((day) => ({
          plan_id: planId,
          user_id: userId,
          ...day,
        }));

      let inserted = [];
      if (rowsToInsert.length > 0) {
        const { data, error: insertError } = await client
          .from("workout_entries")
          .insert(rowsToInsert)
          .select();
        if (insertError) {
          dispatch({ type: "error", payload: insertError });
          throw insertError;
        }
        inserted = data ?? [];
      }

      const nextEntries = [
        ...state.entries.filter(
          (entry) =>
            entry.plan_id !== planId ||
            entry.workout_date < startDate ||
            entry.workout_date > endDate,
        ),
        ...inserted,
      ].sort((a, b) => new Date(a.workout_date) - new Date(b.workout_date));

      dispatch({ type: "loaded", payload: nextEntries });
      return inserted;
    },
    [client, userId, state.entries],
  );

  return {
    entries: state.entries,
    loading: state.loading,
    error: state.error,
    success: state.success,
    loadEntriesForWeek,
    loadEntriesForRange,
    createEntry,
    updateEntry,
    deleteEntry,
    toggleCompleted,
    applyStructuredPlan,
    applyLongTermWeeklyStructure,
  };
}
