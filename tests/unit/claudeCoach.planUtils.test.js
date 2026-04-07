import { describe, expect, it, vi } from "vitest";

import {
  buildFullPlanSchemaGuidance,
  getCurrentWeekStartIso,
  normalizeFullPlan,
  saveFullPlan,
  validateFullPlan,
} from "../../supabase/functions/claude-coach/planUtils.ts";

function makeValidPlan() {
  return {
    meta: {
      id: "plan-1",
      event: "Soria Moria 85K",
      eventDate: "2026-05-30",
      planStartDate: "2026-04-06",
      planEndDate: "2026-05-24",
      totalWeeks: 7,
      generatedBy: "Claude Coach",
      createdAt: "2026-04-06T00:00:00Z",
      updatedAt: "2026-04-06T00:00:00Z",
    },
    assessment: {
      foundation: { yearsInSport: 8 },
      currentForm: { weeklyKm: 105, longestRun: 45 },
    },
    zones: {
      run: {
        hr: {
          lthr: 170,
          zones: [{ zone: 1, name: "Easy", percentLow: 0, percentHigh: 80, hrLow: 0, hrHigh: 136 }],
        },
      },
    },
    phases: [
      { name: "Base", startWeek: 1, endWeek: 3, focus: "Aerobic durability" },
      { name: "Specific", startWeek: 4, endWeek: 6, focus: "Race specificity" },
      { name: "Taper", startWeek: 7, endWeek: 7, focus: "Freshen up" },
    ],
    weeks: Array.from({ length: 7 }, (_, index) => {
      const start = new Date(Date.UTC(2026, 3, 6 + index * 7));
      const end = new Date(Date.UTC(2026, 3, 12 + index * 7));
      return {
        weekNumber: index + 1,
        startDate: start.toISOString().split("T")[0],
        endDate: end.toISOString().split("T")[0],
        phase: index < 3 ? "Base" : index < 6 ? "Specific" : "Taper",
        focus: `Week ${index + 1}`,
        days: Array.from({ length: 7 }, (_, dayIndex) => {
          const day = new Date(Date.UTC(2026, 3, 6 + index * 7 + dayIndex));
          return {
            date: day.toISOString().split("T")[0],
            dayOfWeek: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][dayIndex],
            workouts: [],
          };
        }),
      };
    }),
    raceStrategy: {
      event: {
        name: "Soria Moria 85K",
        date: "2026-05-30",
        type: "ultra",
        distance: 85,
      },
    },
  };
}

function makeAiStylePlan() {
  return {
    meta: {
      id: "soria-moria-ultra-plan",
      event: "Soria Moria til Verdens Ende 50 miles",
      eventDate: "2026-05-30",
      planStartDate: "2026-04-06",
      planEndDate: "2026-05-30",
      totalWeeks: 8,
      generatedBy: "endurance-coach-ai",
      createdAt: "2026-04-06T00:00:00Z",
      updatedAt: "2026-04-06T00:00:00Z",
    },
    assessment: {
      currentWeeklyVolume: "105km",
      longestRecentRun: "35km",
      raceDistance: "80.5km",
      experience: "limited technical trail experience",
    },
    zones: {
      easy: "Conversational effort",
      aerobic: "Steady comfortable effort",
    },
    phases: [
      { name: "Technical Base Building", startDate: "2026-04-06", endDate: "2026-04-20", weeks: 2, focus: "Trail skills" },
      { name: "Ultra Build", startDate: "2026-04-21", endDate: "2026-05-11", weeks: 3, focus: "Back-to-back long runs" },
      { name: "Peak & Taper", startDate: "2026-05-12", endDate: "2026-05-30", weeks: 3, focus: "Taper" },
    ],
    weeks: [
      {
        weekNumber: 1,
        startDate: "2026-04-06",
        endDate: "2026-04-12",
        phase: "Technical Base Building",
        focus: "Trail skills introduction",
        days: [
          { date: "2026-04-06", dayOfWeek: "Sunday", workouts: [{ id: "w1d1", sport: "running", type: "long", name: "Long Run", durationMinutes: 180, distanceKm: 25, primaryZone: "aerobic", completed: false }] },
          { date: "2026-04-07", dayOfWeek: "Monday", workouts: [] },
          { date: "2026-04-08", dayOfWeek: "Tuesday", workouts: [] },
          { date: "2026-04-09", dayOfWeek: "Wednesday", workouts: [] },
          { date: "2026-04-10", dayOfWeek: "Thursday", workouts: [] },
          { date: "2026-04-11", dayOfWeek: "Friday", workouts: [] },
          { date: "2026-04-12", dayOfWeek: "Saturday", workouts: [] },
        ],
      },
      {
        weekNumber: 2,
        startDate: "2026-04-13",
        endDate: "2026-04-19",
        phase: "Technical Base Building",
        focus: "Building trail confidence",
        days: [
          { date: "2026-04-13", dayOfWeek: "Sunday", workouts: [{ id: "w2d1", sport: "running", type: "long", name: "Long Run", durationMinutes: 210, distanceKm: 28, primaryZone: "aerobic", completed: false }] },
          { date: "2026-04-14", dayOfWeek: "Monday", workouts: [] },
          { date: "2026-04-15", dayOfWeek: "Tuesday", workouts: [] },
          { date: "2026-04-16", dayOfWeek: "Wednesday", workouts: [] },
          { date: "2026-04-17", dayOfWeek: "Thursday", workouts: [] },
          { date: "2026-04-18", dayOfWeek: "Friday", workouts: [] },
          { date: "2026-04-19", dayOfWeek: "Saturday", workouts: [] },
        ],
      },
      {
        weekNumber: 3,
        startDate: "2026-04-20",
        endDate: "2026-04-26",
        phase: "Ultra Build",
        focus: "Ultra preparation",
        days: [
          { date: "2026-04-20", dayOfWeek: "Sunday", workouts: [{ id: "w3d1", sport: "running", type: "recovery", name: "Recovery", durationMinutes: 40, distanceKm: 7, primaryZone: "recovery", completed: false }] },
          { date: "2026-04-21", dayOfWeek: "Monday", workouts: [] },
          { date: "2026-04-22", dayOfWeek: "Tuesday", workouts: [] },
          { date: "2026-04-23", dayOfWeek: "Wednesday", workouts: [] },
          { date: "2026-04-24", dayOfWeek: "Thursday", workouts: [] },
          { date: "2026-04-25", dayOfWeek: "Friday", workouts: [] },
          { date: "2026-04-26", dayOfWeek: "Saturday", workouts: [] },
        ],
      },
      {
        weekNumber: 4,
        startDate: "2026-04-27",
        endDate: "2026-05-03",
        phase: "Ultra Build",
        focus: "Peak volume",
        days: [
          { date: "2026-04-27", dayOfWeek: "Sunday", workouts: [{ id: "w4d1", sport: "running", type: "long", name: "Long Run", durationMinutes: 195, distanceKm: 26, primaryZone: "aerobic", completed: false }] },
          { date: "2026-04-28", dayOfWeek: "Monday", workouts: [] },
          { date: "2026-04-29", dayOfWeek: "Tuesday", workouts: [] },
          { date: "2026-04-30", dayOfWeek: "Wednesday", workouts: [] },
          { date: "2026-05-01", dayOfWeek: "Thursday", workouts: [] },
          { date: "2026-05-02", dayOfWeek: "Friday", workouts: [] },
          { date: "2026-05-03", dayOfWeek: "Saturday", workouts: [] },
        ],
      },
      {
        weekNumber: 5,
        startDate: "2026-05-04",
        endDate: "2026-05-10",
        phase: "Ultra Build",
        focus: "Race rehearsal",
        days: [
          { date: "2026-05-04", dayOfWeek: "Sunday", workouts: [{ id: "w5d1", sport: "running", type: "long", name: "Race Rehearsal", durationMinutes: 240, distanceKm: 32, primaryZone: "aerobic", completed: false }] },
          { date: "2026-05-05", dayOfWeek: "Monday", workouts: [] },
          { date: "2026-05-06", dayOfWeek: "Tuesday", workouts: [] },
          { date: "2026-05-07", dayOfWeek: "Wednesday", workouts: [] },
          { date: "2026-05-08", dayOfWeek: "Thursday", workouts: [] },
          { date: "2026-05-09", dayOfWeek: "Friday", workouts: [] },
          { date: "2026-05-10", dayOfWeek: "Saturday", workouts: [] },
        ],
      },
      {
        weekNumber: 6,
        startDate: "2026-05-11",
        endDate: "2026-05-17",
        phase: "Peak & Taper",
        focus: "Start taper",
        days: [
          { date: "2026-05-11", dayOfWeek: "Sunday", workouts: [{ id: "w6d1", sport: "running", type: "recovery", name: "Recovery", durationMinutes: 40, distanceKm: 7, primaryZone: "recovery", completed: false }] },
          { date: "2026-05-12", dayOfWeek: "Monday", workouts: [] },
          { date: "2026-05-13", dayOfWeek: "Tuesday", workouts: [] },
          { date: "2026-05-14", dayOfWeek: "Wednesday", workouts: [] },
          { date: "2026-05-15", dayOfWeek: "Thursday", workouts: [] },
          { date: "2026-05-16", dayOfWeek: "Friday", workouts: [] },
          { date: "2026-05-17", dayOfWeek: "Saturday", workouts: [] },
        ],
      },
      {
        weekNumber: 7,
        startDate: "2026-05-18",
        endDate: "2026-05-24",
        phase: "Peak & Taper",
        focus: "Reduced volume",
        days: [
          { date: "2026-05-18", dayOfWeek: "Sunday", workouts: [{ id: "w7d1", sport: "running", type: "aerobic", name: "Easy Trail", durationMinutes: 75, distanceKm: 12, primaryZone: "aerobic", completed: false }] },
          { date: "2026-05-19", dayOfWeek: "Monday", workouts: [] },
          { date: "2026-05-20", dayOfWeek: "Tuesday", workouts: [] },
          { date: "2026-05-21", dayOfWeek: "Wednesday", workouts: [] },
          { date: "2026-05-22", dayOfWeek: "Thursday", workouts: [] },
          { date: "2026-05-23", dayOfWeek: "Friday", workouts: [] },
          { date: "2026-05-24", dayOfWeek: "Saturday", workouts: [] },
        ],
      },
      {
        weekNumber: 8,
        startDate: "2026-05-25",
        endDate: "2026-05-30",
        phase: "Peak & Taper",
        focus: "Race week",
        days: [
          { date: "2026-05-25", dayOfWeek: "Sunday", workouts: [{ id: "w8d1", sport: "running", type: "easy", name: "Easy", durationMinutes: 45, distanceKm: 7, primaryZone: "easy", completed: false }] },
          { date: "2026-05-26", dayOfWeek: "Monday", workouts: [] },
          { date: "2026-05-27", dayOfWeek: "Tuesday", workouts: [] },
          { date: "2026-05-28", dayOfWeek: "Wednesday", workouts: [] },
          { date: "2026-05-29", dayOfWeek: "Thursday", workouts: [] },
          { date: "2026-05-30", dayOfWeek: "Friday", workouts: [{ id: "w8d6", sport: "running", type: "race", name: "Race Day", durationMinutes: 600, distanceKm: 80.5, primaryZone: "race", completed: false }] },
        ],
      },
    ],
    raceStrategy: {
      event: {
        name: "Soria Moria til Verdens Ende 50 miles",
        date: "2026-05-30",
        distance: "80.5km",
        type: "ultra",
      },
    },
  };
}

describe("claude-coach plan utils", () => {
  it("builds schema guidance pinned to the current week", () => {
    const guidance = buildFullPlanSchemaGuidance(new Date("2026-04-06T12:00:00Z"));

    expect(guidance).toContain("Today is 2026-04-06");
    expect(guidance).toContain("current training week starts on 2026-04-06");
    expect(guidance).toContain("fully expanded week-by-week plan");
  });

  it("rejects summary-only plans and plans anchored before the current week", () => {
    const result = validateFullPlan(
      {
        startDate: "2025-01-06",
        endDate: "2026-05-30",
        phases: [{ name: "Base" }],
      },
      new Date("2026-04-06T12:00:00Z"),
    );

    expect(result.valid).toBe(false);
    expect(result.errors.some((error) => error.includes("missing top-level field: weeks"))).toBe(true);
  });

  it("accepts a valid hierarchical plan starting in the current week", () => {
    const result = validateFullPlan(makeValidPlan(), new Date("2026-04-06T12:00:00Z"));
    expect(result).toEqual({ valid: true, errors: [] });
  });

  it("normalizes AI-style full plans into the canonical viewer schema", () => {
    const normalized = normalizeFullPlan(makeAiStylePlan(), new Date("2026-04-06T12:00:00Z"));

    expect(normalized.raceGoal).toEqual({
      eventName: "Soria Moria til Verdens Ende 50 miles",
      eventDate: "2026-05-30",
    });
    expect(normalized.phases).toEqual([
      expect.objectContaining({ name: "Technical Base Building", startWeek: 1, endWeek: 2 }),
      expect.objectContaining({ name: "Ultra Build", startWeek: 3, endWeek: 5 }),
      expect.objectContaining({ name: "Peak & Taper", startWeek: 6, endWeek: 8 }),
    ]);
    expect(normalized.weeks[0].days[0].dayOfWeek).toBe("Sun");
    expect(normalized.weeks[0].summary).toEqual(expect.objectContaining({ totalKm: 25, sessions: 1 }));
  });

  it("updates the existing active plan instead of upserting on user_id", async () => {
    const updateEq = vi.fn().mockResolvedValue({ error: null });
    const update = vi.fn(() => ({ eq: updateEq }));
    const insert = vi.fn().mockResolvedValue({ error: null });

    const supabase = {
      from(table) {
        if (table === "hierarchical_plans") {
          return {
            select() { return this; },
            eq() { return this; },
            order() { return this; },
            limit() { return this; },
            maybeSingle: vi.fn().mockResolvedValue({ data: { id: "existing-plan" }, error: null }),
            update,
            insert,
          };
        }

        if (table === "training_plans") {
          return {
            select() { return this; },
            eq() { return this; },
            order() { return this; },
            limit() { return this; },
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          };
        }

        throw new Error(`Unexpected table ${table}`);
      },
    };

    const result = await saveFullPlan(
      supabase,
      "user-1",
      makeValidPlan(),
      new Date("2026-04-06T12:00:00Z"),
    );

    expect(result).toEqual({ planUpdated: true, error: null });
    expect(update).toHaveBeenCalled();
    expect(updateEq).toHaveBeenCalledWith("id", "existing-plan");
    expect(insert).not.toHaveBeenCalled();
  });

  it("syncs training_blocks only when a linked legacy training plan exists", async () => {
    const updateEq = vi.fn().mockResolvedValue({ error: null });
    const update = vi.fn(() => ({ eq: updateEq }));
    const deleteEq = vi.fn().mockResolvedValue({ error: null });
    const blockInsert = vi.fn().mockResolvedValue({ error: null });

    const supabase = {
      from(table) {
        if (table === "hierarchical_plans") {
          return {
            select() { return this; },
            eq() { return this; },
            order() { return this; },
            limit() { return this; },
            maybeSingle: vi.fn().mockResolvedValue({ data: { id: "existing-plan" }, error: null }),
            update,
            insert: vi.fn(),
          };
        }

        if (table === "training_plans") {
          return {
            select() { return this; },
            eq() { return this; },
            order() { return this; },
            limit() { return this; },
            maybeSingle: vi.fn().mockResolvedValue({ data: { id: "legacy-plan-1" }, error: null }),
          };
        }

        if (table === "training_blocks") {
          return {
            delete() {
              return { eq: deleteEq };
            },
            insert: blockInsert,
          };
        }

        throw new Error(`Unexpected table ${table}`);
      },
    };

    const result = await saveFullPlan(
      supabase,
      "user-1",
      makeValidPlan(),
      new Date("2026-04-06T12:00:00Z"),
    );

    expect(result).toEqual({ planUpdated: true, error: null });
    expect(deleteEq).toHaveBeenCalledWith("plan_id", "legacy-plan-1");
    expect(blockInsert).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ plan_id: "legacy-plan-1", user_id: "user-1" }),
      ]),
    );
  });

  it("returns a validation error instead of writing an invalid plan", async () => {
    const insert = vi.fn();

    const supabase = {
      from() {
        return {
          select() { return this; },
          eq() { return this; },
          order() { return this; },
          limit() { return this; },
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          update: vi.fn(),
          insert,
        };
      },
    };

    const result = await saveFullPlan(
      supabase,
      "user-1",
      { startDate: "2025-01-06", endDate: "2026-05-30" },
      new Date("2026-04-06T12:00:00Z"),
    );

    expect(result.planUpdated).toBe(false);
    expect(result.error).toContain("Generated plan failed validation");
    expect(insert).not.toHaveBeenCalled();
  });

  it("computes the current week start in UTC Monday terms", () => {
    expect(getCurrentWeekStartIso(new Date("2026-04-08T10:00:00Z"))).toBe("2026-04-06");
    expect(getCurrentWeekStartIso(new Date("2026-04-12T10:00:00Z"))).toBe("2026-04-06");
  });
});
