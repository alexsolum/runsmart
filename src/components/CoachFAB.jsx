import React, { useCallback, useEffect, useState } from "react";
import { ChatPanel } from "./chat/ChatPanel";
import CoachAvatar from "./CoachAvatar";
import { Button } from "@/components/ui/button";

export function CoachFAB({
  coachConversations,
  hierarchicalPlan,
  activities,
  dailyLogs,
  checkins,
  runnerProfile,
  trainingBlocks,
  activePlan,
  lang,
  canPatchPlan = true,
}) {
  const [open, setOpen] = useState(false);

  const {
    messages,
    activeSessionId,
    startNewSession,
    reload,
    loadSessions,
  } = coachConversations;

  // Load sessions on mount so FAB chat appears in CoachPage list
  useEffect(() => {
    loadSessions();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Start a new session when FAB opens with no active session
  useEffect(() => {
    if (open && !activeSessionId) {
      startNewSession();
    }
  }, [open, activeSessionId, startNewSession]);

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

  const handleToggle = useCallback(() => {
    setOpen((prev) => !prev);
  }, []);

  return (
    <>
      {/* FAB button */}
      <button
        type="button"
        onClick={handleToggle}
        className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg flex items-center justify-center transition-all hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2"
        aria-label={open ? "Close coach chat" : "Open coach chat"}
        data-testid="coach-fab-button"
      >
        {open ? (
          <span className="text-xl font-bold" aria-hidden="true">&times;</span>
        ) : (
          <CoachAvatar size={32} />
        )}
      </button>

      {/* Chat overlay panel */}
      {open && (
        <div
          className="fixed bottom-24 right-6 z-40 w-96 max-w-[calc(100vw-3rem)] bg-white border border-slate-200 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          style={{ height: "min(560px, calc(100vh - 10rem))" }}
          data-testid="coach-fab-panel"
        >
          {/* Panel header */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 shrink-0">
            <CoachAvatar size={28} />
            <div className="flex-1 min-w-0">
              <h3 className="m-0 text-sm font-bold text-slate-900">Coach Chat</h3>
              <p className="m-0 text-[11px] text-slate-500">
                {canPatchPlan ? "Ask about your plan" : "Ask questions while you set up your first plan"}
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="shrink-0 h-auto py-1 px-2 text-xs text-slate-400 hover:text-slate-600"
              onClick={startNewSession}
            >
              New
            </Button>
          </div>

          {/* Chat panel — reusing the same component as CoachPage */}
          <ChatPanel
            sessionId={activeSessionId}
            messages={messages}
            buildAthleteContext={buildAthleteContext}
            onMessageSent={reload}
            canApplyPatch={canPatchPlan}
            patchUnavailableReason="Generate a plan first, then you can apply coach-proposed schedule changes from here."
            onApplyPatch={async (patch) => {
              await hierarchicalPlan.applyPatch(patch);
              await hierarchicalPlan.loadPlan();
            }}
            onPlanRefresh={async () => {
              await hierarchicalPlan.loadPlan();
            }}
          />
        </div>
      )}
    </>
  );
}
