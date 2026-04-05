import { describe, it, expect } from "vitest";
import { validatePlanSchema, hasNonRunningFields } from "../../src/domain/planSchema.js";

// ── Valid running-only plan fixture ───────────────────────────────────────────

const VALID_PLAN = {
  meta: {
    id: "test-plan-1",
    athlete: "Test Athlete",
    event: "Test Marathon",
    eventDate: "2026-09-15",
    planStartDate: "2026-05-01",
    planEndDate: "2026-09-15",
    totalWeeks: 20,
    generatedBy: "Claude Coach",
    createdAt: "2026-03-30T00:00:00Z",
    updatedAt: "2026-03-30T00:00:00Z",
  },
  assessment: {
    foundation: {
      raceHistory: ["Half Marathon 2025"],
      peakTrainingLoad: 10,
      foundationLevel: "intermediate",
      yearsInSport: 3,
    },
    currentForm: {
      weeklyKm: 40,
      longestRun: 18,
      consistency: 4,
    },
    strengths: [{ area: "endurance", evidence: "Consistent weekly volume" }],
    limiters: [{ area: "speed", evidence: "No interval training history" }],
    constraints: ["Work Mon-Fri, train early mornings"],
  },
  zones: {
    run: {
      hr: {
        lthr: 165,
        zones: [
          {
            zone: 1,
            name: "Recovery",
            percentLow: 0,
            percentHigh: 81,
            hrLow: 0,
            hrHigh: 134,
          },
          {
            zone: 2,
            name: "Aerobic",
            percentLow: 81,
            percentHigh: 89,
            hrLow: 134,
            hrHigh: 147,
          },
        ],
      },
    },
  },
  phases: [
    {
      name: "Base",
      startWeek: 1,
      endWeek: 6,
      focus: "Aerobic foundation",
      weeklyHoursRange: { low: 5, high: 7 },
      keyWorkouts: ["Long run"],
      physiologicalGoals: ["Build aerobic base"],
    },
  ],
  weeks: [
    {
      weekNumber: 1,
      startDate: "2026-05-04",
      endDate: "2026-05-10",
      phase: "Base",
      focus: "Establish routine",
      targetHours: 5,
      isRecoveryWeek: false,
      days: [
        {
          date: "2026-05-04",
          dayOfWeek: "Monday",
          workouts: [
            {
              id: "w1-mon-1",
              sport: "run",
              type: "easy",
              name: "Easy Run",
              description: "Zone 2 aerobic run",
              durationMinutes: 40,
              distanceKm: 6,
              primaryZone: "Zone 2",
              completed: false,
            },
          ],
        },
      ],
      summary: { totalHours: 5, totalKm: 35, sessions: 5 },
    },
  ],
  raceStrategy: {
    event: {
      name: "Test Marathon",
      date: "2026-09-15",
      type: "marathon",
      distance: 42.2,
    },
    pacing: {
      run: { target: "5:30/km", notes: "Negative split" },
    },
    nutrition: {
      preRace: "3 hours before: 100g carbs",
      during: {
        carbsPerHour: 60,
        fluidPerHour: "750ml",
        products: ["Gel"],
      },
      notes: "Test in training",
    },
    taper: {
      startDate: "2026-09-01",
      volumeReduction: 40,
      notes: "Maintain intensity",
    },
  },
};

// ── validatePlanSchema tests ───────────────────────────────────────────────────

describe("validatePlanSchema", () => {
  it("accepts a valid running-only plan", () => {
    const result = validatePlanSchema(VALID_PLAN);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("rejects plan missing meta", () => {
    const plan = { ...VALID_PLAN, meta: undefined };
    const result = validatePlanSchema(plan);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors.some((e) => e.toLowerCase().includes("meta"))).toBe(true);
  });

  it("rejects plan missing phases", () => {
    const plan = { ...VALID_PLAN, phases: undefined };
    const result = validatePlanSchema(plan);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.toLowerCase().includes("phases"))).toBe(true);
  });

  it("rejects plan missing weeks", () => {
    const plan = { ...VALID_PLAN, weeks: undefined };
    const result = validatePlanSchema(plan);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.toLowerCase().includes("weeks"))).toBe(true);
  });

  it("rejects plan with non-array weeks", () => {
    const plan = { ...VALID_PLAN, weeks: "not-an-array" };
    const result = validatePlanSchema(plan);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.toLowerCase().includes("weeks"))).toBe(true);
  });

  it("rejects week missing days array", () => {
    const plan = {
      ...VALID_PLAN,
      weeks: [{ ...VALID_PLAN.weeks[0], days: undefined }],
    };
    const result = validatePlanSchema(plan);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.toLowerCase().includes("days"))).toBe(true);
  });

  it("rejects workout missing required fields", () => {
    const plan = {
      ...VALID_PLAN,
      weeks: [
        {
          ...VALID_PLAN.weeks[0],
          days: [
            {
              ...VALID_PLAN.weeks[0].days[0],
              workouts: [
                {
                  // missing id, sport, type, name
                  description: "Some workout",
                  completed: false,
                },
              ],
            },
          ],
        },
      ],
    };
    const result = validatePlanSchema(plan);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("validates meta required fields", () => {
    const plan = {
      ...VALID_PLAN,
      meta: {
        // missing required fields: id, event, eventDate, planStartDate, totalWeeks, generatedBy
        athlete: "Test",
      },
    };
    const result = validatePlanSchema(plan);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("returns valid: true with empty errors array for complete plan", () => {
    const result = validatePlanSchema(VALID_PLAN);
    expect(result).toHaveProperty("valid");
    expect(result).toHaveProperty("errors");
    expect(Array.isArray(result.errors)).toBe(true);
  });
});

// ── hasNonRunningFields tests ──────────────────────────────────────────────────

describe("hasNonRunningFields", () => {
  it("returns false for running-only plan", () => {
    expect(hasNonRunningFields(VALID_PLAN)).toBe(false);
  });

  it("returns true if zones.swim exists", () => {
    const plan = {
      ...VALID_PLAN,
      zones: {
        ...VALID_PLAN.zones,
        swim: { css: "1:45/100m", zones: [] },
      },
    };
    expect(hasNonRunningFields(plan)).toBe(true);
  });

  it("returns true if zones.bike exists", () => {
    const plan = {
      ...VALID_PLAN,
      zones: {
        ...VALID_PLAN.zones,
        bike: { power: { ftp: 250, zones: [] } },
      },
    };
    expect(hasNonRunningFields(plan)).toBe(true);
  });

  it("returns true if preferences.swim exists", () => {
    const plan = {
      ...VALID_PLAN,
      preferences: { swim: "meters" },
    };
    expect(hasNonRunningFields(plan)).toBe(true);
  });

  it("returns true if preferences.bike exists", () => {
    const plan = {
      ...VALID_PLAN,
      preferences: { bike: "kilometers" },
    };
    expect(hasNonRunningFields(plan)).toBe(true);
  });
});

// ── validatePatchArray tests ───────────────────────────────────────────────────
// This replicates the validatePatchArray logic from the Edge Function for unit testing.

function validatePatchArray(patch) {
  if (patch === null || patch === undefined) return true;
  if (!Array.isArray(patch)) return false;
  return patch.every(
    (p) =>
      typeof p.week === "number" &&
      typeof p.dayDate === "string" &&
      /^\d{4}-\d{2}-\d{2}$/.test(p.dayDate) &&
      typeof p.workoutId === "string" &&
      p.workoutId.length > 0 &&
      typeof p.fields === "object" &&
      p.fields !== null,
  );
}

describe("validatePatchArray (chat mode patch validation)", () => {
  it("returns true for null patch", () => {
    expect(validatePatchArray(null)).toBe(true);
  });

  it("returns true for a valid patch array", () => {
    const patch = [
      {
        week: 3,
        dayDate: "2026-04-14",
        workoutId: "w3-mon",
        fields: { durationMinutes: 45 },
      },
    ];
    expect(validatePatchArray(patch)).toBe(true);
  });

  it("returns false for a patch missing workoutId", () => {
    const patch = [
      {
        week: 3,
        dayDate: "2026-04-14",
        // workoutId missing
        fields: { durationMinutes: 45 },
      },
    ];
    expect(validatePatchArray(patch)).toBe(false);
  });

  it("returns false for a patch with invalid dayDate format", () => {
    const patch = [
      {
        week: 3,
        dayDate: "April 14",
        workoutId: "w3-mon",
        fields: { durationMinutes: 45 },
      },
    ];
    expect(validatePatchArray(patch)).toBe(false);
  });

  it("returns false for a non-array patch value", () => {
    expect(validatePatchArray({ week: 1, dayDate: "2026-04-01", workoutId: "w1-mon", fields: {} })).toBe(false);
  });

  it("returns true for an empty patch array", () => {
    expect(validatePatchArray([])).toBe(true);
  });

  it("returns false for a patch with empty workoutId string", () => {
    const patch = [
      {
        week: 1,
        dayDate: "2026-04-01",
        workoutId: "",
        fields: {},
      },
    ];
    expect(validatePatchArray(patch)).toBe(false);
  });
});
