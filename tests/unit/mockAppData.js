import { vi } from "vitest";

// One week ago ISO string helper
function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

// Returns the ISO date of a given weekday (1=Mon…7=Sun) in the CURRENT week.
// Guarantees dates always fall within the WeeklyPlanPage's current-week grid.
function weekdayIso(targetDay /* 1=Mon, 2=Tue, …, 7=Sun */) {
  const d = new Date();
  const day = d.getUTCDay() || 7; // convert Sun(0) → 7
  d.setUTCDate(d.getUTCDate() - day + targetDay);
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString().split("T")[0];
}

// Returns the ISO date of tomorrow within the current week.
// If today is Sunday (last day), returns Sunday again (same day) to stay in-week.
function tomorrowInWeek() {
  const todayDay = new Date().getUTCDay() || 7; // 1=Mon … 7=Sun
  return weekdayIso(todayDay < 7 ? todayDay + 1 : 7);
}

// Returns the ISO date for a given day-of-week (0=Sun…6=Sat) in a prior week.
// weeksAgo=1 means last week, weeksAgo=2 two weeks ago, etc.
function weeksAgoOnDow(weeksAgo, dow /* 0=Sun, 1=Mon, ..., 6=Sat */) {
  const d = new Date();
  // Find Monday of current week
  const utcDay = d.getUTCDay();
  const diffToMon = utcDay === 0 ? -6 : 1 - utcDay;
  d.setUTCDate(d.getUTCDate() + diffToMon - weeksAgo * 7 + dow);
  d.setUTCHours(12, 0, 0, 0); // noon to avoid timezone edge cases
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

/**
 * Multi-week activities for 4-week-average coverage tests.
 * Pattern: Mon(10km) / Wed(8km) / Sat(18km) across last 4 prior weeks.
 * dow: 1=Mon, 3=Wed, 6=Sat (0-indexed from Sunday per JS Date).
 */
export const SAMPLE_ACTIVITIES_MULTIWEEK = [
  // Week -1
  { id: "mw-1-1", user_id: "user-1", name: "Easy Monday", type: "Run", started_at: weeksAgoOnDow(1, 1), distance: 10000, moving_time: 3000, average_speed: 3.33, elevation_gain: 60 },
  { id: "mw-1-3", user_id: "user-1", name: "Tempo Wednesday", type: "Run", started_at: weeksAgoOnDow(1, 3), distance: 8000, moving_time: 2400, average_speed: 3.33, elevation_gain: 40 },
  { id: "mw-1-6", user_id: "user-1", name: "Long Saturday", type: "Run", started_at: weeksAgoOnDow(1, 6), distance: 18000, moving_time: 5400, average_speed: 3.33, elevation_gain: 120 },
  // Week -2
  { id: "mw-2-1", user_id: "user-1", name: "Easy Monday", type: "Run", started_at: weeksAgoOnDow(2, 1), distance: 10000, moving_time: 3000, average_speed: 3.33, elevation_gain: 60 },
  { id: "mw-2-3", user_id: "user-1", name: "Tempo Wednesday", type: "Run", started_at: weeksAgoOnDow(2, 3), distance: 8000, moving_time: 2400, average_speed: 3.33, elevation_gain: 40 },
  { id: "mw-2-6", user_id: "user-1", name: "Long Saturday", type: "Run", started_at: weeksAgoOnDow(2, 6), distance: 18000, moving_time: 5400, average_speed: 3.33, elevation_gain: 120 },
  // Week -3
  { id: "mw-3-1", user_id: "user-1", name: "Easy Monday", type: "Run", started_at: weeksAgoOnDow(3, 1), distance: 10000, moving_time: 3000, average_speed: 3.33, elevation_gain: 60 },
  { id: "mw-3-3", user_id: "user-1", name: "Tempo Wednesday", type: "Run", started_at: weeksAgoOnDow(3, 3), distance: 8000, moving_time: 2400, average_speed: 3.33, elevation_gain: 40 },
  { id: "mw-3-6", user_id: "user-1", name: "Long Saturday", type: "Run", started_at: weeksAgoOnDow(3, 6), distance: 18000, moving_time: 5400, average_speed: 3.33, elevation_gain: 120 },
  // Week -4
  { id: "mw-4-1", user_id: "user-1", name: "Easy Monday", type: "Run", started_at: weeksAgoOnDow(4, 1), distance: 10000, moving_time: 3000, average_speed: 3.33, elevation_gain: 60 },
  { id: "mw-4-3", user_id: "user-1", name: "Tempo Wednesday", type: "Run", started_at: weeksAgoOnDow(4, 3), distance: 8000, moving_time: 2400, average_speed: 3.33, elevation_gain: 40 },
  { id: "mw-4-6", user_id: "user-1", name: "Long Saturday", type: "Run", started_at: weeksAgoOnDow(4, 6), distance: 18000, moving_time: 5400, average_speed: 3.33, elevation_gain: 120 },
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

export const SAMPLE_CONVERSATIONS = [
  {
    id: "conv-1",
    user_id: "user-1",
    title: "Good training consistency",
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "conv-2",
    user_id: "user-1",
    title: "Pre-race tapering advice",
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

export const SAMPLE_MESSAGES = [
  {
    id: "msg-1",
    conversation_id: "conv-1",
    role: "user",
    content: { type: "initial_request" },
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "msg-2",
    conversation_id: "conv-1",
    role: "assistant",
    content: [
      {
        type: "positive",
        icon: "trending",
        title: "Good training consistency",
        body: "Your running has been consistent this week. Keep building aerobic base.",
      },
    ],
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

export const SAMPLE_WORKOUT_ENTRIES = [
  {
    id: "we-1",
    plan_id: "plan-1",
    user_id: "user-1",
    workout_date: new Date().toISOString().split("T")[0], // today (UTC) — same day MobilePage defaults to
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
    workout_date: tomorrowInWeek(), // day after today in current week — always after we-1 in Mon-Sun grid
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
    coachConversations: {
      conversations: [],
      activeConversation: null,
      messages: [],
      loading: false,
      error: null,
      loadConversations: vi.fn().mockResolvedValue([]),
      loadMessages: vi.fn().mockResolvedValue([]),
      createConversation: vi.fn().mockResolvedValue(SAMPLE_CONVERSATIONS[0]),
      addMessage: vi.fn().mockImplementation((convId, role, content) =>
        Promise.resolve({
          id: `msg-${Date.now()}`,
          conversation_id: convId,
          role,
          content,
          created_at: new Date().toISOString(),
        })
      ),
      updateConversationTitle: vi.fn().mockResolvedValue(undefined),
      deleteConversation: vi.fn().mockResolvedValue(undefined),
      setActiveConversation: vi.fn().mockResolvedValue(undefined),
    },
    ...overrides,
  };
}
