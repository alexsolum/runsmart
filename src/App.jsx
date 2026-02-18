import React, { useEffect, useMemo, useState } from "react";
import { AppDataProvider, useAppData } from "./context/AppDataContext";
import HeroPage from "./pages/HeroPage";
import PlanningPage from "./pages/PlanningPage";
import CoachPage from "./pages/CoachPage";
import RoadmapPage from "./pages/RoadmapPage";
import DataPage from "./pages/DataPage";
import InsightsPage from "./pages/InsightsPage";

const NAV_ITEMS = [
  { key: "dashboard", label: "Dashboard", component: HeroPage },
  { key: "planning", label: "Planning", component: PlanningPage },
  { key: "coach", label: "Coach", component: CoachPage },
  { key: "insights", label: "Insights", component: InsightsPage },
  { key: "data", label: "Data", component: DataPage },
  { key: "roadmap", label: "Roadmap", component: RoadmapPage },
];

function Shell() {
  const { auth, plans, activities, checkins } = useAppData();
  const [activePage, setActivePage] = useState(NAV_ITEMS[0].key);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!auth.user) return;
    plans.loadPlans();
    activities.loadActivities({ limit: 20, ascending: false });
    checkins.loadCheckins();
  }, [auth.user, plans, activities, checkins]);

  const ActiveComponent = useMemo(
    () => NAV_ITEMS.find((item) => item.key === activePage)?.component ?? HeroPage,
    [activePage],
  );

  return (
    <div className="app-shell">
      <aside className={`app-sidebar ${menuOpen ? "is-open" : ""}`}>
        <div className="app-sidebar__brand">RunSmart</div>
        <nav className="app-sidebar__nav" aria-label="Main navigation">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.key}
              className={`app-sidebar__link ${item.key === activePage ? "is-active" : ""}`}
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
        <div className="app-sidebar__meta">
          {auth.loading && <p>Loading account…</p>}
          {!auth.loading && auth.user && <p>{auth.user.email}</p>}
          {!auth.loading && !auth.user && <p>Not signed in</p>}
        </div>
      </aside>

      <div className="app-content-wrap">
        <header className="app-topbar">
          <button className="app-menu-btn" type="button" onClick={() => setMenuOpen((prev) => !prev)}>
            ☰
          </button>
          <h1>RunSmart</h1>
        </header>

        <main className="app-content">
          <ActiveComponent />
        </main>
      </div>

      {menuOpen && <button className="app-overlay" type="button" onClick={() => setMenuOpen(false)} aria-label="Close menu" />}
    </div>
  );
}

export default function App() {
  return (
    <AppDataProvider>
      <Shell />
    </AppDataProvider>
  );
}
