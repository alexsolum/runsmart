export const TYPE_COLORS = {
  Easy: {
    key: "Easy",
    label: "Rolig",
    color: "#1a5fb4",
    bg: "#e8f0fb",
    border: "#4a8fd4",
  },
  Intervals: {
    key: "Intervals",
    label: "Intervaller",
    color: "#8a3ffc",
    bg: "#f0e8ff",
    border: "#b88cff",
  },
  Threshold: {
    key: "Threshold",
    label: "Terskel",
    color: "#c25c00",
    bg: "#fff0e0",
    border: "#f5993a",
  },
  Long: {
    key: "Long",
    label: "Langtur",
    color: "#1b6b3a",
    bg: "#e6f4ec",
    border: "#4caf72",
  },
  Hike: {
    key: "Hike",
    label: "Tur",
    color: "#5b6b1b",
    bg: "#f1f4df",
    border: "#a5b65a",
  },
  Recovery: {
    key: "Recovery",
    label: "Restitusjon",
    color: "#4a6078",
    bg: "#eef2f6",
    border: "#9aabba",
  },
  Strength: {
    key: "Strength",
    label: "Styrke",
    color: "#7a3d1c",
    bg: "#f7ebe5",
    border: "#c98561",
  },
  Rest: {
    key: "Rest",
    label: "Hvile",
    color: "#7a92a8",
    bg: "#f5f7fa",
    border: "#c8d4e0",
  },
  Race: {
    key: "Race",
    label: "Løp",
    color: "#b01c1c",
    bg: "#fdeaea",
    border: "#ef7d7d",
  },
};

const TYPE_ALIASES = {
  easy: "Easy",
  rolig: "Easy",
  aerobic: "Easy",
  endurance: "Easy",
  interval: "Intervals",
  intervals: "Intervals",
  intervall: "Intervals",
  reps: "Intervals",
  hill: "Intervals",
  bakke: "Intervals",
  vo2: "Intervals",
  threshold: "Threshold",
  terskel: "Threshold",
  tempo: "Threshold",
  steady: "Threshold",
  long: "Long",
  longrun: "Long",
  "long-run": "Long",
  long_run: "Long",
  langtur: "Long",
  hike: "Hike",
  walking: "Hike",
  tur: "Hike",
  recovery: "Recovery",
  restitusjon: "Recovery",
  strength: "Strength",
  styrke: "Strength",
  rest: "Rest",
  hvile: "Rest",
  off: "Rest",
  race: "Race",
  lop: "Race",
  løp: "Race",
};

export function normalizeType(type = "", workout = {}) {
  const direct = TYPE_ALIASES[String(type).trim().toLowerCase()];
  if (direct) return direct;

  const text = `${type} ${workout?.name ?? ""} ${workout?.description ?? ""}`.toLowerCase();
  if (/race|løp|lop|competition|konkurranse/.test(text)) return "Race";
  if (/rest|hvile|fri/.test(text)) return "Rest";
  if (/strength|styrke|core/.test(text)) return "Strength";
  if (/long|langtur/.test(text)) return "Long";
  if (/hike|tur|walk/.test(text)) return "Hike";
  if (/threshold|terskel|tempo/.test(text)) return "Threshold";
  if (/interval|intervall|hill|bakke|reps|vo2/.test(text)) return "Intervals";
  if (/recovery|restitusjon/.test(text)) return "Recovery";
  return "Easy";
}

export function typeMeta(type = "", workout = {}) {
  return TYPE_COLORS[normalizeType(type, workout)] ?? TYPE_COLORS.Easy;
}

export const TYPE_OPTIONS = [
  TYPE_COLORS.Easy,
  TYPE_COLORS.Intervals,
  TYPE_COLORS.Threshold,
  TYPE_COLORS.Long,
  TYPE_COLORS.Hike,
  TYPE_COLORS.Recovery,
  TYPE_COLORS.Strength,
  TYPE_COLORS.Rest,
];
