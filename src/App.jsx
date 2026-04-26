import React, { useEffect } from "react";
import { AppDataProvider, useAppData } from "./context/AppDataContext";
import { ToastProvider } from "./context/ToastContext";
import AuthPage from "./pages/AuthPage";
import ControlCenterPage from "./pages/ControlCenterPage";

function ShellBootstrap() {
  const { auth, plans, activities, checkins, races, seasonPlans } = useAppData();

  useEffect(() => {
    if (!auth.user?.id) return;
    const loadAll = async () => {
      try {
        await Promise.all([
          plans.loadPlans(),
          activities.loadActivities({ limit: 200, ascending: false }),
          checkins.loadCheckins(),
          races.loadRaces(),
          seasonPlans.loadPlans(),
        ]);
      } catch (err) {
        console.error("Failed to load initial app data", err);
      }
    };
    loadAll();
  }, [auth.user?.id, plans.loadPlans, activities.loadActivities, checkins.loadCheckins, races.loadRaces, seasonPlans.loadPlans]);

  return <ControlCenterPage />;
}

function AuthGate() {
  const { auth } = useAppData();

  if (auth.loading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-b from-slate-50 to-indigo-50">
        <p className="text-slate-500">Loading…</p>
      </div>
    );
  }

  if (!auth.user) {
    return <AuthPage />;
  }

  return <ShellBootstrap />;
}

export default function App() {
  return (
    <ToastProvider>
      <AppDataProvider>
        <AuthGate />
      </AppDataProvider>
    </ToastProvider>
  );
}
