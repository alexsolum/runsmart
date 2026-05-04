import React, { useEffect, useState } from "react";
import { useControlCenterData } from "../ControlCenterPage";
import MobileDashboard from "./MobileDashboard";
import MobilePlan from "./MobilePlan";
import MobileCoach from "./MobileCoach";
import { APP_ICON_URL, APP_NAME } from "../../lib/brand";

const STORAGE_KEY = "rs-mobile-tab";

function readStoredTab() {
  try {
    const stored = window.localStorage?.getItem(STORAGE_KEY);
    return ["dashboard", "plan", "coach"].includes(stored) ? stored : "dashboard";
  } catch {
    return "dashboard";
  }
}

function Icon({ name }) {
  if (name === "dashboard") {
    return (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="M4 13h7V4H4v9Z" />
        <path d="M13 20h7V4h-7v16Z" />
        <path d="M4 20h7v-5H4v5Z" />
      </svg>
    );
  }
  if (name === "plan") {
    return (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="M8 3v4" />
        <path d="M16 3v4" />
        <path d="M4 9h16" />
        <path d="M5 5h14v15H5z" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M12 3l2 5 5 2-5 2-2 5-2-5-5-2 5-2 2-5Z" />
      <path d="M19 15l1 2 2 1-2 1-1 2-1-2-2-1 2-1 1-2Z" />
    </svg>
  );
}

const TABS = [
  { id: "dashboard", label: "Oversikt" },
  { id: "plan", label: "Plan" },
  { id: "coach", label: "AI-trener" },
];

export default function MobileApp() {
  const data = useControlCenterData();
  const [tab, setTab] = useState(readStoredTab);

  useEffect(() => {
    try {
      window.localStorage?.setItem(STORAGE_KEY, tab);
    } catch {
      // localStorage may be unavailable in private or test environments.
    }
  }, [tab]);

  let screen;
  if (tab === "plan") {
    screen = <MobilePlan key="plan" season={data.season} planData={data.planData} hierarchicalPlan={data.hierarchicalPlan} />;
  } else if (tab === "coach") {
    screen = <MobileCoach key="coach" load={data.load} season={data.season} goalRace={data.goalRace} />;
  } else {
    screen = (
      <MobileDashboard
        key="dashboard"
        load={data.load}
        weeklyKm={data.weeklyKm}
        season={data.season}
        goalRace={data.goalRace}
        planPageModel={data.planPageModel}
        hierarchicalPlan={data.hierarchicalPlan}
        strava={data.strava}
        consistency={data.consistency}
      />
    );
  }

  const daysToRace = data.goalRace?.daysToRace;

  return (
    <div className="rs-m-app" data-testid="rs-mobile-shell">
      <header className="rs-m-header">
        <div className="rs-m-logo">
          <img className="rs-m-logo-image" src={APP_ICON_URL} alt="" />
          <div className="rs-m-logo-text">{APP_NAME}</div>
        </div>
        <div className="rs-m-header-right">
          {daysToRace != null ? <div className="rs-m-days-chip">{daysToRace}d</div> : null}
          <div className="rs-m-avatar" aria-label={data.athlete?.name ?? "Løper"}>
            {data.athlete?.initials ?? "RS"}
          </div>
        </div>
      </header>

      <main className="rs-m-screen-wrap">{screen}</main>

      <nav className="rs-m-bottom-nav" aria-label="Mobilnavigasjon">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`rs-m-nav-item ${tab === item.id ? "is-active" : ""}`}
            aria-current={tab === item.id ? "page" : undefined}
            onClick={() => setTab(item.id)}
          >
            <span className="rs-m-nav-icon">
              <Icon name={item.id} />
            </span>
            <span className="rs-m-nav-label">{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
