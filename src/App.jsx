import React, { useEffect, useMemo, useState } from "react";
import { AppDataProvider, useAppData } from "./context/AppDataContext";
import AuthPage from "./pages/AuthPage";
import HeroPage from "./pages/HeroPage";
import LongTermPlanPage from "./pages/LongTermPlanPage";
import WeeklyPlanPage from "./pages/WeeklyPlanPage";
import CoachPage from "./pages/CoachPage";
import RoadmapPage from "./pages/RoadmapPage";
import DataPage from "./pages/DataPage";
import InsightsPage from "./pages/InsightsPage";
import DailyLogPage from "./pages/DailyLogPage";

const NAV_ITEMS = [
  { key: "dashboard", label: "Dashboard", component: HeroPage },
  { key: "training-plan", label: "Training Plan", component: LongTermPlanPage },
  { key: "weekly-plan", label: "Weekly Plan", component: WeeklyPlanPage },
  { key: "coach", label: "Coach", component: CoachPage },
  { key: "insights", label: "Insights", component: InsightsPage },
  { key: "daily-log", label: "Daily Log", component: DailyLogPage },
  { key: "data", label: "Data", component: DataPage },
  { key: "roadmap", label: "Roadmap", component: RoadmapPage },
];

function Shell() {
  const { auth, plans, activities, checkins } = useAppData();
  const [activePage, setActivePage] = useState(NAV_ITEMS[0].key);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!auth.user?.id) return;

    const loadAll = async () => {
      try {
        await Promise.all([
          plans.loadPlans(),
          activities.loadActivities({ limit: 200, ascending: false }),
          checkins.loadCheckins(),
        ]);
      } catch (loadError) {
        console.error("Failed to load initial app data", loadError);
      }
    };

    loadAll();
  }, [auth.user?.id, plans.loadPlans, activities.loadActivities, checkins.loadCheckins]);

  const ActiveComponent = useMemo(
    () => NAV_ITEMS.find((item) => item.key === activePage)?.component ?? HeroPage,
    [activePage],
  );

  return (
    <div className="flex min-h-screen w-full bg-gradient-to-b from-slate-50 to-indigo-50">
      {/* Sidebar */}
      <aside
        className={`w-64 bg-slate-900 text-slate-300 flex flex-col gap-5 px-3.5 py-6 shrink-0
          max-[960px]:fixed max-[960px]:inset-y-0 max-[960px]:left-0 max-[960px]:z-30
          max-[960px]:transition-transform max-[960px]:duration-200
          ${menuOpen ? "max-[960px]:translate-x-0" : "max-[960px]:-translate-x-full"}`}
      >
        <div className="text-white font-bold text-xl px-3">RunSmart</div>
        <nav className="flex flex-col gap-1.5" aria-label="Main navigation">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.key}
              className={`text-left border-0 rounded-xl px-3 py-2.5 bg-transparent text-inherit font-inherit cursor-pointer transition-colors
                ${item.key === activePage
                  ? "bg-slate-300/20 text-white"
                  : "hover:bg-slate-300/20 hover:text-white"}`}
              type="button"
              onClick={() => {
                setActivePage(item.key);
                setMenuOpen(false);
              }}
            >
              {item.label}
            </button>
          ))}
        </nav>
        <div className="mt-auto border-t border-slate-300/30 pt-3 px-3 text-[13px]">
          <p className="text-xs text-slate-400 mb-2 truncate">{auth.user.email}</p>
          <button
            type="button"
            className="w-full text-left border border-slate-300/40 bg-transparent text-slate-400 rounded-lg px-3 py-1.5 text-xs font-inherit cursor-pointer hover:bg-slate-300/15 hover:text-slate-200 transition-colors"
            onClick={auth.signOut}
          >
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content wrapper */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile topbar */}
        <header className="hidden max-[960px]:flex items-center gap-3 px-4 py-3.5 border-b border-slate-200 bg-white/90 backdrop-blur-sm">
          <button
            className="border border-slate-300 bg-white rounded-lg px-2.5 py-1 cursor-pointer"
            type="button"
            onClick={() => setMenuOpen((prev) => !prev)}
          >
            ☰
          </button>
          <h1 className="m-0 text-lg font-bold">RunSmart</h1>
        </header>

        <main className="p-6 max-[960px]:p-4">
          <ActiveComponent />
        </main>
      </div>

      {/* Mobile overlay */}
      {menuOpen && (
        <button
          className="fixed inset-0 border-0 bg-slate-900/35 z-20 max-[960px]:block hidden"
          type="button"
          onClick={() => setMenuOpen(false)}
          aria-label="Close menu"
        />
      )}
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
    <AppDataProvider>
      <AuthGate />
    </AppDataProvider>
  );
}
