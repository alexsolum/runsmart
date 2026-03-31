# Roadmap: RunSmart

## Milestones

- ✅ **v1.0 Coach Integration Foundations** — shipped 2026-03-08
- ✅ **v1.2 Weekly Planning Intelligence** — phases 9-11 shipped 2026-03-13 ([archive](./milestones/v1.2-ROADMAP.md))
- ✅ **v1.3 Weekly Planner Redesign** — phases 12-15 complete, phase 16 deferred into v2.0 scope
- 🚧 **v2.0 Claude Coach + Plan Overhaul** — phases 17-22 (in progress)

## Phases

<details>
<summary>✅ v1.2 Weekly Planning Intelligence — SHIPPED 2026-03-13</summary>

- [x] Phase 9: Ukeplan Ownership (2/2 plans)
- [x] Phase 10: Recommendation Context (4/4 plans)
- [x] Phase 11: Constraint-Aware Weekly Plans (4/4 plans)

Audit:
- [v1.2-MILESTONE-AUDIT.md](C:\Users\HP\Documents\Koding\Runsmart\runsmart\.planning\milestones\v1.2-MILESTONE-AUDIT.md)

</details>

<details>
<summary>✅ v1.0 Coach Integration Foundations — SHIPPED 2026-03-08</summary>

- [v1.0-ROADMAP.md](C:\Users\HP\Documents\Koding\Runsmart\runsmart\.planning\milestones\v1.0-ROADMAP.md)
- [v1.0-REQUIREMENTS.md](C:\Users\HP\Documents\Koding\Runsmart\runsmart\.planning\milestones\v1.0-REQUIREMENTS.md)
- [v1.0-MILESTONE-AUDIT.md](C:\Users\HP\Documents\Koding\Runsmart\runsmart\.planning\milestones\v1.0-MILESTONE-AUDIT.md)

</details>

<details>
<summary>✅ v1.3 Weekly Planner Redesign — phases 12-15 complete (phase 16 deferred)</summary>

- [x] Phase 12: Design Token Foundation (completed 2026-03-24)
- [x] Phase 13: Domain Logic + Workout Type Registry (completed 2026-03-24)
- [x] Phase 14: Planner Primitives + 4-Week Grid (completed 2026-03-25)
- [x] Phase 15: Click-to-Edit Workflow + FAB (completed 2026-03-25)
- Phase 16 (Volume Trend Header + App Shell) deferred — weekly summary replaced by new plan viewer design in v2.0

</details>

### 🚧 v2.0 Claude Coach + Plan Overhaul (In Progress)

**Milestone Goal:** Replace the Gemini AI backend with Claude, adopt a hierarchical plan data model (plan → phases → weeks → days → workouts), rebuild the weekly plan UI as a full-plan viewer, and enable conversational coaching chat with plan context.

- [x] **Phase 17: Claude Edge Function + Plan Foundation** - Working claude-coach Edge Function, hierarchical_plans DB table, and philosophy editor removed atomically (completed 2026-03-30)
- [x] **Phase 18: Hierarchical Plan Hook Layer** - useHierarchicalPlan and supporting data utilities wired into AppDataContext, PlanIntakeModal with form intake and generation UI (completed 2026-03-30)
- [x] **Phase 19: Plan Viewer UI** - Phase bar, scrollable week grid, workout cards, detail modal, and weekly summary (completed 2026-03-30)
- [ ] **Phase 20: Drag-and-Drop Rescheduling** - Within-week workout drag-and-drop backed by an atomic Postgres RPC
- [ ] **Phase 21: Coach Chat + Plan Patch** - Conversational coaching chat with plan context injection and AI-suggested plan modifications
- [ ] **Phase 22: Cleanup + Deprecation** - gemini-coach and old AI generation flow retired after new system is proven

## Phase Details

### Phase 17: Claude Edge Function + Plan Foundation
**Goal**: The claude-coach Edge Function is live, returns a verified full-plan JSON response, and the admin philosophy editor is removed atomically — every downstream phase has a working AI backend to call
**Depends on**: Phase 15 (v1.3 complete)
**Requirements**: COACH-01, DATA-01, CLEAN-02
**Success Criteria** (what must be TRUE):
  1. User can trigger full training plan generation and receive a complete hierarchical plan JSON (all phases, weeks, and daily workouts) via the claude-coach Edge Function using SKILL.md methodology
  2. The hierarchical_plans table exists in Supabase with correct RLS — a generated plan can be saved and retrieved by user ID without error
  3. An unauthenticated POST to claude-coach returns 401 — the auth boundary is intact
  4. The admin philosophy editor UI is gone and the Edge Function no longer queries coach_philosophy_documents — SKILL.md context is embedded directly in the function
  5. A plan generation call with a prompt that would exceed token limits returns a 4xx error (not a silently truncated plan)
**Plans**: 2 plans
Plans:
- [x] 17-01-PLAN.md — Claude-coach Edge Function, hierarchical_plans migration, and plan schema validation tests
- [x] 17-02-PLAN.md — Philosophy editor removal (CLEAN-02): delete files, clean AppDataContext/App.jsx, drop tables

### Phase 18: Hierarchical Plan Hook Layer
**Goal**: All UI and chat phases have a stable, tested data contract — useHierarchicalPlan owns the full JSONB plan lifecycle and AppDataContext exposes it
**Depends on**: Phase 17
**Requirements**: DATA-02, DATA-03
**Success Criteria** (what must be TRUE):
  1. ✅ useHierarchicalPlan exposes generatePlan(), applyPatch(), toggleWorkoutCompleted(), moveWorkout(), getWeek(), and getPhases() — all callable from any page via useAppData()
  2. ✅ Plan patches (AI-suggested modifications) are applied atomically to the stored JSONB document — no partial-write state is possible
  3. ✅ Workout date swaps use an atomic Postgres RPC — a network failure mid-swap leaves the plan in its original state, not a half-moved state
  4. ✅ The hook has component-level tests with a mock plan JSON fixture — all lifecycle methods are covered
**Plans**: 2 plans
Plans:
- [x] 18-01-PLAN.md — Postgres RPCs (apply_plan_patch, move_workout, toggle_workout_completed), useHierarchicalPlan hook, tests, AppDataContext wiring (completed 2026-03-30)
- [x] 18-02-PLAN.md — PlanIntakeModal component (form, pre-fill, validation, generating spinner, replace confirmation) and LongTermPlanPage empty state (completed 2026-03-30)

### Phase 19: Plan Viewer UI
**Goal**: Users can see their full training plan in a phase-oriented, week-by-week grid with workout cards — the plan is browsable, completable, and editable without a separate page
**Depends on**: Phase 18
**Requirements**: VIEW-01, VIEW-02, VIEW-03, VIEW-04
**Success Criteria** (what must be TRUE):
  1. User sees a color-coded phase timeline bar at the top of the plan — Base, Build, Peak, and Taper phases are visually distinct with correct date spans
  2. User sees scrollable week rows with 7 day columns, a week focus label, and a weekly hours + km summary column per row
  3. User can click a workout card to open a detail modal showing the workout name, zone, duration, sport type, and humanReadable structure breakdown
  4. User can edit a workout from the detail modal (sport, type, name, description, duration, distance) and see the saved changes reflected in the grid
**Plans**: 2 plans
Plans:
- [x] 19-01-PLAN.md — Full-plan viewer layout: sticky phase timeline, continuous week cards, explicit day states, and LongTermPlanPage integration (completed 2026-03-30)
- [x] 19-02-PLAN.md — Workout detail modal, modal-only completion toggle, and hierarchical workout editing flow (completed 2026-03-30)

### Phase 20: Drag-and-Drop Rescheduling
**Goal**: Users can reschedule workouts within a week by dragging a card to a different day — the move is atomic and reversible
**Depends on**: Phase 19, Phase 18 (atomic RPC from DATA-03 required)
**Requirements**: VIEW-05
**Success Criteria** (what must be TRUE):
  1. User can drag a workout card from one day column to another within the same week — the card visually follows the pointer during drag
  2. Dropping a workout on a target day updates the plan in the database — a page reload shows the workout on the new day
  3. If the database write fails, the workout snaps back to its original day — no half-persisted state is visible to the user
  4. An undo toast appears for 5 seconds after a successful move — the user can revert the swap before it commits
**Plans**: TBD

### Phase 21: Coach Chat + Plan Patch
**Goal**: Users can have a conversation with Claude that has full plan and recent Strava context — the coach can suggest specific plan changes the user can review and apply
**Depends on**: Phase 19 (plan viewer must be live for plan-patch results to be visible)
**Requirements**: COACH-02, COACH-03
**Success Criteria** (what must be TRUE):
  1. User can open the coach page and ask questions about their training plan — Claude responds with advice grounded in the user's specific plan phases, upcoming workouts, and recent Strava activity data
  2. When Claude suggests a plan modification, a confirmation card appears showing the proposed change — the user can accept or dismiss it without the change being applied automatically
  3. Accepting a suggested plan change updates the stored plan document — the change is immediately visible in the plan viewer without a page reload
**Plans**: TBD

### Phase 22: Cleanup + Deprecation
**Goal**: All orphaned code from the migration window is removed — the codebase has one AI backend, one plan data path, and no dead references
**Depends on**: Phase 21 (new system proven end-to-end before retiring old system)
**Requirements**: CLEAN-01, CLEAN-03
**Success Criteria** (what must be TRUE):
  1. The gemini-coach Edge Function is removed — no frontend code references it and no Supabase deployment serves it
  2. The old per-week AI generation flow (WeeklyAiCard and plan mode) is removed — the only plan generation path is the full-plan claude-coach flow
  3. A full audit confirms zero remaining imports of useCoachPhilosophy, gemini-coach, or the old weekly AI generation components
**Plans**: TBD

## Progress

**Execution Order:** 17 → 18 → 19 → 20 → 21 → 22

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 12. Design Token Foundation | v1.3 | 1/1 | Complete | 2026-03-24 |
| 13. Domain Logic + Workout Type Registry | v1.3 | 2/2 | Complete | 2026-03-24 |
| 14. Planner Primitives + 4-Week Grid | v1.3 | 5/5 | Complete | 2026-03-25 |
| 15. Click-to-Edit Workflow + FAB | v1.3 | 3/3 | Complete | 2026-03-25 |
| 16. Volume Trend Header + App Shell | v1.3 | 0/? | Deferred | - |
| 17. Claude Edge Function + Plan Foundation | v2.0 | 2/2 | Complete | 2026-03-30 |
| 18. Hierarchical Plan Hook Layer | v2.0 | 2/2 | Complete | 2026-03-30 |
| 19. Plan Viewer UI | v2.0 | 2/2 | Complete | 2026-03-30 |
| 20. Drag-and-Drop Rescheduling | v2.0 | 0/? | Not started | - |
| 21. Coach Chat + Plan Patch | v2.0 | 0/? | Not started | - |
| 22. Cleanup + Deprecation | v2.0 | 0/? | Not started | - |
