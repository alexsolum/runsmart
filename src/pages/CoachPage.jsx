import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAppData } from "../context/AppDataContext";
import PageContainer from "../components/layout/PageContainer";
import CoachAvatar from "../components/CoachAvatar";
import { ChatPanel } from "../components/chat/ChatPanel";
import { useI18n } from "../i18n/translations";
import { Button } from "@/components/ui/button";

export default function CoachPage() {
  const { t } = useI18n();
  const { auth, plans, activities, dailyLogs, checkins, trainingBlocks, runnerProfile, coachConversations, hierarchicalPlan } = useAppData();

  const {
    sessions,
    messages,
    activeSessionId,
    setActiveSessionId,
    startNewSession,
    reload,
  } = coachConversations;

  const [showSidebar, setShowSidebar] = useState(false);
  const activePlan = plans.plans[0] ?? null;

  // Auto-start a new session if none active
  useEffect(() => {
    if (!activeSessionId && sessions.length === 0) {
      startNewSession();
    } else if (!activeSessionId && sessions.length > 0) {
      setActiveSessionId(sessions[0].session_id);
    }
  }, [activeSessionId, sessions, startNewSession, setActiveSessionId]);

  // Build athlete context for each edge function call
  const buildAthleteContext = useCallback(() => {
    return {
      plan: hierarchicalPlan.plan?.plan_data ?? null,
      recentActivities: (activities.activities ?? []).slice(0, 30).map((a) => ({
        name: a.name || a.type || "Run",
        distance: (Number(a.distance) || 0) / 1000,
        duration: a.moving_time || 0,
        effort: a.perceived_effort ?? null,
      })),
      trainingBlocks: (trainingBlocks.blocks ?? []),
      checkins: (checkins.checkins ?? []).slice(0, 3),
    };
  }, [hierarchicalPlan.plan, activities.activities, trainingBlocks.blocks, checkins.checkins]);

  const handleNewSession = useCallback(() => {
    startNewSession();
    setShowSidebar(false);
  }, [startNewSession]);

  const handleSelectSession = useCallback((sessionId) => {
    setActiveSessionId(sessionId);
    setShowSidebar(false);
  }, [setActiveSessionId]);

  return (
    <PageContainer title={t("nav.coach")}>
      <div className="flex h-full max-h-[calc(100vh-120px)]">
        {/* Session sidebar */}
        {showSidebar && (
          <div className="w-64 border-r border-slate-200 bg-slate-50 p-3 overflow-y-auto shrink-0">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Sessions</h3>
              <Button size="sm" variant="outline" onClick={handleNewSession}>New</Button>
            </div>
            {sessions.map((s) => (
              <button
                key={s.session_id}
                onClick={() => handleSelectSession(s.session_id)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm mb-1 truncate ${
                  s.session_id === activeSessionId
                    ? "bg-blue-100 text-blue-900 font-medium"
                    : "text-slate-700 hover:bg-slate-100"
                }`}
              >
                {s.firstMessage}
              </button>
            ))}
          </div>
        )}

        {/* Main chat area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-200">
            <button
              onClick={() => setShowSidebar(!showSidebar)}
              className="text-slate-500 hover:text-slate-700 p-1"
              aria-label="Toggle sessions"
            >
              ☰
            </button>
            <CoachAvatar size={32} />
            <div>
              <h2 className="text-base font-bold text-slate-900 m-0">Marius AI Bakken</h2>
              <span className="text-xs text-slate-500">Running Coach</span>
            </div>
            <div className="ml-auto">
              <Button size="sm" variant="outline" onClick={handleNewSession}>
                + {t("coach.newSession") ?? "New Session"}
              </Button>
            </div>
          </div>

          {/* Chat panel */}
          <ChatPanel
            sessionId={activeSessionId}
            messages={messages}
            buildAthleteContext={buildAthleteContext}
            onMessageSent={reload}
            canApplyPatch={!!hierarchicalPlan.plan}
            patchUnavailableReason={!hierarchicalPlan.plan ? t("coach.noPlanForPatch") ?? "Generate a plan first to enable modifications." : null}
            onApplyPatch={async (patch) => {
              await hierarchicalPlan.applyPatch(patch);
              await hierarchicalPlan.loadPlan();
            }}
            onPlanRefresh={async () => {
              await hierarchicalPlan.loadPlan();
              await trainingBlocks.loadBlocks();
            }}
          />
        </div>
      </div>
    </PageContainer>
  );
}
