import { describe, it, expect } from "vitest";

import { inferWorkoutTypeFromText, normalizeWorkoutType, WORKOUT_TYPES } from "../../src/domain/workoutTypes.js";

describe("workoutTypes domain logic", () => {
  it("defines 10 canonical workout types with display metadata", () => {
    expect(Object.keys(WORKOUT_TYPES)).toHaveLength(10);
    expect(WORKOUT_TYPES.LONG_RUN).toMatchObject({
      label: "Long Run",
      group: "endurance",
      colorToken: "--pa-type-endurance",
      colorContainerToken: "--pa-type-endurance-container",
      icon: "🏔️",
    });
    expect(WORKOUT_TYPES.REST).toMatchObject({
      label: "Rest Day",
      group: "rest",
      colorToken: "--pa-type-rest",
      colorContainerToken: "--pa-type-rest-container",
      icon: "🛌",
    });
  });

  it("infers types correctly from text", () => {
    expect(inferWorkoutTypeFromText("Long Run 25km")).toBe("LONG_RUN");
    expect(inferWorkoutTypeFromText("Threshold intervals 5x1km")).toBe("TEMPO");
    expect(inferWorkoutTypeFromText("Recovery 30min")).toBe("RECOVERY");
    expect(inferWorkoutTypeFromText("Rest day")).toBe("REST");
    expect(inferWorkoutTypeFromText("Gym session")).toBe("STRENGTH");
    expect(inferWorkoutTypeFromText("")).toBe("EASY");
  });

  it("normalizes legacy and raw strings", () => {
    expect(normalizeWorkoutType("intensity")).toBe("INTERVALS");
    expect(normalizeWorkoutType("LONG_RUN")).toBe("LONG_RUN");
    expect(normalizeWorkoutType("Easy Run")).toBe("EASY");
    expect(normalizeWorkoutType(null)).toBe("EASY");
  });
});
