import { vi } from "vitest";

// One week ago ISO string helper
function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

/**
 * Sample Strava activities stored in Supabase.
 * These represent data synced from Strava into the `activities` table.
 *
 * All activities are timestamped as "today" so they always fall inside the
 * "current week" date filter in HeroPage (which starts on the Monday of the
 * current week). Using today's date avoids intermittent failures when tests
 * run on Mondays where activities from "X days ago" would be in a prior week.
 */
export const SAMPLE_ACTIVITIES = [
  {
    id: "act-1",
    user_id: "user-1",
    name: "Morning Run",
    type: "Run",
    started_at: new Date().toISOString(),   // today
    distance: 10200,        // metres
    moving_time: 3120,      // seconds (52 min)
    average_speed: 3.27,    // m/s ≈ 5:06/km
    elevation_gain: 85,
    heart_rate_zones: { z1: 120, z2: 1440, z3: 600, z4: 840, z5: 120 },
  },
  {
    id: "act-2",
    user_id: "user-1",
    name: "Tempo Tuesday",
    type: "Run",
    started_at: new Date().toISOString(),   // today
    distance: 8000,
    moving_time: 2160,      // 36 min
    average_speed: 3.70,
    elevation_gain: 40,
    heart_rate_zones: { z1: 60, z2: 300, z3: 720, z4: 900, z5: 180 },
  },
  {
    id: "act-3",
    user_id: "user-1",
    name: "Long Run Sunday",
    type: "Run",
    started_at: daysAgo(4),               // 4 days ago — still within last 30 days
    distance: 22000,
    moving_time: 7200,      // 120 min
    average_speed: 3.06,
    elevation_gain: 210,
    heart_rate_zones: { z1: 600, z2: 3600, z3: 1800, z4: 1200, z5: 0 },
  },
];

export const SAMPLE_PLAN = {
  id: "plan-1",
  user_id: "user-1",
  race: "Stockholm Marathon",
  race_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
  availability: 5,
  current_mileage: 50,
  constraints: null,
  b2b_long_runs: false,
  goal: "Finish under 3:30 and stay injury-free",
};

export const SAMPLE_BLOCKS = [
  {
    id: "block-1",
    plan_id: "plan-1",
    phase: "Base",
    label: "Base 1",
    start_date: "2026-01-06",
    end_date: "2026-02-02",
    target_km: 50,
    notes: "Focus on aerobic base",
  },
  {
    id: "block-2",
    plan_id: "plan-1",
    phase: "Build",
    label: "Build 1",
    start_date: "2026-02-03",
    end_date: "2026-03-16",
    target_km: 65,
    notes: "Introduce tempo and intervals",
  },
];

export const SAMPLE_DAILY_LOGS = [
  {
    id: "log-1",
    user_id: "user-1",
    log_date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    training_quality: 4,
    workout_notes: "12km easy run",
    sleep_hours: 7.5,
    sleep_quality: 4,
    resting_hr: 52,
    fatigue: 2,
    mood: 4,
    stress: 2,
    alcohol_units: 0,
    notes: "Feeling good",
  },
  {
    id: "log-2",
    user_id: "user-1",
    log_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    training_quality: 3,
    workout_notes: "Tempo intervals",
    sleep_hours: 6.5,
    sleep_quality: 3,
    resting_hr: 55,
    fatigue: 3,
    mood: 3,
    stress: 3,
    alcohol_units: 0,
    notes: null,
  },
  {
    id: "log-3",
    user_id: "user-1",
    log_date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    training_quality: null,
    workout_notes: null,
    sleep_hours: 8,
    sleep_quality: 5,
    resting_hr: 50,
    fatigue: 1,
    mood: 5,
    stress: 1,
    alcohol_units: 0,
    notes: "Rest day",
  },
];

export const SAMPLE_WORKOUT_ENTRIES = [
  {
    id: "we-1",
    plan_id: "plan-1",
    user_id: "user-1",
    workout_date: new Date().toISOString().split("T")[0],
    workout_type: "Easy",
    distance_km: 8,
    duration_min: 50,
    description: "Easy aerobic run",
    completed: false,
  },
  {
    id: "we-2",
    plan_id: "plan-1",
    user_id: "user-1",
    workout_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    workout_type: "Tempo",
    distance_km: 10,
    duration_min: 55,
    description: "3×2km @ tempo pace",
    completed: false,
  },
];

/**
 * Build a complete AppData context value.
 * Pass overrides to customise individual slices for a specific test.
 */
export function makeAppData(overrides = {}) {
  return {
    auth: {
      user: { id: "user-1", email: "athlete@example.com" },
      session: null,
    },
    dailyLogs: {
      logs: [],
      loading: false,
      error: null,
      loadLogs: vi.fn().mockResolvedValue([]),
      saveLog: vi.fn().mockResolvedValue({ id: "log-new", log_date: new Date().toISOString().split("T")[0] }),
    },
    activities: {
      activities: SAMPLE_ACTIVITIES,
      loading: false,
      error: null,
      loadActivities: vi.fn().mockResolvedValue(SAMPLE_ACTIVITIES),
    },
    checkins: {
      checkins: [],
      loading: false,
    },
    plans: {
      plans: [SAMPLE_PLAN],
      loading: false,
      createPlan: vi.fn().mockResolvedValue(SAMPLE_PLAN),
      updatePlan: vi.fn().mockResolvedValue(SAMPLE_PLAN),
      deletePlan: vi.fn().mockResolvedValue(undefined),
    },
    runnerProfile: {
      background: "",
      loading: false,
      error: null,
      loadProfile: vi.fn().mockResolvedValue(undefined),
      saveProfile: vi.fn().mockResolvedValue(undefined),
    },
    strava: {
      startConnect: vi.fn(),
      syncing: false,
      lastSynced: null,
    },
    trainingBlocks: {
      blocks: SAMPLE_BLOCKS,
      loading: false,
      loadBlocks: vi.fn().mockResolvedValue(SAMPLE_BLOCKS),
      createBlock: vi.fn().mockResolvedValue(SAMPLE_BLOCKS[0]),
      updateBlock: vi.fn().mockResolvedValue(SAMPLE_BLOCKS[0]),
      deleteBlock: vi.fn().mockResolvedValue(undefined),
    },
    workoutEntries: {
      entries: SAMPLE_WORKOUT_ENTRIES,
      loading: false,
      loadEntriesForWeek: vi.fn().mockResolvedValue(SAMPLE_WORKOUT_ENTRIES),
      createEntry: vi.fn().mockResolvedValue(SAMPLE_WORKOUT_ENTRIES[0]),
      updateEntry: vi.fn().mockResolvedValue(SAMPLE_WORKOUT_ENTRIES[0]),
      deleteEntry: vi.fn().mockResolvedValue(undefined),
      toggleCompleted: vi.fn().mockResolvedValue(undefined),
    },
    ...overrides,
  };
}
