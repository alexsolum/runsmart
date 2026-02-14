// ---- Supabase client ----

const isSupabaseConfigured =
  typeof SUPABASE_URL !== "undefined" &&
  SUPABASE_URL !== "YOUR_SUPABASE_URL" &&
  typeof SUPABASE_ANON_KEY !== "undefined" &&
  SUPABASE_ANON_KEY !== "YOUR_SUPABASE_ANON_KEY";

const isStravaConfigured =
  typeof STRAVA_CLIENT_ID !== "undefined" &&
  STRAVA_CLIENT_ID !== "YOUR_STRAVA_CLIENT_ID";

let db = null;
if (isSupabaseConfigured) {
  db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

// ---- DOM refs ----

const actions = document.querySelectorAll("[data-action]");
const planForm = document.querySelector(".plan-form");
const formNote = document.querySelector(".form-note");
const menuToggle = document.querySelector(".menu-toggle");
const mobileNav = document.querySelector(".mobile-nav");
const authModal = document.getElementById("auth-modal");
const authForm = document.getElementById("auth-form");
const authError = document.querySelector(".auth-error");
const authTabs = document.querySelectorAll(".modal-tab");
const signinBtn = document.getElementById("signin-btn");
const signoutBtn = document.getElementById("signout-btn");
const userEmailEl = document.getElementById("user-email");
const myPlans = document.getElementById("my-plans");
const plansList = document.getElementById("plans-list");

// Strava DOM refs
const stravaConnectBtn = document.getElementById("strava-connect-btn");
const stravaSyncBtn = document.getElementById("strava-sync-btn");
const stravaDisconnectBtn = document.getElementById("strava-disconnect-btn");
const stravaDisconnected = document.getElementById("strava-disconnected");
const stravaConnected = document.getElementById("strava-connected");
const lastSyncTime = document.getElementById("last-sync-time");
const activitiesSection = document.getElementById("activities-section");
const activitiesList = document.getElementById("activities-list");

// New feature DOM refs
const heroCardStatic = document.getElementById("hero-card-static");
const heroCardDynamic = document.getElementById("hero-card-dynamic");
const blockCalendar = document.getElementById("block-calendar");
const blockTimeline = document.getElementById("block-timeline");
const blockDetails = document.getElementById("block-details");
const trainingLoadSection = document.getElementById("training-load-section");
const longRunSection = document.getElementById("long-run-section");
const checkinSection = document.getElementById("checkin-section");
const checkinForm = document.getElementById("checkin-form");
const checkinHistory = document.getElementById("checkin-history");
const weeklyDashboard = document.getElementById("weekly-dashboard");
const currentWeekSummary = document.getElementById("current-week-summary");
const weeklyHistoryEl = document.getElementById("weekly-history");
const manualEntrySection = document.getElementById("manual-entry-section");
const manualEntryForm = document.getElementById("manual-entry-form");

let currentAuthMode = "signin";
let currentUser = null;
let cachedPlans = [];
let cachedAllActivities = [];

// ---- Auth functions ----

async function signIn(email, password) {
  const { data, error } = await db.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

async function signUp(email, password) {
  const { data, error } = await db.auth.signUp({ email, password });
  if (error) throw error;
  return data;
}

async function signInWithGoogle() {
  const { error } = await db.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: window.location.origin + window.location.pathname,
    },
  });
  if (error) throw error;
}

async function signOut() {
  const { error } = await db.auth.signOut();
  if (error) throw error;
}

// ---- Plan functions ----

async function loadPlans() {
  const { data, error } = await db
    .from("training_plans")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

async function createPlan(plan) {
  const { data, error } = await db
    .from("training_plans")
    .insert([{ ...plan, user_id: currentUser.id }])
    .select();
  if (error) throw error;
  return data[0];
}

async function deletePlan(id) {
  const { error } = await db
    .from("training_plans")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

// ---- Strava functions ----

function startStravaOAuth() {
  const redirectUri = window.location.origin + window.location.pathname;
  const scope = "activity:read_all";
  const url =
    "https://www.strava.com/oauth/authorize" +
    "?client_id=" + encodeURIComponent(STRAVA_CLIENT_ID) +
    "&redirect_uri=" + encodeURIComponent(redirectUri) +
    "&response_type=code" +
    "&scope=" + encodeURIComponent(scope) +
    "&approval_prompt=auto";
  window.location.href = url;
}

async function exchangeStravaCode(code) {
  const { data: { session } } = await db.auth.getSession();
  if (!session) return;

  const res = await fetch(SUPABASE_URL + "/functions/v1/strava-auth", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + session.access_token,
      apikey: SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ code }),
  });

  const result = await res.json();
  if (!res.ok) throw new Error(result.error || "Strava connection failed");
  return result;
}

async function syncStrava() {
  const { data: { session } } = await db.auth.getSession();
  if (!session) return;

  const res = await fetch(SUPABASE_URL + "/functions/v1/strava-sync", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + session.access_token,
      apikey: SUPABASE_ANON_KEY,
    },
  });

  const result = await res.json();
  if (!res.ok) throw new Error(result.error || "Sync failed");
  return result;
}

async function disconnectStrava() {
  const { error } = await db
    .from("strava_connections")
    .delete()
    .eq("user_id", currentUser.id);
  if (error) throw error;
}

async function checkStravaConnection() {
  const { data, error } = await db
    .from("strava_connections")
    .select("strava_athlete_id, updated_at")
    .eq("user_id", currentUser.id)
    .maybeSingle();

  if (error || !data) {
    showStravaDisconnected();
    return false;
  }

  showStravaConnected(data.updated_at);
  return true;
}

// ---- Activity functions ----

async function loadActivities() {
  const { data, error } = await db
    .from("activities")
    .select("*")
    .order("started_at", { ascending: false })
    .limit(20);
  if (error) throw error;
  return data;
}

async function loadAllActivities() {
  const { data, error } = await db
    .from("activities")
    .select("*")
    .order("started_at", { ascending: true })
    .limit(500);
  if (error) throw error;
  return data;
}

async function updateActivityRpe(id, rating) {
  const { error } = await db
    .from("activities")
    .update({ effort_rating: rating })
    .eq("id", id);
  if (error) throw error;
}

async function createManualActivity(activity) {
  const { data, error } = await db
    .from("activities")
    .insert([{ ...activity, user_id: currentUser.id }])
    .select();
  if (error) throw error;
  return data[0];
}

// ---- Check-in functions ----

async function loadCheckins() {
  const { data, error } = await db
    .from("athlete_feedback")
    .select("*")
    .order("week_of", { ascending: false })
    .limit(8);
  if (error) throw error;
  return data;
}

async function createCheckin(checkin) {
  const { data, error } = await db
    .from("athlete_feedback")
    .insert([{ ...checkin, user_id: currentUser.id }])
    .select();
  if (error) throw error;
  return data[0];
}

// ---- Computation helpers ----

function getWeekStart(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function computeWeeklySummary(activities) {
  const weeks = {};
  activities.forEach(function (a) {
    var ws = getWeekStart(new Date(a.started_at));
    var key = ws.toISOString().split("T")[0];
    if (!weeks[key]) weeks[key] = { distance: 0, elevation: 0, time: 0, count: 0 };
    weeks[key].distance += Number(a.distance) || 0;
    weeks[key].elevation += Number(a.elevation_gain) || 0;
    weeks[key].time += Number(a.moving_time) || 0;
    weeks[key].count++;
  });
  return weeks;
}

function computeTrainingBlocks(plan) {
  var today = new Date();
  var raceDate = new Date(plan.race_date);
  var totalWeeks = Math.max(4, Math.ceil((raceDate - today) / (7 * 24 * 60 * 60 * 1000)));

  var baseWeeks = Math.max(1, Math.round(totalWeeks * 0.30));
  var buildWeeks = Math.max(1, Math.round(totalWeeks * 0.30));
  var peakWeeks = Math.max(1, Math.round(totalWeeks * 0.25));
  var taperWeeks = Math.max(1, totalWeeks - baseWeeks - buildWeeks - peakWeeks);

  var baseMileage = plan.current_mileage || 30;

  var blocks = [
    { name: "Base", weeks: baseWeeks, startMi: baseMileage, endMi: Math.round(baseMileage * 1.15), color: "#3b82f6", desc: "Aerobic foundation, easy volume" },
    { name: "Build", weeks: buildWeeks, startMi: Math.round(baseMileage * 1.15), endMi: Math.round(baseMileage * 1.35), color: "#f59e0b", desc: "Intensity + specificity" },
    { name: "Peak", weeks: peakWeeks, startMi: Math.round(baseMileage * 1.35), endMi: Math.round(baseMileage * 1.45), color: "#ef4444", desc: "Race-specific simulation" },
    { name: "Taper", weeks: taperWeeks, startMi: Math.round(baseMileage * 0.7), endMi: Math.round(baseMileage * 0.5), color: "#22c55e", desc: "Recovery + sharpening" },
  ];

  if (plan.b2b_long_runs) {
    blocks[1].desc += " + B2B long weekends";
    blocks[2].desc += " + B2B long weekends";
  }

  return blocks;
}

function computeCurrentBlock(plan) {
  var blocks = computeTrainingBlocks(plan);
  var today = new Date();
  var raceDate = new Date(plan.race_date);
  var totalWeeks = Math.max(4, Math.ceil((raceDate - today) / (7 * 24 * 60 * 60 * 1000)));
  var weeksOut = totalWeeks;
  var elapsed = 0;

  for (var i = 0; i < blocks.length; i++) {
    elapsed += blocks[i].weeks;
    if (elapsed >= (totalWeeks - weeksOut + 1) || i === blocks.length - 1) {
      return blocks[i];
    }
  }
  return blocks[0];
}

function computeTrainingLoad(activities) {
  if (!activities.length) return [];

  var sorted = activities.slice().sort(function (a, b) {
    return new Date(a.started_at) - new Date(b.started_at);
  });

  var dailyLoad = {};
  sorted.forEach(function (a) {
    var day = new Date(a.started_at).toISOString().split("T")[0];
    dailyLoad[day] = (dailyLoad[day] || 0) + (Number(a.moving_time) || 0) / 60;
  });

  var firstDay = new Date(sorted[0].started_at);
  var today = new Date();
  var days = [];
  for (var d = new Date(firstDay); d <= today; d.setDate(d.getDate() + 1)) {
    var key = d.toISOString().split("T")[0];
    days.push({ date: key, load: dailyLoad[key] || 0 });
  }

  var alphaATL = 2 / (7 + 1);
  var alphaCTL = 2 / (42 + 1);
  var atl = 0, ctl = 0;

  return days.map(function (d) {
    atl = alphaATL * d.load + (1 - alphaATL) * atl;
    ctl = alphaCTL * d.load + (1 - alphaCTL) * ctl;
    return { date: d.date, atl: atl, ctl: ctl, tsb: ctl - atl };
  });
}

function computeLongRuns(activities) {
  var weeks = {};
  activities
    .filter(function (a) { return a.type === "Run"; })
    .forEach(function (a) {
      var ws = getWeekStart(new Date(a.started_at));
      var key = ws.toISOString().split("T")[0];
      var dist = Number(a.distance) || 0;
      if (!weeks[key] || dist > weeks[key].distance) {
        weeks[key] = {
          distance: dist,
          time: Number(a.moving_time) || 0,
          elevation: Number(a.elevation_gain) || 0,
          name: a.name,
        };
      }
    });

  return Object.entries(weeks).sort(function (a, b) { return a[0].localeCompare(b[0]); });
}

// ---- Format helpers ----

function escapeHtml(str) {
  var el = document.createElement("span");
  el.textContent = str;
  return el.innerHTML;
}

function formatDistance(meters) {
  if (!meters) return "\u2014";
  return (meters / 1609.344).toFixed(1) + " mi";
}

function formatDuration(seconds) {
  if (!seconds) return "\u2014";
  var h = Math.floor(seconds / 3600);
  var m = Math.floor((seconds % 3600) / 60);
  var s = seconds % 60;
  if (h > 0) return h + "h " + m + "m";
  return m + "m " + s + "s";
}

function formatPace(secPerKm) {
  if (!secPerKm) return "\u2014";
  var secPerMile = secPerKm * 1.60934;
  var m = Math.floor(secPerMile / 60);
  var s = Math.round(secPerMile % 60);
  return m + ":" + String(s).padStart(2, "0") + " /mi";
}

function formatElevation(meters) {
  if (!meters) return "\u2014";
  return Math.round(meters * 3.28084).toLocaleString() + " ft";
}

function rpeClass(val) {
  if (val <= 4) return "easy";
  if (val <= 7) return "moderate";
  return "hard";
}

function trendArrow(current, previous) {
  if (!previous || previous === 0) return { text: "", cls: "flat" };
  var pct = Math.round(((current - previous) / previous) * 100);
  if (pct > 2) return { text: "+" + pct + "%", cls: "up" };
  if (pct < -2) return { text: pct + "%", cls: "down" };
  return { text: "~", cls: "flat" };
}

// ---- UI: Auth ----

function updateAuthUI(user) {
  currentUser = user;
  if (user) {
    signinBtn.hidden = true;
    signoutBtn.hidden = false;
    userEmailEl.hidden = false;
    userEmailEl.textContent = user.email;
    myPlans.hidden = false;
    manualEntrySection.hidden = false;
    checkinSection.hidden = false;
    refreshAll();
  } else {
    signinBtn.hidden = false;
    signoutBtn.hidden = true;
    userEmailEl.hidden = true;
    userEmailEl.textContent = "";
    myPlans.hidden = true;
    plansList.innerHTML = "";
    showStravaDisconnected();
    activitiesSection.hidden = true;
    activitiesList.innerHTML = "";
    weeklyDashboard.hidden = true;
    manualEntrySection.hidden = true;
    checkinSection.hidden = true;
    blockCalendar.hidden = true;
    trainingLoadSection.hidden = true;
    longRunSection.hidden = true;
    heroCardStatic.hidden = false;
    heroCardDynamic.hidden = true;
  }
}

async function refreshAll() {
  refreshPlans();
  checkStravaConnection().then(function (connected) {
    if (connected) refreshActivities();
  });
  refreshAllActivitiesAndCharts();
  refreshCheckins();
}

// ---- UI: Strava ----

function showStravaDisconnected() {
  stravaDisconnected.hidden = false;
  stravaConnected.hidden = true;
  activitiesSection.hidden = true;
}

function showStravaConnected(updatedAt) {
  stravaDisconnected.hidden = true;
  stravaConnected.hidden = false;
  activitiesSection.hidden = false;
  if (updatedAt) {
    lastSyncTime.textContent = new Date(updatedAt).toLocaleString();
  }
}

// ---- UI: Plans ----

async function refreshPlans() {
  try {
    cachedPlans = await loadPlans();
    renderPlans(cachedPlans);
    renderRaceCountdown(cachedPlans);
    renderBlockCalendar(cachedPlans);
  } catch (err) {
    plansList.innerHTML = '<p class="muted">Could not load plans.</p>';
  }
}

function renderPlans(plans) {
  if (!plans.length) {
    plansList.innerHTML =
      '<p class="muted">No plans yet. Use the form above to create your first plan.</p>';
    return;
  }

  plansList.innerHTML = plans
    .map(function (plan) {
      return '<div class="plan-card">' +
        '<div class="plan-card-header">' +
        '<h4>' + escapeHtml(plan.race) + '</h4>' +
        '<button class="plan-delete" data-plan-id="' + plan.id + '" aria-label="Delete plan">&times;</button>' +
        '</div>' +
        '<div class="plan-card-details">' +
        '<div><span class="label">Race date</span><strong>' + escapeHtml(plan.race_date) + '</strong></div>' +
        '<div><span class="label">Days/week</span><strong>' + plan.availability + '</strong></div>' +
        '<div><span class="label">Mileage</span><strong>' + (plan.current_mileage || "\u2014") + ' mi/wk</strong></div>' +
        '</div>' +
        (plan.constraints ? '<p class="plan-card-constraints">' + escapeHtml(plan.constraints) + '</p>' : '') +
        (plan.b2b_long_runs ? '<span class="plan-card-b2b">B2B long runs</span>' : '') +
        '<p class="plan-card-date">Created ' + new Date(plan.created_at).toLocaleDateString() + '</p>' +
        '</div>';
    })
    .join("");

  plansList.querySelectorAll(".plan-delete").forEach(function (btn) {
    btn.addEventListener("click", async function () {
      if (confirm("Delete this plan?")) {
        try {
          await deletePlan(btn.dataset.planId);
          refreshPlans();
        } catch (err) {
          alert("Could not delete plan.");
        }
      }
    });
  });
}

// ---- UI: Race countdown ----

function renderRaceCountdown(plans) {
  var futurePlans = plans.filter(function (p) { return new Date(p.race_date) > new Date(); });

  if (!futurePlans.length) {
    heroCardStatic.hidden = false;
    heroCardDynamic.hidden = true;
    return;
  }

  futurePlans.sort(function (a, b) { return new Date(a.race_date) - new Date(b.race_date); });
  var plan = futurePlans[0];
  var raceDate = new Date(plan.race_date);
  var weeksOut = Math.ceil((raceDate - new Date()) / (7 * 24 * 60 * 60 * 1000));
  var block = computeCurrentBlock(plan);

  heroCardStatic.hidden = true;
  heroCardDynamic.hidden = false;
  heroCardDynamic.innerHTML =
    '<h3>' + escapeHtml(plan.race) + '</h3>' +
    '<p class="muted">' + raceDate.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" }) + '</p>' +
    '<div class="countdown-grid">' +
    '<div><span class="countdown-weeks">' + weeksOut + '</span><br><span class="countdown-unit">weeks out</span></div>' +
    '<div><span class="label">Current block</span><strong>' + block.name + '</strong></div>' +
    '<div><span class="label">Target mileage</span><strong>' + block.startMi + '–' + block.endMi + ' mi</strong></div>' +
    '<div><span class="label">Readiness</span><strong class="positive">On track</strong></div>' +
    '</div>' +
    (plan.b2b_long_runs ? '<p class="card-note">B2B long run weekends are active during Build and Peak phases.</p>' : '<p class="card-note">"Stay consistent with your ' + block.name.toLowerCase() + ' phase work. Trust the process."</p>');
}

// ---- UI: Training block calendar ----

function renderBlockCalendar(plans) {
  var futurePlans = plans.filter(function (p) { return new Date(p.race_date) > new Date(); });

  if (!futurePlans.length) {
    blockCalendar.hidden = true;
    return;
  }

  var plan = futurePlans[0];
  var blocks = computeTrainingBlocks(plan);

  blockCalendar.hidden = false;

  blockTimeline.innerHTML = blocks.map(function (b) {
    return '<div class="block-bar" style="flex:' + b.weeks + ';background:' + b.color + '">' +
      '<strong>' + b.name + '</strong>' +
      '<span>' + b.weeks + ' wk &middot; ' + b.startMi + '–' + b.endMi + ' mi</span>' +
      '</div>';
  }).join("");

  blockDetails.innerHTML = blocks.map(function (b) {
    return '<div class="block-detail-card">' +
      '<h5 style="color:' + b.color + '">' + b.name + '</h5>' +
      '<p>' + b.weeks + ' weeks</p>' +
      '<p>' + b.startMi + '–' + b.endMi + ' mi/wk</p>' +
      '<p>' + b.desc + '</p>' +
      '</div>';
  }).join("");
}

// ---- UI: Activities (ultra-focused) ----

async function refreshActivities() {
  try {
    var activities = await loadActivities();
    renderActivities(activities);
  } catch (err) {
    activitiesList.innerHTML = '<p class="muted">Could not load activities.</p>';
  }
}

function renderActivities(activities) {
  if (!activities || !activities.length) {
    activitiesList.innerHTML =
      '<p class="muted">No activities synced yet. Click "Sync now" to import from Strava.</p>';
    return;
  }

  activitiesList.innerHTML = activities.map(function (a) {
    var rpeHtml = '<select class="rpe-select" data-activity-id="' + a.id + '">' +
      '<option value="">RPE</option>';
    for (var i = 1; i <= 10; i++) {
      rpeHtml += '<option value="' + i + '"' + (a.effort_rating === i ? ' selected' : '') + '>' + i + '</option>';
    }
    rpeHtml += '</select>';

    return '<div class="activity-card">' +
      '<div class="activity-card-header">' +
      '<h4>' + escapeHtml(a.name) + '</h4>' +
      rpeHtml +
      '</div>' +
      '<span class="activity-card-type">' + escapeHtml(a.type || "Activity") + '</span>' +
      '<div class="activity-card-stats">' +
      '<div><span class="label">Time on feet</span><strong>' + formatDuration(a.moving_time) + '</strong></div>' +
      '<div><span class="label">Distance</span><strong>' + formatDistance(a.distance) + '</strong></div>' +
      '<div><span class="label">Elevation</span><strong>' + formatElevation(a.elevation_gain) + '</strong></div>' +
      '</div>' +
      '<div class="activity-card-secondary">' +
      '<span>Pace: ' + formatPace(a.average_pace) + '</span>' +
      (a.average_heartrate ? '<span>HR: ' + Math.round(a.average_heartrate) + ' bpm</span>' : '') +
      '</div>' +
      '<p class="activity-card-date">' + new Date(a.started_at).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" }) + '</p>' +
      '</div>';
  }).join("");

  // RPE change handlers
  activitiesList.querySelectorAll(".rpe-select").forEach(function (sel) {
    sel.addEventListener("change", async function () {
      var val = parseInt(sel.value, 10);
      if (!val) return;
      try {
        await updateActivityRpe(sel.dataset.activityId, val);
      } catch (err) {
        alert("Could not save RPE.");
      }
    });
  });
}

// ---- UI: Weekly dashboard ----

async function refreshAllActivitiesAndCharts() {
  try {
    cachedAllActivities = await loadAllActivities();
    renderWeeklyDashboard(cachedAllActivities);
    renderTrainingLoadChart(cachedAllActivities);
    renderLongRunChart(cachedAllActivities);
    updateInsightStats(cachedAllActivities);
  } catch (err) {
    // silently fail for charts
  }
}

function renderWeeklyDashboard(activities) {
  if (!activities.length) {
    weeklyDashboard.hidden = true;
    return;
  }

  weeklyDashboard.hidden = false;

  var weeks = computeWeeklySummary(activities);
  var sortedKeys = Object.keys(weeks).sort().reverse();

  if (!sortedKeys.length) return;

  var currentKey = sortedKeys[0];
  var current = weeks[currentKey];
  var prevKey = sortedKeys[1];
  var prev = prevKey ? weeks[prevKey] : null;

  var distTrend = trendArrow(current.distance, prev ? prev.distance : 0);
  var elevTrend = trendArrow(current.elevation, prev ? prev.elevation : 0);
  var timeTrend = trendArrow(current.time, prev ? prev.time : 0);

  currentWeekSummary.innerHTML =
    '<div class="week-stat"><span class="label">Distance</span><strong>' + formatDistance(current.distance) + '</strong><div class="trend ' + distTrend.cls + '">' + distTrend.text + '</div></div>' +
    '<div class="week-stat"><span class="label">Elevation</span><strong>' + formatElevation(current.elevation) + '</strong><div class="trend ' + elevTrend.cls + '">' + elevTrend.text + '</div></div>' +
    '<div class="week-stat"><span class="label">Time on feet</span><strong>' + formatDuration(current.time) + '</strong><div class="trend ' + timeTrend.cls + '">' + timeTrend.text + '</div></div>' +
    '<div class="week-stat"><span class="label">Activities</span><strong>' + current.count + '</strong></div>';

  var historyKeys = sortedKeys.slice(1, 5);
  weeklyHistoryEl.innerHTML = historyKeys.map(function (key) {
    var w = weeks[key];
    var weekLabel = new Date(key).toLocaleDateString(undefined, { month: "short", day: "numeric" });
    return '<div class="week-card">' +
      '<div class="week-card-header">Week of ' + weekLabel + '</div>' +
      '<div class="week-card-stats">' +
      '<div><span class="label">Distance</span><strong>' + formatDistance(w.distance) + '</strong></div>' +
      '<div><span class="label">Elevation</span><strong>' + formatElevation(w.elevation) + '</strong></div>' +
      '<div><span class="label">Time</span><strong>' + formatDuration(w.time) + '</strong></div>' +
      '<div><span class="label">Runs</span><strong>' + w.count + '</strong></div>' +
      '</div></div>';
  }).join("");
}

// ---- UI: Training load chart (ATL/CTL) ----

function renderTrainingLoadChart(activities) {
  if (activities.length < 7) {
    trainingLoadSection.hidden = true;
    return;
  }

  trainingLoadSection.hidden = false;

  var series = computeTrainingLoad(activities);
  if (series.length < 7) return;

  var dates = series.map(function (s) { return s.date; });
  var atl = series.map(function (s) { return Math.round(s.atl * 10) / 10; });
  var ctl = series.map(function (s) { return Math.round(s.ctl * 10) / 10; });
  var tsb = series.map(function (s) { return Math.round(s.tsb * 10) / 10; });

  var traces = [
    { x: dates, y: atl, name: "Fatigue (ATL)", line: { color: "#ef4444", width: 2 } },
    { x: dates, y: ctl, name: "Fitness (CTL)", line: { color: "#3b82f6", width: 2 } },
    { x: dates, y: tsb, name: "Form (TSB)", line: { color: "#22c55e", width: 1, dash: "dot" } },
  ];

  var layout = {
    paper_bgcolor: "transparent",
    plot_bgcolor: "transparent",
    font: { color: "#94a3b8", family: "Inter", size: 12 },
    margin: { t: 20, r: 20, b: 40, l: 40 },
    legend: { orientation: "h", y: 1.1 },
    xaxis: { gridcolor: "rgba(148,163,184,0.15)" },
    yaxis: { title: "Minutes/day", gridcolor: "rgba(148,163,184,0.15)" },
  };

  Plotly.newPlot("training-load-chart", traces, layout, { responsive: true, displayModeBar: false });
}

// ---- UI: Long run progression chart ----

function renderLongRunChart(activities) {
  var longRuns = computeLongRuns(activities);

  if (longRuns.length < 2) {
    longRunSection.hidden = true;
    return;
  }

  longRunSection.hidden = false;

  var dates = longRuns.map(function (lr) {
    return new Date(lr[0]).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  });
  var distances = longRuns.map(function (lr) { return Math.round(lr[1].distance / 1609.344 * 10) / 10; });
  var elevations = longRuns.map(function (lr) { return Math.round(lr[1].elevation * 3.28084); });

  var traces = [
    {
      x: dates,
      y: distances,
      name: "Long run (mi)",
      type: "bar",
      marker: { color: "#3b82f6", borderRadius: 4 },
    },
    {
      x: dates,
      y: elevations,
      name: "Elevation (ft)",
      type: "scatter",
      mode: "lines+markers",
      yaxis: "y2",
      line: { color: "#f59e0b", width: 2 },
      marker: { size: 5 },
    },
  ];

  var layout = {
    paper_bgcolor: "transparent",
    plot_bgcolor: "transparent",
    font: { color: "#94a3b8", family: "Inter", size: 12 },
    margin: { t: 20, r: 50, b: 40, l: 40 },
    legend: { orientation: "h", y: 1.1 },
    xaxis: { gridcolor: "rgba(148,163,184,0.15)" },
    yaxis: { title: "Miles", gridcolor: "rgba(148,163,184,0.15)" },
    yaxis2: { title: "Feet", overlaying: "y", side: "right", gridcolor: "transparent" },
    barmode: "group",
  };

  Plotly.newPlot("long-run-chart", traces, layout, { responsive: true, displayModeBar: false });
}

// ---- UI: Insight stats (dynamic) ----

function updateInsightStats(activities) {
  var series = computeTrainingLoad(activities);
  if (series.length < 7) return;

  var last = series[series.length - 1];
  var formEl = document.getElementById("stat-form");
  var readinessEl = document.getElementById("stat-readiness");
  var riskEl = document.getElementById("stat-risk");

  var tsb = Math.round(last.tsb * 10) / 10;
  formEl.textContent = (tsb >= 0 ? "+" : "") + tsb;
  formEl.className = tsb >= 0 ? "positive" : "";

  if (tsb > 5) {
    readinessEl.textContent = "Fresh";
    readinessEl.className = "positive";
  } else if (tsb > -5) {
    readinessEl.textContent = "Neutral";
    readinessEl.className = "";
  } else {
    readinessEl.textContent = "Fatigued";
    readinessEl.style.color = "#f59e0b";
  }

  var ratio = last.ctl > 0 ? last.atl / last.ctl : 0;
  if (ratio > 1.5) {
    riskEl.textContent = "High";
    riskEl.style.color = "#ef4444";
  } else if (ratio > 1.2) {
    riskEl.textContent = "Moderate";
    riskEl.style.color = "#f59e0b";
  } else {
    riskEl.textContent = "Low";
    riskEl.className = "positive";
  }
}

// ---- UI: Check-ins ----

async function refreshCheckins() {
  try {
    var checkins = await loadCheckins();
    renderCheckins(checkins);
  } catch (err) {
    // silently fail
  }
}

function renderCheckins(checkins) {
  if (!checkins || !checkins.length) {
    checkinHistory.innerHTML = '';
    return;
  }

  // Update latest check-in text
  var latest = checkins[0];
  var latestText = document.getElementById("latest-checkin-text");
  var parts = [];
  if (latest.fatigue >= 4) parts.push("Fatigue is elevated.");
  if (latest.sleep_quality <= 2) parts.push("Sleep quality is low.");
  if (latest.motivation >= 4) parts.push("Motivation is strong.");
  if (latest.niggles) parts.push("Watch: " + latest.niggles + ".");
  if (latest.notes) parts.push(latest.notes);
  latestText.textContent = parts.length ? parts.join(" ") : "Feeling balanced. Keep it up.";

  checkinHistory.innerHTML = checkins.map(function (c) {
    return '<div class="checkin-card">' +
      '<div class="checkin-card-header">Week of ' + new Date(c.week_of).toLocaleDateString(undefined, { month: "short", day: "numeric" }) + '</div>' +
      '<div class="checkin-card-metrics">' +
      '<span>Fatigue: ' + c.fatigue + '/5</span>' +
      '<span>Sleep: ' + c.sleep_quality + '/5</span>' +
      '<span>Motivation: ' + c.motivation + '/5</span>' +
      '</div>' +
      (c.niggles ? '<div class="checkin-card-notes">Niggles: ' + escapeHtml(c.niggles) + '</div>' : '') +
      (c.notes ? '<div class="checkin-card-notes">' + escapeHtml(c.notes) + '</div>' : '') +
      '</div>';
  }).join("");
}

// ---- UI: Modals ----

function showAuthModal() {
  authModal.hidden = false;
  authError.textContent = "";
  authForm.reset();
}

function hideAuthModal() {
  authModal.hidden = true;
  authError.textContent = "";
}

// ---- Event listeners ----

// Navigation actions
actions.forEach(function (button) {
  button.addEventListener("click", function () {
    var action = button.dataset.action;

    if (action === "start-plan" || action === "generate-plan") {
      document.querySelector("#planning").scrollIntoView({ behavior: "smooth" });
      return;
    }

    if (action === "sample-week") {
      document.querySelector("#insights").scrollIntoView({ behavior: "smooth" });
      return;
    }

    if (action === "policy") {
      document.querySelector("#data").scrollIntoView({ behavior: "smooth" });
      return;
    }

    if (action === "signin") {
      if (isSupabaseConfigured) {
        showAuthModal();
      } else {
        alert(
          "Supabase is not configured yet.\n\n" +
            "1. Create a project at supabase.com\n" +
            "2. Run supabase-schema.sql in the SQL Editor\n" +
            "3. Copy your URL and anon key into config.js"
        );
      }
      return;
    }

    if (action === "signout") {
      signOut().then(function () { updateAuthUI(null); });
      return;
    }
  });
});

// Auth modal tabs
authTabs.forEach(function (tab) {
  tab.addEventListener("click", function () {
    currentAuthMode = tab.dataset.tab;
    authTabs.forEach(function (t) { t.classList.toggle("active", t === tab); });
    authForm.querySelector("button[type=submit]").textContent =
      currentAuthMode === "signin" ? "Sign in" : "Create account";
  });
});

// Auth form submit
if (authForm) {
  authForm.addEventListener("submit", async function (event) {
    event.preventDefault();
    var email = authForm.elements.email.value;
    var password = authForm.elements.password.value;
    var submitBtn = authForm.querySelector("button[type=submit]");
    authError.textContent = "";
    authError.style.color = "";
    submitBtn.disabled = true;

    try {
      if (currentAuthMode === "signin") {
        await signIn(email, password);
      } else {
        var result = await signUp(email, password);
        if (result.data.user && !result.data.session) {
          authError.textContent = "Check your email to confirm your account.";
          authError.style.color = "var(--success)";
          submitBtn.disabled = false;
          return;
        }
      }
      hideAuthModal();
    } catch (err) {
      authError.textContent = err.message;
    }
    submitBtn.disabled = false;
  });
}

// Auth modal close
authModal
  .querySelector(".modal-close")
  .addEventListener("click", hideAuthModal);

authModal.addEventListener("click", function (e) {
  if (e.target === authModal) hideAuthModal();
});

// Google sign-in button
var googleSigninBtn = document.getElementById("google-signin-btn");
if (googleSigninBtn) {
  googleSigninBtn.addEventListener("click", async function () {
    try {
      await signInWithGoogle();
    } catch (err) {
      authError.textContent = err.message;
    }
  });
}

// Plan form submit
if (planForm) {
  planForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    var race = planForm.elements.race.value;
    var date = planForm.elements.date.value;
    var availability = planForm.elements.availability.value;
    var mileage = planForm.elements.mileage.value;
    var constraints = planForm.elements.constraints.value;
    var b2b = planForm.elements.b2b.checked;

    if (!currentUser) {
      if (isSupabaseConfigured) {
        formNote.textContent = "Sign in to save your plan.";
        formNote.style.color = "";
        showAuthModal();
      } else {
        formNote.textContent = "Drafting a " + availability + "-day plan for " + race + " on " + date + " with ~" + mileage + " mi/week. Configure Supabase to save plans.";
        formNote.style.color = "";
      }
      return;
    }

    formNote.textContent = "Creating your plan\u2026";
    formNote.style.color = "";

    try {
      await createPlan({
        race: race,
        race_date: date,
        availability: parseInt(availability, 10),
        current_mileage: mileage ? parseInt(mileage, 10) : null,
        constraints: constraints || null,
        b2b_long_runs: b2b,
      });
      formNote.textContent = "Plan created for " + race + "!";
      formNote.style.color = "var(--success)";
      planForm.reset();
      refreshPlans();
    } catch (err) {
      formNote.textContent = "Error: " + err.message;
      formNote.style.color = "#dc2626";
    }
  });
}

// ---- Strava event listeners ----

if (stravaConnectBtn) {
  stravaConnectBtn.addEventListener("click", function () {
    if (!currentUser) {
      if (isSupabaseConfigured) {
        showAuthModal();
      } else {
        alert("Sign in first to connect Strava.");
      }
      return;
    }
    if (!isStravaConfigured) {
      alert(
        "Strava is not configured yet.\n\n" +
          "1. Create an API app at strava.com/settings/api\n" +
          "2. Add your Client ID to config.js\n" +
          "3. Add STRAVA_CLIENT_ID and STRAVA_CLIENT_SECRET as\n" +
          "   Supabase Edge Function secrets"
      );
      return;
    }
    startStravaOAuth();
  });
}

if (stravaSyncBtn) {
  stravaSyncBtn.addEventListener("click", async function () {
    stravaSyncBtn.disabled = true;
    stravaSyncBtn.textContent = "Syncing\u2026";
    try {
      var result = await syncStrava();
      lastSyncTime.textContent = new Date().toLocaleString();
      stravaSyncBtn.textContent = result.synced + " synced";
      refreshActivities();
      refreshAllActivitiesAndCharts();
      setTimeout(function () {
        stravaSyncBtn.textContent = "Sync now";
        stravaSyncBtn.disabled = false;
      }, 2000);
    } catch (err) {
      stravaSyncBtn.textContent = "Sync failed";
      setTimeout(function () {
        stravaSyncBtn.textContent = "Sync now";
        stravaSyncBtn.disabled = false;
      }, 2000);
    }
  });
}

if (stravaDisconnectBtn) {
  stravaDisconnectBtn.addEventListener("click", async function () {
    if (!confirm("Disconnect Strava? Your synced activities will remain.")) return;
    try {
      await disconnectStrava();
      showStravaDisconnected();
      activitiesSection.hidden = true;
    } catch (err) {
      alert("Could not disconnect: " + err.message);
    }
  });
}

// ---- Check-in form ----

if (checkinForm) {
  checkinForm.addEventListener("submit", async function (event) {
    event.preventDefault();
    var note = checkinForm.querySelector(".checkin-note");
    var submitBtn = checkinForm.querySelector("button[type=submit]");
    submitBtn.disabled = true;
    note.textContent = "Saving\u2026";

    var weekOf = getWeekStart(new Date()).toISOString().split("T")[0];
    var planId = cachedPlans.length ? cachedPlans[0].id : null;

    try {
      await createCheckin({
        plan_id: planId,
        week_of: weekOf,
        fatigue: parseInt(checkinForm.elements.fatigue.value, 10),
        sleep_quality: parseInt(checkinForm.elements.sleep_quality.value, 10),
        motivation: parseInt(checkinForm.elements.motivation.value, 10),
        niggles: checkinForm.elements.niggles.value || null,
        notes: checkinForm.elements.notes.value || null,
      });
      note.textContent = "Check-in saved!";
      note.style.color = "var(--success)";
      checkinForm.reset();
      // Reset range display values
      checkinForm.querySelectorAll("input[type=range]").forEach(function (r) {
        r.value = 3;
        var output = r.parentElement.querySelector(".range-val");
        if (output) output.textContent = "3";
      });
      refreshCheckins();
      setTimeout(function () { note.textContent = ""; note.style.color = ""; }, 2000);
    } catch (err) {
      note.textContent = "Error: " + err.message;
      note.style.color = "#ef4444";
    }
    submitBtn.disabled = false;
  });
}

// ---- Manual entry form ----

if (manualEntryForm) {
  manualEntryForm.addEventListener("submit", async function (event) {
    event.preventDefault();
    var note = manualEntryForm.querySelector(".manual-note");
    var submitBtn = manualEntryForm.querySelector("button[type=submit]");
    submitBtn.disabled = true;
    note.textContent = "Saving\u2026";

    var distMiles = parseFloat(manualEntryForm.elements.distance.value) || 0;
    var distMeters = distMiles * 1609.344;
    var durationMin = parseInt(manualEntryForm.elements.duration.value, 10) || 0;
    var durationSec = durationMin * 60;
    var elevFt = parseInt(manualEntryForm.elements.elevation.value, 10) || 0;
    var elevMeters = elevFt / 3.28084;
    var dateVal = manualEntryForm.elements.date.value;
    var effort = parseInt(manualEntryForm.elements.effort.value, 10);

    try {
      await createManualActivity({
        name: manualEntryForm.elements.name.value,
        type: manualEntryForm.elements.type.value,
        distance: distMeters || null,
        duration: durationSec || null,
        elevation_gain: elevMeters || null,
        average_pace: distMeters > 0 ? durationSec / (distMeters / 1000) : null,
        started_at: new Date(dateVal).toISOString(),
        moving_time: durationSec || null,
        elapsed_time: durationSec || null,
        effort_rating: effort,
        source: "manual",
      });
      note.textContent = "Workout saved!";
      note.style.color = "var(--success)";
      manualEntryForm.reset();
      // Reset range display
      var effortOutput = manualEntryForm.querySelector(".range-val");
      if (effortOutput) effortOutput.textContent = "5";
      var effortRange = manualEntryForm.querySelector("input[name=effort]");
      if (effortRange) effortRange.value = 5;
      refreshActivities();
      refreshAllActivitiesAndCharts();
      setTimeout(function () { note.textContent = ""; note.style.color = ""; }, 2000);
    } catch (err) {
      note.textContent = "Error: " + err.message;
      note.style.color = "#dc2626";
    }
    submitBtn.disabled = false;
  });
}

// ---- Range slider value display ----

document.querySelectorAll("input[type=range]").forEach(function (input) {
  var output = input.parentElement.querySelector(".range-val");
  if (output) {
    input.addEventListener("input", function () {
      output.textContent = input.value;
    });
  }
});

// Mobile nav toggle
if (menuToggle && mobileNav) {
  menuToggle.addEventListener("click", function () {
    var isOpen = menuToggle.getAttribute("aria-expanded") === "true";
    menuToggle.setAttribute("aria-expanded", String(!isOpen));
    mobileNav.hidden = isOpen;
  });
}

// ---- Handle Strava OAuth callback ----

function handleStravaCallback() {
  var params = new URLSearchParams(window.location.search);
  var code = params.get("code");
  var scope = params.get("scope");

  if (!code || !scope || !scope.includes("activity")) return;

  var cleanUrl = window.location.origin + window.location.pathname;
  window.history.replaceState({}, document.title, cleanUrl);

  var tryExchange = async function () {
    if (!currentUser) {
      setTimeout(tryExchange, 300);
      return;
    }
    try {
      await exchangeStravaCode(code);
      showStravaConnected(new Date().toISOString());
      syncStrava().then(function () {
        refreshActivities();
        refreshAllActivitiesAndCharts();
      });
      document.querySelector("#data").scrollIntoView({ behavior: "smooth" });
    } catch (err) {
      alert("Strava connection failed: " + err.message);
    }
  };

  tryExchange();
}

// ---- Initialize ----

if (db) {
  db.auth.onAuthStateChange(function (_event, session) {
    updateAuthUI(session ? session.user : null);
  });

  db.auth.getSession().then(function (result) {
    updateAuthUI(result.data.session ? result.data.session.user : null);
  });

  handleStravaCallback();
}
