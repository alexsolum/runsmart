import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useAppData } from "../context/AppDataContext";
import { computeTrainingLoad } from "../domain/compute";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

// ── Workout types ─────────────────────────────────────────────────────────────

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

function todayIso() {
  return new Date().toISOString().split("T")[0];
}

function isoDateOffset(isoStr, delta) {
  const d = new Date(`${isoStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().split("T")[0];
}

function formatWeekRange(weekStartIso) {
  const start = new Date(`${weekStartIso}T00:00:00Z`);
  const end = new Date(`${isoDateOffset(weekStartIso, 6)}T00:00:00Z`);
  const opts = { day: "numeric", month: "short" };
  return `${start.toLocaleDateString(undefined, opts)} – ${end.toLocaleDateString(undefined, opts)}`;
}

// ── MobileTabBar ──────────────────────────────────────────────────────────────

function MobileTabBar({ activeTab, onSwitch }) {
  return (
    <div className="mobile-tab-bar" role="tablist">
      {["analytics", "week"].map((tab) => (
        <button
          key={tab}
          type="button"
          role="tab"
          aria-selected={activeTab === tab}
          className={`mobile-tab-btn${activeTab === tab ? " is-active" : ""}`}
          onClick={() => onSwitch(tab)}
        >
          {tab === "analytics" ? "Analytics" : "Week"}
        </button>
      ))}
    </div>
  );
}

// ── AnalyticsTab ──────────────────────────────────────────────────────────────

function AnalyticsTab({ weekKm, sessions, completionPct, readiness, readinessClass, recentActivities }) {
  return (
    <div>
      <div className="mobile-kpi-grid">
        <div className="mobile-kpi-card">
          <p className="mobile-kpi-label">This Week</p>
          <p className="mobile-kpi-value">
            {weekKm.toFixed(1)}<span className="mobile-kpi-unit"> km</span>
          </p>
        </div>
        <div className="mobile-kpi-card">
          <p className="mobile-kpi-label">Sessions</p>
          <p className="mobile-kpi-value">{sessions}</p>
        </div>
        <div className="mobile-kpi-card">
          <p className="mobile-kpi-label">Done</p>
          <p className="mobile-kpi-value">
            {completionPct}<span className="mobile-kpi-unit">%</span>
          </p>
        </div>
        <div className="mobile-kpi-card">
          <p className="mobile-kpi-label">Readiness</p>
          <span className={`mobile-kpi-badge ${readinessClass}`}>{readiness}</span>
        </div>
      </div>

      {recentActivities.length > 0 && (
        <>
          <p className="mobile-section-title">Recent activities</p>
          <div className="mobile-activity-list">
            {recentActivities.map((act) => (
              <div key={act.id} className="mobile-activity-item">
                <div>
                  <p className="mobile-activity-name">{act.name}</p>
                  <p className="mobile-activity-meta">{act.type}</p>
                </div>
                <span className="mobile-activity-dist">
                  {act.distance ? `${(act.distance / 1000).toFixed(1)} km` : "—"}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ── DeleteConfirmRow ──────────────────────────────────────────────────────────

function DeleteConfirmRow({ onConfirm, onCancel }) {
  return (
    <div className="mobile-delete-confirm">
      <span>Delete this workout?</span>
      <button type="button" className="mobile-delete-confirm-btn" onClick={onConfirm}>
        Confirm
      </button>
      <button
        type="button"
        onClick={onCancel}
        style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b", fontSize: "12px" }}
      >
        Cancel
      </button>
    </div>
  );
}

// ── MobileWorkoutCard ─────────────────────────────────────────────────────────

function MobileWorkoutCard({ entry, onToggle, onEdit, onDelete, deleteConfirmId, setDeleteConfirmId }) {
  const typeClass = `mobile-workout-card--${entry.workout_type.replace(/\s+/g, "-")}`;
  const isConfirming = deleteConfirmId === entry.id;

  return (
    <div className={`mobile-workout-card ${typeClass}${entry.completed ? " is-completed" : ""}`}>
      <button
        type="button"
        className={`mobile-workout-check${entry.completed ? " is-done" : ""}`}
        onClick={() => onToggle(entry.id, entry.completed)}
        aria-label={entry.completed ? "Mark incomplete" : "Mark complete"}
      >
        {entry.completed ? "✓" : ""}
      </button>

      <div className="mobile-workout-body">
        <p className="mobile-workout-type">{entry.workout_type}</p>
        {(entry.distance_km || entry.duration_min) && (
          <p className="mobile-workout-meta">
            {entry.distance_km ? `${entry.distance_km} km` : ""}
            {entry.distance_km && entry.duration_min ? " · " : ""}
            {entry.duration_min ? `${entry.duration_min} min` : ""}
          </p>
        )}
        {entry.description && (
          <p className="mobile-workout-desc">{entry.description}</p>
        )}
      </div>

      <div className="mobile-workout-actions">
        <button
          type="button"
          className="mobile-icon-btn"
          onClick={() => onEdit(entry)}
          aria-label="Edit workout"
        >
          ✎
        </button>
        <button
          type="button"
          className="mobile-icon-btn is-danger"
          onClick={() => setDeleteConfirmId(isConfirming ? null : entry.id)}
          aria-label="Delete workout"
        >
          ✕
        </button>
      </div>

      {isConfirming && (
        <DeleteConfirmRow
          onConfirm={() => { onDelete(entry.id); setDeleteConfirmId(null); }}
          onCancel={() => setDeleteConfirmId(null)}
        />
      )}
    </div>
  );
}

// ── WorkoutModal ──────────────────────────────────────────────────────────────

function WorkoutModal({ modal, planId, workoutEntries, onClose }) {
  const isEdit = modal.mode === "edit";
  const initial = isEdit ? modal.entry : null;

  const [type, setType] = useState(initial?.workout_type ?? "Easy");
  const [distanceKm, setDistanceKm] = useState(initial?.distance_km ?? "");
  const [durationMin, setDurationMin] = useState(initial?.duration_min ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      const data = {
        workout_date: isEdit ? initial.workout_date : modal.date,
        workout_type: type,
        distance_km: distanceKm !== "" ? Number(distanceKm) : null,
        duration_min: durationMin !== "" ? Number(durationMin) : null,
        description: description || null,
      };
      if (isEdit) {
        await workoutEntries.updateEntry(initial.id, data);
      } else {
        await workoutEntries.createEntry({ ...data, plan_id: planId });
      }
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="mobile-modal">
        <div className="mobile-modal-handle" />
        <DialogHeader className="mobile-modal-header">
          <DialogTitle className="mobile-modal-title">
            {isEdit ? "Edit workout" : "Add workout"}
          </DialogTitle>
        </DialogHeader>

        <div className="mobile-modal-body">
          <div>
            <span className="mobile-field-label">Type</span>
            <div className="mobile-type-pills">
              {WORKOUT_TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  className={`mobile-type-pill${type === t ? " is-active" : ""}`}
                  onClick={() => setType(t)}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {type !== "Rest" && (
            <>
              <div className="mobile-two-col">
                <div>
                  <label className="mobile-field-label" htmlFor="mob-distance">Distance (km)</label>
                  <Input
                    id="mob-distance"
                    type="number"
                    min="0"
                    max="200"
                    step="0.1"
                    className="h-auto py-3.5 px-4 rounded-xl text-base bg-slate-50 border border-slate-200 focus:border-blue-600 focus:bg-white placeholder:text-slate-400 transition-colors"
                    placeholder="—"
                    value={distanceKm}
                    onChange={(e) => setDistanceKm(e.target.value)}
                  />
                </div>
                <div>
                  <label className="mobile-field-label" htmlFor="mob-duration">Duration (min)</label>
                  <Input
                    id="mob-duration"
                    type="number"
                    min="0"
                    max="600"
                    className="h-auto py-3.5 px-4 rounded-xl text-base bg-slate-50 border border-slate-200 focus:border-blue-600 focus:bg-white placeholder:text-slate-400 transition-colors"
                    placeholder="—"
                    value={durationMin}
                    onChange={(e) => setDurationMin(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="mobile-field-label" htmlFor="mob-desc">Description</label>
                <Textarea
                  id="mob-desc"
                  rows={3}
                  className="py-3.5 px-4 rounded-xl text-base bg-slate-50 border border-slate-200 focus:border-blue-600 focus:bg-white placeholder:text-slate-400 transition-colors resize-none"
                  placeholder="e.g. 8x400m @ 5K pace"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
            </>
          )}

          <Button type="button" className="w-full h-14 rounded-[14px] text-base font-bold" disabled={saving} onClick={handleSave}>
            {saving ? "Saving…" : isEdit ? "Update" : "Add Workout"}
          </Button>
          <Button type="button" variant="outline" className="w-full h-12 rounded-[14px] text-[15px] font-semibold text-slate-500" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── WeekTab ───────────────────────────────────────────────────────────────────

function WeekTab({ weekStart, setWeekStart, selectedDay, setSelectedDay, days, dayEntries, allEntries, summary, workoutEntries, selectedPlanId }) {
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [modal, setModal] = useState(null);

  // Auto-dismiss delete confirm after 3 seconds
  useEffect(() => {
    if (!deleteConfirmId) return;
    const t = setTimeout(() => setDeleteConfirmId(null), 3000);
    return () => clearTimeout(t);
  }, [deleteConfirmId]);

  const handleToggle = useCallback(async (id, current) => {
    await workoutEntries.toggleCompleted(id, current);
  }, [workoutEntries]);

  const handleDelete = useCallback(async (id) => {
    await workoutEntries.deleteEntry(id);
  }, [workoutEntries]);

  return (
    <div>
      {/* Week navigation */}
      <div className="mobile-week-nav">
        <button
          type="button"
          className="mobile-week-btn"
          onClick={() => setWeekStart((w) => isoDateOffset(w, -7))}
          aria-label="Previous week"
        >
          ←
        </button>
        <span className="mobile-week-label">{formatWeekRange(weekStart)}</span>
        <button
          type="button"
          className="mobile-week-btn"
          onClick={() => setWeekStart((w) => isoDateOffset(w, 7))}
          aria-label="Next week"
        >
          →
        </button>
        <button
          type="button"
          className="mobile-week-today-btn"
          onClick={() => { setWeekStart(currentMondayIso()); setSelectedDay(todayIso()); }}
        >
          Today
        </button>
      </div>

      {/* Week summary */}
      <div className="mobile-week-summary">
        {summary.totalKm} km · {summary.sessions} sessions · {summary.completionPct}% done
      </div>

      {/* Day strip */}
      <div className="mobile-day-strip" role="tablist" aria-label="Days of week">
        {days.map((date, i) => {
          const isToday = date === todayIso();
          const isSelected = date === selectedDay;
          const hasDot = allEntries.some((e) => e.workout_date === date);
          return (
            <button
              key={date}
              type="button"
              role="tab"
              aria-selected={isSelected}
              className={`mobile-day-chip${isToday ? " is-today" : ""}${isSelected ? " is-selected" : ""}`}
              onClick={() => setSelectedDay(date)}
            >
              <span className="mobile-day-chip__name">{DAY_NAMES[i]}</span>
              <span className="mobile-day-chip__num">
                {new Date(`${date}T00:00:00Z`).getUTCDate()}
              </span>
              {hasDot && <span className="mobile-day-chip__dot" aria-hidden="true" />}
            </button>
          );
        })}
      </div>

      {/* Workout list for selected day */}
      <div className="mobile-workout-list">
        {dayEntries.length === 0 ? (
          <p className="mobile-empty-day">No workouts for this day. Tap + to add one.</p>
        ) : (
          dayEntries.map((entry) => (
            <MobileWorkoutCard
              key={entry.id}
              entry={entry}
              onToggle={handleToggle}
              onEdit={(e) => setModal({ mode: "edit", entry: e })}
              onDelete={handleDelete}
              deleteConfirmId={deleteConfirmId}
              setDeleteConfirmId={setDeleteConfirmId}
            />
          ))
        )}
      </div>

      {/* FAB */}
      <button
        type="button"
        className="mobile-fab"
        onClick={() => setModal({ mode: "add", date: selectedDay })}
        aria-label="Add workout"
      >
        +
      </button>

      {/* Workout modal */}
      {modal && (
        <WorkoutModal
          modal={modal}
          planId={selectedPlanId}
          workoutEntries={workoutEntries}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}

// ── MobilePage ────────────────────────────────────────────────────────────────

export default function MobilePage({ defaultTab }) {
  const { plans, workoutEntries, activities } = useAppData();

  const [activeTab, setActiveTab] = useState(defaultTab ?? "analytics");
  const [selectedPlanId, setSelectedPlanId] = useState(null);
  const [weekStart, setWeekStart] = useState(currentMondayIso);
  const [selectedDay, setSelectedDay] = useState(todayIso);

  // Sync defaultTab prop
  useEffect(() => {
    if (defaultTab) setActiveTab(defaultTab);
  }, [defaultTab]);

  // Auto-select first plan
  useEffect(() => {
    if (!selectedPlanId && plans.plans.length > 0) {
      setSelectedPlanId(plans.plans[0].id);
    }
  }, [plans.plans, selectedPlanId]);

  // Load entries when plan or week changes
  useEffect(() => {
    if (selectedPlanId) {
      workoutEntries.loadEntriesForWeek(selectedPlanId, weekStart).catch(() => {});
    }
  }, [selectedPlanId, weekStart, workoutEntries.loadEntriesForWeek]);

  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => isoDateOffset(weekStart, i)),
    [weekStart],
  );

  const dayEntries = useMemo(
    () => workoutEntries.entries.filter((e) => e.workout_date === selectedDay),
    [workoutEntries.entries, selectedDay],
  );

  const summary = useMemo(() => {
    const nonRest = workoutEntries.entries.filter((e) => e.workout_type !== "Rest");
    const completed = nonRest.filter((e) => e.completed).length;
    const totalKm = workoutEntries.entries.reduce((acc, e) => acc + (Number(e.distance_km) || 0), 0);
    return {
      totalKm: totalKm.toFixed(1),
      sessions: nonRest.length,
      completionPct: nonRest.length ? Math.round((completed / nonRest.length) * 100) : 0,
    };
  }, [workoutEntries.entries]);

  // Readiness from training load TSB
  const { readiness, readinessClass } = useMemo(() => {
    const series = computeTrainingLoad(activities.activities);
    if (!series.length) return { readiness: "Neutral", readinessClass: "is-neutral" };
    const tsb = series[series.length - 1].tsb;
    if (tsb > 5) return { readiness: "Fresh", readinessClass: "is-fresh" };
    if (tsb > -10) return { readiness: "Neutral", readinessClass: "is-neutral" };
    return { readiness: "Fatigued", readinessClass: "is-fatigued" };
  }, [activities.activities]);

  // This week's km from activities
  const weekKm = useMemo(() => {
    const weekEnd = isoDateOffset(weekStart, 6);
    return activities.activities.reduce((acc, act) => {
      const date = new Date(act.started_at).toISOString().split("T")[0];
      if (date >= weekStart && date <= weekEnd) {
        return acc + (Number(act.distance) || 0) / 1000;
      }
      return acc;
    }, 0);
  }, [activities.activities, weekStart]);

  const recentActivities = useMemo(
    () => activities.activities.slice(-3).reverse(),
    [activities.activities],
  );

  if (!selectedPlanId && plans.plans.length === 0) {
    return (
      <div className="mobile-page">
        <MobileTabBar activeTab={activeTab} onSwitch={setActiveTab} />
        <p className="mobile-no-plan">No training plan yet. Create one in Training Plan.</p>
      </div>
    );
  }

  return (
    <div className="mobile-page">
      <MobileTabBar activeTab={activeTab} onSwitch={setActiveTab} />

      {activeTab === "analytics" && (
        <AnalyticsTab
          weekKm={weekKm}
          sessions={summary.sessions}
          completionPct={summary.completionPct}
          readiness={readiness}
          readinessClass={readinessClass}
          recentActivities={recentActivities}
        />
      )}

      {activeTab === "week" && (
        <WeekTab
          weekStart={weekStart}
          setWeekStart={setWeekStart}
          selectedDay={selectedDay}
          setSelectedDay={setSelectedDay}
          days={days}
          dayEntries={dayEntries}
          allEntries={workoutEntries.entries}
          summary={summary}
          workoutEntries={workoutEntries}
          selectedPlanId={selectedPlanId}
        />
      )}
    </div>
  );
}
