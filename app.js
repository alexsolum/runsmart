// ---- Supabase client ----

var isSupabaseConfigured =
  typeof SUPABASE_URL !== "undefined" &&
  SUPABASE_URL !== "YOUR_SUPABASE_URL" &&
  typeof SUPABASE_ANON_KEY !== "undefined" &&
  SUPABASE_ANON_KEY !== "YOUR_SUPABASE_ANON_KEY";

var isStravaConfigured =
  typeof STRAVA_CLIENT_ID !== "undefined" &&
  STRAVA_CLIENT_ID !== "YOUR_STRAVA_CLIENT_ID";

var db = null;
if (isSupabaseConfigured) {
  db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

// ---- Aliases from Compute module ----

var getWeekStart = Compute.getWeekStart;
var computeWeeklySummary = Compute.computeWeeklySummary;
var computeTrainingBlocks = Compute.computeTrainingBlocks;
var computeCurrentBlock = Compute.computeCurrentBlock;
var computeTrainingLoad = Compute.computeTrainingLoad;
var computeLongRuns = Compute.computeLongRuns;
var computeKoopPlan = Compute.computeKoopPlan;
var computeWeeklyCalendar = Compute.computeWeeklyCalendar;
var generateCoachingInsights = Compute.generateCoachingInsights;
var formatDistance = Compute.formatDistance;
var formatDuration = Compute.formatDuration;
var formatPace = Compute.formatPace;
var formatElevation = Compute.formatElevation;
var trendArrow = Compute.trendArrow;
var KOOP_PHASES = Compute.KOOP_PHASES;
var KOOP_PHASE_KEYS = Compute.KOOP_PHASE_KEYS;

// ---- DOM refs ----

var actions = document.querySelectorAll("[data-action]");
var planForm = document.querySelector(".plan-form");
var formNote = document.querySelector(".form-note");
var authModal = document.getElementById("auth-modal");
var authForm = document.getElementById("auth-form");
var authError = document.querySelector(".auth-error");
var authTabs = document.querySelectorAll(".modal-tab");
var signinBtn = document.getElementById("signin-btn");
var signoutBtn = document.getElementById("signout-btn");
var userEmailEl = document.getElementById("user-email");
var myPlans = document.getElementById("my-plans");
var plansList = document.getElementById("plans-list");

// Strava DOM refs
var stravaConnectBtn = document.getElementById("strava-connect-btn");
var stravaSyncBtn = document.getElementById("strava-sync-btn");
var stravaDisconnectBtn = document.getElementById("strava-disconnect-btn");
var stravaDisconnected = document.getElementById("strava-disconnected");
var stravaConnected = document.getElementById("strava-connected");
var lastSyncTime = document.getElementById("last-sync-time");
var stravaSyncFeedback = document.getElementById("strava-sync-feedback");
var activitiesSection = document.getElementById("activities-section");
var activitiesList = document.getElementById("activities-list");

// Feature DOM refs
var heroCardStatic = document.getElementById("hero-card-static");
var heroCardDynamic = document.getElementById("hero-card-dynamic");
var blockCalendar = document.getElementById("block-calendar");
var blockTimeline = document.getElementById("block-timeline");
var blockDetails = document.getElementById("block-details");
var trainingLoadSection = document.getElementById("training-load-section");
var longRunSection = document.getElementById("long-run-section");
var checkinSection = document.getElementById("checkin-section");
var checkinForm = document.getElementById("checkin-form");
var checkinHistory = document.getElementById("checkin-history");
var weeklyDashboard = document.getElementById("weekly-dashboard");
var currentWeekSummary = document.getElementById("current-week-summary");
var weeklyHistoryEl = document.getElementById("weekly-history");
var manualEntrySection = document.getElementById("manual-entry-section");
var manualEntryForm = document.getElementById("manual-entry-form");

// Gantt planner DOM refs
var ganttPlanner = document.getElementById("gantt-planner");
var ganttPhaseBar = document.getElementById("gantt-phase-bar");
var ganttVolumeChart = document.getElementById("gantt-volume-chart");
var ganttBody = document.getElementById("gantt-body");

// Weekly calendar DOM refs
var weeklyCalendar = document.getElementById("weekly-calendar");
var weeklyCalLabel = document.getElementById("weekly-cal-label");
var weeklyCalMeta = document.getElementById("weekly-cal-meta");
var weeklyCalGrid = document.getElementById("weekly-cal-grid");
var weeklyCalPrev = document.getElementById("weekly-cal-prev");
var weeklyCalNext = document.getElementById("weekly-cal-next");

// Day edit modal DOM refs
var dayEditModal = document.getElementById("day-edit-modal");
var dayEditClose = document.getElementById("day-edit-close");
var dayEditForm = document.getElementById("day-edit-form");
var dayEditReset = document.getElementById("day-edit-reset");
var dayEditNote = dayEditForm ? dayEditForm.querySelector(".day-edit-note") : null;
var dayEditTitle = document.getElementById("day-edit-title");

// Current editing context
var editingDayIndex = -1;
var editingWeekEntries = {};

// Coach DOM refs
var coachInsightsEl = document.getElementById("coach-insights");

// Sidebar DOM refs
var sidebar = document.getElementById("sidebar");
var sidebarClose = document.getElementById("sidebar-close");
var sidebarOverlay = document.getElementById("sidebar-overlay");
var topbarMenu = document.getElementById("topbar-menu");
var sidebarLinks = document.querySelectorAll(".sidebar-link");

var currentAuthMode = "signin";
var currentUser = null;
var cachedPlans = [];
var cachedAllActivities = [];
var cachedCheckins = [];
var cachedKoopPlan = null;
var cachedCalendarPlan = null;
var calendarWeekIndex = 0;

// ---- Auth functions ----

async function signIn(email, password) {
  var result = await db.auth.signInWithPassword({ email: email, password: password });
  if (result.error) throw result.error;
  return result.data;
}

async function signUp(email, password) {
  var result = await db.auth.signUp({ email: email, password: password });
  if (result.error) throw result.error;
  return result;
}

async function signInWithGoogle() {
  var redirectTo =
    typeof AUTH_REDIRECT_URL === "string" && AUTH_REDIRECT_URL.trim()
      ? AUTH_REDIRECT_URL.trim()
      : window.location.origin + window.location.pathname;

  const { error } = await db.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: redirectTo,
    },
  });
  if (result.error) throw result.error;
}

async function signOut() {
  var result = await db.auth.signOut();
  if (result.error) throw result.error;
}

// ---- Plan functions ----

async function loadPlans() {
  var result = await db
    .from("training_plans")
    .select("*")
    .order("created_at", { ascending: false });
  if (result.error) throw result.error;
  return result.data;
}

async function createPlan(plan) {
  // Try with b2b_long_runs first, fallback without if column doesn't exist
  var payload = { ...plan, user_id: currentUser.id };
  var result = await db
    .from("training_plans")
    .insert([payload])
    .select();

  if (result.error) {
    var msg = result.error.message || "";
    if (msg.includes("b2b_long_runs") && msg.includes("schema cache")) {
      // Column doesn't exist in the live DB — retry without it
      var fallback = { ...payload };
      delete fallback.b2b_long_runs;
      var retry = await db
        .from("training_plans")
        .insert([fallback])
        .select();
      if (retry.error) throw retry.error;
      return retry.data[0];
    }
    throw result.error;
  }
  return result.data[0];
}

async function deletePlan(id) {
  var result = await db
    .from("training_plans")
    .delete()
    .eq("id", id);
  if (result.error) throw result.error;
}

// ---- Strava functions ----

function startStravaOAuth() {
  var redirectUri = window.location.origin + window.location.pathname;
  var scope = "activity:read_all";
  var url =
    "https://www.strava.com/oauth/authorize" +
    "?client_id=" + encodeURIComponent(STRAVA_CLIENT_ID) +
    "&redirect_uri=" + encodeURIComponent(redirectUri) +
    "&response_type=code" +
    "&scope=" + encodeURIComponent(scope) +
    "&approval_prompt=auto";
  window.location.href = url;
}

async function exchangeStravaCode(code) {
  var sessionResult = await db.auth.getSession();
  var session = sessionResult.data.session;
  if (!session) throw new Error("No active session — please sign in first");

  var res = await fetch(SUPABASE_URL + "/functions/v1/strava-auth", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + session.access_token,
      apikey: SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ code: code }),
  });

  var result;
  try {
    result = await res.json();
  } catch (_e) {
    throw new Error("strava-auth returned " + res.status + " (non-JSON response)");
  }
  if (!res.ok) {
    var detail = result.error || result.message || result.msg || JSON.stringify(result);
    throw new Error("strava-auth " + res.status + ": " + detail);
  }
  return result;
}

async function syncStrava() {
  var sessionResult = await db.auth.getSession();
  var session = sessionResult.data.session;
  if (!session) throw new Error("No active session — please sign in first");

  var res = await fetch(SUPABASE_URL + "/functions/v1/strava-sync", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + session.access_token,
      apikey: SUPABASE_ANON_KEY,
    },
  });

  var result;
  try {
    result = await res.json();
  } catch (_e) {
    throw new Error("strava-sync returned " + res.status + " (non-JSON response)");
  }
  if (!res.ok) {
    var detail = result.error || result.message || result.msg || JSON.stringify(result);
    throw new Error("strava-sync " + res.status + ": " + detail);
  }
  return result;
}

async function disconnectStrava() {
  var result = await db
    .from("strava_connections")
    .delete()
    .eq("user_id", currentUser.id);
  if (result.error) throw result.error;
}

async function checkStravaConnection() {
  var result = await db
    .from("strava_connections")
    .select("strava_athlete_id, updated_at")
    .eq("user_id", currentUser.id)
    .maybeSingle();

  if (result.error || !result.data) {
    showStravaDisconnected();
    return false;
  }

  showStravaConnected(result.data.updated_at);
  return true;
}

// ---- Activity functions ----

async function loadActivities() {
  var result = await db
    .from("activities")
    .select("*")
    .order("started_at", { ascending: false })
    .limit(20);
  if (result.error) throw result.error;
  return result.data;
}

async function loadAllActivities() {
  var result = await db
    .from("activities")
    .select("*")
    .order("started_at", { ascending: true })
    .limit(500);
  if (result.error) throw result.error;
  return result.data;
}

async function updateActivityRpe(id, rating) {
  var result = await db
    .from("activities")
    .update({ effort_rating: rating })
    .eq("id", id);
  if (result.error) throw result.error;
}

async function createManualActivity(activity) {
  var result = await db
    .from("activities")
    .insert([{ ...activity, user_id: currentUser.id }])
    .select();
  if (result.error) throw result.error;
  return result.data[0];
}

// ---- Check-in functions ----

async function loadCheckins() {
  var result = await db
    .from("athlete_feedback")
    .select("*")
    .order("week_of", { ascending: false })
    .limit(8);
  if (result.error) throw result.error;
  return result.data;
}

async function createCheckin(checkin) {
  var result = await db
    .from("athlete_feedback")
    .insert([{ ...checkin, user_id: currentUser.id }])
    .select();
  if (result.error) throw result.error;
  return result.data[0];
}

// ---- Weekly plan entry functions ----

var cachedWeekEntries = {};

async function loadWeekEntries(planId, weekNumber) {
  var cacheKey = planId + "-" + weekNumber;
  if (cachedWeekEntries[cacheKey]) return cachedWeekEntries[cacheKey];

  var result = await db
    .from("weekly_plan_entries")
    .select("*")
    .eq("plan_id", planId)
    .eq("week_number", weekNumber);
  if (result.error) throw result.error;

  var entries = {};
  result.data.forEach(function (e) {
    entries[e.day_of_week] = e;
  });
  cachedWeekEntries[cacheKey] = entries;
  return entries;
}

async function upsertWeekEntry(entry) {
  var payload = { ...entry, user_id: currentUser.id, updated_at: new Date().toISOString() };
  var result = await db
    .from("weekly_plan_entries")
    .upsert([payload], { onConflict: "plan_id,week_number,day_of_week" })
    .select();
  if (result.error) throw result.error;

  // Invalidate cache
  var cacheKey = entry.plan_id + "-" + entry.week_number;
  delete cachedWeekEntries[cacheKey];

  return result.data[0];
}

async function deleteWeekEntry(planId, weekNumber, dayOfWeek) {
  var result = await db
    .from("weekly_plan_entries")
    .delete()
    .eq("plan_id", planId)
    .eq("week_number", weekNumber)
    .eq("day_of_week", dayOfWeek);
  if (result.error) throw result.error;

  // Invalidate cache
  var cacheKey = planId + "-" + weekNumber;
  delete cachedWeekEntries[cacheKey];
}

// ---- HTML escape ----

function escapeHtml(str) {
  var el = document.createElement("span");
  el.textContent = str;
  return el.innerHTML;
}

// ---- Sidebar navigation ----

function navigateTo(sectionId) {
  // Update active link
  sidebarLinks.forEach(function (link) {
    link.classList.toggle("active", link.dataset.section === sectionId);
  });

  // Show/hide pages
  document.querySelectorAll(".page").forEach(function (page) {
    page.classList.toggle("active", page.id === sectionId);
  });

  // Close mobile sidebar
  closeSidebar();

  // Scroll to top of main wrapper
  document.querySelector(".main-wrapper").scrollTo(0, 0);
}

function openSidebar() {
  sidebar.classList.add("open");
  sidebarOverlay.classList.add("active");
}

function closeSidebar() {
  sidebar.classList.remove("open");
  sidebarOverlay.classList.remove("active");
}


function setFeedback(el, message, tone) {
  if (!el) return;
  el.textContent = message || "";
  el.classList.remove("is-success", "is-error", "is-loading");
  if (tone) el.classList.add("is-" + tone);
}

function validatePlanField(name) {
  if (!planForm) return true;
  var field = planForm.elements[name];
  if (!field) return true;
  var errorEl = planForm.querySelector('[data-field-error="' + name + '"]');
  var wrap = field.closest('.form-field');
  var value = (field.value || '').trim();
  var error = '';

  if (name === 'race' && value.length < 3) error = 'Race must be at least 3 characters.';
  if (name === 'date') {
    var dt = new Date(value + 'T00:00:00');
    var now = new Date();
    now.setHours(0, 0, 0, 0);
    if (!value || isNaN(dt.getTime()) || dt <= now) error = 'Please choose a future race date.';
  }
  if (name === 'mileage') {
    var num = parseInt(value, 10);
    if (value && (isNaN(num) || num < 15 || num > 200)) error = 'Mileage must be between 15 and 200 km.';
  }

  if (errorEl) errorEl.textContent = error;
  if (wrap) wrap.classList.toggle('has-error', Boolean(error));
  return !error;
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
    ganttPlanner.hidden = true;
    weeklyCalendar.hidden = true;
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
  setFeedback(stravaSyncFeedback, "Strava is not connected.", "error");
}

function showStravaConnected(updatedAt) {
  stravaDisconnected.hidden = true;
  stravaConnected.hidden = false;
  activitiesSection.hidden = false;
  setFeedback(stravaSyncFeedback, "Connected and ready to sync.", "success");
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
    renderGanttPlanner(cachedPlans);
    renderWeeklyCalendar(cachedPlans);
  } catch (err) {
    plansList.innerHTML = '<p class="muted">Could not load plans.</p>';
  }
}

function renderPlans(plans) {
  if (!plans.length) {
    plansList.innerHTML =
      '<p class="empty-state">No plans yet. Use the form above to create your first plan.</p>';
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
        '<div><span class="label">Volume</span><strong>' + (plan.current_mileage || "\u2014") + ' km/wk</strong></div>' +
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
    '<div><span class="label">Target volume</span><strong>' + block.startMi + '\u2013' + block.endMi + ' km</strong></div>' +
    '<div><span class="label">Readiness</span><strong class="positive">On track</strong></div>' +
    '</div>' +
    (plan.b2b_long_runs ? '<p class="card-note">B2B long run weekends are active during Build and Peak phases.</p>' : '<p class="card-note">\u201cStay consistent with your ' + block.name.toLowerCase() + ' phase work. Trust the process.\u201d</p>');
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
      '<span>' + b.weeks + ' wk &middot; ' + b.startMi + '\u2013' + b.endMi + ' km</span>' +
      '</div>';
  }).join("");

  blockDetails.innerHTML = blocks.map(function (b) {
    return '<div class="block-detail-card" style="border-top-color:' + b.color + '">' +
      '<h5 style="color:' + b.color + '">' + b.name + '</h5>' +
      '<p><strong>' + b.weeks + ' weeks</strong> &middot; ' + b.startMi + '\u2013' + b.endMi + ' km/wk</p>' +
      '<p>' + b.desc + '</p>' +
      '</div>';
  }).join("");
}

// ---- UI: Gantt planner (Koop method) ----

function renderGanttPlanner(plans) {
  var futurePlans = plans.filter(function (p) { return new Date(p.race_date) > new Date(); });

  if (!futurePlans.length) {
    ganttPlanner.hidden = true;
    return;
  }

  var plan = futurePlans[0];
  var koopPlan = computeKoopPlan(plan);

  ganttPlanner.hidden = false;

  // Phase bar
  ganttPhaseBar.innerHTML = koopPlan.phases.map(function (p) {
    var info = KOOP_PHASES[p.key];
    return '<div class="gantt-phase-segment" style="flex:' + p.weeks + ';background:' + info.color + '">' +
      '<strong>' + t(KOOP_PHASE_KEYS[p.key]) + '</strong>' +
      '<span>' + p.weeks + ' ' + t("dynamic.wk") + ' &middot; ' + p.startMi + '\u2013' + p.endMi + ' km</span>' +
      '</div>';
  }).join("");

  // Volume chart
  var maxMileage = koopPlan.peakMileage || 1;
  ganttVolumeChart.innerHTML = koopPlan.weeks.map(function (w) {
    if (w.phase === "race") return '';
    var pct = Math.max(5, Math.round((w.mileage / maxMileage) * 100));
    var color = KOOP_PHASES[w.phase] ? KOOP_PHASES[w.phase].color : "#94a3b8";
    var cls = "gantt-vol-bar";
    if (w.recovery) cls += " recovery";
    if (w.isCurrent) cls += " current";
    return '<div class="' + cls + '" style="height:' + pct + '%;background:' + color + '" title="' + t("gantt.week") + ' ' + w.week + ': ' + w.mileage + ' km">' +
      (w.isCurrent ? '<span class="gantt-now-marker">' + t("gantt.today") + '</span>' : '') +
      '<span class="gantt-vol-label">' + w.mileage + '</span>' +
      '</div>';
  }).join("");

  // Detail table
  ganttBody.innerHTML = koopPlan.weeks.map(function (w) {
    var cls = "";
    if (w.recovery) cls = "gantt-recovery";
    if (w.isCurrent) cls = "gantt-current";

    var phaseColor = w.phase === "race" ? "#ef4444" : (KOOP_PHASES[w.phase] ? KOOP_PHASES[w.phase].color : "#94a3b8");
    var phaseName = w.phase === "race" ? t("gantt.raceWeek") : t(KOOP_PHASE_KEYS[w.phase]);

    var dateStr = w.date.toLocaleDateString(currentLang === "no" ? "nb-NO" : "en-US", { month: "short", day: "numeric" });

    return '<tr class="' + cls + '" data-week-index="' + (w.week - 1) + '" style="cursor:pointer">' +
      '<td>' + (w.isCurrent ? '<strong>' + w.week + '</strong>' : w.week) + '</td>' +
      '<td>' + dateStr + '</td>' +
      '<td><span class="gantt-phase-dot" style="background:' + phaseColor + '"></span><span class="gantt-phase-name">' + phaseName + '</span></td>' +
      '<td>' + (w.phase === "race" ? '\u2014' : w.mileage + ' km') + '</td>' +
      '<td>' + t(w.workoutKey) + '</td>' +
      '<td>' + (w.phase === "race" ? '\u2014' : w.longRun + ' km') + '</td>' +
      '<td>' + (w.notesKey ? t(w.notesKey) : '') + '</td>' +
      '</tr>';
  }).join("");

  // Click a Gantt row to jump to that week in the calendar
  ganttBody.querySelectorAll("tr[data-week-index]").forEach(function (row) {
    row.addEventListener("click", function () {
      var idx = parseInt(row.dataset.weekIndex, 10);
      if (cachedKoopPlan && idx >= 0 && idx < cachedKoopPlan.weeks.length) {
        calendarWeekIndex = idx;
        renderCalendarWeek();
        weeklyCalendar.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  });
}

// ---- UI: Weekly training calendar ----

var DAY_NAMES_EN = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
var DAY_NAMES_NO = ["Man", "Tir", "Ons", "Tor", "Fre", "Lør", "Søn"];

var CAL_TYPE_LABELS = {
  easy: "cal.easy",
  recovery: "cal.recovery",
  intensity: "cal.intensity",
  long: "cal.long",
  "medium-long": "cal.mediumLong",
  rest: "cal.rest",
  race: "cal.race",
};

var INTENSITY_LABELS = {
  z1: "intensity.z1",
  z2: "intensity.z2",
  z3: "intensity.z3",
  z4: "intensity.z4",
  z5: "intensity.z5",
  race: "intensity.race",
};

var INTENSITY_COLORS = {
  z1: { bg: "#dcfce7", text: "#166534" },
  z2: { bg: "#dbeafe", text: "#1d4ed8" },
  z3: { bg: "#fef3c7", text: "#92400e" },
  z4: { bg: "#fed7aa", text: "#9a3412" },
  z5: { bg: "#fecaca", text: "#991b1b" },
  race: { bg: "#fce7f3", text: "#9d174d" },
};

function renderWeeklyCalendar(plans) {
  var futurePlans = plans.filter(function (p) { return new Date(p.race_date) > new Date(); });

  if (!futurePlans.length) {
    weeklyCalendar.hidden = true;
    cachedKoopPlan = null;
    cachedCalendarPlan = null;
    return;
  }

  var plan = futurePlans[0];
  cachedCalendarPlan = plan;
  cachedKoopPlan = computeKoopPlan(plan);

  // Default to current week
  var currentIdx = -1;
  cachedKoopPlan.weeks.forEach(function (w, i) {
    if (w.isCurrent) currentIdx = i;
  });
  calendarWeekIndex = currentIdx >= 0 ? currentIdx : 0;

  weeklyCalendar.hidden = false;
  renderCalendarWeek();
}

var calendarTransitionDir = "forward"; // "forward" or "back"

function renderPhaseProgressBar() {
  var progressEl = document.getElementById("weekly-cal-progress");
  if (!progressEl || !cachedKoopPlan) return;

  var phases = cachedKoopPlan.phases;
  var totalWeeks = cachedKoopPlan.totalWeeks;
  var currentWeek = cachedKoopPlan.weeks[calendarWeekIndex];
  if (!currentWeek) return;

  var elapsed = 0;
  var html = "";
  phases.forEach(function (phase) {
    var pct = (phase.weeks / totalWeeks) * 100;
    var color = KOOP_PHASES[phase.key] ? KOOP_PHASES[phase.key].color : "#94a3b8";
    var isActive = currentWeek.phase === phase.key;
    html += '<div class="weekly-cal-progress-seg' + (isActive ? " is-active" : "") +
      '" style="width:' + pct + '%;background:' + color +
      (isActive ? '' : ';opacity:0.35') + '"></div>';
    elapsed += phase.weeks;
  });

  // Position dot
  var dotPct = ((currentWeek.week - 1) / totalWeeks) * 100;
  html += '<div class="weekly-cal-progress-dot" style="left:' + dotPct + '%"></div>';

  progressEl.innerHTML = html;
}

function renderCalendarWeek() {
  if (!cachedKoopPlan || !cachedCalendarPlan) return;

  var weeks = cachedKoopPlan.weeks;
  var weekData = weeks[calendarWeekIndex];
  if (!weekData) return;

  var availability = cachedCalendarPlan.availability || 5;
  var b2b = cachedCalendarPlan.b2b_long_runs || false;

  // Navigation label
  var weekDate = weekData.date;
  var dateOpts = { month: "short", day: "numeric" };
  var locale = currentLang === "no" ? "nb-NO" : "en-US";
  var phaseName = weekData.phase === "race"
    ? t("gantt.raceWeek")
    : t(KOOP_PHASE_KEYS[weekData.phase]);

  weeklyCalLabel.textContent = t("gantt.week") + " " + weekData.week + " \u2014 " +
    weekDate.toLocaleDateString(locale, dateOpts) + " \u2014 " + phaseName;

  // Disable prev/next at boundaries
  weeklyCalPrev.disabled = calendarWeekIndex <= 0;
  weeklyCalNext.disabled = calendarWeekIndex >= weeks.length - 1;

  // Meta info
  var phaseColor = weekData.phase === "race"
    ? "#ef4444"
    : (KOOP_PHASES[weekData.phase] ? KOOP_PHASES[weekData.phase].color : "#94a3b8");

  weeklyCalMeta.innerHTML =
    '<span class="pill" style="background:' + phaseColor + '20;color:' + phaseColor + '">' + phaseName + '</span>' +
    (weekData.phase !== "race"
      ? '<span class="weekly-cal-meta-stat"><strong>' + weekData.mileage + ' km</strong> ' + t("cal.totalVolume") + '</span>' +
        '<span class="weekly-cal-meta-stat"><strong>' + weekData.longRun + ' km</strong> ' + t("cal.longRunLabel") + '</span>'
      : '') +
    (weekData.recovery ? '<span class="pill" style="background:#dcfce7;color:#166534">' + t("gantt.recoveryWeek") + '</span>' : '') +
    (weekData.isCurrent ? '<span class="pill">' + t("cal.currentWeek") + '</span>' : '');

  // Phase progress bar
  renderPhaseProgressBar();

  // Weekly intensity bar (will be updated after days are rendered)
  var intensityBarEl = document.getElementById("weekly-intensity-bar");

  // Load saved entries then render
  var planId = cachedCalendarPlan.id;
  var weekNum = weekData.week;
  var canEdit = currentUser && db;

  var renderDays = function (savedEntries) {
    editingWeekEntries = savedEntries || {};

    // Day grid
    var calDays = computeWeeklyCalendar(weekData, availability, b2b);
    var today = new Date();
    today.setHours(0, 0, 0, 0);
    var dayNames = currentLang === "no" ? DAY_NAMES_NO : DAY_NAMES_EN;

    var gridHtml = calDays.map(function (day, i) {
      var dayDate = day.date;
      var isToday = dayDate.getFullYear() === today.getFullYear() &&
        dayDate.getMonth() === today.getMonth() &&
        dayDate.getDate() === today.getDate();

      // Apply saved overrides
      var saved = savedEntries[i];
      var displayType = saved ? saved.workout_type : day.type;
      var displayName = saved ? (saved.workout_name || t(CAL_TYPE_LABELS[saved.workout_type] || saved.workout_type)) : t(day.labelKey);
      var displayDist = saved ? saved.distance_miles : day.distance;
      var displayNotes = saved ? saved.notes : null;
      var displayIntensity = saved && saved.intensity ? saved.intensity : day.intensity;
      var displayDescription = saved ? saved.description : (day.description || null);
      var isEdited = !!saved;

      var cls = "weekly-cal-day type-" + displayType;
      if (isToday) cls += " is-today";
      if (canEdit) cls += " is-editable";

      var typeCls = "type-" + displayType;
      var typeLabel = t(CAL_TYPE_LABELS[displayType] || displayType);

      var intensityColor = INTENSITY_COLORS[displayIntensity] || INTENSITY_COLORS.z2;
      var intensityLabel = t(INTENSITY_LABELS[displayIntensity] || "intensity.z2");
      var shortIntensity = intensityLabel.split(" - ")[0] || intensityLabel;

      return '<div class="' + cls + '" data-day-index="' + i + '">' +
        '<div class="weekly-cal-day-header">' +
          '<div class="weekly-cal-day-name">' + dayNames[i] +
            (isEdited ? '<span class="weekly-cal-edited-badge"></span>' : '') +
          '</div>' +
          '<span class="weekly-cal-workout-badge ' + typeCls + '">' + typeLabel + '</span>' +
        '</div>' +
        '<div class="weekly-cal-day-date">' + dayDate.toLocaleDateString(locale, dateOpts) + '</div>' +
        (displayType !== "rest" ? '<span class="weekly-cal-intensity-badge" style="background:' + intensityColor.bg + ';color:' + intensityColor.text + '">' + shortIntensity + '</span>' : '') +
        '<div class="weekly-cal-workout-dist">' +
          (displayDist > 0 ? displayDist + ' <small>km</small>' : "\u2014") +
        '</div>' +
        '<div class="weekly-cal-workout-name">' + escapeHtml(displayName) + '</div>' +
        (displayDescription ? '<div class="weekly-cal-day-desc">' + escapeHtml(displayDescription) + '</div>' : '') +
        (displayNotes ? '<div class="weekly-cal-day-notes">' + escapeHtml(displayNotes) + '</div>' : '') +
        '</div>';
    }).join("");

    // Render weekly intensity distribution bar
    if (intensityBarEl) {
      var zoneKm = { z1: 0, z2: 0, z3: 0, z4: 0, z5: 0, race: 0 };
      calDays.forEach(function (day, idx) {
        var s = savedEntries[idx];
        var zone = s && s.intensity ? s.intensity : day.intensity;
        var dist = s ? (s.distance_miles || 0) : (day.distance || 0);
        if (zone && dist > 0) zoneKm[zone] = (zoneKm[zone] || 0) + dist;
      });
      var totalKm = Object.values(zoneKm).reduce(function (a, b) { return a + b; }, 0);
      if (totalKm > 0) {
        var barHtml = '<div class="intensity-bar-label">' + t("cal.weeklyIntensity") + '</div><div class="intensity-bar-track">';
        var zones = ["z1", "z2", "z3", "z4", "z5", "race"];
        zones.forEach(function (z) {
          if (zoneKm[z] > 0) {
            var pct = (zoneKm[z] / totalKm) * 100;
            var color = INTENSITY_COLORS[z] || INTENSITY_COLORS.z2;
            var label = t(INTENSITY_LABELS[z]).split(" - ")[0];
            barHtml += '<div class="intensity-bar-seg" style="width:' + pct + '%;background:' + color.text + '" title="' + label + ': ' + zoneKm[z] + ' km (' + Math.round(pct) + '%)">' +
              (pct > 8 ? '<span>' + label + '</span>' : '') + '</div>';
          }
        });
        barHtml += '</div><div class="intensity-bar-legend">';
        zones.forEach(function (z) {
          if (zoneKm[z] > 0) {
            var color = INTENSITY_COLORS[z] || INTENSITY_COLORS.z2;
            var label = t(INTENSITY_LABELS[z]).split(" - ")[0];
            barHtml += '<span class="intensity-legend-item"><span class="intensity-legend-dot" style="background:' + color.text + '"></span>' + label + ' ' + zoneKm[z] + ' km</span>';
          }
        });
        barHtml += '</div>';
        intensityBarEl.innerHTML = barHtml;
      } else {
        intensityBarEl.innerHTML = '';
      }
    }

    // Apply transition animation
    var transClass = calendarTransitionDir === "back" ? "transitioning transition-back" : "transitioning";
    weeklyCalGrid.classList.add.apply(weeklyCalGrid.classList, transClass.split(" "));
    requestAnimationFrame(function () {
      weeklyCalGrid.innerHTML = gridHtml;
      requestAnimationFrame(function () {
        weeklyCalGrid.classList.remove("transitioning", "transition-back");
      });
    });

    // Attach click handlers for editing
    if (canEdit) {
      // Use timeout to ensure HTML is in DOM after rAF
      setTimeout(function () {
        weeklyCalGrid.querySelectorAll(".weekly-cal-day[data-day-index]").forEach(function (card) {
          card.addEventListener("click", function () {
            var idx = parseInt(card.dataset.dayIndex, 10);
            openDayEditModal(idx, calDays[idx]);
          });
        });
      }, 10);
    }
  };

  // Try to load saved entries from DB, fallback to empty
  if (canEdit && planId) {
    loadWeekEntries(planId, weekNum).then(renderDays).catch(function () { renderDays({}); });
  } else {
    renderDays({});
  }
}

// ---- Day edit modal ----

function openDayEditModal(dayIndex, generatedDay) {
  if (!dayEditModal || !dayEditForm) return;

  editingDayIndex = dayIndex;
  var saved = editingWeekEntries[dayIndex];

  // Populate form with saved values or generated defaults
  dayEditForm.elements.dayIndex.value = dayIndex;
  dayEditForm.elements.workoutType.value = saved ? saved.workout_type : generatedDay.type;
  dayEditForm.elements.workoutName.value = saved ? (saved.workout_name || "") : t(generatedDay.labelKey);
  dayEditForm.elements.distance.value = saved ? (saved.distance_miles || "") : (generatedDay.distance || "");
  dayEditForm.elements.intensity.value = saved && saved.intensity ? saved.intensity : (generatedDay.intensity || "z2");
  dayEditForm.elements.description.value = saved ? (saved.description || "") : (generatedDay.description || "");
  dayEditForm.elements.notes.value = saved ? (saved.notes || "") : "";

  // Set title with day name
  var dayNames = currentLang === "no" ? DAY_NAMES_NO : DAY_NAMES_EN;
  dayEditTitle.textContent = t("cal.editTitle") + " \u2014 " + dayNames[dayIndex];

  if (dayEditNote) {
    dayEditNote.textContent = "";
    dayEditNote.style.color = "";
  }

  dayEditModal.hidden = false;
}

function closeDayEditModal() {
  if (dayEditModal) dayEditModal.hidden = true;
  editingDayIndex = -1;
}

// Day edit close button
if (dayEditClose) {
  dayEditClose.addEventListener("click", closeDayEditModal);
}

// Day edit modal overlay click
if (dayEditModal) {
  dayEditModal.addEventListener("click", function (e) {
    if (e.target === dayEditModal) closeDayEditModal();
  });
}

// Day edit form submit
if (dayEditForm) {
  dayEditForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    if (!currentUser || !cachedCalendarPlan || !cachedKoopPlan) return;

    var weekData = cachedKoopPlan.weeks[calendarWeekIndex];
    if (!weekData) return;

    var dayIdx = parseInt(dayEditForm.elements.dayIndex.value, 10);
    var dayDate = new Date(weekData.date);
    dayDate.setDate(dayDate.getDate() + dayIdx);

    var submitBtn = dayEditForm.querySelector("button[type=submit]");
    submitBtn.disabled = true;
    if (dayEditNote) {
      dayEditNote.textContent = t("cal.editSaving");
      dayEditNote.style.color = "";
    }

    try {
      await upsertWeekEntry({
        plan_id: cachedCalendarPlan.id,
        week_number: weekData.week,
        day_of_week: dayIdx,
        date: dayDate.toISOString().split("T")[0],
        workout_type: dayEditForm.elements.workoutType.value,
        workout_name: dayEditForm.elements.workoutName.value || null,
        distance_miles: parseFloat(dayEditForm.elements.distance.value) || null,
        intensity: dayEditForm.elements.intensity.value || null,
        description: dayEditForm.elements.description.value || null,
        notes: dayEditForm.elements.notes.value || null,
      });

      if (dayEditNote) {
        dayEditNote.textContent = t("cal.editSaved");
        dayEditNote.style.color = "var(--success)";
      }

      // Re-render calendar to reflect changes
      renderCalendarWeek();

      setTimeout(closeDayEditModal, 600);
    } catch (err) {
      if (dayEditNote) {
        dayEditNote.textContent = "Error: " + err.message;
        dayEditNote.style.color = "#ef4444";
      }
    }
    submitBtn.disabled = false;
  });
}

// Day edit reset button
if (dayEditReset) {
  dayEditReset.addEventListener("click", async function () {
    if (!currentUser || !cachedCalendarPlan || !cachedKoopPlan) return;

    var weekData = cachedKoopPlan.weeks[calendarWeekIndex];
    if (!weekData) return;

    var dayIdx = parseInt(dayEditForm.elements.dayIndex.value, 10);

    // Only delete if there's a saved entry
    if (!editingWeekEntries[dayIdx]) {
      closeDayEditModal();
      return;
    }

    try {
      await deleteWeekEntry(cachedCalendarPlan.id, weekData.week, dayIdx);
      renderCalendarWeek();
      closeDayEditModal();
    } catch (err) {
      if (dayEditNote) {
        dayEditNote.textContent = "Error: " + err.message;
        dayEditNote.style.color = "#ef4444";
      }
    }
  });
}

// Calendar navigation
if (weeklyCalPrev) {
  weeklyCalPrev.addEventListener("click", function () {
    if (calendarWeekIndex > 0) {
      calendarTransitionDir = "back";
      calendarWeekIndex--;
      renderCalendarWeek();
    }
  });
}

if (weeklyCalNext) {
  weeklyCalNext.addEventListener("click", function () {
    if (cachedKoopPlan && calendarWeekIndex < cachedKoopPlan.weeks.length - 1) {
      calendarTransitionDir = "forward";
      calendarWeekIndex++;
      renderCalendarWeek();
    }
  });
}

// ---- UI: Activities ----

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
    renderCoachInsights();
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
  var distances = longRuns.map(function (lr) { return Math.round(lr[1].distance / 1000 * 10) / 10; });
  var elevations = longRuns.map(function (lr) { return Math.round(lr[1].elevation); });

  var traces = [
    {
      x: dates,
      y: distances,
      name: "Long run (km)",
      type: "bar",
      marker: { color: "#3b82f6", borderRadius: 4 },
    },
    {
      x: dates,
      y: elevations,
      name: "Elevation (m)",
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
    yaxis: { title: "Kilometers", gridcolor: "rgba(148,163,184,0.15)" },
    yaxis2: { title: "Meters", overlaying: "y", side: "right", gridcolor: "transparent" },
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

// ---- UI: Coach insights ----

var COACH_ICONS = {
  warning: "\u26a0\ufe0f",
  alert: "\u26a1",
  battery: "\ud83d\udd0b",
  fatigue: "\ud83d\ude34",
  balance: "\u2696\ufe0f",
  trending: "\ud83d\udcc8",
  decline: "\ud83d\udcc9",
  spike: "\ud83d\udca5",
  longrun: "\ud83c\udfc3",
  rest: "\ud83d\udca4",
  motivation: "\ud83d\udd25",
  injury: "\ud83e\ude79",
  race: "\ud83c\udfc1",
  taper: "\ud83c\udf43",
  start: "\ud83d\ude80",
};

// AI Coach DOM refs
var coachActionsEl = document.getElementById("coach-actions");
var aiCoachBtn = document.getElementById("ai-coach-btn");
var aiCoachStatus = document.getElementById("coach-ai-status");
var aiCoachInsightsEl = document.getElementById("ai-coach-insights");

function renderCoachInsights() {
  var insights = generateCoachingInsights({
    activities: cachedAllActivities,
    checkins: cachedCheckins,
    plans: cachedPlans,
  });

  // Show/hide AI coaching button based on login status
  if (coachActionsEl) {
    coachActionsEl.hidden = !currentUser;
  }

  if (!insights.length) {
    coachInsightsEl.innerHTML =
      '<div class="coach-empty">' +
      '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a3 3 0 0 0-3 3v4a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/><path d="M19 10v1a7 7 0 0 1-14 0v-1"/><line x1="12" y1="18" x2="12" y2="22"/></svg>' +
      '<p>' + t("coach.noData") + '</p>' +
      '</div>';
    return;
  }

  coachInsightsEl.innerHTML =
    '<div class="coach-section-label">' + t("coach.ruleBasedSection") + '</div>' +
    insights.map(function (insight) {
      var icon = COACH_ICONS[insight.icon] || "\ud83d\udcac";
      return '<div class="coach-card ' + insight.type + '">' +
        '<div class="coach-card-icon">' + icon + '</div>' +
        '<div class="coach-card-body">' +
        '<h4>' + t(insight.titleKey) + '</h4>' +
        '<p>' + t(insight.descKey) + '</p>' +
        (insight.meta ? '<div class="coach-card-meta">' + escapeHtml(insight.meta) + '</div>' : '') +
        '</div>' +
        '</div>';
    }).join("");
}

// ---- AI coaching via Gemini ----

function buildAICoachPayload() {
  // Weekly summary (last 4 weeks)
  var weeklySummary = [];
  if (cachedAllActivities && cachedAllActivities.length) {
    var summaryData = Compute.computeWeeklySummary(cachedAllActivities);
    var weekKeys = Object.keys(summaryData).sort().reverse().slice(0, 4).reverse();
    weeklySummary = weekKeys.map(function (key) {
      var w = summaryData[key];
      // Find longest run for this week
      var longestRun = 0;
      cachedAllActivities.forEach(function (a) {
        var ws = Compute.getWeekStart(new Date(a.started_at));
        if (ws.toISOString().split("T")[0] === key) {
          var dist = (Number(a.distance) || 0) / 1000;
          if (dist > longestRun) longestRun = dist;
        }
      });
      return {
        weekOf: key,
        distance: w.distance / 1000,
        runs: w.count,
        longestRun: longestRun,
      };
    });
  }

  // Recent activities (last 7 days)
  var recentActivities = [];
  var sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  if (cachedAllActivities) {
    recentActivities = cachedAllActivities
      .filter(function (a) { return new Date(a.started_at) >= sevenDaysAgo; })
      .slice(0, 10)
      .map(function (a) {
        return {
          name: a.name,
          distance: (Number(a.distance) || 0) / 1000,
          duration: Number(a.moving_time) || 0,
          effort: a.effort_rating || null,
        };
      });
  }

  // Latest check-in
  var latestCheckin = null;
  if (cachedCheckins && cachedCheckins.length) {
    var c = cachedCheckins[0];
    latestCheckin = {
      fatigue: c.fatigue,
      sleepQuality: c.sleep_quality,
      motivation: c.motivation,
      niggles: c.niggles || null,
    };
  }

  // Plan context
  var planContext = null;
  if (cachedCalendarPlan && cachedKoopPlan) {
    var currentWeekData = cachedKoopPlan.weeks[calendarWeekIndex];
    planContext = {
      race: cachedCalendarPlan.race,
      raceDate: cachedCalendarPlan.race_date,
      phase: currentWeekData ? currentWeekData.phase : "unknown",
      weekNumber: currentWeekData ? currentWeekData.week : 0,
      targetMileage: currentWeekData ? currentWeekData.mileage : 0,
    };
  }

  return {
    weeklySummary: weeklySummary,
    recentActivities: recentActivities,
    latestCheckin: latestCheckin,
    planContext: planContext,
  };
}

async function fetchAICoaching() {
  var sessionResult = await db.auth.getSession();
  var session = sessionResult.data.session;
  if (!session) throw new Error("Not authenticated");

  var payload = buildAICoachPayload();

  var res = await fetch(SUPABASE_URL + "/functions/v1/gemini-coach", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + session.access_token,
      apikey: SUPABASE_ANON_KEY,
    },
    body: JSON.stringify(payload),
  });

  var result = await res.json();
  if (!res.ok) throw new Error(result.error || "AI coaching request failed");
  return result.insights || [];
}

function renderAIInsights(insights) {
  if (!aiCoachInsightsEl) return;

  aiCoachInsightsEl.innerHTML =
    '<div class="coach-section-label">' + t("coach.aiSection") +
    ' <span class="ai-badge">' + t("coach.aiBadge") + '</span></div>' +
    '<div class="coach-insights">' +
    insights.map(function (insight) {
      var icon = COACH_ICONS[insight.icon] || "\ud83d\udcac";
      return '<div class="coach-card ai-insight ' + insight.type + '">' +
        '<div class="coach-card-icon">' + icon + '</div>' +
        '<div class="coach-card-body">' +
        '<h4>' + escapeHtml(insight.title) + '<span class="ai-badge">' + t("coach.aiBadge") + '</span></h4>' +
        '<p>' + escapeHtml(insight.body) + '</p>' +
        '</div>' +
        '</div>';
    }).join("") +
    '</div>';
}

// AI coach button handler
if (aiCoachBtn) {
  aiCoachBtn.addEventListener("click", async function () {
    if (!currentUser || !db) return;

    aiCoachBtn.disabled = true;
    if (aiCoachStatus) {
      aiCoachStatus.textContent = t("coach.aiLoading");
      aiCoachStatus.style.color = "";
    }

    // Show loading skeleton
    if (aiCoachInsightsEl) {
      aiCoachInsightsEl.innerHTML =
        '<div class="coach-section-label">' + t("coach.aiSection") + '</div>' +
        '<div class="coach-skeleton"></div>' +
        '<div class="coach-skeleton"></div>' +
        '<div class="coach-skeleton"></div>';
    }

    try {
      var insights = await fetchAICoaching();
      renderAIInsights(insights);
      if (aiCoachStatus) {
        aiCoachStatus.textContent = "";
      }
    } catch (err) {
      if (aiCoachInsightsEl) {
        aiCoachInsightsEl.innerHTML = "";
      }
      if (aiCoachStatus) {
        aiCoachStatus.textContent = t("coach.aiError");
        aiCoachStatus.style.color = "var(--danger)";
      }
    }
    aiCoachBtn.disabled = false;
  });
}

// ---- UI: Check-ins ----

async function refreshCheckins() {
  try {
    cachedCheckins = await loadCheckins();
    renderCheckins(cachedCheckins);
    renderCoachInsights();
  } catch (err) {
    // silently fail
  }
}

function renderCheckins(checkins) {
  if (!checkins || !checkins.length) {
    checkinHistory.innerHTML = '';
    return;
  }

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

// Sidebar navigation
sidebarLinks.forEach(function (link) {
  link.addEventListener("click", function (e) {
    e.preventDefault();
    navigateTo(link.dataset.section);
  });
});

if (topbarMenu) {
  topbarMenu.addEventListener("click", openSidebar);
}
if (sidebarClose) {
  sidebarClose.addEventListener("click", closeSidebar);
}
if (sidebarOverlay) {
  sidebarOverlay.addEventListener("click", closeSidebar);
}

// Navigation actions (buttons with data-action)
actions.forEach(function (button) {
  button.addEventListener("click", function () {
    var action = button.dataset.action;

    if (action === "start-plan" || action === "generate-plan") {
      navigateTo("planning");
      return;
    }

    if (action === "sample-week") {
      navigateTo("insights");
      return;
    }

    if (action === "policy") {
      navigateTo("data");
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
  ["race", "date", "mileage"].forEach(function (name) {
    var field = planForm.elements[name];
    if (field) {
      field.addEventListener("blur", function () { validatePlanField(name); });
      field.addEventListener("input", function () { validatePlanField(name); });
    }
  });

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
        setFeedback(formNote, "Sign in to save your plan.", "error");
        showAuthModal();
      } else {
        setFeedback(formNote, "Drafting a " + availability + "-day plan for " + race + " on " + date + " with ~" + mileage + " km/week. Configure Supabase to save plans.", "loading");
      }
      return;
    }

    if (!["race", "date", "mileage"].every(validatePlanField)) {
      setFeedback(formNote, "Please fix the highlighted fields.", "error");
      return;
    }

    setFeedback(formNote, "Creating your plan…", "loading");

    try {
      await createPlan({
        race: race,
        race_date: date,
        availability: parseInt(availability, 10),
        current_mileage: mileage ? parseInt(mileage, 10) : null,
        constraints: constraints || null,
        b2b_long_runs: b2b,
      });
      setFeedback(formNote, "Plan created for " + race + "!", "success");
      planForm.reset();
      refreshPlans();
    } catch (err) {
      setFeedback(formNote, "Error: " + err.message, "error");
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
    stravaSyncBtn.dataset.loading = "true";
    setFeedback(stravaSyncFeedback, "Sync in progress…", "loading");
    try {
      var result = await syncStrava();
      lastSyncTime.textContent = new Date().toLocaleString();
      if (result && result.synced > 0) {
        stravaSyncBtn.textContent = result.synced + " synced";
        setFeedback(stravaSyncFeedback, "Synced " + result.synced + " new activities.", "success");
      } else if (result && result.total === 0) {
        stravaSyncBtn.textContent = "No new activities";
        setFeedback(stravaSyncFeedback, "No new activities found.", "loading");
      } else {
        stravaSyncBtn.textContent = "0 synced (" + (result ? result.total : 0) + " found)";
        setFeedback(stravaSyncFeedback, "Found activities, but none required sync.", "loading");
      }
      refreshActivities();
      refreshAllActivitiesAndCharts();
      setTimeout(function () {
        stravaSyncBtn.textContent = "Sync now";
        stravaSyncBtn.disabled = false;
        delete stravaSyncBtn.dataset.loading;
      }, 3000);
    } catch (err) {
      console.error("Strava sync error:", err);
      stravaSyncBtn.textContent = "Sync failed";
      setFeedback(stravaSyncFeedback, "Sync failed: " + err.message, "error");
      alert("Strava sync failed: " + err.message);
      setTimeout(function () {
        stravaSyncBtn.textContent = "Sync now";
        stravaSyncBtn.disabled = false;
        delete stravaSyncBtn.dataset.loading;
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

    var distKm = parseFloat(manualEntryForm.elements.distance.value) || 0;
    var distMeters = distKm * 1000;
    var durationMin = parseInt(manualEntryForm.elements.duration.value, 10) || 0;
    var durationSec = durationMin * 60;
    var elevMeters = parseInt(manualEntryForm.elements.elevation.value, 10) || 0;
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
      navigateTo("data");
      try {
        var syncResult = await syncStrava();
        if (syncResult && syncResult.synced >= 0) {
          lastSyncTime.textContent = new Date().toLocaleString();
        }
        refreshActivities();
        refreshAllActivitiesAndCharts();
      } catch (syncErr) {
        console.error("Strava sync after connect failed:", syncErr);
        alert("Strava connected, but initial sync failed: " + syncErr.message + "\n\nTry clicking \"Sync now\" to retry.");
      }
    } catch (err) {
      alert("Strava connection failed: " + err.message);
    }
  };

  tryExchange();
}

// ---- Language switcher ----

document.querySelectorAll(".lang-option").forEach(function (btn) {
  btn.addEventListener("click", function () {
    setLanguage(btn.dataset.lang);
    // Re-render dynamic content with new language
    if (cachedPlans.length) {
      renderRaceCountdown(cachedPlans);
      renderBlockCalendar(cachedPlans);
      renderGanttPlanner(cachedPlans);
      renderWeeklyCalendar(cachedPlans);
    }
    if (cachedAllActivities.length) {
      renderWeeklyDashboard(cachedAllActivities);
      renderTrainingLoadChart(cachedAllActivities);
      renderLongRunChart(cachedAllActivities);
    }
    renderCoachInsights();
  });
});

// ---- Initialize ----

// Apply saved language on load
document.documentElement.lang = currentLang;
applyTranslations();

if (db) {
  db.auth.onAuthStateChange(function (_event, session) {
    updateAuthUI(session ? session.user : null);
  });

  db.auth.getSession().then(function (result) {
    updateAuthUI(result.data.session ? result.data.session.user : null);
  });

  handleStravaCallback();
}

// Handle hash navigation on load
(function () {
  var hash = window.location.hash.replace("#", "");
  if (hash && document.getElementById(hash)) {
    navigateTo(hash);
  }
})();
