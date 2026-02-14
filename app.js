// ---- Supabase client ----

const isSupabaseConfigured =
  typeof SUPABASE_URL !== "undefined" &&
  SUPABASE_URL !== "YOUR_SUPABASE_URL" &&
  typeof SUPABASE_ANON_KEY !== "undefined" &&
  SUPABASE_ANON_KEY !== "YOUR_SUPABASE_ANON_KEY";

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

// ---- UI helpers ----

function escapeHtml(str) {
  const el = document.createElement("span");
  el.textContent = str;
  return el.innerHTML;
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
  } else {
    signinBtn.hidden = false;
    signoutBtn.hidden = true;
    userEmailEl.hidden = true;
    userEmailEl.textContent = "";
    myPlans.hidden = true;
    plansList.innerHTML = "";
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

// Mobile nav toggle
if (menuToggle && mobileNav) {
  menuToggle.addEventListener("click", () => {
    const isOpen = menuToggle.getAttribute("aria-expanded") === "true";
    menuToggle.setAttribute("aria-expanded", String(!isOpen));
    mobileNav.hidden = isOpen;
  });
}

// ---- Initialize auth state ----

if (db) {
  db.auth.onAuthStateChange((_event, session) => {
    updateAuthUI(session?.user || null);
  });

  db.auth.getSession().then(({ data: { session } }) => {
    updateAuthUI(session?.user || null);
  });
}
