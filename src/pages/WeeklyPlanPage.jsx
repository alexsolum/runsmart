import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useAppData } from "../context/AppDataContext";

const WORKOUT_TYPES = ["Easy", "Tempo", "Intervals", "Long Run", "Recovery", "Strength", "Cross-Train", "Rest"];
const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// ── Date helpers ──────────────────────────────────────────────────────────────

function currentMondayIso() {
  const d = new Date();
  const day = d.getDay() || 7;
  d.setDate(d.getDate() - day + 1);
  d.setHours(0, 0, 0, 0);
  return d.toISOString().split("T")[0];
}

function isoDateOffset(isoDate, days) {
  const d = new Date(`${isoDate}T00:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

function weekDays(weekStartIso) {
  return Array.from({ length: 7 }, (_, i) => isoDateOffset(weekStartIso, i));
}

function formatWeekLabel(weekStartIso) {
  const start = new Date(`${weekStartIso}T00:00:00`);
  const end = new Date(`${isoDateOffset(weekStartIso, 6)}T00:00:00`);
  const opts = { day: "numeric", month: "short" };
  return `${start.toLocaleDateString(undefined, opts)} — ${end.toLocaleDateString(undefined, opts)} ${end.getFullYear()}`;
}

function isToday(isoDate) {
  return isoDate === new Date().toISOString().split("T")[0];
}

// ── Workout type badge class ───────────────────────────────────────────────────

function typeBadgeClass(type) {
  return `wpp-type-badge is-${type.replace(/\s+/g, "-")}`;
}

// ── Add/Edit form ─────────────────────────────────────────────────────────────

function WorkoutForm({ date, initial, onSave, onCancel, loading }) {
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
    <form className="wpp-add-form" onSubmit={handleSubmit} noValidate>
      <label>
        Type
        <select value={form.workout_type} onChange={(e) => set("workout_type", e.target.value)}>
          {WORKOUT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </label>

      {form.workout_type !== "Rest" && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
            <label>
              Distance (km)
              <input
                type="number"
                min="0"
                max="200"
                step="0.1"
                placeholder="—"
                value={form.distance_km}
                onChange={(e) => set("distance_km", e.target.value)}
              />
            </label>
            <label>
              Duration (min)
              <input
                type="number"
                min="0"
                max="600"
                placeholder="—"
                value={form.duration_min}
                onChange={(e) => set("duration_min", e.target.value)}
              />
            </label>
          </div>
          <label>
            Description
            <textarea
              rows={2}
              placeholder="e.g. 8×400m @ 5K pace, 90s recovery"
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
            />
          </label>
        </>
      )}

      <div className="wpp-add-form-actions">
        <button type="submit" className="cta" disabled={loading} style={{ fontSize: "12px", padding: "7px 14px" }}>
          {loading ? "Saving…" : initial?.id ? "Update" : "Add"}
        </button>
        <button type="button" className="ghost" onClick={onCancel} disabled={loading} style={{ fontSize: "12px", padding: "7px 12px" }}>
          Cancel
        </button>
      </div>
    </form>
  );
}

// ── Entry card ────────────────────────────────────────────────────────────────

function WorkoutEntry({ entry, onEdit, onDelete, onToggle, loading }) {
  return (
    <div className={`wpp-entry${entry.completed ? " is-completed" : ""}`}>
      <div className="wpp-entry-header">
        <span className={typeBadgeClass(entry.workout_type)}>{entry.workout_type}</span>
        <div className="wpp-entry-actions">
          <input
            type="checkbox"
            checked={entry.completed}
            onChange={() => onToggle(entry.id, entry.completed)}
            title="Mark completed"
            disabled={loading}
            style={{ cursor: "pointer" }}
          />
          <button type="button" className="wpp-icon-btn" onClick={() => onEdit(entry)} title="Edit" disabled={loading}>✎</button>
          <button type="button" className="wpp-icon-btn" onClick={() => onDelete(entry.id)} title="Delete" disabled={loading}>✕</button>
        </div>
      </div>
      {(entry.distance_km || entry.duration_min) && (
        <p style={{ margin: "2px 0", fontSize: "12px" }}>
          {entry.distance_km ? `${entry.distance_km} km` : ""}
          {entry.distance_km && entry.duration_min ? " · " : ""}
          {entry.duration_min ? `${entry.duration_min} min` : ""}
        </p>
      )}
      {entry.description && (
        <p className="wpp-entry-desc">{entry.description}</p>
      )}
    </div>
  );
}

// ── Day column ────────────────────────────────────────────────────────────────

function DayColumn({ date, dayName, entries, addingTo, editingEntry, onAdd, onCancelAdd, onSave, onEdit, onDelete, onToggle, loading }) {
  const dayEntries = entries.filter((e) => e.workout_date === date);
  const isAddingHere = addingTo === date;
  const editingHere = editingEntry && dayEntries.find((e) => e.id === editingEntry.id);

  const dayNum = new Date(`${date}T00:00:00`).getDate();

  return (
    <div className={`wpp-day${isToday(date) ? " is-today" : ""}`}>
      <div className="wpp-day-header">
        <span className="wpp-day-label">{dayName} {dayNum}</span>
        {!isAddingHere && (
          <button
            type="button"
            className="wpp-day-add-btn"
            onClick={() => onAdd(date)}
            title="Add workout"
            disabled={loading}
          >
            +
          </button>
        )}
      </div>

      <div className="wpp-entry-list">
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
    <section className="page wpp-page">
      <div className="page-header">
        <h2>Weekly Plan</h2>
        <p>Plan your workouts day by day. Check off sessions as you complete them.</p>
      </div>

      {/* Header: plan select + week nav */}
      <div className="wpp-header">
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <label style={{ fontSize: "13px", fontWeight: 600, margin: 0 }}>
            Plan:{" "}
            <select
              value={selectedPlanId ?? ""}
              onChange={(e) => { setSelectedPlanId(e.target.value); setAddingTo(null); setEditingEntry(null); }}
              style={{ marginLeft: "6px" }}
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

        <div className="wpp-week-nav">
          <button
            type="button"
            className="ghost"
            style={{ padding: "6px 12px" }}
            onClick={() => { setWeekStart((w) => isoDateOffset(w, -7)); setAddingTo(null); setEditingEntry(null); }}
          >
            ←
          </button>
          <span className="wpp-week-label">{formatWeekLabel(weekStart)}</span>
          <button
            type="button"
            className="ghost"
            style={{ padding: "6px 12px" }}
            onClick={() => { setWeekStart((w) => isoDateOffset(w, 7)); setAddingTo(null); setEditingEntry(null); }}
          >
            →
          </button>
          <button
            type="button"
            className="ghost"
            style={{ padding: "6px 12px", fontSize: "12px" }}
            onClick={() => { setWeekStart(currentMondayIso()); setAddingTo(null); setEditingEntry(null); }}
          >
            Today
          </button>
        </div>
      </div>

      {/* Summary bar */}
      {selectedPlanId && (
        <div className="wpp-summary">
          <div className="wpp-summary-stat">Total: <strong>{summary.totalKm} km</strong></div>
          <div className="wpp-summary-stat">Sessions: <strong>{summary.sessions}</strong></div>
          <div className="wpp-summary-stat">Rest days: <strong>{summary.restDays}</strong></div>
          <div className="wpp-summary-stat">Completed: <strong>{summary.completionPct}%</strong></div>
          {pageError && <p className="feedback is-error" style={{ marginLeft: "auto" }}>{pageError}</p>}
        </div>
      )}

      {/* 7-day grid */}
      {!selectedPlanId ? (
        <p className="empty-state">Select or create a training plan to start planning your week.</p>
      ) : (
        <div className="wpp-day-grid">
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
