function sumWeekKm(week) {
  return (week?.days ?? []).reduce((weekTotal, day) => {
    const dayTotal = (day?.workouts ?? []).reduce((total, workout) => total + (Number(workout?.distanceKm) || 0), 0);
    return weekTotal + dayTotal;
  }, 0);
}

function formatDelta(value) {
  const rounded = Math.round(value * 10) / 10;
  if (rounded > 0) return `+${rounded}`;
  return `${rounded}`;
}

export function buildInsights({ load, weeklyKm = [], season, planPageModel, consistency } = {}) {
  const insights = [];
  const series = load?.series ?? [];
  const recent = series.slice(-8);
  if (recent.length >= 2) {
    const first = Number(recent[0]?.ctl) || 0;
    const last = Number(recent[recent.length - 1]?.ctl) || 0;
    const delta = last - first;
    const trend = load?.state?.trendLabel || (delta >= 0 ? "CTL stiger" : "CTL faller");
    insights.push({
      level: Math.abs(delta) > 6 ? "warn" : "ok",
      text: `${trend}. CTL er ${formatDelta(delta)} de siste ${recent.length} datapunktene.`,
    });
  }

  const state = load?.state?.state;
  if (state === "fatigued" || state === "high_fatigue") {
    insights.push({ level: "warn", text: "TSB peker mot høy belastning. Hold de rolige dagene rolige før neste nøkkeløkt." });
  } else if (state === "fresh" || state === "ready") {
    insights.push({ level: "ok", text: "Formen ser frisk ut. Dette er et godt vindu for en kontrollert kvalitetsøkt." });
  } else {
    insights.push({ level: "info", text: load?.state?.stateLabel ? `${load.state.stateLabel}. Se etter jevn gjennomføring heller enn store hopp.` : "Belastningen ser stabil ut. Fortsett med jevn progresjon." });
  }

  const plannedKm = sumWeekKm(planPageModel?.currentWeek);
  const trailing = weeklyKm.slice(-5, -1).filter((value) => Number.isFinite(Number(value)));
  const trailingAvg = trailing.length ? trailing.reduce((total, value) => total + Number(value), 0) / trailing.length : 0;
  if (plannedKm || trailingAvg) {
    const diff = trailingAvg ? ((plannedKm - trailingAvg) / trailingAvg) * 100 : 0;
    const level = diff > 20 ? "warn" : "info";
    insights.push({
      level,
      text: `Denne uken er planlagt til ${Math.round(plannedKm)} km${trailingAvg ? ` mot ${Math.round(trailingAvg)} km snitt siste fire uker` : ""}.`,
    });
  }

  const pct = consistency?.percentage ?? consistency?.pct ?? consistency?.score;
  if (pct != null) {
    insights.push({
      level: pct >= 80 ? "ok" : pct < 55 ? "warn" : "info",
      text: `Gjennomføringen ligger på ${Math.round(pct)}%. ${pct >= 80 ? "Bra kontinuitet." : "Bruk planen som ramme, men juster etter energi."}`,
    });
  }

  if (season?.currentBlock?.name) {
    insights.push({
      level: "info",
      text: `Nåværende fase: ${season.currentBlock.name}. Prioriter øktene som støtter fasens hovedfokus.`,
    });
  }

  return insights.slice(0, 5);
}
