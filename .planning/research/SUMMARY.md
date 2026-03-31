# Project Research Summary

**Project:** RunSmart v2.0 — Claude AI Coaching + Hierarchical Plan Model
**Domain:** AI-powered endurance training planner (running/ultra-marathon)
**Researched:** 2026-03-29
**Confidence:** HIGH

## Executive Summary

RunSmart v2.0 is a backend + data model + UI overhaul that replaces the existing Gemini AI coach with Claude, introduces a hierarchical plan document model, and delivers a full-plan viewer with drag-and-drop rescheduling. The industry pattern for coaching tools of this type is well-established: TrainingPeaks, TrainerRoad, and Garmin Coach all show that athletes expect to see their full macrocycle (phases, weeks, workouts) in a single view — not just the current week. The critical architectural decision is storing the AI-generated plan as a JSONB document rather than normalizing it into flat rows: the plan is always read as a whole, AI generates it as a whole, and JSONB avoids migration overhead as the schema evolves. Claude Sonnet 4.6 is the right model for plan generation (64k output, high-quality structured JSON at scale); Haiku 4.5 handles conversational follow-ups cheaply.

The recommended build order follows strict dependency order: the `claude-coach` Edge Function must ship before any UI work begins, because plan generation, coach chat, and plan context injection all flow through it. The hierarchical `hierarchical_plans` table is the second foundation — the plan viewer UI, drag-and-drop, and coach chat context all read from it. Only after both foundations are solid should the WeeklyPlanPage be rebuilt and drag-and-drop added on top. The existing `workout_entries` table must remain live in parallel throughout to avoid breaking the current weekly planner and protected-day logic.

The key risks are: (1) Claude truncating large plan JSON if `max_tokens` is not set high enough — set it to 24,000 for generation calls and always verify `stop_reason == "end_turn"`; (2) the structured outputs schema exceeding compilation limits if too many optional/nullable fields are used — use sentinel values and required fields instead; (3) the auth boundary silently breaking when the new Edge Function is created if the application-level JWT check is not preserved alongside `verify_jwt = false` in `config.toml`; and (4) dual-write divergence between the old `workout_entries` flat model and the new JSONB model during the migration window. All four risks are preventable with explicit checklists at each phase boundary.

---

## Key Findings

### Recommended Stack

The existing React 18 + Vite + Tailwind + Supabase stack is unchanged. Three net-new additions are required. The Anthropic SDK (`npm:@anthropic-ai/sdk@0.80.0`) supports Deno via the `npm:` specifier, but there is a concrete deployment risk: Deno 2.3+ generates lock file v5 which Supabase's hosted runtime does not yet support. The recommended mitigation is to call the Claude REST API via raw `fetch` in the Edge Function — the API is straightforward (`POST api.anthropic.com/v1/messages` with `x-api-key` and `anthropic-version` headers) and bypasses the lock file issue entirely. For the frontend, `@dnd-kit/core@6.3.1` + `@dnd-kit/sortable@10.0.0` + `@dnd-kit/utilities@3.2.2` are the correct drag-and-drop choice: they are the only React DnD library that natively supports the multi-container grid pattern (workouts moving between day columns in a 7-day grid). On the database side, a new `hierarchical_plans` table with a `plan_data JSONB` column is all that is needed — no new normalized tables.

**Core technologies (additions only):**
- `@anthropic-ai/sdk@0.80.0` (via Deno `npm:` specifier or raw `fetch`): Claude API client for Edge Function — use raw `fetch` pattern if Deno lock file v5 issue is not resolved in Supabase by Phase 1
- `@dnd-kit/core@6.3.1` + `@dnd-kit/sortable@10.0.0` + `@dnd-kit/utilities@3.2.2`: drag-and-drop for 7-day grid — only library supporting multi-container grid pattern natively; React 18 concurrent mode compatible
- `claude-sonnet-4-6`: plan generation model — 64k output, structured JSON quality at 8–16k token plans; $3/$15 per MTok acceptable for low-frequency generation
- `claude-haiku-4-5`: conversational chat model — 3x cheaper for short Q&A responses under 500 output tokens
- `hierarchical_plans` (Supabase JSONB table): stores full plan document — always read as a whole, no joins needed, AI-native document format

### Expected Features

Research confirmed that the SKILL.md methodology (assessment → validation → zones → periodization → full plan) maps closely to how professional coaches actually work and goes further than any competitor tool in explainability and athlete validation. The plan JSON schema is already validated by a real generated plan (`docs/running_coach/output/krs-smve-plan.json`).

**Must have (table stakes) — v2.0 launch:**
- Claude Edge Function (`claude-coach`) replacing `gemini-coach` — nothing else works without it
- Full training plan generation in a single interaction — all major competitors deliver a full macrocycle upfront
- Phase bar overview (Base → Build → Peak → Taper) — athletes orient by phase; all competitor tools show this
- Scrollable week grid with 7-day column layout — standard mental model for weekly training
- Workout cards with zone/type labels — athletes need session type and zone visible without opening a modal
- Workout detail modal (view mode: humanReadable structure, zone, duration) — needed to execute sessions
- Weekly hours + km summary per week row — minimum load awareness; every competitor shows this
- Mark workout as complete — fundamental execution feedback loop
- Conversational coaching chat grounded in plan + Strava context — primary differentiator over static plan tools
- Remove admin philosophy editor — eliminates dead code; coaching context moves to SKILL.md in Edge Function

**Should have (differentiators) — v2.0.x after validation:**
- Recovery week visual treatment (`isRecoveryWeek` badge + lighter styling) — reinforces coaching intent; content already in plan JSON
- Race strategy section display — content already in plan JSON; add panel once core viewer ships
- Zone reference panel (collapsible athlete zones) — supports workout execution, secondary to per-workout zone display
- Drag-and-drop workout rescheduling (within-week only) — requires stable plan viewer as prerequisite

**Defer (v3+):**
- Automatic adaptive replanning — requires ATL/CTL integration, months of infrastructure; explicitly out of scope in PROJECT.md
- Calendar export (iCal/Google Calendar) — integration complexity disproportionate to current user base
- Workout library CRUD — power user feature, post product-market fit
- Multi-athlete support — requires new auth model; project is single-user by design

### Architecture Approach

The architecture is a mode-dispatched Edge Function pattern: one `claude-coach` function handles all Claude API call modes (`generate_plan`, `coach_chat`, `plan_revision`) via a `mode` field in the request body. The coaching methodology (SKILL.md + reference files) is embedded as TypeScript string constants inside the Edge Function — not stored in the database — making it version-controlled and eliminating the `coach_philosophy_documents` table dependency. The frontend reads all plan data through a new `useHierarchicalPlan` hook that owns the JSONB document lifecycle; pages never call Supabase directly for plan data. The existing `workout_entries` flat model and its associated hooks remain unchanged and run in parallel during the migration window. The `plan_patch` response format from coach chat (`{ chat_response, plan_patch }`) allows AI-suggested changes to be applied to the plan without a full regeneration.

**Major components:**
1. `claude-coach` Edge Function — all Claude API calls; mode-dispatched (`generate_plan` / `coach_chat` / `plan_revision`); SKILL.md embedded as TS constants; returns plan JSON or `{ chat_response, plan_patch }`
2. `useHierarchicalPlan` hook — load/save/patch JSONB plan document; exposes `generatePlan()`, `applyPatch()`, `toggleWorkoutCompleted()`, `moveWorkout()`, `getWeek()`, `getPhases()`
3. `useCoachChat` hook — manages chat history; calls `claude-coach` in `coach_chat` mode; persists to existing `coach_messages` table
4. `hierarchical_plans` table — single JSONB row per plan; indexed by `plan_id` and `user_id`; same RLS pattern as `training_plans`
5. Rebuilt `WeeklyPlanPage` — phase bar + scrollable multi-week grid + workout cards; driven entirely by `useHierarchicalPlan`; drag-and-drop added last
6. New UI primitives: `PhaseBar`, `WorkoutCard` (zone badge + complete toggle + drag handle), `WeekSummaryCol`
7. `planUtils.js` — pure utility to derive flat workout list from JSONB for legacy bridge

### Critical Pitfalls

1. **Plan generation token truncation** — `max_tokens` defaults to 1024 in many clients; a 9-week plan needs 12,000–16,000 tokens. Set `max_tokens: 24000` for generation calls. Always assert `stop_reason == "end_turn"` in the Edge Function before returning the plan; return 4xx/5xx on `"max_tokens"` stop reason. Log to `ai_audit_logs`.

2. **Structured outputs schema too complex** — Claude's grammar compiler has hard limits: max 24 optional parameters total, max 16 nullable/union types. A deeply nested plan schema with many optional fields will return HTTP 400. Prevention: make every field `required`; represent rest days with sentinel values (`distance_km: 0`) not nullable types; set `additionalProperties: false` on every object; test schema against the API in isolation before wiring the UI.

3. **Auth boundary regression on new Edge Function** — `verify_jwt = false` in `config.toml` + application-level JWT check is the correct pattern, but the application-level check can be silently dropped when restructuring. Add an integration test: unauthenticated POST returns 401. Add `ANTHROPIC_API_KEY` presence check at function startup for loud failure on misconfiguration.

4. **Deno lock file v5 incompatibility** — Deno 2.3+ generates lock file v5; Supabase hosted runtime requires v4. If `@anthropic-ai/sdk` is installed via `deno add`, deployment will fail. Use raw `fetch` to call the Anthropic REST API directly to avoid the issue entirely.

5. **Dual-write divergence during migration** — `workout_entries` (old) and `hierarchical_plans` (new) coexist during v2.0. Without an explicit bridge or documented cutover, edits in one model are invisible to the other. Define the cutover moment explicitly in the roadmap: either dual-write during migration or add a `plan_version` flag to `training_plans` that hooks check to determine which model to read.

6. **Philosophy editor removal breaks coaching quality silently** — removing the admin UI does not automatically update the Edge Function; the function still queries `coach_philosophy_documents` until explicitly updated. Treat as a three-part atomic change: (1) remove UI, (2) update Edge Function to embed SKILL.md context directly, (3) verify plan quality. Never ship step 1 without step 2.

---

## Implications for Roadmap

Research strongly supports a 6-phase structure driven by the dependency chain: Edge Function → Data Model Hook → Plan Viewer → Drag-and-Drop → Coach Chat → Cleanup. Phases cannot be reordered without breaking dependencies.

### Phase 1: Claude Edge Function Foundation
**Rationale:** Every other v2.0 feature depends on `claude-coach` existing and returning valid JSON. This is the critical path blocker identified across all four research files. Nothing else should start until this is verified in a staging environment with a real Claude API response.
**Delivers:** Working `claude-coach` Edge Function with `generate_plan` and `coach_chat` modes; `hierarchical_plans` DB table with RLS; `ANTHROPIC_API_KEY` in Supabase secrets; verified 401 on unauthenticated requests; SKILL.md methodology embedded as TS constants; `stop_reason` validation returning 4xx on truncated plans; admin philosophy editor UI and DB dependency removed atomically with function update.
**Addresses:** Claude backend (P1), plan generation foundation (P1), philosophy editor removal (P1)
**Avoids:** Auth regression pitfall, Deno lock file pitfall (use raw `fetch`), token truncation pitfall (`max_tokens: 24000`), philosophy context loss pitfall (atomic removal)
**Research flag:** Needs isolated schema test against Claude structured outputs API before wiring UI. Deno lock file v5 resolution status should be checked at Phase 1 start.

### Phase 2: Hierarchical Plan Data Model + Hook
**Rationale:** `useHierarchicalPlan` is the data contract all UI phases depend on. Building it before the UI ensures pages are driven by a stable hook API. This is the "foundation before facade" principle from Architecture research.
**Delivers:** `useHierarchicalPlan` hook with full lifecycle (`loadPlan`, `generatePlan`, `applyPatch`, `toggleWorkoutCompleted`, `moveWorkout`, `getWeek`, `getPhases`); `planUtils.js` for flat-entry derivation; AppDataContext integration; component tests with mock plan JSON; dual-write bridge decision documented and implemented.
**Addresses:** Hierarchical plan JSON storage (P1), plan document lifecycle
**Avoids:** React re-render storm pitfall (memoize plan derivation keyed on `updated_at`); dual-write divergence pitfall (document cutover strategy in hook from day one)
**Research flag:** None — JSONB Supabase patterns are well-documented; hook follows established `useWorkoutEntries` pattern in this codebase.

### Phase 3: Plan Viewer UI (Phase Bar + Week Grid + Workout Cards + Detail Modal)
**Rationale:** With the Edge Function and hook in place, WeeklyPlanPage can be rebuilt against a stable data contract. Architecture research recommends building the full grid without drag-and-drop first — drag-and-drop is a mutation layer on top of the display layer and adding it concurrently creates conflicts.
**Delivers:** Rebuilt WeeklyPlanPage: phase bar, scrollable multi-week grid, day cells with workout cards (zone badge, type label, complete toggle), workout detail modal (view mode with humanReadable structure + zone info + duration), weekly hours/km summary column, recovery week visual treatment (badge + lighter styling on `isRecoveryWeek` rows).
**Uses:** `useHierarchicalPlan` hook (Phase 2); `@dnd-kit` installed but not yet wired (install now to avoid mid-phase breakage in Phase 4)
**Addresses:** Phase bar (P1), week grid (P1), workout cards (P1), workout detail modal (P1), weekly summary (P1), mark complete (P1), recovery week treatment (P2)
**Avoids:** React re-render storm (`React.memo` on week rows + day cells; `useMemo` for week slice derivation); mobile overflow pitfall (default single-week view on mobile)
**Research flag:** None — building a React grid UI is a standard pattern; all data shapes are defined by the JSONB schema already validated in Phase 1.

### Phase 4: Drag-and-Drop Workout Rescheduling (Within-Week)
**Rationale:** Feature research classifies within-week drag-and-drop as a P2 differentiator, not P1. The plan viewer must be stable and in real use before this is added. Drag-and-drop is architecturally the riskiest feature (atomic Postgres RPC requirement, DragOverlay scroll behavior, optimistic rollback) and should not be built on an unstable grid.
**Delivers:** dnd-kit multi-container setup wrapping the 7-day grid; `DndContext` + `SortableContext` per day column; `useSortable` on `WorkoutCard`; `DragOverlay` for scrollable grid; `onDragEnd` calls `useHierarchicalPlan.moveWorkout()`; undo toast (5s before DB commit); optimistic update with rollback on RPC failure; atomic Postgres RPC function for workout swap.
**Addresses:** Drag-and-drop within-week (P2)
**Avoids:** Drag-and-drop half-persistence pitfall (single atomic Postgres RPC, not two sequential writes); DragOverlay scroll clip (required for scrollable grid)
**Research flag:** DragOverlay scroll boundary behavior with dnd-kit in a scrollable container has known edge cases. Research the interaction before implementation.

### Phase 5: Coach Chat Rebuild + Plan Patch Integration
**Rationale:** Conversational chat with plan context requires the plan JSONB to exist in the DB (Phase 1), the hook to expose plan data (Phase 2), and the plan viewer to be live (Phase 3) so athletes can reference specific workouts in their messages. Architecture research identifies this as the last major feature in the dependency chain.
**Delivers:** `useCoachChat` hook; rebuilt CoachPage with full conversation UI; `claude-coach` wired in `coach_chat` mode with full plan + Strava context injection; `plan_patch` response handling (confirmation card → `useHierarchicalPlan.applyPatch()`); conversation history persistence to existing `coach_messages` table; race strategy section display panel.
**Addresses:** Conversational coaching chat (P1), plan patch via chat, race strategy section (P2), zone reference panel (P2)
**Avoids:** Context injection requiring stored plan — plan must exist in DB before chat context works, ensured by Phase 2 prerequisite.
**Research flag:** None — `coach_conversations` + `coach_messages` schema already exists; chat UI pattern follows established CoachPage.

### Phase 6: Cleanup + Deprecation
**Rationale:** Technical debt from the migration window must be removed before declaring v2.0 complete. Orphaned code (`gemini-coach`, `useCoachPhilosophy`, admin philosophy editor DB tables) creates maintenance overhead and confusion for future development.
**Delivers:** `gemini-coach` Edge Function retired (after `claude-coach` verified in production); `useCoachPhilosophy` and `useCoachConversations` removed from AppDataContext; `coach_admins`, `coach_philosophy_documents`, `coach_philosophy_versions`, `coach_playbook_entries` tables deprecated (retain data, add migration comment); dual-write bridge removed after confirming new UI is sole consumer of plan data; full audit confirming no remaining references to retired hooks or tables.
**Addresses:** Dead code removal, architecture clean-up
**Avoids:** Philosophy context loss pitfall (verify plan quality with test generation before retiring tables); dual-write divergence (confirm canonical source before removing bridge)
**Research flag:** None — pure cleanup; no new patterns needed.

### Phase Ordering Rationale

- **Phase 1 before everything:** The Edge Function is the only external dependency. All internal React/Supabase work can be designed concurrently with Phase 1, but nothing can be validated end-to-end until Phase 1 delivers a working Claude response.
- **Phase 2 before Phase 3:** `useHierarchicalPlan` is the data contract the UI depends on. Building UI before the hook forces pages to embed data-fetching logic that later needs extraction — a guaranteed rework.
- **Phase 3 before Phase 4:** Drag-and-drop is a mutation layer on top of a display layer. The grid structure must be stable before adding pointer event handlers and optimistic state.
- **Phase 3 before Phase 5:** Coach chat grounded in plan context requires the plan viewer to be live so athletes can reference specific workouts. More importantly, `applyPatch()` needs a visible plan to show the result of the patch.
- **Phase 6 last:** Cleanup is safe only after the new system is proven in production. Retiring old tables before the new path is fully tested creates irreversible data loss risk.

### Research Flags

Phases likely needing deeper research during planning (use `/gsd:research-phase`):
- **Phase 1 (Claude Edge Function):** The hierarchical plan JSON schema needs isolated testing against the Claude structured outputs API for grammar compilation limits before the generation flow is built. If the schema exceeds limits, the mitigation (sentinel values, required fields) must be applied before the hook or UI are started. Also verify Deno lock file v5 resolution status in Supabase at Phase 1 start.
- **Phase 4 (Drag-and-Drop):** The multi-container sortable pattern with dnd-kit in a scrollable container has documented DragOverlay scroll boundary edge cases. Research the interaction before implementation to avoid a late-phase rewrite of the overlay strategy.

Phases with standard patterns (skip research-phase):
- **Phase 2 (Hook + Data Model):** Supabase JSONB patterns are well-documented. The hook follows the established `useWorkoutEntries` pattern in this codebase.
- **Phase 3 (Plan Viewer UI):** Building a React grid UI is a standard pattern. `PhaseBar`, `WeekSummaryCol`, and `WorkoutCard` follow existing component conventions in this codebase.
- **Phase 5 (Coach Chat):** `coach_conversations` + `coach_messages` schema already exists. Chat UI follows established CoachPage patterns.
- **Phase 6 (Cleanup):** Deprecation and dead code removal is mechanical. No research needed.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All conclusions grounded in official Anthropic SDK docs, official Supabase docs, and direct codebase inspection. Deno lock file issue confirmed by Supabase community discussion (MEDIUM on that specific sub-point). |
| Features | HIGH | Table stakes derived from direct competitor analysis + authoritative first-party files (SKILL.md, PROJECT.md, existing validated plan JSON). Competitor feature parity at MEDIUM confidence via WebSearch (March 2026). |
| Architecture | HIGH | Grounded entirely in direct code inspection of all affected source files. JSONB pattern, Edge Function mode-dispatch, and hook architecture all derived from existing project patterns — not speculation. |
| Pitfalls | HIGH (structured outputs, auth, token limits) / MEDIUM (DnD patterns, migration divergence) | Token limits and structured output constraints confirmed from official Anthropic docs. Auth regression confirmed from existing CONCERNS.md. Deno lock file from community discussion. DnD and migration patterns from general industry knowledge. |

**Overall confidence:** HIGH

### Gaps to Address

- **Structured outputs schema validation:** The plan JSON schema from `krs-smve-plan.json` has not yet been tested against the Claude structured outputs API for grammar compilation limits. This must be the first task in Phase 1, before any other work begins. If the schema exceeds limits, the mitigation (sentinel values + required fields) needs to be applied before the hook or UI are designed.

- **Deno lock file v5 resolution:** As of 2026-03-29, Supabase hosted runtime does not support Deno lock file v5. The recommendation is raw `fetch` to avoid this. Verify the current status at Phase 1 start — if Supabase resolves this, the Anthropic SDK is preferable.

- **Dual-write bridge decision:** Whether to dual-write to both `workout_entries` and `hierarchical_plans` during migration, or use a `plan_version` flag for read-path switching, needs to be decided during Phase 2 planning. The choice depends on how quickly the old WeeklyPlanPage will be retired and whether protected-day logic must continue to work during the transition.

- **Plan generation UX for multi-turn SKILL.md assessment:** SKILL.md requires presenting an assessment and getting athlete confirmation before generating the full plan. The research identifies this as a conversation flow, not a form submit, but the exact UX pattern (guided chat steps vs. structured modal wizard) is not specified. This needs a UX design decision during Phase 1 or Phase 3 planning.

---

## Sources

### Primary (HIGH confidence)
- `docs/running_coach/SKILL.md` + `docs/running_coach/reference/*.md` — Claude Coach skill definition, assessment workflow, JSON schema, periodization and zone principles
- `docs/running_coach/output/krs-smve-plan.json` — authoritative real-world hierarchical plan JSON; confirms schema is production-ready
- `.planning/PROJECT.md` — v2.0 milestone scope, constraints, and explicit out-of-scope items
- `src/context/AppDataContext.jsx`, `src/hooks/useWorkoutEntries.js`, `src/hooks/usePlans.js` — existing architecture patterns being extended
- `supabase/functions/gemini-coach/index.ts` + `playbook.ts` — existing Edge Function pattern being replaced
- `supabase/migrations/20260226_coach_conversations.sql` — existing coach conversation schema (compatible, unchanged)
- `.planning/codebase/CONCERNS.md` — auth boundary concern #3 confirming verify_jwt pattern risk
- [Anthropic TypeScript SDK docs](https://platform.claude.com/docs/en/api/sdks/typescript) — Deno support, npm: specifier, SDK version 0.80.0
- [Anthropic Models Overview](https://platform.claude.com/docs/en/about-claude/models/overview) — claude-sonnet-4-6 API ID, pricing, 64k output limit
- [Anthropic Structured Outputs docs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs) — schema complexity limits, required fields, sentinel values
- [Supabase Managing Dependencies](https://supabase.com/docs/guides/functions/dependencies) — npm: specifier recommended over esm.sh
- [TrainerRoad Plan Builder](https://support.trainerroad.com/hc/en-us/articles/360037923191-Plan-Builder-Overview) — phase structure patterns
- [Final Surge Coach Features](https://site.finalsurge.com/Coaches) — coach-athlete workflow patterns
- `package.json` — all existing installed versions confirmed

### Secondary (MEDIUM confidence)
- [Supabase Deno lock file v5 community discussion](https://github.com/orgs/supabase/discussions/39966) — lock file v4 requirement confirmed
- [@dnd-kit/core npm](https://www.npmjs.com/package/@dnd-kit/core) + [dnd-kit GitHub issue #1194](https://github.com/clauderic/dnd-kit/issues/1194) — v6.3.1, React 18 compatibility, active maintenance as of February 2026
- [Puck Editor DnD comparison](https://puckeditor.com/blog/top-5-drag-and-drop-libraries-for-react) — grid layout limitation of @hello-pangea/dnd confirmed
- [Garmin Q1 2026 AI Coaching Update](https://www.garminnews.com/garmin-q1-2026-update-new-gear-tracking-circadian-sleep-alignment-and-ai-coaching-debuts/) — Garmin Coach feature scope
- [PacePartner LLM coaching patterns](https://pacepartner.app/blog/best-ai-coaching-tools-intervals-icu-2026) — LLM coaching context architecture
- [GPTCoach research, CHI 2025](https://dl.acm.org/doi/10.1145/3706598.3713819) — LLM coaching architecture validation (peer-reviewed)
- [Knowledge-grounded LLM for sports plans, Scientific Reports 2026](https://www.nature.com/articles/s41598-026-37075-z) — domain-grounded plan generation pattern (peer-reviewed)

### Tertiary (LOW confidence)
- LLM output truncation patterns — general LLM literature, inferred from token budget research
- PostgreSQL JSONB TOAST behavior at large sizes — architecture-weekly.com, corroborated by Supabase docs

---
*Research completed: 2026-03-29*
*Ready for roadmap: yes*
