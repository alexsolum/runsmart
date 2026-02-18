import React, { createContext, useContext, useMemo } from "react";
import { useAuth } from "../hooks/useAuth";
import { useActivities } from "../hooks/useActivities";
import { useCheckins } from "../hooks/useCheckins";
import { usePlans } from "../hooks/usePlans";
import { useStrava } from "../hooks/useStrava";

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

  const value = useMemo(
    () => ({
      auth,
      plans,
      activities,
      checkins,
      strava,
    }),
    [auth, plans, activities, checkins, strava],
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
