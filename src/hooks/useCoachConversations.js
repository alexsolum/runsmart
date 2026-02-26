import { useCallback, useState } from "react";
import { getSupabaseClient } from "../lib/supabaseClient";

export function useCoachConversations(userId) {
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversationState] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadConversations = useCallback(async () => {
    if (!userId) return;
    const client = getSupabaseClient();
    if (!client) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await client
        .from("coach_conversations")
        .select("*")
        .order("updated_at", { ascending: false });
      if (err) throw err;
      setConversations(data ?? []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const loadMessages = useCallback(async (conversationId) => {
    if (!conversationId) {
      setMessages([]);
      return;
    }
    const client = getSupabaseClient();
    if (!client) return;
    try {
      const { data, error: err } = await client
        .from("coach_messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });
      if (err) throw err;
      setMessages(data ?? []);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  const createConversation = useCallback(async (title = "New conversation") => {
    if (!userId) return null;
    const client = getSupabaseClient();
    if (!client) return null;
    try {
      const { data, error: err } = await client
        .from("coach_conversations")
        .insert({ user_id: userId, title })
        .select()
        .single();
      if (err) throw err;
      setConversations((prev) => [data, ...prev]);
      return data;
    } catch (err) {
      setError(err.message);
      return null;
    }
  }, [userId]);

  const addMessage = useCallback(async (conversationId, role, content) => {
    const client = getSupabaseClient();
    if (!client) return null;
    try {
      const { data, error: err } = await client
        .from("coach_messages")
        .insert({ conversation_id: conversationId, role, content })
        .select()
        .single();
      if (err) throw err;
      setMessages((prev) => [...prev, data]);
      return data;
    } catch (err) {
      setError(err.message);
      return null;
    }
  }, []);

  const updateConversationTitle = useCallback(async (id, title) => {
    const client = getSupabaseClient();
    if (!client) return;
    try {
      const { error: err } = await client
        .from("coach_conversations")
        .update({ title })
        .eq("id", id);
      if (err) throw err;
      setConversations((prev) =>
        prev.map((c) => (c.id === id ? { ...c, title } : c))
      );
    } catch (err) {
      setError(err.message);
    }
  }, []);

  const deleteConversation = useCallback(async (id) => {
    const client = getSupabaseClient();
    if (!client) return;
    try {
      const { error: err } = await client
        .from("coach_conversations")
        .delete()
        .eq("id", id);
      if (err) throw err;
      setConversations((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      setError(err.message);
    }
  }, []);

  const setActiveConversation = useCallback(async (conversationOrId) => {
    if (!conversationOrId) {
      setActiveConversationState(null);
      setMessages([]);
      return;
    }
    const conv =
      typeof conversationOrId === "string"
        ? conversations.find((c) => c.id === conversationOrId)
        : conversationOrId;
    setActiveConversationState(conv ?? null);
    if (conv) {
      await loadMessages(conv.id);
    }
  }, [conversations, loadMessages]);

  return {
    conversations,
    activeConversation,
    messages,
    loading,
    error,
    loadConversations,
    loadMessages,
    createConversation,
    addMessage,
    updateConversationTitle,
    deleteConversation,
    setActiveConversation,
  };
}
