import { useMemo } from "react";
import { useAppData } from "../../context/AppDataContext";
import { computeTrainingBlocks } from "../../domain/compute";
import PanelHead from "../ui/PanelHead";
import Segmented from "../ui/Segmented";
import Icon from "../shell/Icon";

const PHASE_KEY = { Base: "base", Build: "build", Peak: "peak", Taper: "taper", Race: "race", Recovery: "recovery" };

export default function PhaseRibbon() {
  const { hierarchicalPlan } = useAppData();
  const plan = hierarchicalPlan?.plan;

  const { blocks, nowPct, totalWeeks, raceLabel, stats } = useMemo(() => {
    if (!plan?.race_date) {
      return { blocks: [], nowPct: 0, totalWeeks: 13, raceLabel: "", stats: {} };
    }

    const blks = computeTrainingBlocks(plan);
    const total = blks.reduce((s, b) => s + b.weeks, 0);
    const today = new Date();
    const raceDate = new Date(plan.race_date);
    const planStart = new Date(today);
    planStart.setDate(planStart.getDate() - (total - Math.ceil((raceDate - today) / (7 * 86400000))) * 7);
    const elapsed = (today - planStart) / (7 * 86400000);
    const pct = Math.min(100, Math.max(0, (elapsed / total) * 100));
    const daysAway = Math.max(0, Math.round((raceDate - today) / 86400000));

    const raceLabel = plan.race_name
      ? `${plan.race_name} · ${raceDate.toLocaleDateString("nb-NO", { day: "numeric", month: "short", year: "numeric" })}`
      : raceDate.toLocaleDateString("nb-NO", { day: "numeric", month: "short", year: "numeric" });

    return {
      blocks: blks,
      nowPct: pct,
      totalWeeks: total,
      raceLabel,
      stats: { daysAway },
    };
  }, [plan]);

  const empty = !plan?.race_date;

  return (
    <div className="panel col-8" style={{ gridColumn: "span 12" }}>
      <PanelHead
        eyebrow={`Sesongplan · ${totalWeeks} uker`}
        title={plan?.goal_race ?? "Mål-løp"}
        sub={raceLabel}
        actions={
          <>
            <Segmented options={["Faser", "Uker", "Dager"]} value="Faser" onChange={() => {}} />
            <button className="btn subtle sm"><Icon name="settings" size={13} /> Juster</button>
          </>
        }
      />

      {empty ? (
        <div className="empty-hint">Ingen plan opprettet enda.</div>
      ) : (
        <div className="phase-ribbon">
          <div className="gantt">
            {blocks.map((b, i) => (
              <div key={i} className={`bar ${PHASE_KEY[b.name] ?? "base"}`} style={{ flex: b.weeks }}>
                {b.name}
                <span className="wk-count">{b.weeks}u</span>
              </div>
            ))}
            <div className="now" style={{ left: `${nowPct}%` }} />
          </div>

          <div className="flex between center" style={{ marginTop: 10 }}>
            <div className="flex gap-14 center">
              <div className="metric" style={{ gap: 2 }}>
                <span className="lbl">Dager igjen</span>
                <div className="val" style={{ fontSize: 22 }}>{stats.daysAway ?? "—"}</div>
              </div>
              <div className="metric" style={{ gap: 2 }}>
                <span className="lbl">Faser</span>
                <div className="val" style={{ fontSize: 22 }}>{blocks.length}</div>
              </div>
              <div className="metric" style={{ gap: 2 }}>
                <span className="lbl">Total uker</span>
                <div className="val" style={{ fontSize: 22 }}>{totalWeeks}</div>
              </div>
            </div>
            <button className="btn ghost">Se full plan <Icon name="chevR" size={13} /></button>
          </div>
        </div>
      )}
    </div>
  );
}
