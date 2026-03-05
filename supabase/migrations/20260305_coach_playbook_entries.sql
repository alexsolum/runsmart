-- Runtime-editable coaching playbook entries for Gemini coach brain.
CREATE TABLE IF NOT EXISTS coach_playbook_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enabled boolean NOT NULL DEFAULT true,
  source text NOT NULL CHECK (source IN ('koop', 'bakken', 'roche', 'internal')),
  mode text[] NOT NULL DEFAULT ARRAY['any'],
  lang text[] NOT NULL DEFAULT ARRAY['no', 'en'],
  phase text[] NOT NULL DEFAULT ARRAY['any'],
  athlete_level text[] NOT NULL DEFAULT ARRAY['any'],
  priority integer NOT NULL DEFAULT 50,
  title text NOT NULL,
  principle text NOT NULL,
  application text,
  anti_patterns text,
  example_workout text,
  tags text[] NOT NULL DEFAULT ARRAY[]::text[],
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE coach_playbook_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "coach_playbook_entries_service_only"
  ON coach_playbook_entries
  FOR ALL
  USING (false)
  WITH CHECK (false);

INSERT INTO coach_playbook_entries (
  source, mode, lang, phase, athlete_level, priority, title, principle, application, anti_patterns, example_workout, tags
)
VALUES
  (
    'koop', ARRAY['initial', 'plan', 'plan_revision'], ARRAY['no', 'en'], ARRAY['base', 'build', 'peak', 'taper'], ARRAY['any'], 95,
    'Long run is the A session',
    'Protect the long run as the key weekly endurance stimulus.',
    'If fatigue is elevated, cut or simplify intensity before reducing long-run quality and intent.',
    'Do not stack hard sessions that compromise long-run execution.',
    'Long run 2-4h easy with final 20-30 min steady, adjusted by phase.',
    ARRAY['longrun', 'priority', 'endurance']
  ),
  (
    'koop', ARRAY['plan', 'plan_revision'], ARRAY['no', 'en'], ARRAY['base', 'build'], ARRAY['developing', 'intermediate', 'advanced'], 88,
    'Controlled weekly load progression',
    'Increase weekly load progressively with planned deload cycles.',
    'Target roughly 10-15% progression when readiness supports it; insert deload every 3rd or 4th week with 20-30% reduction.',
    'Avoid abrupt jumps in volume or intensity density.',
    '3 build weeks then 1 deload week.',
    ARRAY['progression', 'deload', 'injury-prevention']
  ),
  (
    'koop', ARRAY['plan', 'plan_revision'], ARRAY['no', 'en'], ARRAY['base', 'build', 'peak'], ARRAY['any'], 82,
    'Reverse specificity toward race day',
    'Move from generic fitness early to race-specific demands in final 8-12 weeks.',
    'In late block, prioritize terrain, vert, race fueling, and event-like pacing.',
    'Do not keep high VO2 focus too close to race if it reduces specificity.',
    'Peak block weekend with race-like terrain and fueling rehearsal.',
    ARRAY['specificity', 'periodization', 'race-prep']
  ),
  (
    'bakken', ARRAY['initial', 'plan', 'plan_revision'], ARRAY['no', 'en'], ARRAY['base', 'build'], ARRAY['intermediate', 'advanced'], 90,
    'Threshold density with controlled strain',
    'Accumulate threshold work without excessive lactate or mechanical stress.',
    'Use controlled threshold sessions to improve durability and economy while preserving consistency.',
    'Avoid turning threshold days into VO2-max efforts.',
    '45s on / 15s easy x 20-30 reps in controlled threshold zone.',
    ARRAY['threshold', 'economy', 'consistency']
  ),
  (
    'bakken', ARRAY['plan', 'plan_revision'], ARRAY['no', 'en'], ARRAY['build', 'peak'], ARRAY['intermediate', 'advanced'], 78,
    'Recovery after dense threshold',
    'After demanding threshold density, bias next day to recovery.',
    'Use Zone 1 easy run, hike, or rest day after heavy 45/15 or double-threshold style stress.',
    'Do not schedule hard intervals the day after a high-density threshold stimulus.',
    '30-50 min easy Zone 1 or rest.',
    ARRAY['recovery', 'threshold', 'risk-control']
  ),
  (
    'roche', ARRAY['plan', 'plan_revision', 'initial'], ARRAY['no', 'en'], ARRAY['build', 'peak'], ARRAY['any'], 76,
    'Mountain strength with low impact',
    'Use incline treadmill hike/power-walk for ultra-specific strength with lower impact cost.',
    'When vert specificity is lagging, replace some flat intensity with incline work.',
    'Do not force flat speed sessions when terrain specificity is low near race.',
    '8-12% incline hike/run at controlled steady effort.',
    ARRAY['vert', 'specificity', 'treadmill']
  ),
  (
    'roche', ARRAY['initial', 'plan', 'plan_revision'], ARRAY['no', 'en'], ARRAY['base', 'build', 'peak'], ARRAY['any'], 68,
    'Neuromuscular upkeep with strides',
    'Use short fast relaxed strides to maintain economy and mechanics.',
    'Place 6-8 x 20s strides after easy runs when athlete is fresh.',
    'Avoid strides during acute niggles or high fatigue periods.',
    '6-8 x 20s hill strides after easy run.',
    ARRAY['strides', 'economy', 'neuromuscular']
  ),
  (
    'internal', ARRAY['initial', 'followup', 'plan', 'plan_revision'], ARRAY['no', 'en'], ARRAY['any'], ARRAY['any'], 100,
    'Fatigue and niggle override',
    'High fatigue or niggles trigger conservative substitutions.',
    'If fatigue >= 4/5 or niggles are present, replace upcoming hard session with easy recovery or rest.',
    'Do not prescribe hard sessions when injury risk signals are active.',
    '30-45 min recovery hike/run or full rest.',
    ARRAY['fatigue', 'injury', 'override']
  ),
  (
    'internal', ARRAY['plan', 'plan_revision'], ARRAY['no', 'en'], ARRAY['peak', 'taper'], ARRAY['any'], 86,
    'Late block terrain specificity',
    'In final 6 weeks, raise terrain/vert specificity when current exposure is low.',
    'Prioritize race-similar terrain sessions and incline conditioning over non-specific flat intervals.',
    'Avoid non-specific speed focus if it displaces race-relevant work.',
    'Race-specific long run with vert and fueling practice.',
    ARRAY['taper', 'peak', 'terrain', 'vert']
  ),
  (
    'internal', ARRAY['initial', 'followup'], ARRAY['no', 'en'], ARRAY['any'], ARRAY['any'], 70,
    'Explain rationale and tradeoffs',
    'Coaching advice must include why a choice is made and what risk it mitigates.',
    'Tie each recommendation to athlete data trend (volume, long run, fatigue, consistency).',
    'Do not provide generic advice detached from observed training data.',
    NULL,
    ARRAY['explainability', 'data-driven']
  )
ON CONFLICT DO NOTHING;
