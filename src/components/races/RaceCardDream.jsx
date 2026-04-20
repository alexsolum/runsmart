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
  if (km >= 40) return "Maraton";
  if (km >= 21) return "Halvmaraton";
  return `${km} km`;
}

function dreamStatus(race) {
  const raw = race.status ?? race.registration_status;
  if (!raw) return "✦ DRØM";
  const normalized = String(raw).toLowerCase();
  if (normalized.includes("lotto")) return "✦ LOTTERI";
  if (normalized.includes("registered")) return "✓ REGISTRERT";
  if (normalized.includes("signed")) return "✓ PÅMELDT";
  return raw.toUpperCase();
}

export default function RaceCardDream({ race, onClick }) {
  const { d, m } = formatRaceDate(race.next_race_date ?? race.race_date);
  const tag = distanceTag(race.distance_km);

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
        <div className="tags">
          {tag ? <Chip kind="ghost">{tag}</Chip> : null}
          {race.registration_info ? <Chip kind="ghost">{race.registration_info}</Chip> : null}
        </div>
      </div>

      <div className="race-stats">
        <div>
          <span className="lbl">Mål</span>
          <span className="v">{race.target_time ?? "Velg mål senere"}</span>
        </div>
        <Chip kind="recovery">{dreamStatus(race)}</Chip>
      </div>
    </button>
  );
}
