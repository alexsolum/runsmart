import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAppData } from "../context/AppDataContext";
import { getSupabaseClient } from "../lib/supabaseClient";
import CoachAvatar from "../components/CoachAvatar";
import { useI18n } from "../i18n/translations";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

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
        <h3 className="m-0 text-xs font-bold text-slate-900">{t("coach.aboutYou")}</h3>
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

// ── page ──────────────────────────────────────────────────────────────────────

export default function CoachPage() {
  const { t } = useI18n();
  const { plans, activities, dailyLogs, checkins, trainingBlocks, runnerProfile, coachConversations } = useAppData();

  // Local message list for immediate rendering (optimistic updates)
  const [localMessages, setLocalMessages] = useState(coachConversations.messages);
  // Local active conversation (can diverge from hook during transitions)
  const [activeConv, setActiveConv] = useState(coachConversations.activeConversation);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [inputText, setInputText] = useState("");
  const [showSidebar, setShowSidebar] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const messagesEndRef = useRef(null);

  const activePlan = plans.plans[0] ?? null;

  // Sync local messages when hook messages change (e.g., after loadMessages)
  useEffect(() => {
    setLocalMessages(coachConversations.messages);
  }, [coachConversations.messages]);

  // Sync local active conversation when hook changes it
  useEffect(() => {
    setActiveConv(coachConversations.activeConversation);
  }, [coachConversations.activeConversation]);

  // Load conversations and runner profile on mount
  useEffect(() => {
    coachConversations.loadConversations();
    runnerProfile.loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView?.({ behavior: "smooth" });
  }, [localMessages]);

  // Add a message optimistically + persist to Supabase
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
    // The useEffect above will sync messages once the hook updates them
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
    if (!client) {
      setError("Supabase is not configured. Check your environment settings.");
      return;
    }
    setSending(true);
    setError(null);

    try {
      // Create conversation if none is active
      let conv = activeConv;
      if (!conv) {
        conv = await coachConversations.createConversation("New conversation");
        if (!conv) throw new Error("Failed to create conversation.");
        setActiveConv(conv);
      }

      // Add initial request user message
      await persistMessage(conv, "user", { type: "initial_request" });

      const [freshLogs] = await Promise.all([
        dailyLogs.loadLogs().catch(() => dailyLogs.logs),
      ]);

      const background = runnerProfile.background;
      const goal = activePlan?.goal ?? null;
      const runnerProfilePayload = (background || goal) ? { background: background || null, goal } : null;

      const payload = {
        mode: "initial",
        weeklySummary: buildWeeklySummaries(activities.activities),
        recentActivities: getRecentActivities(activities.activities),
        latestCheckin: checkins.checkins[0] ?? null,
        planContext: buildPlanContext(activePlan, trainingBlocks.blocks),
        dailyLogs: getRecentDailyLogs(freshLogs ?? []),
        runnerProfile: runnerProfilePayload,
      };

      const { data, error: invokeError } = await client.functions.invoke("gemini-coach", { body: payload });
      if (invokeError) throw new Error(`Coach request failed: ${invokeError.message}`);
      if (data?.error) throw new Error(data.error);
      if (!data?.insights) throw new Error("No insights returned from coach.");

      await persistMessage(conv, "assistant", data.insights);

      // Auto-generate conversation title from first insight
      const title = data.insights[0]?.title?.slice(0, 50) ?? "Coaching session";
      await coachConversations.updateConversationTitle(conv.id, title);
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  }, [
    activeConv, activities.activities, checkins.checkins, dailyLogs,
    activePlan, trainingBlocks.blocks, runnerProfile, coachConversations, persistMessage,
  ]);

  const handleSendFollowup = useCallback(async () => {
    if (!inputText.trim() || !activeConv || sending) return;

    const client = getSupabaseClient();
    if (!client) {
      setError("Supabase is not configured. Check your environment settings.");
      return;
    }

    const userText = inputText.trim();
    setInputText("");
    setSending(true);
    setError(null);

    try {
      // Snapshot history before adding new message
      const historyForApi = localMessages.map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        text: formatMessageForHistory(m),
      }));
      historyForApi.push({ role: "user", text: userText });

      // Optimistically add user message
      await persistMessage(activeConv, "user", { text: userText });

      const [freshLogs] = await Promise.all([
        dailyLogs.loadLogs().catch(() => dailyLogs.logs),
      ]);

      const background = runnerProfile.background;
      const goal = activePlan?.goal ?? null;
      const runnerProfilePayload = (background || goal) ? { background: background || null, goal } : null;

      const payload = {
        mode: "followup",
        conversationHistory: historyForApi,
        weeklySummary: buildWeeklySummaries(activities.activities),
        recentActivities: getRecentActivities(activities.activities),
        latestCheckin: checkins.checkins[0] ?? null,
        planContext: buildPlanContext(activePlan, trainingBlocks.blocks),
        dailyLogs: getRecentDailyLogs(freshLogs ?? []),
        runnerProfile: runnerProfilePayload,
      };

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
  }, [
    activeConv, inputText, localMessages, activities.activities, checkins.checkins,
    dailyLogs, activePlan, trainingBlocks.blocks, runnerProfile, coachConversations, persistMessage, sending,
  ]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendFollowup();
    }
  }, [handleSendFollowup]);

  const hasMessages = localMessages.length > 0;
  // Show the Refresh button until the first assistant message arrives
  const hasAssistantMessage = localMessages.some((m) => m.role === "assistant");

  return (
    <section className="page" id="coach">
      {/* ── Header ── */}
      <header className="flex items-center gap-4 mb-5 flex-wrap">
        <CoachAvatar size={48} />
        <div className="flex-1 min-w-0">
          <h2 className="m-0 mb-0.5 text-2xl font-bold text-slate-900">Marius AI Bakken</h2>
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

      {/* ── Main layout ── */}
      <div
        className="flex bg-white border border-slate-200 rounded-2xl overflow-hidden"
        style={{ height: "calc(100vh - 220px)", minHeight: 480 }}
      >
        {/* ── Sidebar ── */}
        <aside
          className={`${showSidebar ? "flex" : "hidden"} md:flex w-64 shrink-0 border-r border-slate-200 flex-col`}
          aria-label="Conversations"
        >
          {/* New conversation button */}
          <div className="p-3 border-b border-slate-100">
            <Button
              type="button"
              className="w-full text-sm"
              onClick={handleNewConversation}
            >
              {t("coach.newConversation")}
            </Button>
          </div>

          {/* Conversation list */}
          <nav className="flex-1 overflow-y-auto py-1" aria-label="Conversation list">
            {coachConversations.conversations.length === 0 ? (
              <p className="px-4 py-6 text-xs text-slate-400 text-center">
                {t("coach.noConversations")}
              </p>
            ) : (
              <ul className="list-none m-0 p-0">
                {coachConversations.conversations.map((conv) => (
                  <li key={conv.id} className="group">
                    {deletingId === conv.id ? (
                      <div className="px-3 py-2.5 bg-red-50">
                        <p className="text-xs text-red-700 mb-1.5">{t("coach.deleteConv")}</p>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            className="h-auto text-xs px-2.5 py-1"
                            onClick={() => handleDeleteConversation(conv.id)}
                          >
                            {t("coach.delete")}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-auto text-xs px-2.5 py-1"
                            onClick={() => setDeletingId(null)}
                          >
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
                          title="Delete"
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

          {/* Runner profile + wellness in sidebar */}
          <div className="border-t border-slate-100 p-3 overflow-y-auto max-h-72">
            <RunnerProfileSection
              background={runnerProfile.background}
              onSave={runnerProfile.saveProfile}
              saving={runnerProfile.loading}
            />
            <DailyLogSummary logs={dailyLogs.logs} />
          </div>
        </aside>

        {/* ── Chat area ── */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Plan banner + context */}
          {(activePlan || !activePlan) && (
            <div className="px-4 pt-4 pb-0 shrink-0">
              {activePlan ? (
                <PlanBanner plan={activePlan} blocks={trainingBlocks.blocks} />
              ) : (
                <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-amber-900 mb-3 text-sm">
                  <p className="m-0">
                    {t("coach.noPlan")} <strong>{t("coach.createPlanFirst")}</strong>
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3">
            {!activeConv ? (
              <div className="h-full flex flex-col items-center justify-center text-center gap-3 py-12">
                <CoachAvatar size={56} />
                <p className="m-0 text-sm text-slate-500 max-w-xs">
                  {t("coach.emptyState")}
                </p>
              </div>
            ) : !hasMessages && !sending ? (
              <div className="h-full flex flex-col items-center justify-center text-center gap-3 py-12">
                <p className="m-0 text-sm text-slate-500">
                  {t("coach.clickRefresh")}
                </p>
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

          {/* Error */}
          {error && (
            <div className="mx-4 mb-2 bg-red-50 border border-red-200 rounded-xl p-3 text-red-800 text-sm flex gap-3 items-start" role="alert">
              <p className="m-0 flex-1">{error}</p>
              <Button type="button" variant="ghost" size="sm" className="self-start text-xs shrink-0 h-auto py-0.5 px-2" onClick={() => setError(null)}>
                {t("coach.dismiss")}
              </Button>
            </div>
          )}

          {/* Input area */}
          <div className="px-4 pb-4 pt-2 border-t border-slate-100 shrink-0">
            {!activeConv ? null : !hasAssistantMessage ? (
              <Button
                type="button"
                onClick={fetchInitialInsights}
                disabled={sending}
              >
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
                <Button
                  type="button"
                  className="self-end"
                  onClick={handleSendFollowup}
                  disabled={sending || !inputText.trim()}
                >
                  {sending ? "…" : t("coach.send")}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
