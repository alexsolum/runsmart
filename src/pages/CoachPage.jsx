import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useAppData } from "../context/AppDataContext";
import { getSupabaseClient } from "../lib/supabaseClient";

// ── constants ─────────────────────────────────────────────────────────────────

const INSIGHTS_CACHE_KEY = "runsmart-coach-insights";
const PROFILE_KEY = "runsmart-runner-profile";
const DEFAULT_PROFILE = { background: "", goal: "" };

// ── helpers ──────────────────────────────────────────────────────────────────

function getWeekStartUtc(date) {
  const d = new Date(date);
  const day = d.getUTCDay() || 7; // Mon=1 … Sun=7
  d.setUTCDate(d.getUTCDate() - day + 1);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

// Use i=4..1 to cover the last 4 *completed* Mon-Sun weeks, avoiding the
// partial current week which makes volume look artificially low mid-week.
function buildWeeklySummaries(activities) {
  const now = new Date();
  const summaries = [];

  for (let i = 4; i >= 1; i--) {
    const weekStart = getWeekStartUtc(new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000));
    const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);

    const weekActs = activities.filter((a) => {
      const d = new Date(a.started_at);
      return d >= weekStart && d < weekEnd;
    });

    const distance = weekActs.reduce((s, a) => s + (Number(a.distance) || 0) / 1000, 0);
    const distances = weekActs.map((a) => (Number(a.distance) || 0) / 1000);
    const longestRun = distances.length ? Math.max(...distances) : 0;

    summaries.push({
      weekOf: weekStart.toISOString().split("T")[0],
      distance,
      runs: weekActs.length,
      longestRun,
    });
  }

  return summaries;
}

function getRecentActivities(activities) {
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  return activities
    .filter((a) => new Date(a.started_at) >= cutoff)
    .map((a) => ({
      name: a.name || a.type || "Run",
      distance: (Number(a.distance) || 0) / 1000,
      duration: a.moving_time || 0,
      effort: a.perceived_effort ?? null,
    }));
}

function buildPlanContext(plan, blocks) {
  if (!plan) return null;

  const today = new Date().toISOString().split("T")[0];
  const currentBlock = blocks.find(
    (b) => b.plan_id === plan.id && b.start_date <= today && b.end_date >= today,
  );

  const phase = currentBlock?.phase ?? "Unknown";
  const targetMileage = currentBlock?.target_km ?? plan.current_mileage ?? 0;

  const raceDate = new Date(plan.race_date);
  const todayDate = new Date(today);
  const daysToRace = Math.max(0, Math.ceil((raceDate - todayDate) / (24 * 60 * 60 * 1000)));

  const weekNumber = currentBlock
    ? Math.max(1, Math.ceil((todayDate - new Date(currentBlock.start_date)) / (7 * 24 * 60 * 60 * 1000)))
    : 1;

  return {
    race: plan.race,
    raceDate: plan.race_date,
    phase,
    weekNumber,
    targetMileage,
    daysToRace,
  };
}

function getRecentDailyLogs(logs) {
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  return logs
    .filter((l) => new Date(`${l.log_date}T00:00:00`) >= cutoff)
    .map((l) => ({
      date: l.log_date,
      sleep_hours: l.sleep_hours ?? null,
      sleep_quality: l.sleep_quality ?? null,
      fatigue: l.fatigue ?? null,
      mood: l.mood ?? null,
      stress: l.stress ?? null,
      training_quality: l.training_quality ?? null,
      resting_hr: l.resting_hr ?? null,
      notes: l.notes ?? null,
    }));
}

function loadProfile() {
  try {
    return JSON.parse(localStorage.getItem(PROFILE_KEY)) ?? DEFAULT_PROFILE;
  } catch {
    return DEFAULT_PROFILE;
  }
}

function saveProfile(profile) {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  } catch {
    // ignore storage errors in restricted environments
  }
}

// ── icon map ─────────────────────────────────────────────────────────────────

const INSIGHT_ICONS = {
  warning: "⚠",
  alert: "!",
  battery: "▸",
  fatigue: "~",
  balance: "=",
  trending: "↑",
  decline: "↓",
  spike: "⚡",
  longrun: "▶",
  rest: "◉",
  motivation: "★",
  injury: "+",
  race: "⚑",
  taper: "◆",
};

// ── sub-components ────────────────────────────────────────────────────────────

function InsightCard({ insight }) {
  const icon = INSIGHT_ICONS[insight.icon] ?? "•";
  return (
    <article className={`coach-insight-card is-${insight.type}`}>
      <div className="coach-insight-header">
        <span className="coach-insight-icon" aria-hidden="true">{icon}</span>
        <h4 className="coach-insight-title">{insight.title}</h4>
      </div>
      <p className="coach-insight-body">{insight.body}</p>
    </article>
  );
}

function PlanBanner({ plan, blocks }) {
  const ctx = useMemo(() => buildPlanContext(plan, blocks), [plan, blocks]);
  if (!ctx) return null;

  return (
    <div className="coach-plan-banner" aria-label="Training plan context">
      <div className="coach-plan-info">
        <span className="coach-plan-label">Goal Race</span>
        <strong className="coach-plan-race">{ctx.race}</strong>
        <span className="coach-plan-date">{ctx.raceDate}</span>
      </div>
      <div className="coach-plan-divider" aria-hidden="true" />
      <div className="coach-plan-info">
        <span className="coach-plan-label">Current Phase</span>
        <strong className="coach-plan-phase">{ctx.phase}</strong>
        <span className="coach-plan-date">Week {ctx.weekNumber}</span>
      </div>
      <div className="coach-plan-divider" aria-hidden="true" />
      <div className="coach-plan-info">
        <span className="coach-plan-label">Target Volume</span>
        <strong className="coach-plan-target">{ctx.targetMileage} km</strong>
        <span className="coach-plan-date">{ctx.daysToRace} days to race</span>
      </div>
    </div>
  );
}

function DailyLogSummary({ logs }) {
  const recent = useMemo(() => getRecentDailyLogs(logs), [logs]);
  if (recent.length === 0) return null;

  const avg = (key) => {
    const vals = recent.filter((l) => l[key] != null).map((l) => l[key]);
    return vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : null;
  };

  const avgFatigue = avg("fatigue");
  const avgSleep = avg("sleep_quality");
  const avgMood = avg("mood");

  return (
    <div className="coach-logs-summary" aria-label="Wellness summary">
      <span className="coach-logs-heading">Last 7 days</span>
      <div className="coach-logs-metrics">
        {avgFatigue != null && (
          <span className="coach-log-metric">
            Fatigue <strong>{avgFatigue.toFixed(1)}/5</strong>
          </span>
        )}
        {avgSleep != null && (
          <span className="coach-log-metric">
            Sleep quality <strong>{avgSleep.toFixed(1)}/5</strong>
          </span>
        )}
        {avgMood != null && (
          <span className="coach-log-metric">
            Mood <strong>{avgMood.toFixed(1)}/5</strong>
          </span>
        )}
        <span className="coach-log-metric">
          <strong>{recent.length}</strong> log{recent.length !== 1 ? "s" : ""}
        </span>
      </div>
    </div>
  );
}

function RunnerProfileSection({ profile, onUpdate }) {
  const [draft, setDraft] = useState(profile);

  function handleSave() {
    onUpdate(draft);
  }

  return (
    <div className="coach-profile-section" aria-label="Runner profile">
      <div className="coach-profile-header">
        <h3 className="coach-profile-title">About you</h3>
        <p className="coach-profile-hint">
          Sent to the AI coach for more personalized insights.
        </p>
      </div>
      <div className="coach-profile-fields">
        <div className="coach-profile-field">
          <label className="coach-profile-label" htmlFor="runner-background">
            Running background
          </label>
          <textarea
            id="runner-background"
            className="coach-profile-textarea"
            rows={3}
            placeholder="e.g. Running for 3 years, mostly trails, completed a 50K last year"
            value={draft.background}
            onChange={(e) => setDraft((d) => ({ ...d, background: e.target.value }))}
            onBlur={handleSave}
          />
        </div>
        <div className="coach-profile-field">
          <label className="coach-profile-label" htmlFor="runner-goal">
            Goal for this plan
          </label>
          <textarea
            id="runner-goal"
            className="coach-profile-textarea"
            rows={2}
            placeholder="e.g. Finish my first 100K under 12 hours, stay healthy, enjoy the process"
            value={draft.goal}
            onChange={(e) => setDraft((d) => ({ ...d, goal: e.target.value }))}
            onBlur={handleSave}
          />
        </div>
      </div>
    </div>
  );
}

// ── page ──────────────────────────────────────────────────────────────────────

export default function CoachPage() {
  const { plans, activities, dailyLogs, checkins, trainingBlocks } = useAppData();
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [runnerProfile, setRunnerProfile] = useState(loadProfile);

  const activePlan = plans.plans[0] ?? null;

  // Restore cached insights from previous session so the page isn't blank
  // on revisit. A fresh fetch is always triggered by the button.
  useEffect(() => {
    const cached = sessionStorage.getItem(INSIGHTS_CACHE_KEY);
    if (cached) {
      try {
        setInsights(JSON.parse(cached));
      } catch {
        // ignore corrupt cache
      }
    }
  }, []);

  function handleProfileUpdate(updated) {
    setRunnerProfile(updated);
    saveProfile(updated);
  }

  const fetchInsights = useCallback(async () => {
    const client = getSupabaseClient();
    if (!client) {
      setError("Supabase is not configured. Check your environment settings.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [freshLogs, sessionResult] = await Promise.all([
        dailyLogs.loadLogs().catch(() => dailyLogs.logs),
        client.auth.getSession(),
      ]);

      if (!sessionResult?.data?.session) {
        throw new Error("Not authenticated. Please sign in again.");
      }

      const payload = {
        weeklySummary: buildWeeklySummaries(activities.activities),
        recentActivities: getRecentActivities(activities.activities),
        latestCheckin: checkins.checkins[0] ?? null,
        planContext: buildPlanContext(activePlan, trainingBlocks.blocks),
        dailyLogs: getRecentDailyLogs(freshLogs ?? []),
        runnerProfile: (runnerProfile.background || runnerProfile.goal) ? runnerProfile : null,
      };

      const { data, error: invokeError } = await client.functions.invoke("gemini-coach", {
        body: payload,
      });

      if (invokeError) throw new Error(`Coach request failed: ${invokeError.message}`);
      if (data?.error) throw new Error(data.error);
      if (!data?.insights) throw new Error("No insights returned from coach.");

      setInsights(data.insights);
      sessionStorage.setItem(INSIGHTS_CACHE_KEY, JSON.stringify(data.insights));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [activities.activities, checkins.checkins, dailyLogs, activePlan, trainingBlocks.blocks, runnerProfile]);

  return (
    <section className="page coach-page" id="coach">
      <header className="page-header coach-page-header">
        <div>
          <h2>AI Coach</h2>
          <p>
            Personalized insights based on your training history, daily wellness logs, and race plan.
          </p>
        </div>
        <button
          type="button"
          className="cta"
          onClick={fetchInsights}
          disabled={loading}
        >
          {loading ? "Analyzing…" : "Refresh coaching"}
        </button>
      </header>

      {activePlan ? (
        <PlanBanner plan={activePlan} blocks={trainingBlocks.blocks} />
      ) : (
        <div className="coach-no-plan">
          <p>
            No training plan found.{" "}
            <strong>Create a training plan</strong> first to get personalized coaching insights.
          </p>
        </div>
      )}

      <RunnerProfileSection profile={runnerProfile} onUpdate={handleProfileUpdate} />

      <DailyLogSummary logs={dailyLogs.logs} />

      <div className="coach-insights-section">
        {loading && (
          <div className="coach-loading" role="status" aria-live="polite">
            <div className="coach-loading-spinner" aria-hidden="true" />
            <p>Analyzing your training data with Gemini AI…</p>
          </div>
        )}

        {!loading && error && (
          <div className="coach-error" role="alert">
            <p>{error}</p>
            <button type="button" className="ghost" onClick={fetchInsights}>
              Try again
            </button>
          </div>
        )}

        {!loading && !error && insights && insights.length > 0 && (
          <>
            <h3 className="coach-insights-heading">Coaching insights</h3>
            <div className="coach-insights-list">
              {insights.map((insight, idx) => (
                <InsightCard key={idx} insight={insight} />
              ))}
            </div>
          </>
        )}

        {!loading && !error && !insights && (
          <div className="coach-empty">
            <p>
              Click <strong>Refresh coaching</strong> to get AI-powered insights based on
              your training data and wellness logs.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
