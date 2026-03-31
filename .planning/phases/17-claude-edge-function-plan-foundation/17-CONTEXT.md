# Phase 17: Claude Edge Function + Plan Foundation - Context

**Gathered:** 2026-03-30
**Status:** Ready for planning

<domain>
## Phase Boundary

Create the `claude-coach` Supabase Edge Function that calls the Anthropic API (via raw fetch) and returns a verified full hierarchical plan JSON. Create the `hierarchical_plans` DB table with JSONB storage and correct RLS. Remove the admin philosophy editor system atomically (CLEAN-02). This phase delivers a working AI backend that every downstream phase (18-22) can call — no intake UI, no hook layer, no plan viewer. Those belong to Phases 18-19.

</domain>

<decisions>
## Implementation Decisions

### Plan JSON schema
- Trim to running-only: drop all swim and bike fields from the SKILL.md triathlon schema
- Keep these sections: `meta`, `assessment` (full snapshot), `zones.run` (hr zones + pace zones), `phases`, `weeks` (with `days` and `workouts`), `raceStrategy` (full: pacing.run, taper, nutrition)
- Drop: `zones.bike`, `zones.swim`, `preferences.swim`, `preferences.bike`, multi-sport `assessment.currentForm.weeklyVolume` fields
- The `assessment` section is stored in the JSON document (not just used as input), so Phase 21 coach chat can reference the AI-generated athlete snapshot
- `raceStrategy` is kept in full — pacing targets, taper dates, nutrition notes are valuable race-day context

### Athlete context payload
- Structured intake form with all 4 field groups sent to the Edge Function:
  1. Race goal + date (event name, event date, event type: marathon / ultra / trail)
  2. Current fitness baseline (current weekly km, longest recent run, LTHR or estimated max HR, years running)
  3. Weekly constraints (preferred long-run day, preferred hard-workout days, rest days, commute days, max sessions per week)
  4. Background + goals (free text: race history, injury history, performance goals, experience level)
- Phase 17 uses a minimal test trigger (hardcoded or scripted payload) to validate the Edge Function end-to-end — no intake UI is built in this phase
- Real intake UI comes in Phase 18 or 19 when the hook layer and plan viewer are in place

### Philosophy removal scope (CLEAN-02)
- Full removal in Phase 17 — atomically bundled with the claude-coach function:
  - Remove `src/pages/AdminPhilosophyPage.jsx`
  - Remove `src/hooks/useCoachPhilosophy.js`
  - Remove the `coachPhilosophy` slice from `src/context/AppDataContext.jsx`
  - Remove the `AdminPhilosophyPage` import and route from `src/App.jsx`
  - Remove the `supabase/functions/coach-philosophy-admin/` Edge Function
  - Include a Supabase migration to drop the `coach_philosophy_documents` table
- Keep `gemini-coach` Edge Function until Phase 22 (per roadmap — retired after new system is proven)

### SKILL.md embedding strategy
- Extract coaching methodology sections only from SKILL.md — drop CLI setup, bash commands, Strava OAuth, database query sections (those are Claude Code CLI context, not relevant to an Edge Function)
- Include all 6 reference files as coaching context:
  - `docs/running_coach/reference/assessment.md`
  - `docs/running_coach/reference/load-management.md`
  - `docs/running_coach/reference/periodization.md`
  - `docs/running_coach/reference/race-day.md`
  - `docs/running_coach/reference/workouts.md`
  - `docs/running_coach/reference/zones.md`
- Exclude `docs/running_coach/reference/queries.md` (SQL queries for CLI, not applicable)
- Embed all coaching context at build time — compose into the system prompt string at Edge Function startup (not fetched at request time)
- Include a condensed few-shot output example (1-2 weeks from `docs/running_coach/output/krs-smve-plan.json`) as a concrete schema reference to anchor Claude's output format

### Claude API call
- Use raw fetch to Anthropic REST API — not the Anthropic SDK. Avoids Deno lock file v5 incompatibility with Supabase (established in STATE.md)
- Auth boundary: unauthenticated POST returns 401 — verify Supabase JWT before calling Claude
- Token limit protection: if payload + coaching context would exceed limits, return 4xx (not silently truncated)

### Claude's Discretion
- Exact section boundaries for extracting relevant SKILL.md sections (which headings to include/exclude)
- Whether to concatenate coaching context as one system prompt string or use the messages array `system` field
- Exact Supabase JWT verification approach (supabase-js client vs manual JWT decode)
- `hierarchical_plans` table column design beyond the core (user_id, plan_id, plan_data JSONB, created_at, updated_at) — any additional metadata columns

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase requirements
- `.planning/ROADMAP.md` — Phase 17 goal, success criteria (5 items), and dependency on Phase 15
- `.planning/REQUIREMENTS.md` — COACH-01, DATA-01, CLEAN-02 requirement definitions
- `.planning/PROJECT.md` — v2.0 milestone scope and constraints
- `.planning/STATE.md` — Prior decisions: raw fetch for Anthropic API, CLEAN-02 bundling rationale, structured output schema research flag

### Coaching skill and methodology
- `docs/running_coach/SKILL.md` — Full coaching skill; extract methodology sections (periodization, zones, plan output format), drop CLI setup sections
- `docs/running_coach/reference/assessment.md` — Athlete assessment methodology: foundation vs current form distinction
- `docs/running_coach/reference/load-management.md` — TSS, ATL/CTL/TSB load management principles
- `docs/running_coach/reference/periodization.md` — Macrocycle structure, ultra-specific periodization (reversed conventional approach)
- `docs/running_coach/reference/race-day.md` — Race execution and nutrition strategy by event type
- `docs/running_coach/reference/workouts.md` — Running workout type library (workout types, zone targets, execution guidelines)
- `docs/running_coach/reference/zones.md` — LTHR-based zone definitions and field testing protocols
- `docs/running_coach/output/krs-smve-plan.json` — Concrete output example; use 1-2 weeks as a condensed few-shot schema reference (strip swim/bike sections)

### Existing Edge Functions (reference for patterns)
- `supabase/functions/gemini-coach/index.ts` — Current coaching function; reference for Deno auth pattern, CORS headers, Supabase client setup, and request/response structure (not for AI call approach)
- `supabase/functions/strava-sync/` — Reference for Deno JWT verification pattern

### Code to be removed (CLEAN-02)
- `src/pages/AdminPhilosophyPage.jsx` — Removed in this phase
- `src/hooks/useCoachPhilosophy.js` — Removed in this phase
- `src/context/AppDataContext.jsx` — `coachPhilosophy` slice to be removed
- `src/App.jsx` — AdminPhilosophyPage import and route to be removed
- `supabase/functions/coach-philosophy-admin/` — Removed in this phase

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `supabase/functions/gemini-coach/index.ts`: Reference for CORS headers, Deno JWT auth, Supabase client instantiation, and response serialization patterns. Do NOT reuse the AI call logic — that's being replaced.
- `supabase/functions/strava-sync/`: Reference for JWT verification approach in Deno Edge Functions.
- `src/lib/supabaseClient.js`: Frontend Supabase client; will need a new function call for `claude-coach` wired in via the hook layer (Phase 18).

### Established Patterns
- Edge Functions use `createClient` from `esm.sh/@supabase/supabase-js@2` with the service role key for DB writes
- CORS headers pattern is consistent across all existing Edge Functions — copy from gemini-coach
- Frontend uses `useAppData()` for all data access — new claude-coach hook will follow the same pattern (Phase 18)
- Raw fetch to external APIs (Anthropic REST) is the established approach for Deno — avoids lock file v5 issues

### Integration Points
- New `hierarchical_plans` table needs RLS: users can read/write their own rows (user_id = auth.uid())
- The `claude-coach` Edge Function is called directly from the frontend (or test script) in Phase 17; formal hook integration happens in Phase 18
- The `AppDataContext` `coachPhilosophy` slice removal must be accompanied by removing `coachPhilosophy` from the destructured result in `src/App.jsx:58`

</code_context>

<specifics>
## Specific Ideas

- The Edge Function should be named `claude-coach` (not `claude-coaching` or `ai-coach`) to be consistent with the roadmap terminology
- The test trigger for Phase 17 validation can be a simple `curl` command or a Supabase Edge Function test call — no UI needed
- The research flag from STATE.md: structured outputs schema must be tested against Claude API in isolation before hook or UI work begins — if schema exceeds grammar compilation limits, sentinel value mitigation must be applied first

</specifics>

<deferred>
## Deferred Ideas

- Intake UI (form for race goal, fitness baseline, constraints, background) — Phase 18 or 19 when hook layer and plan viewer exist
- Streaming plan generation — explicitly out of scope (partial JSON is not renderable; REQUIREMENTS.md Out of Scope)
- Multi-turn athlete assessment workflow (SKILL.md intake flow) — v2.1 COACH-05, noted in STATE.md
- Day/date-range partial plan generation — v2.1 COACH-04, noted in STATE.md

</deferred>

---

*Phase: 17-claude-edge-function-plan-foundation*
*Context gathered: 2026-03-30*
