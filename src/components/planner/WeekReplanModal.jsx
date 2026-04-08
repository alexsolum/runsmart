import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { X } from "lucide-react";
import { useAppData } from "../../context/AppDataContext";
import { getSupabaseClient } from "../../lib/supabaseClient";
import { ChangeCard } from "../chat/ChangeCard";
import CoachAvatar from "../CoachAvatar";

function formatDate(isoDate) {
  return new Date(`${isoDate}T00:00:00Z`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function formatWorkoutMetric(workout) {
  if (typeof workout.distanceKm === "number") return `${workout.distanceKm} km`;
  if (typeof workout.durationMinutes === "number") return `${workout.durationMinutes} min`;
  return null;
}

function buildOpeningMessage(week) {
  const dateRange = `${formatDate(week.startDate)}–${formatDate(week.endDate)}`;
  return `I can see Week ${week.weekNumber} (${week.phase}, ${dateRange}). Tell me what's happening this week — travel, events, fatigue, anything that affects training — and I'll suggest a revised schedule.`;
}

export function WeekReplanModal({ open, onOpenChange, week }) {
  const { hierarchicalPlan, activities, trainingBlocks, checkins } = useAppData();
  const sessionId = useMemo(() => crypto.randomUUID(), []);

  const openingText = useMemo(() => week ? buildOpeningMessage(week) : "", [week]);

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  // Reset when modal opens with a new week
  useEffect(() => {
    if (open && week) {
      setMessages([
        {
          id: "opening",
          role: "assistant",
          text: openingText,
          patches: null,
          patchSummary: null,
          planUpdated: false,
          dismissed: false,
        },
      ]);
      setInput("");
      setSending(false);
    }
  }, [open, week?.weekNumber]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length]);

  // Focus input on open
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const buildAthleteContext = useCallback(() => ({
    plan: hierarchicalPlan.plan?.plan_data ?? null,
    recentActivities: (activities.activities ?? []).slice(0, 20).map((a) => ({
      name: a.name || a.type || "Run",
      distance: (Number(a.distance) || 0) / 1000,
      duration: a.moving_time || 0,
    })),
    trainingBlocks: trainingBlocks.blocks ?? [],
    checkins: (checkins.checkins ?? []).slice(0, 3),
    weekContext: {
      weekNumber: week?.weekNumber,
      phase: week?.phase,
      focus: week?.focus,
      startDate: week?.startDate,
      endDate: week?.endDate,
      days: (week?.days ?? []).map((d) => ({
        dayOfWeek: d.dayOfWeek,
        date: d.date,
        workouts: (d.workouts ?? []).map((w) => ({
          type: w.type,
          name: w.name,
          distanceKm: w.distanceKm ?? null,
          durationMinutes: w.durationMinutes ?? null,
        })),
      })),
    },
  }), [hierarchicalPlan.plan, activities.activities, trainingBlocks.blocks, checkins.checkins, week]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || sending) return;

    setInput("");
    setSending(true);

    // Append optimistic user message
    const userMsg = { id: `u-${Date.now()}`, role: "user", text };
    setMessages((prev) => [...prev, userMsg]);

    // Build history for edge function (exclude opening static message)
    const conversationHistory = messages
      .filter((m) => m.id !== "opening")
      .map((m) => ({
        role: m.role,
        content: m.role === "user"
          ? [{ type: "text", text: m.text }]
          : [{ type: "text", text: JSON.stringify({ type: "conversation", content: m.text }) }],
      }));

    try {
      const client = getSupabaseClient();
      const session = (await client.auth.getSession()).data.session;
      if (!session?.access_token) throw new Error("Not authenticated");

      const { data, error } = await client.functions.invoke("claude-coach", {
        body: {
          sessionId,
          newMessage: text,
          conversationHistory,
          skipPersist: true,
          athleteContext: buildAthleteContext(),
        },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) throw error;

      const patches = data?.patches ?? null;
      const patchSummary = data?.patchSummary ?? null;

      const assistantMsg = {
        id: `a-${Date.now()}`,
        role: "assistant",
        text: data?.content ?? "",
        patches,
        patchSummary,
        planUpdated: false,
        dismissed: false,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: "assistant",
          text: `Sorry, something went wrong: ${err.message}`,
          patches: null,
          patchSummary: null,
          planUpdated: false,
          dismissed: false,
        },
      ]);
    } finally {
      setSending(false);
    }
  }, [input, sending, messages, sessionId, buildAthleteContext]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  const handleApplyPatch = useCallback(async (msgId, patches) => {
    try {
      await hierarchicalPlan.applyPatch(patches);
      await hierarchicalPlan.loadPlan();
      setMessages((prev) =>
        prev.map((m) => m.id === msgId ? { ...m, planUpdated: true } : m)
      );
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: "assistant",
          text: `Failed to apply changes: ${err.message}`,
          patches: null,
          patchSummary: null,
          planUpdated: false,
          dismissed: false,
        },
      ]);
    }
  }, [hierarchicalPlan]);

  const handleDismissPatch = useCallback((msgId) => {
    setMessages((prev) =>
      prev.map((m) => m.id === msgId ? { ...m, dismissed: true } : m)
    );
  }, []);

  if (!open || !week) return null;

  const sortedDays = [...(week.days ?? [])].sort((a, b) => {
    const toMon = (iso) => { const d = new Date(`${iso}T00:00:00Z`).getUTCDay(); return d === 0 ? 7 : d; };
    return toMon(a.date) - toMon(b.date);
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onOpenChange(false); }}
    >
      <div className="flex w-full max-w-2xl rounded-[28px] bg-white shadow-2xl overflow-hidden"
        style={{ height: "min(600px, calc(100vh - 4rem))" }}>

        {/* Left panel — week snapshot */}
        <div className="w-52 shrink-0 flex flex-col bg-slate-50 border-r border-slate-200 overflow-y-auto">
          <div className="px-4 py-4 border-b border-slate-200">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-1">Week {week.weekNumber}</p>
            <p className="text-sm font-semibold text-slate-900">{week.phase}</p>
            <p className="text-xs text-slate-500 mt-0.5">{formatDate(week.startDate)} – {formatDate(week.endDate)}</p>
            {week.focus && <p className="text-xs text-slate-500 mt-1 italic">{week.focus}</p>}
          </div>
          <div className="flex flex-col gap-1.5 p-3">
            {sortedDays.map((day) => (
              <div key={day.date} className="rounded-xl bg-white border border-slate-200 px-3 py-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">{day.dayOfWeek}</p>
                {day.workouts.length > 0 ? (
                  day.workouts.map((w) => (
                    <div key={w.id}>
                      <p className="text-xs font-semibold text-slate-800 truncate">{w.name}</p>
                      {formatWorkoutMetric(w) && (
                        <p className="text-[10px] text-slate-500">{formatWorkoutMetric(w)}</p>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400">Rest</p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Right panel — chat */}
        <div className="flex flex-1 flex-col min-w-0">
          {/* Chat header */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-200 shrink-0">
            <CoachAvatar size={28} />
            <div className="flex-1 min-w-0">
              <h3 className="m-0 text-sm font-bold text-slate-900">Replan Week {week.weekNumber}</h3>
              <p className="m-0 text-[11px] text-slate-500">Powered by your running coach</p>
            </div>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="rounded-full p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
              aria-label="Close"
            >
              <X size={16} />
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg) => (
              <div key={msg.id}>
                {msg.role === "user" ? (
                  <div className="flex justify-end">
                    <div className="bg-blue-600 text-white rounded-2xl rounded-tr-sm px-4 py-2.5 max-w-[75%]">
                      <p className="m-0 text-sm leading-relaxed">{msg.text}</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-3">
                    <CoachAvatar size={28} className="shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      {msg.text && (
                        <div className="bg-slate-100 rounded-2xl rounded-tl-sm px-4 py-2.5 max-w-[85%]">
                          <p className="m-0 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                        </div>
                      )}
                      {msg.planUpdated && (
                        <p className="mt-1.5 text-xs text-green-700 font-medium">✓ Plan updated</p>
                      )}
                      {msg.patches && msg.patches.length > 0 && !msg.planUpdated && !msg.dismissed && (
                        <div className="mt-2">
                          <ChangeCard
                            patch={msg.patches}
                            patchSummary={msg.patchSummary}
                            onAccept={(patches) => handleApplyPatch(msg.id, patches)}
                            onDismiss={() => handleDismissPatch(msg.id)}
                          />
                        </div>
                      )}
                      {msg.dismissed && (
                        <p className="mt-1.5 text-xs text-slate-400">Changes dismissed</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
            {sending && (
              <div className="flex gap-3">
                <CoachAvatar size={28} className="shrink-0" />
                <div className="bg-slate-100 rounded-2xl rounded-tl-sm px-4 py-2.5">
                  <p className="m-0 text-sm text-slate-500 animate-pulse">Thinking…</p>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="shrink-0 p-3 border-t border-slate-200 flex gap-2 items-end">
            <textarea
              ref={inputRef}
              rows={2}
              className="flex-1 resize-none rounded-2xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-300"
              placeholder="Tell the coach about your week…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={sending}
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={!input.trim() || sending}
              className="shrink-0 w-9 h-9 rounded-full bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white flex items-center justify-center transition-colors"
              aria-label="Send"
            >
              <span className="text-base leading-none">↑</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
