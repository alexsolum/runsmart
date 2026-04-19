import { useMemo } from "react";
import { useAppData } from "../../context/AppDataContext";
import Chip from "../ui/Chip";
import Icon from "../shell/Icon";

function todayISODate() {
  return new Date().toISOString().split("T")[0];
}

function extractTodayWorkout(planData) {
  if (!planData) return null;
  const today = todayISODate();
  let fallbackWorkout = null;

  for (const week of planData.weeks ?? []) {
    for (const day of week.days ?? []) {
      const d = day.date ?? day.workout_date ?? "";
      if (!fallbackWorkout && day.workouts?.[0]) {
        fallbackWorkout = { ...day.workouts[0], phaseName: week.phase ?? "Base" };
      }
      if (d === today) {
        const workout = (day.workouts && day.workouts[0]) || day;
        return { ...workout, phaseName: week.phase ?? "Base" };
      }
    }
  }

  const phases = planData.phases ?? planData.blocks ?? [];
  for (const phase of phases) {
    for (const week of phase.weeks ?? []) {
      for (const day of week.days ?? []) {
        const d = day.date ?? day.workout_date ?? "";
        if (!fallbackWorkout && day.workouts?.[0]) {
          fallbackWorkout = { ...day.workouts[0], phaseName: phase.name ?? phase.type ?? "Base" };
        }
        if (d === today) return { ...(day.workouts?.[0] || day), phaseName: phase.name ?? phase.type ?? "Base" };
      }
    }
  }

  for (const day of planData.days ?? []) {
    if ((day.date ?? day.workout_date ?? "") === today) return day;
    if (!fallbackWorkout && (day.workouts?.[0] || day.name || day.workout_name)) {
      fallbackWorkout = day.workouts?.[0] || day;
    }
  }

  return fallbackWorkout;
}

function phaseKind(name = "") {
  const n = name.toLowerCase();
  if (n.includes("recover") || n.includes("easy")) return "recovery";
  if (n.includes("build")) return "build";
  if (n.includes("peak")) return "peak";
  if (n.includes("taper")) return "taper";
  if (n.includes("race")) return "race";
  return "ghost";
}

const NO_DAYS = ["søn", "man", "tir", "ons", "tor", "fre", "lør"];
const NO_MONTHS = ["jan", "feb", "mar", "apr", "mai", "jun", "jul", "aug", "sep", "okt", "nov", "des"];

function formatDateNorwegian(d) {
  return `${NO_DAYS[d.getDay()]} ${d.getDate()}. ${NO_MONTHS[d.getMonth()]}`;
}

export default function HeroToday() {
  const { hierarchicalPlan } = useAppData();
  const planData = hierarchicalPlan?.plan?.plan_data;

  const workout = useMemo(() => extractTodayWorkout(planData), [planData]);
  const now = new Date();
  const dateStr = formatDateNorwegian(now);
  const timeStr = now.toTimeString().slice(0, 5);

  const kind = workout ? phaseKind(workout.phaseName ?? workout.type ?? "") : "ghost";
  const phaseLabel = (workout?.phaseName ?? "Gjenoppbygging").toUpperCase();
  const workoutTitle = workout?.name ?? workout?.workout_name ?? workout?.description ?? "Ingen økt planlagt";
  const workoutSub = workout?.humanReadable ?? workout?.notes ?? workout?.details ?? "Sjekk treningsplanen for detaljer.";

  const targets = useMemo(() => {
    if (!workout) {
      return [
        { lbl: "DISTANSE", val: "—", unit: "" },
        { lbl: "VARIGHET", val: "—", unit: "" },
      ];
    }
    const list = [];
    const distance = workout.distanceKm ?? workout.distance_km;
    const duration = workout.durationMinutes ?? workout.duration_min;
    const hr = workout.hr_target ?? workout.heart_rate_target ?? workout.primaryZone;
    const elev = workout.elevationM ?? workout.elevation_m ?? workout.elevation_gain;
    if (distance) list.push({ lbl: "DISTANSE", val: distance, unit: "km" });
    if (duration) list.push({ lbl: "VARIGHET", val: duration, unit: "min" });
    if (hr) list.push({ lbl: "MAKS HR", val: hr, unit: "" });
    if (elev) list.push({ lbl: "HØYDE", val: elev, unit: "m" });
    return list.length > 0
      ? list
      : [
          { lbl: "DISTANSE", val: "—", unit: "" },
          { lbl: "VARIGHET", val: "—", unit: "" },
        ];
  }, [workout]);

  return (
    <div className="today">
      <div className="flex center between">
        <div className="flex center gap-8">
          <Chip kind={kind}>
            <span className="dot" style={{ background: "currentColor" }} /> {phaseLabel}
          </Chip>
          <span className="date-row">
            <span style={{ color: "#7aa9ef" }}>●</span> {dateStr} · {timeStr}
          </span>
          <span className="weather-pill" aria-label="weather">
            <Icon name="sparkle" size={11} /> JUSTERT FOR VÆR
          </span>
        </div>
        <div className="flex center gap-8" style={{ color: "#aab4c6", fontSize: 12 }}>
          <Icon name="sparkle" size={13} /> Generert av Trener
        </div>
      </div>

      <div>
        <span className="cc-label" style={{ color: "#7aa9ef" }}>I DAG</span>
        <h1>{workoutTitle}</h1>
        <p className="subtitle">{workoutSub}</p>
      </div>

      {targets.length > 0 && (
        <div className="target-grid">
          {targets.map((target, i) => (
            <div key={i} className="target">
              <div className="lbl">{target.lbl}</div>
              <div className="val">
                {target.val}
                {target.unit && <span style={{ fontSize: 13, color: "#aab4c6", marginLeft: 4 }}>{target.unit}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
