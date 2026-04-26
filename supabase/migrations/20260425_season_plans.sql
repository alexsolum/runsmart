-- supabase/migrations/20260425_season_plans.sql
--
-- Season plan: a yearly container of races with priority + target date,
-- decoupled from the abstract `races` row so the same race (e.g. CCC) can
-- appear in multiple season plans across years.
--
-- Also adds typical-schedule fields to `races` so the catalog can record
-- "usually last weekend of August" without relying on next_race_date.

-- ============================================================
-- races: typical schedule (month + week-in-month)
-- ============================================================
ALTER TABLE races
  ADD COLUMN IF NOT EXISTS typical_month        smallint,
  ADD COLUMN IF NOT EXISTS typical_week_in_month smallint;

-- typical_month: 1..12 (NULL = unknown).
-- typical_week_in_month: 1..4 = ordinal week of month, 5 = "last week"
-- (NULL = unknown). Stored as smallint to keep the constraint simple.
ALTER TABLE races
  ADD CONSTRAINT races_typical_month_chk
    CHECK (typical_month IS NULL OR (typical_month BETWEEN 1 AND 12)),
  ADD CONSTRAINT races_typical_week_chk
    CHECK (typical_week_in_month IS NULL OR (typical_week_in_month BETWEEN 1 AND 5));

-- ============================================================
-- season_plans
-- ============================================================
CREATE TABLE IF NOT EXISTS season_plans (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name         text NOT NULL,
  season_year  integer NOT NULL,
  goal_summary text,
  is_active    boolean NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE season_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "season_plans_select" ON season_plans
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "season_plans_all" ON season_plans
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX idx_season_plans_user_id ON season_plans(user_id);

-- Enforce: at most one active season plan per user.
CREATE UNIQUE INDEX season_plans_one_active_per_user
  ON season_plans(user_id)
  WHERE is_active = true;

-- updated_at trigger
CREATE OR REPLACE FUNCTION season_plans_set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER season_plans_updated_at
  BEFORE UPDATE ON season_plans
  FOR EACH ROW EXECUTE FUNCTION season_plans_set_updated_at();

-- ============================================================
-- season_plan_races (junction)
-- ============================================================
CREATE TABLE IF NOT EXISTS season_plan_races (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  season_plan_id  uuid NOT NULL REFERENCES season_plans(id) ON DELETE CASCADE,
  race_id         uuid NOT NULL REFERENCES races(id) ON DELETE CASCADE,
  priority        text NOT NULL DEFAULT 'B',
  target_date     date,
  notes           text,
  position        integer,
  created_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT season_plan_races_priority_chk CHECK (priority IN ('A', 'B', 'C')),
  CONSTRAINT season_plan_races_unique UNIQUE (season_plan_id, race_id)
);

ALTER TABLE season_plan_races ENABLE ROW LEVEL SECURITY;

-- RLS: ownership flows through the parent season_plan.
CREATE POLICY "season_plan_races_select" ON season_plan_races
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM season_plans sp
      WHERE sp.id = season_plan_races.season_plan_id
        AND sp.user_id = auth.uid()
    )
  );
CREATE POLICY "season_plan_races_all" ON season_plan_races
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM season_plans sp
      WHERE sp.id = season_plan_races.season_plan_id
        AND sp.user_id = auth.uid()
    )
  );

CREATE INDEX idx_season_plan_races_plan ON season_plan_races(season_plan_id);
CREATE INDEX idx_season_plan_races_race ON season_plan_races(race_id);

-- ============================================================
-- hierarchical_plans: link to season plan
-- ============================================================
ALTER TABLE hierarchical_plans
  ADD COLUMN IF NOT EXISTS season_plan_id      uuid REFERENCES season_plans(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS season_plan_race_id uuid REFERENCES season_plan_races(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_hierarchical_plans_season_plan
  ON hierarchical_plans(season_plan_id);
