import { useCallback, useEffect, useMemo, useState } from "react";
import { getSupabaseClient } from "../lib/supabaseClient";

/**
 * Manages coach chat sessions and messages.
 *
 * The live schema stores one message turn per row in coach_conversations and
 * groups threads via session_id. This hook normalizes that flat structure back
 * into the UI shape expected by the chat surfaces.
 */
function previewText(content) {
  if (Array.isArray(content)) {
    const textBlock = content.find((block) => block?.type === "text" && typeof block.text === "string");
    if (textBlock?.text) return textBlock.text;
  }

  if (typeof content === "string") return content;

  return null;
}

export function useCoachConversations(userId) {
  const client = useMemo(() => getSupabaseClient(), []);
  const [sessions, setSessions] = useState([]);
  const [messages, setMessages] = useState([]);
  const [activeSessionId, setActiveSessionIdState] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadSessions = useCallback(async () => {
    if (!userId || !client) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error: err } = await client
        .from("coach_conversations")
        .select("id, session_id, role, content, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (err) throw err;

      const grouped = new Map();
      for (const row of data ?? []) {
        const existing = grouped.get(row.session_id);
        const preview = previewText(row.content);
        if (!existing) {
          grouped.set(row.session_id, {
            session_id: row.session_id,
            firstMessage: preview || "New conversation",
            createdAt: row.created_at,
            updatedAt: row.created_at,
          });
          continue;
        }

        if (new Date(row.created_at) < new Date(existing.createdAt)) {
          existing.createdAt = row.created_at;
          if (preview) existing.firstMessage = preview;
        }
      }

      setSessions(Array.from(grouped.values()));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [client, userId]);

  const loadMessages = useCallback(async (sessionId) => {
    if (!sessionId) {
      setMessages([]);
      return;
    }

    if (!client) return;

    try {
      setError(null);

      const { data, error: err } = await client
        .from("coach_conversations")
        .select("id, session_id, role, content, created_at")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: true });

      if (err) throw err;

      setMessages(
        (data ?? []).map((row) => ({
          ...row,
          session_id: sessionId,
        })),
      );
    } catch (err) {
      setError(err.message);
    }
  }, [client]);

  const setActiveSessionId = useCallback(async (sessionId) => {
    setActiveSessionIdState(sessionId);
    if (sessionId) {
      await loadMessages(sessionId);
    } else {
      setMessages([]);
    }
  }, [loadMessages]);

  const startNewSession = useCallback(() => {
    const newId = crypto.randomUUID();
    setActiveSessionIdState(newId);
    setMessages([]);
    return newId;
  }, []);

  const reload = useCallback(async () => {
    if (activeSessionId) {
      await loadMessages(activeSessionId);
    }
  }, [activeSessionId, loadMessages]);

  useEffect(() => {
    if (userId) loadSessions();
  }, [userId, loadSessions]);

  return {
    sessions,
    messages,
    activeSessionId,
    setActiveSessionId,
    loading,
    error,
    startNewSession,
    reload,
    loadSessions,
  };
}
