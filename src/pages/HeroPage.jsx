import React, { useEffect, useMemo, useState } from "react";
import { useAppData } from "../context/AppDataContext";

const STORAGE_KEY = "runsmart.dashboard.filters";
const DATE_FILTERS = [
  { key: "week", label: "Week" },
  { key: "month", label: "Month" },
];
const TYPE_FILTERS = ["All", "Run", "Ride", "Workout"];
const TIMELINE_FILTERS = ["Today", "Week", "Month"];

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

function deltaMeta(current, previous, suffix = "vs last period") {
  if (!previous) return { text: "No baseline", tone: "info", suffix };
  const change = ((current - previous) / previous) * 100;
  if (change >= 5) return { text: `▲ ${change.toFixed(0)}%`, tone: "success", suffix };
  if (change <= -5) return { text: `▼ ${Math.abs(change).toFixed(0)}%`, tone: "critical", suffix };
  return { text: `● ${Math.abs(change).toFixed(0)}%`, tone: "warning", suffix };
}

function DashboardSkeleton() {
  return (
    <div className="dashboard-shell is-loading" aria-hidden="true">
      <section className="dashboard-main">
        <div className="skeleton skeleton--header" />
        <div className="dashboard-kpis">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div key={idx} className="dashboard-kpi skeleton skeleton--card" />
          ))}
        </div>
        <div className="skeleton skeleton--chart" />
      </section>
      <aside className="dashboard-rail">
        <div className="skeleton skeleton--card" />
        <div className="skeleton skeleton--card" />
      </aside>
    </div>
  );
}

export default function HeroPage() {
  const { auth, activities } = useAppData();
  const [dateFilter, setDateFilter] = useState("week");
  const [typeFilter, setTypeFilter] = useState("All");
  const [timelineFilter, setTimelineFilter] = useState("Week");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved);
      if (parsed.dateFilter) setDateFilter(parsed.dateFilter);
      if (parsed.typeFilter) setTypeFilter(parsed.typeFilter);
      if (parsed.timelineFilter) setTimelineFilter(parsed.timelineFilter);
      if (typeof parsed.search === "string") setSearch(parsed.search);
    } catch {
      // Ignore malformed local storage values.
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ dateFilter, typeFilter, timelineFilter, search }),
    );
  }, [dateFilter, typeFilter, timelineFilter, search]);

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

    const points = Object.entries(grouped).map(([date, values]) => ({
      date,
      distance: values.distance / 1000,
      load: values.load,
      pace: values.pace.length
        ? values.pace.reduce((acc, value) => acc + value, 0) / values.pace.length / 60
        : null,
    }));

    return points.slice(-8);
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

  return (
    <div className="dashboard-shell">
      <section className="dashboard-main">
        <header className="dashboard-header">
          <div>
            <p className="dashboard-kicker">{new Date().toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}</p>
            <h2>Welcome back, {auth.user?.email?.split("@")[0] || "Athlete"}</h2>
            <p className="dashboard-phase">Current phase: Build · focus on aerobic durability and controlled intensity.</p>
          </div>
          <div className="dashboard-controls" role="group" aria-label="Dashboard filters">
            <div className="dashboard-chip-group">
              {DATE_FILTERS.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  className={`dashboard-chip ${dateFilter === item.key ? "is-active" : ""}`}
                  onClick={() => setDateFilter(item.key)}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} aria-label="Workout type filter">
              {TYPE_FILTERS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
            <button type="button" className="dashboard-notify">Notifications</button>
          </div>
        </header>

        <section className="dashboard-kpis" aria-label="Weekly metrics">
          {metrics.map((metric) => (
            <article className="dashboard-kpi" key={metric.label}>
              <p>{metric.label}</p>
              <strong>{metric.value}</strong>
              <span className={`delta delta--${metric.delta.tone}`}>{metric.delta.text}</span>
              <small>{metric.delta.suffix}</small>
            </article>
          ))}
        </section>

        <article className="dashboard-card">
          <div className="dashboard-card__head">
            <h3>Training Trend</h3>
            <p>Distance, load, and pace overlays</p>
          </div>
          <div className="trend-grid" role="img" aria-label="Trend chart for distance, load, and pace over recent sessions">
            {weeklySeries.length ? (
              weeklySeries.map((point) => (
                <div key={point.date} className="trend-row">
                  <span>{new Date(point.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
                  <div>
                    <label>Distance {point.distance.toFixed(1)} km</label>
                    <progress max="30" value={point.distance} />
                  </div>
                  <div>
                    <label>Load {Math.round(point.load)} min</label>
                    <progress max="180" value={point.load} className="load" />
                  </div>
                  <div>
                    <label>Pace {point.pace ? `${point.pace.toFixed(2)} min/km` : "—"}</label>
                    <progress max="8" value={point.pace ? Math.max(0, 8 - point.pace) : 0} className="pace" />
                  </div>
                </div>
              ))
            ) : (
              <p className="empty-state">No trend data for this period. Connect Strava or log your next workout to populate the chart.</p>
            )}
          </div>
          <p className="chart-summary">Summary: recent load is {metrics[1].value}, with readiness currently at {metrics[3].value}.</p>
        </article>

        <section className="dashboard-insights">
          <article className="dashboard-card">
            <h3>Workout Mix</h3>
            {workoutMix.length ? (
              <ul className="mix-list">
                {workoutMix.map(([type, count]) => (
                  <li key={type}>
                    <span>{type}</span>
                    <strong>{count}</strong>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="empty-state">No completed sessions yet.</p>
            )}
          </article>
          <article className="dashboard-card">
            <h3>Fatigue &amp; Form</h3>
            <p>{fatigueSummary}</p>
            <button type="button" className="details-btn">View details</button>
          </article>
        </section>
      </section>

      <aside className="dashboard-rail" aria-label="Recent activity stream">
        <article className="dashboard-card">
          <div className="dashboard-card__head">
            <h3>Recent Activity</h3>
          </div>
          <div className="timeline-filters">
            {TIMELINE_FILTERS.map((item) => (
              <button
                key={item}
                type="button"
                className={`dashboard-chip ${timelineFilter === item ? "is-active" : ""}`}
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
          />
          <div className="timeline-list">
            {activityFeed.length ? (
              activityFeed.map((item) => (
                <button type="button" className="timeline-row" key={item.id}>
                  <span className="timeline-icon" aria-hidden="true">🏃</span>
                  <span className="timeline-main">
                    <strong>{item.name || item.type || "Workout"}</strong>
                    <small>{item.type || "Session"} · {formatDistance(Number(item.distance) || 0)}</small>
                  </span>
                  <span className="timeline-time">{formatAgo(item.started_at)}</span>
                </button>
              ))
            ) : (
              <p className="empty-state">No activity matches this filter.</p>
            )}
          </div>
        </article>
      </aside>
    </div>
  );
}
