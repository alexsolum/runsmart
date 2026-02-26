import React from "react";

const TABS = [
  { key: "mobile", tab: "analytics", icon: "📊", label: "Analytics" },
  { key: "mobile", tab: "week",      icon: "📅", label: "Week"      },
  { key: "coach",  tab: null,        icon: "🏃", label: "Coach"     },
];

export default function MobileNavBar({ activePage, activeMobileTab, onNavigate }) {
  return (
    <nav className="mobile-nav-bar" aria-label="Mobile navigation">
      {TABS.map(({ key, tab, icon, label }) => {
        const isActive =
          key === "mobile"
            ? activePage === "mobile" && activeMobileTab === tab
            : activePage === key;
        return (
          <button
            key={`${key}-${tab ?? "page"}`}
            type="button"
            className={`mobile-nav-tab${isActive ? " is-active" : ""}`}
            onClick={() => onNavigate(key, tab)}
            aria-label={label}
          >
            <span className="mobile-nav-tab__icon" aria-hidden="true">{icon}</span>
            <span>{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
