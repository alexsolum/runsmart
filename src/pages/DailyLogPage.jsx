import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useAppData } from "../context/AppDataContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

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
      {value && <span className="text-xs text-slate-500 ml-1">{labels[value]}</span>}
    </div>
  );
}


function MetricChip({ icon, label, value }) {
  if (value == null) return null;
  return (
    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
      {icon && <span aria-hidden="true">{icon}</span>}
      <span>{label}: <strong className="font-mono">{value}</strong></span>
    </span>
  );
}

// ── Training quality pill colors ──────────────────────────────────────────────
const PILL_STYLES = {
  great: "bg-green-100 text-green-800",
  good:  "bg-blue-100 text-blue-800",
  okay:  "bg-amber-100 text-amber-800",
  flat:  "bg-red-100 text-red-800",
};

function QualityPill({ quality }) {
  if (quality == null) {
    return <span className={`text-xs font-semibold rounded-full px-2.5 py-0.5 capitalize ${PILL_STYLES.okay}`}>Rest day</span>;
  }
  const style = quality >= 4 ? PILL_STYLES.great : quality >= 3 ? PILL_STYLES.good : PILL_STYLES.flat;
  return <span className={`text-xs font-semibold rounded-full px-2.5 py-0.5 capitalize ${style}`}>Training {quality}/5</span>;
}

function LogCard({ log }) {
  return (
    <article className="border border-slate-200 rounded-xl p-3 bg-slate-50 grid gap-2">
      <header className="flex justify-between items-center gap-2 flex-wrap">
        <strong className="text-sm">{fmtDate(log.log_date)}</strong>
        <div className="flex flex-wrap gap-1">
          <QualityPill quality={log.training_quality} />
        </div>
      </header>

      <div className="flex flex-wrap gap-1.5">
        <MetricChip icon="😴" label="Sleep" value={log.sleep_hours != null ? `${log.sleep_hours}h` : null} />
        <MetricChip icon="🌙" label="Sleep quality" value={log.sleep_quality != null ? `${log.sleep_quality}/5` : null} />
        <MetricChip icon="❤️" label="RHR" value={log.resting_hr != null ? `${log.resting_hr} bpm` : null} />
        <MetricChip icon="🦵" label="Fatigue" value={log.fatigue != null ? `${log.fatigue}/5` : null} />
        <MetricChip icon="😊" label="Mood" value={log.mood != null ? `${log.mood}/5` : null} />
        <MetricChip icon="⚡" label="Stress" value={log.stress != null ? `${log.stress}/5` : null} />
        <MetricChip icon="🍺" label="Alcohol" value={log.alcohol_units != null && log.alcohol_units > 0 ? `${log.alcohol_units} units` : null} />
      </div>

      {log.workout_notes && (
        <p className="m-0 text-xs text-slate-600">
          <strong>Workout:</strong> {log.workout_notes}
        </p>
      )}
      {log.notes && <p className="m-0 text-xs text-slate-500 italic">{log.notes}</p>}
    </article>
  );
}

// ─── charts ─────────────────────────────────────────────────────────────────

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
  const y = (v) => mg.top + (1 - (v - 1) / 4) * iH;

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

  return (
    <div className="overflow-x-auto">
      <div className="flex gap-4 flex-wrap mb-2">
        {series.map((s) => (
          <div key={s.key} className="flex items-center gap-1.5 text-xs text-slate-600">
            <div className="w-3 h-3 rounded-full shrink-0" style={{ background: s.color }} />
            <span>{s.label}</span>
          </div>
        ))}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} role="img" aria-label="Wellness metrics over time">
        {[1, 2, 3, 4, 5].map((v) => (
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

function CorrelationChart({ logs, metricKey, metricLabel, buckets, bucketLabels, color }) {
  const data = useMemo(() => {
    const sums = new Map(buckets.map((b) => [b, { sum: 0, count: 0 }]));
    logs.forEach((l) => {
      if (l.training_quality == null || l[metricKey] == null) return;
      const bkt = buckets.find((b) => (Array.isArray(b) ? l[metricKey] >= b[0] && l[metricKey] <= b[1] : l[metricKey] === b));
      if (!bkt) return;
      const entry = sums.get(bkt);
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
    <div className="bg-white border border-slate-200 rounded-xl p-4">
      <h5 className="m-0 mb-2.5 text-[13px] font-semibold text-slate-700">{metricLabel} → Training quality</h5>
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

const fieldsetClass = "border border-slate-200 rounded-xl px-4 py-3.5 m-0 mb-1";
const legendClass = "text-[11px] font-semibold uppercase tracking-wider text-slate-500 px-1.5";
const fieldClass = "grid gap-1.5 mb-3.5 last:mb-0";
const labelTextClass = "text-[13px] text-slate-500";

export default function DailyLogPage() {
  const { dailyLogs, auth } = useAppData();
  const [form, setForm] = useState(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (auth.user) {
      dailyLogs.loadLogs().catch(() => {});
    }
  }, [auth.user]); // eslint-disable-line react-hooks/exhaustive-deps

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
      setForm((prev) => ({ ...DEFAULT_FORM, log_date: prev.log_date }));
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
    <section className="page" id="daily-log">
      <div className="mb-5">
        <h2 className="m-0 mb-1 text-2xl font-bold text-slate-900">Daily log</h2>
        <p className="m-0 text-sm text-slate-500">Track sleep, lifestyle, and training quality to spot what helps you perform.</p>
      </div>

      {/* ── top grid: form + recent activity ── */}
      <div className="grid gap-6 grid-cols-[minmax(280px,420px)_minmax(0,1fr)] items-start max-[960px]:grid-cols-1">

        {/* ── form ── */}
        <form className="bg-white border border-slate-200 rounded-2xl p-4 grid gap-3" onSubmit={onSubmit} noValidate>
          <h3 className="m-0 text-sm font-bold">{isExistingEntry ? "Edit entry" : "Add today's log"}</h3>

          <div className={fieldClass}>
            <span className={labelTextClass}>Date</span>
            <Input
              type="date"
              name="log_date"
              value={form.log_date}
              max={todayIso()}
              onChange={onChange}
            />
          </div>

          {/* Training */}
          <fieldset className={fieldsetClass}>
            <legend className={legendClass}>Training</legend>
            <div className={fieldClass}>
              <span className={labelTextClass}>Training quality <span className="text-slate-400">(skip on rest days)</span></span>
              <RatingInput name="training_quality" value={form.training_quality} onChange={onRating} labels={QUALITY_LABELS} />
            </div>
            <div className={fieldClass}>
              <span className={labelTextClass}>Workout notes</span>
              <Input
                type="text"
                name="workout_notes"
                value={form.workout_notes}
                onChange={onChange}
                placeholder="e.g. 12km easy, avg HR 142"
              />
            </div>
          </fieldset>

          {/* Recovery */}
          <fieldset className={fieldsetClass}>
            <legend className={legendClass}>Recovery</legend>
            <div className={fieldClass}>
              <span className={labelTextClass}>Sleep hours</span>
              <Input
                type="number"
                name="sleep_hours"
                value={form.sleep_hours}
                onChange={onChange}
                min="0" max="24" step="0.5"
                placeholder="e.g. 7.5"
                className="max-w-[120px]"
              />
            </div>
            <div className={fieldClass}>
              <span className={labelTextClass}>Sleep quality</span>
              <RatingInput name="sleep_quality" value={form.sleep_quality} onChange={onRating} labels={SLEEP_LABELS} />
            </div>
            <div className={fieldClass}>
              <span className={labelTextClass}>Resting HR <span className="text-slate-400">(bpm, optional)</span></span>
              <Input
                type="number"
                name="resting_hr"
                value={form.resting_hr}
                onChange={onChange}
                min="30" max="120"
                placeholder="e.g. 52"
                className="max-w-[120px]"
              />
            </div>
            <div className={fieldClass}>
              <span className={labelTextClass}>Muscle fatigue / soreness</span>
              <RatingInput name="fatigue" value={form.fatigue} onChange={onRating} labels={FATIGUE_LABELS} />
            </div>
          </fieldset>

          {/* Lifestyle */}
          <fieldset className={fieldsetClass}>
            <legend className={legendClass}>Lifestyle</legend>
            <div className={fieldClass}>
              <span className={labelTextClass}>Alcohol units</span>
              <div className="inline-flex items-center border border-border rounded-lg overflow-hidden">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="rounded-none border-r border-border h-9 w-9 text-lg"
                  onClick={() => setForm((p) => ({ ...p, alcohol_units: Math.max(0, (Number(p.alcohol_units) || 0) - 1) }))}
                >−</Button>
                <span className="w-10 text-center font-semibold text-sm h-9 flex items-center justify-center">{form.alcohol_units}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="rounded-none border-l border-border h-9 w-9 text-lg"
                  onClick={() => setForm((p) => ({ ...p, alcohol_units: Math.min(30, (Number(p.alcohol_units) || 0) + 1) }))}
                >+</Button>
              </div>
            </div>
            <div className={fieldClass}>
              <span className={labelTextClass}>Mood / energy</span>
              <RatingInput name="mood" value={form.mood} onChange={onRating} labels={MOOD_LABELS} />
            </div>
            <div className={fieldClass}>
              <span className={labelTextClass}>Stress level</span>
              <RatingInput name="stress" value={form.stress} onChange={onRating} labels={STRESS_LABELS} />
            </div>
          </fieldset>

          <div className={fieldClass}>
            <span className={labelTextClass}>Notes</span>
            <Textarea
              name="notes"
              value={form.notes}
              onChange={onChange}
              rows="3"
              placeholder="Anything else worth noting…"
            />
          </div>

          <Button type="submit" disabled={saving}>
            {saving ? "Saving…" : isExistingEntry ? "Update log" : "Save log"}
          </Button>
          {message && (
            <p className="text-sm text-slate-600 m-0" role="status">{message}</p>
          )}
          {dailyLogs.error && (
            <p className="text-sm text-red-600 m-0" role="alert">
              {dailyLogs.error.message}
            </p>
          )}
        </form>

        {/* ── recent history ── */}
        <section className="bg-white border border-slate-200 rounded-2xl p-4" aria-label="Recent daily logs">
          <h3 className="m-0 mb-3 text-sm font-bold">Recent entries</h3>
          {dailyLogs.loading && <p className="text-sm text-slate-500 m-0">Loading…</p>}
          {!dailyLogs.loading && dailyLogs.logs.length === 0 && (
            <div className="py-8 text-center">
              <p className="font-semibold text-slate-700 m-0 mb-1">No entries yet</p>
              <p className="text-sm text-slate-500 m-0">Start logging daily to unlock the correlation charts.</p>
            </div>
          )}
          <div className="grid gap-2.5">
            {dailyLogs.logs.slice(0, 10).map((log) => (
              <LogCard key={log.id} log={log} />
            ))}
          </div>
        </section>
      </div>

      {/* ── charts ── */}
      {dailyLogs.logs.length >= 3 && (
        <>
          <div className="mt-8 mb-3">
            <h3 className="m-0 mb-1 text-base font-bold text-slate-900">Wellness trends</h3>
            <p className="m-0 text-sm text-slate-500">Last 14 logged days — compare how your sleep, mood, fatigue, and training quality track together.</p>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-4 mb-6">
            <WellnessTimeline logs={dailyLogs.logs} />
          </div>

          <div className="mt-2 mb-3">
            <h3 className="m-0 mb-1 text-base font-bold text-slate-900">Correlations</h3>
            <p className="m-0 text-sm text-slate-500">Average training quality grouped by lifestyle and recovery factors. More entries = more reliable signal.</p>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6 max-[960px]:grid-cols-1">
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
