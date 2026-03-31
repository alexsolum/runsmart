export const WORKOUT_TYPES = {
  EASY: {
    label: "Easy Run",
    colorToken: "--pa-type-easy",
    colorContainerToken: "--pa-type-easy-container",
    icon: "🏃",
    group: "easy",
  },
  LONG_RUN: {
    label: "Long Run",
    colorToken: "--pa-type-endurance",
    colorContainerToken: "--pa-type-endurance-container",
    icon: "🏔️",
    group: "endurance",
  },
  TEMPO: {
    label: "Tempo Run",
    colorToken: "--pa-type-hard",
    colorContainerToken: "--pa-type-hard-container",
    icon: "🔥",
    group: "hard",
  },
  INTERVALS: {
    label: "Intervals",
    colorToken: "--pa-type-hard",
    colorContainerToken: "--pa-type-hard-container",
    icon: "⚡",
    group: "hard",
  },
  STEADY_STATE: {
    label: "Steady State",
    colorToken: "--pa-type-hard",
    colorContainerToken: "--pa-type-hard-container",
    icon: "⏱️",
    group: "hard",
  },
  RECOVERY: {
    label: "Recovery Run",
    colorToken: "--pa-type-easy",
    colorContainerToken: "--pa-type-easy-container",
    icon: "🌱",
    group: "easy",
  },
  STRENGTH: {
    label: "Strength",
    colorToken: "--pa-type-other",
    colorContainerToken: "--pa-type-other-container",
    icon: "💪",
    group: "other",
  },
  CROSS_TRAIN: {
    label: "Cross-Train",
    colorToken: "--pa-type-other",
    colorContainerToken: "--pa-type-other-container",
    icon: "🚴",
    group: "other",
  },
  REST: {
    label: "Rest Day",
    colorToken: "--pa-type-rest",
    colorContainerToken: "--pa-type-rest-container",
    icon: "🛌",
    group: "rest",
  },
  RACE_EVENT: {
    label: "Race / Event",
    colorToken: "--pa-type-race",
    colorContainerToken: "--pa-type-race-container",
    icon: "🏆",
    group: "race",
  },
};

export function inferWorkoutTypeFromText(text) {
  const value = String(text || "").toLowerCase();

  if (!value) return "EASY";
  if (value.includes("rest") || value.includes("off")) return "REST";
  if (value.includes("race") || value.includes("event") || value.includes("competition")) return "RACE_EVENT";
  if (value.includes("long")) return "LONG_RUN";
  if (value.includes("tempo") || value.includes("threshold") || value.includes("at ")) return "TEMPO";
  if (value.includes("interval") || value.includes("hill") || value.includes("vo2") || value.includes("sprints")) {
    return "INTERVALS";
  }
  if (value.includes("steady") || value.includes("marathon pace") || value.includes(" mp")) return "STEADY_STATE";
  if (value.includes("recover")) return "RECOVERY";
  if (value.includes("strength") || value.includes("gym") || value.includes("weights")) return "STRENGTH";
  if (value.includes("cross") || value.includes("bike") || value.includes("swim") || value.includes("elliptical")) {
    return "CROSS_TRAIN";
  }

  return "EASY";
}

export function normalizeWorkoutType(raw) {
  if (!raw) return "EASY";

  const upper = String(raw).toUpperCase().replace(/\s+/g, "_");
  if (WORKOUT_TYPES[upper]) return upper;

  const legacyMap = {
    INTENSITY: "INTERVALS",
    EASY: "EASY",
    RECOVERY: "RECOVERY",
    LONG: "LONG_RUN",
    STRENGTH: "STRENGTH",
    "CROSS-TRAIN": "CROSS_TRAIN",
    REST: "REST",
  };

  return legacyMap[upper] || inferWorkoutTypeFromText(raw);
}
