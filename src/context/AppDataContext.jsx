import React, { createContext, useContext, useMemo } from "react";
import { useAuth } from "../hooks/useAuth";
import { useActivities } from "../hooks/useActivities";
import { useCheckins } from "../hooks/useCheckins";
import { usePlans } from "../hooks/usePlans";
import { useStrava } from "../hooks/useStrava";
import { useTrainingBlocks } from "../hooks/useTrainingBlocks";
import { useWorkoutEntries } from "../hooks/useWorkoutEntries";

const AppDataContext = createContext(null);

export function AppDataProvider({ children }) {
  const auth = useAuth();
  const userId = auth.user?.id;
  const plans = usePlans(userId);
  const activities = useActivities(userId);
  const checkins = useCheckins(userId);
  const strava = useStrava(userId, auth.session, async () => {
    await activities.loadActivities({ limit: 20, ascending: false });
  });
  const trainingBlocks = useTrainingBlocks(userId);
  const workoutEntries = useWorkoutEntries(userId);

  const value = useMemo(
    () => ({
      auth,
      plans,
      activities,
      checkins,
      strava,
      trainingBlocks,
      workoutEntries,
    }),
    [auth, plans, activities, checkins, strava, trainingBlocks, workoutEntries],
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
