# Phase 18: Hierarchical Plan Hook Layer - Context

**Gathered:** 2026-03-30
**Status:** Ready for planning

<domain>
## Phase Boundary

Create `useHierarchicalPlan` — the hook that owns the full JSONB plan lifecycle — and wire it into `AppDataContext`. This includes a minimal intake form UI (modal) to trigger plan generation, atomic Postgres RPCs for plan patches and workout moves, and component-level tests with a mock plan fixture.

This phase is the data contract all UI phases (19, 20, 21) build on. No plan viewer grid, no drag-and-drop, no coach chat — those are Phase 19-21.

</domain>

<decisions>
## Implementation Decisions

### Intake form scope
- Phase 18 includes the athlete intake form UI — `generatePlan()` needs a caller
- Form lives in a **modal** triggered from the plan page (not a dedicated route)
- Pre-fill from existing data wherever possible:
  - Runner profile `background` field → background free text
  - Recent Strava activities → weekly km estimate
  - Existing plan constraints (hard days, rest days) → pre-populate constraint fields
- Four field groups (per Phase 17 context): race goal, fitness baseline, weekly constraints, background
- When a plan already exists: show a "This will replace your current plan." confirmation before submitting
- On confirm: old plan is replaced, new generation begins

### Single active plan model
- `useHierarchicalPlan` manages **one active plan per user** — no list, no selection UI
- Auto-selects the latest row where `status = 'active'`
- Loads **eagerly on mount** when `userId` is available (same pattern as `usePlans`)
- When no plan exists: `plan: null`, `loading: false`, `error: null` — pages check `plan` directly and show a "Generate your first plan" prompt

### Hook API surface
- `generatePlan(payload)` — calls `claude-coach` Edge Function, updates hook state on completion
- `applyPatch(patchArray)` — Postgres RPC for atomic surgical patch
- `toggleWorkoutCompleted(workoutId, weekNumber, dayDate)` — marks a workout done/undone in the JSONB doc
- `moveWorkout(workoutId, fromDate, toDate)` — atomic Postgres RPC for date swap (DATA-03)
- `getWeek(weekNumber)` — pure accessor, returns a single week from `plan.weeks`
- `getPhases()` — pure accessor, returns `plan.phases`

### applyPatch design
- **Surgical**: patches target specific workouts/days, not the full plan document
- **Postgres RPC** for atomicity — same approach as `moveWorkout`. Race conditions and partial writes are impossible
- **Patch format** (array of targeted workout changes):
  ```json
  [
    {
      "week": 3,
      "dayDate": "2026-05-13",
      "workoutId": "w-xyz",
      "fields": { "type": "Easy", "duration": 45 }
    }
  ]
  ```
- Human-readable format — Phase 21 confirmation card can display each item as a readable change
- NOT RFC 6902 JSON Patch (hard to generate correctly, hard for users to read)

### Generation UX / loading states
- **Synchronous wait**: frontend POST to `claude-coach` waits for the full response (~30-60s), then the Edge Function writes to DB and returns the saved plan. No polling needed.
- During generation: modal stays open showing a **spinner + rotating coaching-flavored messages**:
  - "Analyzing your fitness..."
  - "Structuring your phases..."
  - "Building your weekly plan..."
- Hook exposes **separate `generating` flag**:
  ```js
  { plan, loading, generating, error }
  // loading = initial plan fetch
  // generating = waiting for Claude to return a new plan
  ```
- Components distinguish "no plan yet" from "waiting for Claude" using these separate flags

### Claude's Discretion
- Exact field validation logic inside the intake form (what's required vs optional)
- Exact Postgres function signature for `applyPatch` RPC (parameter names, return type)
- How `moveWorkout` RPC handles the same-day edge case (source and target are the same date)
- Routing coaching-flavored messages (static array vs randomized)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase requirements
- `.planning/ROADMAP.md` — Phase 18 goal, success criteria (4 items), dependency on Phase 17
- `.planning/REQUIREMENTS.md` — DATA-02, DATA-03 requirement definitions
- `.planning/PROJECT.md` — v2.0 milestone scope, constraints, "single-user first" principle
- `.planning/STATE.md` — Prior decisions: raw fetch for Anthropic, hook patterns, Phase 20 depends on DATA-03 atomic RPC from this phase

### Phase 17 output (this phase builds on top of)
- `.planning/phases/17-claude-edge-function-plan-foundation/17-CONTEXT.md` — Full Phase 17 decisions: athlete intake payload structure, plan JSON schema decisions, Edge Function auth pattern, SKILL.md embedding strategy
- `supabase/functions/claude-coach/index.ts` — The Edge Function `generatePlan()` will call. Auth pattern, `AthletePayload` interface, response shape
- `supabase/migrations/20260330_hierarchical_plans.sql` — Table schema: columns (id, user_id, plan_data JSONB, event_name, event_date, status, created_at, updated_at), RLS policies
- `src/domain/planSchema.js` — `validatePlanSchema()` and `hasNonRunningFields()` — reusable by the hook for plan validation after generation

### Existing hook patterns (replicate these)
- `src/hooks/usePlans.js` — `useReducer` + `useCallback` pattern, `getSupabaseClient()`, eager load in `usePlans(userId)`
- `src/hooks/useWorkoutEntries.js` — Complex hook with multiple async operations, atomic Supabase writes, `useReducer` state management
- `src/context/AppDataContext.jsx` — How to wire a new hook into the provider and expose it via `useAppData()`

### Existing data for pre-filling intake form
- `src/hooks/useRunnerProfile.js` — Provides `background` text for the free-text field
- `src/hooks/useActivities.js` — Provides Strava activities for weekly km estimate pre-fill
- `src/hooks/useWorkoutEntries.js` — Provides existing plan constraints (hard days, rest days) for pre-fill

### Testing patterns
- `tests/unit/mockAppData.js` — Shared test fixtures factory — must be updated with `hierarchicalPlan` slice
- `tests/unit/useWorkoutEntries.test.jsx` — Reference for hook test patterns (async operations, mock Supabase)
- `tests/unit/claudeCoach.schema.test.js` — Existing schema tests — `validatePlanSchema` is already tested here; hook tests should reuse the fixture

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/domain/planSchema.js` — `validatePlanSchema(plan)` validates the full JSONB plan after generation; use in hook before writing to state
- `src/hooks/usePlans.js` — Exact hook structure to replicate: `useReducer`, `pending/loaded/error` actions, `useCallback` for all methods, `getSupabaseClient()` singleton
- `src/hooks/useWorkoutEntries.js` — Reference for more complex async operations (preview + apply pattern, multiple dispatch calls)
- `src/hooks/useRunnerProfile.js` — Reference for upsert pattern and simple background text field
- `supabase/functions/claude-coach/index.ts` — The Edge Function already exists and is deployed; `generatePlan()` makes a POST to its URL with a JWT + `AthletePayload` body

### Established Patterns
- All hooks: `useReducer` with `{pending, loaded, error}` actions + `useCallback` with dependency arrays
- AppDataContext: compose hook via `const hierarchicalPlan = useHierarchicalPlan(userId)` then spread into `value` object
- Tests mock `useAppData` via `vi.mock("../src/context/AppDataContext", ...)` with `makeAppData(overrides)`
- Supabase RLS: all tables have `user_id = auth.uid()` policies — the hook must pass userId correctly

### Integration Points
- `AppDataContext.jsx`: add `useHierarchicalPlan` import, instantiate with `userId`, add to `value` object
- `tests/unit/mockAppData.js`: add `hierarchicalPlan` slice with mock plan and all methods as `vi.fn()`
- New Postgres migration needed for the two RPCs: `apply_plan_patch(plan_id, patch_array)` and `move_workout(plan_id, workout_id, from_date, to_date)`
- The intake form modal component will live in `src/components/` or co-located with the plan page

</code_context>

<specifics>
## Specific Ideas

- The intake form has 4 field groups (per Phase 17 decision): race goal + date, fitness baseline, weekly constraints, background free text
- `AthletePayload` interface is already defined in `supabase/functions/claude-coach/index.ts` — the form maps directly to that shape
- Phase 21 coach chat will call `applyPatch()` — the patch array format must be stable before Phase 21 planning
- `moveWorkout()` is what Phase 20 drag-and-drop will call — the RPC must be in place before Phase 20 planning
- The `generating` state flag should be set immediately when `generatePlan()` is called (before the fetch resolves) so the modal spinner appears instantly

</specifics>

<deferred>
## Deferred Ideas

- Plan history / multiple plans — the table supports it but the hook is single-plan only for now; adding history browsing is a future phase
- Streaming plan generation — explicitly out of scope per REQUIREMENTS.md Out of Scope section
- Multi-turn athlete assessment intake (SKILL.md full assessment flow) — v2.1 COACH-05 per STATE.md
- Partial plan regeneration (regenerate specific weeks only) — v2.1 COACH-04

</deferred>

---

*Phase: 18-hierarchical-plan-hook-layer*
*Context gathered: 2026-03-30*
