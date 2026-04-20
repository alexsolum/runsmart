import { useMemo } from "react";
import { useAppData } from "../../context/AppDataContext";
import { computeTrainingBlocks } from "../../domain/compute";

const PHASE_KEY = { Base: "base", Build: "build", Peak: "peak", Taper: "taper", Race: "race", Recovery: "recovery" };

function deriveFlatPlan(hierarchicalPlan) {
  const plan = hierarchicalPlan?.plan;
  if (!plan) return null;
  if (plan.race_date) return plan;

  const goal = plan.plan_data?.raceGoal;
  if (!goal?.eventDate) return null;

  return {
    race_date: goal.eventDate,
    race_name: goal.eventName,
    current_mileage: plan.current_mileage ?? 50,
    b2b_long_runs: plan.b2b_long_runs ?? false,
  };
}

export default function PhaseRibbon() {
  const { hierarchicalPlan } = useAppData();

  const { blocks, nowPct } = useMemo(() => {
    const flatPlan = deriveFlatPlan(hierarchicalPlan);
    if (!flatPlan) return { blocks: [], nowPct: 0 };

    const computedBlocks = computeTrainingBlocks(flatPlan);
    const totalWeeks = computedBlocks.reduce((sum, block) => sum + block.weeks, 0);
    const today = new Date();
    const raceDate = new Date(flatPlan.race_date);
    const planStart = new Date(today);
    planStart.setDate(planStart.getDate() - (totalWeeks - Math.ceil((raceDate - today) / (7 * 86400000))) * 7);
    const elapsed = (today - planStart) / (7 * 86400000);
    const pct = Math.min(100, Math.max(0, (elapsed / totalWeeks) * 100));

    return { blocks: computedBlocks, nowPct: pct };
  }, [hierarchicalPlan]);

  if (!blocks.length) {
    return <div className="empty-hint">Ingen plan opprettet enda.</div>;
  }

  return (
    <div className="phase-ribbon">
      <div className="gantt">
        {blocks.map((block, i) => (
          <div key={i} className={`bar ${PHASE_KEY[block.name] ?? "base"}`} style={{ flex: block.weeks }}>
            {block.name}
            <span className="wk-count">{block.weeks}u</span>
          </div>
        ))}
        <div className="now" style={{ left: `${nowPct}%` }} />
      </div>
    </div>
  );
}
