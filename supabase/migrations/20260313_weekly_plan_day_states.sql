create table if not exists public.weekly_plan_day_states (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_id uuid not null references public.training_plans(id) on delete cascade,
  workout_date date not null,
  is_protected boolean not null default true,
  protection_source text not null default 'manual_edit',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (plan_id, workout_date)
);

create index if not exists weekly_plan_day_states_user_plan_date_idx
  on public.weekly_plan_day_states (user_id, plan_id, workout_date);

alter table public.weekly_plan_day_states enable row level security;

create policy "Users can read own weekly day states"
  on public.weekly_plan_day_states
  for select
  using (auth.uid() = user_id);

create policy "Users can insert own weekly day states"
  on public.weekly_plan_day_states
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update own weekly day states"
  on public.weekly_plan_day_states
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own weekly day states"
  on public.weekly_plan_day_states
  for delete
  using (auth.uid() = user_id);

create or replace function public.set_weekly_plan_day_states_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists weekly_plan_day_states_set_updated_at on public.weekly_plan_day_states;

create trigger weekly_plan_day_states_set_updated_at
before update on public.weekly_plan_day_states
for each row
execute function public.set_weekly_plan_day_states_updated_at();
