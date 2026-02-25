import React, { useEffect, useMemo, useState } from "react";
import { useAppData } from "../context/AppDataContext";
import MiniBarChart from "../components/MiniBarChart";
import TrainingVolumeChart from "../components/TrainingVolumeChart";

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

function deltaMeta(current, previous, suffix = "vs last period") {
  if (!previous) return { text: "No baseline", tone: "info", suffix };
  const change = ((current - previous) / previous) * 100;
  if (change >= 5) return { text: `▲ ${change.toFixed(0)}%`, tone: "success", suffix };
  if (change <= -5) return { text: `▼ ${Math.abs(change).toFixed(0)}%`, tone: "critical", suffix };
  return { text: `● ${Math.abs(change).toFixed(0)}%`, tone: "warning", suffix };
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

const KPI_COLORS = ["#2563eb", "#8b5cf6", "#16a34a", "#f59e0b"];

const DELTA_COLOR = {
  success: "text-green-600",
  critical: "text-red-600",
  warning: "text-amber-600",
  info: "text-blue-600",
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
        label: new Date(date).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
        distance: +(values.distance / 1000).toFixed(1),
        load: +values.load.toFixed(0),
        pace: values.pace.length
          ? +(values.pace.reduce((acc, value) => acc + value, 0) / values.pace.length / 60).toFixed(2)
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

  const dailyDistances = useMemo(() => {
    const result = Array(7).fill(0);
    const now = new Date();
    filtered.forEach((item) => {
      const dayDiff = Math.floor((now - new Date(item.started_at)) / (1000 * 60 * 60 * 24));
      if (dayDiff >= 0 && dayDiff < 7) {
        result[6 - dayDiff] += (Number(item.distance) || 0) / 1000;
      }
    });
    return result;
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

  return (
    <div className="dashboard-shell">
      <section className="dashboard-main">
        {/* Header: greeting + filters */}
        <header className="bg-white rounded-2xl p-5 shadow-sm flex flex-col lg:flex-row justify-between gap-4">
          <div>
            <p className="text-sm text-slate-500 mb-1">
              {new Date().toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}
            </p>
            <h2 className="text-xl font-bold text-slate-900 mb-1">
              Welcome back, {auth.user?.email?.split("@")[0] || "Athlete"}
            </h2>
            <p className="text-sm text-slate-500">
              Current phase: Build · focus on aerobic durability and controlled intensity.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap" role="group" aria-label="Dashboard filters">
            <div className="inline-flex gap-1 p-1 bg-slate-100 rounded-full">
              {DATE_FILTERS.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  aria-pressed={dateFilter === item.key}
                  className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                    dateFilter === item.key
                      ? "bg-white shadow-sm text-slate-900"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                  onClick={() => setDateFilter(item.key)}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <select
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value)}
              aria-label="Workout type filter"
              className="h-8 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700"
            >
              {TYPE_FILTERS.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </div>
        </header>

        {/* KPI Cards */}
        <section className="dashboard-kpis" aria-label="Weekly metrics">
          {metrics.map((metric, idx) => (
            <article key={metric.label} className="dashboard-kpi bg-white rounded-2xl p-5 shadow-sm flex items-start justify-between gap-3">
              <div>
                <p className="text-sm text-slate-500 mb-1">{metric.label}</p>
                <strong className="text-2xl font-bold text-slate-900 block">{metric.value}</strong>
                <span className={`text-xs font-semibold mt-1 inline-block ${DELTA_COLOR[metric.delta.tone] || "text-blue-600"}`}>
                  {metric.delta.text}
                </span>
                <small className="block text-xs text-slate-400 mt-0.5">{metric.delta.suffix}</small>
                <small className="kpi-helper block text-xs text-slate-400 mt-1">{metric.helper}</small>
              </div>
              <MiniBarChart data={dailyDistances} color={KPI_COLORS[idx]} />
            </article>
          ))}
        </section>

        {/* Training Trend Chart */}
        <article className="bg-white rounded-2xl p-5 shadow-sm">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="text-base font-semibold text-slate-900">Training Trend</h3>
              <p className="text-sm text-slate-500">Distance, load, and pace overlays</p>
            </div>
            <div className="inline-flex gap-1 p-1 bg-slate-100 rounded-full" role="group" aria-label="Trend overlay selector">
              {OVERLAY_FILTERS.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  aria-pressed={overlayFilter === item.key}
                  className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                    overlayFilter === item.key
                      ? "bg-white shadow-sm text-slate-900"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                  onClick={() => setOverlayFilter(item.key)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
          {weeklySeries.length ? (
            <TrainingVolumeChart data={weeklySeries} overlayFilter={overlayFilter} />
          ) : (
            <p className="text-slate-400 text-sm py-12 text-center">
              No trend data for this period. Connect Strava or log your next workout to populate the chart.
            </p>
          )}
          <p className="text-xs text-slate-400 mt-3">
            Summary: recent load is {metrics[1].value}, with readiness currently at {metrics[3].value}.
          </p>
        </article>

        {/* Workout Mix + Fatigue & Form */}
        <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <article className="bg-white rounded-2xl p-5 shadow-sm">
            <h3 className="text-base font-semibold text-slate-900 mb-3">Workout Mix</h3>
            {workoutMix.length ? (
              <div className="space-y-2">
                {workoutMix.map(([type, count]) => (
                  <div key={type} className="flex items-center justify-between text-sm border-b border-slate-100 pb-2">
                    <span className="text-slate-600">{type}</span>
                    <strong className="text-slate-900">{count}</strong>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-400 text-sm">No completed sessions yet.</p>
            )}
          </article>
          <article className="bg-white rounded-2xl p-5 shadow-sm">
            <h3 className="text-base font-semibold text-slate-900 mb-3">Fatigue &amp; Form</h3>
            <p className="text-sm text-slate-600">{fatigueSummary}</p>
            <button type="button" className="mt-3 text-sm text-blue-600 hover:text-blue-700 font-medium">
              View details
            </button>
          </article>
        </section>
      </section>

      {/* Right Rail */}
      <aside className="dashboard-rail" aria-label="Recent activity stream">
        {/* Statistics Panel */}
        <article className="bg-white rounded-2xl p-5 shadow-sm">
          <h3 className="text-base font-semibold text-slate-900 mb-4">Statistics</h3>

          <div className="mb-4">
            <div className="flex justify-between text-sm mb-1.5">
              <span className="text-slate-600">Weekly Regularity</span>
              <span className="font-semibold text-slate-900">{metrics[2].value}</span>
            </div>
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 rounded-full transition-all"
                style={{ width: `${Math.min(100, (parseInt(metrics[2].value) / 7) * 100)}%` }}
              />
            </div>
          </div>

          <div className="mb-4">
            <div className="flex justify-between text-sm mb-1.5">
              <span className="text-slate-600">Form Score</span>
              <span className="font-semibold text-slate-900">{metrics[3].value}</span>
            </div>
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 rounded-full transition-all"
                style={{ width: metrics[3].value }}
              />
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl">
            <p className="text-sm text-slate-600">{fatigueSummary}</p>
          </div>
        </article>

        {/* Recent Activity */}
        <article className="bg-white rounded-2xl p-5 shadow-sm">
          <h3 className="text-base font-semibold text-slate-900 mb-3">Recent Activity</h3>
          <div className="flex gap-1 mb-3">
            {TIMELINE_FILTERS.map((item) => (
              <button
                key={item}
                type="button"
                aria-pressed={timelineFilter === item}
                className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors border ${
                  timelineFilter === item
                    ? "bg-blue-50 text-blue-700 border-blue-200"
                    : "text-slate-500 hover:text-slate-700 border-transparent"
                }`}
                onClick={() => setTimelineFilter(item)}
              >
                {item}
              </button>
            ))}
          </div>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search workouts"
            aria-label="Search recent activity"
            className="w-full h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 mb-3"
          />
          <div className="space-y-1">
            {activityFeed.length ? (
              activityFeed.map((item) => {
                const duration = formatDuration(item.moving_time);
                const timeOfDay = formatTimeOfDay(item.started_at);
                const effort = effortMeta(item.heart_rate_zones);
                return (
                  <button
                    type="button"
                    key={item.id}
                    className="w-full grid grid-cols-[28px_1fr_auto] gap-2 items-start text-left border-t border-slate-100 py-2.5 hover:bg-slate-50 rounded-lg transition-colors"
                  >
                    <span className="text-base mt-0.5" aria-hidden="true">{activityIcon(item.type)}</span>
                    <span>
                      <strong className="block text-sm text-slate-900">{item.name || item.type || "Workout"}</strong>
                      <small className="block text-xs text-slate-500">
                        {item.type || "Session"} · {formatDistance(Number(item.distance) || 0)}{duration ? ` · ${duration}` : ""}
                      </small>
                      {(timeOfDay || effort) && (
                        <small className="block text-xs text-slate-400 mt-0.5">
                          {timeOfDay}{effort ? ` · ${effort.icon} ${effort.label}` : ""}
                        </small>
                      )}
                    </span>
                    <span className="text-xs text-slate-400 mt-1">{formatAgo(item.started_at)}</span>
                  </button>
                );
              })
            ) : (
              <p className="text-slate-400 text-sm py-4 text-center">No activity matches this filter.</p>
            )}
          </div>
        </article>
      </aside>
    </div>
  );
}
