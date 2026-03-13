import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useAppData } from "../context/AppDataContext";
import PageContainer from "../components/layout/PageContainer";
import { getSupabaseClient } from "../lib/supabaseClient";
import { buildCoachPayload } from "../lib/coachPayload";
import { WEEKLY_PLAN_HANDOFF_KEY } from "../lib/appNavigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

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

function formatDayLabel(isoDate) {
  const date = new Date(`${isoDate}T00:00:00Z`);
  return date.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
}

function isToday(isoDate) {
  return isoDate === new Date().toISOString().split("T")[0];
}

function normalizeWeeklyEntry(entry) {
  const workoutDate = entry?.workout_date ?? entry?.date ?? "";
  return {
    ...entry,
    workout_date: workoutDate,
    workout_type: entry?.workout_type ?? "Easy",
    distance_km: entry?.distance_km != null && entry?.distance_km !== "" ? Number(entry.distance_km) : null,
    duration_min: entry?.duration_min != null && entry?.duration_min !== "" ? Number(entry.duration_min) : null,
    description: entry?.description ?? null,
    completed: Boolean(entry?.completed),
  };
}

function startOfIsoWeek(isoDate) {
  const d = new Date(`${isoDate}T00:00:00Z`);
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() - day + 1);
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString().split("T")[0];
}

function normalizeGeneratedStructuredPlan(structuredPlan, targetWeekStart) {
  const normalizedDays = (Array.isArray(structuredPlan) ? structuredPlan : [])
    .map((day, index) => {
      const rawDate = String(day?.date ?? day?.workout_date ?? "").trim();
      const parsedDate = rawDate ? new Date(`${rawDate}T00:00:00Z`) : null;
      const resolvedDate = parsedDate && !Number.isNaN(parsedDate.getTime())
        ? rawDate
        : isoDateOffset(targetWeekStart, Math.min(index, 6));
      const sourceWeekStart = startOfIsoWeek(resolvedDate);
      const dayOffset = Math.max(
        0,
        Math.min(
          6,
          Math.round((new Date(`${resolvedDate}T00:00:00Z`) - new Date(`${sourceWeekStart}T00:00:00Z`)) / (1000 * 60 * 60 * 24)),
        ),
      );

      return {
        workout_date: isoDateOffset(targetWeekStart, dayOffset),
        workout_type: String(day?.workout_type ?? "Easy"),
        distance_km: day?.distance_km ?? null,
        duration_min: day?.duration_min ?? null,
        description: day?.description ?? null,
      };
    })
    .filter((day) => day.workout_type);

  return normalizedDays;
}

function getWeekIntent(blocks, planId, weekStartIso) {
  const weekEndIso = isoDateOffset(weekStartIso, 6);
  const matchingBlock = (blocks ?? []).find(
    (block) =>
      block.plan_id === planId &&
      block.start_date <= weekEndIso &&
      block.end_date >= weekStartIso,
  );

  if (!matchingBlock) return null;

  return {
    weekStart: weekStartIso,
    weekEnd: weekEndIso,
    trainingType: matchingBlock.phase ?? null,
    targetMileageKm: matchingBlock.target_km ?? null,
    notes: matchingBlock.notes ?? null,
  };
}

function normalizeSelectedWeekIntent(intent, fallbackWeekStart) {
  if (!intent) return null;

  return {
    weekStart: intent.weekStart ?? fallbackWeekStart,
    weekEnd: intent.weekEnd ?? isoDateOffset(intent.weekStart ?? fallbackWeekStart, 6),
    trainingType: intent.trainingType ?? intent.phase ?? null,
    targetMileageKm: intent.targetMileageKm ?? intent.targetKm ?? null,
    notes: intent.notes ?? null,
  };
}

function isWeekVisible(visibleWeeks, weekStart) {
  return Boolean(weekStart) && visibleWeeks.includes(weekStart);
}

function createEmptyWeeklyConstraints() {
  return {
    preferredLongRunDay: "",
    preferredHardWorkoutDay: "",
    commuteDays: [],
    doubleThresholdPreference: "default",
  };
}

function normalizeWeeklyConstraintsForPayload(weeklyConstraints) {
  if (!weeklyConstraints) return null;

  const commuteDays = Array.from(
    new Set(
      (Array.isArray(weeklyConstraints.commuteDays) ? weeklyConstraints.commuteDays : [])
        .map((day) => String(day ?? "").trim())
        .filter(Boolean),
    ),
  );
  const doubleThresholdAllowed = weeklyConstraints.doubleThresholdPreference === "allow"
    ? true
    : weeklyConstraints.doubleThresholdPreference === "avoid"
      ? false
      : null;

  if (
    !weeklyConstraints.preferredLongRunDay &&
    !weeklyConstraints.preferredHardWorkoutDay &&
    commuteDays.length === 0 &&
    doubleThresholdAllowed == null
  ) {
    return null;
  }

  return {
    preferredLongRunDay: weeklyConstraints.preferredLongRunDay || null,
    preferredHardWorkoutDay: weeklyConstraints.preferredHardWorkoutDay || null,
    commuteDays,
    doubleThresholdAllowed,
  };
}

function WeeklyAiCard({
  visibleWeeks,
  selectedWeekStart,
  onSelectWeek,
  weekStart,
  weekEntries,
  weekIntent,
  weeklyConstraints,
  onConstraintChange,
  latestGenerationFeedback,
  pendingReview,
  onApplyProtectedPlan,
  onForceApplyProtectedPlan,
  onGenerate,
  loading,
  error,
}) {
  const existingCount = weekEntries.length;
  const targetKm = weekIntent?.targetMileageKm;
  const hasConstraints = Boolean(
    weeklyConstraints.preferredLongRunDay ||
    weeklyConstraints.preferredHardWorkoutDay ||
    weeklyConstraints.commuteDays.length > 0 ||
    weeklyConstraints.doubleThresholdPreference !== "default",
  );

  const toggleCommuteDay = (day) => {
    const nextCommuteDays = weeklyConstraints.commuteDays.includes(day)
      ? weeklyConstraints.commuteDays.filter((value) => value !== day)
      : [...weeklyConstraints.commuteDays, day];
    onConstraintChange("commuteDays", nextCommuteDays);
  };

  return (
    <Card className="mb-5 border-slate-200">
      <CardHeader className="pb-2 px-4 pt-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">AI week setup</p>
            <h3 className="m-0 mt-1 text-base font-bold text-slate-900">Plan {formatWeekLabel(weekStart)}</h3>
            <p className="m-0 mt-1 text-sm text-slate-500">
              {existingCount === 0
                ? "Start this week with an AI-generated structure, then edit sessions directly in the grid."
                : `This week already has ${existingCount} workout${existingCount === 1 ? "" : "s"}. Generating again will replace them after confirmation.`}
            </p>
          </div>
          <Button type="button" onClick={onGenerate} disabled={loading} className="self-start">
            {loading ? "Generating…" : existingCount === 0 ? "Generate AI Week" : "Replace With AI Week"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <div className="mb-3 flex flex-wrap gap-2">
          {visibleWeeks.map((visibleWeekStart) => {
            const isSelected = visibleWeekStart === selectedWeekStart;
            return (
              <Button
                key={visibleWeekStart}
                type="button"
                variant={isSelected ? "default" : "outline"}
                size="sm"
                className="h-auto px-3 py-1.5 text-xs"
                onClick={() => onSelectWeek(visibleWeekStart)}
              >
                {formatWeekLabel(visibleWeekStart)}
              </Button>
            );
          })}
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
            <p className="m-0 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Week</p>
            <p className="m-0 mt-1 text-sm font-semibold text-slate-900">{formatWeekLabel(weekStart)}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
            <p className="m-0 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Training intent</p>
            <p className="m-0 mt-1 text-sm font-semibold text-slate-900">{weekIntent?.trainingType ?? "Not set yet"}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
            <p className="m-0 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Target volume</p>
            <p className="m-0 mt-1 text-sm font-semibold text-slate-900">
              {targetKm != null ? `${Number(targetKm).toFixed(0)} km` : "Use plan context"}
            </p>
          </div>
        </div>
        {weekIntent?.notes && (
          <div className="mt-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
            <p className="m-0 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Coach note</p>
            <p className="m-0 mt-1 text-sm text-slate-600">{weekIntent.notes}</p>
          </div>
        )}
        {latestGenerationFeedback?.adaptationSummary && (
          <div className="mt-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2">
            <p className="m-0 text-[11px] font-semibold uppercase tracking-wide text-emerald-700">Constraint handling</p>
            <p className="m-0 mt-1 text-sm text-emerald-900">{latestGenerationFeedback.adaptationSummary}</p>
          </div>
        )}
        <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
            <div>
              <p className="m-0 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Weekly constraints</p>
              <p className="m-0 mt-1 text-sm text-slate-600">
                Optional scheduling preferences for this week only. Leave blank for the fastest AI path.
              </p>
            </div>
            {hasConstraints && (
              <p className="m-0 text-xs font-medium text-slate-500">Preferences will be sent with this week request.</p>
            )}
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <Label className="grid gap-1 text-[11px] font-medium text-slate-500">
              Preferred long run day
              <select
                className={selectClass}
                value={weeklyConstraints.preferredLongRunDay}
                onChange={(event) => onConstraintChange("preferredLongRunDay", event.target.value)}
                aria-label="Preferred long run day"
              >
                <option value="">No preference</option>
                {DAY_NAMES.map((day) => <option key={`long-${day}`} value={day}>{day}</option>)}
              </select>
            </Label>
            <Label className="grid gap-1 text-[11px] font-medium text-slate-500">
              Preferred hard workout day
              <select
                className={selectClass}
                value={weeklyConstraints.preferredHardWorkoutDay}
                onChange={(event) => onConstraintChange("preferredHardWorkoutDay", event.target.value)}
                aria-label="Preferred hard workout day"
              >
                <option value="">No preference</option>
                {DAY_NAMES.map((day) => <option key={`hard-${day}`} value={day}>{day}</option>)}
              </select>
            </Label>
          </div>
          <div className="mt-3">
            <p className="m-0 text-[11px] font-medium text-slate-500">Commute days</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {DAY_NAMES.map((day) => {
                const selected = weeklyConstraints.commuteDays.includes(day);
                return (
                  <Button
                    key={`commute-${day}`}
                    type="button"
                    variant={selected ? "default" : "outline"}
                    size="sm"
                    className="h-auto px-3 py-1.5 text-xs"
                    onClick={() => toggleCommuteDay(day)}
                    aria-pressed={selected}
                  >
                    {day}
                  </Button>
                );
              })}
            </div>
          </div>
          <Label className="mt-3 grid gap-1 text-[11px] font-medium text-slate-500">
            Double threshold
            <select
              className={selectClass}
              value={weeklyConstraints.doubleThresholdPreference}
              onChange={(event) => onConstraintChange("doubleThresholdPreference", event.target.value)}
              aria-label="Double threshold preference"
            >
              <option value="default">No preference</option>
              <option value="allow">Allowed</option>
              <option value="avoid">Avoid this week</option>
            </select>
          </Label>
        </div>
        {pendingReview && (
          <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-3">
            <p className="m-0 text-[11px] font-semibold uppercase tracking-wide text-amber-700">Protected day review</p>
            <p className="m-0 mt-1 text-sm text-amber-900">
              AI generation found protected days. The safe path keeps your manual edits on {pendingReview.protectedDates.length} day{pendingReview.protectedDates.length === 1 ? "" : "s"}.
            </p>
            <p className="m-0 mt-2 text-sm text-amber-900">
              {pendingReview.protectedDates.map((date) => formatDayLabel(date)).join(", ")}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button type="button" size="sm" onClick={onApplyProtectedPlan}>
                Apply and keep protected days
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={onForceApplyProtectedPlan}>
                Replace protected days too
              </Button>
            </div>
          </div>
        )}
        {error && <p className="m-0 mt-3 text-sm text-red-600">{error}</p>}
      </CardContent>
    </Card>
  );
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

const selectClass = "w-full border border-input rounded-md px-2 py-1.5 font-inherit text-xs bg-background focus:outline-none focus:ring-1 focus:ring-ring";

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
      <Label className="grid gap-1 text-[11px] font-medium text-slate-500">
        Type
        <select className={selectClass} value={form.workout_type} onChange={(e) => set("workout_type", e.target.value)}>
          {WORKOUT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </Label>

      {form.workout_type !== "Rest" && (
        <>
          <div className="grid grid-cols-2 gap-1.5">
            <Label className="grid gap-1 text-[11px] font-medium text-slate-500">
              Distance (km)
              <Input type="number" min="0" max="200" step="0.1" className="text-xs h-8 px-2 py-1.5" placeholder="—" value={form.distance_km} onChange={(e) => set("distance_km", e.target.value)} />
            </Label>
            <Label className="grid gap-1 text-[11px] font-medium text-slate-500">
              Duration (min)
              <Input type="number" min="0" max="600" className="text-xs h-8 px-2 py-1.5" placeholder="—" value={form.duration_min} onChange={(e) => set("duration_min", e.target.value)} />
            </Label>
          </div>
          <Label className="grid gap-1 text-[11px] font-medium text-slate-500">
            Description
            <Textarea rows={2} className="text-xs min-h-0 px-2 py-1.5" placeholder="e.g. 8×400m @ 5K pace, 90s recovery" value={form.description} onChange={(e) => set("description", e.target.value)} />
          </Label>
        </>
      )}

      <div className="flex gap-1.5">
        <Button type="submit" size="sm" className="h-auto text-xs px-3 py-1.5" disabled={loading}>
          {loading ? "Saving…" : initial?.id ? "Update" : "Add"}
        </Button>
        <Button type="button" variant="outline" size="sm" className="h-auto text-xs px-2.5 py-1.5" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
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
        <p className="font-mono m-0 text-xs text-slate-600">
          {entry.distance_km ? `${entry.distance_km} km` : ""}
          {entry.distance_km && entry.duration_min ? " · " : ""}
          {entry.duration_min ? `${entry.duration_min} min` : ""}
        </p>
      )}
      {entry.description && (
        <p className="m-0 text-[11px] text-slate-500 break-words line-clamp-2">{entry.description}</p>
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
    <div className={`wpp-day min-w-0 flex flex-col bg-white border rounded-xl p-2.5 min-h-[130px] gap-2${isToday(date) ? " is-today border-blue-600 shadow-[0_0_0_1px_#2563eb]" : " border-slate-200"}`}>
      <div className="flex justify-between items-center">
        <span className="wpp-day-label text-xs font-bold text-slate-900">{dayName} {dayNum}</span>
        {!isAddingHere && (
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="w-6 h-6 rounded-full text-slate-500 text-base"
            onClick={() => onAdd(date)}
            title="Add workout"
            disabled={loading}
          >
            +
          </Button>
        )}
      </div>

      <div className="grid gap-1.5 flex-1">
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

// ── Week section ──────────────────────────────────────────────────────────────

function WeekSection({ weekStart, allEntries, addingTo, editingEntry, onAdd, onCancelAdd, onSave, onEdit, onDelete, onToggle, loading, pageError }) {
  const weekEnd = isoDateOffset(weekStart, 6);
  const days = weekDays(weekStart);

  const weekEntries = allEntries.filter(
    (e) => e.workout_date >= weekStart && e.workout_date <= weekEnd,
  );

  const summary = useMemo(() => {
    const nonRest = weekEntries.filter((e) => e.workout_type !== "Rest");
    const completed = nonRest.filter((e) => e.completed).length;
    const totalKm = weekEntries.reduce((acc, e) => acc + (Number(e.distance_km) || 0), 0);
    const restCount = weekEntries.filter((e) => e.workout_type === "Rest").length;
    return {
      totalKm: totalKm.toFixed(1),
      sessions: nonRest.length,
      restDays: restCount,
      completionPct: nonRest.length ? Math.round((completed / nonRest.length) * 100) : 0,
    };
  }, [weekEntries]);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2 px-4 pt-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <span className="wpp-week-label font-semibold text-sm text-slate-900">{formatWeekLabel(weekStart)}</span>
          <div className="flex gap-4 flex-wrap items-center">
            <span className="wpp-summary-stat text-[13px] text-slate-500">Total: <strong className="font-mono text-slate-900 font-bold">{summary.totalKm} km</strong></span>
            <span className="wpp-summary-stat text-[13px] text-slate-500">Sessions: <strong className="font-mono text-slate-900 font-bold">{summary.sessions}</strong></span>
            <span className="wpp-summary-stat text-[13px] text-slate-500">Rest: <strong className="font-mono text-slate-900 font-bold">{summary.restDays}</strong></span>
            <span className="wpp-summary-stat text-[13px] text-slate-500">Completed: <strong className="font-mono text-slate-900 font-bold">{summary.completionPct}%</strong></span>
            {pageError && <p className="text-sm text-red-600 m-0">{pageError}</p>}
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <div className="wpp-day-grid grid grid-cols-7 gap-2.5 items-start max-[960px]:grid-cols-2 max-[480px]:grid-cols-1">
          {days.map((date, i) => (
            <DayColumn
              key={date}
              date={date}
              dayName={DAY_NAMES[i]}
              entries={weekEntries}
              addingTo={addingTo}
              editingEntry={editingEntry}
              onAdd={onAdd}
              onCancelAdd={onCancelAdd}
              onSave={onSave}
              onEdit={onEdit}
              onDelete={onDelete}
              onToggle={onToggle}
              loading={loading}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function WeeklyPlanPage() {
  const { plans, workoutEntries, activities, dailyLogs, checkins, trainingBlocks, runnerProfile } = useAppData();

  const [selectedPlanId, setSelectedPlanId] = useState(null);
  const [planningStartDate, setPlanningStartDate] = useState(currentMondayIso);
  const [selectedAiWeekStart, setSelectedAiWeekStart] = useState(currentMondayIso);
  const [addingTo, setAddingTo] = useState(null);
  const [editingEntry, setEditingEntry] = useState(null);
  const [pageError, setPageError] = useState(null);
  const [planGenerationLoading, setPlanGenerationLoading] = useState(false);
  const [handoffIntent, setHandoffIntent] = useState(null);
  const [weeklyConstraints, setWeeklyConstraints] = useState(createEmptyWeeklyConstraints);
  const [latestGenerationFeedback, setLatestGenerationFeedback] = useState(null);
  const [pendingPlanReview, setPendingPlanReview] = useState(null);

  // Auto-select first plan
  useEffect(() => {
    if (!selectedPlanId && plans.plans.length > 0) {
      setSelectedPlanId(plans.plans[0].id);
    }
  }, [plans.plans, selectedPlanId]);

  useEffect(() => {
    const raw = window.sessionStorage.getItem(WEEKLY_PLAN_HANDOFF_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      if (parsed?.weekStart) {
        setPlanningStartDate(parsed.weekStart);
        setSelectedAiWeekStart(parsed.weekStart);
      }
      if (parsed?.planId) {
        setSelectedPlanId(parsed.planId);
      }
      setHandoffIntent(parsed);
    } catch {
      window.sessionStorage.removeItem(WEEKLY_PLAN_HANDOFF_KEY);
    }
  }, []);

  // 4-week visible window
  const visibleWeeks = useMemo(() => [
    planningStartDate,
    isoDateOffset(planningStartDate, 7),
    isoDateOffset(planningStartDate, 14),
    isoDateOffset(planningStartDate, 21),
  ], [planningStartDate]);

  useEffect(() => {
    if (!isWeekVisible(visibleWeeks, selectedAiWeekStart)) {
      setSelectedAiWeekStart(planningStartDate);
    }
  }, [planningStartDate, selectedAiWeekStart, visibleWeeks]);

  const normalizedEntries = useMemo(
    () => workoutEntries.entries.map(normalizeWeeklyEntry),
    [workoutEntries.entries],
  );
  const activePlan = useMemo(
    () => plans.plans.find((plan) => plan.id === selectedPlanId) ?? null,
    [plans.plans, selectedPlanId],
  );
  const selectedAiWeekEntries = useMemo(
    () => normalizedEntries.filter((entry) => entry.workout_date >= selectedAiWeekStart && entry.workout_date <= isoDateOffset(selectedAiWeekStart, 6)),
    [normalizedEntries, selectedAiWeekStart],
  );
  const selectedAiWeekIntentFromPlan = useMemo(
    () => getWeekIntent(trainingBlocks.blocks, selectedPlanId, selectedAiWeekStart),
    [trainingBlocks.blocks, selectedPlanId, selectedAiWeekStart],
  );
  const selectedWeekIntent = useMemo(() => {
    if (
      handoffIntent &&
      handoffIntent.planId === selectedPlanId &&
      handoffIntent.weekStart === selectedAiWeekStart
    ) {
      return normalizeSelectedWeekIntent(handoffIntent, selectedAiWeekStart);
    }
    return normalizeSelectedWeekIntent(selectedAiWeekIntentFromPlan, selectedAiWeekStart);
  }, [handoffIntent, selectedAiWeekIntentFromPlan, selectedAiWeekStart, selectedPlanId]);

  // Load entries for entire 4-week range
  useEffect(() => {
    if (selectedPlanId && planningStartDate) {
      const rangeEnd = isoDateOffset(planningStartDate, 27);
      workoutEntries.loadEntriesForRange(selectedPlanId, planningStartDate, rangeEnd).catch(() => {});
    }
  }, [selectedPlanId, planningStartDate, workoutEntries.loadEntriesForRange]);

  const resetToToday = useCallback(() => {
    const todayMonday = currentMondayIso();
    setPlanningStartDate(todayMonday);
    setSelectedAiWeekStart(todayMonday);
    setAddingTo(null);
    setEditingEntry(null);
  }, []);

  const navigateBack = useCallback(() => {
    setPlanningStartDate((d) => isoDateOffset(d, -28));
    setAddingTo(null);
    setEditingEntry(null);
  }, []);

  const navigateForward = useCallback(() => {
    setPlanningStartDate((d) => isoDateOffset(d, 28));
    setAddingTo(null);
    setEditingEntry(null);
  }, []);

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

  const handleConstraintChange = useCallback((field, value) => {
    setWeeklyConstraints((current) => ({
      ...current,
      [field]: value,
    }));
  }, []);

  const clearPlanReview = useCallback(() => {
    setPendingPlanReview(null);
  }, []);

  const handleApplyProtectedPlan = useCallback(async () => {
    if (!pendingPlanReview || !activePlan?.id) return;
    setPlanGenerationLoading(true);
    setPageError(null);
    try {
      await workoutEntries.applyStructuredPlan(activePlan.id, pendingPlanReview.structuredPlan, {
        overwritePolicy: "preserve-protected",
      });
      clearPlanReview();
    } catch (err) {
      setPageError(err.message || "Failed to apply the reviewed plan.");
    } finally {
      setPlanGenerationLoading(false);
    }
  }, [activePlan?.id, clearPlanReview, pendingPlanReview, workoutEntries]);

  const handleForceApplyProtectedPlan = useCallback(async () => {
    if (!pendingPlanReview || !activePlan?.id) return;
    const protectedCount = pendingPlanReview.protectedDates.length;
    const confirmed = window.confirm(
      `Replace ${protectedCount} protected day${protectedCount === 1 ? "" : "s"} for ${formatWeekLabel(selectedAiWeekStart)}?`,
    );
    if (!confirmed) return;

    setPlanGenerationLoading(true);
    setPageError(null);
    try {
      await workoutEntries.applyStructuredPlan(activePlan.id, pendingPlanReview.structuredPlan, {
        overwritePolicy: "force-specific",
        forceOverwriteDates: pendingPlanReview.protectedDates,
      });
      clearPlanReview();
    } catch (err) {
      setPageError(err.message || "Failed to override protected days.");
    } finally {
      setPlanGenerationLoading(false);
    }
  }, [activePlan?.id, clearPlanReview, pendingPlanReview, selectedAiWeekStart, workoutEntries]);

  const handleGenerateWeek = useCallback(async () => {
    if (!activePlan?.id) return;
    const client = getSupabaseClient();
    if (!client) {
      setPageError("Supabase is not configured.");
      return;
    }

    if (selectedAiWeekEntries.length > 0) {
      const confirmed = window.confirm(
        `Replace ${selectedAiWeekEntries.length} existing workout${selectedAiWeekEntries.length === 1 ? "" : "s"} in ${formatWeekLabel(selectedAiWeekStart)}?`,
      );
      if (!confirmed) return;
    }

    setPlanGenerationLoading(true);
    setPageError(null);
    clearPlanReview();

    try {
      const basePayload = await buildCoachPayload({
        activities,
        dailyLogs,
        checkins,
        activePlan,
        trainingBlocks,
        runnerProfile,
        recommendationWeek: selectedWeekIntent,
        weeklyConstraints: normalizeWeeklyConstraintsForPayload(weeklyConstraints),
        lang: "en",
        mode: "default",
      });
      const targetWeekStart = selectedWeekIntent?.weekStart ?? selectedAiWeekStart;
      const targetWeekEnd = selectedWeekIntent?.weekEnd ?? isoDateOffset(targetWeekStart, 6);
      const { data, error } = await client.functions.invoke("gemini-coach", {
        body: {
          mode: "plan",
          targetWeekStart,
          targetWeekEnd,
          ...basePayload,
        },
      });

      if (error) throw new Error(`Plan generation failed: ${error.message}`);
      if (data?.error) throw new Error(data.error);

      const structuredPlan = normalizeGeneratedStructuredPlan(data?.structured_plan, targetWeekStart);
      if (structuredPlan.length === 0) {
        throw new Error("No plan returned from coach.");
      }

      setLatestGenerationFeedback({
        targetWeekStart,
        coachingFeedback: data?.coaching_feedback ?? "",
        adaptationSummary: data?.adaptation_summary ?? "",
      });

      const preview = await workoutEntries.previewStructuredPlanApply(activePlan.id, structuredPlan);
      if (preview.reviewRequired) {
        setPendingPlanReview({
          targetWeekStart,
          structuredPlan,
          protectedDates: preview.protectedDates,
        });
        return;
      }

      await workoutEntries.applyStructuredPlan(activePlan.id, structuredPlan, {
        overwritePolicy: "preserve-protected",
      });
    } catch (err) {
      setPageError(err.message || "Failed to generate weekly plan.");
    } finally {
      setPlanGenerationLoading(false);
    }
  }, [
    activePlan,
    activities,
    checkins,
    clearPlanReview,
    dailyLogs,
    selectedAiWeekEntries.length,
    selectedAiWeekStart,
    runnerProfile,
    selectedWeekIntent,
    trainingBlocks,
    weeklyConstraints,
    workoutEntries,
  ]);

  return (
    <PageContainer>
      <div className="w-full max-w-screen-xl mx-auto overflow-x-hidden">
        <div className="mb-5">
          <h2 className="m-0 mb-1 text-2xl font-bold font-sans text-slate-900">Weekly Plan</h2>
          <p className="m-0 text-sm text-slate-500">Plan your workouts day by day across the next four weeks.</p>
        </div>

        {/* Header: plan select + 4-week nav */}
        <div className="bg-white border border-slate-200 rounded-2xl px-4 py-3.5 mb-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <Label className="text-[13px] font-semibold m-0 flex items-center gap-1.5 min-w-0">
                Plan:
                <select
                  className={`ml-1.5 ${selectClass}`}
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
              </Label>
            </div>

            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="sm" className="h-auto px-3 py-1.5" onClick={navigateBack}>←</Button>
              <Button type="button" variant="outline" size="sm" className="h-auto px-3 py-1.5" onClick={navigateForward}>→</Button>
              <Button type="button" variant="outline" size="sm" className="h-auto px-3 py-1.5 text-xs" onClick={resetToToday}>Today</Button>
            </div>
          </div>
        </div>

        {selectedPlanId && (
          <WeeklyAiCard
            visibleWeeks={visibleWeeks}
            selectedWeekStart={selectedAiWeekStart}
            onSelectWeek={setSelectedAiWeekStart}
            weekStart={selectedAiWeekStart}
            weekEntries={selectedAiWeekEntries}
            weekIntent={selectedWeekIntent}
            weeklyConstraints={weeklyConstraints}
            onConstraintChange={handleConstraintChange}
            latestGenerationFeedback={
              latestGenerationFeedback?.targetWeekStart === selectedAiWeekStart
                ? latestGenerationFeedback
                : null
            }
            pendingReview={
              pendingPlanReview?.targetWeekStart === selectedAiWeekStart
                ? pendingPlanReview
                : null
            }
            onApplyProtectedPlan={handleApplyProtectedPlan}
            onForceApplyProtectedPlan={handleForceApplyProtectedPlan}
            onGenerate={handleGenerateWeek}
            loading={planGenerationLoading}
            error={pageError}
          />
        )}

        {/* Four-week rolling view */}
        {!selectedPlanId ? (
          <p className="text-sm text-slate-400 text-center py-8">Select or create a training plan to start planning your week.</p>
        ) : (
          <div className="space-y-6">
            {visibleWeeks.map((weekStart) => (
              <WeekSection
                key={weekStart}
                weekStart={weekStart}
                allEntries={normalizedEntries}
                addingTo={addingTo}
                editingEntry={editingEntry}
                onAdd={handleAdd}
                onCancelAdd={() => setAddingTo(null)}
                onSave={handleSave}
                onEdit={setEditingEntry}
                onDelete={handleDelete}
                onToggle={handleToggle}
                loading={workoutEntries.loading}
                pageError={pageError}
              />
            ))}
          </div>
        )}
      </div>
    </PageContainer>
  );
}
