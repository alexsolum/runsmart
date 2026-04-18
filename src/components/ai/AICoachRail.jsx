import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronRight, ChevronLeft, Bot } from "lucide-react";
import { useAppData } from "../../context/AppDataContext";
import { ChatPanel } from "../chat/ChatPanel";
import { generateCoachingInsights } from "../../domain/compute";
import { useI18n } from "../../i18n/translations";

const INSIGHT_LABELS = {
  "coach.overtrainingRisk": "Overtraining risk detected",
  "coach.highLoadRatio": "High training load ratio",
  "coach.wellRested": "Good form — well rested",
  "coach.deepFatigue": "Deep fatigue accumulation",
  "coach.balancedLoad": "Balanced training load",
  "coach.fitnessGrowing": "Fitness trending upward",
  "coach.fitnessDeclining": "Fitness declining",
};

function MarginNote({ insight }) {
  const borderColor =
    insight.type === "danger"
      ? "var(--signal-risk)"
      : insight.type === "warning"
      ? "var(--signal-warn)"
      : insight.type === "positive"
      ? "var(--signal-good)"
      : "var(--ink-muted)";

  const label = INSIGHT_LABELS[insight.titleKey] ?? insight.titleKey;

  return (
    <div
      style={{
        borderLeft: `2px solid ${borderColor}`,
        paddingLeft: 10,
        marginBottom: 10,
      }}
    >
      <p
        style={{
          margin: 0,
          fontFamily: "var(--font-family-serif)",
          fontStyle: "italic",
          fontSize: 13,
          color: "var(--ink)",
          lineHeight: 1.5,
        }}
      >
        {label}
      </p>
    </div>
  );
}

export default function AICoachRail({ activePage }) {
  const { t } = useI18n();
  const {
    auth,
    activities,
    trainingBlocks,
    checkins,
    plans,
    hierarchicalPlan,
    coachConversations,
  } = useAppData();

  const [isOpen, setIsOpen] = useState(false);
  const { sessions, messages, activeSessionId, setActiveSessionId, startNewSession, reload } =
    coachConversations;

  useEffect(() => {
    if (!activeSessionId && sessions.length === 0) {
      startNewSession();
    } else if (!activeSessionId && sessions.length > 0) {
      setActiveSessionId(sessions[0].session_id);
    }
  }, [activeSessionId, sessions, startNewSession, setActiveSessionId]);

  const insights = useMemo(() => {
    const acts = activities?.activities ?? [];
    if (acts.length < 7) return [];
    return generateCoachingInsights({
      activities: acts,
      checkins: checkins?.checkins ?? [],
      plans: plans?.plans ?? [],
    }).slice(0, 3);
  }, [activities?.activities, checkins?.checkins, plans?.plans]);

  const buildAthleteContext = useCallback(() => {
    return {
      plan: hierarchicalPlan.plan?.plan_data ?? null,
      recentActivities: (activities?.activities ?? []).slice(0, 30).map((a) => ({
        name: a.name || a.type || "Run",
        distance: (Number(a.distance) || 0) / 1000,
        duration: a.moving_time || 0,
        effort: a.perceived_effort ?? null,
      })),
      trainingBlocks: trainingBlocks?.blocks ?? [],
      checkins: (checkins?.checkins ?? []).slice(0, 3),
    };
  }, [hierarchicalPlan.plan, activities?.activities, trainingBlocks?.blocks, checkins?.checkins]);

  const handleApplyPatch = useCallback(
    async (patch) => {
      await hierarchicalPlan.applyPatch(patch);
      await hierarchicalPlan.loadPlan();
    },
    [hierarchicalPlan],
  );

  const handlePlanRefresh = useCallback(async () => {
    await hierarchicalPlan.loadPlan();
  }, [hierarchicalPlan]);

  return (
    <div
      className="ai-coach-rail"
      style={{ width: isOpen ? 360 : 48 }}
      aria-label="AI Coach"
    >
      {/* Toggle button */}
      <button
        type="button"
        className="ai-coach-rail__toggle"
        onClick={() => setIsOpen((v) => !v)}
        aria-label={isOpen ? "Collapse AI rail" : "Open AI Coach"}
        title={isOpen ? "Collapse" : "AI Coach"}
      >
        <Bot size={16} style={{ color: "var(--accent-race)" }} />
        {isOpen && (
          <ChevronRight size={14} style={{ color: "var(--ink-muted)" }} />
        )}
        {!isOpen && (
          <ChevronLeft size={14} style={{ color: "var(--ink-muted)" }} />
        )}
      </button>

      {isOpen && (
        <div className="ai-coach-rail__body">
          {/* Observations */}
          {insights.length > 0 && (
            <div className="ai-coach-rail__observations">
              <p className="ai-coach-rail__obs-label">OBSERVATIONS</p>
              {insights.map((ins, i) => (
                <MarginNote key={i} insight={ins} />
              ))}
            </div>
          )}

          {/* Divider */}
          <div style={{ height: 1, background: "rgba(11,23,56,0.08)", margin: "0 16px" }} />

          {/* Chat */}
          <div className="ai-coach-rail__chat">
            <div className="ai-coach-rail__chat-header">
              <span
                style={{
                  fontFamily: "var(--font-family-mono)",
                  fontSize: 10,
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  color: "var(--ink-muted)",
                }}
              >
                COACH CHAT
              </span>
              <button
                type="button"
                onClick={() => startNewSession()}
                style={{
                  border: 0,
                  background: "none",
                  fontSize: 11,
                  color: "var(--accent-race)",
                  cursor: "pointer",
                  fontFamily: "var(--font-family-sans)",
                  padding: 0,
                }}
              >
                + New
              </button>
            </div>
            <ChatPanel
              sessionId={activeSessionId}
              messages={messages}
              buildAthleteContext={buildAthleteContext}
              onMessageSent={reload}
              canApplyPatch={!!hierarchicalPlan.plan}
              patchUnavailableReason={
                !hierarchicalPlan.plan
                  ? t("coach.noPlanForPatch") ?? "Generate a plan first."
                  : null
              }
              onApplyPatch={handleApplyPatch}
              onPlanRefresh={handlePlanRefresh}
            />
          </div>
        </div>
      )}

      {!isOpen && (
        <div
          style={{
            writingMode: "vertical-rl",
            textOrientation: "mixed",
            transform: "rotate(180deg)",
            fontFamily: "var(--font-family-mono)",
            fontSize: 9,
            color: "var(--ink-muted)",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            userSelect: "none",
            paddingBottom: 8,
          }}
        >
          AI COACH
        </div>
      )}
    </div>
  );
}
