import React, { useEffect, useState } from "react";
import { AppDataProvider, useAppData } from "./context/AppDataContext";
import { ToastProvider } from "./context/ToastContext";
import AuthPage from "./pages/AuthPage";
import IntelligencePage from "./pages/IntelligencePage";
import LongTermPlanPage from "./pages/LongTermPlanPage";
import RoadmapPage from "./pages/RoadmapPage";
import DataPage from "./pages/DataPage";
import InsightsPage from "./pages/InsightsPage";
import DailyLogPage from "./pages/DailyLogPage";
import MobilePage from "./pages/MobilePage";
import RacePage from "./pages/RacePage";
import MobileNavBar from "./components/MobileNavBar";
import Sidebar from "./components/shell/Sidebar";
import Topbar from "./components/shell/Topbar";
import CoachDock from "./components/shell/CoachDock";
import { APP_NAVIGATE_EVENT } from "./lib/appNavigation";

const PAGE_COMPONENTS = {
  intelligence:   IntelligencePage,
  "training-plan": LongTermPlanPage,
  insights:       InsightsPage,
  races:          RacePage,
  "daily-log":    DailyLogPage,
  data:           DataPage,
  roadmap:        RoadmapPage,
  mobile:         MobilePage,
};

function Shell() {
  const { auth, plans, activities, checkins, races } = useAppData();
  const [activePage, setActivePage] = useState("intelligence");
  const [mobileTab, setMobileTab] = useState("analytics");

  useEffect(() => {
    if (!auth.user?.id) return;
    const loadAll = async () => {
      try {
        await Promise.all([
          plans.loadPlans(),
          activities.loadActivities({ limit: 200, ascending: false }),
          checkins.loadCheckins(),
          races.loadRaces(),
        ]);
      } catch (err) {
        console.error("Failed to load initial app data", err);
      }
    };
    loadAll();
  }, [auth.user?.id, plans.loadPlans, activities.loadActivities, checkins.loadCheckins, races.loadRaces]);

  const ActiveComponent = PAGE_COMPONENTS[activePage] ?? IntelligencePage;

  useEffect(() => {
    function handleAppNavigate(event) {
      const pageKey = event?.detail?.pageKey;
      const tab = event?.detail?.mobileTab;
      if (pageKey) setActivePage(pageKey);
      if (tab) setMobileTab(tab);
    }
    window.addEventListener(APP_NAVIGATE_EVENT, handleAppNavigate);
    return () => window.removeEventListener(APP_NAVIGATE_EVENT, handleAppNavigate);
  }, []);

  return (
    <div className="app">
      <Sidebar activePage={activePage} onNavigate={setActivePage} />

      <div className="main">
        <Topbar activePage={activePage} />

        <main className="flex-1 min-h-0 overflow-y-auto">
          <ActiveComponent defaultTab={activePage === "mobile" ? mobileTab : undefined} />
        </main>
      </div>

      <CoachDock />

      <MobileNavBar
        activePage={activePage}
        activeMobileTab={mobileTab}
        onNavigate={(pageKey, tab) => {
          setActivePage(pageKey);
          if (tab) setMobileTab(tab);
        }}
      />
    </div>
  );
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

  return <Shell />;
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
