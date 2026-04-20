import React from "react";
import Chip from "../ui/Chip";
import PlacementMedal from "./PlacementMedal";

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

function formatFinishTime(t) {
  if (!t) return "—";
  return String(t).replace(/^0+(?=\d{2}:)/, "");
}

export default function RaceCardDone({ race, participation, onClick }) {
  const { d, m } = formatRaceDate(participation?.race_date);
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
        <div className="tags">
          {tag ? <Chip kind="ghost">{tag}</Chip> : null}
          {participation?.is_pb ? <Chip kind="build">PB</Chip> : null}
          {participation?.notes ? <Chip kind="ghost">{participation.notes}</Chip> : null}
        </div>
      </div>

      <div className="race-stats">
        <div>
          <span className="lbl">Tid</span>
          <span className="v">{formatFinishTime(participation?.finish_time)}</span>
        </div>
        <div>
          <span className="lbl">Plass</span>
          <span className="v">
            {participation?.overall_place ?? "—"}
            {participation?.total_finishers ? <small>/{participation.total_finishers}</small> : null}
          </span>
        </div>
        <PlacementMedal
          overallPlace={participation?.overall_place}
          totalFinishers={participation?.total_finishers}
        />
      </div>
    </button>
  );
}
