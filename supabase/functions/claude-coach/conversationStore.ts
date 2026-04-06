// Flat schema: coach_conversations has one row per message turn.
// Messages are grouped by session_id (client-generated UUID).
// user_id is stored on each row for RLS + direct lookup.

export async function loadConversationHistory(
  supabase: any,
  userId: string,
  sessionId: string,
) {
  const { data, error } = await supabase
    .from("coach_conversations")
    .select("role, content")
    .eq("user_id", userId)
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });

  if (error) throw new Error(`History load failed: ${error.message}`);
  return data ?? [];
}

export async function persistConversationTurn(
  supabase: any,
  userId: string,
  sessionId: string,
  userContent: Record<string, unknown>,
  assistantContent: unknown,
) {
  const { error } = await supabase
    .from("coach_conversations")
    .insert([
      {
        user_id: userId,
        session_id: sessionId,
        role: "user",
        content: [userContent],
      },
      {
        user_id: userId,
        session_id: sessionId,
        role: "assistant",
        content: assistantContent,
      },
    ]);

  if (error) throw new Error(`Conversation persist failed: ${error.message}`);
}
