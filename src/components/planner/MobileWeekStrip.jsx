import { ChevronLeft, ChevronRight } from "lucide-react";
import { getIsoWeekNumber, weekDays } from "../../lib/dateUtils";

const DAY_INITIALS = ["M", "T", "O", "T", "F", "L", "S"];

export function MobileWeekStrip({ weekStart, selectedDay, onSelectDay, onPrev, onNext }) {
  const days = weekDays(weekStart);
  const weekNum = getIsoWeekNumber(weekStart);

  return (
    <div>
      <div className="flex items-center justify-between px-4 py-2">
        <button type="button" onClick={onPrev} aria-label="Previous week">
          <ChevronLeft size={20} style={{ color: "var(--pa-on-surface)" }} />
        </button>
        <span
          style={{
            fontSize: "var(--pa-text-body-md)",
            fontFamily: "var(--pa-font-display)",
            fontWeight: 700,
            color: "var(--pa-on-surface)",
          }}
        >
          Uke {weekNum}
        </span>
        <button type="button" onClick={onNext} aria-label="Next week">
          <ChevronRight size={20} style={{ color: "var(--pa-on-surface)" }} />
        </button>
      </div>

      <div className="flex justify-between px-4" style={{ gap: "var(--pa-space-1)" }}>
        {days.map((iso, index) => {
          const isSelected = iso === selectedDay;
          const dayNum = new Date(`${iso}T00:00:00Z`).getUTCDate();

          return (
            <button
              key={iso}
              type="button"
              onClick={() => onSelectDay(iso)}
              className="flex flex-1 flex-col items-center justify-center"
              style={{
                minHeight: "44px",
                borderRadius: "var(--pa-radius-card)",
                background: isSelected ? "var(--pa-primary)" : "var(--pa-surface-container-low)",
                color: isSelected ? "var(--pa-on-primary)" : "var(--pa-on-surface)",
                transition: "background 150ms ease, color 150ms ease",
              }}
            >
              <span
                style={{
                  fontSize: "var(--pa-text-label-sm)",
                  fontFamily: "var(--pa-font-body)",
                  fontWeight: 700,
                }}
              >
                {DAY_INITIALS[index]}
              </span>
              <span
                style={{
                  fontSize: "var(--pa-text-label-sm)",
                  fontFamily: "var(--pa-font-body)",
                  fontWeight: 400,
                }}
              >
                {dayNum}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
