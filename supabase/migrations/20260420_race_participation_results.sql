ALTER TABLE race_participations
  ADD COLUMN IF NOT EXISTS overall_place integer,
  ADD COLUMN IF NOT EXISTS total_finishers integer,
  ADD COLUMN IF NOT EXISTS is_pb boolean NOT NULL DEFAULT false;
