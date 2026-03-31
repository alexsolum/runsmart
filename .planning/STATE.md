---
gsd_state_version: 1.0
milestone: v2.0
milestone_name: Claude Coach + Plan Overhaul
current_phase: 21
current_plan: 1
status: executing
last_updated: "2026-03-31T18:55:01.578Z"
last_activity: 2026-03-31
progress:
  total_phases: 6
  completed_phases: 3
  total_plans: 10
  completed_plans: 8
---

# State

**Initialized:** 2026-03-29
**Current Phase:** 21
**Current Plan:** 1
**Status:** Ready to execute

Last activity: 2026-03-31

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-29)

**Core value:** The coaching guidance must produce practical, tailored training decisions that fit real life while preserving long-term progression and injury prevention.
**Current focus:** Phase 21 — Coach Chat + Plan Patch

## Artifacts

- Project: `.planning/PROJECT.md`
- Config: `.planning/config.json`
- Research: `.planning/research/SUMMARY.md`
- Roadmap: `.planning/ROADMAP.md`
- Requirements: `.planning/REQUIREMENTS.md`
- Coach skill: `docs/running_coach/SKILL.md`
- Coach references: `docs/running_coach/reference/`
- Coach output examples: `docs/running_coach/output/`

## Current Position

Phase: 21 (Coach Chat + Plan Patch) — EXECUTING
Plan: 3 of 3

## Performance Metrics

**Velocity:**

- Total plans completed (v2.0): 2
- Average duration: 30 minutes
- Total execution time: 60 minutes

**By Phase:**

| Phase | Plan | Duration | Tasks | Files |
|-------|------|----------|-------|-------|
| Phase 18 | P01 | 30 min | 2 | 4 |
| Phase 18 | P02 | 30 min | 3 | 2 |

| Phase 19 | P01 | 38 min | 2 | 8 |

*Updated after each plan completion*
| Phase 19 P02 | 11 min | 2 tasks | 6 files |
| Phase 21 P01 | 15 | 2 tasks | 2 files |

## Accumulated Context

### Decisions

- v2.0 scope: Replace Gemini with Claude API, adopt hierarchical plan model, rebuild weekly plan UI
- v1.3 Phase 16 deferred — weekly summary replaced by new plan viewer design in v2.0
- CLEAN-02 bundled with Phase 17 (Edge Function) — philosophy editor removal is atomic with function update, not a separate phase
- Use raw fetch to call Anthropic REST API (avoids Deno lock file v5 incompatibility with Supabase)
- Phase 20 (drag-and-drop) explicitly depends on DATA-03 atomic RPC from Phase 18
- Cleanup phases (CLEAN-01, CLEAN-03) placed in Phase 22 — after new system is proven in production
- [Phase 17]: CLEAN-02 complete: philosophy editor system fully removed; coaching context lives in SKILL.md reference files in claude-coach Edge Function
- [Phase 17]: Raw fetch to Anthropic REST API (no SDK) confirmed as pattern for all Edge Functions
- [Phase 17]: planSchema.js created as pure domain module reusable by both Edge Function and frontend
- [Phase 18 Plan 01]: generatePlan sets generating:true synchronously before async invoke
- [Phase 18 Plan 01]: moveWorkout is a no-op when fromDate === toDate (prevents unnecessary RPC calls)
- [Phase 18 Plan 01]: All RPCs use row-level locking (FOR UPDATE) to prevent concurrent modifications
- [Phase 18 Plan 02]: Form validation fires on submit (not blur) for better UX with clear error messages
- [Phase 18 Plan 02]: PlanIntakeModal handles pre-fill from Strava activities (4-week average), runner profile background, and workout entries (hard/rest days)
- [Phase 18 Plan 02]: Generating state spinner cycles 3 coaching messages with 4-second intervals for UX feedback during Edge Function call
- [Phase 18 Plan 02]: Replace confirmation dialog prevents accidental overwrites when existing plan is present
- [Phase 19]: Past phases collapse by default, but current and future phases always render expanded.
- [Phase 19]: Mobile week browsing uses a single-day pager instead of compressing seven columns.
- [Phase 19]: Workout cards stay scan-focused and delegate completion/editing to the detail modal only.
- [Phase 19]: Successful workout edits close the modal so the updated card is immediately visible in the grid.

### Blockers/Concerns

- Phase 17 research flag: structured outputs schema must be tested against Claude API in isolation before hook or UI work begins — if schema exceeds grammar compilation limits, sentinel value mitigation must be applied first
- Phase 20 research flag: dnd-kit DragOverlay scroll boundary behavior in a scrollable container has documented edge cases — research before implementation

### Pending Todos

- Day/date-range AI plan generation (v2.1 COACH-04)
- Multi-turn SKILL.md assessment UX pattern needs design decision during Phase 17 or 19 planning

## Session Continuity

Last session: 2026-03-31T12:39:00.823Z
Completed: Phase 19 Plan 02 (Workout detail modal with completion toggle and hierarchical edit flow)
Summary: .planning/phases/19-plan-viewer-ui/19-02-SUMMARY.md
Next: Phase 20 (Drag-and-Drop Rescheduling)
