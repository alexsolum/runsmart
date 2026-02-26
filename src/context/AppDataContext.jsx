import React, { createContext, useContext, useMemo } from "react";
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

const AppDataContext = createContext(null);

export function AppDataProvider({ children }) {
  const auth = useAuth();
  const userId = auth.user?.id;
  const plans = usePlans(userId);
  const activities = useActivities(userId);
  const checkins = useCheckins(userId);
  const dailyLogs = useDailyLogs(userId);
  const strava = useStrava(userId, auth.session, async () => {
    await activities.loadActivities({ limit: 20, ascending: false });
  });
  const trainingBlocks = useTrainingBlocks(userId);
  const workoutEntries = useWorkoutEntries(userId);
  const runnerProfile = useRunnerProfile(userId);
  const coachConversations = useCoachConversations(userId);

  const value = useMemo(
    () => ({
      auth,
      plans,
      activities,
      checkins,
      dailyLogs,
      strava,
      trainingBlocks,
      workoutEntries,
      runnerProfile,
      coachConversations,
    }),
    [auth, plans, activities, checkins, dailyLogs, strava, trainingBlocks, workoutEntries, runnerProfile, coachConversations],
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
