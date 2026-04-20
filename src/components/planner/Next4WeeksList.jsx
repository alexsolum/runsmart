function formatWeekDates(week) {
  if (!week?.startDate || !week?.endDate) return "";

  const start = new Date(`${week.startDate}T00:00:00`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
  const end = new Date(`${week.endDate}T00:00:00`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });

  return `${start}-${end}`;
}

export function Next4WeeksList({ weeks }) {
  if (!weeks?.length) return null;

  return (
    <section className="plan-side-card" data-testid="plan-next-four-weeks">
      <div className="plan-side-card__header">
        <p className="cc-label">Neste 4 uker</p>
        <h2 className="cc-headline" style={{ margin: 0 }}>
          Blokker fremover
        </h2>
      </div>

      <div className="plan-next-weeks">
        {weeks.map((week) => (
          <article key={week.weekNumber} className="plan-next-week-row" data-testid="plan-next-week-row">
            <div>
              <p className="plan-next-week-row__title">Uke {week.weekNumber}</p>
              <p className="plan-next-week-row__meta">{formatWeekDates(week)}</p>
            </div>
            <div className="plan-next-week-row__summary">
              <span>{week.phase}</span>
              <strong>{week.summary?.totalKm ?? 0} km</strong>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export default Next4WeeksList;
