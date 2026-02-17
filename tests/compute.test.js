import { describe, it, expect } from "vitest";

import * as Compute from "../src/domain/compute.js";

describe("getWeekStart", () => {
  it("returns Monday for a Wednesday", () => {
    // 2025-01-15 is a Wednesday
    const result = Compute.getWeekStart(new Date("2025-01-15T12:00:00"));
    expect(result.getDay()).toBe(1); // Monday
    expect(result.toISOString().split("T")[0]).toBe("2025-01-13");
  });

  it("returns same day for a Monday", () => {
    const result = Compute.getWeekStart(new Date("2025-01-13T08:00:00"));
    expect(result.getDay()).toBe(1);
    expect(result.toISOString().split("T")[0]).toBe("2025-01-13");
  });

  it("returns previous Monday for a Sunday", () => {
    // 2025-01-19 is a Sunday
    const result = Compute.getWeekStart(new Date("2025-01-19T08:00:00"));
    expect(result.getDay()).toBe(1);
    expect(result.toISOString().split("T")[0]).toBe("2025-01-13");
  });
});

describe("computeWeeklySummary", () => {
  it("groups activities by week", () => {
    const activities = [
      { started_at: "2025-01-13T08:00:00Z", distance: 5000, elevation_gain: 100, moving_time: 1800 },
      { started_at: "2025-01-14T08:00:00Z", distance: 8000, elevation_gain: 200, moving_time: 3000 },
      { started_at: "2025-01-20T08:00:00Z", distance: 10000, elevation_gain: 300, moving_time: 3600 },
    ];
    const result = Compute.computeWeeklySummary(activities);
    const keys = Object.keys(result).sort();
    expect(keys.length).toBe(2);
    // First week: two activities
    expect(result[keys[0]].count).toBe(2);
    expect(result[keys[0]].distance).toBe(13000);
    // Second week: one activity
    expect(result[keys[1]].count).toBe(1);
    expect(result[keys[1]].distance).toBe(10000);
  });

  it("returns empty object for no activities", () => {
    expect(Compute.computeWeeklySummary([])).toEqual({});
  });
});

describe("computeTrainingBlocks", () => {
  it("returns 4 blocks", () => {
    const plan = {
      race_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
      current_mileage: 30,
    };
    const blocks = Compute.computeTrainingBlocks(plan);
    expect(blocks.length).toBe(4);
    expect(blocks.map((b) => b.name)).toEqual(["Base", "Build", "Peak", "Taper"]);
  });

  it("annotates B2B long runs when enabled", () => {
    const plan = {
      race_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
      current_mileage: 30,
      b2b_long_runs: true,
    };
    const blocks = Compute.computeTrainingBlocks(plan);
    expect(blocks[1].desc).toContain("B2B");
    expect(blocks[2].desc).toContain("B2B");
  });

  it("does not mention B2B when disabled", () => {
    const plan = {
      race_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
      current_mileage: 30,
      b2b_long_runs: false,
    };
    const blocks = Compute.computeTrainingBlocks(plan);
    expect(blocks[1].desc).not.toContain("B2B");
  });
});

describe("computeTrainingLoad", () => {
  it("returns empty array for no activities", () => {
    expect(Compute.computeTrainingLoad([])).toEqual([]);
  });

  it("computes ATL, CTL, and TSB", () => {
    const activities = [];
    const now = new Date();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      activities.push({
        started_at: d.toISOString(),
        moving_time: 3600, // 60 min
      });
    }
    const result = Compute.computeTrainingLoad(activities);
    expect(result.length).toBeGreaterThanOrEqual(14);
    const last = result[result.length - 1];
    expect(last).toHaveProperty("atl");
    expect(last).toHaveProperty("ctl");
    expect(last).toHaveProperty("tsb");
    // With 14 days of consistent load, ATL (7-day EWMA) responds faster than CTL (42-day)
    expect(last.atl).toBeGreaterThan(last.ctl);
  });
});

describe("computeLongRuns", () => {
  it("picks the longest run per week", () => {
    const activities = [
      { started_at: "2025-01-13T08:00:00Z", type: "Run", distance: 5000, moving_time: 1800, elevation_gain: 100, name: "Easy" },
      { started_at: "2025-01-14T08:00:00Z", type: "Run", distance: 16000, moving_time: 5400, elevation_gain: 500, name: "Long" },
      { started_at: "2025-01-15T08:00:00Z", type: "Hike", distance: 20000, moving_time: 7200, elevation_gain: 800, name: "Hike" },
    ];
    const result = Compute.computeLongRuns(activities);
    expect(result.length).toBe(1);
    expect(result[0][1].name).toBe("Long"); // Hike is filtered out
    expect(result[0][1].distance).toBe(16000);
  });
});

describe("format helpers", () => {
  it("formatDistance converts meters to km", () => {
    expect(Compute.formatDistance(1000)).toBe("1.0 km");
    expect(Compute.formatDistance(0)).toBe("\u2014");
  });

  it("formatDuration formats seconds", () => {
    expect(Compute.formatDuration(3661)).toBe("1h 1m");
    expect(Compute.formatDuration(125)).toBe("2m 5s");
    expect(Compute.formatDuration(0)).toBe("\u2014");
  });

  it("formatPace formats sec/km as /km", () => {
    const result = Compute.formatPace(300); // 5:00/km
    expect(result).toMatch(/\d+:\d+ \/km/);
  });

  it("formatElevation shows meters", () => {
    expect(Compute.formatElevation(100)).toMatch(/m$/);
    expect(Compute.formatElevation(0)).toBe("\u2014");
  });

  it("trendArrow shows up/down/flat", () => {
    expect(Compute.trendArrow(110, 100).cls).toBe("up");
    expect(Compute.trendArrow(90, 100).cls).toBe("down");
    expect(Compute.trendArrow(100, 100).cls).toBe("flat");
    expect(Compute.trendArrow(50, 0).cls).toBe("flat");
  });
});

describe("computeKoopPlan", () => {
  it("produces phases and weeks with a race day", () => {
    const plan = {
      race_date: new Date(Date.now() + 120 * 24 * 60 * 60 * 1000).toISOString(),
      current_mileage: 40,
    };
    const result = Compute.computeKoopPlan(plan);
    expect(result.phases.length).toBe(4);
    expect(result.weeks.length).toBeGreaterThan(4);
    // Last week should be race
    const last = result.weeks[result.weeks.length - 1];
    expect(last.phase).toBe("race");
    expect(last.workoutKey).toBe("gantt.raceDay");
  });

  it("marks B2B long weekend notes", () => {
    const plan = {
      race_date: new Date(Date.now() + 120 * 24 * 60 * 60 * 1000).toISOString(),
      current_mileage: 40,
      b2b_long_runs: true,
    };
    const result = Compute.computeKoopPlan(plan);
    const b2bWeeks = result.weeks.filter((w) => w.notesKey === "gantt.b2bLong");
    expect(b2bWeeks.length).toBeGreaterThan(0);
  });

  it("includes recovery weeks", () => {
    const plan = {
      race_date: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(),
      current_mileage: 40,
    };
    const result = Compute.computeKoopPlan(plan);
    const recoveryWeeks = result.weeks.filter((w) => w.recovery);
    expect(recoveryWeeks.length).toBeGreaterThan(0);
  });
});

describe("generateCoachingInsights", () => {
  it("returns get-started when no data", () => {
    const insights = Compute.generateCoachingInsights({
      activities: [],
      checkins: [],
      plans: [],
    });
    expect(insights.length).toBe(1);
    expect(insights[0].titleKey).toBe("coach.getStarted");
  });

  it("detects high fatigue from check-in", () => {
    const insights = Compute.generateCoachingInsights({
      activities: [],
      checkins: [{ fatigue: 5, sleep_quality: 1, motivation: 3 }],
      plans: [],
    });
    const rest = insights.find((i) => i.titleKey === "coach.needsRest");
    expect(rest).toBeDefined();
    expect(rest.type).toBe("danger");
  });

  it("detects niggle alert", () => {
    const insights = Compute.generateCoachingInsights({
      activities: [],
      checkins: [{ fatigue: 2, sleep_quality: 4, motivation: 3, niggles: "Left knee" }],
      plans: [],
    });
    const niggle = insights.find((i) => i.titleKey === "coach.niggleAlert");
    expect(niggle).toBeDefined();
    expect(niggle.meta).toBe("Left knee");
  });

  it("detects high motivation", () => {
    const insights = Compute.generateCoachingInsights({
      activities: [],
      checkins: [{ fatigue: 2, sleep_quality: 4, motivation: 5 }],
      plans: [],
    });
    const motivation = insights.find((i) => i.titleKey === "coach.highMotivation");
    expect(motivation).toBeDefined();
  });

  it("sorts by priority", () => {
    const insights = Compute.generateCoachingInsights({
      activities: [],
      checkins: [{ fatigue: 5, sleep_quality: 1, motivation: 5, niggles: "ankle" }],
      plans: [],
    });
    for (let i = 1; i < insights.length; i++) {
      expect(insights[i].priority).toBeGreaterThanOrEqual(insights[i - 1].priority);
    }
  });
});

describe("rpeClass", () => {
  it("classifies RPE values", () => {
    expect(Compute.rpeClass(2)).toBe("easy");
    expect(Compute.rpeClass(4)).toBe("easy");
    expect(Compute.rpeClass(5)).toBe("moderate");
    expect(Compute.rpeClass(7)).toBe("moderate");
    expect(Compute.rpeClass(8)).toBe("hard");
    expect(Compute.rpeClass(10)).toBe("hard");
  });
});


describe("computeWeeklyCalendar", () => {
  it("creates race-week calendar with race day on Sunday", () => {
    const week = { phase: "race", week: 10, mileage: 30, longRun: 20, workoutKey: "gantt.raceDay", recovery: false };
    const days = Compute.computeWeeklyCalendar(week, 6, false);
    expect(days).toHaveLength(7);
    expect(days[6].type).toBe("race");
    expect(days[6].labelKey).toBe("cal.raceDay");
  });

  it("adds medium-long Saturday for eligible B2B weeks", () => {
    const week = { phase: "specificPrep", week: 8, mileage: 80, longRun: 28, workoutKey: "gantt.raceSimulation", recovery: false };
    const days = Compute.computeWeeklyCalendar(week, 6, true);
    expect(days[5].type).toBe("medium-long");
    expect(days[5].labelKey).toBe("cal.mediumLong");
  });
});
