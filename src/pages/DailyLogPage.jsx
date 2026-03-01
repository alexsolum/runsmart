import React, { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAppData } from "../context/AppDataContext";
import PageContainer from "../components/layout/PageContainer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
} from "@/components/ui/form";

// ─── Schema ───────────────────────────────────────────────────────────────────

const dailyLogSchema = z.object({
  log_date: z.string().min(1, "Date is required"),
  training_quality: z.number().min(1).max(5).nullable().optional(),
  workout_notes: z.string().optional(),
  sleep_hours: z.string().optional(),
  sleep_quality: z.number().min(1).max(5).nullable().optional(),
  resting_hr: z.string().optional(),
  alcohol_units: z.number().min(0).max(30),
  stress: z.number().min(1).max(5).nullable().optional(),
  mood: z.number().min(1).max(5).nullable().optional(),
  fatigue: z.number().min(1).max(5).nullable().optional(),
  notes: z.string().optional(),
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

// ─── Sub-components ───────────────────────────────────────────────────────────

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
        <p className="m-0 text-xs text-slate-600"><strong>Workout:</strong> {log.workout_notes}</p>
      )}
      {log.notes && <p className="m-0 text-xs text-slate-500 italic">{log.notes}</p>}
    </article>
  );
}

// ─── Charts ───────────────────────────────────────────────────────────────────

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
      if (entry) { entry.sum += l.training_quality; entry.count += 1; }
    });
    return buckets.map((b, i) => {
      const entry = sums.get(b);
      return { label: bucketLabels[i], avg: entry && entry.count > 0 ? entry.sum / entry.count : null, count: entry?.count ?? 0 };
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
  const y = (v) => mg.top + (1 - v / 5) * iH;
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
              <rect x={x(i)} y={y(d.avg)} width={barW} height={H - mg.bottom - y(d.avg)} rx="6" fill={color} opacity="0.85">
                <title>{d.label}: avg {d.avg.toFixed(1)}/5 ({d.count} entries)</title>
              </rect>
            )}
            {d.avg != null && (
              <text x={x(i) + barW / 2} y={y(d.avg) - 5} textAnchor="middle" fill="#334155" fontSize="11" fontWeight="600">
                {d.avg.toFixed(1)}
              </text>
            )}
            <text x={x(i) + barW / 2} y={H - 26} textAnchor="middle" fill="#64748b" fontSize="11">{d.label}</text>
            {d.count > 0 && (
              <text x={x(i) + barW / 2} y={H - 13} textAnchor="middle" fill="#94a3b8" fontSize="10">n={d.count}</text>
            )}
          </g>
        ))}
      </svg>
    </div>
  );
}

// ─── Layout constants ─────────────────────────────────────────────────────────

const fieldsetClass = "border border-slate-200 rounded-xl px-4 py-3.5 m-0 mb-1";
const legendClass = "text-[11px] font-semibold uppercase tracking-wider text-slate-500 px-1.5";

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DailyLogPage() {
  const { dailyLogs, auth } = useAppData();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const form = useForm({
    resolver: zodResolver(dailyLogSchema),
    defaultValues: DEFAULT_FORM,
  });

  const logDate = form.watch("log_date");

  useEffect(() => {
    if (auth.user) {
      dailyLogs.loadLogs().catch(() => {});
    }
  }, [auth.user]); // eslint-disable-line react-hooks/exhaustive-deps

  // Populate form when date changes or logs load
  useEffect(() => {
    const existing = dailyLogs.logs.find((l) => l.log_date === logDate);
    if (existing) {
      form.reset({
        log_date: existing.log_date,
        training_quality: existing.training_quality ?? null,
        workout_notes: existing.workout_notes ?? "",
        sleep_hours: existing.sleep_hours != null ? String(existing.sleep_hours) : "",
        sleep_quality: existing.sleep_quality ?? null,
        resting_hr: existing.resting_hr != null ? String(existing.resting_hr) : "",
        alcohol_units: existing.alcohol_units ?? 0,
        stress: existing.stress ?? null,
        mood: existing.mood ?? null,
        fatigue: existing.fatigue ?? null,
        notes: existing.notes ?? "",
      });
    } else {
      form.reset({ ...DEFAULT_FORM, log_date: logDate });
    }
  }, [logDate, dailyLogs.logs]); // eslint-disable-line react-hooks/exhaustive-deps

  const onSubmit = async (values) => {
    setSaving(true);
    setMessage("");
    try {
      const payload = {
        log_date: values.log_date,
        training_quality: values.training_quality ?? null,
        workout_notes: values.workout_notes?.trim() || null,
        sleep_hours: values.sleep_hours !== "" ? Number(values.sleep_hours) : null,
        sleep_quality: values.sleep_quality ?? null,
        resting_hr: values.resting_hr !== "" ? Number(values.resting_hr) : null,
        alcohol_units: Number(values.alcohol_units) || 0,
        stress: values.stress ?? null,
        mood: values.mood ?? null,
        fatigue: values.fatigue ?? null,
        notes: values.notes?.trim() || null,
      };
      await dailyLogs.saveLog(payload);
      setMessage("Log saved.");
      setTimeout(() => setMessage(""), 3000);
    } catch (err) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const isExistingEntry = dailyLogs.logs.some((l) => l.log_date === logDate);

  return (
    <PageContainer id="daily-log">
      <div className="mb-5">
        <h2 className="m-0 mb-1 text-2xl font-bold font-sans text-slate-900">Daily log</h2>
        <p className="m-0 text-sm text-slate-500">
          Track sleep, lifestyle, and training quality to spot what helps you perform.
        </p>
      </div>

      {/* ── top grid: form + recent entries ── */}
      <div className="grid gap-6 grid-cols-[minmax(280px,420px)_minmax(0,1fr)] items-start max-[960px]:grid-cols-1">

        {/* ── Form ── */}
        <Form {...form}>
          <form
            className="bg-white border border-slate-200 rounded-2xl p-4 grid gap-3"
            onSubmit={form.handleSubmit(onSubmit)}
            noValidate
          >
            <h3 className="m-0 text-sm font-bold font-sans">
              {isExistingEntry ? "Edit entry" : "Add today's log"}
            </h3>

            {/* Date */}
            <FormField
              control={form.control}
              name="log_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date</FormLabel>
                  <FormControl>
                    <Input {...field} type="date" max={todayIso()} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* ── Training ── */}
            <fieldset className={fieldsetClass}>
              <legend className={legendClass}>Training</legend>

              <FormField
                control={form.control}
                name="training_quality"
                render={({ field }) => (
                  <FormItem className="mb-3">
                    <FormLabel>Training quality</FormLabel>
                    <FormDescription>Skip on rest days</FormDescription>
                    <FormControl>
                      <div>
                        <RatingInput
                          name="training_quality"
                          value={field.value}
                          onChange={(_, val) => field.onChange(val)}
                          labels={QUALITY_LABELS}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="workout_notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Workout notes</FormLabel>
                    <FormControl>
                      <Input {...field} type="text" placeholder="e.g. 12km easy, avg HR 142" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </fieldset>

            {/* ── Recovery ── */}
            <fieldset className={fieldsetClass}>
              <legend className={legendClass}>Recovery</legend>

              <FormField
                control={form.control}
                name="sleep_hours"
                render={({ field }) => (
                  <FormItem className="mb-3">
                    <FormLabel>Sleep hours</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        min="0" max="24" step="0.5"
                        placeholder="e.g. 7.5"
                        className="max-w-[120px]"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="sleep_quality"
                render={({ field }) => (
                  <FormItem className="mb-3">
                    <FormLabel>Sleep quality</FormLabel>
                    <FormControl>
                      <div>
                        <RatingInput
                          name="sleep_quality"
                          value={field.value}
                          onChange={(_, val) => field.onChange(val)}
                          labels={SLEEP_LABELS}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="resting_hr"
                render={({ field }) => (
                  <FormItem className="mb-3">
                    <FormLabel>Resting HR</FormLabel>
                    <FormDescription>bpm, optional</FormDescription>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        min="30" max="120"
                        placeholder="e.g. 52"
                        className="max-w-[120px]"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="fatigue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Muscle fatigue / soreness</FormLabel>
                    <FormControl>
                      <div>
                        <RatingInput
                          name="fatigue"
                          value={field.value}
                          onChange={(_, val) => field.onChange(val)}
                          labels={FATIGUE_LABELS}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </fieldset>

            {/* ── Lifestyle ── */}
            <fieldset className={fieldsetClass}>
              <legend className={legendClass}>Lifestyle</legend>

              <FormField
                control={form.control}
                name="alcohol_units"
                render={({ field }) => (
                  <FormItem className="mb-3">
                    <FormLabel>Alcohol units</FormLabel>
                    <FormControl>
                      <div className="inline-flex items-center border border-border rounded-lg overflow-hidden">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="rounded-none border-r border-border h-9 w-9 text-lg"
                          onClick={() => field.onChange(Math.max(0, (Number(field.value) || 0) - 1))}
                        >
                          −
                        </Button>
                        <span className="w-10 text-center font-semibold text-sm h-9 flex items-center justify-center">
                          {field.value}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="rounded-none border-l border-border h-9 w-9 text-lg"
                          onClick={() => field.onChange(Math.min(30, (Number(field.value) || 0) + 1))}
                        >
                          +
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="mood"
                render={({ field }) => (
                  <FormItem className="mb-3">
                    <FormLabel>Mood / energy</FormLabel>
                    <FormControl>
                      <div>
                        <RatingInput
                          name="mood"
                          value={field.value}
                          onChange={(_, val) => field.onChange(val)}
                          labels={MOOD_LABELS}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="stress"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Stress level</FormLabel>
                    <FormControl>
                      <div>
                        <RatingInput
                          name="stress"
                          value={field.value}
                          onChange={(_, val) => field.onChange(val)}
                          labels={STRESS_LABELS}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </fieldset>

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows="3" placeholder="Anything else worth noting…" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : isExistingEntry ? "Update log" : "Save log"}
            </Button>

            {message && (
              <p className="text-sm text-slate-600 m-0" role="status">{message}</p>
            )}
            {dailyLogs.error && (
              <p className="text-sm text-red-600 m-0" role="alert">{dailyLogs.error.message}</p>
            )}
          </form>
        </Form>

        {/* ── Recent history ── */}
        <section className="bg-white border border-slate-200 rounded-2xl p-4" aria-label="Recent daily logs">
          <h3 className="m-0 mb-3 text-sm font-bold font-sans">Recent entries</h3>
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

      {/* ── Charts ── */}
      {dailyLogs.logs.length >= 3 && (
        <>
          <div className="mt-8 mb-3">
            <h3 className="m-0 mb-1 text-base font-bold font-sans text-slate-900">Wellness trends</h3>
            <p className="m-0 text-sm text-slate-500">
              Last 14 logged days — compare how your sleep, mood, fatigue, and training quality track together.
            </p>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-4 mb-6">
            <WellnessTimeline logs={dailyLogs.logs} />
          </div>
          <div className="mt-2 mb-3">
            <h3 className="m-0 mb-1 text-base font-bold font-sans text-slate-900">Correlations</h3>
            <p className="m-0 text-sm text-slate-500">
              Average training quality grouped by lifestyle and recovery factors.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4 mb-6 max-[960px]:grid-cols-1">
            <CorrelationChart logs={dailyLogs.logs} metricKey="sleep_quality" metricLabel="Sleep quality" buckets={[1, 2, 3, 4, 5]} bucketLabels={["1", "2", "3", "4", "5"]} color="#7c3aed" />
            <CorrelationChart logs={dailyLogs.logs} metricKey="alcohol_units" metricLabel="Alcohol" buckets={[0, [1, 2], [3, 99]]} bucketLabels={["None", "1–2", "3+"]} color="#f59e0b" />
            <CorrelationChart logs={dailyLogs.logs} metricKey="fatigue" metricLabel="Fatigue" buckets={[1, 2, 3, 4, 5]} bucketLabels={["1", "2", "3", "4", "5"]} color="#ef4444" />
            <CorrelationChart logs={dailyLogs.logs} metricKey="mood" metricLabel="Mood" buckets={[1, 2, 3, 4, 5]} bucketLabels={["1", "2", "3", "4", "5"]} color="#16a34a" />
          </div>
        </>
      )}
    </PageContainer>
  );
}
