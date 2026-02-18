import React, { useMemo } from "react";
import { useAppData } from "../context/AppDataContext";
import { computeLongRuns, computeTrainingLoad } from "../domain/compute";

function fmtDate(value) {
  return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric" });
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
  const { activities, checkins } = useAppData();

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

  return (
    <section id="insights" className="page">
      <div className="page-header">
        <h2>Training analysis &amp; insights</h2>
        <p>Understand readiness, spot risk early, and see the impact of your consistency.</p>
      </div>

      <div className="insight-cards">
        <div className="insight">
          <span className="pill">Training load</span>
          <h4>Acute vs chronic balance</h4>
          <p>Visualize fatigue and form trends so you can confidently push or recover.</p>
        </div>
        <div className="insight">
          <span className="pill">Performance</span>
          <h4>Race readiness forecast</h4>
          <p>Track long-run durability, vertical progression, and race-specific confidence signals.</p>
        </div>
        <div className="insight">
          <span className="pill">Risk</span>
          <h4>Overtraining alerts</h4>
          <p>Detect sudden spikes and missed recovery before they derail the block.</p>
        </div>
      </div>

      {trainingLoadSeries.length >= 7 && (
        <div id="training-load-section">
          <h4>Training load trend</h4>
          <TrainingLoadChart series={trainingLoadSeries} />
        </div>
      )}

      {longRunPoints.length >= 2 && (
        <div id="long-run-section">
          <h4>Long run progression</h4>
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
    </section>
  );
}
