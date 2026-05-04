import React, { useEffect, useMemo, useState } from "react";
import ProgressRing from "./components/ProgressRing";
import MiniLine from "./components/MiniLine";
import WorkoutSheet from "./components/WorkoutSheet";
import StravaSync from "./components/StravaSync";
import { typeMeta } from "./lib/typeColors";
import { buildInsights } from "./lib/syntheticInsights";

const DAY_NAMES = ["Man", "Tir", "Ons", "Tor", "Fre", "Lør", "Søn"];

function km(value) {
  const numeric = Number(value) || 0;
  return numeric % 1 === 0 ? `${numeric}` : numeric.toFixed(1);
}

function weekTotal(week) {
  return (week?.days ?? []).reduce((sum, day) => sum + (day?.workouts ?? []).reduce((daySum, workout) => daySum + (Number(workout?.distanceKm) || 0), 0), 0);
}

function workoutForDay(day) {
  return day?.workouts?.[0] ?? null;
}

function dayDistance(day) {
  return (day?.workouts ?? []).reduce((total, workout) => total + (Number(workout?.distanceKm) || 0), 0);
}

export default function MobileDashboard({
  load,
  weeklyKm,
  season,
  goalRace,
  planPageModel,
  hierarchicalPlan,
  strava,
  consistency,
}) {
  const days = planPageModel?.currentWeekDays?.length ? planPageModel.currentWeekDays : planPageModel?.currentWeek?.days ?? [];
  const [selectedDate, setSelectedDate] = useState(() => days.find((day) => day?.isToday)?.date ?? days[0]?.date ?? "");
  const [sheet, setSheet] = useState(null);
  const selectedDay = days.find((day) => day?.date === selectedDate) ?? days[0] ?? null;
  const selectedWorkout = workoutForDay(selectedDay);
  const weekNumber = planPageModel?.currentWeek?.weekNumber;
  const plannedThisWeek = weekTotal(planPageModel?.currentWeek);
  const phaseProgress = season?.totalWeeks ? ((season?.currentWeek ?? 0) / season.totalWeeks) * 100 : 0;
  const insights = useMemo(
    () => buildInsights({ load, weeklyKm, season, planPageModel, consistency }),
    [load, weeklyKm, season, planPageModel, consistency],
  );

  useEffect(() => {
    if (!selectedDate && days[0]?.date) setSelectedDate(days[0].date);
  }, [days, selectedDate]);

  async function saveWorkout({ fields, dayDate }) {
    if (sheet?.workout?.id) {
      await hierarchicalPlan?.applyPatch?.([{ week: weekNumber, dayDate, workoutId: sheet.workout.id, fields }]);
      return;
    }
    await hierarchicalPlan?.addWorkout?.({ weekNumber, dayDate, workout: fields });
  }

  async function deleteWorkout() {
    if (!sheet?.workout?.id) return;
    await hierarchicalPlan?.deleteWorkout?.(sheet.workout.id, weekNumber, sheet.day?.date);
  }

  const meta = typeMeta(selectedWorkout?.type, selectedWorkout);

  return (
    <div className="rs-m-screen" aria-label="Mobil oversikt">
      <div className="rs-m-phase-banner">
        <div className="rs-m-phase-inner">
          <div className="rs-m-phase-dot" />
          <div className="rs-m-phase-info">
            <div className="rs-m-phase-label">Nåværende fase</div>
            <div className="rs-m-phase-name">{season?.currentBlock?.name ?? "Treningsfase"}</div>
            <div className="rs-m-phase-sub">{goalRace?.name ? `${goalRace.name} · ${goalRace.daysToRace ?? "?"} dager` : "Planen styrer ukens prioriteringer"}</div>
          </div>
          <ProgressRing value={phaseProgress} label="Sesongprogresjon" />
        </div>
      </div>

      <div className="rs-m-hero-bar">
        <div className="rs-m-hero-kpi">
          <div className="rs-m-hero-kpi-accent" style={{ background: "#4a9eff" }} />
          <div className="rs-m-hero-kpi-label">CTL</div>
          <div className="rs-m-hero-kpi-value">{Math.round(load?.ctl ?? 0)}</div>
          <div className="rs-m-hero-kpi-note">{load?.state?.trendLabel ?? "Belastning"}</div>
        </div>
        <div className="rs-m-hero-kpi">
          <div className="rs-m-hero-kpi-accent" style={{ background: "#f5993a" }} />
          <div className="rs-m-hero-kpi-label">ATL</div>
          <div className="rs-m-hero-kpi-value">{Math.round(load?.atl ?? 0)}</div>
          <div className="rs-m-hero-kpi-note">Kort belastning</div>
        </div>
        <div className="rs-m-hero-kpi">
          <div className="rs-m-hero-kpi-accent" style={{ background: "#4caf72" }} />
          <div className="rs-m-hero-kpi-label">Denne uka</div>
          <div className="rs-m-hero-kpi-value">{Math.round(plannedThisWeek)}</div>
          <div className="rs-m-hero-kpi-note">km planlagt</div>
        </div>
      </div>

      <div className="rs-m-section-title">
        <h1 style={{ margin: 0, font: "inherit" }}>Dagens plan</h1>
        <StravaSync strava={strava} />
      </div>
      <div className="rs-m-week-strip">
        {days.map((day, index) => {
          const total = dayDistance(day);
          const dayMeta = typeMeta(day?.workouts?.[0]?.type, day?.workouts?.[0]);
          return (
            <button
              key={day?.date ?? index}
              type="button"
              className={`rs-m-day-pill ${day?.isToday ? "is-today" : ""} ${day?.date === selectedDate ? "is-selected" : ""} ${day?.completedCount > 0 ? "is-done" : ""}`}
              onClick={() => setSelectedDate(day?.date)}
            >
              <span className="rs-m-day-pill-name">{DAY_NAMES[index] ?? day?.dayOfWeek}</span>
              <span className="rs-m-day-pill-dot" style={{ background: day?.workouts?.length ? dayMeta.color : "#c8d4e0" }} />
              <span className="rs-m-day-pill-km">{total ? km(total) : "0"}</span>
            </button>
          );
        })}
      </div>

      <div className="rs-m-today-card">
        <div className="rs-m-today-bar" style={{ background: meta.color }} />
        <div className="rs-m-today-inner">
          <span className="rs-m-today-badge" style={{ color: meta.color, background: meta.bg }}>
            {selectedWorkout ? meta.label : "Hvile"}
          </span>
          <div className="rs-m-today-name">{selectedWorkout?.name ?? "Ingen planlagt økt"}</div>
          <div className="rs-m-today-stats">
            <div className="rs-m-today-stat">
              <div className="rs-m-today-stat-val">{selectedWorkout?.distanceKm ?? 0}</div>
              <div className="rs-m-today-stat-lbl">km</div>
            </div>
            <div className="rs-m-today-stat">
              <div className="rs-m-today-stat-val">{selectedWorkout?.durationMinutes ?? "–"}</div>
              <div className="rs-m-today-stat-lbl">min</div>
            </div>
            <div className="rs-m-today-stat">
              <div className="rs-m-today-stat-val">{selectedWorkout?.primaryZone ?? "–"}</div>
              <div className="rs-m-today-stat-lbl">sone</div>
            </div>
          </div>
          <div className="rs-m-today-note">{selectedWorkout?.description || selectedWorkout?.humanReadable || "Bruk dagen til restitusjon eller mobilitet hvis kroppen trenger det."}</div>
          <div className="rs-m-today-actions">
            <button type="button" className="rs-m-btn-primary" onClick={() => setSheet({ day: selectedDay, workout: selectedWorkout, isAdd: !selectedWorkout })}>
              {selectedWorkout ? "Rediger økt" : "Legg til økt"}
            </button>
          </div>
        </div>
      </div>

      <div className="rs-m-card">
        <div className="rs-m-card-header">
          <div className="rs-m-card-title">Treningsbelastning</div>
          <div className="rs-m-card-sub">Siste 30 punkter</div>
        </div>
        <div className="rs-m-card-body">
          <MiniLine data={(load?.series ?? []).slice(-30)} lines={[{ key: "ctl", color: "#1a5fb4" }, { key: "atl", color: "#c25c00" }]} />
        </div>
      </div>

      <div className="rs-m-card">
        <div className="rs-m-card-header">
          <div className="rs-m-card-title">AI-innsikt</div>
          <div className="rs-m-card-ai-badge">LIVE</div>
        </div>
        <div>
          {insights.map((insight, index) => (
            <div key={`${insight.text}-${index}`} className="rs-m-insight-row">
              <span
                className="rs-m-insight-dot"
                style={{ background: insight.level === "warn" ? "var(--rs-m-warn)" : insight.level === "ok" ? "var(--rs-m-ok)" : "var(--rs-m-primary)" }}
              />
              <div className="rs-m-insight-text">{insight.text}</div>
            </div>
          ))}
        </div>
      </div>

      {sheet ? (
        <WorkoutSheet
          day={sheet.day}
          days={days}
          weekNumber={weekNumber}
          workout={sheet.workout}
          isAdd={sheet.isAdd}
          onClose={() => setSheet(null)}
          onSave={saveWorkout}
          onDelete={deleteWorkout}
        />
      ) : null}
    </div>
  );
}
