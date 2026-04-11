-- supabase/migrations/20260409_races.sql

-- ============================================================
-- races
-- ============================================================
CREATE TABLE IF NOT EXISTS races (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  location text,
  distance_km numeric,
  elevation_gain_m numeric,
  latitude numeric,
  longitude numeric,
  description text,
  race_url text,
  next_race_date date,
  registration_info text,
  image_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE races ENABLE ROW LEVEL SECURITY;

CREATE POLICY "races_select" ON races
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "races_all" ON races
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX idx_races_user_id ON races(user_id);

-- ============================================================
-- race_participations
-- ============================================================
CREATE TABLE IF NOT EXISTS race_participations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  race_id uuid NOT NULL REFERENCES races(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  race_date date NOT NULL,
  finish_time interval,
  notes text,
  strava_activity_id text,
  photo_album_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE race_participations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "race_participations_select" ON race_participations
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "race_participations_all" ON race_participations
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX idx_race_participations_race_id ON race_participations(race_id);
CREATE INDEX idx_race_participations_user_id ON race_participations(user_id);

-- ============================================================
-- race_resources
-- ============================================================
CREATE TABLE IF NOT EXISTS race_resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  race_id uuid NOT NULL REFERENCES races(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text,
  url text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE race_resources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "race_resources_select" ON race_resources
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "race_resources_all" ON race_resources
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX idx_race_resources_race_id ON race_resources(race_id);
CREATE INDEX idx_race_resources_user_id ON race_resources(user_id);

-- ============================================================
-- strava_activity_cache
-- ============================================================
CREATE TABLE IF NOT EXISTS strava_activity_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  strava_activity_id text NOT NULL,
  data jsonb NOT NULL,
  cached_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, strava_activity_id)
);

ALTER TABLE strava_activity_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "strava_activity_cache_select" ON strava_activity_cache
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "strava_activity_cache_all" ON strava_activity_cache
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX idx_strava_activity_cache_lookup
  ON strava_activity_cache(user_id, strava_activity_id);
