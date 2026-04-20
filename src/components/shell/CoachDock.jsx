import { useCallback, useEffect, useRef, useState } from "react";
import { useAppData } from "../../context/AppDataContext";
import { getSupabaseClient } from "../../lib/supabaseClient";
import Icon from "./Icon";

const SUGGESTIONS = [
  "Kutte om tungt?",
  "Hva er planen for tirsdag?",
  "Status mot A-løpet",
];

function shouldCollapseForViewport() {
  if (typeof window === "undefined") return false;
  return window.innerWidth <= 1180;
}

export default function CoachDock() {
  const { auth, activities, trainingBlocks, checkins, hierarchicalPlan, coachConversations } =
    useAppData();

  const { sessions, messages, activeSessionId, setActiveSessionId, startNewSession } =
    coachConversations;

  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [optimistic, setOptimistic] = useState([]);
  const bodyRef = useRef(null);

  useEffect(() => {
    function syncDockMode() {
      if (shouldCollapseForViewport()) {
        setOpen(false);
      }
    }

    window.addEventListener("resize", syncDockMode);
    syncDockMode();
    return () => window.removeEventListener("resize", syncDockMode);
  }, []);

  // Session init
  useEffect(() => {
    if (!auth.user?.id) return;
    if (!activeSessionId && sessions.length === 0) startNewSession();
    else if (!activeSessionId && sessions.length > 0) setActiveSessionId(sessions[0].session_id);
  }, [auth.user?.id, activeSessionId, sessions, startNewSession, setActiveSessionId]);

  // Auto-scroll
  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [messages.length, optimistic.length]);

  const buildAthleteContext = useCallback(
    () => ({
      plan: hierarchicalPlan.plan?.plan_data ?? null,
      recentActivities: (activities?.activities ?? []).slice(0, 10).map((a) => ({
        name: a.name || a.type || "Run",
        distance: (Number(a.distance) || 0) / 1000,
        duration: a.moving_time || 0,
        effort: a.perceived_effort ?? null,
      })),
      trainingBlocks: trainingBlocks?.blocks ?? [],
      checkins: (checkins?.checkins ?? []).slice(0, 3),
    }),
    [hierarchicalPlan.plan, activities?.activities, trainingBlocks?.blocks, checkins?.checkins],
  );

  const send = useCallback(
    async (text) => {
      const msg = (text ?? input).trim();
      if (!msg || !activeSessionId || sending) return;

      setInput("");
      setSending(true);
      setOptimistic([{ id: `opt-${Date.now()}`, role: "user", content: [{ type: "text", text: msg }] }]);

      try {
        const client = getSupabaseClient();
        const { data: sessionData } = await client.auth.getSession();
        const token = sessionData?.session?.access_token;
        if (!token) throw new Error("Not authenticated");

        const { data, error } = await client.functions.invoke("claude-coach", {
          body: { sessionId: activeSessionId, newMessage: msg, athleteContext: buildAthleteContext() },
          headers: { Authorization: `Bearer ${token}` },
        });
        if (error) throw error;

        if (data?.planUpdated) await hierarchicalPlan.loadPlan();
        await coachConversations.reload();
      } catch (err) {
        setOptimistic((prev) => [
          ...prev,
          {
            id: `opt-err-${Date.now()}`,
            role: "assistant",
            content: [{ type: "text", text: `Feil: ${err.message}` }],
          },
        ]);
      } finally {
        setSending(false);
        setOptimistic([]);
      }
    },
    [input, activeSessionId, sending, buildAthleteContext, hierarchicalPlan, coachConversations],
  );

  // External trigger from "Replanlegg med AI" button
  useEffect(() => {
    const handler = (e) => {
      setOpen(true);
      send(e.detail);
    };
    window.addEventListener("rs:coach-ask", handler);
    return () => window.removeEventListener("rs:coach-ask", handler);
  }, [send]);

  const allMessages = [...messages, ...optimistic];

  if (!open) {
    return (
      <button
        className="coach-dock collapsed"
        style={{ display: "flex", alignItems: "center", padding: "10px 14px", gap: 10, cursor: "pointer" }}
        onClick={() => setOpen(true)}
      >
        <div className="coach-ava" style={{ width: 28, height: 28 }} />
        <div style={{ lineHeight: 1.1 }}>
          <div style={{ fontFamily: "var(--ff-display)", fontWeight: 700, fontSize: 12.5, color: "var(--ink-strong)" }}>
            Trener
          </div>
          <div style={{ fontSize: 10.5, color: "var(--ink-muted)", letterSpacing: ".08em", textTransform: "uppercase" }}>
            Spør meg
          </div>
        </div>
      </button>
    );
  }

  return (
    <div className="coach-dock">
      <div className="coach-head" onClick={() => setOpen(false)}>
        <div className="coach-ava" />
        <div className="coach-who">
          <span className="n">Trener</span>
          <span className="s">Aktiv · svarer på sek</span>
        </div>
        <div className="expand">
          <Icon name="chevD" size={14} />
        </div>
      </div>

      <div className="coach-body" ref={bodyRef}>
        {allMessages.length === 0 && !sending && (
          <div className="coach-hint" style={{ textAlign: "center", padding: "20px 0" }}>
            Hei! Jeg er treneren din. Spør meg om planen, form eller løpet.
          </div>
        )}
        {allMessages.map((m) => {
          const isMe = m.role === "user";
          let text = "";
          if (Array.isArray(m.content)) {
            const block = m.content.find((b) => b.type === "text");
            if (block) {
              try {
                const parsed = JSON.parse(block.text);
                text = parsed.content ?? block.text;
              } catch {
                text = block.text;
              }
            }
          } else if (typeof m.content === "string") {
            text = m.content;
          }
          return (
            <div key={m.id} className={`coach-msg${isMe ? " mine" : ""}`}>
              {text}
            </div>
          );
        })}
        {sending && (
          <div className="coach-hint" style={{ padding: "4px 2px" }}>Tenker…</div>
        )}
      </div>

      <div className="coach-suggestions">
        {SUGGESTIONS.map((s) => (
          <button key={s} onClick={() => send(s)}>
            {s}
          </button>
        ))}
      </div>

      <form
        className="coach-input"
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
      >
        <input
          placeholder="Spør treneren…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
          }}
        />
        <button type="submit" className="send" disabled={sending}>
          <Icon name="send" size={14} />
        </button>
      </form>
    </div>
  );
}
