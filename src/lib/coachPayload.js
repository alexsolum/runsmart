function getWeekStartUtc(date) {
  const d = new Date(date);
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() - day + 1);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function numberOrNull(value) {
  if (value == null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function firstDefined(...values) {
  return values.find((value) => value !== undefined && value !== null);
}

export function normalizeCheckin(checkin) {
  if (!checkin) return null;
  const sleepQuality = numberOrNull(firstDefined(checkin.sleepQuality, checkin.sleep_quality));
  const fatigue = numberOrNull(firstDefined(checkin.fatigue, checkin.fatigue_score));
  const motivation = numberOrNull(firstDefined(checkin.motivation, checkin.motivation_score));
  const recovery = numberOrNull(firstDefined(checkin.recovery, checkin.recovery_score, checkin.recoveryScore));
  const weekOf = firstDefined(checkin.weekOf, checkin.week_of);
  const createdAt = firstDefined(checkin.createdAt, checkin.created_at);
  const niggles = firstDefined(checkin.niggles, checkin.niggle_notes, checkin.niggleNotes);

  return {
    ...checkin,
    fatigue,
    sleepQuality,
    motivation,
    recovery,
    niggles: niggles ?? null,
    sleep_quality: sleepQuality,
    recovery_score: recovery,
    weekOf: weekOf ?? null,
    week_of: weekOf ?? null,
    createdAt: createdAt ?? null,
    created_at: createdAt ?? null,
  };
}

function buildWeeklySummaries(activities) {
  const now = new Date();
  const summaries = [];
  for (let i = 4; i >= 1; i -= 1) {
    const weekStart = getWeekStartUtc(new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000));
    const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);
    const weekActs = activities.filter((activity) => {
      const startedAt = new Date(activity.started_at);
      return startedAt >= weekStart && startedAt < weekEnd;
    });
    const distance = weekActs.reduce((sum, activity) => sum + (Number(activity.distance) || 0) / 1000, 0);
    const distances = weekActs.map((activity) => (Number(activity.distance) || 0) / 1000);
    const longestRun = distances.length ? Math.max(...distances) : 0;
    summaries.push({
      weekOf: weekStart.toISOString().split("T")[0],
      distance,
      runs: weekActs.length,
      longestRun,
    });
  }
  return summaries;
}

function getRecentActivities(activities) {
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  return activities
    .filter((activity) => new Date(activity.started_at) >= cutoff)
    .map((activity) => ({
      name: activity.name || activity.type || "Run",
      distance: (Number(activity.distance) || 0) / 1000,
      duration: activity.moving_time || 0,
      effort: activity.perceived_effort ?? null,
    }));
}

function buildPlanContext(plan, blocks) {
  if (!plan) return null;
  const today = new Date().toISOString().split("T")[0];
  const currentBlock = blocks.find((block) => block.plan_id === plan.id && block.start_date <= today && block.end_date >= today);
  const phase = currentBlock?.phase ?? "Unknown";
  const targetMileage = currentBlock?.target_km ?? plan.current_mileage ?? 0;
  const raceDate = new Date(plan.race_date);
  const todayDate = new Date(today);
  const daysToRace = Math.max(0, Math.ceil((raceDate - todayDate) / (24 * 60 * 60 * 1000)));
  const weekNumber = currentBlock
    ? Math.max(1, Math.ceil((todayDate - new Date(currentBlock.start_date)) / (7 * 24 * 60 * 60 * 1000)))
    : 1;
  return {
    race: plan.race,
    raceDate: plan.race_date,
    goalRaceDate: plan.race_date,
    goal_race_date: plan.race_date,
    phase,
    weekNumber,
    targetMileage,
    daysToRace,
  };
}

function getRecentDailyLogs(logs) {
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  return logs
    .filter((log) => new Date(`${log.log_date}T00:00:00`) >= cutoff)
    .map((log) => ({
      date: log.log_date,
      sleep_hours: log.sleep_hours ?? null,
      sleep_quality: log.sleep_quality ?? null,
      fatigue: log.fatigue ?? null,
      mood: log.mood ?? null,
      stress: log.stress ?? null,
      training_quality: log.training_quality ?? null,
      resting_hr: log.resting_hr ?? null,
      notes: log.notes ?? null,
    }));
}

async function loadFreshActivities(activities) {
  try {
    return (await activities.loadActivities?.({ limit: 20, ascending: false })) ?? activities.activities ?? [];
  } catch {
    return activities.activities ?? [];
  }
}

async function loadFreshDailyLogs(dailyLogs) {
  try {
    return (await dailyLogs.loadLogs?.()) ?? dailyLogs.logs ?? [];
  } catch {
    return dailyLogs.logs ?? [];
  }
}

async function loadFreshCheckins(checkins) {
  try {
    return (await checkins.loadCheckins?.()) ?? checkins.checkins ?? [];
  } catch {
    return checkins.checkins ?? [];
  }
}

export async function buildCoachPayload({
  activities,
  dailyLogs,
  checkins,
  activePlan,
  trainingBlocks,
  runnerProfile,
  lang,
}) {
  const [freshActivities, freshLogs, freshCheckins] = await Promise.all([
    loadFreshActivities(activities),
    loadFreshDailyLogs(dailyLogs),
    loadFreshCheckins(checkins),
  ]);
  const background = runnerProfile.background;
  const goal = activePlan?.goal ?? null;
  const runnerProfilePayload = (background || goal) ? { background: background || null, goal } : null;
  return {
    weeklySummary: buildWeeklySummaries(freshActivities),
    recentActivities: getRecentActivities(freshActivities),
    latestCheckin: normalizeCheckin(freshCheckins[0] ?? null),
    recentCheckins: freshCheckins.slice(0, 3).map(normalizeCheckin).filter(Boolean),
    planContext: buildPlanContext(activePlan, trainingBlocks.blocks ?? []),
    dailyLogs: getRecentDailyLogs(freshLogs),
    runnerProfile: runnerProfilePayload,
    lang,
  };
}
