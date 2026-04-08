import { useEffect, useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  KeyboardSensor,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { Sparkles } from "lucide-react";
import { PlanDayCell } from "./PlanDayCell";
import { PlanWorkoutCard } from "./PlanWorkoutCard";
import { WeekReplanModal } from "./WeekReplanModal";
import { useAppData } from "../../context/AppDataContext";

function formatHours(hours) {
  if (typeof hours !== "number" || Number.isNaN(hours)) return null;
  return `${Number(hours).toFixed(hours % 1 === 0 ? 0 : 1)} hr`;
}

export function PlanWeekCard({ week, phaseColor, isMobile = false, onWorkoutSelect, weekRef }) {
  const { hierarchicalPlan, showToast } = useAppData();
  const [activeWorkout, setActiveWorkout] = useState(null);
  const [dragWidth, setDragWidth] = useState(null);
  const [replanOpen, setReplanOpen] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require 8px drag to start (prevents accidental drags on click)
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const days = useMemo(() => {
    const raw = week?.days ?? [];
    const DOW_ORDER = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };
    return [...raw].sort((a, b) => {
      const key = (day) => {
        if (day.date) {
          const d = new Date(`${day.date}T00:00:00Z`).getUTCDay(); // 0=Sun,1=Mon..6=Sat
          if (!Number.isNaN(d)) return d === 0 ? 7 : d;
        }
        return DOW_ORDER[day.dayOfWeek] ?? 8; // fallback: use dayOfWeek abbreviation
      };
      return key(a) - key(b);
    });
  }, [week?.days]);
  const [mobileDayIndex, setMobileDayIndex] = useState(0);
  const mobileDay = days[mobileDayIndex] ?? null;
  const metricHours = useMemo(() => formatHours(week?.summary?.totalHours), [week?.summary?.totalHours]);

  useEffect(() => {
    setMobileDayIndex(0);
  }, [week?.weekNumber]);

  const handleDragStart = (event) => {
    setActiveWorkout(event.active.data.current.workout);
    setDragWidth(event.active.rect.current?.initial?.width ?? null);
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    setActiveWorkout(null);
    setDragWidth(null);

    if (!over) return;

    const workoutId = active.id;
    const toDate = over.id;
    const fromDate = active.data.current?.dayDate;

    if (!fromDate || fromDate === toDate) return;

    try {
      await hierarchicalPlan.moveWorkout(workoutId, fromDate, toDate);
      
      showToast("Workout rescheduled", {
        action: {
          label: "Undo",
          onClick: () => {
            hierarchicalPlan.moveWorkout(workoutId, toDate, fromDate);
          },
        },
      });
    } catch (err) {
      showToast("Failed to move workout", { type: "destructive" });
    }
  };

  const content = (
    <>
      <div data-testid={`week-grid-${week.weekNumber}`}>
        {isMobile ? (
          <div className="rounded-[24px] bg-white p-3">
            <div className="mb-3 flex items-center justify-between gap-3">
              <button
                type="button"
                className="rounded-full border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-700 disabled:opacity-40"
                onClick={() => setMobileDayIndex((current) => Math.max(0, current - 1))}
                disabled={mobileDayIndex === 0}
              >
                Previous day
              </button>
              <div
                data-testid={`mobile-day-indicator-${week.weekNumber}`}
                className="text-sm font-semibold text-slate-600"
              >
                Day {mobileDayIndex + 1} of {days.length}
              </div>
              <button
                type="button"
                className="rounded-full border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-700 disabled:opacity-40"
                onClick={() => setMobileDayIndex((current) => Math.min(days.length - 1, current + 1))}
                disabled={mobileDayIndex === days.length - 1}
              >
                Next day
              </button>
            </div>

            {mobileDay ? (
              <PlanDayCell
                day={mobileDay}
                week={week}
                onWorkoutSelect={onWorkoutSelect}
              />
            ) : null}
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-3">
            {days.map((day) => (
              <PlanDayCell
                key={day.date}
                day={day}
                week={week}
                onWorkoutSelect={onWorkoutSelect}
              />
            ))}
          </div>
        )}
      </div>

      <DragOverlay>
        {activeWorkout ? (
          <div style={{ width: dragWidth ? `${dragWidth}px` : undefined }}>
            <PlanWorkoutCard workout={activeWorkout} isOverlay />
          </div>
        ) : null}
      </DragOverlay>
    </>
  );

  return (
    <article
      ref={weekRef}
      data-testid={`week-card-${week.weekNumber}`}
      className="rounded-[28px] bg-[var(--pa-surface-container-low)] p-4 shadow-sm"
    >
      <div className="mb-4 rounded-[24px] bg-white px-4 py-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-slate-900">{`Week ${week.weekNumber}`}</span>
              <span
                className="rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-white"
                style={{ background: phaseColor }}
              >
                {week.phase}
              </span>
              <button
                type="button"
                onClick={() => setReplanOpen(true)}
                title="Replan this week with AI coach"
                className="rounded-full p-1 bg-blue-50 hover:bg-blue-100 text-blue-400 hover:text-blue-600 transition-colors"
              >
                <Sparkles size={13} />
              </button>
            </div>
            <p className="mt-2 text-sm text-slate-600">{week.focus}</p>
          </div>

          <div
            data-testid={`week-metrics-${week.weekNumber}`}
            className="flex shrink-0 items-center gap-3 text-sm font-semibold text-slate-700"
          >
            <span>{week.summary?.totalKm ?? 0} km</span>
            <span>{metricHours ?? "0 hr"}</span>
          </div>
        </div>
      </div>

      {!isMobile ? (
        <DndContext 
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          {content}
        </DndContext>
      ) : content}
      <WeekReplanModal
        open={replanOpen}
        onOpenChange={setReplanOpen}
        week={week}
      />
    </article>
  );
}
