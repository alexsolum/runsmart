import React, { useMemo, useState } from "react";
import PlanDaySheet from "./components/PlanDaySheet";
import { typeMeta } from "./lib/typeColors";

const DAY_NAMES = ["Man", "Tir", "Ons", "Tor", "Fre", "Lør", "Søn"];

function weekKm(week) {
  return (week?.days ?? []).reduce((sum, day) => sum + (day?.workouts ?? []).reduce((daySum, workout) => daySum + (Number(workout?.distanceKm) || 0), 0), 0);
}

function dayKm(day) {
  return (day?.workouts ?? []).reduce((sum, workout) => sum + (Number(workout?.distanceKm) || 0), 0);
}

function workoutLabel(day) {
  const workout = day?.workouts?.[0];
  return workout ? typeMeta(workout.type, workout).label : "Fri";
}

export default function MobilePlan({ season, planData, hierarchicalPlan }) {
  const weeks = planData?.weeks ?? [];
  const [expandedWeek, setExpandedWeek] = useState(() => season?.currentWeek ?? weeks[0]?.weekNumber ?? null);
  const [selection, setSelection] = useState(null);
  const phases = useMemo(() => planData?.phases ?? season?.blocks ?? [], [planData?.phases, season?.blocks]);

  async function saveWorkout({ fields, dayDate }) {
    if (!selection) return;
    if (selection.workout?.id) {
      await hierarchicalPlan?.applyPatch?.([{ week: selection.week.weekNumber, dayDate, workoutId: selection.workout.id, fields }]);
      return;
    }
    await hierarchicalPlan?.addWorkout?.({ weekNumber: selection.week.weekNumber, dayDate, workout: fields });
  }

  async function deleteWorkout() {
    if (!selection?.workout?.id) return;
    await hierarchicalPlan?.deleteWorkout?.(selection.workout.id, selection.week.weekNumber, selection.day.date);
  }

  return (
    <div className="rs-m-screen" aria-label="Mobil plan">
      <div className="rs-m-section-title">
        <h1 style={{ margin: 0, font: "inherit" }}>Sesongoversikt</h1>
      </div>
      <div className="rs-m-card">
        <div className="rs-m-card-header">
          <div>
            <div className="rs-m-card-title">{season?.currentBlock?.name ?? "Treningsblokk"}</div>
            <div className="rs-m-card-sub">{season?.currentWeek ? `Uke ${season.currentWeek} av ${season.totalWeeks ?? weeks.length}` : `${weeks.length} uker`}</div>
          </div>
          <div className="rs-m-card-ai-badge">{Math.round(((season?.currentWeek ?? 0) / (season?.totalWeeks || weeks.length || 1)) * 100)}%</div>
        </div>
        <div className="rs-m-card-body">
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.max(phases.length, 1)}, 1fr)`, gap: 4 }}>
            {(phases.length ? phases : [{ name: "Plan" }]).map((phase, index) => (
              <div key={`${phase.name}-${index}`} style={{ height: 10, background: phase.color ?? "#1a5fb4", opacity: index % 2 ? 0.65 : 1 }} title={phase.name} />
            ))}
          </div>
        </div>
      </div>

      <div className="rs-m-section-title">Ukeplan</div>
      {weeks.length ? (
        weeks.map((week) => {
          const isOpen = week.weekNumber === expandedWeek;
          const totalKm = weekKm(week);
          const current = week.weekNumber === season?.currentWeek;
          return (
            <div key={week.weekNumber} className={`rs-m-plan-week ${current ? "is-current" : ""}`}>
              <button type="button" className="rs-m-plan-week-header" onClick={() => setExpandedWeek(isOpen ? null : week.weekNumber)}>
                <span className="rs-m-plan-week-num">Uke {week.weekNumber}</span>
                <span className="rs-m-plan-week-phase">{week.phase ?? week.focus ?? "Plan"}</span>
                <span className="rs-m-plan-week-km">{Math.round(totalKm)} km</span>
                {current ? <span className="rs-m-plan-now-chip">NÅ</span> : null}
              </button>
              {isOpen ? (
                <>
                  <div className="rs-m-plan-days">
                    {(week.days ?? []).map((day, index) => {
                      const workout = day?.workouts?.[0];
                      const meta = typeMeta(workout?.type, workout);
                      return (
                        <button
                          key={day?.date ?? index}
                          type="button"
                          className="rs-m-plan-day"
                          onClick={() => setSelection({ week, day, workout, isAdd: !workout })}
                        >
                          <span className="rs-m-plan-day-name">{DAY_NAMES[index] ?? day?.dayOfWeek}</span>
                          <span className="rs-m-plan-day-bar" style={{ background: workout ? meta.color : "#c8d4e0" }} />
                          <span className="rs-m-plan-day-km">{dayKm(day) || 0}</span>
                          <span className="rs-m-plan-day-type">{workoutLabel(day)}</span>
                        </button>
                      );
                    })}
                  </div>
                  <div className="rs-m-plan-add-row">
                    <button type="button" className="rs-m-plan-add-btn" onClick={() => setSelection({ week, day: week.days?.[0], workout: null, isAdd: true })}>
                      + Legg til økt
                    </button>
                  </div>
                </>
              ) : null}
            </div>
          );
        })
      ) : (
        <div className="rs-m-empty">Ingen treningsplan er tilgjengelig ennå.</div>
      )}

      {selection ? (
        <PlanDaySheet
          day={selection.day}
          days={selection.week.days ?? []}
          weekNumber={selection.week.weekNumber}
          workout={selection.workout}
          isAdd={selection.isAdd}
          onClose={() => setSelection(null)}
          onSave={saveWorkout}
          onDelete={deleteWorkout}
        />
      ) : null}
    </div>
  );
}
