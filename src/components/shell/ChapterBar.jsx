import React, { useMemo } from "react";
import { Menu } from "lucide-react";
import { useAppData } from "../../context/AppDataContext";

const CHAPTER_MAP = {
  intelligence: { num: "01", label: "INTELLIGENCE" },
  "training-plan": { num: "02", label: "PLAN" },
  insights: { num: "03", label: "TRENDS" },
  races: { num: "04", label: "RACES" },
  "daily-log": { num: "05", label: "LOG" },
  data: { num: "06", label: "DATA" },
  roadmap: { num: "07", label: "ROADMAP" },
  mobile: { num: "08", label: "MOBILE" },
};

function useRaceCountdown(races) {
  return useMemo(() => {
    const upcoming = (races ?? [])
      .filter((r) => r.status !== "completed" && r.race_date)
      .sort((a, b) => new Date(a.race_date) - new Date(b.race_date));
    if (!upcoming.length) return null;
    const next = upcoming[0];
    const days = Math.ceil((new Date(next.race_date) - new Date()) / 86400000);
    return { name: next.name || next.race_name || "Race", days };
  }, [races]);
}

function useTrainingWeek(plans) {
  return useMemo(() => {
    const plan = plans?.[0];
    if (!plan?.start_date) return null;
    const weeks = Math.floor((Date.now() - new Date(plan.start_date)) / 604800000) + 1;
    return weeks > 0 ? weeks : null;
  }, [plans]);
}

export default function ChapterBar({ activePage, onMenuToggle }) {
  const { races, plans } = useAppData();
  const chapter = CHAPTER_MAP[activePage] ?? { num: "01", label: "INTELLIGENCE" };
  const countdown = useRaceCountdown(races?.races);
  const weekNum = useTrainingWeek(plans?.plans);

  return (
    <header className="chapter-bar">
      {/* Mobile hamburger */}
      <button
        type="button"
        className="chapter-bar__menu-btn lg:hidden"
        onClick={onMenuToggle}
        aria-label="Toggle navigation"
      >
        <Menu size={16} />
      </button>

      {/* Chapter marker */}
      <div className="chapter-bar__marker">
        <span className="chapter-bar__ch">CH. {chapter.num}</span>
        <span className="chapter-bar__sep">·</span>
        <span className="chapter-bar__label">{chapter.label}</span>
        {weekNum && (
          <>
            <span className="chapter-bar__sep">/</span>
            <span className="chapter-bar__meta">WK {weekNum}</span>
          </>
        )}
        {countdown && (
          <>
            <span className="chapter-bar__sep">/</span>
            <span className="chapter-bar__race">
              {countdown.days}D → {countdown.name}
            </span>
          </>
        )}
      </div>
    </header>
  );
}
