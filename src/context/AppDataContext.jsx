import React, { createContext, useCallback, useContext, useMemo } from "react";
import { useAuth } from "../hooks/useAuth";
import { useActivities } from "../hooks/useActivities";
import { useCheckins } from "../hooks/useCheckins";
import { useDailyLogs } from "../hooks/useDailyLogs";
import { usePlans } from "../hooks/usePlans";
import { useStrava } from "../hooks/useStrava";
import { useTrainingBlocks } from "../hooks/useTrainingBlocks";
import { useWorkoutEntries } from "../hooks/useWorkoutEntries";
import { useRunnerProfile } from "../hooks/useRunnerProfile";
import { useCoachConversations } from "../hooks/useCoachConversations";
import { useHierarchicalPlan } from "../hooks/useHierarchicalPlan";
import { useRaces } from "../hooks/useRaces";
import { invokeEdgeFunctionWithSessionRetry } from "../lib/edgeFunctionAuth";
import { useToast } from "./ToastContext";
import { normalizeCheckin } from "../lib/coachPayload";

const AppDataContext = createContext(null);

export function AppDataProvider({ children }) {
  const auth = useAuth();
  const { showToast, dismissToast } = useToast();
  const userId = auth.user?.id;
  const plans = usePlans(userId);
  const activities = useActivities(userId);
  const checkins = useCheckins(userId);
  const wrappedLoadCheckins = useCallback(async (...args) => {
    const rows = await checkins.loadCheckins?.(...args);
    return (rows ?? []).map(normalizeCheckin);
  }, [checkins.loadCheckins]);

  const wrappedCreateCheckin = useCallback(async (...args) => {
    const row = await checkins.createCheckin?.(...args);
    return normalizeCheckin(row);
  }, [checkins.createCheckin]);

  const normalizedCheckins = useMemo(
    () => ({
      ...checkins,
      checkins: (checkins.checkins ?? []).map(normalizeCheckin),
      loadCheckins: wrappedLoadCheckins,
      createCheckin: wrappedCreateCheckin,
    }),
    [checkins, wrappedLoadCheckins, wrappedCreateCheckin],
  );
  const dailyLogs = useDailyLogs(userId);
  const strava = useStrava(userId, auth.session, async () => {
    await activities.loadActivities({ limit: 20, ascending: false });
  }, auth.client);
  const trainingBlocks = useTrainingBlocks(userId);
  const workoutEntries = useWorkoutEntries(userId);
  const runnerProfile = useRunnerProfile(userId);
  const coachConversations = useCoachConversations(userId);
  const hierarchicalPlan = useHierarchicalPlan(userId);
  const races = useRaces(userId);
  const invokeInsightsSynthesis = useCallback(
    async (payload) => {
      const client = auth.client;
      if (!client) {
        throw new Error("Supabase is not configured.");
      }

      const { data, error } = await invokeEdgeFunctionWithSessionRetry(client, "claude-coach", {
        body: { mode: "insights_synthesis", ...payload },
      });

      if (error) {
        throw error;
      }

      return data;
    },
    [auth.client, auth.session],
  );

  const value = useMemo(
    () => ({
      auth,
      plans,
      activities,
      checkins: normalizedCheckins,
      dailyLogs,
      strava,
      trainingBlocks,
      workoutEntries,
      runnerProfile,
      coachConversations,
      hierarchicalPlan,
      races,
      invokeInsightsSynthesis,
      showToast,
      dismissToast,
    }),
    [auth, plans, activities, normalizedCheckins, dailyLogs, strava, trainingBlocks, workoutEntries, runnerProfile, coachConversations, hierarchicalPlan, races, invokeInsightsSynthesis, showToast, dismissToast],
  );

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData() {
  const context = useContext(AppDataContext);
  if (!context) {
    throw new Error("useAppData must be used inside AppDataProvider");
  }
  return context;
}
