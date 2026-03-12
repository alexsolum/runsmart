import React, { useEffect, useMemo, useState } from "react";
import { useAppData } from "../context/AppDataContext";
import WeeklyProgressChart from "../components/WeeklyProgressChart";
import { computeWeeklyProgress } from "../domain/compute";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import PageContainer from "../components/layout/PageContainer";
import ActivitiesTable from "../components/dashboard/ActivitiesTable";
import {
  Activity,
  Clock,
  MapPin,
  Heart,
  TrendingUp,
  Mountain,
  Download,
} from "lucide-react";

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

// ─── Date helpers ─────────────────────────────────────────────────────────────

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

function fmtPaceDisplay(secPerKm) {
  if (!Number(secPerKm) || secPerKm <= 0) return "—";
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm % 60);
  return `${m}:${String(s).padStart(2, "0")} /km`;
}

function fmtRelativeDate(dateStr) {
  if (!dateStr) return "—";
  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now - date) / 86400000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
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

function deltaSuffix(filter) {
  return filter === "week" ? "vs last week" : "vs previous 30 days";
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function DashboardSkeleton() {
  return (
    <div className="is-loading space-y-5" aria-hidden="true">
      <div className="h-14 rounded-xl bg-slate-100 animate-pulse" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 rounded-xl bg-slate-100 animate-pulse" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-7 gap-4">
        <div className="lg:col-span-4 h-72 rounded-xl bg-slate-100 animate-pulse" />
        <div className="lg:col-span-3 h-72 rounded-xl bg-slate-100 animate-pulse" />
      </div>
      <div className="h-64 rounded-xl bg-slate-100 animate-pulse" />
    </div>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({ label, value, delta, suffix, Icon }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{label}</CardTitle>
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground mt-1">
          <Badge variant={delta.variant} className="text-[11px] px-1.5 py-0 mr-1">
            {delta.text}
          </Badge>
          {suffix}
        </p>
      </CardContent>
    </Card>
  );
}

// ─── Recent Activity Row ──────────────────────────────────────────────────────

const SPORT_ICONS = {
  Run: "🏃",
  Ride: "🚴",
  Swim: "🏊",
  Walk: "🚶",
  Workout: "💪",
};

function RecentActivityItem({ activity }) {
  const icon = SPORT_ICONS[activity.type] || "⚡";
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-base">
        {icon}
      </div>
      <div className="flex-1 min-w-0 space-y-0.5">
        <p className="text-sm font-medium leading-none truncate">
          {activity.name || activity.type || "Workout"}
        </p>
        <p className="text-xs text-muted-foreground">{fmtRelativeDate(activity.started_at)}</p>
      </div>
      <span className="text-sm font-medium tabular-nums shrink-0">{fmtKm(activity.distance)}</span>
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

  const filtered = useMemo(
    () =>
      activities.activities
        .filter((a) => {
          const t = new Date(a.started_at);
          return t >= start && t <= end && (typeFilter === "All" || a.type === typeFilter);
        })
        .sort((a, b) => new Date(a.started_at) - new Date(b.started_at)),
    [activities.activities, start, end, typeFilter],
  );

  const prevFiltered = useMemo(() => {
    const rangeMs = end.getTime() - start.getTime();
    const prevStart = new Date(start.getTime() - rangeMs);
    const prevEnd = new Date(start);
    return activities.activities.filter((a) => {
      const t = new Date(a.started_at);
      return t >= prevStart && t < prevEnd && (typeFilter === "All" || a.type === typeFilter);
    });
  }, [activities.activities, start, end, typeFilter]);

  // ── KPI metrics ──────────────────────────────────────────────────────────────
  const kpiMetrics = useMemo(() => {
    const sum = (arr, key) => arr.reduce((s, r) => s + (Number(r[key]) || 0), 0);

    const curDist = sum(filtered, "distance");
    const prevDist = sum(prevFiltered, "distance");
    const curTime = sum(filtered, "moving_time");
    const prevTime = sum(prevFiltered, "moving_time");
    const curElev = sum(filtered, "elevation_gain");
    const prevElev = sum(prevFiltered, "elevation_gain");
    const curSessions = filtered.length;
    const prevSessions = prevFiltered.length;

    const avgPaceSpm = (arr) => {
      const r = arr.filter((a) => {
        const pace = Number(a.average_pace) || (a.moving_time && a.distance ? (Number(a.moving_time) / Number(a.distance)) * 1000 : 0);
        return pace > 0 && (a.type === "Run" || a.type === "Walk");
      });
      if (!r.length) return 0;
      const paces = r.map((a) => Number(a.average_pace) || (Number(a.moving_time) / Number(a.distance)) * 1000);
      return paces.reduce((s, p) => s + p, 0) / paces.length;
    };
    const curPace = avgPaceSpm(filtered);
    const prevPace = avgPaceSpm(prevFiltered);

    const curReadiness = Math.max(0, Math.round(75 - (curTime / 60 - prevTime / 60) * 0.08));
    const prevReadiness = Math.max(0, Math.round(75 - (prevTime / 60 - curTime / 60) * 0.08));

    const suffix = deltaSuffix(dateFilter);

    return [
      {
        label: "Total Distance",
        value: fmtKm(curDist),
        delta: computeDelta(curDist, prevDist),
        suffix,
        Icon: MapPin,
      },
      {
        label: "Active Time",
        value: fmtActiveTime(curTime),
        delta: computeDelta(curTime, prevTime),
        suffix,
        Icon: Clock,
      },
      {
        label: "Avg. Pace",
        value: fmtPaceDisplay(curPace),
        delta: computeDelta(curPace ? 1 / curPace : 0, prevPace ? 1 / prevPace : 0, true),
        suffix,
        Icon: TrendingUp,
      },
      {
        label: "Sessions",
        value: `${curSessions}`,
        delta: computeDelta(curSessions, prevSessions),
        suffix,
        Icon: Activity,
      },
    ];
  }, [filtered, prevFiltered, dateFilter]);

  // ── Secondary metrics (shown in second row in Analytics) ──────────────────
  const secondaryMetrics = useMemo(() => {
    const sum = (arr, key) => arr.reduce((s, r) => s + (Number(r[key]) || 0), 0);
    const curElev = sum(filtered, "elevation_gain");
    const prevElev = sum(prevFiltered, "elevation_gain");
    const curTime = sum(filtered, "moving_time");
    const prevTime = sum(prevFiltered, "moving_time");
    const curReadiness = Math.max(0, Math.round(75 - (curTime / 60 - prevTime / 60) * 0.08));
    const prevReadiness = Math.max(0, Math.round(75 - (prevTime / 60 - curTime / 60) * 0.08));
    const suffix = deltaSuffix(dateFilter);
    return [
      {
        label: "Elevation Gain",
        value: curElev ? `${Math.round(curElev).toLocaleString()} m` : "—",
        delta: computeDelta(curElev, prevElev),
        suffix,
        Icon: Mountain,
      },
      {
        label: "Readiness",
        value: `${curReadiness}%`,
        delta: computeDelta(curReadiness, prevReadiness),
        suffix,
        Icon: Heart,
      },
    ];
  }, [filtered, prevFiltered, dateFilter]);

  // ── Workout breakdown ────────────────────────────────────────────────────────
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

  // ── Recent activities ───────────────────────────────────────────────────────
  const recentActivities = useMemo(
    () => [...filtered].sort((a, b) => new Date(b.started_at) - new Date(a.started_at)).slice(0, 10),
    [filtered],
  );

  // ── Weekly Progress ──────────────────────────────────────────────────────────
  const weeklyProgress = useMemo(
    () => computeWeeklyProgress(activities.activities, workoutEntries.entries),
    [activities.activities, workoutEntries.entries],
  );

  // ── Render states ────────────────────────────────────────────────────────────
  if (activities.loading) return <DashboardSkeleton />;

  if (activities.error) {
    return (
      <Card className="p-5">
        <h2 className="text-xl font-bold text-slate-900 mb-2">Dashboard temporarily unavailable</h2>
        <p className="text-sm text-slate-500">
          We could not load activity data. Please retry from the Data tab or refresh the page.
        </p>
      </Card>
    );
  }

  return (
    <PageContainer>

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Date range toggle */}
          <div
            className="inline-flex gap-1 p-1 bg-slate-100 rounded-md"
            role="group"
            aria-label="Dashboard filters"
          >
            {DATE_FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                aria-pressed={dateFilter === f.key}
                className={`px-3 py-1.5 text-xs font-medium rounded-sm transition-colors ${
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
              className="h-8 w-32 text-xs"
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
          <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs hidden sm:flex">
            <Download className="h-3.5 w-3.5" />
            Export
          </Button>
        </div>
      </div>

      {/* ── Tabs ── */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="alle-lop">Alle løp</TabsTrigger>
          <TabsTrigger value="analytics" disabled>Analytics</TabsTrigger>
          <TabsTrigger value="reports" disabled>Reports</TabsTrigger>
          <TabsTrigger value="notifications" disabled>Notifications</TabsTrigger>
        </TabsList>

        {/* ── Overview Tab ── */}
        <TabsContent value="overview" className="space-y-4">

          {/* 4 KPI Cards */}
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-4" aria-label="Training metrics">
            {kpiMetrics.map((metric) => (
              <KpiCard key={metric.label} {...metric} />
            ))}
          </div>

          {/* Chart (4/7) + Workout Breakdown (3/7) */}
          <div className="grid gap-4 grid-cols-1 lg:grid-cols-7">

            <Card className="lg:col-span-4">
              <CardHeader>
                <CardTitle>Weekly Progression</CardTitle>
                <CardDescription>
                  Cumulative distance — completed vs planned, vs 4-week avg
                </CardDescription>
              </CardHeader>
              <CardContent className="pl-2">
                <WeeklyProgressChart
                  days={weeklyProgress.days}
                  totalExecuted={weeklyProgress.totalExecuted}
                  totalPlanned={weeklyProgress.totalPlanned}
                />
              </CardContent>
            </Card>

            <Card className="lg:col-span-3">
              <CardHeader>
                <CardTitle>Recent Activities</CardTitle>
                <CardDescription>
                  {recentActivities.length} activities this period
                </CardDescription>
              </CardHeader>
              <CardContent>
                {recentActivities.length > 0 ? (
                  <div className="space-y-6">
                    {recentActivities.slice(0, 7).map((activity) => (
                      <RecentActivityItem key={activity.id} activity={activity} />
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground py-8 text-center">
                    No activities for this period.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Workout Breakdown + Secondary metrics row */}
          <div className="grid gap-4 grid-cols-1 md:grid-cols-3">

            <Card className="md:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Workout Breakdown</CardTitle>
                <CardDescription>Activity type distribution</CardDescription>
              </CardHeader>
              <CardContent>
                {workoutBreakdown.length ? (
                  <div className="space-y-3">
                    {workoutBreakdown.map((item) => (
                      <div key={item.type}>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="font-medium">{item.type}</span>
                          <span className="text-muted-foreground tabular-nums">
                            {item.count} session{item.count !== 1 ? "s" : ""} · {item.pct}%
                          </span>
                        </div>
                        <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${barColor(item.type)}`}
                            style={{ width: `${item.pct}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground py-6 text-center">
                    No activity data for this period.
                  </p>
                )}
              </CardContent>
            </Card>

            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-1 content-start">
              {secondaryMetrics.map((metric) => (
                <KpiCard key={metric.label} {...metric} />
              ))}
            </div>
          </div>

          {/* Full-width Activities Table */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Activity History</CardTitle>
                  <CardDescription>Your last {recentActivities.length} activities this period</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" className="h-8 text-xs">Add Activity</Button>
                  <Button variant="outline" size="sm" className="h-8 text-xs">View All</Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-5 py-0 pb-2">
              <ActivitiesTable activities={recentActivities} />
            </CardContent>
          </Card>

        </TabsContent>

        {/* ── Alle løp Tab ── */}
        <TabsContent value="alle-lop" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Alle løp</CardTitle>
              <CardDescription>
                Komplett aktivitetslogg — {activities.activities.length} aktiviteter totalt
              </CardDescription>
            </CardHeader>
            <CardContent className="px-5 py-0 pb-4">
              <ActivitiesTable
                activities={[...activities.activities].sort(
                  (a, b) => new Date(b.started_at) - new Date(a.started_at)
                )}
                pageSize={10}
              />
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>

    </PageContainer>
  );
}
