# RunSmart

## Current State

**Shipped version:** v1.2 (2026-03-13)

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

## Next Milestone Goals

- Define the next product milestone and convert its goals into a fresh `.planning/REQUIREMENTS.md`
- Decide whether the next focus is weekly planner refinement, analytics depth, or data-sync reliability
- Clean up carried planning debt from v1.2 where it affects workflow confidence

## Current Milestone

No milestone is currently open. The next milestone should start with `$gsd-new-milestone`.

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

### Active

- [ ] Define the next milestone scope and user value
- [ ] Improve milestone traceability hygiene so requirements and summaries stay synchronized
- [ ] Decide how automated auth coverage should work for live Playwright weekly-planning flows

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
*Last updated: 2026-03-13 after v1.2 milestone completion*
