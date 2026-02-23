import React, { useMemo } from "react";
import { useAppData } from "../context/AppDataContext";
import { computeLongRuns, computeTrainingLoad, computeWeeklyHRZones, computeRecentActivityZones } from "../domain/compute";

function fmtDate(value) {
  return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function SkeletonBlock({ height = 240 }) {
  return <div className="skeleton-block" style={{ height }} aria-hidden="true" />;
}

function KpiCard({ label, value, delta, deltaDir, note }) {
  return (
    <div className="kpi-card">
      <p className="kpi-card__label">{label}</p>
      <p className="kpi-card__value">{value}</p>
      {delta != null && (
        <p className={`kpi-card__delta kpi-card__delta--${deltaDir ?? "neutral"}`}>{delta}</p>
      )}
      {note && <p className="kpi-card__note">{note}</p>}
    </div>
  );
}

const ZONE_COLORS = ["#94a3b8", "#22c55e", "#3b82f6", "#f59e0b", "#ef4444"];
const ZONE_LABELS = ["Z1 Recovery", "Z2 Aerobic", "Z3 Tempo", "Z4 Threshold", "Z5 VO\u2082max"];
const ZONE_KEYS = ["z1", "z2", "z3", "z4", "z5"];

function HRZoneWeeklyChart({ weeks }) {
  const width = 760;
  const height = 280;
  const margin = { top: 36, right: 12, bottom: 42, left: 52 };
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;
  const band = innerW / weeks.length;
  const barW = Math.min(40, band * 0.65);
  const maxTotal = Math.max(...weeks.map((w) => w.total), 1);
  const x = (i) => margin.left + i * band + (band - barW) / 2;
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * maxTotal);
  const y = (v) => margin.top + (1 - v / maxTotal) * innerH;
  const chartBottom = margin.top + innerH;

  return (
    <div className="d3-chart">
      <div className="hr-zone-legend">
        {ZONE_LABELS.map((label, i) => (
          <div key={label} className="hr-zone-legend-item">
            <div className="hr-zone-legend-dot" style={{ background: ZONE_COLORS[i] }} />
            <span>{label}</span>
          </div>
        ))}
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} role="img" aria-label="Heart rate zone distribution by week">
        {yTicks.map((val) => (
          <g key={val}>
            <line x1={margin.left} y1={y(val)} x2={width - margin.right} y2={y(val)} stroke="#e2e8f0" strokeWidth="1" />
            <text x={margin.left - 8} y={y(val) + 4} textAnchor="end" fill="#64748b" fontSize="11">
              {Math.round(val / 60)}m
            </text>
          </g>
        ))}
        {weeks.map((week, i) => {
          let cumulative = 0;
          return (
            <g key={week.weekStart}>
              {ZONE_KEYS.map((key, zi) => {
                const val = week[key];
                if (!val) return null;
                const segH = (val / maxTotal) * innerH;
                const segY = chartBottom - cumulative - segH;
                cumulative += segH;
                return (
                  <rect key={key} x={x(i)} y={segY} width={barW} height={segH} fill={ZONE_COLORS[zi]}>
                    <title>{ZONE_LABELS[zi]}: {Math.round(val / 60)}m</title>
                  </rect>
                );
              })}
              <text x={x(i) + barW / 2} y={height - 14} textAnchor="middle" fill="#64748b" fontSize="11">
                {fmtDate(week.weekStart)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function HRZoneActivityBreakdown({ activityZones }) {
  return (
    <div className="hr-zone-activity-list">
      {activityZones.map((activity) => {
        const total = activity.total;
        return (
          <div key={activity.id} className="hr-zone-activity-row">
            <div className="hr-zone-activity-meta">
              <span className="hr-zone-activity-name">{activity.name}</span>
              <span className="muted">{fmtDate(activity.date)}</span>
            </div>
            <div className="hr-zone-bar" role="img" aria-label={`Zone distribution for ${activity.name}`}>
              {ZONE_KEYS.map((key, zi) => {
                const pct = total > 0 ? (activity[key] / total) * 100 : 0;
                return pct > 0 ? (
                  <div
                    key={key}
                    className="hr-zone-segment"
                    style={{ width: `${pct}%`, background: ZONE_COLORS[zi] }}
                    title={`${ZONE_LABELS[zi]}: ${Math.round(activity[key] / 60)}m (${Math.round(pct)}%)`}
                  />
                ) : null;
              })}
            </div>
            <div className="hr-zone-activity-legend">
              {ZONE_KEYS.map((key, zi) =>
                activity[key] > 0 ? (
                  <span key={key} className="zone-label-small" style={{ color: ZONE_COLORS[zi] }}>
                    Z{zi + 1} {Math.round(activity[key] / 60)}m
                  </span>
                ) : null,
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TrainingLoadChart({ series }) {
  const width = 760;
  const height = 290;
  const margin = { top: 20, right: 12, bottom: 40, left: 44 };
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;

  const minDate = series[0].dateObj.getTime();
  const maxDate = series[series.length - 1].dateObj.getTime();
  const minY = Math.min(...series.map((d) => Math.min(d.atl, d.ctl, d.tsb))) * 0.9;
  const maxY = Math.max(...series.map((d) => Math.max(d.atl, d.ctl, d.tsb))) * 1.1;

  const x = (t) => margin.left + ((t - minDate) / Math.max(1, maxDate - minDate)) * innerW;
  const y = (v) => margin.top + (1 - (v - minY) / Math.max(1, maxY - minY)) * innerH;

  const asPath = (key) =>
    series
      .map((d, i) => `${i ? "L" : "M"}${x(d.dateObj.getTime()).toFixed(2)} ${y(d[key]).toFixed(2)}`)
      .join(" ");

  const tickDates = [0, 0.2, 0.4, 0.6, 0.8, 1].map((f) => new Date(minDate + (maxDate - minDate) * f));
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => minY + (maxY - minY) * f);

  return (
    <div className="d3-chart">
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} role="img" aria-label="Acute and chronic training load timeline">
        {yTicks.map((val) => (
          <g key={val}>
            <line x1={margin.left} y1={y(val)} x2={width - margin.right} y2={y(val)} stroke="#e2e8f0" strokeWidth="1" />
            <text x={margin.left - 8} y={y(val) + 4} textAnchor="end" fill="#64748b" fontSize="11">
              {val.toFixed(0)}
            </text>
          </g>
        ))}

        {tickDates.map((d) => (
          <text key={d.toISOString()} x={x(d.getTime())} y={height - 12} textAnchor="middle" fill="#64748b" fontSize="11">
            {fmtDate(d)}
          </text>
        ))}

        <path d={asPath("atl")} fill="none" stroke="#ef4444" strokeWidth="2.5" />
        <path d={asPath("ctl")} fill="none" stroke="#2563eb" strokeWidth="2.5" />
        <path d={asPath("tsb")} fill="none" stroke="#16a34a" strokeWidth="2" strokeDasharray="5 4" />

        <g transform={`translate(${margin.left},${margin.top})`}>
          <line x1="0" y1="0" x2="20" y2="0" stroke="#ef4444" strokeWidth="3" />
          <text x="26" y="4" fill="#334155" fontSize="12">
            Fatigue (ATL)
          </text>
        </g>
        <g transform={`translate(${margin.left + 170},${margin.top})`}>
          <line x1="0" y1="0" x2="20" y2="0" stroke="#2563eb" strokeWidth="3" />
          <text x="26" y="4" fill="#334155" fontSize="12">
            Fitness (CTL)
          </text>
        </g>
        <g transform={`translate(${margin.left + 340},${margin.top})`}>
          <line x1="0" y1="0" x2="20" y2="0" stroke="#16a34a" strokeWidth="3" strokeDasharray="5 4" />
          <text x="26" y="4" fill="#334155" fontSize="12">
            Form (TSB)
          </text>
        </g>
      </svg>
    </div>
  );
}

function WeeklyLoadChart({ points }) {
  const width = 760;
  const height = 270;
  const margin = { top: 22, right: 12, bottom: 42, left: 44 };
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;
  const band = innerW / points.length;
  const barW = Math.min(36, band * 0.62);
  const maxLoad = Math.max(...points.map((d) => d.load), 1);
  const y = (v) => margin.top + (1 - v / maxLoad) * innerH;
  const x = (i) => margin.left + i * band + (band - barW) / 2;

  return (
    <div className="d3-chart">
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} role="img" aria-label="Weekly training load">
        {[0, 0.25, 0.5, 0.75, 1].map((f) => {
          const val = maxLoad * f;
          return (
            <g key={f}>
              <line x1={margin.left} y1={y(val)} x2={width - margin.right} y2={y(val)} stroke="#e2e8f0" strokeWidth="1" />
              <text x={margin.left - 8} y={y(val) + 4} textAnchor="end" fill="#64748b" fontSize="11">
                {Math.round(val)}
              </text>
            </g>
          );
        })}
        {points.map((point, i) => (
          <g key={point.label}>
            <rect x={x(i)} y={y(point.load)} width={barW} height={height - margin.bottom - y(point.load)} rx="6" fill="#0ea5e9" />
            <text x={x(i) + barW / 2} y={height - 14} textAnchor="middle" fill="#64748b" fontSize="11">
              {point.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

function LongRunChart({ points }) {
  const width = 760;
  const height = 290;
  const margin = { top: 24, right: 44, bottom: 40, left: 44 };
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;

  const band = innerW / points.length;
  const barW = Math.min(28, band * 0.55);
  const maxDist = Math.max(...points.map((d) => d.distanceKm), 1) * 1.2;
  const maxElev = Math.max(...points.map((d) => d.elevation), 1) * 1.2;
  const x = (i) => margin.left + i * band + (band - barW) / 2;
  const yDist = (v) => margin.top + (1 - v / maxDist) * innerH;
  const yElev = (v) => margin.top + (1 - v / maxElev) * innerH;

  const linePath = points
    .map((point, i) => `${i ? "L" : "M"}${(x(i) + barW / 2).toFixed(2)} ${yElev(point.elevation).toFixed(2)}`)
    .join(" ");

  return (
    <div className="d3-chart">
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} role="img" aria-label="Long run distance and elevation progression">
        {points.map((point, i) => (
          <g key={point.label}>
            <rect x={x(i)} y={yDist(point.distanceKm)} width={barW} height={height - margin.bottom - yDist(point.distanceKm)} rx="6" fill="#3b82f6" />
            <text x={x(i) + barW / 2} y={height - 12} textAnchor="middle" fill="#64748b" fontSize="11">
              {point.label}
            </text>
          </g>
        ))}

        <path d={linePath} fill="none" stroke="#f59e0b" strokeWidth="2.5" />
        {points.map((point, i) => (
          <circle key={`${point.label}-dot`} cx={x(i) + barW / 2} cy={yElev(point.elevation)} r="3.5" fill="#f59e0b" />
        ))}
      </svg>
    </div>
  );
}

export default function InsightsPage() {
  const { activities, checkins, plans, strava } = useAppData();

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
      const curr = weekly.get(key) || 0;
      weekly.set(key, curr + (Number(activity.moving_time) || 0) / 60);
    });

    return Array.from(weekly.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-8)
      .map(([weekStart, load]) => ({
        label: fmtDate(weekStart),
        load: Math.round(load),
      }));
  }, [activities.activities]);

  const weeklyZones = useMemo(() => computeWeeklyHRZones(activities.activities), [activities.activities]);
  const activityZones = useMemo(() => computeRecentActivityZones(activities.activities), [activities.activities]);

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
      const wk = mondayOfWeek.toISOString().split("T")[0];
      weeksWithRuns.add(wk);
    });

    const thisWeekKm = (thisWeekDist / 1000).toFixed(1);
    const distDeltaKm = ((thisWeekDist - lastWeekDist) / 1000).toFixed(1);
    const distDir = thisWeekDist > lastWeekDist ? "up" : thisWeekDist < lastWeekDist ? "down" : "neutral";
    const distDelta = distDir === "neutral" ? "Same as last week" : `${distDir === "up" ? "+" : ""}${distDeltaKm} km vs last week`;

    const last8Mondays = Array.from({ length: 8 }, (_, i) => {
      const m = new Date(thisMonday);
      m.setDate(thisMonday.getDate() - i * 7);
      return m.toISOString().split("T")[0];
    });
    const weeksRun = last8Mondays.filter((w) => weeksWithRuns.has(w)).length;
    const consistencyFrac = `${weeksRun}/8 wks`;

    const latestTL = trainingLoadSeries.at(-1);
    const ctl4wAgo = trainingLoadSeries.length >= 28 ? trainingLoadSeries[trainingLoadSeries.length - 28] : null;
    const ctlValue = Math.round(latestTL?.ctl ?? 0);
    const ctlDelta = ctl4wAgo ? Math.round((latestTL.ctl - ctl4wAgo.ctl) * 10) / 10 : null;
    const ctlDir = ctlDelta == null ? "neutral" : ctlDelta > 0 ? "up" : ctlDelta < 0 ? "down" : "neutral";
    const ctlDeltaStr = ctlDelta == null ? null : `${ctlDelta > 0 ? "+" : ""}${ctlDelta} vs 4 weeks ago`;

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
  const fitnessLevel = ctl < 20 ? "Building" : ctl < 40 ? "Developing" : ctl < 60 ? "Strong" : "Peak";

  const targetLongRunKm = useMemo(() => {
    const currentMileage = Number(plans.plans[0]?.current_mileage) || 0;
    if (currentMileage > 0) {
      return Math.max(12, Math.round(currentMileage * 0.35));
    }
    const longest = Math.max(...longRunPoints.map((point) => point.distanceKm), 0);
    return longest > 0 ? Math.round(longest * 1.15) : 20;
  }, [longRunPoints, plans.plans]);
  const latestLongRunKm = longRunPoints.at(-1)?.distanceKm ?? 0;
  const longRunCompletion = Math.max(0, Math.min(100, Math.round((latestLongRunKm / Math.max(1, targetLongRunKm)) * 100)));

  const latest = checkins.checkins[0];
  const latestText = latest
    ? `Week of ${new Date(latest.week_of).toLocaleDateString()}: fatigue ${latest.fatigue}/5, sleep ${latest.sleep_quality}/5, motivation ${latest.motivation}/5${latest.niggles ? ` · Niggles: ${latest.niggles}` : ""}`
    : "No check-in yet. Submit your weekly check-in below to track readiness.";

  const formStat = trainingLoadSeries.at(-1)?.tsb;
  const readiness = formStat == null ? "—" : formStat > 5 ? "Fresh" : formStat > -5 ? "Neutral" : "Fatigued";

  const risk = useMemo(() => {
    const last = trainingLoadSeries.at(-1);
    if (!last) return "—";
    const ratio = last.ctl > 0 ? last.atl / last.ctl : 0;
    if (ratio > 1.5) return "High";
    if (ratio > 1.2) return "Moderate";
    return "Low";
  }, [trainingLoadSeries]);

  const hasData = activities.activities.length > 0;
  const isLoading = activities.loading;

  return (
    <section id="insights" className="page">
      <div className="page-header">
        <h2>Training analysis &amp; insights</h2>
        <p>Understand readiness, spot risk early, and see the impact of your consistency.</p>
      </div>

      {/* KPI strip */}
      <div className="kpi-strip">
        {isLoading ? (
          <>
            <SkeletonBlock height={88} />
            <SkeletonBlock height={88} />
            <SkeletonBlock height={88} />
            <SkeletonBlock height={88} />
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
        <div className="empty-state">
          <p className="empty-state__title">No training data yet</p>
          <p className="empty-state__body">
            Connect Strava and sync your activities to unlock training load charts, zone analysis, and readiness tracking.
          </p>
          {strava.startConnect && (
            <button type="button" className="btn btn--primary" onClick={strava.startConnect} style={{ marginTop: "16px" }}>
              Connect Strava
            </button>
          )}
        </div>
      )}

      {/* Chart sections — skeleton while loading, hidden when empty */}
      {isLoading ? (
        <>
          <SkeletonBlock height={290} />
          <SkeletonBlock height={270} />
          <SkeletonBlock height={280} />
        </>
      ) : hasData ? (
        <>
          {trainingLoadSeries.length >= 7 && (
            <div id="training-load-section">
              <h4>Training load trend</h4>
              <TrainingLoadChart series={trainingLoadSeries} />
            </div>
          )}

          {weeklyLoadPoints.length >= 3 && (
            <div id="weekly-load-section">
              <h4>Weekly load</h4>
              <p className="muted">Rolling 8-week view of accumulated training minutes.</p>
              <WeeklyLoadChart points={weeklyLoadPoints} />
            </div>
          )}

          {(weeklyZones.length >= 1 || activityZones.length >= 1) && (
            <div id="hr-zones-section">
              <h4>Heart rate zone distribution</h4>
              <p className="muted">Time spent in each training zone — use this to balance aerobic base (Z1–Z2) against intensity (Z3–Z5) week by week.</p>
              {weeklyZones.length >= 2 && <HRZoneWeeklyChart weeks={weeklyZones} />}
              {activityZones.length >= 1 && (
                <>
                  <h4 style={{ marginTop: "24px" }}>Zone breakdown per workout</h4>
                  <p className="muted">Last {activityZones.length} activities with heart rate data.</p>
                  <div className="metric-card" style={{ marginTop: "12px" }}>
                    <HRZoneActivityBreakdown activityZones={activityZones} />
                  </div>
                </>
              )}
            </div>
          )}

          <div id="fitness-level-section" className="metric-card">
            <h4>Fitness level</h4>
            <p className="muted">Calculated from current chronic load (CTL).</p>
            <div className="fitness-meter" role="img" aria-label={`Fitness level ${fitnessScore} out of 100`}>
              <div className="fitness-meter__fill" style={{ width: `${fitnessScore}%` }} />
            </div>
            <div className="metric-row">
              <span>Level: {fitnessLevel}</span>
              <strong>{fitnessScore}/100</strong>
            </div>
          </div>

          {longRunPoints.length >= 2 && (
            <div id="long-run-section">
              <h4>Long run progression</h4>
              <div className="metric-row">
                <span>
                  Long run progress: <strong>{latestLongRunKm.toFixed(1)} km</strong> / {targetLongRunKm} km target
                </span>
                <strong>{longRunCompletion}%</strong>
              </div>
              <div className="fitness-meter" role="img" aria-label={`Long run progress ${longRunCompletion} percent`}>
                <div className="fitness-meter__fill fitness-meter__fill--longrun" style={{ width: `${longRunCompletion}%` }} />
              </div>
              <LongRunChart points={longRunPoints} />
            </div>
          )}

          <div className="insight-summary" id="insight-summary">
            <div>
              <h4>Latest check-in</h4>
              <p className="muted" id="latest-checkin-text">
                {latestText}
              </p>
            </div>
            <div className="stats" id="insight-stats">
              <div>
                <span className="label">Form trend</span>
                <strong id="stat-form">{formStat == null ? "—" : `${formStat > 0 ? "+" : ""}${formStat.toFixed(1)}`}</strong>
              </div>
              <div>
                <span className="label">Readiness</span>
                <strong id="stat-readiness">{readiness}</strong>
              </div>
              <div>
                <span className="label">Risk score</span>
                <strong id="stat-risk">{risk}</strong>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </section>
  );
}
