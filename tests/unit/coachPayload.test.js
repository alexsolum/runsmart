import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildCoachPayload } from "../../src/lib/coachPayload";

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
  });

  it("keeps recommendationContext null when no focused week is provided", async () => {
    const payload = await buildCoachPayload({
      ...makeInput(),
    });

    expect(payload.recommendationContext).toBeNull();
    expect(payload.weekDirective).toBeNull();
  });
});
