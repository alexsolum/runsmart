-- Migration: Add runner_profiles table and goal column to training_plans
-- Apply via: Supabase dashboard > SQL editor, or `supabase db push`

-- 1. Add goal column to training_plans
ALTER TABLE training_plans
  ADD COLUMN IF NOT EXISTS goal TEXT;

-- 2. Create runner_profiles table (one row per user)
CREATE TABLE IF NOT EXISTS runner_profiles (
  user_id   UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  background TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Enable Row Level Security
ALTER TABLE runner_profiles ENABLE ROW LEVEL SECURITY;

-- 4. RLS policies: users can only read and write their own profile
CREATE POLICY "runner_profiles_select_own"
  ON runner_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "runner_profiles_insert_own"
  ON runner_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "runner_profiles_update_own"
  ON runner_profiles FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
