import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAppData } from "../context/AppDataContext";
import PageContainer from "../components/layout/PageContainer";
import CoachAvatar from "../components/CoachAvatar";
import { ChatPanel } from "../components/chat/ChatPanel";
import { useI18n } from "../i18n/translations";
import { Button } from "@/components/ui/button";

// ── helpers ───────────────────────────────────────────────────────────────────

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
        <h3 className="m-0 text-xs font-bold font-sans text-slate-900">{t("coach.aboutYou")}</h3>
        <p className="m-0 text-[11px] text-slate-500">
          {t("coach.profileDescPre")} <strong>{t("nav.trainingPlan")}</strong> {t("coach.profileDescPost")}
        </p>
      </div>
      <textarea
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

// ── page ──────────────────────────────────────────────────────────────────────

export default function CoachPage() {
  const { t, lang } = useI18n();
  const { auth, plans, activities, dailyLogs, checkins, trainingBlocks, runnerProfile, coachConversations, hierarchicalPlan } = useAppData();

  // ── Chat state ───────────────────────────────────────────────────────────
  const [localMessages, setLocalMessages] = useState(coachConversations.messages);
  const [activeConv, setActiveConv] = useState(coachConversations.activeConversation);
  const [showSidebar, setShowSidebar] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

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

  // ── Conversation handlers ────────────────────────────────────────────────

  const handleSelectConversation = useCallback(async (conv) => {
    setActiveConv(conv);
    setLocalMessages([]);
    await coachConversations.setActiveConversation(conv);
  }, [coachConversations]);

  const handleNewConversation = useCallback(async () => {
    const conv = await coachConversations.createConversation("New conversation");
    if (conv) {
      setActiveConv(conv);
      setLocalMessages([]);
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

      {/* ── Chat Page ── */}
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
          <ChatPanel
            coachConversations={coachConversations}
            activeConversation={activeConv}
            messages={localMessages}
            hierarchicalPlan={hierarchicalPlan}
            activities={activities.activities}
            dailyLogs={dailyLogs.logs}
            checkins={checkins.checkins}
            runnerProfile={runnerProfile.background}
            trainingBlocks={trainingBlocks.blocks}
            activePlan={activePlan}
            lang={lang}
            onConversationCreated={(conv) => setActiveConv(conv)}
            className="flex-1 min-w-0"
          />
        </div>
      </div>
    </PageContainer>
  );
}
