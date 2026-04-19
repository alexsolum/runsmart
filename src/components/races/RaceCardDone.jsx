import React from "react";
import Chip from "../ui/Chip";

const NO_MONTHS = ["JAN","FEB","MAR","APR","MAI","JUN","JUL","AUG","SEP","OKT","NOV","DES"];

function formatRaceDate(dateStr) {
  if (!dateStr) return { d: "—", m: "" };
  const d = new Date(dateStr);
  return {
    d: String(d.getUTCDate()).padStart(2, "0"),
    m: NO_MONTHS[d.getUTCMonth()],
  };
}

function deriveMedal(participation) {
  if (!participation) return null;
  if (participation.medal) return participation.medal.toLowerCase();
  const place = participation.overall_place;
  if (!place || !participation.total_finishers) return "bronze";
  const pct = place / participation.total_finishers;
  if (pct <= 0.10) return "gold";
  if (pct <= 0.25) return "silver";
  return "bronze";
}

function distanceTag(km) {
  if (!km) return null;
  if (km >= 80) return "100K";
  if (km >= 38) return "50K";
  if (km >= 40) return "Maraton";
  if (km >= 19) return "Halvmaraton";
  return `${km} km`;
}

function formatFinishTime(t) {
  if (!t) return "—";
  return String(t).replace(/^0+(?=\d{2}:)/, "");
}

export default function RaceCardDone({ race, onClick }) {
  const participation = (race.race_participations ?? [])[0] ?? null;
  const { d, m } = formatRaceDate(race.race_date);
  const medal = deriveMedal(participation);
  const tag = distanceTag(race.distance_km);

  return (
    <button className="race-card" type="button" onClick={onClick}>
      <div className="race-date">
        <span className="d">{d}</span>
        <span className="m">{m}</span>
      </div>

      <div className="race-main">
        <span className="name">{race.name}</span>
        <span className="loc">
          {race.location ?? ""}
          {race.elevation_gain_m ? <span>{race.elevation_gain_m} m D+</span> : null}
        </span>
        {tag && (
          <div className="tags">
            <Chip kind="ghost">{tag}</Chip>
          </div>
        )}
      </div>

      <div className="race-stats">
        {participation?.finish_time && (
          <div>
            <span className="lbl">Tid</span>
            <span className="v">{formatFinishTime(participation.finish_time)}</span>
          </div>
        )}
        {participation?.overall_place && (
          <div>
            <span className="lbl">Plass</span>
            <span className="v">{participation.overall_place}<small>/{participation.total_finishers ?? "?"}</small></span>
          </div>
        )}
        {medal && (
          <div className={`medal ${medal}`}>
            {medal === "gold" ? "🥇" : medal === "silver" ? "🥈" : "🥉"}
          </div>
        )}
      </div>
    </button>
  );
}
