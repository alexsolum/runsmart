import React from "react";
import HeroToday from "../components/dashboard/HeroToday";
import ReadinessPanel from "../components/dashboard/ReadinessPanel";
import SeasonPlanCard from "../components/dashboard/SeasonPlanCard";

export default function IntelligencePage() {
  return (
    <div className="canvas" id="intelligence">
      <div style={{ gridColumn: "span 12", display: "flex", flexDirection: "column", gap: 22 }}>
        <HeroToday />
        <ReadinessPanel />
        <SeasonPlanCard />
      </div>
    </div>
  );
}

export function __resetInsightsSynthesisCacheForTests() {
  if (typeof localStorage === "undefined") return;
  const prefix = "runsmart-insights-synthesis";
  const keys = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(prefix)) keys.push(key);
  }
  keys.forEach((key) => localStorage.removeItem(key));
}
