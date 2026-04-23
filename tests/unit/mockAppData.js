import { vi } from "vitest";

// One week ago ISO string helper
function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

// Returns the ISO date of a given weekday (1=Mon…7=Sun) in the CURRENT week.
// Guarantees dates always fall within the current test week's date grid.
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

export const PLANNER_ENTRIES = [
  {
    id: "pe-1",
    plan_id: "plan-1",
    user_id: "user-1",
    workout_date: weekdayIso(1),
    workout_type: "Easy",
    distance_km: 8,
    duration_min: 48,
    description: "Easy morning run",
    completed: false,
  },
  {
    id: "pe-2",
    plan_id: "plan-1",
    user_id: "user-1",
    workout_date: weekdayIso(2),
    workout_type: "Intervals",
    distance_km: 10,
    duration_min: 55,
    description: "6x800m hill repeats",
    completed: false,
  },
  {
    id: "pe-3",
    plan_id: "plan-1",
    user_id: "user-1",
    workout_date: weekdayIso(3),
    workout_type: "Recovery",
    distance_km: 5,
    duration_min: 35,
    description: "Slow recovery jog",
    completed: false,
  },
  {
    id: "pe-4",
    plan_id: "plan-1",
    user_id: "user-1",
    workout_date: weekdayIso(4),
    workout_type: "Rest",
    distance_km: null,
    duration_min: null,
    description: null,
    completed: false,
  },
  {
    id: "pe-5",
    plan_id: "plan-1",
    user_id: "user-1",
    workout_date: weekdayIso(5),
    workout_type: "Tempo",
    distance_km: 12,
    duration_min: 60,
    description: "Tempo at threshold",
    completed: false,
  },
  {
    id: "pe-6",
    plan_id: "plan-1",
    user_id: "user-1",
    workout_date: weekdayIso(6),
    workout_type: "Strength",
    distance_km: null,
    duration_min: 45,
    description: "Gym session",
    completed: false,
  },
  {
    id: "pe-7",
    plan_id: "plan-1",
    user_id: "user-1",
    workout_date: weekdayIso(7),
    workout_type: "Long Run",
    distance_km: 22,
    duration_min: 130,
    description: "Long run with race-pace finish",
    completed: false,
  },
  {
    id: "pe-8",
    plan_id: "plan-1",
    user_id: "user-1",
    workout_date: weekdayIso(6),
    workout_type: "Race / Event",
    distance_km: 42.2,
    duration_min: 210,
    description: "Oslo Marathon",
    completed: false,
  },
];

export const PLANNER_CONSTRAINT_ENTRY = {
  id: "pe-constraint",
  plan_id: "plan-1",
  user_id: "user-1",
  workout_date: weekdayIso(4),
  workout_type: "Constraint",
  distance_km: null,
  duration_min: null,
  description: "Travel day",
  completed: false,
};

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

export const SAMPLE_SESSIONS = [
  {
    session_id: "session-1",
    firstMessage: "How should I adjust my training this week?",
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    session_id: "session-2",
    firstMessage: "Pre-race tapering advice",
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

export const SAMPLE_CHAT_MESSAGES = [
  {
    id: "msg-1",
    session_id: "session-1",
    role: "user",
    content: [{ type: "text", text: "How should I adjust my training this week?" }],
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "msg-2",
    session_id: "session-1",
    role: "assistant",
    content: [{ type: "text", text: JSON.stringify({ type: "conversation", content: "Based on your recent fatigue levels, I'd recommend reducing intensity." }) }],
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

export const SAMPLE_CHECKINS = [
  {
    id: "chk-1",
    week_of: weeksAgoOnDow(1, 1).split("T")[0],
    fatigue: 4,
    sleep_quality: 3,
    motivation: 3,
    niggles: "mild left calf tightness",
  },
  {
    id: "chk-2",
    week_of: weeksAgoOnDow(2, 1).split("T")[0],
    fatigue: 3,
    sleep_quality: 4,
    motivation: 4,
    niggles: null,
  },
  {
    id: "chk-3",
    week_of: weeksAgoOnDow(3, 1).split("T")[0],
    fatigue: 2,
    sleep_quality: 5,
    motivation: 5,
    niggles: null,
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

export const SAMPLE_RACES = [
  {
    id: "race-1",
    user_id: "user-1",
    name: "Boston Marathon",
    location: "Boston, MA, USA",
    distance_km: 42.2,
    elevation_gain_m: 143,
    latitude: 42.3601,
    longitude: -71.0589,
    description: "The world's oldest annual marathon.",
    race_url: "https://www.baa.org/races/boston-marathon",
    next_race_date: "2027-04-19",
    registration_info: "Qualifier",
    image_url: null,
    cover_image_url: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8b/Boston_Marathon_Finish_Line.jpg/1280px-Boston_Marathon_Finish_Line.jpg",
    created_at: "2026-01-15T10:00:00Z",
    race_participations: [
      {
        id: "rp-1",
        race_id: "race-1",
        user_id: "user-1",
        race_date: "2025-04-21",
        finish_time: "03:12:45",
        overall_place: 5,
        total_finishers: 120,
        is_pb: true,
        notes: "Perfect weather. Nailed the negative split strategy.",
        strava_activity_id: "12345678",
        photo_album_url: "https://photos.example.com/boston-2025",
        created_at: "2025-04-21T18:00:00Z",
      },
      {
        id: "rp-2",
        race_id: "race-1",
        user_id: "user-1",
        race_date: "2023-04-17",
        finish_time: "03:28:10",
        overall_place: 48,
        total_finishers: 220,
        is_pb: false,
        notes: "First Boston! Went out too fast.",
        strava_activity_id: null,
        photo_album_url: null,
        created_at: "2023-04-17T18:00:00Z",
      },
    ],
    race_resources: [
      {
        id: "rr-1",
        race_id: "race-1",
        user_id: "user-1",
        type: "race_page",
        title: "Official Race Website",
        url: "https://www.baa.org/races/boston-marathon",
        created_at: "2026-01-15T10:00:00Z",
      },
      {
        id: "rr-2",
        race_id: "race-1",
        user_id: "user-1",
        type: "course_map",
        title: "Course Map & Elevation",
        url: "https://www.baa.org/races/boston-marathon/course-map",
        created_at: "2026-01-15T10:00:00Z",
      },
    ],
  },
  {
    id: "race-3",
    user_id: "user-1",
    name: "Berlin Marathon",
    location: "Berlin, Germany",
    distance_km: 42.2,
    elevation_gain_m: 73,
    latitude: 52.52,
    longitude: 13.405,
    description: "Fast autumn major.",
    race_url: "https://www.bmw-berlin-marathon.com",
    next_race_date: null,
    registration_info: null,
    image_url: null,
    cover_image_url: null,
    created_at: "2026-02-10T10:00:00Z",
    race_participations: [
      {
        id: "rp-3",
        race_id: "race-3",
        user_id: "user-1",
        race_date: "2024-09-29",
        finish_time: "03:18:05",
        overall_place: 420,
        total_finishers: 3200,
        is_pb: false,
        notes: "Steady day with a small fade after 35 km.",
        strava_activity_id: null,
        photo_album_url: null,
        created_at: "2024-09-29T18:00:00Z",
      },
    ],
    race_resources: [],
  },
  {
    id: "race-2",
    user_id: "user-1",
    name: "Western States 100",
    location: "Olympic Valley to Auburn, CA",
    distance_km: 161,
    elevation_gain_m: 5500,
    latitude: 39.1968,
    longitude: -120.2354,
    description: "The grandfather of 100-milers. Need to qualify first.",
    race_url: "https://www.wser.org",
    next_race_date: "2027-06-28",
    registration_info: "Lottery + qualifier",
    image_url: null,
    cover_image_url: null,
    created_at: "2026-02-01T10:00:00Z",
    race_participations: [],
    race_resources: [],
  },
];

export const SAMPLE_HIERARCHICAL_PLAN = {
  id: "hp-1",
  user_id: "user-1",
  status: "active",
  plan_data: {
    raceGoal: {
      eventName: "Stockholm Marathon",
      eventDate: "2026-09-12",
    },
    phases: [
      {
        name: "Base",
        startWeek: 1,
        endWeek: 2,
        focus: "Settle into aerobic consistency and durable volume.",
        weeklyHoursRange: "6-8 hr",
      },
      {
        name: "Build",
        startWeek: 3,
        endWeek: 4,
        focus: "Layer in marathon-specific quality and longer steady work.",
        weeklyHoursRange: "7-9 hr",
      },
      {
        name: "Peak",
        startWeek: 5,
        endWeek: 6,
        focus: "Sharpen race-specific execution without losing freshness.",
        weeklyHoursRange: "6-8 hr",
      },
      {
        name: "Taper",
        startWeek: 7,
        endWeek: 8,
        focus: "Reduce fatigue, preserve rhythm, and arrive ready to race.",
        weeklyHoursRange: "4-5 hr",
      },
    ],
    weeks: [
      {
        weekNumber: 1,
        startDate: "2026-03-02",
        endDate: "2026-03-08",
        phase: "Base",
        focus: "Ease into consistent aerobic work and finish the week relaxed.",
        targetHours: 6.5,
        isRecoveryWeek: false,
        summary: { totalHours: 6.5, totalKm: 48, sessions: 5 },
        days: [
          {
            date: "2026-03-02",
            dayOfWeek: "Mon",
            workouts: [
              {
                id: "w-1",
                sport: "Run",
                type: "Easy",
                name: "Easy aerobic",
                description: "Steady conversational volume.",
                durationMinutes: 50,
                distanceKm: 9,
                primaryZone: "Z2",
                humanReadable: "50 min easy with relaxed form.",
                completed: false,
              },
            ],
          },
          { date: "2026-03-03", dayOfWeek: "Tue", workouts: [] },
          {
            date: "2026-03-04",
            dayOfWeek: "Wed",
            workouts: [
              {
                id: "w-2",
                sport: "Run",
                type: "Workout",
                name: "Hill reps",
                description: "Short uphill efforts.",
                durationMinutes: 60,
                distanceKm: 11,
                primaryZone: "Z4",
                humanReadable: "8 x 45 sec uphill, jog down recoveries.",
                completed: false,
              },
            ],
          },
          { date: "2026-03-05", dayOfWeek: "Thu", workouts: [] },
          {
            date: "2026-03-06",
            dayOfWeek: "Fri",
            workouts: [
              {
                id: "w-3",
                sport: "Run",
                type: "Recovery",
                name: "Shakeout",
                description: "Keep it soft.",
                durationMinutes: 35,
                distanceKm: 6,
                primaryZone: "Z1",
                humanReadable: "35 min recovery jog.",
                completed: false,
              },
            ],
          },
          { date: "2026-03-07", dayOfWeek: "Sat", workouts: [] },
          {
            date: "2026-03-08",
            dayOfWeek: "Sun",
            workouts: [
              {
                id: "w-4",
                sport: "Run",
                type: "Long Run",
                name: "Long aerobic",
                description: "Durable easy endurance.",
                durationMinutes: 105,
                distanceKm: 22,
                primaryZone: "Z2",
                humanReadable: "22 km easy, last 15 min slightly stronger.",
                completed: false,
              },
            ],
          },
        ],
      },
      {
        weekNumber: 2,
        startDate: "2026-03-09",
        endDate: "2026-03-15",
        phase: "Base",
        focus: "Recovery absorb week with lighter volume and simple rhythm.",
        targetHours: 5,
        isRecoveryWeek: true,
        summary: { totalHours: 5, totalKm: 36, sessions: 4 },
        days: [
          { date: "2026-03-09", dayOfWeek: "Mon", workouts: [] },
          {
            date: "2026-03-10",
            dayOfWeek: "Tue",
            workouts: [
              {
                id: "w-5",
                sport: "Run",
                type: "Easy",
                name: "Aerobic reset",
                description: "Keep this one short.",
                durationMinutes: 40,
                distanceKm: 7,
                primaryZone: "Z2",
                humanReadable: "40 min easy, finish feeling better than you started.",
                completed: false,
              },
            ],
          },
          { date: "2026-03-11", dayOfWeek: "Wed", workouts: [] },
          { date: "2026-03-12", dayOfWeek: "Thu", workouts: [] },
          {
            date: "2026-03-13",
            dayOfWeek: "Fri",
            workouts: [
              {
                id: "w-6",
                sport: "Run",
                type: "Workout",
                name: "Tempo touch",
                description: "Controlled threshold work.",
                durationMinutes: 55,
                distanceKm: 10,
                primaryZone: "Z3",
                humanReadable: "3 x 8 min steady tempo with full recovery.",
                completed: false,
              },
            ],
          },
          { date: "2026-03-14", dayOfWeek: "Sat", workouts: [] },
          {
            date: "2026-03-15",
            dayOfWeek: "Sun",
            workouts: [
              {
                id: "w-7",
                sport: "Run",
                type: "Long Run",
                name: "Cutback long run",
                description: "Keep the effort smooth.",
                durationMinutes: 85,
                distanceKm: 19,
                primaryZone: "Z2",
                humanReadable: "19 km comfortable with no hard finish.",
                completed: false,
              },
            ],
          },
        ],
      },
      {
        weekNumber: 3,
        startDate: "2026-03-16",
        endDate: "2026-03-22",
        phase: "Build",
        focus: "Extend marathon-specific strength and long-run purpose.",
        targetHours: 7.5,
        isRecoveryWeek: false,
        summary: { totalHours: 7.5, totalKm: 58, sessions: 6 },
        days: [
          {
            date: "2026-03-16",
            dayOfWeek: "Mon",
            workouts: [
              {
                id: "w-8",
                sport: "Run",
                type: "Easy",
                name: "Reset mileage",
                description: "Light aerobic volume.",
                durationMinutes: 45,
                distanceKm: 8,
                primaryZone: "Z2",
                humanReadable: "45 min easy on soft ground.",
                completed: false,
              },
            ],
          },
          {
            date: "2026-03-17",
            dayOfWeek: "Tue",
            workouts: [
              {
                id: "w-9",
                sport: "Run",
                type: "Workout",
                name: "Cruise intervals",
                description: "Threshold support.",
                durationMinutes: 70,
                distanceKm: 13,
                primaryZone: "Z3",
                humanReadable: "5 x 2 km at marathon to threshold effort.",
                completed: false,
              },
            ],
          },
          { date: "2026-03-18", dayOfWeek: "Wed", workouts: [] },
          {
            date: "2026-03-19",
            dayOfWeek: "Thu",
            workouts: [
              {
                id: "w-10",
                sport: "Run",
                type: "Medium Long",
                name: "Steady medium long",
                description: "Controlled volume.",
                durationMinutes: 80,
                distanceKm: 15,
                primaryZone: "Z2",
                humanReadable: "80 min steady, relaxed posture all day.",
                completed: false,
              },
            ],
          },
          { date: "2026-03-20", dayOfWeek: "Fri", workouts: [] },
          {
            date: "2026-03-21",
            dayOfWeek: "Sat",
            workouts: [
              {
                id: "w-11",
                sport: "Strength",
                type: "Strength",
                name: "Gym maintenance",
                description: "Short general strength.",
                durationMinutes: 35,
                distanceKm: null,
                primaryZone: null,
                humanReadable: "35 min full-body stability and mobility.",
                completed: false,
              },
            ],
          },
          {
            date: "2026-03-22",
            dayOfWeek: "Sun",
            workouts: [
              {
                id: "w-12",
                sport: "Run",
                type: "Long Run",
                name: "Marathon finish long run",
                description: "Late progression.",
                durationMinutes: 125,
                distanceKm: 22,
                primaryZone: "Z3",
                humanReadable: "22 km with final 6 km at marathon effort.",
                completed: false,
              },
            ],
          },
        ],
      },
      {
        weekNumber: 4,
        startDate: "2026-03-23",
        endDate: "2026-03-29",
        phase: "Build",
        focus: "Keep the workload stable and smooth before sharpening later.",
        targetHours: 8,
        isRecoveryWeek: false,
        summary: { totalHours: 8, totalKm: 60, sessions: 6 },
        days: Array.from({ length: 7 }, (_, index) => ({
          date: `2026-03-${String(23 + index).padStart(2, "0")}`,
          dayOfWeek: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][index],
          workouts: index === 6 ? [{
            id: "w-13",
            sport: "Run",
            type: "Long Run",
            name: "Durable long run",
            description: "Steady long aerobic work.",
            durationMinutes: 130,
            distanceKm: 24,
            primaryZone: "Z2",
            humanReadable: "24 km easy over rolling terrain.",
            completed: false,
          }] : [],
        })),
      },
      {
        weekNumber: 5,
        startDate: "2026-03-30",
        endDate: "2026-04-05",
        phase: "Peak",
        focus: "Race-specific density with careful fatigue control.",
        targetHours: 7,
        isRecoveryWeek: false,
        summary: { totalHours: 7, totalKm: 54, sessions: 5 },
        days: Array.from({ length: 7 }, (_, index) => ({
          date: `2026-04-${String(index + 1).padStart(2, "0")}`,
          dayOfWeek: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][index],
          workouts: index === 1 ? [{
            id: "w-14",
            sport: "Run",
            type: "Workout",
            name: "Peak marathon session",
            description: "Specific marathon prep.",
            durationMinutes: 75,
            distanceKm: 14,
            primaryZone: "Z3",
            humanReadable: "2 x 5 km at marathon effort with easy float.",
            completed: false,
          }] : [],
        })),
      },
      {
        weekNumber: 6,
        startDate: "2026-04-06",
        endDate: "2026-04-12",
        phase: "Peak",
        focus: "Final quality week with freshness preserved.",
        targetHours: 6.5,
        isRecoveryWeek: false,
        summary: { totalHours: 6.5, totalKm: 50, sessions: 5 },
        days: Array.from({ length: 7 }, (_, index) => ({
          date: `2026-04-${String(index + 6).padStart(2, "0")}`,
          dayOfWeek: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][index],
          workouts: [],
        })),
      },
      {
        weekNumber: 7,
        startDate: "2026-04-13",
        endDate: "2026-04-19",
        phase: "Taper",
        focus: "Cut volume while keeping the legs awake.",
        targetHours: 5,
        isRecoveryWeek: false,
        summary: { totalHours: 5, totalKm: 38, sessions: 4 },
        days: Array.from({ length: 7 }, (_, index) => ({
          date: `2026-04-${String(index + 13).padStart(2, "0")}`,
          dayOfWeek: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][index],
          workouts: [],
        })),
      },
      {
        weekNumber: 8,
        startDate: "2026-04-20",
        endDate: "2026-04-26",
        phase: "Taper",
        focus: "Stay sharp and rested for race week.",
        targetHours: 4,
        isRecoveryWeek: false,
        summary: { totalHours: 4, totalKm: 26, sessions: 3 },
        days: Array.from({ length: 7 }, (_, index) => ({
          date: `2026-04-${String(index + 20).padStart(2, "0")}`,
          dayOfWeek: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][index],
          workouts: [],
        })),
      },
    ],
  },
};

/**
 * Build a complete AppData context value.
 * Pass overrides to customise individual slices for a specific test.
 */
export function makeAppData(overrides = {}) {
  const invokeInsightsSynthesis = vi.fn().mockResolvedValue({
    synthesis: [
      "Mileage Trend: volume is stable and gradually rising.",
      "Intensity Distribution: intensity remains mostly aerobic with one quality focus.",
      "Long-Run Progression: long runs are progressing with manageable fatigue cost.",
      "Race Readiness: consistency and recovery suggest readiness is improving.",
    ].join("\n"),
  });

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
      checkins: SAMPLE_CHECKINS,
      loading: false,
      loadCheckins: vi.fn().mockResolvedValue(SAMPLE_CHECKINS),
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
      loadEntriesForRange: vi.fn().mockResolvedValue(SAMPLE_WORKOUT_ENTRIES),
      previewStructuredPlanApply: vi.fn().mockResolvedValue({
        protectedDates: [],
        replaceableDates: [],
        reviewRequired: false,
        structuredPlan: SAMPLE_WORKOUT_ENTRIES,
      }),
      applyStructuredPlan: vi.fn().mockResolvedValue(SAMPLE_WORKOUT_ENTRIES),
      applyLongTermWeeklyStructure: vi.fn().mockResolvedValue(SAMPLE_WORKOUT_ENTRIES),
      createEntry: vi.fn().mockResolvedValue(SAMPLE_WORKOUT_ENTRIES[0]),
      updateEntry: vi.fn().mockResolvedValue(SAMPLE_WORKOUT_ENTRIES[0]),
      deleteEntry: vi.fn().mockResolvedValue(undefined),
      toggleCompleted: vi.fn().mockResolvedValue(undefined),
    },
    coachConversations: {
      sessions: [],
      messages: [],
      activeSessionId: null,
      loading: false,
      error: null,
      setActiveSessionId: vi.fn().mockResolvedValue(undefined),
      startNewSession: vi.fn().mockReturnValue("new-session-id"),
      reload: vi.fn().mockResolvedValue(undefined),
      loadSessions: vi.fn().mockResolvedValue([]),
    },
    hierarchicalPlan: {
      plan: SAMPLE_HIERARCHICAL_PLAN,
      loading: false,
      generating: false,
      error: null,
      loadPlan: vi.fn().mockResolvedValue(SAMPLE_HIERARCHICAL_PLAN),
      generatePlan: vi.fn().mockResolvedValue(SAMPLE_HIERARCHICAL_PLAN),
      applyPatch: vi.fn().mockResolvedValue(SAMPLE_HIERARCHICAL_PLAN),
      toggleWorkoutCompleted: vi.fn().mockResolvedValue(SAMPLE_HIERARCHICAL_PLAN),
      moveWorkout: vi.fn().mockResolvedValue(SAMPLE_HIERARCHICAL_PLAN),
      addWorkout: vi.fn().mockResolvedValue(SAMPLE_HIERARCHICAL_PLAN),
      getWeek: vi.fn().mockImplementation((weekNumber) =>
        SAMPLE_HIERARCHICAL_PLAN.plan_data.weeks.find((week) => week.weekNumber === weekNumber) ?? null
      ),
      getPhases: vi.fn().mockReturnValue(SAMPLE_HIERARCHICAL_PLAN.plan_data.phases),
    },
    races: {
      races: SAMPLE_RACES,
      loading: false,
      error: null,
      loadRaces: vi.fn().mockResolvedValue(SAMPLE_RACES),
      createRace: vi.fn().mockResolvedValue(SAMPLE_RACES[0]),
      updateRace: vi.fn().mockResolvedValue(SAMPLE_RACES[0]),
      deleteRace: vi.fn().mockResolvedValue(undefined),
      addParticipation: vi.fn().mockResolvedValue(SAMPLE_RACES[0].race_participations[0]),
      updateParticipation: vi.fn().mockResolvedValue(SAMPLE_RACES[0].race_participations[0]),
      deleteParticipation: vi.fn().mockResolvedValue(undefined),
      addResource: vi.fn().mockResolvedValue(SAMPLE_RACES[0].race_resources[0]),
      deleteResource: vi.fn().mockResolvedValue(undefined),
    },
    invokeInsightsSynthesis,
    ...overrides,
  };
}
