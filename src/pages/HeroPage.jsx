import HeroToday from "../components/dashboard/HeroToday";
import ReadinessPanel from "../components/dashboard/ReadinessPanel";
import PhaseRibbon from "../components/dashboard/PhaseRibbon";
import WeeklyProgression from "../components/dashboard/WeeklyProgression";
import RaceCountdown from "../components/dashboard/RaceCountdown";
import FitnessPanel from "../components/dashboard/FitnessPanel";
import EfficiencyPanel from "../components/dashboard/EfficiencyPanel";
import RecentActivities from "../components/dashboard/RecentActivities";
import UpNext from "../components/dashboard/UpNext";

export default function HeroPage() {
  return (
    <div className="canvas">
      {/* Hero row: today workout + readiness side-by-side */}
      <div className="hero" style={{ gridColumn: "span 12" }}>
        <HeroToday />
        <ReadinessPanel />
      </div>

      {/* Phase ribbon: full width */}
      <PhaseRibbon />

      {/* Weekly progression (8) + race countdown (4) */}
      <WeeklyProgression />
      <RaceCountdown />

      {/* Fitness curve (8) + recent activities (4) */}
      <FitnessPanel />
      <RecentActivities />

      {/* Efficiency scatter (8) + upcoming sessions (4) */}
      <EfficiencyPanel />
      <UpNext />
    </div>
  );
}
