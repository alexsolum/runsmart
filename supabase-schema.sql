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
