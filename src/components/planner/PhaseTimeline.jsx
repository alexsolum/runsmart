function phaseColorFor(name) {
  const normalized = String(name ?? "").toLowerCase();
  if (normalized.includes("base")) return "var(--pa-brand-sky, #3b82f6)";
  if (normalized.includes("build")) return "var(--pa-brand-blue, #2563eb)";
  if (normalized.includes("peak")) return "var(--pa-brand-plum, #7c3aed)";
  if (normalized.includes("taper")) return "var(--pa-brand-amber, #d97706)";
  return "var(--pa-brand-green, #16a34a)";
}

export function PhaseTimeline({ phases = [], activeWeekNumber, isMobile = false }) {
  return (
    <div
      data-testid="phase-timeline"
      data-mobile={isMobile ? "true" : "false"}
      data-overflow-x={isMobile ? "true" : "false"}
      className="sticky top-4 z-20 rounded-[28px] border border-slate-200 bg-white/95 p-3 backdrop-blur overflow-x-auto"
      style={{ position: "sticky" }}
    >
      <div className={`flex gap-2 ${isMobile ? "min-w-max flex-nowrap overflow-x-auto" : "items-stretch"}`}>
        {phases.map((phase) => {
          const sectionId = `phase-${String(phase.name ?? "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${phase.startWeek}-${phase.endWeek}`;
          const weekSpan = Math.max(1, Number(phase.endWeek) - Number(phase.startWeek) + 1);
          const isActive =
            typeof activeWeekNumber === "number" &&
            activeWeekNumber >= phase.startWeek &&
            activeWeekNumber <= phase.endWeek;

          return (
            <button
              key={sectionId}
              type="button"
              onClick={() => document.getElementById(sectionId)?.scrollIntoView({ block: "start", behavior: "smooth" })}
              className="flex min-w-[112px] items-center justify-center rounded-full px-4 py-2 text-sm font-semibold text-white shadow-sm"
              style={{
                flex: isMobile ? "0 0 auto" : weekSpan,
                background: phaseColorFor(phase.name),
                opacity: isActive ? 1 : 0.88,
                boxShadow: isActive ? "0 0 0 2px rgba(15, 23, 42, 0.08) inset" : "none",
              }}
            >
              {phase.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
