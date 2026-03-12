# Quick Task 1: debug why strava sync fails; reproduce with chromium MCP and inspect Supabase + Vercel

**Created:** 2026-03-12
**Status:** In Progress

## Task 1
- Files: `src/hooks/useStrava.js`, `src/pages/DataPage.jsx`, `src/lib/supabaseClient.js`, `public/runtime-config.js`
- Action: Trace the frontend Strava connect and sync flow to understand how OAuth redirect, session requirements, and edge function calls are wired.
- Verify: Confirm expected request sequence and identify any obvious client-side misconfiguration or stale redirect handling.
- Done: Frontend failure mode is documented with concrete evidence.

## Task 2
- Files: `supabase/functions/strava-auth/index.ts`, `supabase/functions/strava-sync/index.ts`, deployment/runtime config
- Action: Reproduce the failure against the deployed app with Chromium MCP and inspect the related edge-function and deployment behavior through available tooling.
- Verify: Capture the failing request, response status, and the code path responsible for the failure.
- Done: Root cause is isolated to a specific request path or configuration mismatch.

## Task 3
- Files: implementation files to be determined by root cause
- Action: Apply the smallest safe fix, verify locally or against the deployed flow where possible, and summarize the result.
- Verify: Relevant tests or targeted validation pass, and the sync path no longer fails for the identified reason.
- Done: Fix is committed in code and documented in the quick-task summary.
