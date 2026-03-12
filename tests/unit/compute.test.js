import { describe, it, expect } from "vitest";

import * as Compute from "../../src/domain/compute.js";

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

describe("computeTrainingLoadState", () => {
  // Helper: build a series array from explicit tsb values
  const makeSeries = (tsbValues) =>
    tsbValues.map((tsb, i) => ({
      date: `2026-01-${String(i + 1).padStart(2, "0")}`,
      atl: 50,
      ctl: 50 + tsb,
      tsb,
    }));

  it("returns null for empty series", () => {
    expect(Compute.computeTrainingLoadState([])).toBeNull();
  });

  it("returns null for a single-entry series (length < 2)", () => {
    expect(Compute.computeTrainingLoadState(makeSeries([10]))).toBeNull();
  });

  it("returns good_form / Good Form when latest tsb = 15", () => {
    const series = makeSeries([0, 15]);
    const result = Compute.computeTrainingLoadState(series);
    expect(result).not.toBeNull();
    expect(result.state).toBe("good_form");
    expect(result.stateLabel).toBe("Good Form");
    expect(result.tsb).toBe(15);
  });

  it("returns neutral / Neutral when latest tsb = 0", () => {
    const series = makeSeries([0, 0]);
    const result = Compute.computeTrainingLoadState(series);
    expect(result.state).toBe("neutral");
    expect(result.stateLabel).toBe("Neutral");
  });

  it("returns accumulating_fatigue / Accumulating Fatigue when latest tsb = -10", () => {
    const series = makeSeries([0, -10]);
    const result = Compute.computeTrainingLoadState(series);
    expect(result.state).toBe("accumulating_fatigue");
    expect(result.stateLabel).toBe("Accumulating Fatigue");
  });

  it("returns overreaching_risk / Overreaching Risk when latest tsb = -20", () => {
    const series = makeSeries([0, -20]);
    const result = Compute.computeTrainingLoadState(series);
    expect(result.state).toBe("overreaching_risk");
    expect(result.stateLabel).toBe("Overreaching Risk");
  });

  it("returns trendLabel Improving when tsbDelta > 2", () => {
    // 15-entry series: reference point at index 0 (tsb=0), latest at index 14 (tsb=10)
    const tsbValues = Array.from({ length: 15 }, (_, i) => (i === 14 ? 10 : 0));
    const series = makeSeries(tsbValues);
    const result = Compute.computeTrainingLoadState(series);
    expect(result.trendLabel).toBe("Improving");
  });

  it("returns trendLabel Declining when tsbDelta < -2", () => {
    // 15-entry series: reference point at index 0 (tsb=10), latest at index 14 (tsb=0)
    const tsbValues = Array.from({ length: 15 }, (_, i) => (i === 0 ? 10 : 0));
    const series = makeSeries(tsbValues);
    const result = Compute.computeTrainingLoadState(series);
    expect(result.trendLabel).toBe("Declining");
  });

  it("returns trendLabel Stable when tsbDelta is within dead-band (-2 to +2)", () => {
    const series = makeSeries([5, 5]);
    const result = Compute.computeTrainingLoadState(series);
    expect(result.trendLabel).toBe("Stable");
  });

  it("uses Math.max(0, series.length - 15) as reference index for trend window", () => {
    // 20-entry series: index 5 (length 20, 20-15=5) has tsb=0, latest has tsb=10
    const tsbValues = Array.from({ length: 20 }, (_, i) => {
      if (i === 5) return 0;
      if (i === 19) return 10;
      return 5; // everything else is 5 — reference should be index 5 (=0), latest=10, delta=10 → Improving
    });
    const series = makeSeries(tsbValues);
    const result = Compute.computeTrainingLoadState(series);
    // ref index = 20-15 = 5, tsb at idx 5 = 0, latest = 10, delta = 10 > 2 → Improving
    expect(result.trendLabel).toBe("Improving");
  });

  it("returns correct shape { state, stateLabel, trendLabel, tsb }", () => {
    const series = makeSeries([0, 12]);
    const result = Compute.computeTrainingLoadState(series);
    expect(result).toHaveProperty("state");
    expect(result).toHaveProperty("stateLabel");
    expect(result).toHaveProperty("trendLabel");
    expect(result).toHaveProperty("tsb");
  });
});

describe("linearRegression", () => {
  it("computes correct slope and intercept for a simple line", () => {
    const points = [{ x: 1, y: 2 }, { x: 2, y: 4 }, { x: 3, y: 6 }];
    const result = Compute.linearRegression(points);
    expect(result.slope).toBeCloseTo(2);
    expect(result.intercept).toBeCloseTo(0);
    expect(result.rSquared).toBeCloseTo(1);
  });

  it("handles empty or single point array", () => {
    expect(Compute.linearRegression([])).toEqual({ slope: 0, intercept: 0, rSquared: 0 });
    expect(Compute.linearRegression([{ x: 1, y: 1 }])).toEqual({ slope: 0, intercept: 0, rSquared: 0 });
  });
});

describe("getMinettiFactor", () => {
  it("returns 1.0 for 0% grade", () => {
    expect(Compute.getMinettiFactor(0)).toBeCloseTo(1.0);
  });

  it("returns expected value for positive grade", () => {
    // 10% grade (i=0.1) factor approx 1.65
    expect(Compute.getMinettiFactor(0.1)).toBeGreaterThan(1.5);
    expect(Compute.getMinettiFactor(0.1)).toBeLessThan(1.8);
  });

  it("returns expected value for negative grade", () => {
    // -10% grade factor approx 0.6
    expect(Compute.getMinettiFactor(-0.1)).toBeLessThan(1.0);
    expect(Compute.getMinettiFactor(-0.1)).toBeGreaterThan(0.5);
  });
});

describe("computeAerobicEfficiency", () => {
  it("filters out short activities and non-runs", () => {
    const activities = [
      { started_at: "2025-01-01T10:00:00Z", type: "Run", moving_time: 600, distance: 2000, average_heartrate: 140 }, // too short
      { started_at: "2025-01-01T11:00:00Z", type: "Ride", moving_time: 3600, distance: 30000, average_heartrate: 130 }, // not a run
      { started_at: "2025-01-01T12:00:00Z", type: "Run", moving_time: 1800, distance: 5000, average_heartrate: 0 }, // no HR
    ];
    expect(Compute.computeAerobicEfficiency(activities)).toHaveLength(0);
  });

  it("calculates efficiency correctly", () => {
    const activities = [
      {
        started_at: "2025-01-01T10:00:00Z",
        type: "Run",
        moving_time: 1800,
        distance: 5000,
        elevation_gain: 0,
        average_heartrate: 150,
        name: "Test Run"
      }
    ];
    const result = Compute.computeAerobicEfficiency(activities);
    expect(result).toHaveLength(1);
    // Speed = 5000 / 1800 = 2.777 m/s
    // Grade = 0, Factor = 1.0, GAP = 2.777
    // Efficiency = 2.777 / 150 = 0.0185
    expect(result[0].y).toBeCloseTo(0.0185, 4);
    expect(result[0].name).toBe("Test Run");
  });
});

describe("calculateTrendGain", () => {
  it("calculates % gain correctly", () => {
    const points = [
      { x: 0, y: 10 },
      { x: 1, y: 11 },
      { x: 2, y: 12 }
    ];
    // Line: y = 10 + 1*x
    // Start (x=0): 10
    // End (x=2): 12
    // Gain: (12-10)/10 * 100 = 20%
    expect(Compute.calculateTrendGain(points)).toBeCloseTo(20);
  });

  it("returns 0 for single point", () => {
    expect(Compute.calculateTrendGain([{ x: 0, y: 10 }])).toBe(0);
  });
});

