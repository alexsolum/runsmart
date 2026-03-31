-- Phase 17: hierarchical_plans table for full training plan JSONB storage
create table if not exists hierarchical_plans (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  plan_data   jsonb not null,
  event_name  text,
  event_date  date,
  status      text not null default 'active' check (status in ('active', 'generating', 'failed')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists hierarchical_plans_user_id_idx on hierarchical_plans(user_id);

alter table hierarchical_plans enable row level security;

create policy "users_own_plans_select"
  on hierarchical_plans for select
  using (auth.uid() = user_id);

create policy "users_own_plans_insert"
  on hierarchical_plans for insert
  with check (auth.uid() = user_id);

create policy "users_own_plans_update"
  on hierarchical_plans for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "users_own_plans_delete"
  on hierarchical_plans for delete
  using (auth.uid() = user_id);
