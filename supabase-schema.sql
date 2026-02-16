-- RunSmart — Supabase database schema
-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard → SQL Editor)

-- Training plans table
create table training_plans (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  race text not null,
  race_date date not null,
  availability integer not null default 5,
  current_mileage integer,
  constraints text,
  b2b_long_runs boolean default false,
  created_at timestamptz default now()
);

-- Enable Row Level Security
alter table training_plans enable row level security;

-- Users can only read their own plans
create policy "Users can view own plans"
  on training_plans for select
  using (auth.uid() = user_id);

-- Users can only insert their own plans
create policy "Users can insert own plans"
  on training_plans for insert
  with check (auth.uid() = user_id);

-- Users can only update their own plans
create policy "Users can update own plans"
  on training_plans for update
  using (auth.uid() = user_id);

-- Users can only delete their own plans
create policy "Users can delete own plans"
  on training_plans for delete
  using (auth.uid() = user_id);

-- ============================================================
-- Strava connections (OAuth tokens, one per user)
-- ============================================================

create table strava_connections (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null unique,
  strava_athlete_id bigint not null,
  access_token text not null,
  refresh_token text not null,
  expires_at bigint not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table strava_connections enable row level security;

-- Users can see their own connection status
create policy "Users can view own strava connection"
  on strava_connections for select
  using (auth.uid() = user_id);

-- Users can disconnect (delete) their own connection
create policy "Users can delete own strava connection"
  on strava_connections for delete
  using (auth.uid() = user_id);

-- Insert and update are handled by Edge Functions using the service_role key

-- ============================================================
-- Activities (synced from Strava or entered manually)
-- ============================================================

create table activities (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  strava_id bigint unique,
  name text not null,
  type text,
  distance numeric,
  duration numeric,
  elevation_gain numeric,
  average_pace numeric,
  average_heartrate numeric,
  started_at timestamptz not null,
  moving_time integer,
  elapsed_time integer,
  effort_rating integer check (effort_rating between 1 and 10),
  source text default 'strava',
  created_at timestamptz default now()
);

alter table activities enable row level security;

create policy "Users can view own activities"
  on activities for select
  using (auth.uid() = user_id);

create policy "Users can insert own activities"
  on activities for insert
  with check (auth.uid() = user_id);

create policy "Users can update own activities"
  on activities for update
  using (auth.uid() = user_id);

create policy "Users can delete own activities"
  on activities for delete
  using (auth.uid() = user_id);

-- ============================================================
-- Athlete feedback / weekly check-ins
-- ============================================================

create table athlete_feedback (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  plan_id uuid references training_plans(id) on delete set null,
  week_of date not null,
  fatigue integer not null check (fatigue between 1 and 5),
  sleep_quality integer not null check (sleep_quality between 1 and 5),
  motivation integer not null check (motivation between 1 and 5),
  niggles text,
  notes text,
  created_at timestamptz default now()
);

alter table athlete_feedback enable row level security;

create policy "Users can view own feedback"
  on athlete_feedback for select
  using (auth.uid() = user_id);

create policy "Users can insert own feedback"
  on athlete_feedback for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own feedback"
  on athlete_feedback for delete
  using (auth.uid() = user_id);

-- ============================================================
-- Weekly plan entries (editable calendar day overrides)
-- ============================================================

create table weekly_plan_entries (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  plan_id uuid references training_plans(id) on delete cascade not null,
  week_number integer not null,
  day_of_week integer not null check (day_of_week between 0 and 6),
  date date not null,
  workout_type text not null default 'easy',
  workout_name text,
  distance_miles numeric,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (plan_id, week_number, day_of_week)
);

alter table weekly_plan_entries enable row level security;

create policy "Users can view own plan entries"
  on weekly_plan_entries for select
  using (auth.uid() = user_id);

create policy "Users can insert own plan entries"
  on weekly_plan_entries for insert
  with check (auth.uid() = user_id);

create policy "Users can update own plan entries"
  on weekly_plan_entries for update
  using (auth.uid() = user_id);

create policy "Users can delete own plan entries"
  on weekly_plan_entries for delete
  using (auth.uid() = user_id);
