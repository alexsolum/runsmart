export async function ensureConversationExists(
  supabase: any,
  userId: string,
  sessionId: string,
) {
  const { data, error } = await supabase
    .from("coach_conversations")
    .select("id")
    .eq("id", sessionId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw new Error(`Conversation lookup failed: ${error.message}`);
  if (data) return data;

  const { error: insertError } = await supabase
    .from("coach_conversations")
    .insert({
      id: sessionId,
      user_id: userId,
      title: "New conversation",
    });

  if (insertError) throw new Error(`Conversation create failed: ${insertError.message}`);
  return { id: sessionId };
}

export async function loadConversationHistory(
  supabase: any,
  userId: string,
  sessionId: string,
) {
  await ensureConversationExists(supabase, userId, sessionId);

  const { data, error } = await supabase
    .from("coach_messages")
    .select("role, content")
    .eq("conversation_id", sessionId)
    .order("created_at", { ascending: true });

  if (error) throw new Error(`History load failed: ${error.message}`);
  return data ?? [];
}

export async function persistConversationTurn(
  supabase: any,
  sessionId: string,
  userContent: Record<string, unknown>,
  assistantContent: unknown,
) {
  const { error } = await supabase
    .from("coach_messages")
    .insert([
      {
        conversation_id: sessionId,
        role: "user",
        content: [userContent],
      },
      {
        conversation_id: sessionId,
        role: "assistant",
        content: assistantContent,
      },
    ]);

  if (error) throw new Error(`Conversation persist failed: ${error.message}`);
}
