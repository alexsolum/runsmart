---
phase: 17-claude-edge-function-plan-foundation
plan: 01
subsystem: ai-backend
tags: [claude-api, edge-function, database, schema-validation, tdd]
dependency_graph:
  requires: []
  provides: [claude-coach-edge-function, hierarchical_plans-table, plan-schema-validator]
  affects: [phase-18-plan-hook, phase-19-plan-viewer, phase-21-coach-chat]
tech_stack:
  added:
    - Supabase Edge Function (Deno): claude-coach
    - Anthropic Messages API via raw fetch (no SDK)
  patterns:
    - Raw fetch to external API (avoids Deno lock file v5 incompatibility)
    - Embedded coaching methodology at build time (no runtime file access)
    - TDD for pure domain validation module
key_files:
  created:
    - supabase/functions/claude-coach/index.ts
    - supabase/migrations/20260330_hierarchical_plans.sql
    - tests/unit/claudeCoach.schema.test.js
    - src/domain/planSchema.js
  modified: []
decisions:
  - Raw fetch to Anthropic REST API (no SDK) — avoids Deno lock file v5 incompatibility confirmed in research
  - All coaching context embedded as string constants at module load (Edge Functions have no filesystem access)
  - Running-only schema — all swim/bike/triathlon fields stripped from system prompt and few-shot example
  - Few-shot example derived from krs-smve-plan.json condensed to 1 week for token efficiency
  - status column (active/generating/failed) added for Phase 18 generation progress tracking
  - planSchema.js as pure function module for reuse in both Edge Function and frontend
metrics:
  duration: 7m
  completed: 2026-03-30
  tasks_completed: 3
  files_created: 4
  files_modified: 0
---

# Phase 17 Plan 01: Claude Edge Function + Plan Foundation Summary

**One-liner:** Supabase Edge Function calling Anthropic Messages API via raw fetch with embedded SKILL.md coaching methodology, backed by a JSONB hierarchical_plans table with RLS and a pure plan schema validator.

## What Was Built

### Task 1: hierarchical_plans database migration
Created `supabase/migrations/20260330_hierarchical_plans.sql` defining the JSONB storage table for complete training plan documents:

- `hierarchical_plans` table with `plan_data jsonb not null` for full plan storage
- `event_name` and `event_date` denormalized columns for fast listing without JSONB extraction
- `status` column with check constraint (`active/generating/failed`) for generation progress tracking in Phase 18
- User-ID indexed with 4 per-user RLS policies (select/insert/update/delete using `auth.uid() = user_id`)
- `on delete cascade` from `auth.users` for clean user removal

### Task 2: claude-coach Edge Function
Created `supabase/functions/claude-coach/index.ts` (967 lines) as a complete Deno Edge Function:

- **No SDK**: Raw `fetch()` to `https://api.anthropic.com/v1/messages` only (Deno lock file v5 incompatibility avoidance)
- **Embedded coaching context**: All 6 reference files embedded as string constants at module load (assessment, load-management, periodization, race-day, workouts, zones) plus Key Coaching Principles and Critical Reminders from SKILL.md
- **Running-only system prompt**: Composed from all coaching constants, schema definition (no swim/bike fields), and a condensed 1-week few-shot example from krs-smve-plan.json
- **JWT auth**: `supabase.auth.getUser(accessToken)` validates bearer token before any AI call
- **Truncation guard**: `stop_reason !== "end_turn"` check returns 422 for incomplete plans
- **Token limit pre-check**: `totalInputChars > MAX_INPUT_CHARS (400k)` returns 413 for oversized payloads
- **Top-level validation**: Checks `meta`, `phases`, `weeks` existence before saving
- **Database save**: Inserts to `hierarchical_plans` with `user_id`, `plan_data`, `event_name`, `event_date`, `status: "active"`
- **Response**: Returns `{ id, plan, usage }` on success

### Task 3: Schema validation tests (TDD)
Created `src/domain/planSchema.js` with two pure validator functions:

- `validatePlanSchema(plan)` — validates all required fields top-to-bottom; returns `{ valid: boolean, errors: string[] }`
  - Checks: meta, assessment, zones, phases (array), weeks (array), raceStrategy
  - meta required: id, event, eventDate, planStartDate, totalWeeks, generatedBy
  - Nested: each phase (name/startWeek/endWeek/focus), each week (weekNumber/startDate/endDate/phase/days), each day (date/dayOfWeek/workouts), each workout (id/sport/type/name)
- `hasNonRunningFields(plan)` — returns boolean, true if zones.swim, zones.bike, preferences.swim, or preferences.bike present

Created `tests/unit/claudeCoach.schema.test.js` with 14 unit tests (all passing).

## Test Results

```
tests/unit/claudeCoach.schema.test.js (14 tests) — PASS
Total unit tests: 105 passed, 0 failed
```

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check

All files exist and commits are recorded below.

## Self-Check: PASSED

- supabase/functions/claude-coach/index.ts: FOUND (967 lines)
- supabase/migrations/20260330_hierarchical_plans.sql: FOUND
- tests/unit/claudeCoach.schema.test.js: FOUND
- src/domain/planSchema.js: FOUND
- All unit tests: 105/105 passing
- No Anthropic SDK import: confirmed (grep returns 0)

## Commits

| Hash | Task | Description |
|------|------|-------------|
| c6b93d0 | Task 1 | feat(17-01): create hierarchical_plans database migration |
| 0badbd4 | Task 2 | feat(17-01): create claude-coach Edge Function with embedded coaching context |
| c0b87d5 | Task 3 RED | test(17-01): add failing tests for plan JSON schema validation |
| 7521b1e | Task 3 GREEN | feat(17-01): implement plan JSON schema validation module |

## Next Steps

- **Phase 17 Plan 02**: Remove admin philosophy editor (CLEAN-02) — atomically bundled with this phase
- **Phase 18**: Wire claude-coach into `useHierarchicalPlan` hook + intake form UI
- **Deployment**: `supabase secrets set ANTHROPIC_API_KEY=sk-ant-...` then `supabase functions deploy claude-coach`
- **Validation**: Run curl test against deployed function with test athlete payload
