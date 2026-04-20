import { generateCoachingInsights } from "../../domain/compute";

export function localTodayIso(now = new Date()) {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function activityIso(activity) {
  const raw =
    activity?.started_at ??
    activity?.start_date_local ??
    activity?.start_date ??
    activity?.date ??
    activity?.activity_date ??
    null;

  if (!raw) return null;
  return String(raw).slice(0, 10);
}

export function deriveCurrentWeek(weeks, todayIso = localTodayIso()) {
  const allWeeks = Array.isArray(weeks) ? weeks : [];
  if (allWeeks.length === 0) return null;

  return (
    allWeeks.find((week) => week?.startDate <= todayIso && week?.endDate >= todayIso) ??
    allWeeks.find((week) => week?.endDate >= todayIso) ??
    allWeeks[allWeeks.length - 1]
  );
}

export function deriveNextFourWeeks(weeks, currentWeekNumber) {
  const allWeeks = Array.isArray(weeks) ? weeks : [];
  const forwardWeeks = allWeeks.filter((week) => week?.weekNumber > currentWeekNumber);

  if (forwardWeeks.length >= 4) {
    return forwardWeeks.slice(0, 4);
  }

  return allWeeks
    .filter((week) => week?.weekNumber !== currentWeekNumber)
    .slice(-4);
}

export function deriveWeekDaysWithStatus(week, activities, todayIso = localTodayIso()) {
  const activityMap = new Map();

  (Array.isArray(activities) ? activities : []).forEach((activity) => {
    const iso = activityIso(activity);
    if (!iso) return;

    const existing = activityMap.get(iso) ?? [];
    existing.push(activity);
    activityMap.set(iso, existing);
  });

  return (week?.days ?? []).map((day) => {
    const workouts = day?.workouts ?? [];
    const executed = activityMap.get(day.date) ?? [];
    const plannedCount = workouts.length;
    const completedInPlan = workouts.filter((workout) => workout?.completed).length;
    const completedCount = Math.max(
      completedInPlan,
      Math.min(plannedCount || executed.length, executed.length),
    );

    let status = "planned";
    if (plannedCount === 0 && executed.length > 0) status = "completed";
    else if (plannedCount > 0 && completedCount >= plannedCount) status = "completed";
    else if (completedCount > 0 || executed.length > 0) status = "partial";
    else if (day?.date < todayIso) status = "missed";

    return {
      ...day,
      executed,
      plannedCount,
      completedCount,
      status,
      isToday: day?.date === todayIso,
    };
  });
}

export function deriveCoachNotes({ activities, checkins, plans }) {
  return generateCoachingInsights({
    activities: Array.isArray(activities) ? activities : [],
    checkins: Array.isArray(checkins) ? checkins : [],
    plans: Array.isArray(plans) ? plans : [],
  })
    .filter((note) => note?.titleKey !== "coach.getStarted")
    .slice(0, 3);
}

export function buildPlanPageModel({ planData, activities, checkins, plans, todayIso = localTodayIso() }) {
  const weeks = planData?.weeks ?? [];
  const currentWeek = deriveCurrentWeek(weeks, todayIso);
  const currentWeekDays = currentWeek
    ? deriveWeekDaysWithStatus(currentWeek, activities, todayIso)
    : [];

  return {
    currentWeek,
    currentWeekDays,
    nextFourWeeks: deriveNextFourWeeks(weeks, currentWeek?.weekNumber ?? 0),
    coachNotes: deriveCoachNotes({ activities, checkins, plans }),
    todayIso,
  };
}
