import { useCallback, useEffect, useMemo, useReducer } from "react";
import { invokeEdgeFunctionWithSessionRetry } from "../lib/edgeFunctionAuth";
import { getSupabaseClient } from "../lib/supabaseClient";

const initialState = {
  plan: null,           // single hierarchical_plans row (or null)
  loading: false,       // initial fetch in progress
  generating: false,    // claude-coach call in progress
  error: null,
  planSessionId: null,  // session ID for the active plan intake Q&A session
};

function reducer(state, action) {
  switch (action.type) {
    case "pending":
      return { ...state, loading: true, error: null };
    case "generating":
      return { ...state, generating: true, error: null };
    case "loaded":
      return { ...state, plan: action.payload, loading: false };
    case "generated":
      return { ...state, plan: action.payload, generating: false };
    case "patched":
      return { ...state, plan: action.payload };
    case "plan_session_started":
      return { ...state, generating: false, planSessionId: action.payload };
    case "error":
      return { ...state, loading: false, generating: false, error: action.payload };
    default:
      return state;
  }
}

export function useHierarchicalPlan(userId) {
  const client = useMemo(() => getSupabaseClient(), []);
  const [state, dispatch] = useReducer(reducer, initialState);

  // ── loadPlan ────────────────────────────────────────────────────────────────
  const loadPlan = useCallback(async () => {
    if (!client) return null;
    dispatch({ type: "pending" });
    const { data, error } = await client
      .from("hierarchical_plans")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      dispatch({ type: "error", payload: error });
      throw error;
    }
    dispatch({ type: "loaded", payload: data ?? null });
    return data ?? null;
  }, [client, userId]);

  // ── generatePlan (legacy — kept for backwards compatibility) ─────────────
  const generatePlan = useCallback(async (payload) => {
    if (!client) throw new Error("Supabase is not configured");

    // a. Synchronous generating flag
    dispatch({ type: "generating" });

    try {
      // b. Get session
      // c. Deactivate old active plans
      await client
        .from("hierarchical_plans")
        .update({ status: "replaced" })
        .eq("user_id", userId)
        .eq("status", "active");

      // d. Call claude-coach Edge Function
      const { data: invokeData, error: invokeError } = await invokeEdgeFunctionWithSessionRetry(client, "claude-coach", {
        body: payload,
      });

      if (invokeError) throw invokeError;

      // f. Re-fetch the saved row by id
      const { data: savedRow, error: fetchError } = await client
        .from("hierarchical_plans")
        .select("*")
        .eq("id", invokeData.id)
        .single();

      if (fetchError) throw fetchError;

      // g. Dispatch generated
      dispatch({ type: "generated", payload: savedRow });
      return savedRow;
    } catch (err) {
      // h. Reset on error
      dispatch({ type: "error", payload: err });
      throw err;
    }
  }, [client, userId]);

  // ── startPlanSession ─────────────────────────────────────────────────────
  const startPlanSession = useCallback(async (payload) => {
    if (!client) throw new Error("Supabase is not configured");
    dispatch({ type: "generating" });
    try {
      // Deactivate old active plans
      await client
        .from("hierarchical_plans")
        .update({ status: "replaced" })
        .eq("user_id", userId)
        .eq("status", "active");

      const sessionId = crypto.randomUUID();

      // Build intake message
      const intake = payload.planIntake || payload; // support both new and old payload shape
      const raceGoal = intake.raceGoal || {};
      const fitness = intake.fitness || {};
      const raceInfo = intake.raceInfo;

      const parts = [
        `The athlete wants to generate a training plan. Here is their intake:`,
        `Race: ${raceGoal.eventName || "Unknown"}, ${raceGoal.eventType || ""}${raceGoal.ultraDistanceKm ? ` (${raceGoal.ultraDistanceKm}km)` : ""}, on ${raceGoal.eventDate || "TBD"}. Goal: ${raceGoal.goalType || "finish"}.`,
        `Current weekly volume: ${fitness.weeklyKm || 0}km. Longest recent run: ${fitness.longestRecentRun ? fitness.longestRecentRun + "km" : "unknown"}.`,
      ];
      if (raceInfo?.keyFacts) parts.push(`Race characteristics: ${raceInfo.keyFacts}.`);
      parts.push(`Please ask your assessment questions now, then generate the full plan once satisfied.`);

      const systemPrompt = `You are an expert running coach. The athlete has submitted an intake form to generate a training plan.
Your job is to ask 1–2 targeted assessment questions to validate your key assumptions before generating
the plan — following the assessment validation approach (see athlete context). Keep questions concise
and specific. After receiving answers (or after 2 exchanges), generate the full plan immediately using
the full-plan response format.`;

      const { data: invokeData, error: invokeError } = await invokeEdgeFunctionWithSessionRetry(client, "claude-coach", {
        body: {
          sessionId,
          newMessage: parts.join("\n"),
          athleteContext: {
            planIntake: intake,
            activePlan: null,
            systemPromptOverride: systemPrompt,
          },
        },
      });

      if (invokeError) throw invokeError;

      // If Claude immediately generated a full plan, handle it
      if (invokeData?.planUpdated) {
        const { data: savedRow } = await client
          .from("hierarchical_plans")
          .select("*")
          .eq("user_id", userId)
          .eq("status", "active")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (savedRow) {
          dispatch({ type: "generated", payload: savedRow });
          return { sessionId, question: null, planGenerated: true };
        }
      }

      if (invokeData?.routeError) throw new Error(invokeData.routeError);

      dispatch({ type: "plan_session_started", payload: sessionId });
      return {
        sessionId,
        question: invokeData?.content || null,
        planGenerated: false,
      };
    } catch (err) {
      dispatch({ type: "error", payload: err });
      throw err;
    }
  }, [client, userId]);

  // ── sendPlanMessage ──────────────────────────────────────────────────────
  const sendPlanMessage = useCallback(async (sessionId, message) => {
    if (!client) throw new Error("Supabase is not configured");
    try {
      const { data: invokeData, error: invokeError } = await invokeEdgeFunctionWithSessionRetry(client, "claude-coach", {
        body: {
          sessionId,
          newMessage: message,
        },
      });

      if (invokeError) throw invokeError;

      // If plan was generated, fetch and save it
      if (invokeData?.planUpdated) {
        const { data: savedRow } = await client
          .from("hierarchical_plans")
          .select("*")
          .eq("user_id", userId)
          .eq("status", "active")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (savedRow) {
          dispatch({ type: "generated", payload: savedRow });
          return { question: null, planGenerated: true };
        }
      }

      if (invokeData?.routeError) throw new Error(invokeData.routeError);

      return { question: invokeData?.content || null, planGenerated: false };
    } catch (err) {
      dispatch({ type: "error", payload: err });
      throw err;
    }
  }, [client, userId]);

  // ── applyPatch ──────────────────────────────────────────────────────────────
  const applyPatch = useCallback(async (patchArray) => {
    if (!client || !state.plan) throw new Error("No active plan");

    const { data, error } = await client.rpc("apply_plan_patch", {
      p_plan_id: state.plan.id,
      p_patches: patchArray,
    });

    if (error) {
      dispatch({ type: "error", payload: error });
      throw error;
    }
    dispatch({ type: "patched", payload: { ...state.plan, plan_data: data } });
    return data;
  }, [client, state.plan]);

  // ── toggleWorkoutCompleted ──────────────────────────────────────────────────
  const toggleWorkoutCompleted = useCallback(async (workoutId, weekNumber, dayDate) => {
    if (!client || !state.plan) throw new Error("No active plan");

    const { data, error } = await client.rpc("toggle_workout_completed", {
      p_plan_id: state.plan.id,
      p_workout_id: workoutId,
      p_week_number: weekNumber,
      p_day_date: dayDate,
    });

    if (error) {
      dispatch({ type: "error", payload: error });
      throw error;
    }
    dispatch({ type: "patched", payload: { ...state.plan, plan_data: data } });
    return data;
  }, [client, state.plan]);

  // ── moveWorkout ─────────────────────────────────────────────────────────────
  const moveWorkout = useCallback(async (workoutId, fromDate, toDate) => {
    if (!client || !state.plan) throw new Error("No active plan");

    // b. No-op when same date
    if (fromDate === toDate) return state.plan;

    const { data, error } = await client.rpc("move_workout", {
      p_plan_id: state.plan.id,
      p_workout_id: workoutId,
      p_from_date: fromDate,
      p_to_date: toDate,
    });

    if (error) {
      dispatch({ type: "error", payload: error });
      throw error;
    }
    dispatch({ type: "patched", payload: { ...state.plan, plan_data: data } });
    return data;
  }, [client, state.plan]);

  // ── addWorkout ──────────────────────────────────────────────────────────────
  const addWorkout = useCallback(async ({ weekNumber, dayDate, workout }) => {
    if (!client || !state.plan) throw new Error("No active plan");

    const currentPlanData = state.plan.plan_data;
    const nextPlanData = {
      ...currentPlanData,
      weeks: (currentPlanData?.weeks ?? []).map((week) => {
        if (week?.weekNumber !== weekNumber) return week;

        return {
          ...week,
          days: (week?.days ?? []).map((day) => {
            if (day?.date !== dayDate) return day;

            const nextWorkout = {
              id: crypto.randomUUID(),
              sport: workout?.sport ?? "",
              type: workout?.type ?? "",
              name: workout?.name ?? "",
              description: workout?.description ?? "",
              durationMinutes: workout?.durationMinutes ?? null,
              distanceKm: workout?.distanceKm ?? null,
              completed: false,
            };

            return {
              ...day,
              workouts: [...(day?.workouts ?? []), nextWorkout],
            };
          }),
        };
      }),
    };

    const { data, error } = await client
      .from("hierarchical_plans")
      .update({
        plan_data: nextPlanData,
        updated_at: new Date().toISOString(),
      })
      .eq("id", state.plan.id)
      .eq("user_id", userId)
      .select("*")
      .single();

    if (error) {
      dispatch({ type: "error", payload: error });
      throw error;
    }

    dispatch({ type: "patched", payload: data });
    return data?.plan_data ?? nextPlanData;
  }, [client, state.plan, userId]);

  // ── deleteWorkout ──────────────────────────────────────────────────────────
  const deleteWorkout = useCallback(async (workoutId, weekNumber, dayDate) => {
    if (!client || !state.plan) throw new Error("No active plan");

    const currentPlanData = state.plan.plan_data;
    const nextPlanData = {
      ...currentPlanData,
      weeks: (currentPlanData?.weeks ?? []).map((week) => {
        if (week?.weekNumber !== weekNumber) return week;

        return {
          ...week,
          days: (week?.days ?? []).map((day) => {
            if (day?.date !== dayDate) return day;

            return {
              ...day,
              workouts: (day?.workouts ?? []).filter((workout) => workout?.id !== workoutId),
            };
          }),
        };
      }),
    };

    const { data, error } = await client
      .from("hierarchical_plans")
      .update({
        plan_data: nextPlanData,
        updated_at: new Date().toISOString(),
      })
      .eq("id", state.plan.id)
      .eq("user_id", userId)
      .select("*")
      .single();

    if (error) {
      dispatch({ type: "error", payload: error });
      throw error;
    }

    dispatch({ type: "patched", payload: data });
    return data?.plan_data ?? nextPlanData;
  }, [client, state.plan, userId]);

  // ── getWeek (pure accessor) ─────────────────────────────────────────────────
  const getWeek = useCallback((weekNumber) => {
    if (!state.plan || !state.plan.plan_data?.weeks) return null;
    return state.plan.plan_data.weeks.find((w) => w.weekNumber === weekNumber) ?? null;
  }, [state.plan]);

  // ── getPhases (pure accessor) ───────────────────────────────────────────────
  const getPhases = useCallback(() => {
    if (!state.plan || !state.plan.plan_data?.phases) return [];
    return state.plan.plan_data.phases;
  }, [state.plan]);

  // ── Eager load effect ───────────────────────────────────────────────────────
  useEffect(() => {
    if (userId) loadPlan();
  }, [userId, loadPlan]);

  return {
    plan: state.plan,
    loading: state.loading,
    generating: state.generating,
    error: state.error,
    planSessionId: state.planSessionId,
    loadPlan,
    generatePlan,
    startPlanSession,
    sendPlanMessage,
    applyPatch,
    toggleWorkoutCompleted,
    moveWorkout,
    addWorkout,
    deleteWorkout,
    getWeek,
    getPhases,
  };
}
