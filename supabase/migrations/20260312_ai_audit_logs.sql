CREATE TABLE ai_audit_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  user_id uuid REFERENCES auth.users(id),
  mode text NOT NULL,
  raw_response text,
  error_type text,
  metadata jsonb
);

-- Enable RLS
ALTER TABLE ai_audit_logs ENABLE ROW LEVEL SECURITY;

-- Allow service role to do everything
CREATE POLICY "Allow service role all access" ON ai_audit_logs
  USING (auth.role() = 'service_role');

-- Optional: Allow users to see their own logs (read-only)
CREATE POLICY "Allow users to see their own logs" ON ai_audit_logs
  FOR SELECT
  USING (auth.uid() = user_id);
