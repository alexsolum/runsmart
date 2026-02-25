import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useAppData } from "../context/AppDataContext";

const WORKOUT_TYPES = ["Easy", "Tempo", "Intervals", "Long Run", "Recovery", "Strength", "Cross-Train", "Rest"];
const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// ── Date helpers ──────────────────────────────────────────────────────────────

function currentMondayIso() {
  const d = new Date();
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() - day + 1);
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString().split("T")[0];
}

function isoDateOffset(isoDate, days) {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().split("T")[0];
}

function weekDays(weekStartIso) {
  return Array.from({ length: 7 }, (_, i) => isoDateOffset(weekStartIso, i));
}

function formatWeekLabel(weekStartIso) {
  const start = new Date(`${weekStartIso}T00:00:00Z`);
  const end = new Date(`${isoDateOffset(weekStartIso, 6)}T00:00:00Z`);
  const opts = { day: "numeric", month: "short" };
  return `${start.toLocaleDateString(undefined, opts)} — ${end.toLocaleDateString(undefined, opts)} ${end.getUTCFullYear()}`;
}

function isToday(isoDate) {
  return isoDate === new Date().toISOString().split("T")[0];
}

// ── Workout type badge styles ─────────────────────────────────────────────────

const TYPE_BADGE_STYLES = {
  "Easy":        "bg-green-100 text-green-800",
  "Long Run":    "bg-blue-100 text-blue-700",
  "Tempo":       "bg-violet-100 text-violet-800",
  "Intervals":   "bg-pink-100 text-pink-800",
  "Recovery":    "bg-green-50 text-green-700",
  "Strength":    "bg-amber-100 text-amber-800",
  "Cross-Train": "bg-sky-100 text-sky-800",
  "Rest":        "bg-slate-100 text-slate-500",
};

function TypeBadge({ type }) {
  const cls = TYPE_BADGE_STYLES[type] ?? "bg-slate-100 text-slate-500";
  return (
    <span className={`text-[10px] font-bold rounded-full px-2 py-0.5 uppercase tracking-wide whitespace-nowrap ${cls}`}>
      {type}
    </span>
  );
}

// ── Add/Edit form ─────────────────────────────────────────────────────────────

const inputClass = "w-full border border-slate-300 rounded-lg px-2 py-1.5 font-inherit text-xs bg-white focus:outline-none focus:border-blue-600 focus:shadow-[0_0_0_2px_rgba(37,99,235,0.12)]";

function WorkoutForm({ date, initial, onSave, onCancel, loading, className }) {
  const blank = { workout_type: "Easy", distance_km: "", duration_min: "", description: "" };
  const [form, setForm] = useState({ ...blank, ...initial });
  const set = (key, val) => setForm((prev) => ({ ...prev, [key]: val }));

  function handleSubmit(e) {
    e.preventDefault();
    onSave({
      workout_date: date,
      workout_type: form.workout_type,
      distance_km: form.distance_km !== "" ? Number(form.distance_km) : null,
      duration_min: form.duration_min !== "" ? Number(form.duration_min) : null,
      description: form.description || null,
    });
  }

  return (
    <form className={`border-t border-slate-200 pt-2.5 grid gap-2${className ? ` ${className}` : ""}`} onSubmit={handleSubmit} noValidate>
      <label className="grid gap-1 text-[11px] font-medium text-slate-500">
        Type
        <select className={inputClass} value={form.workout_type} onChange={(e) => set("workout_type", e.target.value)}>
          {WORKOUT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </label>

      {form.workout_type !== "Rest" && (
        <>
          <div className="grid grid-cols-2 gap-1.5">
            <label className="grid gap-1 text-[11px] font-medium text-slate-500">
              Distance (km)
              <input type="number" min="0" max="200" step="0.1" className={inputClass} placeholder="—" value={form.distance_km} onChange={(e) => set("distance_km", e.target.value)} />
            </label>
            <label className="grid gap-1 text-[11px] font-medium text-slate-500">
              Duration (min)
              <input type="number" min="0" max="600" className={inputClass} placeholder="—" value={form.duration_min} onChange={(e) => set("duration_min", e.target.value)} />
            </label>
          </div>
          <label className="grid gap-1 text-[11px] font-medium text-slate-500">
            Description
            <textarea rows={2} className={inputClass} placeholder="e.g. 8×400m @ 5K pace, 90s recovery" value={form.description} onChange={(e) => set("description", e.target.value)} />
          </label>
        </>
      )}

      <div className="flex gap-1.5">
        <button type="submit" className="cta" disabled={loading} style={{ fontSize: "12px", padding: "6px 12px" }}>
          {loading ? "Saving…" : initial?.id ? "Update" : "Add"}
        </button>
        <button type="button" className="ghost" onClick={onCancel} disabled={loading} style={{ fontSize: "12px", padding: "6px 10px" }}>
          Cancel
        </button>
      </div>
    </form>
  );
}

// ── Entry card ────────────────────────────────────────────────────────────────

function WorkoutEntry({ entry, onEdit, onDelete, onToggle, loading }) {
  return (
    <div className={`border border-slate-200 rounded-lg px-2.5 py-2 bg-slate-50 text-xs${entry.completed ? " opacity-55" : ""}`}>
      <div className="flex justify-between items-center gap-1 mb-1">
        <TypeBadge type={entry.workout_type} />
        <div className="flex gap-0.5 items-center">
          <input
            type="checkbox"
            checked={entry.completed}
            onChange={() => onToggle(entry.id, entry.completed)}
            title="Mark completed"
            disabled={loading}
            className="cursor-pointer"
          />
          <button type="button" className="border-0 bg-transparent cursor-pointer px-1 py-0.5 text-slate-400 text-xs rounded hover:bg-slate-200 hover:text-slate-600 disabled:opacity-50" onClick={() => onEdit(entry)} title="Edit" disabled={loading}>✎</button>
          <button type="button" className="border-0 bg-transparent cursor-pointer px-1 py-0.5 text-slate-400 text-xs rounded hover:bg-slate-200 hover:text-slate-600 disabled:opacity-50" onClick={() => onDelete(entry.id)} title="Delete" disabled={loading}>✕</button>
        </div>
      </div>
      {(entry.distance_km || entry.duration_min) && (
        <p className="m-0 text-xs text-slate-600">
          {entry.distance_km ? `${entry.distance_km} km` : ""}
          {entry.distance_km && entry.duration_min ? " · " : ""}
          {entry.duration_min ? `${entry.duration_min} min` : ""}
        </p>
      )}
      {entry.description && (
        <p className="m-0 text-[11px] text-slate-500 whitespace-nowrap overflow-hidden text-ellipsis">{entry.description}</p>
      )}
    </div>
  );
}

// ── Day column ────────────────────────────────────────────────────────────────

function DayColumn({ date, dayName, entries, addingTo, editingEntry, onAdd, onCancelAdd, onSave, onEdit, onDelete, onToggle, loading }) {
  const dayEntries = entries.filter((e) => e.workout_date === date);
  const isAddingHere = addingTo === date;
  const editingHere = editingEntry && dayEntries.find((e) => e.id === editingEntry.id);

  const dayNum = new Date(`${date}T00:00:00Z`).getUTCDate();

  return (
    <div className={`wpp-day bg-white border rounded-xl p-2.5 min-h-[130px] flex flex-col gap-2${isToday(date) ? " is-today border-blue-600 shadow-[0_0_0_1px_#2563eb]" : " border-slate-200"}`}>
      <div className="flex justify-between items-center">
        <span className="wpp-day-label text-xs font-bold text-slate-900">{dayName} {dayNum}</span>
        {!isAddingHere && (
          <button
            type="button"
            className="w-6 h-6 rounded-full border border-slate-300 bg-slate-50 text-slate-500 text-base leading-none cursor-pointer flex items-center justify-center p-0 hover:bg-slate-200 disabled:opacity-50"
            onClick={() => onAdd(date)}
            title="Add workout"
            disabled={loading}
          >
            +
          </button>
        )}
      </div>

      <div className="grid gap-1.5">
        {dayEntries.map((entry) =>
          editingHere && editingEntry.id === entry.id ? (
            <WorkoutForm
              key={entry.id}
              date={date}
              initial={entry}
              onSave={(data) => onSave(entry.id, data)}
              onCancel={() => onEdit(null)}
              loading={loading}
            />
          ) : (
            <WorkoutEntry
              key={entry.id}
              entry={entry}
              onEdit={onEdit}
              onDelete={onDelete}
              onToggle={onToggle}
              loading={loading}
            />
          ),
        )}
      </div>

      {isAddingHere && (
        <WorkoutForm
          date={date}
          initial={null}
          onSave={(data) => onSave(null, data)}
          onCancel={onCancelAdd}
          loading={loading}
          className="wpp-add-form"
        />
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function WeeklyPlanPage() {
  const { plans, workoutEntries } = useAppData();

  const [selectedPlanId, setSelectedPlanId] = useState(null);
  const [weekStart, setWeekStart] = useState(currentMondayIso);
  const [addingTo, setAddingTo] = useState(null);
  const [editingEntry, setEditingEntry] = useState(null);
  const [pageError, setPageError] = useState(null);

  // Auto-select first plan
  useEffect(() => {
    if (!selectedPlanId && plans.plans.length > 0) {
      setSelectedPlanId(plans.plans[0].id);
    }
  }, [plans.plans, selectedPlanId]);

  // Load entries when plan or week changes
  useEffect(() => {
    if (selectedPlanId && weekStart) {
      workoutEntries.loadEntriesForWeek(selectedPlanId, weekStart).catch(() => {});
    }
  }, [selectedPlanId, weekStart, workoutEntries.loadEntriesForWeek]);

  const days = useMemo(() => weekDays(weekStart), [weekStart]);

  const summary = useMemo(() => {
    const nonRest = workoutEntries.entries.filter((e) => e.workout_type !== "Rest");
    const completed = nonRest.filter((e) => e.completed).length;
    const totalKm = workoutEntries.entries.reduce((acc, e) => acc + (Number(e.distance_km) || 0), 0);
    const restCount = workoutEntries.entries.filter((e) => e.workout_type === "Rest").length;
    return {
      totalKm: totalKm.toFixed(1),
      sessions: nonRest.length,
      restDays: restCount,
      completionPct: nonRest.length ? Math.round((completed / nonRest.length) * 100) : 0,
    };
  }, [workoutEntries.entries]);

  const handleAdd = useCallback((date) => {
    setAddingTo(date);
    setEditingEntry(null);
  }, []);

  const handleSave = useCallback(
    async (id, data) => {
      setPageError(null);
      try {
        if (id) {
          await workoutEntries.updateEntry(id, data);
          setEditingEntry(null);
        } else {
          await workoutEntries.createEntry({ ...data, plan_id: selectedPlanId });
          setAddingTo(null);
        }
      } catch (err) {
        setPageError(err.message);
      }
    },
    [workoutEntries, selectedPlanId],
  );

  const handleDelete = useCallback(
    async (id) => {
      if (!window.confirm("Delete this workout?")) return;
      setPageError(null);
      try {
        await workoutEntries.deleteEntry(id);
      } catch (err) {
        setPageError(err.message);
      }
    },
    [workoutEntries],
  );

  const handleToggle = useCallback(
    async (id, current) => {
      setPageError(null);
      try {
        await workoutEntries.toggleCompleted(id, current);
      } catch (err) {
        setPageError(err.message);
      }
    },
    [workoutEntries],
  );

  return (
    <section className="page">
      <div className="mb-5">
        <h2 className="m-0 mb-1 text-2xl font-bold text-slate-900">Weekly Plan</h2>
        <p className="m-0 text-sm text-slate-500">Plan your workouts day by day. Check off sessions as you complete them.</p>
      </div>

      {/* Header: plan select + week nav */}
      <div className="bg-white border border-slate-200 rounded-2xl px-4 py-3.5 flex items-center gap-4 flex-wrap mb-3.5 max-[960px]:flex-col max-[960px]:items-start">
        <div className="flex items-center gap-2.5">
          <label className="text-[13px] font-semibold m-0">
            Plan:{" "}
            <select
              className="ml-1.5 border border-slate-300 rounded-lg px-2 py-1.5 font-inherit text-[13px] bg-white"
              value={selectedPlanId ?? ""}
              onChange={(e) => { setSelectedPlanId(e.target.value); setAddingTo(null); setEditingEntry(null); }}
            >
              {plans.plans.length === 0 && <option value="">No plans — create one in Training Plan</option>}
              {plans.plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.race} · {new Date(p.race_date).toLocaleDateString(undefined, { month: "short", year: "numeric" })}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="flex items-center gap-2 ml-auto max-[960px]:ml-0 max-[960px]:w-full max-[960px]:justify-between">
          <button type="button" className="ghost" style={{ padding: "6px 12px" }} onClick={() => { setWeekStart((w) => isoDateOffset(w, -7)); setAddingTo(null); setEditingEntry(null); }}>←</button>
          <span className="wpp-week-label font-semibold text-sm min-w-[220px] text-center max-[960px]:min-w-0 max-[960px]:text-left">{formatWeekLabel(weekStart)}</span>
          <button type="button" className="ghost" style={{ padding: "6px 12px" }} onClick={() => { setWeekStart((w) => isoDateOffset(w, 7)); setAddingTo(null); setEditingEntry(null); }}>→</button>
          <button type="button" className="ghost" style={{ padding: "6px 12px", fontSize: "12px" }} onClick={() => { setWeekStart(currentMondayIso()); setAddingTo(null); setEditingEntry(null); }}>Today</button>
        </div>
      </div>

      {/* Summary bar */}
      {selectedPlanId && (
        <div className="bg-white border border-slate-200 rounded-2xl px-4 py-3 flex gap-5 items-center flex-wrap mb-3.5">
          <div className="wpp-summary-stat text-[13px] text-slate-500">Total: <strong className="text-slate-900 font-bold">{summary.totalKm} km</strong></div>
          <div className="wpp-summary-stat text-[13px] text-slate-500">Sessions: <strong className="text-slate-900 font-bold">{summary.sessions}</strong></div>
          <div className="wpp-summary-stat text-[13px] text-slate-500">Rest days: <strong className="text-slate-900 font-bold">{summary.restDays}</strong></div>
          <div className="wpp-summary-stat text-[13px] text-slate-500">Completed: <strong className="text-slate-900 font-bold">{summary.completionPct}%</strong></div>
          {pageError && <p className="text-sm text-red-600 m-0 ml-auto">{pageError}</p>}
        </div>
      )}

      {/* 7-day grid */}
      {!selectedPlanId ? (
        <p className="text-sm text-slate-400 text-center py-8">Select or create a training plan to start planning your week.</p>
      ) : (
        <div className="wpp-day-grid grid grid-cols-7 gap-2.5 items-start max-[960px]:grid-cols-2 max-[480px]:grid-cols-1">
          {days.map((date, i) => (
            <DayColumn
              key={date}
              date={date}
              dayName={DAY_NAMES[i]}
              entries={workoutEntries.entries}
              addingTo={addingTo}
              editingEntry={editingEntry}
              onAdd={handleAdd}
              onCancelAdd={() => setAddingTo(null)}
              onSave={handleSave}
              onEdit={setEditingEntry}
              onDelete={handleDelete}
              onToggle={handleToggle}
              loading={workoutEntries.loading}
            />
          ))}
        </div>
      )}
    </section>
  );
}
