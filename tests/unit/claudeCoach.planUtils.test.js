import { describe, expect, it, vi } from "vitest";

import {
  buildFullPlanSchemaGuidance,
  getCurrentWeekStartIso,
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

  it("updates the existing active plan instead of upserting on user_id", async () => {
    const updateEq = vi.fn().mockResolvedValue({ error: null });
    const update = vi.fn(() => ({ eq: updateEq }));
    const insert = vi.fn().mockResolvedValue({ error: null });
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
            insert,
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
    expect(update).toHaveBeenCalled();
    expect(updateEq).toHaveBeenCalledWith("id", "existing-plan");
    expect(insert).not.toHaveBeenCalled();
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
