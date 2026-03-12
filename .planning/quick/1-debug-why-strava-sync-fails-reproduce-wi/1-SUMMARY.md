# Quick Task 1 Summary

## Outcome

Identified the Strava sync failure as a Supabase Edge gateway rejection, not a bug inside the `strava-sync` function logic.

## Evidence

- The captured HAR at `docs/runsmart-ten.vercel.app.har` shows `strava-auth` returning `200` and then `strava-sync` returning `401` with `{"code":401,"message":"Invalid JWT"}`.
- That response shape comes from the Supabase gateway, which means the request is being rejected before `supabase/functions/strava-sync/index.ts` runs.
- The repository already uses manual bearer-token validation inside `strava-auth` and `strava-sync`, and `gemini-coach` previously fixed the same class of issue by shipping `config.toml` with `verify_jwt = false`.

## Changes

- Added `supabase/functions/strava-auth/config.toml`
- Added `supabase/functions/strava-sync/config.toml`
- Added `supabase/functions/strava-webhook/config.toml`

Each file sets:

```toml
verify_jwt = false
```

This keeps authentication inside the functions' own bearer-token validation path and avoids gateway-side JWT rejection.

## Validation

- Confirmed the new config files exist for all Strava-related functions.
- Did not run an end-to-end sync verification because that requires deploying the updated Supabase Edge Functions and testing with a signed-in Strava user session.

## Next Step

Deploy the Strava functions to Supabase so the new per-function config takes effect:

```bash
supabase functions deploy strava-auth
supabase functions deploy strava-sync
supabase functions deploy strava-webhook
```
