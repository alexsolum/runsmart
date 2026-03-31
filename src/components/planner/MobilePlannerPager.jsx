import { useEffect, useMemo, useRef, useState } from "react";
import { currentMondayIso, getWeekIntent, isoDateOffset, todayIso } from "../../lib/dateUtils";
import { MobileDayPanel } from "./MobileDayPanel";
import { MobileLoadSummary } from "./MobileLoadSummary";
import { MobileWeekStrip } from "./MobileWeekStrip";

export function MobilePlannerPager({
  entries = [],
  loading,
  loadEntriesForRange,
  planId,
  blocks = [],
  onEdit,
  onToggleCompleted,
  onCreateForDate,
}) {
  const [weekStart, setWeekStart] = useState(() => currentMondayIso());
  const [selectedDay, setSelectedDay] = useState(() => todayIso());
  const touchStart = useRef(null);

  useEffect(() => {
    if (!planId || !weekStart) return;
    const weekEnd = isoDateOffset(weekStart, 6);
    loadEntriesForRange(planId, weekStart, weekEnd).catch(() => {});
  }, [loadEntriesForRange, planId, weekStart]);

  const weekEntries = useMemo(() => {
    const weekEnd = isoDateOffset(weekStart, 6);
    return entries.filter((entry) => entry.workout_date >= weekStart && entry.workout_date <= weekEnd);
  }, [entries, weekStart]);

  const dayEntries = useMemo(
    () => weekEntries.filter((entry) => entry.workout_date === selectedDay),
    [selectedDay, weekEntries],
  );

  const intent = useMemo(
    () => getWeekIntent(blocks, planId, weekStart),
    [blocks, planId, weekStart],
  );

  const goNext = () => {
    const next = isoDateOffset(weekStart, 7);
    setWeekStart(next);
    setSelectedDay(next);
  };

  const goPrev = () => {
    const prev = isoDateOffset(weekStart, -7);
    setWeekStart(prev);
    setSelectedDay(prev);
  };

  const onTouchStart = (event) => {
    touchStart.current = {
      x: event.touches[0].clientX,
      y: event.touches[0].clientY,
    };
  };

  const onTouchEnd = (event) => {
    if (!touchStart.current) return;
    const deltaX = event.changedTouches[0].clientX - touchStart.current.x;
    const deltaY = event.changedTouches[0].clientY - touchStart.current.y;
    touchStart.current = null;

    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
      if (deltaX < 0) goNext();
      else goPrev();
    }
  };

  return (
    <div
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      style={{ background: "var(--pa-surface)", opacity: loading ? 0.8 : 1 }}
    >
      <MobileWeekStrip
        weekStart={weekStart}
        selectedDay={selectedDay}
        onSelectDay={setSelectedDay}
        onPrev={goPrev}
        onNext={goNext}
      />
      <MobileLoadSummary entries={weekEntries} targetKm={intent?.targetMileageKm ?? null} />
      <MobileDayPanel
        isoDate={selectedDay}
        entries={dayEntries}
        onEdit={onEdit}
        onToggleCompleted={onToggleCompleted}
      />
    </div>
  );
}
