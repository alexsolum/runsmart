import React, { useEffect, useMemo, useState } from "react";
import { useAppData } from "../context/AppDataContext";

const STORAGE_KEY = "runsmart.dashboard.filters";
const DATE_FILTERS = [
  { key: "week", label: "Week" },
  { key: "month", label: "Month" },
];
const TYPE_FILTERS = ["All", "Run", "Ride", "Workout"];
const TIMELINE_FILTERS = ["Today", "Week", "Month"];
const OVERLAY_FILTERS = [
  { key: "distance", label: "Distance" },
  { key: "load", label: "Load" },
  { key: "pace", label: "Pace" },
];

function getDateFilterRange(filter) {
  const now = new Date();
  const start = new Date(now);
  if (filter === "week") {
    const day = start.getDay() || 7;
    start.setDate(start.getDate() - day + 1);
  } else {
    start.setDate(start.getDate() - 30);
  }
  start.setHours(0, 0, 0, 0);
  return { start, end: now };
}

function formatDistance(meters) {
  if (!meters) return "—";
  return `${(meters / 1000).toFixed(1)} km`;
}

function toDayKey(date) {
  return new Date(date).toISOString().split("T")[0];
}

function formatAgo(input) {
  const diff = Date.now() - new Date(input).getTime();
  const h = Math.max(1, Math.round(diff / (1000 * 60 * 60)));
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  return `${d}d ago`;
}

function activityIcon(type) {
  if (type === "Run") return "🏃";
  if (type === "Ride") return "🚴";
  if (type === "Workout") return "🏋️";
  return "🗓️";
}

function formatTimeOfDay(dateStr) {
  if (!dateStr) return null;
  return new Date(dateStr).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

function formatDuration(seconds) {
  if (!seconds) return null;
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

function effortMeta(zones) {
  if (!zones) return null;
  const total = (zones.z1 || 0) + (zones.z2 || 0) + (zones.z3 || 0) + (zones.z4 || 0) + (zones.z5 || 0);
  if (!total) return null;
  const hardPct = ((zones.z4 || 0) + (zones.z5 || 0)) / total;
  const modPct = (zones.z3 || 0) / total;
  if (hardPct > 0.35) return { icon: "🔴", label: "Hard" };
  if (modPct > 0.25 || hardPct > 0.15) return { icon: "🟡", label: "Moderate" };
  return { icon: "🟢", label: "Easy" };
}

function deltaMeta(current, previous, suffix = "vs last period") {
  if (!previous) return { text: "No baseline", tone: "info", suffix };
  const change = ((current - previous) / previous) * 100;
  if (change >= 5) return { text: `▲ ${change.toFixed(0)}%`, tone: "success", suffix };
  if (change <= -5) return { text: `▼ ${Math.abs(change).toFixed(0)}%`, tone: "critical", suffix };
  return { text: `● ${Math.abs(change).toFixed(0)}%`, tone: "warning", suffix };
}

const DELTA_COLORS = {
  success:  "text-green-600",
  warning:  "text-amber-600",
  critical: "text-red-600",
  info:     "text-blue-600",
};

function DashboardSkeleton() {
  return (
    <div className="is-loading grid gap-4" aria-hidden="true">
      <div className="h-[120px] rounded-xl bg-gradient-to-r from-slate-100 via-slate-50 to-slate-100 animate-pulse" />
      <div className="grid grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, idx) => (
          <div key={idx} className="min-h-[120px] rounded-xl bg-gradient-to-r from-slate-100 via-slate-50 to-slate-100 animate-pulse" />
        ))}
      </div>
      <div className="min-h-[280px] rounded-xl bg-gradient-to-r from-slate-100 via-slate-50 to-slate-100 animate-pulse" />
    </div>
  );
}

// Pill-style chip button for filter groups
function Chip({ label, active, onClick }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={`min-h-[34px] rounded-full border px-3 py-1 text-sm font-inherit cursor-pointer transition-colors ${
        active
          ? "bg-indigo-100 border-indigo-200 text-indigo-800"
          : "bg-white border-transparent text-slate-700 hover:bg-slate-100"
      }`}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

export default function HeroPage() {
  const { auth, activities } = useAppData();
  const [dateFilter, setDateFilter] = useState("week");
  const [typeFilter, setTypeFilter] = useState("All");
  const [timelineFilter, setTimelineFilter] = useState("Week");
  const [search, setSearch] = useState("");
  const [overlayFilter, setOverlayFilter] = useState("distance");

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved);
      if (parsed.dateFilter) setDateFilter(parsed.dateFilter);
      if (parsed.typeFilter) setTypeFilter(parsed.typeFilter);
      if (parsed.timelineFilter) setTimelineFilter(parsed.timelineFilter);
      if (parsed.overlayFilter) setOverlayFilter(parsed.overlayFilter);
      if (typeof parsed.search === "string") setSearch(parsed.search);
    } catch {
      // Ignore malformed local storage values.
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ dateFilter, typeFilter, timelineFilter, overlayFilter, search }),
      );
    } catch {
      // Ignore storage errors in restricted browsers.
    }
  }, [dateFilter, typeFilter, timelineFilter, overlayFilter, search]);

  const { start, end } = useMemo(() => getDateFilterRange(dateFilter), [dateFilter]);

  const filtered = useMemo(() => {
    return activities.activities
      .filter((item) => {
        const started = new Date(item.started_at);
        const matchesDate = started >= start && started <= end;
        const matchesType = typeFilter === "All" || item.type === typeFilter;
        return matchesDate && matchesType;
      })
      .sort((a, b) => new Date(a.started_at) - new Date(b.started_at));
  }, [activities.activities, start, end, typeFilter]);

  const metrics = useMemo(() => {
    const rangeMs = end.getTime() - start.getTime();
    const previousStart = new Date(start.getTime() - rangeMs);
    const previousEnd = new Date(start);

    const previousActivities = activities.activities.filter((item) => {
      const ts = new Date(item.started_at);
      const matchesType = typeFilter === "All" || item.type === typeFilter;
      return ts >= previousStart && ts < previousEnd && matchesType;
    });

    const sum = (collection, key) => collection.reduce((acc, row) => acc + (Number(row[key]) || 0), 0);
    const currentDistance = sum(filtered, "distance");
    const previousDistance = sum(previousActivities, "distance");
    const currentLoad = sum(filtered, "moving_time") / 60;
    const previousLoad = sum(previousActivities, "moving_time") / 60;
    const currentConsistency = filtered.length;
    const previousConsistency = previousActivities.length;
    const currentReadiness = Math.max(0, Math.round(75 - (currentLoad - previousLoad) * 0.08));
    const previousReadiness = Math.max(0, Math.round(75 - (previousLoad - currentLoad) * 0.08));

    return [
      {
        label: "Weekly Distance",
        value: currentDistance ? formatDistance(currentDistance) : "—",
        helper: "Total distance",
        delta: deltaMeta(currentDistance, previousDistance),
      },
      {
        label: "Training Load",
        value: `${Math.round(currentLoad)} min`,
        helper: "Session minutes",
        delta: deltaMeta(currentLoad, previousLoad),
      },
      {
        label: "Consistency",
        value: `${currentConsistency} sessions`,
        helper: "Completed workouts",
        delta: deltaMeta(currentConsistency, previousConsistency),
      },
      {
        label: "Readiness",
        value: `${currentReadiness}%`,
        helper: "Fatigue-adjusted",
        delta: deltaMeta(currentReadiness, previousReadiness, "Readiness trend"),
      },
    ];
  }, [activities.activities, end, filtered, start, typeFilter]);

  const weeklySeries = useMemo(() => {
    const grouped = filtered.reduce((acc, item) => {
      const key = toDayKey(item.started_at);
      const pace = Number(item.average_speed) > 0 ? 1000 / Number(item.average_speed) : null;
      if (!acc[key]) acc[key] = { distance: 0, load: 0, pace: [] };
      acc[key].distance += Number(item.distance) || 0;
      acc[key].load += (Number(item.moving_time) || 0) / 60;
      if (pace) acc[key].pace.push(pace);
      return acc;
    }, {});

    return Object.entries(grouped)
      .map(([date, values]) => ({
        date,
        distance: values.distance / 1000,
        load: values.load,
        pace: values.pace.length
          ? values.pace.reduce((acc, value) => acc + value, 0) / values.pace.length / 60
          : null,
      }))
      .slice(-8);
  }, [filtered]);

  const activityFeed = useMemo(() => {
    const now = new Date();
    const filterStart = new Date(now);
    if (timelineFilter === "Today") {
      filterStart.setHours(0, 0, 0, 0);
    } else if (timelineFilter === "Week") {
      filterStart.setDate(filterStart.getDate() - 7);
    } else {
      filterStart.setDate(filterStart.getDate() - 30);
    }

    return activities.activities
      .filter((item) => new Date(item.started_at) >= filterStart)
      .filter((item) => {
        if (!search.trim()) return true;
        return `${item.name || ""} ${item.type || ""}`.toLowerCase().includes(search.toLowerCase());
      })
      .sort((a, b) => new Date(b.started_at) - new Date(a.started_at))
      .slice(0, 8);
  }, [activities.activities, timelineFilter, search]);

  const workoutMix = useMemo(() => {
    const mix = filtered.reduce((acc, item) => {
      const key = item.type || "Other";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(mix).sort((a, b) => b[1] - a[1]);
  }, [filtered]);

  const fatigueSummary = useMemo(() => {
    const totalHours = filtered.reduce((acc, item) => acc + (Number(item.moving_time) || 0), 0) / 3600;
    if (!totalHours) return "Not enough data yet. Add activities to unlock fatigue and form insights.";
    if (totalHours > 8) return "High load week. Prioritize sleep and keep tomorrow easy.";
    if (totalHours > 5) return "Balanced load. Maintain quality sessions and monitor soreness.";
    return "Light training week. Consider adding an aerobic support run.";
  }, [filtered]);

  if (activities.loading) {
    return <DashboardSkeleton />;
  }

  if (activities.error) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-5">
        <h2 className="m-0 mb-2 text-xl font-bold text-slate-900">Dashboard temporarily unavailable</h2>
        <p className="m-0 text-sm text-slate-500">We could not load activity data. Please retry from the Data tab or refresh the page.</p>
      </div>
    );
  }

  const cardClass = "bg-white border border-slate-200 rounded-2xl p-4 shadow-sm";

  return (
    <div className="grid grid-cols-[minmax(0,2fr)_minmax(300px,1fr)] gap-6 items-start max-[960px]:grid-cols-1">

      {/* ── Main column ── */}
      <div className="grid gap-4 content-start min-w-0">

        {/* Header */}
        <header className={`${cardClass} flex justify-between gap-4 max-[960px]:flex-col max-[960px]:sticky max-[960px]:top-0 max-[960px]:z-[5]`}>
          <div>
            <p className="m-0 text-sm text-slate-500">{new Date().toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}</p>
            <h2 className="my-1 text-xl font-bold text-slate-900">Welcome back, {auth.user?.email?.split("@")[0] || "Athlete"}</h2>
            <p className="m-0 text-sm text-slate-500">Current phase: Build · focus on aerobic durability and controlled intensity.</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap" role="group" aria-label="Dashboard filters">
            <div className="inline-flex gap-1 p-0.5 bg-slate-100 rounded-full">
              {DATE_FILTERS.map((item) => (
                <Chip
                  key={item.key}
                  label={item.label}
                  active={dateFilter === item.key}
                  onClick={() => setDateFilter(item.key)}
                />
              ))}
            </div>
            <select
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value)}
              aria-label="Workout type filter"
              className="min-h-[38px] rounded-lg border border-slate-200 bg-white text-slate-700 font-inherit px-3 py-1 text-sm"
            >
              {TYPE_FILTERS.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
            <button
              type="button"
              className="min-h-[38px] rounded-lg border border-slate-200 bg-white text-slate-700 font-inherit px-3 py-1 text-sm"
            >
              Notifications
            </button>
          </div>
        </header>

        {/* KPI strip */}
        <section
          className="grid gap-3 grid-cols-4 overflow-x-auto max-[960px]:flex max-[960px]:pb-1"
          aria-label="Weekly metrics"
        >
          {metrics.map((metric) => (
            <article className={`dashboard-kpi ${cardClass} min-w-[200px] max-[960px]:min-w-[210px]`} key={metric.label}>
              <p className="m-0 text-sm text-slate-500">{metric.label}</p>
              <strong className="block my-1 text-[1.4rem] font-bold text-slate-900">{metric.value}</strong>
              <span className={`font-semibold text-sm ${DELTA_COLORS[metric.delta.tone] ?? "text-slate-500"}`}>{metric.delta.text}</span>
              <small className="block text-xs text-slate-400">{metric.delta.suffix}</small>
              <small className="block mt-1 text-xs text-slate-400">{metric.helper}</small>
            </article>
          ))}
        </section>

        {/* Training trend */}
        <article className={cardClass}>
          <div className="flex justify-between gap-3 items-baseline mb-3">
            <div>
              <h3 className="m-0 text-sm font-bold text-slate-900">Training Trend</h3>
              <p className="m-0 text-xs text-slate-500">Distance, load, and pace overlays</p>
            </div>
            <div className="inline-flex gap-1 p-0.5 bg-slate-100 rounded-full" role="group" aria-label="Trend overlay selector">
              {OVERLAY_FILTERS.map((item) => (
                <Chip
                  key={item.key}
                  label={item.label}
                  active={overlayFilter === item.key}
                  onClick={() => setOverlayFilter(item.key)}
                />
              ))}
            </div>
          </div>
          <div className="grid gap-2" role="img" aria-label={`Trend chart for ${overlayFilter} over recent sessions`}>
            {weeklySeries.length ? (
              weeklySeries.map((point) => (
                <div key={point.date} className="grid grid-cols-[85px_1fr] gap-2 items-center pt-2 border-t border-slate-100 max-[960px]:grid-cols-1">
                  <span className="text-xs text-slate-500">{new Date(point.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
                  {overlayFilter === "distance" && (
                    <div>
                      <label className="block text-xs text-slate-600 mb-1">Distance {point.distance.toFixed(1)} km</label>
                      <progress max="30" value={point.distance} className="w-full h-2" />
                    </div>
                  )}
                  {overlayFilter === "load" && (
                    <div>
                      <label className="block text-xs text-slate-600 mb-1">Load {Math.round(point.load)} min</label>
                      <progress max="180" value={point.load} className="w-full h-2" />
                    </div>
                  )}
                  {overlayFilter === "pace" && (
                    <div>
                      <label className="block text-xs text-slate-600 mb-1">Pace {point.pace ? `${point.pace.toFixed(2)} min/km` : "—"}</label>
                      <progress max="8" value={point.pace ? Math.max(0, 8 - point.pace) : 0} className="w-full h-2" />
                    </div>
                  )}
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-400 text-center py-4 m-0">No trend data for this period. Connect Strava or log your next workout to populate the chart.</p>
            )}
          </div>
          <p className="m-0 mt-3 text-xs text-slate-400">Summary: recent load is {metrics[1].value}, with readiness currently at {metrics[3].value}.</p>
        </article>

        {/* Insights row */}
        <div className="grid gap-3 grid-cols-2 max-[960px]:grid-cols-1">
          <article className={cardClass}>
            <h3 className="m-0 mb-2 text-sm font-bold text-slate-900">Workout Mix</h3>
            {workoutMix.length ? (
              <ul className="m-0 p-0 list-none grid gap-2">
                {workoutMix.map(([type, count]) => (
                  <li key={type} className="flex justify-between pb-2 border-b border-slate-100 last:border-0 last:pb-0">
                    <span className="text-sm text-slate-700">{type}</span>
                    <strong className="text-sm font-bold text-slate-900">{count}</strong>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-400 m-0">No completed sessions yet.</p>
            )}
          </article>
          <article className={cardClass}>
            <h3 className="m-0 mb-2 text-sm font-bold text-slate-900">Fatigue &amp; Form</h3>
            <p className="m-0 mb-3 text-sm text-slate-600">{fatigueSummary}</p>
            <button type="button" className="ghost" style={{ fontSize: "12px", padding: "6px 10px" }}>View details</button>
          </article>
        </div>
      </div>

      {/* ── Rail / sidebar ── */}
      <aside className="grid gap-4 content-start" aria-label="Recent activity stream">
        <article className={cardClass}>
          <div className="flex justify-between items-baseline gap-3 mb-2">
            <h3 className="m-0 text-sm font-bold text-slate-900">Recent Activity</h3>
          </div>
          <div className="flex gap-1 mb-2">
            {TIMELINE_FILTERS.map((item) => (
              <Chip
                key={item}
                label={item}
                active={timelineFilter === item}
                onClick={() => setTimelineFilter(item)}
              />
            ))}
          </div>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search workouts"
            aria-label="Search recent activity"
            className="w-full border border-slate-200 rounded-lg px-3 py-2 font-inherit text-sm bg-white mb-1"
          />
          <div className="mt-3 grid gap-2">
            {activityFeed.length ? (
              activityFeed.map((item) => {
                const duration = formatDuration(item.moving_time);
                const timeOfDay = formatTimeOfDay(item.started_at);
                const effort = effortMeta(item.heart_rate_zones);
                return (
                  <button type="button" key={item.id} className="grid grid-cols-[28px_1fr_auto] gap-2 items-start text-left border-0 border-t border-slate-100 bg-transparent text-inherit font-inherit py-2 cursor-pointer w-full">
                    <span className="text-lg mt-0.5" aria-hidden="true">{activityIcon(item.type)}</span>
                    <span>
                      <strong className="block text-sm font-semibold text-slate-900">{item.name || item.type || "Workout"}</strong>
                      <small className="block text-xs text-slate-500">
                        {item.type || "Session"} · {formatDistance(Number(item.distance) || 0)}{duration ? ` · ${duration}` : ""}
                      </small>
                      {(timeOfDay || effort) && (
                        <small className="block text-xs text-slate-400 mt-0.5">
                          {timeOfDay}{effort ? ` · ${effort.icon} ${effort.label}` : ""}
                        </small>
                      )}
                    </span>
                    <span className="text-xs text-slate-400 whitespace-nowrap mt-1">{formatAgo(item.started_at)}</span>
                  </button>
                );
              })
            ) : (
              <p className="text-sm text-slate-400 m-0 py-2">No activity matches this filter.</p>
            )}
          </div>
        </article>
      </aside>
    </div>
  );
}
