import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildCoachPayload, buildHierarchicalPlanWindow } from "../../src/lib/coachPayload";

function isoDay(daysAgo) {
  const base = new Date("2026-03-07T00:00:00.000Z");
  base.setUTCDate(base.getUTCDate() - daysAgo);
  return base.toISOString().split("T")[0];
}

function makeActivity(daysAgo) {
  return {
    started_at: `${isoDay(daysAgo)}T06:00:00.000Z`,
    distance: (daysAgo + 1) * 1000,
    moving_time: 1800,
    perceived_effort: 3,
    name: `Run ${daysAgo}`,
  };
}

function makeDailyLog(daysAgo) {
  return {
    log_date: isoDay(daysAgo),
    sleep_hours: 7,
    sleep_quality: 4,
    fatigue: 2,
    mood: 4,
    stress: 2,
    training_quality: 4,
    resting_hr: 50,
    notes: `Log ${daysAgo}`,
  };
}

function makeInput() {
  const activities = Array.from({ length: 120 }, (_, i) => makeActivity(i));
  const logs = Array.from({ length: 120 }, (_, i) => makeDailyLog(i));
  return {
    activities: {
      activities,
      loadActivities: vi.fn().mockResolvedValue(activities),
    },
    dailyLogs: {
      logs,
      loadLogs: vi.fn().mockResolvedValue(logs),
    },
    checkins: {
      checkins: [],
      loadCheckins: vi.fn().mockResolvedValue([]),
    },
    activePlan: null,
    trainingBlocks: { blocks: [] },
    runnerProfile: { background: "" },
    lang: "en",
  };
}

describe("buildCoachPayload synthesis windows", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-07T00:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("uses 12-week and 84-day windows in insights_synthesis mode", async () => {
    const input = makeInput();
    const payload = await buildCoachPayload({
      ...input,
      mode: "insights_synthesis",
    });

    expect(payload.weeklySummary).toHaveLength(12);
    expect(payload.recentActivities).toHaveLength(84);
    expect(payload.dailyLogs).toHaveLength(84);
    expect(input.activities.loadActivities).toHaveBeenCalledWith({ limit: 168, ascending: false });
  });

  it("keeps chronology deterministic and bounded in synthesis mode", async () => {
    const payload = await buildCoachPayload({
      ...makeInput(),
      mode: "insights_synthesis",
    });

    const weekOf = payload.weeklySummary.map((w) => w.weekOf);
    const sortedWeekOf = [...weekOf].sort((a, b) => a.localeCompare(b));
    expect(weekOf).toEqual(sortedWeekOf);

    const logDates = payload.dailyLogs.map((log) => log.date);
    const sortedLogDates = [...logDates].sort((a, b) => a.localeCompare(b));
    expect(logDates).toEqual(sortedLogDates);

    expect(payload.dailyLogs[0].date).toBe("2025-12-14");
    expect(payload.dailyLogs.at(-1).date).toBe("2026-03-07");
  });

  it("preserves legacy 4-week and 7-day windows for non-synthesis modes", async () => {
    const payload = await buildCoachPayload({
      ...makeInput(),
      mode: "initial",
    });

    expect(payload.weeklySummary).toHaveLength(4);
    expect(payload.recentActivities).toHaveLength(7);
    expect(payload.dailyLogs).toHaveLength(7);
  });

  it("returns a normalized recommendationContext when a focused week is provided", async () => {
    const payload = await buildCoachPayload({
      ...makeInput(),
      activePlan: {
        id: "plan-1",
        race_date: "2026-06-01",
        current_mileage: 55,
      },
      trainingBlocks: { blocks: [] },
      recommendationWeek: {
        weekStart: "2026-03-16",
        trainingType: "Build",
        targetKm: 68,
        notes: "Protect the long run after travel.",
      },
    });

    expect(payload.recommendationContext).toEqual({
      weekStart: "2026-03-16",
      weekEnd: "2026-03-22",
      trainingType: "Build",
      targetMileageKm: 68,
      notes: "Protect the long run after travel.",
    });
    expect(payload.weekDirective).toEqual({
      weekStart: "2026-03-16",
      weekEnd: "2026-03-22",
      trainingType: "Build",
      targetMileageKm: 68,
      notes: "Protect the long run after travel.",
      constraints: {
        enforceTrainingType: true,
        enforceTargetMileage: true,
        mileageTolerancePct: 0.1,
        overrideRequiresExplanation: true,
      },
    });
    expect(payload.weeklyConstraints).toBeNull();
  });

  it("keeps recommendationContext null when no focused week is provided", async () => {
    const payload = await buildCoachPayload({
      ...makeInput(),
    });

    expect(payload.recommendationContext).toBeNull();
    expect(payload.weekDirective).toBeNull();
    expect(payload.weeklyConstraints).toBeNull();
  });

  it("normalizes a distinct weeklyConstraints payload when day preferences are supplied", async () => {
    const payload = await buildCoachPayload({
      ...makeInput(),
      recommendationWeek: {
        weekStart: "2026-03-16",
        trainingType: "Build",
        targetKm: 68,
      },
      weeklyConstraints: {
        preferredLongRunDay: "sat",
        preferredHardWorkoutDay: " Tue ",
        commuteDays: ["Wed", "fri", "Wed", ""],
        doubleThresholdAllowed: false,
      },
    });

    expect(payload.weekDirective).toEqual(expect.objectContaining({
      weekStart: "2026-03-16",
      trainingType: "Build",
    }));
    expect(payload.weeklyConstraints).toEqual({
      preferredLongRunDay: "Sat",
      preferredHardWorkoutDay: "Tue",
      commuteDays: ["Wed", "Fri"],
      doubleThresholdAllowed: false,
    });
  });

  it("keeps weeklyConstraints separate from weekDirective when both are present", async () => {
    const payload = await buildCoachPayload({
      ...makeInput(),
      recommendationWeek: {
        weekStart: "2026-03-16",
        trainingType: "Taper",
        targetKm: 42,
      },
      weeklyConstraints: {
        preferredLongRunDay: "Sun",
      },
    });

    expect(payload.weekDirective).toEqual(expect.objectContaining({
      trainingType: "Taper",
      targetMileageKm: 42,
    }));
    expect(payload.weekDirective).not.toHaveProperty("preferredLongRunDay");
    expect(payload.weeklyConstraints).toEqual({
      preferredLongRunDay: "Sun",
      preferredHardWorkoutDay: null,
      commuteDays: [],
      doubleThresholdAllowed: null,
    });
  });
});

// ── buildHierarchicalPlanWindow tests ─────────────────────────────────────────

function makeWorkout(id, completed = false) {
  return {
    id,
    sport: "run",
    type: "aerobic",
    name: `Workout ${id}`,
    description: `Description for ${id}`,
    durationMinutes: 60,
    distanceKm: 12,
    primaryZone: "Zone 2",
    humanReadable: "Easy 60 min run",
    completed,
  };
}

function makeDay(dateStr) {
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const d = new Date(dateStr + "T00:00:00Z");
  return {
    date: dateStr,
    dayOfWeek: days[d.getUTCDay()],
    workouts: [makeWorkout(`${dateStr}-w1`)],
  };
}

function makeWeek(weekNumber, startDateStr) {
  const start = new Date(startDateStr + "T00:00:00Z");
  const end = new Date(start.getTime() + 6 * 24 * 60 * 60 * 1000);
  const endDateStr = end.toISOString().split("T")[0];
  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start.getTime() + i * 24 * 60 * 60 * 1000);
    days.push(makeDay(d.toISOString().split("T")[0]));
  }
  return {
    weekNumber,
    startDate: startDateStr,
    endDate: endDateStr,
    phase: weekNumber <= 4 ? "Base" : weekNumber <= 8 ? "Build" : "Peak",
    focus: `Week ${weekNumber} focus`,
    targetHours: 7,
    isRecoveryWeek: false,
    days,
    summary: { totalHours: 7, totalKm: 60, sessions: 5 },
  };
}

// 12-week plan: weeks 1-12, each 7 days, starting 2026-01-05 (Monday)
function make12WeekPlan() {
  const weeks = [];
  const planStart = new Date("2026-01-05T00:00:00Z");
  for (let i = 0; i < 12; i++) {
    const weekStart = new Date(planStart.getTime() + i * 7 * 24 * 60 * 60 * 1000);
    weeks.push(makeWeek(i + 1, weekStart.toISOString().split("T")[0]));
  }
  return { weeks };
}

describe("buildHierarchicalPlanWindow", () => {
  // Week 6 startDate is 2026-02-09, endDate is 2026-02-15
  const WEEK6_DATE = "2026-02-11"; // midweek 6

  it("returns pastWeeks:4, currentWeek:1, futureWeeks:6 when todayIso is in week 6", () => {
    const plan = make12WeekPlan();
    const result = buildHierarchicalPlanWindow(plan, WEEK6_DATE);
    expect(result).not.toBeNull();
    expect(result.pastWeeks).toHaveLength(4);
    expect(result.currentWeek).not.toBeNull();
    expect(result.currentWeek.weekNumber).toBe(6);
    expect(result.futureWeeks).toHaveLength(6);
  });

  it("strips past weeks to summary fields only (weekNumber, startDate, phase, focus, days with stripped workouts)", () => {
    const plan = make12WeekPlan();
    const result = buildHierarchicalPlanWindow(plan, WEEK6_DATE);
    const pastWeek = result.pastWeeks[0];
    // Should have these
    expect(pastWeek).toHaveProperty("weekNumber");
    expect(pastWeek).toHaveProperty("startDate");
    expect(pastWeek).toHaveProperty("phase");
    expect(pastWeek).toHaveProperty("focus");
    expect(pastWeek).toHaveProperty("days");
    // Should NOT have these extra fields
    expect(pastWeek).not.toHaveProperty("targetHours");
    expect(pastWeek).not.toHaveProperty("isRecoveryWeek");
    expect(pastWeek).not.toHaveProperty("summary");
    // Workout in past week should only have id, name, completed
    const workout = pastWeek.days[0].workouts[0];
    expect(workout).toHaveProperty("id");
    expect(workout).toHaveProperty("name");
    expect(workout).toHaveProperty("completed");
    expect(workout).not.toHaveProperty("durationMinutes");
    expect(workout).not.toHaveProperty("distanceKm");
    expect(workout).not.toHaveProperty("description");
  });

  it("preserves full workout objects in futureWeeks", () => {
    const plan = make12WeekPlan();
    const result = buildHierarchicalPlanWindow(plan, WEEK6_DATE);
    const futureWeek = result.futureWeeks[0];
    const workout = futureWeek.days[0].workouts[0];
    expect(workout).toHaveProperty("id");
    expect(workout).toHaveProperty("durationMinutes");
    expect(workout).toHaveProperty("distanceKm");
    expect(workout).toHaveProperty("description");
    expect(workout).toHaveProperty("primaryZone");
  });

  it("returns null for null planData", () => {
    expect(buildHierarchicalPlanWindow(null, WEEK6_DATE)).toBeNull();
  });

  it("returns null for undefined planData", () => {
    expect(buildHierarchicalPlanWindow(undefined, WEEK6_DATE)).toBeNull();
  });

  it("handles todayIso before all weeks: week 1 is current, no past, 11 future", () => {
    const plan = make12WeekPlan();
    const result = buildHierarchicalPlanWindow(plan, "2026-01-01"); // before all weeks
    expect(result).not.toBeNull();
    expect(result.pastWeeks).toHaveLength(0);
    expect(result.currentWeek.weekNumber).toBe(1);
    expect(result.futureWeeks).toHaveLength(6); // capped at weeksForward=6
  });

  it("handles todayIso after all weeks: all past, null current, empty future", () => {
    const plan = make12WeekPlan();
    const result = buildHierarchicalPlanWindow(plan, "2026-12-01"); // after all weeks
    expect(result).not.toBeNull();
    expect(result.currentWeek).toBeNull();
    expect(result.futureWeeks).toHaveLength(0);
    // past weeks capped at weeksBack=4
    expect(result.pastWeeks).toHaveLength(4);
  });

  it("PAYLOAD_WINDOWS_BY_MODE.chat has activityDays:24, logDays:7, summaryWeeks:4", async () => {
    // buildCoachPayload with mode="chat" should use 24-day activity window
    const activities = Array.from({ length: 30 }, (_, i) => ({
      started_at: `2026-03-${String(i + 1).padStart(2, "0")}T06:00:00.000Z`,
      distance: 10000,
      moving_time: 1800,
      perceived_effort: 3,
      name: `Run ${i}`,
    }));
    const input = {
      activities: {
        activities,
        loadActivities: vi.fn().mockResolvedValue(activities),
      },
      dailyLogs: {
        logs: [],
        loadLogs: vi.fn().mockResolvedValue([]),
      },
      checkins: {
        checkins: [],
        loadCheckins: vi.fn().mockResolvedValue([]),
      },
      activePlan: null,
      trainingBlocks: { blocks: [] },
      runnerProfile: { background: "" },
      lang: "en",
    };

    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-31T00:00:00.000Z"));
    try {
      await buildCoachPayload({ ...input, mode: "chat" });
      expect(input.activities.loadActivities).toHaveBeenCalledWith({ limit: 48, ascending: false });
    } finally {
      vi.useRealTimers();
    }
  });

  it("includes hierarchicalPlanWindow when mode=chat and hierarchicalPlanData provided", async () => {
    const plan = make12WeekPlan();
    const input = {
      activities: {
        activities: [],
        loadActivities: vi.fn().mockResolvedValue([]),
      },
      dailyLogs: {
        logs: [],
        loadLogs: vi.fn().mockResolvedValue([]),
      },
      checkins: {
        checkins: [],
        loadCheckins: vi.fn().mockResolvedValue([]),
      },
      activePlan: null,
      trainingBlocks: { blocks: [] },
      runnerProfile: { background: "" },
      lang: "en",
      mode: "chat",
      hierarchicalPlanData: plan,
    };

    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-02-11T12:00:00.000Z"));
    try {
      const payload = await buildCoachPayload(input);
      expect(payload).toHaveProperty("hierarchicalPlanWindow");
      expect(payload.hierarchicalPlanWindow).not.toBeNull();
      expect(payload.hierarchicalPlanWindow.currentWeek).not.toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });
});
