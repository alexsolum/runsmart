import React, { useEffect, useMemo, useRef, useState } from "react";
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
  if (normalized.includes("base")) return "var(--phase-base, #6B7A5A)";
  if (normalized.includes("build")) return "var(--phase-build, #8B6F3F)";
  if (normalized.includes("peak")) return "var(--phase-peak, #B03A2E)";
  if (normalized.includes("taper")) return "var(--phase-taper, #4A5E6B)";
  return "var(--phase-recovery, #7C6F8A)";
}

export function PlanViewer({ planData, onWorkoutSelect, todayIso, initialMobile, ribbonLayout = false }) {
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

  // Ribbon mode: single continuous horizontal scroll across all phases
  if (ribbonLayout) {
    return (
      <div className="space-y-4">
        <PhaseTimeline
          phases={phases}
          activeWeekNumber={currentWeekNumber}
          isMobile={isMobile}
        />
        <div className="overflow-x-auto pb-2 -mx-1 px-1">
          <div className="flex gap-0 min-w-max items-start">
            {groupedPhases.map((phase, phaseIdx) => {
              const phaseColor = phaseColorFor(phase.name);
              const dateRange = phase.weeks.length > 0
                ? `${dateLabel(phase.weeks[0].startDate)}–${dateLabel(phase.weeks[phase.weeks.length - 1].endDate)}`
                : null;
              return (
                <React.Fragment key={phaseSectionId(phase)}>
                  {phaseIdx > 0 && (
                    <div
                      className="self-stretch mx-3 w-px shrink-0"
                      style={{ background: phaseColor, opacity: 0.25, minHeight: 40 }}
                    />
                  )}
                  <div className="flex flex-col gap-2">
                    {/* Phase label header */}
                    <div className="flex items-center gap-2 px-1">
                      <span
                        className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-white shrink-0"
                        style={{ background: phaseColor }}
                      >
                        {phase.name}
                      </span>
                      {dateRange && (
                        <span
                          className="text-[10px] whitespace-nowrap"
                          style={{ fontFamily: "var(--font-family-mono)", color: "var(--ink-muted)" }}
                        >
                          {dateRange}
                        </span>
                      )}
                    </div>
                    {/* Weeks row */}
                    <div className="flex gap-4">
                      {phase.weeks.map((week) => (
                        <div key={week.weekNumber} className="min-w-[280px] shrink-0">
                          <PlanWeekCard
                            week={week}
                            phaseColor={phaseColor}
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
                              if (node) weekRefs.current.set(week.weekNumber, node);
                              else weekRefs.current.delete(week.weekNumber);
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // Vertical mode: phase accordion
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
              <div className="rounded-[var(--radius-xl,20px)] p-4" style={{ background: "var(--paper-raised,#FAF7F1)", boxShadow: "var(--shadow-sm,0 2px 8px rgba(11,23,56,0.04))" }}>
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
