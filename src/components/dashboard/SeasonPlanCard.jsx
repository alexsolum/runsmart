import { useMemo, useState } from "react";
import { useAppData } from "../../context/AppDataContext";
import PhaseRibbon from "./PhaseRibbon";
import Segmented from "../ui/Segmented";
import Metric from "../ui/Metric";

const NO_MONTHS = ["jan", "feb", "mar", "apr", "mai", "jun", "jul", "aug", "sep", "okt", "nov", "des"];

function formatLongDate(iso) {
  if (!iso) return "";
  const date = new Date(iso);
  return `${date.getDate()}. ${NO_MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

function extractRaceMeta(hierarchicalPlan) {
  const plan = hierarchicalPlan?.plan;
  const goal = plan?.plan_data?.raceGoal;
  const name = plan?.race_name ?? goal?.eventName ?? "Mål-løp";
  const date = plan?.race_date ?? goal?.eventDate ?? null;
  const distance = plan?.distance_km ?? goal?.distanceKm ?? null;
  const elevation = plan?.elevation_gain_m ?? goal?.elevationM ?? null;
  const location = plan?.location ?? goal?.location ?? null;
  return { name, date, distance, elevation, location };
}

function computeKpis(hierarchicalPlan) {
  const weeks = hierarchicalPlan?.plan?.plan_data?.weeks ?? [];
  const race = extractRaceMeta(hierarchicalPlan);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const totalKm = weeks.reduce((sum, week) => sum + (week?.summary?.totalKm ?? 0), 0);
  const totalElev = weeks.reduce((sum, week) => (
    (week?.days ?? []).reduce((daySum, day) => (
      (day?.workouts ?? []).reduce((workoutSum, workout) => (
        workoutSum + (workout.elevationM ?? workout.elevation_m ?? 0)
      ), daySum)
    ), sum)
  ), 0);
  const quality = weeks.reduce((sum, week) => (
    (week?.days ?? []).reduce((daySum, day) => (
      (day?.workouts ?? []).reduce((workoutSum, workout) => {
        const isQuality = (workout.type && /workout|tempo|threshold|interval|race/i.test(workout.type))
          || /^Z[345]$/.test(workout.primaryZone ?? "");
        return workoutSum + (isQuality ? 1 : 0);
      }, daySum)
    ), sum)
  ), 0);
  const daysLeft = race.date ? Math.max(0, Math.round((new Date(race.date) - today) / 86400000)) : null;

  return {
    totalWeeks: weeks.length || 13,
    daysLeft,
    totalKm: Math.round(totalKm),
    totalElev: Math.round(totalElev),
    quality,
  };
}

export default function SeasonPlanCard() {
  const { hierarchicalPlan } = useAppData();
  const [mode, setMode] = useState("Faser");

  const race = useMemo(() => extractRaceMeta(hierarchicalPlan), [hierarchicalPlan]);
  const kpis = useMemo(() => computeKpis(hierarchicalPlan), [hierarchicalPlan]);

  const metaLine = [
    race.date ? formatLongDate(race.date) : null,
    race.distance ? `${race.distance} km` : null,
    race.elevation ? `+${race.elevation} m` : null,
    race.location,
  ].filter(Boolean).join(" · ");

  return (
    <section className="season-plan" data-testid="season-plan-card">
      <div className="season-head">
        <div className="title-wrap">
          <span className="cc-label">SESONGPLAN · {kpis.totalWeeks} UKER</span>
          <h2>{race.name}</h2>
          {metaLine && <span className="season-meta">{metaLine}</span>}
        </div>
        <Segmented options={["Faser", "Uker", "Dager"]} value={mode} onChange={setMode} />
      </div>

      <PhaseRibbon />

      <div className="season-kpis">
        <Metric lbl="DAGER IGJEN" val={kpis.daysLeft ?? "—"} />
        <Metric lbl="PLANLAGT KM" val={kpis.totalKm} unit="km" />
        <Metric lbl="PLANLAGT HØYDE" val={kpis.totalElev} unit="m" />
        <Metric lbl="KVALITETSØKTER" val={kpis.quality} />
      </div>
    </section>
  );
}
