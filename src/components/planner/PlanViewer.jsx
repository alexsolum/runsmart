import { useEffect, useMemo, useRef, useState } from "react";
import { PhaseTimeline } from "./PhaseTimeline";
import { PlanWeekCard } from "./PlanWeekCard";

function phaseSectionId(phase) {
  return `phase-${String(phase.name ?? "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${phase.startWeek}-${phase.endWeek}`;
}

function dateLabel(isoDate) {
  return new Date(`${isoDate}T00:00:00Z`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function detectMobile(initialMobile) {
  if (typeof initialMobile === "boolean") return initialMobile;
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return window.matchMedia("(max-width: 600px)").matches;
}

function phaseColorFor(name) {
  const normalized = String(name ?? "").toLowerCase();
  if (normalized.includes("base")) return "var(--pa-brand-sky, #3b82f6)";
  if (normalized.includes("build")) return "var(--pa-brand-blue, #2563eb)";
  if (normalized.includes("peak")) return "var(--pa-brand-plum, #7c3aed)";
  if (normalized.includes("taper")) return "var(--pa-brand-amber, #d97706)";
  return "var(--pa-brand-green, #16a34a)";
}

export function PlanViewer({ planData, onWorkoutSelect, todayIso, initialMobile }) {
  const [isMobile, setIsMobile] = useState(() => detectMobile(initialMobile));
  const [expandedPhases, setExpandedPhases] = useState({});
  const didAutoScrollRef = useRef(false);
  const weekRefs = useRef(new Map());

  const phases = useMemo(() => planData?.phases ?? [], [planData?.phases]);
  const weeks = useMemo(() => planData?.weeks ?? [], [planData?.weeks]);
  const effectiveTodayIso = todayIso ?? new Date().toISOString().split("T")[0];

  useEffect(() => {
    if (typeof initialMobile === "boolean") return undefined;
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return undefined;

    const media = window.matchMedia("(max-width: 600px)");
    const handleChange = (event) => setIsMobile(event.matches);
    setIsMobile(media.matches);
    media.addEventListener?.("change", handleChange);
    return () => media.removeEventListener?.("change", handleChange);
  }, [initialMobile]);

  const currentWeekNumber = useMemo(() => {
    const currentWeek = weeks.find((week) => week?.endDate >= effectiveTodayIso);
    return currentWeek?.weekNumber ?? weeks[0]?.weekNumber ?? 1;
  }, [effectiveTodayIso, weeks]);

  const groupedPhases = useMemo(
    () =>
      phases.map((phase) => ({
        ...phase,
        weeks: weeks.filter(
          (week) => week.weekNumber >= phase.startWeek && week.weekNumber <= phase.endWeek,
        ),
      })),
    [phases, weeks],
  );

  useEffect(() => {
    const defaults = {};
    groupedPhases.forEach((phase) => {
      defaults[phaseSectionId(phase)] = !(phase.endWeek < currentWeekNumber);
    });
    setExpandedPhases(defaults);
  }, [currentWeekNumber, groupedPhases]);

  useEffect(() => {
    if (didAutoScrollRef.current) return;
    const currentIndex = weeks.findIndex((week) => week.weekNumber === currentWeekNumber);
    if (currentIndex > 1) {
      weekRefs.current.get(currentWeekNumber)?.scrollIntoView({ block: "start", behavior: "auto" });
      didAutoScrollRef.current = true;
    }
  }, [currentWeekNumber, weeks]);

  return (
    <div className="space-y-6">
      <PhaseTimeline
        phases={phases}
        activeWeekNumber={currentWeekNumber}
        isMobile={isMobile}
      />

      <div className="space-y-6">
        {groupedPhases.map((phase) => {
          const sectionId = phaseSectionId(phase);
          const isPastPhase = phase.endWeek < currentWeekNumber;
          const isExpanded = expandedPhases[sectionId] ?? !isPastPhase;
          const dateRange = phase.weeks.length > 0
            ? `${dateLabel(phase.weeks[0].startDate)} - ${dateLabel(phase.weeks[phase.weeks.length - 1].endDate)}`
            : null;

          return (
            <section
              key={sectionId}
              id={sectionId}
              data-testid={`phase-section-${sectionId.replace(/^phase-/, "")}`}
              className="space-y-4"
            >
              <div className="rounded-[28px] bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className="rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-white"
                        style={{ background: phaseColorFor(phase.name) }}
                      >
                        {phase.name}
                      </span>
                      <span className="text-sm font-semibold text-slate-700">
                        Weeks {phase.startWeek}-{phase.endWeek}
                      </span>
                    </div>
                    {dateRange ? (
                      <p className="mt-2 text-sm text-slate-500">{dateRange}</p>
                    ) : null}
                    {isExpanded ? (
                      <p className="mt-2 text-sm text-slate-600">{phase.focus}</p>
                    ) : null}
                  </div>

                  {isPastPhase ? (
                    <button
                      type="button"
                      className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700"
                      onClick={() =>
                        setExpandedPhases((current) => ({
                          ...current,
                          [sectionId]: !isExpanded,
                        }))
                      }
                    >
                      {isExpanded ? `Collapse ${phase.name}` : `Expand ${phase.name}`}
                    </button>
                  ) : null}
                </div>
              </div>

              {isExpanded ? (
                <div className="space-y-4">
                  {phase.weeks.map((week) => (
                    <PlanWeekCard
                      key={week.weekNumber}
                      week={week}
                      phaseColor={phaseColorFor(phase.name)}
                      isMobile={isMobile}
                      onWorkoutSelect={(workout, meta) => {
                        const dayDate = meta?.day?.date ?? null;
                        const dayLabel = meta?.day?.dayOfWeek && dayDate
                          ? `${meta.day.dayOfWeek} ${dateLabel(dayDate)}`
                          : meta?.day?.dayOfWeek ?? null;

                        onWorkoutSelect?.({
                          phaseName: phase.name,
                          weekNumber: meta?.week?.weekNumber ?? null,
                          dayDate,
                          dayLabel,
                          workout,
                        });
                      }}
                      weekRef={(node) => {
                        if (node) {
                          weekRefs.current.set(week.weekNumber, node);
                        } else {
                          weekRefs.current.delete(week.weekNumber);
                        }
                      }}
                    />
                  ))}
                </div>
              ) : null}
            </section>
          );
        })}
      </div>
    </div>
  );
}
