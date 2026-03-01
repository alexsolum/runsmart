import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAppData } from "../context/AppDataContext";
import PageContainer from "../components/layout/PageContainer";
import { getSupabaseClient } from "../lib/supabaseClient";
import CoachAvatar from "../components/CoachAvatar";
import { useI18n } from "../i18n/translations";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

// ── helpers ───────────────────────────────────────────────────────────────────

function getWeekStartUtc(date) {
  const d = new Date(date);
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() - day + 1);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

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
    summaries.push({ weekOf: weekStart.toISOString().split("T")[0], distance, runs: weekActs.length, longestRun });
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
  const currentBlock = blocks.find((b) => b.plan_id === plan.id && b.start_date <= today && b.end_date >= today);
  const phase = currentBlock?.phase ?? "Unknown";
  const targetMileage = currentBlock?.target_km ?? plan.current_mileage ?? 0;
  const raceDate = new Date(plan.race_date);
  const todayDate = new Date(today);
  const daysToRace = Math.max(0, Math.ceil((raceDate - todayDate) / (24 * 60 * 60 * 1000)));
  const weekNumber = currentBlock
    ? Math.max(1, Math.ceil((todayDate - new Date(currentBlock.start_date)) / (7 * 24 * 60 * 60 * 1000)))
    : 1;
  return { race: plan.race, raceDate: plan.race_date, phase, weekNumber, targetMileage, daysToRace };
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

function relativeTime(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 2) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function formatMessageForHistory(msg) {
  if (msg.role === "user") {
    if (msg.content?.type === "initial_request") {
      return "Please analyze my training data and provide coaching insights.";
    }
    return msg.content?.text ?? String(msg.content);
  }
  if (Array.isArray(msg.content)) {
    return `Coaching insights: ${msg.content.map((i) => i.title).join(". ")}.`;
  }
  return msg.content?.text ?? String(msg.content);
}

function getNextMonday() {
  const d = new Date();
  const day = d.getUTCDay();
  const daysUntilMonday = day === 0 ? 1 : 8 - day;
  d.setUTCDate(d.getUTCDate() + daysUntilMonday);
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString().split("T")[0];
}

function formatPlanDate(isoDate) {
  const d = new Date(`${isoDate}T00:00:00Z`);
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${dayNames[d.getUTCDay()]} ${d.getUTCDate()} ${monthNames[d.getUTCMonth()]}`;
}

// ── icon map ──────────────────────────────────────────────────────────────────

const INSIGHT_ICONS = {
  warning: "⚠", alert: "!", battery: "▸", fatigue: "~", balance: "=",
  trending: "↑", decline: "↓", spike: "⚡", longrun: "▶", rest: "◉",
  motivation: "★", injury: "+", race: "⚑", taper: "◆",
};

const INSIGHT_CARD_STYLES = {
  danger:   "border-l-4 border-l-red-500 bg-red-50",
  warning:  "border-l-4 border-l-amber-500 bg-amber-50",
  positive: "border-l-4 border-l-green-500 bg-green-50",
  info:     "border-l-4 border-l-blue-600 bg-blue-50",
};

const INSIGHT_ICON_COLORS = {
  danger: "text-red-600", warning: "text-amber-600", positive: "text-green-600", info: "text-blue-600",
};

const WORKOUT_TYPE_COLORS = {
  "Easy":         "bg-green-100 text-green-800",
  "Recovery":     "bg-blue-100 text-blue-800",
  "Tempo":        "bg-orange-100 text-orange-800",
  "Intervals":    "bg-red-100 text-red-800",
  "Long Run":     "bg-purple-100 text-purple-800",
  "Strength":     "bg-yellow-100 text-yellow-800",
  "Cross-Train":  "bg-cyan-100 text-cyan-800",
  "Rest":         "bg-slate-100 text-slate-500",
};

// ── sub-components ────────────────────────────────────────────────────────────

function InsightCard({ insight }) {
  const icon = INSIGHT_ICONS[insight.icon] ?? "•";
  const cardStyle = INSIGHT_CARD_STYLES[insight.type] ?? INSIGHT_CARD_STYLES.info;
  const iconColor = INSIGHT_ICON_COLORS[insight.type] ?? INSIGHT_ICON_COLORS.info;
  return (
    <article className={`coach-insight-card is-${insight.type} bg-white border border-slate-200 rounded-2xl p-5 grid gap-2 ${cardStyle}`}>
      <div className="flex items-center gap-2.5">
        <span className={`text-lg w-7 text-center font-bold shrink-0 ${iconColor}`} aria-hidden="true">{icon}</span>
        <h4 className="m-0 text-sm font-bold text-slate-900">{insight.title}</h4>
      </div>
      <p className="m-0 text-[13px] leading-relaxed text-slate-700 pl-[38px]">{insight.body}</p>
    </article>
  );
}

function PlanBanner({ plan, blocks }) {
  const { t } = useI18n();
  const ctx = useMemo(() => buildPlanContext(plan, blocks), [plan, blocks]);
  if (!ctx) return null;
  return (
    <div className="flex flex-wrap gap-5 bg-white border border-slate-200 rounded-2xl px-6 py-4 mb-3" aria-label="Training plan context">
      <div className="flex flex-col gap-0.5 min-w-[120px]">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{t("coach.goalRace")}</span>
        <strong className="text-base font-bold text-slate-900">{ctx.race}</strong>
        <span className="text-xs text-slate-500">{ctx.raceDate}</span>
      </div>
      <div className="w-px bg-slate-200 self-stretch shrink-0 max-[600px]:hidden" aria-hidden="true" />
      <div className="flex flex-col gap-0.5 min-w-[120px]">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{t("coach.currentPhase")}</span>
        <strong className="text-base font-bold text-slate-900">{ctx.phase}</strong>
        <span className="text-xs text-slate-500">{t("coach.week")} {ctx.weekNumber}</span>
      </div>
      <div className="w-px bg-slate-200 self-stretch shrink-0 max-[600px]:hidden" aria-hidden="true" />
      <div className="flex flex-col gap-0.5 min-w-[120px]">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{t("coach.targetVolume")}</span>
        <strong className="text-base font-bold text-slate-900">{ctx.targetMileage} km</strong>
        <span className="text-xs text-slate-500">{ctx.daysToRace} {t("coach.daysToRace")}</span>
      </div>
    </div>
  );
}

function DailyLogSummary({ logs }) {
  const { t } = useI18n();
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
    <div className="coach-logs-summary bg-green-50 border border-green-200 rounded-xl px-4 py-3 mb-3 flex items-center gap-4 flex-wrap" aria-label="Wellness summary">
      <span className="text-xs font-bold uppercase tracking-wider text-green-700 whitespace-nowrap">{t("coach.last7Days")}</span>
      <div className="flex flex-wrap gap-2.5">
        {avgFatigue != null && (
          <span className="text-[13px] text-green-700 flex items-center gap-1">
            {t("insights.fatigue")} <strong className="font-mono text-green-900">{avgFatigue.toFixed(1)}/5</strong>
          </span>
        )}
        {avgSleep != null && (
          <span className="text-[13px] text-green-700 flex items-center gap-1">
            {t("insights.sleepQuality")} <strong className="font-mono text-green-900">{avgSleep.toFixed(1)}/5</strong>
          </span>
        )}
        {avgMood != null && (
          <span className="text-[13px] text-green-700 flex items-center gap-1">
            {t("coach.mood")} <strong className="font-mono text-green-900">{avgMood.toFixed(1)}/5</strong>
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
  const { t } = useI18n();
  const [draft, setDraft] = useState(background);
  useEffect(() => { setDraft(background); }, [background]);
  return (
    <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 mb-3" aria-label="Runner profile">
      <div className="flex items-baseline gap-2 mb-2 flex-wrap">
        <h3 className="m-0 text-xs font-bold font-sans text-slate-900">{t("coach.aboutYou")}</h3>
        <p className="m-0 text-[11px] text-slate-500">
          {t("coach.profileDescPre")} <strong>{t("nav.trainingPlan")}</strong> {t("coach.profileDescPost")}
        </p>
      </div>
      <Label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block mb-1" htmlFor="runner-background">
        {t("coach.runningBackground")}
      </Label>
      <Textarea
        id="runner-background"
        className="w-full px-3 py-2 border border-slate-200 rounded-lg font-inherit text-[12px] text-slate-900 bg-slate-50 resize-none leading-relaxed box-border focus:outline-none focus:border-blue-600 focus:bg-white placeholder:text-slate-400 disabled:opacity-60"
        rows={2}
        placeholder={t("coach.bgPlaceholder")}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => onSave(draft)}
        disabled={saving}
      />
    </div>
  );
}

// ── message rendering ─────────────────────────────────────────────────────────

function InitialRequestMessage() {
  const { t } = useI18n();
  return (
    <div className="flex justify-center mb-4">
      <div className="bg-slate-100 border border-slate-200 text-slate-500 rounded-xl px-3 py-1.5 text-xs">
        {t("coach.trainingDataAnalyzed")}
      </div>
    </div>
  );
}

function AssistantMessage({ content }) {
  if (Array.isArray(content)) {
    return (
      <div className="flex gap-3 mb-4">
        <CoachAvatar size={32} className="shrink-0 mt-0.5" />
        <div className="flex-1 grid gap-2 min-w-0">
          {content.map((insight, idx) => (
            <InsightCard key={idx} insight={insight} />
          ))}
        </div>
      </div>
    );
  }
  if (content?.text) {
    return (
      <div className="flex gap-3 mb-4">
        <CoachAvatar size={32} className="shrink-0 mt-0.5" />
        <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-sm px-4 py-3 max-w-[80%]">
          <p className="m-0 text-sm text-slate-700 leading-relaxed">{content.text}</p>
        </div>
      </div>
    );
  }
  return null;
}

function UserMessage({ content }) {
  const text = content?.text ?? "";
  return (
    <div className="flex justify-end mb-4">
      <div className="bg-blue-600 text-white rounded-2xl rounded-tr-sm px-4 py-3 max-w-[70%]">
        <p className="m-0 text-sm leading-relaxed">{text}</p>
      </div>
    </div>
  );
}

function ChatMessage({ msg }) {
  if (msg.role === "user") {
    if (msg.content?.type === "initial_request") return <InitialRequestMessage />;
    return <UserMessage content={msg.content} />;
  }
  return <AssistantMessage content={msg.content} />;
}

// ── Weekly plan components ────────────────────────────────────────────────────

function WorkoutTypeBadge({ type }) {
  const colorClass = WORKOUT_TYPE_COLORS[type] ?? "bg-slate-100 text-slate-700";
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${colorClass}`}>
      {type}
    </span>
  );
}

function WeeklyPlanTable({ plan, onAccept, accepting, accepted }) {
  if (!plan || plan.length === 0) return null;
  const totalKm = plan.reduce((s, d) => s + (Number(d.distance_km) || 0), 0);
  const totalMin = plan.reduce((s, d) => s + (Number(d.duration_min) || 0), 0);
  const totalHours = Math.floor(totalMin / 60);
  const remainMin = totalMin % 60;

  return (
    <div className="space-y-3">
      {/* Summary row */}
      <div className="flex gap-4 flex-wrap items-center">
        <span className="text-xs text-slate-500">
          Week total: <strong className="text-slate-900">{totalKm.toFixed(1)} km</strong>
        </span>
        <span className="text-xs text-slate-500">
          Time: <strong className="text-slate-900">
            {totalHours > 0 ? `${totalHours}h ` : ""}{remainMin > 0 ? `${remainMin}m` : ""}
          </strong>
        </span>
      </div>

      {/* Plan days */}
      <div className="space-y-1">
        {plan.map((day, idx) => (
          <div
            key={idx}
            className={`flex items-start gap-3 rounded-xl px-3 py-2.5 border ${
              day.workout_type === "Rest" ? "bg-slate-50 border-slate-100" : "bg-white border-slate-200"
            }`}
          >
            <div className="w-24 shrink-0">
              <p className="text-xs font-semibold text-slate-700">{formatPlanDate(day.date)}</p>
            </div>
            <div className="w-28 shrink-0 pt-0.5">
              <WorkoutTypeBadge type={day.workout_type} />
            </div>
            <div className="flex-1 min-w-0">
              {day.workout_type !== "Rest" && (
                <p className="text-[11px] text-slate-500 mb-0.5">
                  {day.distance_km > 0 && `${Number(day.distance_km).toFixed(1)} km`}
                  {day.distance_km > 0 && day.duration_min > 0 && " · "}
                  {day.duration_min > 0 && `${day.duration_min} min`}
                </p>
              )}
              <p className="text-xs text-slate-600 leading-relaxed">{day.description}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Accept/accepted button */}
      <div className="flex gap-2 pt-1">
        {accepted ? (
          <div className="flex items-center gap-2 text-sm text-green-700 font-semibold">
            <span className="text-green-600">✓</span> Plan saved to Weekly Plan!
          </div>
        ) : (
          <Button
            type="button"
            className="bg-green-600 hover:bg-green-700 text-white"
            onClick={onAccept}
            disabled={accepting}
          >
            {accepting ? "Saving…" : "Accept Plan"}
          </Button>
        )}
      </div>
    </div>
  );
}

function PlanRevisionMessage({ msg }) {
  if (msg.role === "user") {
    return (
      <div className="flex justify-end mb-2">
        <div className="bg-blue-600 text-white rounded-xl rounded-tr-sm px-3 py-2 max-w-[80%]">
          <p className="m-0 text-xs leading-relaxed">{msg.text}</p>
        </div>
      </div>
    );
  }
  return (
    <div className="flex gap-2 mb-2">
      <CoachAvatar size={24} className="shrink-0 mt-0.5" />
      <div className="bg-white border border-slate-200 rounded-xl rounded-tl-sm px-3 py-2 max-w-[80%]">
        <p className="m-0 text-xs text-slate-700 leading-relaxed">{msg.text}</p>
      </div>
    </div>
  );
}

// ── page ──────────────────────────────────────────────────────────────────────

export default function CoachPage() {
  const { t } = useI18n();
  const { auth, plans, activities, dailyLogs, checkins, trainingBlocks, runnerProfile, coachConversations, workoutEntries } = useAppData();

  // ── Chat tab state ───────────────────────────────────────────────────────
  const [localMessages, setLocalMessages] = useState(coachConversations.messages);
  const [activeConv, setActiveConv] = useState(coachConversations.activeConversation);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [inputText, setInputText] = useState("");
  const [showSidebar, setShowSidebar] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const messagesEndRef = useRef(null);

  // ── Tab state ────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState("chat"); // "chat" | "plan"

  // ── Weekly plan state ────────────────────────────────────────────────────
  const [planLoading, setPlanLoading] = useState(false);
  const [planError, setPlanError] = useState(null);
  const [planData, setPlanData] = useState(null); // { coaching_feedback, structured_plan }
  const [planConvHistory, setPlanConvHistory] = useState([]); // [{ role: "user"|"model", text }]
  const [revisionInput, setRevisionInput] = useState("");
  const [planAccepting, setPlanAccepting] = useState(false);
  const [planAccepted, setPlanAccepted] = useState(false);

  const activePlan = plans.plans[0] ?? null;

  // Sync chat state with hook
  useEffect(() => {
    setLocalMessages(coachConversations.messages);
  }, [coachConversations.messages]);

  useEffect(() => {
    setActiveConv(coachConversations.activeConversation);
  }, [coachConversations.activeConversation]);

  useEffect(() => {
    coachConversations.loadConversations();
    runnerProfile.loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView?.({ behavior: "smooth" });
  }, [localMessages]);

  // ── Shared payload builder ───────────────────────────────────────────────
  const buildBasePayload = useCallback(async () => {
    const [freshLogs] = await Promise.all([
      dailyLogs.loadLogs().catch(() => dailyLogs.logs),
    ]);
    const background = runnerProfile.background;
    const goal = activePlan?.goal ?? null;
    const runnerProfilePayload = (background || goal) ? { background: background || null, goal } : null;
    return {
      weeklySummary: buildWeeklySummaries(activities.activities),
      recentActivities: getRecentActivities(activities.activities),
      latestCheckin: checkins.checkins[0] ?? null,
      planContext: buildPlanContext(activePlan, trainingBlocks.blocks),
      dailyLogs: getRecentDailyLogs(freshLogs ?? []),
      runnerProfile: runnerProfilePayload,
    };
  }, [activities.activities, checkins.checkins, dailyLogs, activePlan, trainingBlocks.blocks, runnerProfile]);

  // ── Chat tab handlers ────────────────────────────────────────────────────

  const persistMessage = useCallback(async (conv, role, content) => {
    const tempId = `temp-${Date.now()}-${Math.random()}`;
    const tempMsg = { id: tempId, conversation_id: conv.id, role, content, created_at: new Date().toISOString() };
    setLocalMessages((prev) => [...prev, tempMsg]);
    const saved = await coachConversations.addMessage(conv.id, role, content);
    if (saved?.id) {
      setLocalMessages((prev) => prev.map((m) => (m.id === tempId ? saved : m)));
    }
    return saved;
  }, [coachConversations]);

  const handleSelectConversation = useCallback(async (conv) => {
    setActiveConv(conv);
    setLocalMessages([]);
    setError(null);
    await coachConversations.setActiveConversation(conv);
  }, [coachConversations]);

  const handleNewConversation = useCallback(async () => {
    const conv = await coachConversations.createConversation("New conversation");
    if (conv) {
      setActiveConv(conv);
      setLocalMessages([]);
      setError(null);
    }
  }, [coachConversations]);

  const handleDeleteConversation = useCallback(async (id) => {
    await coachConversations.deleteConversation(id);
    if (activeConv?.id === id) {
      setActiveConv(null);
      setLocalMessages([]);
    }
    setDeletingId(null);
  }, [coachConversations, activeConv]);

  const fetchInitialInsights = useCallback(async () => {
    const client = getSupabaseClient();
    if (!client) { setError("Supabase is not configured."); return; }
    setSending(true);
    setError(null);
    try {
      let conv = activeConv;
      if (!conv) {
        conv = await coachConversations.createConversation("New conversation");
        if (!conv) throw new Error("Failed to create conversation.");
        setActiveConv(conv);
      }
      await persistMessage(conv, "user", { type: "initial_request" });
      const basePayload = await buildBasePayload();
      const payload = { mode: "initial", ...basePayload };
      const { data, error: invokeError } = await client.functions.invoke("gemini-coach", { body: payload });
      if (invokeError) throw new Error(`Coach request failed: ${invokeError.message}`);
      if (data?.error) throw new Error(data.error);
      if (!data?.insights) throw new Error("No insights returned from coach.");
      await persistMessage(conv, "assistant", data.insights);
      const title = data.insights[0]?.title?.slice(0, 50) ?? "Coaching session";
      await coachConversations.updateConversationTitle(conv.id, title);
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  }, [activeConv, buildBasePayload, coachConversations, persistMessage]);

  const handleSendFollowup = useCallback(async () => {
    if (!inputText.trim() || !activeConv || sending) return;
    const client = getSupabaseClient();
    if (!client) { setError("Supabase is not configured."); return; }
    const userText = inputText.trim();
    setInputText("");
    setSending(true);
    setError(null);
    try {
      const historyForApi = localMessages.map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        text: formatMessageForHistory(m),
      }));
      historyForApi.push({ role: "user", text: userText });
      await persistMessage(activeConv, "user", { text: userText });
      const basePayload = await buildBasePayload();
      const payload = { mode: "followup", conversationHistory: historyForApi, ...basePayload };
      const { data, error: invokeError } = await client.functions.invoke("gemini-coach", { body: payload });
      if (invokeError) throw new Error(`Coach request failed: ${invokeError.message}`);
      if (data?.error) throw new Error(data.error);
      if (!data?.text) throw new Error("No response from coach.");
      await persistMessage(activeConv, "assistant", { text: data.text });
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  }, [activeConv, inputText, localMessages, buildBasePayload, coachConversations, persistMessage, sending]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendFollowup();
    }
  }, [handleSendFollowup]);

  const hasMessages = localMessages.length > 0;
  const hasAssistantMessage = localMessages.some((m) => m.role === "assistant");

  // ── Weekly plan handlers ─────────────────────────────────────────────────

  const fetchWeeklyPlan = useCallback(async () => {
    const client = getSupabaseClient();
    if (!client) { setPlanError("Supabase is not configured."); return; }
    setPlanLoading(true);
    setPlanError(null);
    setPlanAccepted(false);
    try {
      const basePayload = await buildBasePayload();
      const payload = { mode: "plan", ...basePayload };
      const { data, error: invokeError } = await client.functions.invoke("gemini-coach", { body: payload });
      if (invokeError) throw new Error(`Plan generation failed: ${invokeError.message}`);
      if (data?.error) throw new Error(data.error);
      if (!data?.structured_plan?.length) throw new Error("No plan returned from coach.");
      setPlanData(data);
      // Initialize conversation history
      const initialHistory = [
        { role: "user", text: "Generate my weekly training plan based on my recent training data." },
        { role: "model", text: data.coaching_feedback },
      ];
      setPlanConvHistory(initialHistory);
    } catch (err) {
      setPlanError(err.message);
    } finally {
      setPlanLoading(false);
    }
  }, [buildBasePayload]);

  const handleRevisionRequest = useCallback(async () => {
    if (!revisionInput.trim() || planLoading) return;
    const client = getSupabaseClient();
    if (!client) { setPlanError("Supabase is not configured."); return; }
    const userText = revisionInput.trim();
    setRevisionInput("");
    setPlanLoading(true);
    setPlanError(null);
    setPlanAccepted(false);
    try {
      const newHistory = [...planConvHistory, { role: "user", text: userText }];
      const basePayload = await buildBasePayload();
      const payload = { mode: "plan_revision", conversationHistory: newHistory, ...basePayload };
      const { data, error: invokeError } = await client.functions.invoke("gemini-coach", { body: payload });
      if (invokeError) throw new Error(`Revision failed: ${invokeError.message}`);
      if (data?.error) throw new Error(data.error);
      if (!data?.structured_plan?.length) throw new Error("No revised plan returned.");
      setPlanData(data);
      setPlanConvHistory([...newHistory, { role: "model", text: data.coaching_feedback }]);
    } catch (err) {
      setPlanError(err.message);
    } finally {
      setPlanLoading(false);
    }
  }, [revisionInput, planLoading, planConvHistory, buildBasePayload]);

  const handleRevisionKeyDown = useCallback((e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleRevisionRequest();
    }
  }, [handleRevisionRequest]);

  const handleAcceptPlan = useCallback(async () => {
    if (!planData?.structured_plan || !activePlan?.id) return;
    const client = getSupabaseClient();
    if (!client) { setPlanError("Supabase is not configured."); return; }
    setPlanAccepting(true);
    setPlanError(null);
    try {
      const nextMonday = getNextMonday();
      const nextSunday = new Date(`${nextMonday}T00:00:00Z`);
      nextSunday.setUTCDate(nextSunday.getUTCDate() + 6);
      const nextSundayIso = nextSunday.toISOString().split("T")[0];

      // Delete existing entries for next week
      await client
        .from("workout_entries")
        .delete()
        .eq("plan_id", activePlan.id)
        .gte("workout_date", nextMonday)
        .lte("workout_date", nextSundayIso);

      // Insert new entries from the plan
      const newEntries = planData.structured_plan
        .filter((day) => day.workout_type !== "Rest")
        .map((day) => ({
          plan_id: activePlan.id,
          user_id: auth.user?.id,
          workout_date: day.date,
          workout_type: day.workout_type,
          distance_km: day.distance_km || null,
          duration_min: day.duration_min || null,
          description: day.description || null,
          completed: false,
        }));

      if (newEntries.length > 0) {
        const { error: insertErr } = await client
          .from("workout_entries")
          .insert(newEntries);
        if (insertErr) throw insertErr;
      }

      setPlanAccepted(true);
    } catch (err) {
      setPlanError(err.message || "Failed to save plan.");
    } finally {
      setPlanAccepting(false);
    }
  }, [planData, activePlan]);

  return (
    <PageContainer id="coach">
      {/* ── Header ── */}
      <header className="flex items-center gap-4 mb-5 flex-wrap">
        <CoachAvatar size={48} />
        <div className="flex-1 min-w-0">
          <h2 className="m-0 mb-0.5 text-2xl font-bold font-sans text-slate-900">Marius AI Bakken</h2>
          <p className="m-0 text-sm text-slate-500">{t("coach.aiCoachSubtitle")}</p>
        </div>
        {/* Mobile sidebar toggle */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="md:hidden"
          onClick={() => setShowSidebar((s) => !s)}
          aria-label="Toggle conversations"
        >
          {showSidebar ? t("coach.hide") : t("coach.showConversations")}
        </Button>
      </header>

      {/* ── Tab switcher ── */}
      <div className="flex gap-1 p-1 bg-slate-100 rounded-xl mb-4 w-fit">
        <button
          type="button"
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            activeTab === "chat"
              ? "bg-white shadow-sm text-slate-900"
              : "text-slate-500 hover:text-slate-700"
          }`}
          onClick={() => setActiveTab("chat")}
        >
          Coaching Chat
        </button>
        <button
          type="button"
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            activeTab === "plan"
              ? "bg-white shadow-sm text-slate-900"
              : "text-slate-500 hover:text-slate-700"
          }`}
          onClick={() => setActiveTab("plan")}
        >
          Weekly Plan
        </button>
      </div>

      {/* ── Coaching Chat Tab ── */}
      {activeTab === "chat" && (
        <div
          className="flex bg-white border border-slate-200 rounded-2xl overflow-hidden"
          style={{ height: "calc(100vh - 280px)", minHeight: 480 }}
        >
          {/* Sidebar */}
          <aside
            className={`${showSidebar ? "flex" : "hidden"} md:flex w-64 shrink-0 border-r border-slate-200 flex-col`}
            aria-label="Conversations"
          >
            <div className="p-3 border-b border-slate-100">
              <Button type="button" className="w-full text-sm" onClick={handleNewConversation}>
                {t("coach.newConversation")}
              </Button>
            </div>
            <nav className="flex-1 overflow-y-auto py-1" aria-label="Conversation list">
              {coachConversations.conversations.length === 0 ? (
                <p className="px-4 py-6 text-xs text-slate-400 text-center">{t("coach.noConversations")}</p>
              ) : (
                <ul className="list-none m-0 p-0">
                  {coachConversations.conversations.map((conv) => (
                    <li key={conv.id} className="group">
                      {deletingId === conv.id ? (
                        <div className="px-3 py-2.5 bg-red-50">
                          <p className="text-xs text-red-700 mb-1.5">{t("coach.deleteConv")}</p>
                          <div className="flex gap-2">
                            <Button type="button" variant="destructive" size="sm" className="h-auto text-xs px-2.5 py-1" onClick={() => handleDeleteConversation(conv.id)}>
                              {t("coach.delete")}
                            </Button>
                            <Button type="button" variant="outline" size="sm" className="h-auto text-xs px-2.5 py-1" onClick={() => setDeletingId(null)}>
                              {t("coach.cancel")}
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div
                          className={`flex items-start justify-between gap-1 px-3 py-2.5 cursor-pointer hover:bg-slate-50 ${activeConv?.id === conv.id ? "bg-blue-50 border-r-2 border-blue-600" : ""}`}
                          onClick={() => handleSelectConversation(conv)}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => e.key === "Enter" && handleSelectConversation(conv)}
                          aria-current={activeConv?.id === conv.id ? "true" : undefined}
                        >
                          <div className="flex-1 min-w-0">
                            <p className="m-0 text-xs font-semibold text-slate-800 truncate">{conv.title}</p>
                            <p className="m-0 text-[11px] text-slate-400 mt-0.5">{relativeTime(conv.updated_at)}</p>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="opacity-0 group-hover:opacity-100 shrink-0 h-6 w-6 text-slate-400 hover:text-red-500 transition-opacity"
                            onClick={(e) => { e.stopPropagation(); setDeletingId(conv.id); }}
                            aria-label={`Delete conversation: ${conv.title}`}
                          >
                            ×
                          </Button>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </nav>
            <div className="border-t border-slate-100 p-3 overflow-y-auto max-h-72">
              <RunnerProfileSection background={runnerProfile.background} onSave={runnerProfile.saveProfile} saving={runnerProfile.loading} />
              <DailyLogSummary logs={dailyLogs.logs} />
            </div>
          </aside>

          {/* Chat area */}
          <div className="flex-1 flex flex-col min-w-0">
            <div className="px-4 pt-4 pb-0 shrink-0">
              {activePlan ? (
                <PlanBanner plan={activePlan} blocks={trainingBlocks.blocks} />
              ) : (
                <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-amber-900 mb-3 text-sm">
                  <p className="m-0">{t("coach.noPlan")} <strong>{t("coach.createPlanFirst")}</strong></p>
                </div>
              )}
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-3">
              {!activeConv ? (
                <div className="h-full flex flex-col items-center justify-center text-center gap-3 py-12">
                  <CoachAvatar size={56} />
                  <p className="m-0 text-sm text-slate-500 max-w-xs">{t("coach.emptyState")}</p>
                </div>
              ) : !hasMessages && !sending ? (
                <div className="h-full flex flex-col items-center justify-center text-center gap-3 py-12">
                  <p className="m-0 text-sm text-slate-500">{t("coach.clickRefresh")}</p>
                </div>
              ) : (
                <div>
                  {localMessages.map((msg) => (
                    <ChatMessage key={msg.id} msg={msg} />
                  ))}
                  {sending && (
                    <div className="flex gap-3 mb-4" role="status" aria-live="polite">
                      <CoachAvatar size={32} className="shrink-0 mt-0.5 opacity-60" />
                      <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-2.5">
                        <div className="w-4 h-4 rounded-full border-2 border-slate-200 border-t-blue-600 animate-spin shrink-0" aria-hidden="true" />
                        <p className="m-0 text-sm text-slate-500">{t("coach.analyzingMsg")}</p>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>
            {error && (
              <div className="mx-4 mb-2 bg-red-50 border border-red-200 rounded-xl p-3 text-red-800 text-sm flex gap-3 items-start" role="alert">
                <p className="m-0 flex-1">{error}</p>
                <Button type="button" variant="ghost" size="sm" className="self-start text-xs shrink-0 h-auto py-0.5 px-2" onClick={() => setError(null)}>
                  {t("coach.dismiss")}
                </Button>
              </div>
            )}
            <div className="px-4 pb-4 pt-2 border-t border-slate-100 shrink-0">
              {!activeConv ? null : !hasAssistantMessage ? (
                <Button type="button" onClick={fetchInitialInsights} disabled={sending}>
                  {sending ? t("coach.analyzingBtn") : t("coach.refreshCoaching")}
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Textarea
                    className="flex-1 px-3 py-2.5 border border-slate-200 rounded-xl font-inherit text-sm text-slate-900 bg-slate-50 resize-none leading-relaxed focus:outline-none focus:border-blue-600 focus:bg-white placeholder:text-slate-400 disabled:opacity-60"
                    rows={2}
                    placeholder={t("coach.followupPlaceholder")}
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={sending}
                  />
                  <Button type="button" className="self-end" onClick={handleSendFollowup} disabled={sending || !inputText.trim()}>
                    {sending ? "…" : t("coach.send")}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Weekly Plan Tab ── */}
      {activeTab === "plan" && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden"
          style={{ minHeight: 480 }}
        >
          {/* Plan content */}
          <div className="flex flex-col lg:flex-row" style={{ minHeight: 480 }}>

            {/* Left: Plan table */}
            <div className="flex-1 flex flex-col min-w-0 border-b lg:border-b-0 lg:border-r border-slate-200">
              <div className="px-5 pt-5 pb-3 border-b border-slate-100">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <h3 className="m-0 text-base font-bold text-slate-900">Upcoming Week</h3>
                    <p className="m-0 text-xs text-slate-500 mt-0.5">
                      AI-generated plan starting {getNextMonday()}
                    </p>
                  </div>
                  <Button
                    type="button"
                    onClick={fetchWeeklyPlan}
                    disabled={planLoading}
                    size="sm"
                  >
                    {planLoading ? (
                      <span className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full border-2 border-slate-200 border-t-white animate-spin" />
                        Generating…
                      </span>
                    ) : planData ? "Regenerate Plan" : "Generate Weekly Plan"}
                  </Button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-5 py-4">
                {!planData && !planLoading && !planError && (
                  <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
                    <CoachAvatar size={56} />
                    <div>
                      <p className="text-sm font-semibold text-slate-700">Generate your next training week</p>
                      <p className="text-xs text-slate-500 mt-1 max-w-xs">
                        Marius AI Bakken will analyze your last 4 weeks of training and create a personalized 7-day plan.
                      </p>
                    </div>
                    <Button type="button" onClick={fetchWeeklyPlan} disabled={planLoading}>
                      Generate Weekly Plan
                    </Button>
                  </div>
                )}

                {planLoading && !planData && (
                  <div className="flex flex-col items-center justify-center gap-3 py-16">
                    <div className="w-8 h-8 rounded-full border-4 border-slate-200 border-t-blue-600 animate-spin" />
                    <p className="text-sm text-slate-500">Analyzing your training data…</p>
                  </div>
                )}

                {planError && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-800 text-sm" role="alert">
                    <p className="m-0 font-semibold mb-1">Error</p>
                    <p className="m-0">{planError}</p>
                    <Button type="button" variant="ghost" size="sm" className="mt-2 text-xs" onClick={() => setPlanError(null)}>
                      Dismiss
                    </Button>
                  </div>
                )}

                {planData && (
                  <div className="space-y-4">
                    {/* Coaching feedback */}
                    <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
                      <div className="flex gap-2.5 items-start">
                        <CoachAvatar size={24} className="shrink-0 mt-0.5" />
                        <p className="m-0 text-sm text-blue-900 leading-relaxed">{planData.coaching_feedback}</p>
                      </div>
                    </div>

                    {/* 7-day table */}
                    <WeeklyPlanTable
                      plan={planData.structured_plan}
                      onAccept={handleAcceptPlan}
                      accepting={planAccepting}
                      accepted={planAccepted}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Right: Revision chat */}
            <div className="w-full lg:w-80 shrink-0 flex flex-col">
              <div className="px-4 pt-4 pb-3 border-b border-slate-100">
                <h3 className="m-0 text-sm font-bold text-slate-900">Request Revision</h3>
                <p className="m-0 text-xs text-slate-500 mt-0.5">
                  Tell the coach your constraints and get a revised plan
                </p>
              </div>

              {/* Revision history */}
              <div className="flex-1 overflow-y-auto px-4 py-3 min-h-[200px] max-h-[400px] lg:max-h-none">
                {planConvHistory.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-8">
                    {planData
                      ? "Plan generated. Request changes below."
                      : "Generate a plan first, then request revisions here."}
                  </p>
                ) : (
                  <div className="space-y-1">
                    {planConvHistory.map((msg, idx) => (
                      <PlanRevisionMessage key={idx} msg={msg} />
                    ))}
                    {planLoading && (
                      <div className="flex gap-2 mb-2">
                        <CoachAvatar size={24} className="shrink-0 mt-0.5 opacity-60" />
                        <div className="bg-white border border-slate-200 rounded-xl px-3 py-2 flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full border-2 border-slate-200 border-t-blue-600 animate-spin" />
                          <span className="text-xs text-slate-500">Revising…</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Revision input */}
              <div className="px-4 pb-4 pt-2 border-t border-slate-100">
                <Textarea
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-900 bg-slate-50 resize-none leading-relaxed focus:outline-none focus:border-blue-600 focus:bg-white placeholder:text-slate-400 disabled:opacity-60"
                  rows={3}
                  placeholder={planData
                    ? "E.g. 'I have a race on Saturday, move the long run to Friday'"
                    : "Generate a plan first…"}
                  value={revisionInput}
                  onChange={(e) => setRevisionInput(e.target.value)}
                  onKeyDown={handleRevisionKeyDown}
                  disabled={!planData || planLoading}
                />
                <Button
                  type="button"
                  className="w-full mt-2"
                  onClick={handleRevisionRequest}
                  disabled={!planData || planLoading || !revisionInput.trim()}
                  size="sm"
                >
                  {planLoading ? "Revising…" : "Request Revision"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  );
}
