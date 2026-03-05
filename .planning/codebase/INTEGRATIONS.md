# Integrations

## External Services
- Supabase (primary backend): database, auth, and function invocation.
- Strava API (OAuth + activities sync): used through Edge Functions.
- Google Gemini API: used through `gemini-coach` Edge Function.

## Supabase Integration Points
- Client bootstrap: `src/lib/supabaseClient.js`.
- Runtime env resolution: `src/config/runtime.js`.
- Auth flows: `src/hooks/useAuth.js`.
- Domain CRUD hooks: `src/hooks/usePlans.js`, `src/hooks/useActivities.js`, `src/hooks/useWorkoutEntries.js`, `src/hooks/useTrainingBlocks.js`, `src/hooks/useCoachConversations.js`.

## Edge Functions
- `supabase/functions/strava-auth/index.ts`
  - Exchanges Strava auth code for tokens.
  - Stores token set in `strava_connections`.
- `supabase/functions/strava-sync/index.ts`
  - Refreshes Strava tokens when expired.
  - Pulls activities and HR zones.
  - Upserts into `activities`.
- `supabase/functions/gemini-coach/index.ts`
  - Validates bearer token via Supabase auth.
  - Calls Gemini API with coach prompts/playbook context.
  - Supports `initial`, `followup`, `plan`, `plan_revision` modes.

## Database Integration
- Base SQL schema doc: `supabase-schema.sql`.
- Incremental migrations: `supabase/migrations/*.sql`.
- Core tables observed in code:
  - `training_plans`
  - `activities`
  - `athlete_feedback`
  - `strava_connections`
  - `training_blocks`
  - `workout_entries`
  - `runner_profiles`
  - `coach_conversations`
  - `coach_messages`
  - `coach_playbook_entries`

## Auth and Security Controls
- Frontend uses Supabase Auth session token for function calls (`Authorization: Bearer ...`) via `src/hooks/useStrava.js` and coach flows.
- Edge functions re-validate JWT using service role client (`supabase.auth.getUser`).
- `gemini-coach` has `verify_jwt = false` in `supabase/functions/gemini-coach/config.toml`; auth is enforced in function code instead.
- Row-level security is present in base schema for several tables (`supabase-schema.sql`), but migration parity should be verified.

## Testing Against Integrations
- Live integration tests in `tests/integration/supabase-crud.spec.ts`.
- Edge function smoke tests in `tests/integration/edge-functions.spec.ts`.
- AI behavior sanity checks in `tests/ai/coach.spec.ts`.

## Operational Dependencies
- Required runtime values include:
  - `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
  - `VITE_AUTH_REDIRECT_URL` (optional but used)
  - Strava client settings for connect flow
- Required Edge Function secrets include:
  - `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
  - `STRAVA_CLIENT_ID`, `STRAVA_CLIENT_SECRET`
  - `GEMINI_API_KEY`

