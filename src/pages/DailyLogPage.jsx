import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useAppData } from "../context/AppDataContext";

// ─── helpers ────────────────────────────────────────────────────────────────

function todayIso() {
  return new Date().toISOString().split("T")[0];
}

function fmtDate(iso) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

const QUALITY_LABELS = { 1: "Very poor", 2: "Poor", 3: "Okay", 4: "Good", 5: "Great" };
const FATIGUE_LABELS = { 1: "Fresh", 2: "Light", 3: "Moderate", 4: "Heavy", 5: "Destroyed" };
const MOOD_LABELS    = { 1: "Low", 2: "Meh", 3: "Okay", 4: "Good", 5: "High" };
const STRESS_LABELS  = { 1: "None", 2: "Low", 3: "Moderate", 4: "High", 5: "Very high" };
const SLEEP_LABELS   = { 1: "Terrible", 2: "Poor", 3: "Okay", 4: "Good", 5: "Great" };

// ─── sub-components ─────────────────────────────────────────────────────────

function RatingInput({ name, value, onChange, labels }) {
  return (
    <div className="rating-group" role="group">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          className={`rating-btn${value === n ? " is-active" : ""}`}
          title={labels[n]}
          aria-pressed={value === n}
          onClick={() => onChange(name, value === n ? null : n)}
        >
          {n}
        </button>
      ))}
      {value && <span className="rating-label muted">{labels[value]}</span>}
    </div>
  );
}

function MetricChip({ icon, label, value }) {
  if (value == null) return null;
  return (
    <span className="wellness-metric-chip">
      {icon && <span aria-hidden="true">{icon}</span>}
      <span>{label}: <strong>{value}</strong></span>
    </span>
  );
}

function LogCard({ log }) {
  const qualityColor =
    log.training_quality >= 4 ? "is-great"
    : log.training_quality >= 3 ? "is-good"
    : log.training_quality != null ? "is-flat"
    : "";

  return (
    <article className="daily-log-item wellness-card">
      <header className="wellness-card-header">
        <strong>{fmtDate(log.log_date)}</strong>
        <div className="wellness-chips">
          {log.training_quality != null && (
            <span className={`daily-log-pill ${qualityColor}`}>
              Training {log.training_quality}/5
            </span>
          )}
          {log.training_quality == null && (
            <span className="daily-log-pill is-okay">Rest day</span>
          )}
        </div>
      </header>

      <div className="wellness-metrics">
        <MetricChip icon="😴" label="Sleep" value={log.sleep_hours != null ? `${log.sleep_hours}h` : null} />
        <MetricChip icon="🌙" label="Sleep quality" value={log.sleep_quality != null ? `${log.sleep_quality}/5` : null} />
        <MetricChip icon="❤️" label="RHR" value={log.resting_hr != null ? `${log.resting_hr} bpm` : null} />
        <MetricChip icon="🦵" label="Fatigue" value={log.fatigue != null ? `${log.fatigue}/5` : null} />
        <MetricChip icon="😊" label="Mood" value={log.mood != null ? `${log.mood}/5` : null} />
        <MetricChip icon="⚡" label="Stress" value={log.stress != null ? `${log.stress}/5` : null} />
        <MetricChip icon="🍺" label="Alcohol" value={log.alcohol_units != null && log.alcohol_units > 0 ? `${log.alcohol_units} units` : null} />
      </div>

      {log.workout_notes && (
        <p className="wellness-notes">
          <strong>Workout:</strong> {log.workout_notes}
        </p>
      )}
      {log.notes && <p className="wellness-notes muted">{log.notes}</p>}
    </article>
  );
}

// ─── charts ─────────────────────────────────────────────────────────────────

/** Multi-line wellness timeline over the last N logs. */
function WellnessTimeline({ logs }) {
  const points = useMemo(
    () =>
      [...logs]
        .filter((l) => l.training_quality || l.sleep_quality || l.mood || l.fatigue)
        .reverse()
        .slice(-14),
    [logs],
  );

  if (points.length < 3) return null;

  const W = 720, H = 240;
  const mg = { top: 24, right: 16, bottom: 40, left: 36 };
  const iW = W - mg.left - mg.right;
  const iH = H - mg.top - mg.bottom;
  const x = (i) => mg.left + (i / Math.max(1, points.length - 1)) * iW;
  const y = (v) => mg.top + (1 - (v - 1) / 4) * iH; // scale 1-5 → H

  const series = [
    { key: "training_quality", color: "#2563eb", label: "Training" },
    { key: "sleep_quality",    color: "#7c3aed", label: "Sleep" },
    { key: "mood",             color: "#16a34a", label: "Mood" },
    { key: "fatigue",          color: "#ef4444", label: "Fatigue" },
  ];

  const path = (key) => {
    let started = false;
    return points
      .map((p, i) => {
        if (p[key] == null) return null;
        const cmd = started ? "L" : "M";
        started = true;
        return `${cmd}${x(i).toFixed(1)} ${y(p[key]).toFixed(1)}`;
      })
      .filter(Boolean)
      .join(" ");
  };

  const yTicks = [1, 2, 3, 4, 5];

  return (
    <div className="d3-chart">
      <div className="hr-zone-legend">
        {series.map((s) => (
          <div key={s.key} className="hr-zone-legend-item">
            <div className="hr-zone-legend-dot" style={{ background: s.color }} />
            <span>{s.label}</span>
          </div>
        ))}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} role="img" aria-label="Wellness metrics over time">
        {yTicks.map((v) => (
          <g key={v}>
            <line x1={mg.left} y1={y(v)} x2={W - mg.right} y2={y(v)} stroke="#e2e8f0" strokeWidth="1" />
            <text x={mg.left - 6} y={y(v) + 4} textAnchor="end" fill="#94a3b8" fontSize="11">{v}</text>
          </g>
        ))}
        {points.map((p, i) => (
          <text key={p.log_date} x={x(i)} y={H - 14} textAnchor="middle" fill="#94a3b8" fontSize="10">
            {new Date(`${p.log_date}T00:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
          </text>
        ))}
        {series.map((s) => (
          <g key={s.key}>
            <path d={path(s.key)} fill="none" stroke={s.color} strokeWidth="2.5" strokeLinejoin="round" />
            {points.map((p, i) =>
              p[s.key] != null ? (
                <circle key={i} cx={x(i)} cy={y(p[s.key])} r="3.5" fill={s.color}>
                  <title>{s.label}: {p[s.key]}/5 on {p.log_date}</title>
                </circle>
              ) : null,
            )}
          </g>
        ))}
      </svg>
    </div>
  );
}

/**
 * For a given lifestyle metric (e.g. sleep_quality 1-5),
 * bucket the logs and compute average training_quality per bucket.
 */
function CorrelationChart({ logs, metricKey, metricLabel, buckets, bucketLabels, color }) {
  const data = useMemo(() => {
    const sums = new Map(buckets.map((b) => [b, { sum: 0, count: 0 }]));
    logs.forEach((l) => {
      if (l.training_quality == null || l[metricKey] == null) return;
      const bkt = buckets.find((b) => (Array.isArray(b) ? l[metricKey] >= b[0] && l[metricKey] <= b[1] : l[metricKey] === b));
      if (!bkt) return;
      const key = Array.isArray(bkt) ? bkt : bkt;
      const entry = sums.get(key);
      if (entry) {
        entry.sum += l.training_quality;
        entry.count += 1;
      }
    });
    return buckets.map((b, i) => {
      const entry = sums.get(b);
      return {
        label: bucketLabels[i],
        avg: entry && entry.count > 0 ? entry.sum / entry.count : null,
        count: entry?.count ?? 0,
      };
    });
  }, [logs, metricKey, buckets]);

  const hasData = data.some((d) => d.avg != null);
  if (!hasData) return null;

  const W = 340, H = 200;
  const mg = { top: 28, right: 12, bottom: 44, left: 40 };
  const iW = W - mg.left - mg.right;
  const iH = H - mg.top - mg.bottom;
  const band = iW / data.length;
  const barW = Math.min(36, band * 0.6);
  const maxVal = 5;
  const y = (v) => mg.top + (1 - v / maxVal) * iH;
  const x = (i) => mg.left + i * band + (band - barW) / 2;

  return (
    <div className="correlation-chart-card">
      <h5 className="correlation-chart-title">{metricLabel} → Training quality</h5>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} role="img" aria-label={`${metricLabel} vs training quality correlation`}>
        {[1, 2, 3, 4, 5].map((v) => (
          <g key={v}>
            <line x1={mg.left} y1={y(v)} x2={W - mg.right} y2={y(v)} stroke="#e2e8f0" strokeWidth="1" />
            <text x={mg.left - 6} y={y(v) + 4} textAnchor="end" fill="#94a3b8" fontSize="11">{v}</text>
          </g>
        ))}
        {data.map((d, i) => (
          <g key={d.label}>
            {d.avg != null && (
              <rect
                x={x(i)} y={y(d.avg)}
                width={barW} height={H - mg.bottom - y(d.avg)}
                rx="6" fill={color} opacity="0.85"
              >
                <title>{d.label}: avg {d.avg.toFixed(1)}/5 ({d.count} entries)</title>
              </rect>
            )}
            {d.avg != null && (
              <text x={x(i) + barW / 2} y={y(d.avg) - 5} textAnchor="middle" fill="#334155" fontSize="11" fontWeight="600">
                {d.avg.toFixed(1)}
              </text>
            )}
            <text x={x(i) + barW / 2} y={H - 26} textAnchor="middle" fill="#64748b" fontSize="11">
              {d.label}
            </text>
            {d.count > 0 && (
              <text x={x(i) + barW / 2} y={H - 13} textAnchor="middle" fill="#94a3b8" fontSize="10">
                n={d.count}
              </text>
            )}
          </g>
        ))}
      </svg>
    </div>
  );
}

// ─── empty state ─────────────────────────────────────────────────────────────

function EmptyHistory() {
  return (
    <div className="empty-state" style={{ padding: "32px 0" }}>
      <p className="empty-state__title">No entries yet</p>
      <p className="empty-state__body">Start logging daily to unlock the correlation charts.</p>
    </div>
  );
}

// ─── page ────────────────────────────────────────────────────────────────────

const DEFAULT_FORM = {
  log_date: todayIso(),
  training_quality: null,
  workout_notes: "",
  sleep_hours: "",
  sleep_quality: null,
  resting_hr: "",
  alcohol_units: 0,
  stress: null,
  mood: null,
  fatigue: null,
  notes: "",
};

export default function DailyLogPage() {
  const { dailyLogs, auth } = useAppData();
  const [form, setForm] = useState(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  // Load logs on mount once user is available
  useEffect(() => {
    if (auth.user) {
      dailyLogs.loadLogs().catch(() => {});
    }
  }, [auth.user]); // eslint-disable-line react-hooks/exhaustive-deps

  // When user changes the date, pre-fill form with existing log if it exists
  useEffect(() => {
    const existing = dailyLogs.logs.find((l) => l.log_date === form.log_date);
    if (existing) {
      setForm({
        log_date: existing.log_date,
        training_quality: existing.training_quality ?? null,
        workout_notes: existing.workout_notes ?? "",
        sleep_hours: existing.sleep_hours ?? "",
        sleep_quality: existing.sleep_quality ?? null,
        resting_hr: existing.resting_hr ?? "",
        alcohol_units: existing.alcohol_units ?? 0,
        stress: existing.stress ?? null,
        mood: existing.mood ?? null,
        fatigue: existing.fatigue ?? null,
        notes: existing.notes ?? "",
      });
    } else {
      setForm((prev) => ({
        ...DEFAULT_FORM,
        log_date: prev.log_date,
      }));
    }
  }, [form.log_date, dailyLogs.logs]); // eslint-disable-line react-hooks/exhaustive-deps

  const onChange = useCallback((e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }, []);

  const onRating = useCallback((name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }));
  }, []);

  const onSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      setSaving(true);
      setMessage("");
      try {
        const payload = {
          log_date: form.log_date,
          training_quality: form.training_quality ?? null,
          workout_notes: form.workout_notes.trim() || null,
          sleep_hours: form.sleep_hours !== "" ? Number(form.sleep_hours) : null,
          sleep_quality: form.sleep_quality ?? null,
          resting_hr: form.resting_hr !== "" ? Number(form.resting_hr) : null,
          alcohol_units: Number(form.alcohol_units) || 0,
          stress: form.stress ?? null,
          mood: form.mood ?? null,
          fatigue: form.fatigue ?? null,
          notes: form.notes.trim() || null,
        };
        await dailyLogs.saveLog(payload);
        setMessage("Log saved.");
        setTimeout(() => setMessage(""), 3000);
      } catch (err) {
        setMessage(`Error: ${err.message}`);
      } finally {
        setSaving(false);
      }
    },
    [form, dailyLogs],
  );

  const isExistingEntry = dailyLogs.logs.some((l) => l.log_date === form.log_date);

  return (
    <section className="page daily-log-page" id="daily-log">
      <div className="page-header">
        <h2>Daily log</h2>
        <p>Track sleep, lifestyle, and training quality to spot what helps you perform.</p>
      </div>

      {/* ── top grid: form + recent activity ── */}
      <div className="daily-log-grid">
        {/* ── form ── */}
        <form className="daily-log-form" onSubmit={onSubmit} noValidate>
          <h3>{isExistingEntry ? "Edit entry" : "Add today's log"}</h3>

          <label className="dl-field">
            <span>Date</span>
            <input
              type="date"
              name="log_date"
              value={form.log_date}
              max={todayIso()}
              onChange={onChange}
              className="dl-input"
            />
          </label>

          {/* Training */}
          <fieldset className="dl-fieldset">
            <legend>Training</legend>
            <div className="dl-field">
              <span className="dl-label">Training quality <span className="muted">(skip on rest days)</span></span>
              <RatingInput name="training_quality" value={form.training_quality} onChange={onRating} labels={QUALITY_LABELS} />
            </div>
            <div className="dl-field">
              <span className="dl-label">Workout notes</span>
              <input
                type="text"
                name="workout_notes"
                value={form.workout_notes}
                onChange={onChange}
                placeholder="e.g. 12km easy, avg HR 142"
                className="dl-input"
              />
            </div>
          </fieldset>

          {/* Recovery */}
          <fieldset className="dl-fieldset">
            <legend>Recovery</legend>
            <div className="dl-field">
              <span className="dl-label">Sleep hours</span>
              <input
                type="number"
                name="sleep_hours"
                value={form.sleep_hours}
                onChange={onChange}
                min="0" max="24" step="0.5"
                placeholder="e.g. 7.5"
                className="dl-input dl-input--short"
              />
            </div>
            <div className="dl-field">
              <span className="dl-label">Sleep quality</span>
              <RatingInput name="sleep_quality" value={form.sleep_quality} onChange={onRating} labels={SLEEP_LABELS} />
            </div>
            <div className="dl-field">
              <span className="dl-label">Resting HR <span className="muted">(bpm, optional)</span></span>
              <input
                type="number"
                name="resting_hr"
                value={form.resting_hr}
                onChange={onChange}
                min="30" max="120"
                placeholder="e.g. 52"
                className="dl-input dl-input--short"
              />
            </div>
            <div className="dl-field">
              <span className="dl-label">Muscle fatigue / soreness</span>
              <RatingInput name="fatigue" value={form.fatigue} onChange={onRating} labels={FATIGUE_LABELS} />
            </div>
          </fieldset>

          {/* Lifestyle */}
          <fieldset className="dl-fieldset">
            <legend>Lifestyle</legend>
            <div className="dl-field">
              <span className="dl-label">Alcohol units</span>
              <div className="stepper">
                <button
                  type="button"
                  className="stepper-btn"
                  onClick={() => setForm((p) => ({ ...p, alcohol_units: Math.max(0, (Number(p.alcohol_units) || 0) - 1) }))}
                >−</button>
                <span className="stepper-val">{form.alcohol_units}</span>
                <button
                  type="button"
                  className="stepper-btn"
                  onClick={() => setForm((p) => ({ ...p, alcohol_units: Math.min(30, (Number(p.alcohol_units) || 0) + 1) }))}
                >+</button>
              </div>
            </div>
            <div className="dl-field">
              <span className="dl-label">Mood / energy</span>
              <RatingInput name="mood" value={form.mood} onChange={onRating} labels={MOOD_LABELS} />
            </div>
            <div className="dl-field">
              <span className="dl-label">Stress level</span>
              <RatingInput name="stress" value={form.stress} onChange={onRating} labels={STRESS_LABELS} />
            </div>
          </fieldset>

          <div className="dl-field">
            <span className="dl-label">Notes</span>
            <textarea
              name="notes"
              value={form.notes}
              onChange={onChange}
              rows="3"
              placeholder="Anything else worth noting…"
              className="dl-input"
            />
          </div>

          <button type="submit" className="btn btn--primary" disabled={saving}>
            {saving ? "Saving…" : isExistingEntry ? "Update log" : "Save log"}
          </button>
          {message && (
            <p className="form-note" role="status">{message}</p>
          )}
          {dailyLogs.error && (
            <p className="form-note form-note--error" role="alert">
              {dailyLogs.error.message}
            </p>
          )}
        </form>

        {/* ── recent history ── */}
        <section className="daily-log-history" aria-label="Recent daily logs">
          <h3>Recent entries</h3>
          {dailyLogs.loading && <p className="muted">Loading…</p>}
          {!dailyLogs.loading && dailyLogs.logs.length === 0 && <EmptyHistory />}
          <div className="daily-log-list">
            {dailyLogs.logs.slice(0, 10).map((log) => (
              <LogCard key={log.id} log={log} />
            ))}
          </div>
        </section>
      </div>

      {/* ── charts ── */}
      {dailyLogs.logs.length >= 3 && (
        <>
          <div className="chart-section-header">
            <h3>Wellness trends</h3>
            <p className="muted">Last 14 logged days — compare how your sleep, mood, fatigue, and training quality track together.</p>
          </div>

          <div className="metric-card" style={{ marginBottom: "24px" }}>
            <WellnessTimeline logs={dailyLogs.logs} />
          </div>

          <div className="chart-section-header">
            <h3>Correlations</h3>
            <p className="muted">Average training quality grouped by lifestyle and recovery factors. More entries = more reliable signal.</p>
          </div>

          <div className="correlation-charts">
            <CorrelationChart
              logs={dailyLogs.logs}
              metricKey="sleep_quality"
              metricLabel="Sleep quality"
              buckets={[1, 2, 3, 4, 5]}
              bucketLabels={["1", "2", "3", "4", "5"]}
              color="#7c3aed"
            />
            <CorrelationChart
              logs={dailyLogs.logs}
              metricKey="alcohol_units"
              metricLabel="Alcohol"
              buckets={[0, [1, 2], [3, 99]]}
              bucketLabels={["None", "1–2", "3+"]}
              color="#f59e0b"
            />
            <CorrelationChart
              logs={dailyLogs.logs}
              metricKey="fatigue"
              metricLabel="Fatigue"
              buckets={[1, 2, 3, 4, 5]}
              bucketLabels={["1", "2", "3", "4", "5"]}
              color="#ef4444"
            />
            <CorrelationChart
              logs={dailyLogs.logs}
              metricKey="mood"
              metricLabel="Mood"
              buckets={[1, 2, 3, 4, 5]}
              bucketLabels={["1", "2", "3", "4", "5"]}
              color="#16a34a"
            />
          </div>
        </>
      )}
    </section>
  );
}
