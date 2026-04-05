-- Agent Skills Coach: persistent conversation storage
-- Each row is one message turn (user or assistant).
-- Messages are grouped by session_id UUID.
-- Content is JSONB to preserve tool-use blocks from Agent Skills execution.

create table coach_conversations (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  session_id  uuid not null,
  role        text not null check (role in ('user', 'assistant')),
  content     jsonb not null,
  created_at  timestamptz default now()
);

create index coach_conversations_user_session_idx
  on coach_conversations(user_id, session_id, created_at);

alter table coach_conversations enable row level security;

create policy "users_own_conversations"
  on coach_conversations for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
