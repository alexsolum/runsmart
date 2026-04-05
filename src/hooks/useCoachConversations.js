import { useCallback, useEffect, useState } from "react";
import { getSupabaseClient } from "../lib/supabaseClient";

/**
 * Manages coach chat sessions and messages.
 *
 * Sessions are grouped by session_id UUID in the coach_conversations table.
 * Each row is one message turn. Session title is derived from the first
 * user message on the frontend.
 */
export function useCoachConversations(userId) {
  const [sessions, setSessions] = useState([]);
  const [messages, setMessages] = useState([]);
  const [activeSessionId, setActiveSessionIdState] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load session list: distinct session_ids with their first user message + created_at
  const loadSessions = useCallback(async () => {
    if (!userId) return;
    const client = getSupabaseClient();
    if (!client) return;
    setLoading(true);
    setError(null);
    try {
      // Get all messages grouped by session — we derive sessions client-side
      const { data, error: err } = await client
        .from("coach_conversations")
        .select("session_id, role, content, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: true });
      if (err) throw err;

      // Derive session list from messages
      const sessionMap = new Map();
      for (const row of (data ?? [])) {
        if (!sessionMap.has(row.session_id)) {
          // Extract title from first user message
          let title = "New conversation";
          if (row.role === "user") {
            const text = extractTextFromContent(row.content);
            if (text) title = text.slice(0, 60) + (text.length > 60 ? "..." : "");
          }
          sessionMap.set(row.session_id, {
            session_id: row.session_id,
            firstMessage: title,
            createdAt: row.created_at,
          });
        }
      }

      // Sort by createdAt descending
      const sessionList = Array.from(sessionMap.values())
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setSessions(sessionList);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Load messages for a specific session
  const loadMessages = useCallback(async (sessionId) => {
    if (!sessionId) {
      setMessages([]);
      return;
    }
    const client = getSupabaseClient();
    if (!client) return;
    try {
      const { data, error: err } = await client
        .from("coach_conversations")
        .select("id, session_id, role, content, created_at")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: true });
      if (err) throw err;
      setMessages(data ?? []);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  // Set active session and load its messages
  const setActiveSessionId = useCallback(async (sessionId) => {
    setActiveSessionIdState(sessionId);
    if (sessionId) {
      await loadMessages(sessionId);
    } else {
      setMessages([]);
    }
  }, [loadMessages]);

  // Start a new session — just generates a UUID, no DB write
  const startNewSession = useCallback(() => {
    const newId = crypto.randomUUID();
    setActiveSessionIdState(newId);
    setMessages([]);
    return newId;
  }, []);

  // Reload messages for the active session (called after edge fn responds)
  const reload = useCallback(async () => {
    if (activeSessionId) {
      await loadMessages(activeSessionId);
    }
  }, [activeSessionId, loadMessages]);

  // Auto-load sessions on mount
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

function extractTextFromContent(content) {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    for (const block of content) {
      if (block.type === "text" && block.text) return block.text;
    }
  }
  if (content?.text) return content.text;
  return null;
}
