import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useAppData } from "../context/AppDataContext";
import { getSupabaseClient } from "../lib/supabaseClient";

// ── constants ─────────────────────────────────────────────────────────────────

const INSIGHTS_CACHE_KEY = "runsmart-coach-insights";

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

const INSIGHT_CARD_STYLES = {
  danger:   "border-l-4 border-l-red-500 bg-red-50",
  warning:  "border-l-4 border-l-amber-500 bg-amber-50",
  positive: "border-l-4 border-l-green-500 bg-green-50",
  info:     "border-l-4 border-l-blue-600 bg-blue-50",
};

const INSIGHT_ICON_COLORS = {
  danger:   "text-red-600",
  warning:  "text-amber-600",
  positive: "text-green-600",
  info:     "text-blue-600",
};

function InsightCard({ insight }) {
  const icon = INSIGHT_ICONS[insight.icon] ?? "•";
  const cardStyle = INSIGHT_CARD_STYLES[insight.type] ?? INSIGHT_CARD_STYLES.info;
  const iconColor = INSIGHT_ICON_COLORS[insight.type] ?? INSIGHT_ICON_COLORS.info;

  return (
    <article className={`coach-insight-card is-${insight.type} bg-white border border-slate-200 rounded-2xl p-5 grid gap-2 ${cardStyle}`}>
      <div className="flex items-center gap-2.5">
        <span className={`text-lg w-7 text-center font-bold shrink-0 ${iconColor}`} aria-hidden="true">
          {icon}
        </span>
        <h4 className="m-0 text-sm font-bold text-slate-900">{insight.title}</h4>
      </div>
      <p className="m-0 text-[13px] leading-relaxed text-slate-700 pl-[38px]">{insight.body}</p>
    </article>
  );
}

function PlanBanner({ plan, blocks }) {
  const ctx = useMemo(() => buildPlanContext(plan, blocks), [plan, blocks]);
  if (!ctx) return null;

  return (
    <div
      className="flex flex-wrap gap-5 bg-white border border-slate-200 rounded-2xl px-6 py-4 mb-4"
      aria-label="Training plan context"
    >
      <div className="flex flex-col gap-0.5 min-w-[120px]">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Goal Race</span>
        <strong className="text-base font-bold text-slate-900">{ctx.race}</strong>
        <span className="text-xs text-slate-500">{ctx.raceDate}</span>
      </div>
      <div className="w-px bg-slate-200 self-stretch shrink-0 max-[600px]:hidden" aria-hidden="true" />
      <div className="flex flex-col gap-0.5 min-w-[120px]">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Current Phase</span>
        <strong className="text-base font-bold text-slate-900">{ctx.phase}</strong>
        <span className="text-xs text-slate-500">Week {ctx.weekNumber}</span>
      </div>
      <div className="w-px bg-slate-200 self-stretch shrink-0 max-[600px]:hidden" aria-hidden="true" />
      <div className="flex flex-col gap-0.5 min-w-[120px]">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Target Volume</span>
        <strong className="text-base font-bold text-slate-900">{ctx.targetMileage} km</strong>
        <span className="text-xs text-slate-500">{ctx.daysToRace} days to race</span>
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
    <div
      className="coach-logs-summary bg-green-50 border border-green-200 rounded-xl px-4 py-3 mb-4 flex items-center gap-4 flex-wrap"
      aria-label="Wellness summary"
    >
      <span className="text-xs font-bold uppercase tracking-wider text-green-700 whitespace-nowrap">Last 7 days</span>
      <div className="flex flex-wrap gap-2.5">
        {avgFatigue != null && (
          <span className="text-[13px] text-green-700 flex items-center gap-1">
            Fatigue <strong className="text-green-900">{avgFatigue.toFixed(1)}/5</strong>
          </span>
        )}
        {avgSleep != null && (
          <span className="text-[13px] text-green-700 flex items-center gap-1">
            Sleep quality <strong className="text-green-900">{avgSleep.toFixed(1)}/5</strong>
          </span>
        )}
        {avgMood != null && (
          <span className="text-[13px] text-green-700 flex items-center gap-1">
            Mood <strong className="text-green-900">{avgMood.toFixed(1)}/5</strong>
          </span>
        )}
        <span className="text-[13px] text-green-700 flex items-center gap-1">
          <strong className="text-green-900">{recent.length}</strong> log{recent.length !== 1 ? "s" : ""}
        </span>
      </div>
    </div>
  );
}

function RunnerProfileSection({ background, onSave, saving }) {
  const [draft, setDraft] = useState(background);

  // Sync draft when background loads from Supabase
  useEffect(() => {
    setDraft(background);
  }, [background]);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl px-6 py-4 mb-4" aria-label="Runner profile">
      <div className="flex items-baseline gap-3 mb-3.5 flex-wrap">
        <h3 className="m-0 text-sm font-bold text-slate-900">About you</h3>
        <p className="m-0 text-xs text-slate-500">
          Sent to the AI coach for more personalized insights. Your goal for the current plan is set on the{" "}
          <strong>Training Plan</strong> page.
        </p>
      </div>
      <div className="grid gap-3">
        <div className="flex flex-col gap-1">
          <label
            className="text-[11px] font-semibold uppercase tracking-wider text-slate-500"
            htmlFor="runner-background"
          >
            Running background
          </label>
          <textarea
            id="runner-background"
            className="w-full px-3 py-2.5 border border-slate-200 rounded-lg font-inherit text-[13px] text-slate-900 bg-slate-50 resize-y leading-relaxed box-border focus:outline-none focus:border-blue-600 focus:bg-white placeholder:text-slate-400 disabled:opacity-60"
            rows={3}
            placeholder="e.g. Running for 3 years, mostly trails, completed a 50K last year"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => onSave(draft)}
            disabled={saving}
          />
        </div>
      </div>
    </div>
  );
}

// ── page ──────────────────────────────────────────────────────────────────────

export default function CoachPage() {
  const { plans, activities, dailyLogs, checkins, trainingBlocks, runnerProfile } = useAppData();
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const activePlan = plans.plans[0] ?? null;

  // Load runner background from Supabase on mount
  useEffect(() => {
    runnerProfile.loadProfile();
  }, [runnerProfile.loadProfile]);

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

      // Combine runner background (per user) with plan goal (per plan)
      const background = runnerProfile.background;
      const goal = activePlan?.goal ?? null;
      const runnerProfilePayload = (background || goal) ? { background: background || null, goal } : null;

      const payload = {
        weeklySummary: buildWeeklySummaries(activities.activities),
        recentActivities: getRecentActivities(activities.activities),
        latestCheckin: checkins.checkins[0] ?? null,
        planContext: buildPlanContext(activePlan, trainingBlocks.blocks),
        dailyLogs: getRecentDailyLogs(freshLogs ?? []),
        runnerProfile: runnerProfilePayload,
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
    <section className="page" id="coach">
      <header className="flex justify-between items-start gap-4 flex-wrap mb-5">
        <div>
          <h2 className="m-0 mb-1 text-2xl font-bold text-slate-900">AI Coach</h2>
          <p className="m-0 text-sm text-slate-500">
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
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3.5 text-amber-900 mb-4 text-sm">
          <p className="m-0">
            No training plan found.{" "}
            <strong>Create a training plan</strong> first to get personalized coaching insights.
          </p>
        </div>
      )}

      <RunnerProfileSection
        background={runnerProfile.background}
        onSave={runnerProfile.saveProfile}
        saving={runnerProfile.loading}
      />

      <DailyLogSummary logs={dailyLogs.logs} />

      <div className="mt-1">
        {loading && (
          <div
            className="flex items-center gap-3.5 bg-white border border-slate-200 rounded-2xl px-5 py-6 text-slate-500 text-sm"
            role="status"
            aria-live="polite"
          >
            <div
              className="w-5 h-5 rounded-full border-2 border-slate-200 border-t-blue-600 animate-spin shrink-0"
              aria-hidden="true"
            />
            <p className="m-0">Analyzing your training data with Gemini AI…</p>
          </div>
        )}

        {!loading && error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-5 text-red-800 text-sm flex flex-col gap-3" role="alert">
            <p className="m-0">{error}</p>
            <button type="button" className="ghost self-start" onClick={fetchInsights}>
              Try again
            </button>
          </div>
        )}

        {!loading && !error && insights && insights.length > 0 && (
          <>
            <h3 className="m-0 mb-3 text-[15px] font-bold text-slate-900 coach-insights-heading">Coaching insights</h3>
            <div className="grid gap-3">
              {insights.map((insight, idx) => (
                <InsightCard key={idx} insight={insight} />
              ))}
            </div>
          </>
        )}

        {!loading && !error && !insights && (
          <div className="bg-slate-50 border border-dashed border-slate-200 rounded-2xl px-6 py-8 text-center text-slate-500 text-sm">
            <p className="m-0">
              Click <strong>Refresh coaching</strong> to get AI-powered insights based on
              your training data and wellness logs.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
