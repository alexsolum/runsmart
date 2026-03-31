import React, { useCallback, useEffect, useRef, useState } from "react";
import { getSupabaseClient } from "../../lib/supabaseClient";
import { buildCoachPayload } from "../../lib/coachPayload";
import { ChangeCard } from "./ChangeCard";
import CoachAvatar from "../CoachAvatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

function ChatMessage({ msg, onApplyPatch, onDismissPatch }) {
  if (msg.role === "user") {
    const text = typeof msg.content === "string" ? msg.content : msg.content?.text ?? "";
    if (!text) return null;
    return (
      <div className="flex justify-end mb-4">
        <div className="bg-blue-600 text-white rounded-2xl rounded-tr-sm px-4 py-3 max-w-[70%]">
          <p className="m-0 text-sm leading-relaxed">{text}</p>
        </div>
      </div>
    );
  }

  // Assistant message
  const content = typeof msg.content === "string"
    ? (() => { try { return JSON.parse(msg.content); } catch { return { text: msg.content }; } })()
    : msg.content;

  const text = content?.text ?? "";
  const patch = content?.patch ?? null;
  const patchSummary = content?.patchSummary ?? null;

  return (
    <div className="flex gap-3 mb-4">
      <CoachAvatar size={32} className="shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        {text && (
          <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-sm px-4 py-3 max-w-[80%]">
            <p className="m-0 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{text}</p>
          </div>
        )}
        {patch && patch.length > 0 && (
          <ChangeCard
            patch={patch}
            patchSummary={patchSummary}
            onAccept={onApplyPatch}
            onDismiss={onDismissPatch}
          />
        )}
      </div>
    </div>
  );
}

export function ChatPanel({
  coachConversations,
  activeConversation,
  messages: externalMessages,
  hierarchicalPlan,
  activities,
  dailyLogs,
  checkins,
  runnerProfile,
  trainingBlocks,
  activePlan,
  lang,
  onConversationCreated,
  className = "",
}) {
  const [localMessages, setLocalMessages] = useState(externalMessages ?? []);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [inputText, setInputText] = useState("");
  const [dismissedPatches, setDismissedPatches] = useState(new Set());
  const messagesEndRef = useRef(null);

  useEffect(() => {
    setLocalMessages(externalMessages ?? []);
  }, [externalMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView?.({ behavior: "smooth" });
  }, [localMessages]);

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

  const handleSend = useCallback(async () => {
    if (!inputText.trim() || sending) return;
    const client = getSupabaseClient();
    if (!client) { setError("Supabase is not configured."); return; }

    const userText = inputText.trim();
    setInputText("");
    setSending(true);
    setError(null);

    try {
      // Ensure conversation exists
      let conv = activeConversation;
      if (!conv) {
        conv = await coachConversations.createConversation("New coaching chat");
        if (!conv) throw new Error("Failed to create conversation.");
        onConversationCreated?.(conv);
      }

      // Persist user message
      await persistMessage(conv, "user", { text: userText });

      // Build conversation history for API
      const historyForApi = localMessages
        .filter((m) => m.role === "user" || m.role === "assistant")
        .map((m) => ({
          role: m.role,
          content: typeof m.content === "string" ? m.content : JSON.stringify(m.content),
        }));

      // Build payload
      const planData = hierarchicalPlan?.plan?.plan_data ?? null;
      const basePayload = await buildCoachPayload({
        activities, dailyLogs, checkins,
        activePlan, trainingBlocks, runnerProfile,
        lang, mode: "chat",
        hierarchicalPlanData: planData,
      });

      const payload = {
        mode: "chat",
        userMessage: userText,
        conversationHistory: historyForApi,
        ...basePayload,
      };

      // Get session for auth
      const { data: sessionData } = await client.auth.getSession();
      const session = sessionData?.session;
      if (!session) throw new Error("No active session. Please sign in first.");

      const { data, error: invokeError } = await client.functions.invoke("claude-coach", {
        body: payload,
        headers: { Authorization: "Bearer " + session.access_token },
      });

      if (invokeError) throw new Error(`Coach request failed: ${invokeError.message}`);
      if (data?.error) throw new Error(data.error);
      if (!data?.text) throw new Error("No response from coach.");

      // Persist assistant message (store the full response as content)
      await persistMessage(conv, "assistant", {
        text: data.text,
        patch: data.patch ?? null,
        patchSummary: data.patchSummary ?? null,
      });

      // Update title for new conversations (first exchange)
      if (localMessages.length <= 2) {
        const title = userText.slice(0, 50) || "Coaching chat";
        await coachConversations.updateConversationTitle(conv.id, title);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  }, [
    inputText, sending, activeConversation, localMessages,
    coachConversations, hierarchicalPlan, activities, dailyLogs,
    checkins, activePlan, trainingBlocks, runnerProfile, lang,
    persistMessage, onConversationCreated,
  ]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  const handleApplyPatch = useCallback(async (patch) => {
    await hierarchicalPlan.applyPatch(patch);
  }, [hierarchicalPlan]);

  const handleDismissPatch = useCallback(() => {
    // Mark the latest patch as dismissed (by message id)
    const lastPatchMsg = [...localMessages].reverse().find(
      (m) => m.role === "assistant" && (m.content?.patch || (typeof m.content === "object" && m.content?.patch))
    );
    if (lastPatchMsg) {
      setDismissedPatches((prev) => new Set([...prev, lastPatchMsg.id]));
    }
  }, [localMessages]);

  return (
    <div className={`flex flex-col ${className}`} data-testid="chat-panel">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {localMessages.length === 0 && !sending ? (
          <div className="h-full flex flex-col items-center justify-center text-center gap-3 py-12">
            <CoachAvatar size={56} />
            <p className="m-0 text-sm text-slate-500 max-w-xs">
              Ask your coach about your training plan, workouts, or recovery.
            </p>
          </div>
        ) : (
          <div>
            {localMessages.map((msg) => {
              const isDismissed = dismissedPatches.has(msg.id);
              const msgForRender = isDismissed
                ? { ...msg, content: { ...(typeof msg.content === "object" ? msg.content : {}), patch: null } }
                : msg;
              return (
                <ChatMessage
                  key={msg.id}
                  msg={msgForRender}
                  onApplyPatch={handleApplyPatch}
                  onDismissPatch={handleDismissPatch}
                />
              );
            })}
            {sending && (
              <div className="flex gap-3 mb-4" role="status" aria-live="polite">
                <CoachAvatar size={32} className="shrink-0 mt-0.5 opacity-60" />
                <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-2.5">
                  <div className="w-4 h-4 rounded-full border-2 border-slate-200 border-t-blue-600 animate-spin shrink-0" aria-hidden="true" />
                  <p className="m-0 text-sm text-slate-500">Thinking...</p>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Error display */}
      {error && (
        <div className="mx-4 mb-2 bg-red-50 border border-red-200 rounded-xl p-3 text-red-800 text-sm flex gap-3 items-start" role="alert">
          <p className="m-0 flex-1">{error}</p>
          <Button type="button" variant="ghost" size="sm" className="self-start text-xs shrink-0 h-auto py-0.5 px-2" onClick={() => setError(null)}>
            Dismiss
          </Button>
        </div>
      )}

      {/* Input area */}
      <div className="px-4 pb-4 pt-2 border-t border-slate-100 shrink-0">
        <div className="flex gap-2">
          <Textarea
            className="flex-1 px-3 py-2.5 border border-slate-200 rounded-xl font-inherit text-sm text-slate-900 bg-slate-50 resize-none leading-relaxed focus:outline-none focus:border-blue-600 focus:bg-white placeholder:text-slate-400 disabled:opacity-60"
            rows={2}
            placeholder="Ask your coach anything..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={sending}
            data-testid="chat-input"
          />
          <Button
            type="button"
            className="self-end"
            onClick={handleSend}
            disabled={sending || !inputText.trim()}
            data-testid="chat-send"
          >
            {sending ? "..." : "Send"}
          </Button>
        </div>
      </div>
    </div>
  );
}
