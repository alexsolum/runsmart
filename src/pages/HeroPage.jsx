import React, { useEffect, useMemo, useState } from "react";
import { useAppData } from "../context/AppDataContext";
import WeeklyProgressChart from "../components/WeeklyProgressChart";
import { computeWeeklyProgress } from "../domain/compute";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PageContainer from "../components/layout/PageContainer";
import Section from "../components/layout/Section";
import ActivitiesTable from "../components/dashboard/ActivitiesTable";

const STORAGE_KEY = "runsmart.dashboard.filters";
const DATE_FILTERS = [
  { key: "week", label: "Week" },
  { key: "month", label: "Month" },
];
const TYPE_FILTERS = ["All", "Run", "Ride", "Workout", "Walk", "Swim"];

const TYPE_BAR_COLORS = {
  Run: "bg-blue-600",
  Ride: "bg-amber-500",
  Swim: "bg-cyan-500",
  Workout: "bg-violet-500",
  Walk: "bg-green-500",
};

// ─── Date helpers ────────────────────────────────────────────────────────────

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

// ─── Format helpers ───────────────────────────────────────────────────────────

function fmtKm(meters) {
  if (!meters) return "—";
  return `${(meters / 1000).toFixed(1)} km`;
}

function fmtActiveTime(seconds) {
  if (!seconds) return "—";
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m} min`;
}

function fmtPaceDisplay(speedMs) {
  if (!Number(speedMs)) return "—";
  const spm = 1000 / Number(speedMs);
  return `${Math.floor(spm / 60)}:${String(Math.round(spm % 60)).padStart(2, "0")} /km`;
}

// H:MM:SS for table rows
function fmtDuration(seconds) {
  if (!seconds) return "—";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function fmtDate(dateStr) {
  return new Date(dateStr).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function fmtTablePace(speedMs) {
  if (!Number(speedMs)) return "—";
  const spm = 1000 / Number(speedMs);
  return `${Math.floor(spm / 60)}:${String(Math.round(spm % 60)).padStart(2, "0")}/km`;
}

function barColor(type) {
  return TYPE_BAR_COLORS[type] || "bg-slate-400";
}

// ─── Delta badge ──────────────────────────────────────────────────────────────

function computeDelta(current, previous, invert = false) {
  if (!previous) return { text: "New", variant: "secondary" };
  const pct = Math.round(((current - previous) / previous) * 100);
  if (Math.abs(pct) <= 2) return { text: `~${Math.abs(pct)}%`, variant: "secondary" };
  const isPositive = invert ? pct < 0 : pct > 0;
  return {
    text: `${pct > 0 ? "▲" : "▼"} ${Math.abs(pct)}%`,
    variant: isPositive ? "success" : "destructive",
  };
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function DashboardSkeleton() {
  return (
    <div className="is-loading space-y-5" aria-hidden="true">
      <div className="h-14 rounded-xl bg-slate-100 animate-pulse" />
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-28 rounded-xl bg-slate-100 animate-pulse" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-4">
        <div className="h-72 rounded-xl bg-slate-100 animate-pulse" />
        <div className="h-72 rounded-xl bg-slate-100 animate-pulse" />
      </div>
      <div className="h-64 rounded-xl bg-slate-100 animate-pulse" />
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function HeroPage() {
  const { activities, workoutEntries, plans } = useAppData();
  const [dateFilter, setDateFilter] = useState("week");
  const [typeFilter, setTypeFilter] = useState("All");

  // Restore persisted filters
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved);
      if (parsed.dateFilter) setDateFilter(parsed.dateFilter);
      if (parsed.typeFilter) setTypeFilter(parsed.typeFilter);
    } catch {
      // ignore malformed JSON
    }
  }, []);

  // Persist filters
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ dateFilter, typeFilter }));
    } catch {
      // ignore storage errors in restricted browsers
    }
  }, [dateFilter, typeFilter]);

  // Load workout entries for the current week
  useEffect(() => {
    const planId = plans.plans[0]?.id;
    if (!planId) return;
    const mon = new Date();
    const utcDay = mon.getUTCDay();
    mon.setUTCDate(mon.getUTCDate() + (utcDay === 0 ? -6 : 1 - utcDay));
    mon.setUTCHours(0, 0, 0, 0);
    workoutEntries.loadEntriesForWeek(planId, mon.toISOString().split("T")[0]);
  }, [plans.plans[0]?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const { start, end } = useMemo(() => getDateFilterRange(dateFilter), [dateFilter]);

  // Activities filtered by date + type, sorted ascending
  const filtered = useMemo(
    () =>
      activities.activities
        .filter((a) => {
          const t = new Date(a.started_at);
          return (
            t >= start &&
            t <= end &&
            (typeFilter === "All" || a.type === typeFilter)
          );
        })
        .sort((a, b) => new Date(a.started_at) - new Date(b.started_at)),
    [activities.activities, start, end, typeFilter],
  );

  // Previous-period activities for delta comparison
  const prevFiltered = useMemo(() => {
    const rangeMs = end.getTime() - start.getTime();
    const prevStart = new Date(start.getTime() - rangeMs);
    const prevEnd = new Date(start);
    return activities.activities.filter((a) => {
      const t = new Date(a.started_at);
      return (
        t >= prevStart &&
        t < prevEnd &&
        (typeFilter === "All" || a.type === typeFilter)
      );
    });
  }, [activities.activities, start, end, typeFilter]);

  // ── 6 KPI metrics ──────────────────────────────────────────────────────────
  const metrics = useMemo(() => {
    const sum = (arr, key) => arr.reduce((s, r) => s + (Number(r[key]) || 0), 0);

    const curDist = sum(filtered, "distance");
    const prevDist = sum(prevFiltered, "distance");

    const curTime = sum(filtered, "moving_time");
    const prevTime = sum(prevFiltered, "moving_time");

    const curElev = sum(filtered, "elevation_gain");
    const prevElev = sum(prevFiltered, "elevation_gain");

    const curSessions = filtered.length;
    const prevSessions = prevFiltered.length;

    // Average pace (seconds per km) — lower is better → invert delta
    const speedRuns = (arr) => arr.filter((a) => Number(a.average_speed) > 0);
    const avgSpeed = (arr) => {
      const r = speedRuns(arr);
      return r.length ? sum(r, "average_speed") / r.length : 0;
    };
    const curSpeed = avgSpeed(filtered);
    const prevSpeed = avgSpeed(prevFiltered);
    const curPaceSec = curSpeed ? 1000 / curSpeed : 0;
    const prevPaceSec = prevSpeed ? 1000 / prevSpeed : 0;

    // Readiness: simple heuristic based on load vs prev load
    const curReadiness = Math.max(0, Math.round(75 - (curTime / 60 - prevTime / 60) * 0.08));
    const prevReadiness = Math.max(0, Math.round(75 - (prevTime / 60 - curTime / 60) * 0.08));

    return [
      {
        label: "Total Distance",
        value: fmtKm(curDist),
        helper: "Total distance",
        delta: computeDelta(curDist, prevDist),
      },
      {
        label: "Active Time",
        value: fmtActiveTime(curTime),
        helper: "Session minutes",
        delta: computeDelta(curTime, prevTime),
      },
      {
        label: "Avg. Pace",
        value: fmtPaceDisplay(curSpeed),
        helper: "Avg per km",
        delta: computeDelta(curPaceSec, prevPaceSec, true),
      },
      {
        label: "Elevation Gain",
        value: curElev ? `${Math.round(curElev).toLocaleString()} m` : "—",
        helper: "Total ascent",
        delta: computeDelta(curElev, prevElev),
      },
      {
        label: "Consistency",
        value: `${curSessions} sessions`,
        helper: "Completed workouts",
        delta: computeDelta(curSessions, prevSessions),
      },
      {
        label: "Readiness",
        value: `${curReadiness}%`,
        helper: "Fatigue-adjusted",
        delta: computeDelta(curReadiness, prevReadiness),
      },
    ];
  }, [filtered, prevFiltered]);

  // ── Workout breakdown ───────────────────────────────────────────────────────
  const workoutBreakdown = useMemo(() => {
    if (!filtered.length) return [];
    const counts = {};
    filtered.forEach((a) => {
      const t = a.type || "Other";
      counts[t] = (counts[t] || 0) + 1;
    });
    const total = filtered.length;
    return Object.entries(counts)
      .map(([type, count]) => ({ type, count, pct: Math.round((count / total) * 100) }))
      .sort((a, b) => b.pct - a.pct);
  }, [filtered]);

  // ── Recent activities for table ─────────────────────────────────────────────
  const recentActivities = useMemo(
    () => [...filtered].sort((a, b) => new Date(b.started_at) - new Date(a.started_at)).slice(0, 10),
    [filtered],
  );

  // ── Weekly Progress ─────────────────────────────────────────────────────────
  const weeklyProgress = useMemo(
    () => computeWeeklyProgress(activities.activities, workoutEntries.entries),
    [activities.activities, workoutEntries.entries],
  );

  // ── Render states ───────────────────────────────────────────────────────────
  if (activities.loading) return <DashboardSkeleton />;

  if (activities.error) {
    return (
      <Card className="p-5">
        <h2 className="text-xl font-bold text-slate-900 mb-2">Dashboard temporarily unavailable</h2>
        <p className="text-sm text-slate-500">We could not load activity data. Please retry from the Data tab or refresh the page.</p>
      </Card>
    );
  }

  return (
    <PageContainer>

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Training Dashboard</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap" role="group" aria-label="Dashboard filters">
          <span className="text-sm text-slate-500 font-medium hidden sm:inline">Global filter:</span>
          <div className="inline-flex gap-1 p-1 bg-slate-100 rounded-full">
            {DATE_FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                aria-pressed={dateFilter === f.key}
                className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                  dateFilter === f.key
                    ? "bg-white shadow-sm text-slate-900"
                    : "text-slate-500 hover:text-slate-700"
                }`}
                onClick={() => setDateFilter(f.key)}
              >
                {f.label}
              </button>
            ))}
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter} aria-label="Workout type filter">
            <SelectTrigger
              className="h-8 w-36 rounded-full border border-slate-200 bg-white px-3 text-xs text-slate-700"
              aria-label="Workout type filter"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TYPE_FILTERS.map((t) => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ── 6 KPI Cards ── */}
      <Section>
        <section
          className="dashboard-kpis grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3"
          aria-label="Weekly metrics"
        >
          {metrics.map((metric) => (
            <Card key={metric.label} className="dashboard-kpi hover:shadow-md transition-shadow">
              <CardContent className="pt-5 pb-4">
                <p className="text-xs font-medium text-muted-foreground mb-2">{metric.label}</p>
                <p className="text-xl font-bold text-foreground tracking-tight leading-none mb-2.5 kpi-value">
                  {metric.value}
                </p>
                <Badge variant={metric.delta.variant} className="text-[11px] px-2 py-0.5">
                  {metric.delta.text}
                </Badge>
                <p className="kpi-helper text-xs text-muted-foreground/70 mt-1">{metric.helper}</p>
              </CardContent>
            </Card>
          ))}
        </section>
      </Section>

      {/* ── Chart + Workout Breakdown ── */}
      <Section title="Weekly Progression">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">

        {/* Weekly Progress */}
        <Card>
          <CardHeader className="pb-1">
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle className="text-base font-semibold">Weekly progression</CardTitle>
                <CardDescription className="mt-0.5">
                  Cumulative km — completed vs planned, vs 4-week avg
                </CardDescription>
              </div>
              <div className="flex gap-3 text-xs text-slate-400 shrink-0 pt-0.5">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-0.5 bg-blue-600 rounded inline-block" />
                  Distance
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-px bg-slate-300 border-dashed inline-block" />
                  Avg
                </span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-3">
            <WeeklyProgressChart
              days={weeklyProgress.days}
              totalExecuted={weeklyProgress.totalExecuted}
              totalPlanned={weeklyProgress.totalPlanned}
            />
          </CardContent>
        </Card>

        {/* Workout Breakdown */}
        <Card>
          <CardHeader className="pb-1">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">Workout Breakdown</CardTitle>
              <Button variant="ghost" size="sm" className="text-xs h-7 px-2 text-slate-500 -mr-1">
                View All
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            {workoutBreakdown.length ? (
              <div className="space-y-4">
                {workoutBreakdown.map((item) => (
                  <div key={item.type}>
                    <div className="flex items-center justify-between text-sm mb-1.5">
                      <span className="font-medium text-slate-700">{item.type}</span>
                      <span className="text-slate-400 tabular-nums">{item.pct}%</span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${barColor(item.type)}`}
                        style={{ width: `${item.pct}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400 py-8 text-center">
                No activity data for this period.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
      </Section>

      {/* ── Activity History Table ── */}
      <Section
        title="Latest Activities"
        actions={
          <div className="flex gap-2">
            <Button size="sm" className="h-8 text-xs">Add Activity</Button>
            <Button variant="outline" size="sm" className="h-8 text-xs">View All</Button>
          </div>
        }
      >
        <Card>
          <CardContent className="px-5 py-0">
            <ActivitiesTable activities={recentActivities} />
          </CardContent>
        </Card>
      </Section>

    </PageContainer>
  );
}
