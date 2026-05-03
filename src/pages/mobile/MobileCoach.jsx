import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAppData } from "../../context/AppDataContext";
import { getSupabaseClient } from "../../lib/supabaseClient";

function renderText(message) {
  if (Array.isArray(message?.content)) {
    const block = message.content.find((item) => item.type === "text");
    if (!block) return "";
    try {
      const parsed = JSON.parse(block.text);
      return parsed.content ?? block.text;
    } catch {
      return block.text;
    }
  }
  return typeof message?.content === "string" ? message.content : "";
}

export default function MobileCoach({ load, season, goalRace }) {
  const { coachConversations, hierarchicalPlan, activities, trainingBlocks, checkins, showToast } = useAppData();
  const { sessions, messages, activeSessionId, setActiveSessionId, startNewSession, reload } = coachConversations ?? {};
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [optimistic, setOptimistic] = useState([]);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (!coachConversations) return;
    if (!activeSessionId && sessions?.length === 0) startNewSession?.();
    else if (!activeSessionId && sessions?.length > 0) setActiveSessionId?.(sessions[0].session_id);
  }, [activeSessionId, coachConversations, sessions, setActiveSessionId, startNewSession]);

  const buildAthleteContext = useCallback(() => ({
    plan: hierarchicalPlan?.plan?.plan_data ?? null,
    activities: (activities?.activities ?? []).slice(0, 30).map((activity) => ({
      id: activity.id,
      name: activity.name,
      started_at: activity.started_at,
      distance_km: activity.distance_km ?? (activity.distance ? activity.distance / 1000 : null),
      duration: activity.moving_time,
      effort: activity.perceived_effort ?? null,
      type: activity.type ?? activity.activity_type,
    })),
    trainingBlocks: trainingBlocks?.blocks ?? [],
    checkins: (checkins?.checkins ?? []).slice(0, 3),
  }), [activities?.activities, checkins?.checkins, hierarchicalPlan?.plan, trainingBlocks?.blocks]);

  const send = useCallback(async () => {
    const msg = input.trim();
    if (!msg || !activeSessionId || sending) return;
    setInput("");
    setSending(true);
    setOptimistic([{ id: `opt-${Date.now()}`, role: "user", content: [{ type: "text", text: msg }] }]);
    try {
      const client = getSupabaseClient();
      const { data: sessionData } = await client.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) throw new Error("Ikke innlogget");
      const { data, error } = await client.functions.invoke("claude-coach", {
        body: { sessionId: activeSessionId, newMessage: msg, athleteContext: buildAthleteContext() },
        headers: { Authorization: `Bearer ${token}` },
      });
      if (error) throw error;
      if (data?.planUpdated) await hierarchicalPlan?.loadPlan?.();
      await reload?.();
    } catch (err) {
      showToast?.({ type: "error", message: `Trener: ${err.message}` });
      setOptimistic((prev) => [...prev, { id: `opt-err-${Date.now()}`, role: "assistant", content: [{ type: "text", text: `Feil: ${err.message}` }] }]);
    } finally {
      setSending(false);
      setOptimistic([]);
    }
  }, [activeSessionId, buildAthleteContext, hierarchicalPlan, input, reload, sending, showToast]);

  const allMessages = useMemo(() => [...(messages ?? []), ...optimistic], [messages, optimistic]);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [allMessages]);

  const prompts = ["Dagens økt", "Tempo for lørdag", "Restitusjonsråd", "Løpsforberedelse"];

  return (
    <div className="rs-m-coach-screen">
      <div className="rs-m-coach-context">
        <div className="rs-m-coach-context-cell">
          <div className="rs-m-coach-context-val">{Math.round(load?.ctl ?? 0)}</div>
          <div className="rs-m-coach-context-lbl">CTL</div>
        </div>
        <div className="rs-m-coach-context-cell">
          <div className="rs-m-coach-context-val">{Math.round(load?.tsb ?? 0)}</div>
          <div className="rs-m-coach-context-lbl">TSB</div>
        </div>
        <div className="rs-m-coach-context-cell">
          <div className="rs-m-coach-context-val">{season?.currentBlock?.name ?? "Plan"}</div>
          <div className="rs-m-coach-context-lbl">Fase</div>
        </div>
        <div className="rs-m-coach-context-cell">
          <div className="rs-m-coach-context-val">{goalRace?.daysToRace ?? "–"}</div>
          <div className="rs-m-coach-context-lbl">Dager</div>
        </div>
      </div>

      <div className="rs-m-section-title">
        <h1 style={{ margin: 0, font: "inherit" }}>AI-trener</h1>
      </div>

      <div className="rs-m-chat-area">
        {allMessages.length === 0 && !sending ? (
          <div className="rs-m-empty" style={{ margin: 0 }}>
            Hei, jeg er treningstreneren din. Spør om planen, restitusjon, tempo eller løpsstrategi.
          </div>
        ) : null}
        {allMessages.map((message) => {
          const isUser = message.role === "user";
          return isUser ? (
            <div key={message.id} className="rs-m-chat-bubble is-user">{renderText(message)}</div>
          ) : (
            <div key={message.id} className="rs-m-chat-ai-row">
              <div className="rs-m-chat-ai-icon">AI</div>
              <div className="rs-m-chat-bubble is-ai">{renderText(message)}</div>
            </div>
          );
        })}
        {sending ? (
          <div className="rs-m-chat-ai-row">
            <div className="rs-m-chat-ai-icon">AI</div>
            <div className="rs-m-chat-bubble is-ai">
              <div className="rs-m-typing-dots">
                <span className="rs-m-typing-dot" />
                <span className="rs-m-typing-dot" />
                <span className="rs-m-typing-dot" />
              </div>
            </div>
          </div>
        ) : null}
        <div ref={bottomRef} />
      </div>

      <div className="rs-m-quick-prompts">
        {prompts.map((prompt) => (
          <button key={prompt} type="button" className="rs-m-quick-prompt" onClick={() => setInput(prompt)}>
            {prompt}
          </button>
        ))}
      </div>

      <div className="rs-m-chat-input-bar">
        <input
          className="rs-m-chat-input"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") send();
          }}
          placeholder="Spør om trening, tempo, restitusjon..."
        />
        <button type="button" className="rs-m-chat-send" onClick={send} disabled={sending || !activeSessionId || !input.trim()} aria-label="Send">
          ↑
        </button>
      </div>
    </div>
  );
}
