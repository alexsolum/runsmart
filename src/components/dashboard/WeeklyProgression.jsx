import { useMemo } from "react";
import { useAppData } from "../../context/AppDataContext";
import { computeWeeklyProgress } from "../../domain/compute";
import PanelHead from "../ui/PanelHead";
import Segmented from "../ui/Segmented";
import PlanVsActualBars from "../charts/PlanVsActualBars";
import Icon from "../shell/Icon";

function isoWeekLabel() {
  const now = new Date();
  const monday = new Date(now);
  const utcDay = monday.getUTCDay();
  monday.setUTCDate(monday.getUTCDate() + (utcDay === 0 ? -6 : 1 - utcDay));
  const sunday = new Date(monday);
  sunday.setUTCDate(sunday.getUTCDate() + 6);
  const fmt = (d) => `${d.getUTCDate()} ${["jan","feb","mar","apr","mai","jun","jul","aug","sep","okt","nov","des"][d.getUTCMonth()]}`;
  const weekNum = Math.ceil((((now - new Date(now.getUTCFullYear(), 0, 1)) / 86400000) + 1) / 7);
  return `Uke ${weekNum} · ${fmt(monday)}–${fmt(sunday)}`;
}

export default function WeeklyProgression() {
  const { activities, workoutEntries } = useAppData();

  const { barData, plannedKm, executedKm } = useMemo(() => {
    const acts = activities?.activities ?? [];
    const entries = workoutEntries?.workoutEntries ?? [];
    const progress = computeWeeklyProgress(acts, entries);
    const days = progress?.days ?? [];

    const barData = days.map((d) => ({
      day: d.day,
      date: d.date,
      planned: d.planKm ?? d.planned ?? 0,
      executed: d.stravaKm ?? d.executed ?? 0,
      isToday: d.isToday ?? false,
    }));

    const plannedKm = barData.reduce((s, d) => s + (d.planned ?? 0), 0);
    const executedKm = barData.reduce((s, d) => s + (d.executed ?? 0), 0);
    const pct = plannedKm > 0 ? Math.round((executedKm / plannedKm) * 100) : 0;

    return { barData, plannedKm: plannedKm.toFixed(1), executedKm: executedKm.toFixed(1), pct };
  }, [activities, workoutEntries]);

  const weekLabel = isoWeekLabel();
  const pct = plannedKm > 0 ? Math.round((executedKm / plannedKm) * 100) : 0;
  const deviation = (executedKm - plannedKm).toFixed(1);

  return (
    <div className="panel col-8">
      <PanelHead
        eyebrow={weekLabel}
        title="Ukens progresjon"
        sub={`Planlagt vs gjennomført · mål ${plannedKm} km · denne uken ${executedKm} km (${pct}%)`}
        actions={
          <>
            <Segmented options={["Uke", "Måned", "Kvartal"]} value="Uke" onChange={() => {}} />
            <button className="btn subtle sm"><Icon name="share" size={13} /> Eksport</button>
          </>
        }
      />

      {barData.length > 0 ? (
        <>
          <PlanVsActualBars data={barData} />
          <div className="legend">
            <span className="sw planned">Planlagt</span>
            <span className="sw actual">Gjennomført</span>
            <span className="sw">
              <span style={{ width: 10, height: 10, borderRadius: 2, background: "#0e1a2d", display: "inline-block", marginRight: 2 }} />
              I dag
            </span>
            <span className="muted" style={{ marginLeft: "auto" }}>
              Avvik {Number(deviation) >= 0 ? "+" : ""}{deviation}km
            </span>
          </div>
        </>
      ) : (
        <div className="empty-hint">Ingen aktiviteter denne uken. Koble Strava i Data.</div>
      )}
    </div>
  );
}
