# RunSmart

## Current State

**Shipped version:** v1.2 (2026-03-13)
**v2.0 progress:** Phase 18 complete — Hierarchical plan hook layer with intake modal

RunSmart now ships an end-to-end weekly planning workflow that fits the product’s athlete-first coaching model:
- `Ukeplan` owns AI-powered weekly generation and editing
- `Treningsplan` provides read-only week intent and handoff context
- Weekly planning respects selected-week type, mileage target, admin coaching philosophy, and day-level athlete constraints
- Manual edits are protected during regeneration with explicit review-before-replace flow

Current codebase snapshot:
- Static React/Vite frontend with direct Supabase integration
- Secure weekly planning and coaching logic in Supabase Edge Functions
- Rough codebase size in active app/test/backend folders: ~23.9k lines

## Core Value

The coaching guidance must produce practical, tailored training decisions that fit real life while preserving long-term progression and injury prevention.

## Current Milestone: v2.0 Claude Coach + Plan Overhaul

**Goal:** Replace the Gemini AI backend with Claude API using the endurance coaching skill, adopt a hierarchical plan data model (plan → phases → weeks → days → workouts), and rebuild the weekly plan UI inspired by the claude-coach HTML viewer.

**Target features:**
- Claude API Edge Function replacing gemini-coach with SKILL.md coaching methodology
- Full training plan generation (all phases + weeks) in a single AI call
- Conversational coaching chat powered by Claude
- Hierarchical plan model: plan → phases → weeks → days → workouts (JSON-native)
- Weekly plan UI overhaul: phase bar, weekly rows with 7-day columns, workout cards with zones
- Workout detail modal with zone info, workout structure, and mark-complete
- Drag-and-drop workouts between days
- Weekly hours + km summary per week row
- Remove admin philosophy editor (coaching context lives in SKILL.md reference files)

## Constraints

- Sensitive AI/Strava logic remains in Supabase Edge Functions
- Replanning remains manual-trigger only
- Single-user owner/admin model remains the baseline
- Weekly planning must continue to fit real life before it optimizes training purity

## Requirements

### Validated

- ✓ Ukeplan-first weekly AI generation and editing — v1.2
- ✓ Weekly planning grounded in selected-week training type and target mileage — v1.2
- ✓ Admin coaching philosophy applied as secure weekly planning guidance — v1.2
- ✓ Day-level weekly constraints and protected-day overwrite review — v1.2
- ✓ Workout type registry and planner analytics domain helpers — Phase 13
- ✓ 4-week planner grid with design system overhaul — Phase 14
- ✓ Workout type color coding and constraint day visualization — Phase 14
- ✓ Click-to-edit workout workflow — Phase 15
- ✓ Claude API Edge Function with embedded coaching methodology — Phase 17
- ✓ Hierarchical plans JSONB table with RLS — Phase 17
- ✓ Philosophy editor removal and cleanup — Phase 17
- ✓ Full training plan generation via Claude with SKILL.md methodology — Phase 18
- ✓ Weekly plan hook layer (useHierarchicalPlan) with atomic operations — Phase 18
- ✓ Plan intake modal with smart pre-fill and form validation — Phase 18

### Active

- [ ] Conversational coaching chat powered by Claude (Phase 21)
- [ ] Weekly plan UI overhaul inspired by claude-coach HTML viewer (Phase 19)
- [ ] Drag-and-drop workouts between days (Phase 20)
- [ ] Weekly hours + km summary per week row (Phase 19)

### Out of Scope

- Full automatic daily replanning from live workout execution
- Multi-athlete weekly planning collaboration
- New external calendar sync features
- Full coaching replacement

<details>
<summary>Previous Milestone Snapshot</summary>

Archived planning artifacts:
- `.planning/milestones/v1.0-ROADMAP.md`
- `.planning/milestones/v1.0-REQUIREMENTS.md`
- `.planning/milestones/v1.0-MILESTONE-AUDIT.md`
- `.planning/milestones/v1.2-ROADMAP.md`
- `.planning/milestones/v1.2-REQUIREMENTS.md`
- `.planning/milestones/v1.2-MILESTONE-AUDIT.md`

</details>

---
*Last updated: 2026-03-30 after Phase 18 completion*
