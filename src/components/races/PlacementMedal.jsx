import React from "react";

function medalTone(place, total) {
  if (!place || !total) return null;
  const pct = place / total;
  if (pct <= 0.1) return "gold";
  if (pct <= 0.25) return "silver";
  if (pct <= 0.5) return "bronze";
  return "stone";
}

export default function PlacementMedal({ overallPlace, totalFinishers }) {
  const tone = medalTone(overallPlace, totalFinishers);
  if (!tone) return null;

  return (
    <div
      className={`placement-medal ${tone}`}
      aria-label="placement medal"
      title={`Plass ${overallPlace} av ${totalFinishers}`}
    >
      {overallPlace}
    </div>
  );
}
