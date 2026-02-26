-- BUG-003: Ensure goal column exists on training_plans and reload PostgREST schema cache.
-- The column was added in 20260225_runner_profile_and_plan_goal.sql but PostgREST
-- may not have picked it up if the schema cache was not reloaded after that migration.

ALTER TABLE training_plans ADD COLUMN IF NOT EXISTS goal TEXT;

-- Reload PostgREST schema cache so the column is immediately visible to the API.
NOTIFY pgrst, 'reload schema';
