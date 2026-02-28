import React, { useMemo } from "react";
import { useAppData } from "../context/AppDataContext";
import {
  computeLongRuns,
  computeTrainingLoad,
  computeWeeklyHRZones,
  computeRecentActivityZones,
} from "../domain/compute";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ComposedChart,
  BarChart,
  Area,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

// ── Helpers ────────────────────────────────────────────────────────────────

function fmtDate(value) {
  return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

const TICK = { fontSize: 11, fill: "#94a3b8" };
const TOOLTIP_STYLE = {
  backgroundColor: "white",
  border: "1px solid #e2e8f0",
  borderRadius: 8,
  fontSize: 12,
  boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
};

// ── Zone config ────────────────────────────────────────────────────────────

const ZONE_KEYS = ["z1", "z2", "z3", "z4", "z5"];
const ZONE_LABELS = ["Z1 Recovery", "Z2 Aerobic", "Z3 Tempo", "Z4 Threshold", "Z5 VO\u2082max"];
const ZONE_COLORS = ["#94a3b8", "#22c55e", "#3b82f6", "#f59e0b", "#ef4444"];

// ── Sub-components ─────────────────────────────────────────────────────────

// skeleton-block class preserved for tests
function SkeletonBlock({ height = 240 }) {
  return (
    <div
      className="skeleton-block rounded-xl bg-gradient-to-r from-slate-100 via-slate-50 to-slate-100 animate-pulse"
      style={{ height }}
      aria-hidden="true"
    />
  );
}

// kpi-card class preserved for tests
const DELTA_COLORS = { up: "text-emerald-600", down: "text-red-500", neutral: "text-slate-400" };

function KpiCard({ label, value, delta, deltaDir, note }) {
  return (
    <div className="kpi-card bg-white border border-slate-100 rounded-xl p-5 shadow-sm">
      <p className="m-0 text-xs text-slate-400 font-semibold uppercase tracking-wide">{label}</p>
      <p className="font-mono m-0 my-1.5 text-2xl font-bold text-slate-900">{value}</p>
      {delta != null && (
        <p className={`m-0 text-sm font-semibold ${DELTA_COLORS[deltaDir ?? "neutral"]}`}>{delta}</p>
      )}
      {note && <p className="m-0 mt-0.5 text-xs text-slate-400">{note}</p>}
    </div>
  );
}

function ActivityZoneBreakdown({ activityZones }) {
  return (
    <div className="grid gap-5">
      {activityZones.map((activity) => (
        <div key={activity.id} className="grid gap-1.5">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-slate-800">{activity.name}</span>
            <span className="text-xs text-slate-400">{fmtDate(activity.date)}</span>
          </div>
          <div
            className="flex rounded-full overflow-hidden h-3"
            role="img"
            aria-label={`Zone distribution for ${activity.name}`}
          >
            {ZONE_KEYS.map((key, zi) => {
              const pct = activity.total > 0 ? (activity[key] / activity.total) * 100 : 0;
              return pct > 0 ? (
                <div
                  key={key}
                  className="h-full"
                  style={{ width: `${pct}%`, background: ZONE_COLORS[zi] }}
                  title={`${ZONE_LABELS[zi]}: ${Math.round(activity[key] / 60)}m (${Math.round(pct)}%)`}
                />
              ) : null;
            })}
          </div>
          <div className="flex flex-wrap gap-3">
            {ZONE_KEYS.map((key, zi) =>
              activity[key] > 0 ? (
                <span key={key} className="text-[11px] font-semibold" style={{ color: ZONE_COLORS[zi] }}>
                  Z{zi + 1} {Math.round(activity[key] / 60)}m
                </span>
              ) : null,
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function InsightsPage() {
  const { activities, checkins, plans, strava } = useAppData();

  // ── Data derivation ──────────────────────────────────────────────────────

  const trainingLoadSeries = useMemo(
    () =>
      computeTrainingLoad(activities.activities).map((item) => ({
        ...item,
        dateObj: new Date(item.date),
      })),
    [activities.activities],
  );

  const longRunPoints = useMemo(
    () =>
      computeLongRuns(activities.activities).map(([weekStart, run]) => ({
        label: fmtDate(weekStart),
        distanceKm: Math.round((run.distance / 1000) * 10) / 10,
        elevation: Math.round(run.elevation || 0),
      })),
    [activities.activities],
  );

  const weeklyLoadPoints = useMemo(() => {
    const weekly = new Map();
    activities.activities.forEach((activity) => {
      const date = new Date(activity.started_at);
      const day = date.getDay();
      const diff = date.getDate() - day + (day === 0 ? -6 : 1);
      const weekStart = new Date(date);
      weekStart.setDate(diff);
      weekStart.setHours(0, 0, 0, 0);
      const key = weekStart.toISOString().split("T")[0];
      weekly.set(key, (weekly.get(key) || 0) + (Number(activity.moving_time) || 0) / 60);
    });
    return Array.from(weekly.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-8)
      .map(([weekStart, load]) => ({ label: fmtDate(weekStart), load: Math.round(load) }));
  }, [activities.activities]);

  const weeklyZones = useMemo(() => computeWeeklyHRZones(activities.activities), [activities.activities]);
  const activityZones = useMemo(() => computeRecentActivityZones(activities.activities), [activities.activities]);

  // Convert zone seconds → minutes for recharts
  const zoneChartData = useMemo(
    () =>
      weeklyZones.map((w) => ({
        label: fmtDate(w.weekStart),
        z1: Math.round((w.z1 || 0) / 60),
        z2: Math.round((w.z2 || 0) / 60),
        z3: Math.round((w.z3 || 0) / 60),
        z4: Math.round((w.z4 || 0) / 60),
        z5: Math.round((w.z5 || 0) / 60),
      })),
    [weeklyZones],
  );

  const kpiData = useMemo(() => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const diffToMonday = (dayOfWeek === 0 ? -6 : 1) - dayOfWeek;
    const thisMonday = new Date(now);
    thisMonday.setDate(now.getDate() + diffToMonday);
    thisMonday.setHours(0, 0, 0, 0);
    const lastMonday = new Date(thisMonday);
    lastMonday.setDate(thisMonday.getDate() - 7);

    let thisWeekDist = 0;
    let lastWeekDist = 0;
    const weeksWithRuns = new Set();

    activities.activities.forEach((a) => {
      const d = new Date(a.started_at);
      const dist = Number(a.distance) || 0;
      if (d >= thisMonday) thisWeekDist += dist;
      else if (d >= lastMonday) lastWeekDist += dist;
      const mondayOfWeek = new Date(d);
      const diff = (d.getDay() === 0 ? -6 : 1) - d.getDay();
      mondayOfWeek.setDate(d.getDate() + diff);
      mondayOfWeek.setHours(0, 0, 0, 0);
      weeksWithRuns.add(mondayOfWeek.toISOString().split("T")[0]);
    });

    const thisWeekKm = (thisWeekDist / 1000).toFixed(1);
    const distDeltaKm = ((thisWeekDist - lastWeekDist) / 1000).toFixed(1);
    const distDir = thisWeekDist > lastWeekDist ? "up" : thisWeekDist < lastWeekDist ? "down" : "neutral";
    const distDelta =
      distDir === "neutral" ? "Same as last week" : `${distDir === "up" ? "+" : ""}${distDeltaKm} km vs last week`;

    const last8Mondays = Array.from({ length: 8 }, (_, i) => {
      const m = new Date(thisMonday);
      m.setDate(thisMonday.getDate() - i * 7);
      return m.toISOString().split("T")[0];
    });
    const weeksRun = last8Mondays.filter((w) => weeksWithRuns.has(w)).length;
    const consistencyFrac = `${weeksRun}/8 wks`;

    const latestTL = trainingLoadSeries.at(-1);
    const ctl4wAgo =
      trainingLoadSeries.length >= 28 ? trainingLoadSeries[trainingLoadSeries.length - 28] : null;
    const ctlValue = Math.round(latestTL?.ctl ?? 0);
    const ctlDelta = ctl4wAgo ? Math.round((latestTL.ctl - ctl4wAgo.ctl) * 10) / 10 : null;
    const ctlDir = ctlDelta == null ? "neutral" : ctlDelta > 0 ? "up" : ctlDelta < 0 ? "down" : "neutral";
    const ctlDeltaStr =
      ctlDelta == null ? null : `${ctlDelta > 0 ? "+" : ""}${ctlDelta} vs 4 weeks ago`;

    const tsb = latestTL?.tsb;
    const readiness = tsb == null ? "—" : tsb > 5 ? "Fresh" : tsb > -5 ? "Neutral" : "Fatigued";
    const tsbStr = tsb == null ? null : `TSB ${tsb > 0 ? "+" : ""}${tsb.toFixed(1)}`;
    const readinessDir = tsb == null ? "neutral" : tsb > 5 ? "up" : tsb > -5 ? "neutral" : "down";

    return {
      thisWeekKm,
      distDelta,
      distDir,
      ctlValue,
      ctlDeltaStr,
      ctlDir,
      consistencyFrac,
      weeksRun,
      readiness,
      tsbStr,
      readinessDir,
    };
  }, [activities.activities, trainingLoadSeries]);

  const latestLoad = trainingLoadSeries.at(-1);
  const ctl = latestLoad?.ctl ?? 0;
  const fitnessScore = Math.max(0, Math.min(100, Math.round((ctl / 90) * 100)));
  const fitnessLevel =
    ctl < 20 ? "Building" : ctl < 40 ? "Developing" : ctl < 60 ? "Strong" : "Peak";

  const targetLongRunKm = useMemo(() => {
    const currentMileage = Number(plans.plans[0]?.current_mileage) || 0;
    if (currentMileage > 0) return Math.max(12, Math.round(currentMileage * 0.35));
    const longest = Math.max(...longRunPoints.map((p) => p.distanceKm), 0);
    return longest > 0 ? Math.round(longest * 1.15) : 20;
  }, [longRunPoints, plans.plans]);

  const latestLongRunKm = longRunPoints.at(-1)?.distanceKm ?? 0;
  const longRunCompletion = Math.max(
    0,
    Math.min(100, Math.round((latestLongRunKm / Math.max(1, targetLongRunKm)) * 100)),
  );

  const latest = checkins.checkins[0];
  const latestText = latest
    ? `Week of ${new Date(latest.week_of).toLocaleDateString()}: fatigue ${latest.fatigue}/5, sleep ${latest.sleep_quality}/5, motivation ${latest.motivation}/5${latest.niggles ? ` · Niggles: ${latest.niggles}` : ""}`
    : "No check-in yet. Submit your weekly check-in below to track readiness.";

  const formStat = trainingLoadSeries.at(-1)?.tsb;
  const readiness =
    formStat == null ? "—" : formStat > 5 ? "Fresh" : formStat > -5 ? "Neutral" : "Fatigued";

  const risk = useMemo(() => {
    const last = trainingLoadSeries.at(-1);
    if (!last) return "—";
    const ratio = last.ctl > 0 ? last.atl / last.ctl : 0;
    return ratio > 1.5 ? "High" : ratio > 1.2 ? "Moderate" : "Low";
  }, [trainingLoadSeries]);

  const hasData = activities.activities.length > 0;
  const isLoading = activities.loading;

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <section id="insights" className="page">

      {/* Page header */}
      <div className="mb-6">
        <h2 className="m-0 mb-1 text-2xl font-bold text-slate-900">
          Training analysis &amp; insights
        </h2>
        <p className="m-0 text-sm text-slate-500">
          Understand readiness, spot risk early, and see the impact of your consistency.
        </p>
      </div>

      {/* KPI strip — kpi-strip / kpi-card classes preserved for tests */}
      <div className="kpi-strip grid grid-cols-4 gap-4 mb-6 max-[960px]:grid-cols-2 max-[600px]:grid-cols-1">
        {isLoading ? (
          <>
            <SkeletonBlock height={90} />
            <SkeletonBlock height={90} />
            <SkeletonBlock height={90} />
            <SkeletonBlock height={90} />
          </>
        ) : hasData ? (
          <>
            <KpiCard
              label="This week"
              value={`${kpiData.thisWeekKm} km`}
              delta={kpiData.distDelta}
              deltaDir={kpiData.distDir}
            />
            <KpiCard
              label="Training load"
              value={String(kpiData.ctlValue)}
              delta={kpiData.ctlDeltaStr}
              deltaDir={kpiData.ctlDir}
              note="Chronic load (CTL)"
            />
            <KpiCard
              label="Consistency"
              value={kpiData.consistencyFrac}
              note="Weeks with runs (last 8)"
            />
            <KpiCard
              label="Readiness"
              value={kpiData.readiness}
              delta={kpiData.tsbStr}
              deltaDir={kpiData.readinessDir}
            />
          </>
        ) : null}
      </div>

      {/* Empty state */}
      {!isLoading && !hasData && (
        <div className="text-center py-20 bg-white rounded-xl border border-slate-100 shadow-sm">
          <div className="text-5xl mb-4">📊</div>
          <p className="font-semibold text-slate-700 m-0 mb-1 text-base">No training data yet</p>
          <p className="text-sm text-slate-500 m-0 mb-6 max-w-sm mx-auto">
            Connect Strava and sync your activities to unlock training load charts, zone analysis,
            and readiness tracking.
          </p>
          {strava.startConnect && (
            <Button type="button" onClick={strava.startConnect}>
              Connect Strava
            </Button>
          )}
        </div>
      )}

      {/* Loading skeletons */}
      {isLoading && (
        <div className="grid gap-6">
          <SkeletonBlock height={300} />
          <div className="grid grid-cols-2 gap-6 max-[800px]:grid-cols-1">
            <SkeletonBlock height={260} />
            <SkeletonBlock height={260} />
          </div>
          <SkeletonBlock height={260} />
        </div>
      )}

      {/* ── Charts ──────────────────────────────────────────────────────── */}
      {!isLoading && hasData && (
        <div className="grid gap-6">

          {/* Training Load Trend — full width */}
          {trainingLoadSeries.length >= 7 && (
            <Card id="training-load-section">
              <CardHeader className="pb-0">
                <CardTitle className="text-sm font-bold">Training load trend</CardTitle>
                <CardDescription>
                  Fitness (CTL), Fatigue (ATL), and Form (TSB) over the past 90 days.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <ResponsiveContainer width="100%" height={260}>
                  <ComposedChart
                    data={trainingLoadSeries}
                    margin={{ top: 4, right: 8, left: -8, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="ctlGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563eb" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#2563eb" stopOpacity={0.01} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis
                      dataKey="date"
                      tickFormatter={fmtDate}
                      interval={13}
                      tick={TICK}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis tick={TICK} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={TOOLTIP_STYLE}
                      formatter={(v, n) => [Number(v).toFixed(1), n]}
                      labelFormatter={fmtDate}
                    />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                    <Area
                      type="monotone"
                      dataKey="ctl"
                      name="Fitness (CTL)"
                      stroke="#2563eb"
                      strokeWidth={2.5}
                      fill="url(#ctlGrad)"
                      dot={false}
                      activeDot={{ r: 4, strokeWidth: 0 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="atl"
                      name="Fatigue (ATL)"
                      stroke="#ef4444"
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4, strokeWidth: 0 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="tsb"
                      name="Form (TSB)"
                      stroke="#16a34a"
                      strokeWidth={2}
                      strokeDasharray="6 3"
                      dot={false}
                      activeDot={{ r: 4, strokeWidth: 0 }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Weekly Load + HR Zone — 2 columns */}
          {(weeklyLoadPoints.length >= 3 || zoneChartData.length >= 2) && (
            <div className="grid grid-cols-2 gap-6 max-[800px]:grid-cols-1">

              {weeklyLoadPoints.length >= 3 && (
                <Card id="weekly-load-section">
                  <CardHeader className="pb-0">
                    <CardTitle className="text-sm font-bold">Weekly load</CardTitle>
                    <CardDescription>
                      Rolling 8-week view of accumulated training minutes.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart
                        data={weeklyLoadPoints}
                        margin={{ top: 4, right: 8, left: -8, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                        <XAxis
                          dataKey="label"
                          tick={TICK}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          tick={TICK}
                          axisLine={false}
                          tickLine={false}
                          unit=" m"
                        />
                        <Tooltip
                          contentStyle={TOOLTIP_STYLE}
                          formatter={(v) => [`${v} min`, "Training load"]}
                        />
                        <Bar
                          dataKey="load"
                          name="Minutes"
                          fill="#0ea5e9"
                          radius={[5, 5, 0, 0]}
                          maxBarSize={52}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {zoneChartData.length >= 2 && (
                <Card id="hr-zones-section">
                  <CardHeader className="pb-0">
                    <CardTitle className="text-sm font-bold">Heart rate zone distribution</CardTitle>
                    <CardDescription>
                      Time per zone each week — build Z1–Z2 aerobic base, control Z3–Z5 intensity.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart
                        data={zoneChartData}
                        margin={{ top: 4, right: 8, left: -8, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                        <XAxis
                          dataKey="label"
                          tick={TICK}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          tick={TICK}
                          axisLine={false}
                          tickLine={false}
                          unit="m"
                        />
                        <Tooltip
                          contentStyle={TOOLTIP_STYLE}
                          formatter={(v, n) => [`${v} min`, n]}
                        />
                        <Legend
                          iconType="circle"
                          iconSize={8}
                          wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                        />
                        <Bar dataKey="z1" name="Z1 Recovery" stackId="z" fill="#94a3b8" />
                        <Bar dataKey="z2" name="Z2 Aerobic" stackId="z" fill="#22c55e" />
                        <Bar dataKey="z3" name="Z3 Tempo" stackId="z" fill="#3b82f6" />
                        <Bar dataKey="z4" name="Z4 Threshold" stackId="z" fill="#f59e0b" />
                        <Bar
                          dataKey="z5"
                          name="Z5 VO₂max"
                          stackId="z"
                          fill="#ef4444"
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Zone breakdown per activity — full width */}
          {activityZones.length >= 1 && (
            <Card>
              <CardHeader className="pb-0">
                <CardTitle className="text-sm font-bold">Zone breakdown per workout</CardTitle>
                <CardDescription>
                  Last {activityZones.length} activities with heart rate data.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <ActivityZoneBreakdown activityZones={activityZones} />
              </CardContent>
            </Card>
          )}

          {/* Fitness level + Long run — 2 columns */}
          <div className="grid grid-cols-[2fr_3fr] gap-6 max-[800px]:grid-cols-1">

            {/* Fitness level — fitness-meter / fitness-meter__fill classes preserved for tests */}
            <Card id="fitness-level-section">
              <CardHeader className="pb-0">
                <CardTitle className="text-sm font-bold">Fitness level</CardTitle>
                <CardDescription>Calculated from current chronic load (CTL).</CardDescription>
              </CardHeader>
              <CardContent className="pt-5">
                <div className="flex items-baseline gap-2 mb-3">
                  <span className="text-4xl font-bold font-mono text-slate-900">{fitnessScore}</span>
                  <span className="text-sm text-slate-400">/ 100</span>
                </div>
                <div
                  className="fitness-meter w-full h-3 bg-slate-100 rounded-full overflow-hidden mb-3"
                  role="img"
                  aria-label={`Fitness level ${fitnessScore} out of 100`}
                >
                  <div
                    className="fitness-meter__fill h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${fitnessScore}%`,
                      background:
                        fitnessScore < 35
                          ? "#94a3b8"
                          : fitnessScore < 65
                          ? "#0ea5e9"
                          : "#2563eb",
                    }}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                      fitnessLevel === "Peak"
                        ? "bg-blue-100 text-blue-700"
                        : fitnessLevel === "Strong"
                        ? "bg-sky-100 text-sky-700"
                        : fitnessLevel === "Developing"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {fitnessLevel}
                  </span>
                  <span className="text-xs text-slate-400">CTL {Math.round(ctl)}</span>
                </div>
              </CardContent>
            </Card>

            {/* Long run progression */}
            {longRunPoints.length >= 2 ? (
              <Card id="long-run-section">
                <CardHeader className="pb-0">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <CardTitle className="text-sm font-bold">Long run progression</CardTitle>
                      <CardDescription>
                        {latestLongRunKm.toFixed(1)} km of {targetLongRunKm} km target
                      </CardDescription>
                    </div>
                    <span className="text-2xl font-bold font-mono text-slate-900 shrink-0">
                      {longRunCompletion}%
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="pt-3">
                  <div
                    className="w-full h-2 bg-slate-100 rounded-full overflow-hidden mb-4"
                    role="img"
                    aria-label={`Long run progress ${longRunCompletion} percent`}
                  >
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all duration-700"
                      style={{ width: `${longRunCompletion}%` }}
                    />
                  </div>
                  <ResponsiveContainer width="100%" height={190}>
                    <ComposedChart
                      data={longRunPoints}
                      margin={{ top: 4, right: 16, left: -8, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis
                        dataKey="label"
                        tick={TICK}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        yAxisId="left"
                        tick={TICK}
                        axisLine={false}
                        tickLine={false}
                        unit=" km"
                      />
                      <YAxis
                        yAxisId="right"
                        orientation="right"
                        tick={TICK}
                        axisLine={false}
                        tickLine={false}
                        unit=" m"
                      />
                      <Tooltip contentStyle={TOOLTIP_STYLE} />
                      <Bar
                        yAxisId="left"
                        dataKey="distanceKm"
                        name="Distance (km)"
                        fill="#3b82f6"
                        radius={[4, 4, 0, 0]}
                        maxBarSize={44}
                      />
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="elevation"
                        name="Elevation (m)"
                        stroke="#f59e0b"
                        strokeWidth={2}
                        dot={{ r: 3, fill: "#f59e0b", strokeWidth: 0 }}
                        activeDot={{ r: 5, strokeWidth: 0 }}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            ) : (
              /* Placeholder when not enough long run data */
              <Card id="long-run-section" className="flex items-center justify-center">
                <CardContent className="text-center py-8 text-slate-400 text-sm">
                  Log 2+ long runs to see progression.
                </CardContent>
              </Card>
            )}
          </div>

          {/* Latest check-in + quick stats — full width */}
          <Card id="insight-summary">
            <CardContent className="pt-5">
              <div className="grid grid-cols-[1fr_auto] gap-6 items-start max-[600px]:grid-cols-1">
                <div>
                  <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">
                    Latest check-in
                  </p>
                  <p className="text-sm text-slate-600 leading-relaxed" id="latest-checkin-text">
                    {latestText}
                  </p>
                </div>
                <div className="flex gap-8 max-[600px]:gap-6 shrink-0" id="insight-stats">
                  <div className="text-center">
                    <span className="block text-[11px] text-slate-400 mb-1 uppercase tracking-wide">
                      Form trend
                    </span>
                    <strong
                      id="stat-form"
                      className={`font-mono text-xl font-bold ${
                        formStat == null
                          ? "text-slate-400"
                          : formStat > 5
                          ? "text-emerald-600"
                          : formStat < -5
                          ? "text-red-500"
                          : "text-slate-700"
                      }`}
                    >
                      {formStat == null
                        ? "—"
                        : `${formStat > 0 ? "+" : ""}${formStat.toFixed(1)}`}
                    </strong>
                  </div>
                  <div className="text-center">
                    <span className="block text-[11px] text-slate-400 mb-1 uppercase tracking-wide">
                      Readiness
                    </span>
                    <strong
                      id="stat-readiness"
                      className={`font-mono text-xl font-bold ${
                        readiness === "Fresh"
                          ? "text-emerald-600"
                          : readiness === "Fatigued"
                          ? "text-red-500"
                          : "text-slate-700"
                      }`}
                    >
                      {readiness}
                    </strong>
                  </div>
                  <div className="text-center">
                    <span className="block text-[11px] text-slate-400 mb-1 uppercase tracking-wide">
                      Risk score
                    </span>
                    <strong
                      id="stat-risk"
                      className={`font-mono text-xl font-bold ${
                        risk === "High"
                          ? "text-red-500"
                          : risk === "Moderate"
                          ? "text-amber-600"
                          : "text-emerald-600"
                      }`}
                    >
                      {risk}
                    </strong>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

        </div>
      )}
    </section>
  );
}
