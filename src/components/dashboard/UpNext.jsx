import { useMemo } from "react";
import { useAppData } from "../../context/AppDataContext";
import PanelHead from "../ui/PanelHead";
import Chip from "../ui/Chip";

const NO_DAYS_SHORT = ["søn", "man", "tir", "ons", "tor", "fre", "lør"];
const NO_MONTHS_SHORT = ["jan", "feb", "mar", "apr", "mai", "jun", "jul", "aug", "sep", "okt", "nov", "des"];

function formatShort(iso) {
  const d = new Date(iso);
  return `${NO_DAYS_SHORT[d.getDay()]} ${d.getDate()} ${NO_MONTHS_SHORT[d.getMonth()]}`;
}

function workoutKind(day) {
  const wt = (day.workout_type ?? day.type ?? "").toLowerCase();
  const name = (day.workout_name ?? day.name ?? day.description ?? "").toLowerCase();
  if (wt.includes("race")) return "race";
  if (wt.includes("long") || name.includes("lang") || name.includes("long")) return "build";
  if (wt.includes("interval") || name.includes("interval") || wt.includes("quality")) return "build";
  if (wt.includes("recovery") || name.includes("recovery") || name.includes("rolig") || wt.includes("easy")) return "recovery";
  return "ghost";
}

function workoutSubLabel(day) {
  const parts = [];
  if (day.duration_min) parts.push(`${day.duration_min} min`);
  if (day.distance_km) parts.push(`${day.distance_km} km`);
  if (day.description && parts.length === 0) parts.push(day.description.slice(0, 40));
  return parts.join(" · ");
}

export default function UpNext() {
  const { hierarchicalPlan } = useAppData();
  const planData = hierarchicalPlan?.plan?.plan_data;

  const upcoming = useMemo(() => {
    if (!planData) return [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split("T")[0];
    const results = [];

    const phases = planData.phases ?? planData.blocks ?? [];
    for (const phase of phases) {
      for (const week of phase.weeks ?? []) {
        for (const day of week.days ?? []) {
          const d = day.date ?? day.workout_date ?? "";
          if (d > todayStr) {
            results.push({ ...day, date: d, phaseName: phase.name ?? phase.type });
          }
        }
      }
    }

    // flat days fallback
    for (const day of planData.days ?? []) {
      const d = day.date ?? day.workout_date ?? "";
      if (d > todayStr) results.push({ ...day, date: d });
    }

    return results
      .sort((a, b) => (a.date > b.date ? 1 : -1))
      .slice(0, 5);
  }, [planData]);

  return (
    <div className="panel col-4">
      <PanelHead
        eyebrow="Neste 5 dager"
        title="Kommende økter"
      />

      {upcoming.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {upcoming.map((w, i) => {
            const kind = workoutKind(w);
            const title = w.workout_name ?? w.name ?? w.description ?? "Økt";
            const sub = workoutSubLabel(w);
            const isQuality = kind === "build" || kind === "peak";

            return (
              <div
                key={i}
                style={{
                  display: "grid",
                  gridTemplateColumns: "70px 1fr auto",
                  gap: 12,
                  alignItems: "center",
                  padding: "10px 12px",
                  background: isQuality
                    ? "linear-gradient(90deg, rgba(0,73,156,.06), transparent)"
                    : "var(--surface-low)",
                  borderRadius: 10,
                }}
              >
                <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, color: "var(--ink-muted)" }}>
                  {formatShort(w.date)}
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13, color: "var(--ink-strong)" }}>{title}</div>
                  {sub && <div style={{ fontSize: 11.5, color: "var(--ink-muted)" }}>{sub}</div>}
                </div>
                <Chip kind={kind}>{kind}</Chip>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="empty-hint">Ingen kommende økter planlagt.</div>
      )}
    </div>
  );
}
