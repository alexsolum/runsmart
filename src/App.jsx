import React, { useEffect, useMemo, useState } from "react";
import { AppDataProvider, useAppData } from "./context/AppDataContext";
import { useI18n } from "./i18n/translations";
import AuthPage from "./pages/AuthPage";
import HeroPage from "./pages/HeroPage";
import LongTermPlanPage from "./pages/LongTermPlanPage";
import WeeklyPlanPage from "./pages/WeeklyPlanPage";
import CoachPage from "./pages/CoachPage";
import RoadmapPage from "./pages/RoadmapPage";
import DataPage from "./pages/DataPage";
import InsightsPage from "./pages/InsightsPage";
import DailyLogPage from "./pages/DailyLogPage";
import MobilePage from "./pages/MobilePage";
import MobileNavBar from "./components/MobileNavBar";
import LanguageSwitcher from "./components/LanguageSwitcher";
import {
  LayoutDashboard,
  Calendar,
  CalendarDays,
  MessageSquare,
  BarChart3,
  ClipboardList,
  Database,
  Map,
  Menu,
  Search,
  Bell,
  Smartphone,
} from "lucide-react";

// Static nav structure — labels are i18n keys, translated at render time
const NAV_GROUPS = [
  {
    labelKey: "nav.general",
    items: [
      { key: "dashboard", labelKey: "sidebar.dashboard", icon: LayoutDashboard, component: HeroPage },
      { key: "training-plan", labelKey: "nav.trainingPlan", icon: Calendar, component: LongTermPlanPage },
      { key: "weekly-plan", labelKey: "nav.weeklyPlan", icon: CalendarDays, component: WeeklyPlanPage },
      { key: "coach", labelKey: "sidebar.coach", icon: MessageSquare, component: CoachPage },
      { key: "insights", labelKey: "sidebar.insights", icon: BarChart3, component: InsightsPage },
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

const ALL_NAV_ITEMS = NAV_GROUPS.flatMap((g) => g.items);

function Shell() {
  const { auth, plans, activities, checkins } = useAppData();
  const { t } = useI18n();
  const [activePage, setActivePage] = useState(ALL_NAV_ITEMS[0].key);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState("analytics");

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

  const activeNavItem = useMemo(
    () => ALL_NAV_ITEMS.find((item) => item.key === activePage) ?? ALL_NAV_ITEMS[0],
    [activePage],
  );
  const ActiveComponent = activeNavItem.component;

  return (
    <div className="app-shell">
      <aside className={`app-sidebar ${menuOpen ? "is-open" : ""}`}>
        {/* Brand */}
        <div className="flex items-center gap-2 px-3 mb-6">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-sm">R</div>
          <span className="font-serif text-white font-bold text-lg">RunSmart</span>
        </div>

        {/* Grouped navigation */}
        <nav className="flex flex-col gap-6 flex-1" aria-label="Main navigation">
          {NAV_GROUPS.map((group) => (
            <div key={group.labelKey}>
              <p className="px-3 mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                {t(group.labelKey)}
              </p>
              <div className="flex flex-col gap-1">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = item.key === activePage;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors w-full text-left ${
                        isActive
                          ? "bg-white/10 text-white"
                          : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
                      }`}
                      onClick={() => {
                        setActivePage(item.key);
                        setMenuOpen(false);
                      }}
                    >
                      <Icon size={18} strokeWidth={1.8} />
                      {t(item.labelKey)}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* User footer */}
        <div className="border-t border-slate-700 pt-4 mt-auto">
          <p className="text-xs text-slate-500 px-3 truncate mb-2">{auth.user.email}</p>
          <button
            type="button"
            className="w-full text-left text-xs text-slate-400 hover:text-slate-200 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors"
            onClick={auth.signOut}
          >
            {t("nav.signout")}
          </button>
          <div className="px-3 pt-3">
            <LanguageSwitcher />
          </div>
        </div>
      </aside>

      <div className="app-content-wrap">
        <header className="app-topbar">
          <button
            className="app-menu-btn lg:hidden"
            type="button"
            onClick={() => setMenuOpen((prev) => !prev)}
          >
            <Menu size={18} />
          </button>

          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm">
            <span className="text-slate-400">{t("nav.pages")}</span>
            <span className="text-slate-300">/</span>
            <span className="font-semibold text-slate-800">
              {t(activeNavItem.labelKey ?? "sidebar.dashboard")}
            </span>
          </div>

          {/* Right-side controls */}
          <div className="ml-auto flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-slate-500">
              <Search size={14} />
              <span>{t("nav.search")}</span>
            </div>
            <button type="button" className="relative p-2 rounded-lg hover:bg-slate-100 transition-colors">
              <Bell size={18} className="text-slate-500" />
            </button>
          </div>
        </header>

        <main className="flex-1 min-h-0 overflow-y-auto">
          <ActiveComponent defaultTab={activePage === "mobile" ? mobileTab : undefined} />
        </main>
      </div>

      <MobileNavBar
        activePage={activePage}
        activeMobileTab={mobileTab}
        onNavigate={(pageKey, tab) => {
          setActivePage(pageKey);
          if (tab) setMobileTab(tab);
          setMenuOpen(false);
        }}
      />

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
