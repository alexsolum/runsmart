function dayHeadline(day) {
  return new Date(`${day.date}T00:00:00`).toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
  });
}

function statusLabel(status) {
  if (status === "completed") return "Fullfort";
  if (status === "partial") return "Delvis";
  if (status === "missed") return "Misset";
  return "Planlagt";
}

export function SimpleWeekGrid({ week, days, onWorkoutSelect }) {
  if (!week) return null;

  return (
    <section className="plan-week-card" data-testid="plan-current-week">
      <div className="plan-week-card__header">
        <div>
          <p className="cc-label">Denne uken</p>
          <h2 className="cc-headline" style={{ margin: 0 }}>
            Uke {week.weekNumber}
          </h2>
        </div>
        <div className="plan-week-card__summary">
          <span>{week.phase}</span>
          <span>{week.summary?.totalKm ?? 0} km</span>
        </div>
      </div>

      <div className="simple-week-grid">
        {days.map((day) => (
          <article
            key={day.date}
            className={`simple-week-grid__day simple-week-grid__day--${day.status}`}
          >
            <div className="simple-week-grid__day-top">
              <div>
                <p className="simple-week-grid__date">{dayHeadline(day)}</p>
                <p className="simple-week-grid__meta">
                  {day.plannedCount} planlagt · {day.completedCount} utfort
                </p>
              </div>
              <div className="simple-week-grid__chips">
                {day.isToday ? (
                  <span className="simple-week-grid__chip simple-week-grid__chip--today">I DAG</span>
                ) : null}
                <span className={`simple-week-grid__chip simple-week-grid__chip--${day.status}`}>
                  {statusLabel(day.status)}
                </span>
              </div>
            </div>

            <div className="simple-week-grid__workouts">
              {(day.workouts ?? []).length === 0 ? (
                <p className="simple-week-grid__empty">Ingen planlagt okt</p>
              ) : (
                day.workouts.map((workout) => (
                  <button
                    key={workout.id}
                    className="simple-week-grid__workout"
                    type="button"
                    onClick={() =>
                      onWorkoutSelect?.({
                        weekNumber: week.weekNumber,
                        dayDate: day.date,
                        dayLabel: day.dayOfWeek,
                        workout,
                      })
                    }
                  >
                    <span>{workout.name}</span>
                    <span>{workout.distanceKm ?? workout.durationMinutes ?? "-"}</span>
                  </button>
                ))
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export default SimpleWeekGrid;
