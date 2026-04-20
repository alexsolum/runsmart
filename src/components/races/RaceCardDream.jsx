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

function distanceTag(km) {
  if (!km) return null;
  if (km >= 80) return "100K";
  if (km >= 38) return "50K";
  if (km >= 40) return "Maraton";
  if (km >= 19) return "Halvmaraton";
  return `${km} km`;
}

export default function RaceCardDream({ race, onClick }) {
  const { d, m } = formatRaceDate(race.race_date ?? race.next_race_date);
  const tag = distanceTag(race.distance_km);
  const status = race.registration_status ?? "drøm";

  return (
    <button className="race-card dream" type="button" onClick={onClick}>
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
        {race.target_time && (
          <div>
            <span className="lbl">Mål</span>
            <span className="v">{race.target_time}</span>
          </div>
        )}
        <Chip kind="recovery" style={{ textTransform: "capitalize" }}>{status}</Chip>
      </div>
    </button>
  );
}
