import React, { useCallback, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { getSupabaseClient } from "../../lib/supabaseClient";
import { ChangeCard } from "./ChangeCard";
import CoachAvatar from "../CoachAvatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

function ChatMessage({ msg, canApplyPatch, patchUnavailableReason, onApplyPatch, onDismissPatch }) {
  if (msg.role === "user") {
    const text = extractText(msg.content);
    if (!text) return null;
    return (
      <div className="flex justify-end mb-4">
        <div className="bg-blue-600 text-white rounded-2xl rounded-tr-sm px-4 py-3 max-w-[70%]">
          <p className="m-0 text-sm leading-relaxed">{text}</p>
        </div>
      </div>
    );
  }

  // Assistant message — parse envelope from content
  const envelope = parseAssistantContent(msg.content);
  const text = envelope.content ?? "";
  const patches = envelope.patches ?? null;
  const patchSummary = envelope.patchSummary ?? null;
  const planUpdated = envelope.planUpdated ?? false;

  // Split text into lines to detect questions
  const lines = text.split('\n');
  const formattedContent = lines.map((line, i) => {
    const trimmed = line.trim();
    if (trimmed.endsWith('?') && trimmed.length > 5) {
      return (
        <div key={i} className="my-3 p-3 bg-blue-50 border-l-4 border-blue-400 rounded-r-xl">
          <p className="m-0 text-sm font-semibold text-blue-900">{trimmed}</p>
        </div>
      );
    }
    return (
      <ReactMarkdown 
        key={i}
        className="text-sm text-slate-700 leading-relaxed markdown-content"
        components={{
          p: ({node, ...props}) => <p className="m-0 mb-2 last:mb-0" {...props} />,
          ul: ({node, ...props}) => <ul className="m-0 mb-2 ml-4 list-disc" {...props} />,
          ol: ({node, ...props}) => <ol className="m-0 mb-2 ml-4 list-decimal" {...props} />,
          li: ({node, ...props}) => <li className="mb-1 last:mb-0" {...props} />,
        }}
      >
        {line}
      </ReactMarkdown>
    );
  });

  return (
    <div className="flex gap-3 mb-4">
      <CoachAvatar size={32} className="shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        {text && (
          <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-sm px-4 py-3 max-w-[85%] shadow-sm">
            {formattedContent}
          </div>
        )}
        {planUpdated && (
          <div className="mt-2 flex items-center gap-1.5 text-xs text-green-700 font-medium">
            <span className="flex items-center justify-center w-4 h-4 rounded-full bg-green-100 text-[10px]">✓</span> 
            Plan updated
          </div>
        )}
        {patches && patches.length > 0 && !planUpdated && (
          canApplyPatch ? (
            <ChangeCard
              patch={patches}
              patchSummary={patchSummary}
              onAccept={onApplyPatch}
              onDismiss={onDismissPatch}
            />
          ) : (
            <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900" data-testid="patch-unavailable-note">
              {patchSummary && <p className="m-0 mb-1 font-semibold">{patchSummary}</p>}
              <p className="m-0">{patchUnavailableReason}</p>
            </div>
          )
        )}
      </div>
    </div>
  );
}

export function ChatPanel({
  sessionId,
  messages,
  buildAthleteContext,
  onMessageSent,
  canApplyPatch,
  patchUnavailableReason,
  onApplyPatch,
  onPlanRefresh,
}) {
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [optimisticMessages, setOptimisticMessages] = useState([]);
  const scrollRef = useRef(null);
  const textareaRef = useRef(null);

  const allMessages = [...messages, ...optimisticMessages];

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [allMessages.length]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || !sessionId || sending) return;

    setInput("");
    setSending(true);

    // Optimistic user message
    const optimisticUser = {
      id: `opt-${Date.now()}`,
      role: "user",
      content: [{ type: "text", text }],
      created_at: new Date().toISOString(),
    };
    setOptimisticMessages([optimisticUser]);

    try {
      const client = getSupabaseClient();
      const session = (await client.auth.getSession()).data.session;
      if (!session?.access_token) throw new Error("Not authenticated");

      const { data, error } = await client.functions.invoke("claude-coach", {
        body: {
          sessionId,
          newMessage: text,
          athleteContext: buildAthleteContext(),
        },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) throw error;

      // If plan was updated, refresh plan data
      if (data?.planUpdated) {
        await onPlanRefresh?.();
      }

      // Reload messages from DB to get the persisted versions
      await onMessageSent?.();
    } catch (err) {
      // Add error as optimistic assistant message
      setOptimisticMessages((prev) => [
        ...prev,
        {
          id: `opt-err-${Date.now()}`,
          role: "assistant",
          content: [{ type: "text", text: JSON.stringify({ type: "conversation", content: `Error: ${err.message}` }) }],
          created_at: new Date().toISOString(),
        },
      ]);
    } finally {
      setSending(false);
      setOptimisticMessages([]);
    }
  }, [input, sessionId, sending, buildAthleteContext, onMessageSent, onPlanRefresh]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Message list */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4">
        {allMessages.length === 0 && !sending && (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 text-sm">
            <CoachAvatar size={48} className="mb-3 opacity-50" />
            <p>Ask your coach anything about your training.</p>
          </div>
        )}
        {allMessages.map((msg) => (
          <ChatMessage
            key={msg.id}
            msg={msg}
            canApplyPatch={canApplyPatch}
            patchUnavailableReason={patchUnavailableReason}
            onApplyPatch={onApplyPatch}
            onDismissPatch={() => {}}
          />
        ))}
        {sending && optimisticMessages.length > 0 && (
          <div className="flex gap-3 mb-4">
            <CoachAvatar size={32} className="shrink-0 mt-0.5 animate-pulse" />
            <div className="bg-slate-100 rounded-2xl rounded-tl-sm px-4 py-3">
              <span className="text-sm text-slate-400">Thinking...</span>
            </div>
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="border-t border-slate-200 px-4 py-3 bg-white">
        <div className="flex gap-2">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask your coach..."
            className="flex-1 min-h-[40px] max-h-[120px] resize-none"
            rows={1}
            disabled={sending}
          />
          <Button onClick={handleSend} disabled={!input.trim() || sending}>
            Send
          </Button>
        </div>
      </div>
    </div>
  );
}

function extractText(content) {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    for (const block of content) {
      if (block.type === "text" && block.text) return block.text;
    }
  }
  if (content?.text) return content.text;
  return null;
}

function parseAssistantContent(content) {
  // Content is stored as JSONB — may be an array of content blocks from the API
  if (Array.isArray(content)) {
    for (const block of content) {
      if (block.type === "text") {
        try {
          return JSON.parse(block.text);
        } catch {
          return { type: "conversation", content: block.text };
        }
      }
    }
    return { type: "conversation", content: "" };
  }
  if (typeof content === "string") {
    try {
      return JSON.parse(content);
    } catch {
      return { type: "conversation", content };
    }
  }
  if (content?.type) return content;
  return { type: "conversation", content: content?.text ?? "" };
}
