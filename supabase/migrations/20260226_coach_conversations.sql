-- TASK-003: Persistent coach conversations and messages for AI chat history.

CREATE TABLE IF NOT EXISTS coach_conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL DEFAULT 'New conversation',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS coach_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID REFERENCES coach_conversations(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS for coach_conversations
ALTER TABLE coach_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "coach_conversations_select_own"
  ON coach_conversations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "coach_conversations_insert_own"
  ON coach_conversations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "coach_conversations_update_own"
  ON coach_conversations FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "coach_conversations_delete_own"
  ON coach_conversations FOR DELETE
  USING (auth.uid() = user_id);

-- RLS for coach_messages (access via parent conversation ownership)
ALTER TABLE coach_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "coach_messages_select_own"
  ON coach_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM coach_conversations cc
      WHERE cc.id = coach_messages.conversation_id
        AND cc.user_id = auth.uid()
    )
  );

CREATE POLICY "coach_messages_insert_own"
  ON coach_messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM coach_conversations cc
      WHERE cc.id = coach_messages.conversation_id
        AND cc.user_id = auth.uid()
    )
  );

CREATE POLICY "coach_messages_delete_own"
  ON coach_messages FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM coach_conversations cc
      WHERE cc.id = coach_messages.conversation_id
        AND cc.user_id = auth.uid()
    )
  );

-- Auto-update updated_at on coach_conversations when a message is inserted
CREATE OR REPLACE FUNCTION update_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE coach_conversations SET updated_at = now() WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER update_conversation_on_message
  AFTER INSERT ON coach_messages
  FOR EACH ROW EXECUTE FUNCTION update_conversation_timestamp();

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
