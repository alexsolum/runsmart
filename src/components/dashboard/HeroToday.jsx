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

  const phases = planData.phases ?? planData.blocks ?? [];
  for (const phase of phases) {
    for (const week of phase.weeks ?? []) {
      for (const day of week.days ?? []) {
        const d = day.date ?? day.workout_date ?? "";
        if (d === today) return { ...day, phaseName: phase.name ?? phase.type ?? "Base" };
      }
    }
  }

  // fallback: flat days array
  for (const day of planData.days ?? []) {
    if ((day.date ?? day.workout_date ?? "") === today) return day;
  }
  return null;
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

  const kind = workout ? phaseKind(workout.phaseName ?? workout.workout_type ?? workout.type ?? "") : "ghost";
  const phaseLabel = workout?.phaseName ?? "Gjenoppbygging";
  const workoutTitle = workout?.workout_name ?? workout?.name ?? workout?.description ?? "Ingen økt planlagt";
  const workoutSub = workout?.notes ?? workout?.details ?? "Sjekk treningsplanen for detaljer.";

  const targets = useMemo(() => {
    if (!workout) return [];
    const t = [];
    if (workout.distance_km) t.push({ lbl: "Distanse", val: workout.distance_km, unit: "km", sub: "" });
    if (workout.duration_min) t.push({ lbl: "Varighet", val: workout.duration_min, unit: "min", sub: "" });
    if (workout.pace_target) t.push({ lbl: "Mål-tempo", val: workout.pace_target, unit: "/km", sub: "" });
    if (workout.hr_target ?? workout.heart_rate_target) {
      t.push({ lbl: "Mål-puls", val: workout.hr_target ?? workout.heart_rate_target, unit: "bpm", sub: "" });
    }
    return t;
  }, [workout]);

  return (
    <div className="today">
        <div className="flex center between">
          <div className="flex center gap-8">
            <Chip kind={kind}>
              <span className="dot" style={{ background: "currentColor" }} /> {phaseLabel.toUpperCase()}
            </Chip>
            <span className="date-row">
              <span style={{ color: "#7aa9ef" }}>●</span> {dateStr} · {timeStr}
            </span>
          </div>
          <div className="flex center gap-8" style={{ color: "#aab4c6", fontSize: 12 }}>
            <Icon name="sparkle" size={13} /> Generert av Trener
          </div>
        </div>

        <div>
          <span className="cc-label" style={{ color: "#7aa9ef" }}>I dag</span>
          <h1>{workoutTitle}</h1>
          <p className="subtitle">{workoutSub}</p>
        </div>

        {targets.length > 0 && (
          <div className="target-grid">
            {targets.map((t, i) => (
              <div key={i} className="target">
                <div className="lbl">{t.lbl}</div>
                <div className="val">
                  {t.val}
                  {t.unit && <span style={{ fontSize: 13, color: "#aab4c6", marginLeft: 4 }}>{t.unit}</span>}
                </div>
                {t.sub && <div className="sub">{t.sub}</div>}
              </div>
            ))}
          </div>
        )}

        <div className="cta-row">
          <button className="btn primary"><Icon name="play" size={13} /> Start økten</button>
          <button className="btn ghost" style={{ color: "#aab4c6" }}>Flytt til i morgen</button>
        </div>
    </div>
  );
}
