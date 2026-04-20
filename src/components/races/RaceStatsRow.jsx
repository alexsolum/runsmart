import React, { useMemo } from "react";

function countryFromLocation(location = "") {
  const bits = location
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  return bits.at(-1) ?? "—";
}

function formatDistance(totalKm) {
  return `${Math.round(totalKm)} km`;
}

export default function RaceStatsRow({ doneRows, dreamRaces }) {
  const stats = useMemo(() => {
    const seasons = new Set(
      doneRows
        .map((row) => row.participation?.race_date)
        .filter(Boolean)
        .map((date) => new Date(date).getUTCFullYear()),
    );
    const minYear = seasons.size ? Math.min(...seasons) : null;
    const totalDistance = doneRows.reduce(
      (sum, row) => sum + (row.race?.distance_km ?? 0),
      0,
    );
    const countries = new Set(
      doneRows
        .map((row) => countryFromLocation(row.race?.location))
        .filter(Boolean),
    );
    const nextDream = dreamRaces[0]?.location
      ? countryFromLocation(dreamRaces[0].location)
      : null;

    return {
      completedValue: doneRows.length,
      completedSub:
        doneRows.length && minYear
          ? `${doneRows.length} fullføringer · ${seasons.size} sesonger siden ${minYear}`
          : "Ingen fullføringer ennå",
      distanceValue: formatDistance(totalDistance),
      distanceSub:
        totalDistance > 0
          ? `≈ ${Math.round(totalDistance / 42.195)} maratonlengder`
          : "Ingen racedistanse logget ennå",
      countriesValue: countries.size,
      countriesSub: nextDream
        ? `Neste: ${nextDream}`
        : "Ingen nytt drømmeland valgt",
      dreamsValue: dreamRaces.length,
      dreamsSub: "A-løp, B-løp & bucket list",
    };
  }, [doneRows, dreamRaces]);

  const cards = [
    {
      label: "LØP GJENNOMFØRT",
      value: stats.completedValue,
      sub: stats.completedSub,
    },
    {
      label: "SAMLET RACEDISTANSE",
      value: stats.distanceValue,
      sub: stats.distanceSub,
    },
    {
      label: "LAND BESØKT",
      value: stats.countriesValue,
      sub: stats.countriesSub,
    },
    {
      label: "DRØMMER PLANLAGT",
      value: stats.dreamsValue,
      sub: stats.dreamsSub,
      accent: true,
    },
  ];

  return (
    <section className="race-stats-row" data-testid="race-stats-row">
      {cards.map((card) => (
        <article
          key={card.label}
          className={`race-stat-card${card.accent ? " accent" : ""}`}
        >
          <span className="cc-label">{card.label}</span>
          <strong>{card.value}</strong>
          <p>{card.sub}</p>
        </article>
      ))}
    </section>
  );
}
