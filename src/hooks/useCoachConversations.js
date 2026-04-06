import { useCallback, useEffect, useMemo, useState } from "react";
import { getSupabaseClient } from "../lib/supabaseClient";

/**
 * Manages coach chat sessions and messages.
 *
 * Sessions live in coach_conversations and message turns live in coach_messages.
 * The hook normalizes that split schema back into the UI shape expected by the
 * conversation sidebar and chat panel.
 */
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
        .select("id, title, created_at, updated_at")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false });

      if (err) throw err;

      const sessionList = (data ?? []).map((row) => ({
        session_id: row.id,
        firstMessage: row.title || "New conversation",
        createdAt: row.created_at,
        updatedAt: row.updated_at ?? row.created_at,
      }));

      setSessions(sessionList);
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
        .from("coach_messages")
        .select("id, role, content, created_at")
        .eq("conversation_id", sessionId)
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
