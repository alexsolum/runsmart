ALTER TABLE runner_profiles
  ADD COLUMN IF NOT EXISTS insight_refresh_interval_hours INTEGER;
