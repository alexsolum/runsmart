// Shared UTC-safe date utilities for planner components

export function currentMondayIso() {
  const d = new Date();
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() - day + 1);
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString().split("T")[0];
}

export function isoDateOffset(isoDate, days) {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().split("T")[0];
}

export function weekDays(weekStartIso) {
  return Array.from({ length: 7 }, (_, index) => isoDateOffset(weekStartIso, index));
}

export function todayIso() {
  return new Date().toISOString().split("T")[0];
}

export function formatDayLabel(isoDate) {
  const date = new Date(`${isoDate}T00:00:00Z`);
  const day = date.getUTCDate();
  const month = date.toLocaleDateString("nb-NO", { month: "short" })
    .replace(".", "")
    .toUpperCase();
  return `${day}. ${month}`;
}

export function getIsoWeekNumber(isoDate) {
  const date = new Date(`${isoDate}T00:00:00Z`);
  const jan4 = new Date(Date.UTC(date.getUTCFullYear(), 0, 4));
  const dayOfYear = Math.floor((date - jan4) / 86400000) + 1;
  const jan4Day = jan4.getUTCDay() || 7;
  return Math.ceil((dayOfYear + jan4Day - 1) / 7);
}

export function getWeekIntent(blocks, planId, weekStartIso) {
  const weekEndIso = isoDateOffset(weekStartIso, 6);
  const matchingBlock = (blocks ?? []).find(
    (block) =>
      block.plan_id === planId &&
      block.start_date <= weekEndIso &&
      block.end_date >= weekStartIso,
  );

  if (!matchingBlock) return null;

  return {
    weekStart: weekStartIso,
    weekEnd: weekEndIso,
    trainingType: matchingBlock.phase ?? null,
    targetMileageKm: matchingBlock.target_km ?? null,
    notes: matchingBlock.notes ?? null,
  };
}

