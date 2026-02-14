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

let currentAuthMode = "signin";
let currentUser = null;

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

async function loadActivities() {
  const { data, error } = await db
    .from("activities")
    .select("*")
    .order("started_at", { ascending: false })
    .limit(20);
  if (error) throw error;
  return data;
}

// ---- UI helpers ----

function escapeHtml(str) {
  const el = document.createElement("span");
  el.textContent = str;
  return el.innerHTML;
}

function formatDistance(meters) {
  if (!meters) return "\u2014";
  const miles = meters / 1609.344;
  return miles.toFixed(1) + " mi";
}

function formatDuration(seconds) {
  if (!seconds) return "\u2014";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return h + "h " + m + "m";
  return m + "m " + s + "s";
}

function formatPace(secPerKm) {
  if (!secPerKm) return "\u2014";
  const secPerMile = secPerKm * 1.60934;
  const m = Math.floor(secPerMile / 60);
  const s = Math.round(secPerMile % 60);
  return m + ":" + String(s).padStart(2, "0") + " /mi";
}

function updateAuthUI(user) {
  currentUser = user;
  if (user) {
    signinBtn.hidden = true;
    signoutBtn.hidden = false;
    userEmailEl.hidden = false;
    userEmailEl.textContent = user.email;
    myPlans.hidden = false;
    refreshPlans();
    checkStravaConnection().then((connected) => {
      if (connected) refreshActivities();
    });
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
  }
}

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

async function refreshPlans() {
  try {
    const plans = await loadPlans();
    renderPlans(plans);
  } catch (err) {
    plansList.innerHTML = '<p class="muted">Could not load plans.</p>';
  }
}

async function refreshActivities() {
  try {
    const activities = await loadActivities();
    renderActivities(activities);
  } catch (err) {
    activitiesList.innerHTML = '<p class="muted">Could not load activities.</p>';
  }
}

function renderPlans(plans) {
  if (!plans.length) {
    plansList.innerHTML =
      '<p class="muted">No plans yet. Use the form above to create your first plan.</p>';
    return;
  }

  plansList.innerHTML = plans
    .map(
      (plan) => `
    <div class="plan-card">
      <div class="plan-card-header">
        <h4>${escapeHtml(plan.race)}</h4>
        <button class="plan-delete" data-plan-id="${plan.id}" aria-label="Delete plan">&times;</button>
      </div>
      <div class="plan-card-details">
        <div>
          <span class="label">Race date</span>
          <strong>${escapeHtml(plan.race_date)}</strong>
        </div>
        <div>
          <span class="label">Days/week</span>
          <strong>${plan.availability}</strong>
        </div>
        <div>
          <span class="label">Mileage</span>
          <strong>${plan.current_mileage || "\u2014"} mi/wk</strong>
        </div>
      </div>
      ${plan.constraints ? `<p class="plan-card-constraints">${escapeHtml(plan.constraints)}</p>` : ""}
      <p class="plan-card-date">Created ${new Date(plan.created_at).toLocaleDateString()}</p>
    </div>`
    )
    .join("");

  plansList.querySelectorAll(".plan-delete").forEach((btn) => {
    btn.addEventListener("click", async () => {
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

function renderActivities(activities) {
  if (!activities || !activities.length) {
    activitiesList.innerHTML =
      '<p class="muted">No activities synced yet. Click "Sync now" to import from Strava.</p>';
    return;
  }

  activitiesList.innerHTML = activities
    .map(
      (a) => `
    <div class="activity-card">
      <h4>${escapeHtml(a.name)}</h4>
      <span class="activity-card-type">${escapeHtml(a.type || "Activity")}</span>
      <div class="activity-card-stats">
        <div>
          <span class="label">Distance</span>
          <strong>${formatDistance(a.distance)}</strong>
        </div>
        <div>
          <span class="label">Duration</span>
          <strong>${formatDuration(a.moving_time)}</strong>
        </div>
        <div>
          <span class="label">Pace</span>
          <strong>${formatPace(a.average_pace)}</strong>
        </div>
      </div>
      <p class="activity-card-date">${new Date(a.started_at).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}</p>
    </div>`
    )
    .join("");
}

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
actions.forEach((button) => {
  button.addEventListener("click", () => {
    const action = button.dataset.action;

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
      signOut().then(() => updateAuthUI(null));
      return;
    }
  });
});

// Auth modal tabs
authTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    currentAuthMode = tab.dataset.tab;
    authTabs.forEach((t) => t.classList.toggle("active", t === tab));
    authForm.querySelector("button[type=submit]").textContent =
      currentAuthMode === "signin" ? "Sign in" : "Create account";
  });
});

// Auth form submit
if (authForm) {
  authForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const email = authForm.elements.email.value;
    const password = authForm.elements.password.value;
    const submitBtn = authForm.querySelector("button[type=submit]");
    authError.textContent = "";
    authError.style.color = "";
    submitBtn.disabled = true;

    try {
      if (currentAuthMode === "signin") {
        await signIn(email, password);
      } else {
        const { data } = await signUp(email, password);
        if (data.user && !data.session) {
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

authModal.addEventListener("click", (e) => {
  if (e.target === authModal) hideAuthModal();
});

// Plan form submit
if (planForm) {
  planForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const race = planForm.elements.race.value;
    const date = planForm.elements.date.value;
    const availability = planForm.elements.availability.value;
    const mileage = planForm.elements.mileage.value;
    const constraints = planForm.elements.constraints.value;

    // Fallback: demo mode when not signed in or Supabase not configured
    if (!currentUser) {
      if (isSupabaseConfigured) {
        formNote.textContent = "Sign in to save your plan.";
        formNote.style.color = "";
        showAuthModal();
      } else {
        formNote.textContent = `Drafting a ${availability}-day plan for ${race} on ${date} with ~${mileage} mi/week. Configure Supabase to save plans.`;
        formNote.style.color = "";
      }
      return;
    }

    formNote.textContent = "Creating your plan\u2026";
    formNote.style.color = "";

    try {
      await createPlan({
        race,
        race_date: date,
        availability: parseInt(availability, 10),
        current_mileage: mileage ? parseInt(mileage, 10) : null,
        constraints: constraints || null,
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
  stravaConnectBtn.addEventListener("click", () => {
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
  stravaSyncBtn.addEventListener("click", async () => {
    stravaSyncBtn.disabled = true;
    stravaSyncBtn.textContent = "Syncing\u2026";
    try {
      const result = await syncStrava();
      lastSyncTime.textContent = new Date().toLocaleString();
      stravaSyncBtn.textContent = result.synced + " synced";
      refreshActivities();
      setTimeout(() => {
        stravaSyncBtn.textContent = "Sync now";
        stravaSyncBtn.disabled = false;
      }, 2000);
    } catch (err) {
      stravaSyncBtn.textContent = "Sync failed";
      setTimeout(() => {
        stravaSyncBtn.textContent = "Sync now";
        stravaSyncBtn.disabled = false;
      }, 2000);
    }
  });
}

if (stravaDisconnectBtn) {
  stravaDisconnectBtn.addEventListener("click", async () => {
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

// Mobile nav toggle
if (menuToggle && mobileNav) {
  menuToggle.addEventListener("click", () => {
    const isOpen = menuToggle.getAttribute("aria-expanded") === "true";
    menuToggle.setAttribute("aria-expanded", String(!isOpen));
    mobileNav.hidden = isOpen;
  });
}

// ---- Handle Strava OAuth callback ----

function handleStravaCallback() {
  const params = new URLSearchParams(window.location.search);
  const code = params.get("code");
  const scope = params.get("scope");

  // Only process if we have a code and it looks like a Strava callback
  if (!code || !scope || !scope.includes("activity")) return;

  // Clean the URL so the code isn't visible / re-used
  const cleanUrl = window.location.origin + window.location.pathname;
  window.history.replaceState({}, document.title, cleanUrl);

  // Wait for auth to initialize, then exchange the code
  const tryExchange = async () => {
    if (!currentUser) {
      // Auth hasn't loaded yet — retry shortly
      setTimeout(tryExchange, 300);
      return;
    }
    try {
      await exchangeStravaCode(code);
      showStravaConnected(new Date().toISOString());
      syncStrava().then(() => refreshActivities());
      document.querySelector("#data").scrollIntoView({ behavior: "smooth" });
    } catch (err) {
      alert("Strava connection failed: " + err.message);
    }
  };

  tryExchange();
}

// ---- Initialize ----

if (db) {
  db.auth.onAuthStateChange((_event, session) => {
    updateAuthUI(session?.user || null);
  });

  db.auth.getSession().then(({ data: { session } }) => {
    updateAuthUI(session?.user || null);
  });

  handleStravaCallback();
}
