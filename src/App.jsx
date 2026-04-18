import React, { useEffect, useMemo, useState } from "react";
import { AppDataProvider, useAppData } from "./context/AppDataContext";
import { ToastProvider } from "./context/ToastContext";
import AuthPage from "./pages/AuthPage";
import HeroPage from "./pages/HeroPage";
import IntelligencePage from "./pages/IntelligencePage";
import LongTermPlanPage from "./pages/LongTermPlanPage";
import RoadmapPage from "./pages/RoadmapPage";
import DataPage from "./pages/DataPage";
import InsightsPage from "./pages/InsightsPage";
import DailyLogPage from "./pages/DailyLogPage";
import MobilePage from "./pages/MobilePage";
import RacePage from "./pages/RacePage";
import MobileNavBar from "./components/MobileNavBar";
import EditorialRail from "./components/shell/EditorialRail";
import ChapterBar from "./components/shell/ChapterBar";
import AICoachRail from "./components/ai/AICoachRail";
import { APP_NAVIGATE_EVENT } from "./lib/appNavigation";
import {
  BrainCircuit,
  Calendar,
  BarChart3,
  ClipboardList,
  Database,
  Map,
  Smartphone,
  Trophy,
} from "lucide-react";

// Static nav structure — labels are i18n keys, translated at render time
const NAV_GROUPS = [
  {
    labelKey: "nav.general",
    items: [
      { key: "intelligence", labelKey: "nav.intelligence", icon: BrainCircuit, component: IntelligencePage },
      { key: "training-plan", labelKey: "nav.trainingPlan", icon: Calendar, component: LongTermPlanPage },
      { key: "insights", labelKey: "sidebar.insights", icon: BarChart3, component: InsightsPage },
      { key: "races", labelKey: "sidebar.races", icon: Trophy, component: RacePage },
    ],
  },
  {
    labelKey: "nav.other",
    items: [
      { key: "daily-log", labelKey: "nav.dailyLog", icon: ClipboardList, component: DailyLogPage },
      { key: "data", labelKey: "sidebar.data", icon: Database, component: DataPage },
      { key: "roadmap", labelKey: "sidebar.roadmap", icon: Map, component: RoadmapPage },
      { key: "mobile", labelKey: "nav.mobile", icon: Smartphone, component: MobilePage },
    ],
  },
];

function Shell() {
  const { auth, plans, activities, checkins, races } = useAppData();
  const [activePage, setActivePage] = useState("intelligence");
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState("analytics");

  const allNavItems = useMemo(() => NAV_GROUPS.flatMap((g) => g.items), []);

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
      } catch (loadError) {
        console.error("Failed to load initial app data", loadError);
      }
    };

    loadAll();
  }, [auth.user?.id, plans.loadPlans, activities.loadActivities, checkins.loadCheckins, races.loadRaces]);

  const activeNavItem = useMemo(
    () => allNavItems.find((item) => item.key === activePage) ?? allNavItems[0],
    [activePage, allNavItems],
  );
  const ActiveComponent = activeNavItem.component;

  useEffect(() => {
    function handleAppNavigate(event) {
      const pageKey = event?.detail?.pageKey;
      const mobileTab = event?.detail?.mobileTab;
      if (pageKey) setActivePage(pageKey);
      if (mobileTab) setMobileTab(mobileTab);
      setMenuOpen(false);
    }

    window.addEventListener(APP_NAVIGATE_EVENT, handleAppNavigate);
    return () => window.removeEventListener(APP_NAVIGATE_EVENT, handleAppNavigate);
  }, []);

  return (
    <div className="app-shell">
      <EditorialRail
        activePage={activePage}
        onNavigate={setActivePage}
        navGroups={NAV_GROUPS}
        isOpen={menuOpen}
        onClose={() => setMenuOpen(false)}
      />

      <div className="app-content-wrap">
        <ChapterBar
          activePage={activePage}
          onMenuToggle={() => setMenuOpen((prev) => !prev)}
        />

        <main className="flex-1 min-h-0 overflow-y-auto">
          <ActiveComponent defaultTab={activePage === "mobile" ? mobileTab : undefined} />
        </main>
      </div>

      <AICoachRail activePage={activePage} />

      <MobileNavBar
        activePage={activePage}
        activeMobileTab={mobileTab}
        onNavigate={(pageKey, tab) => {
          setActivePage(pageKey);
          if (tab) setMobileTab(tab);
          setMenuOpen(false);
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
