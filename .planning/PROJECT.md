# RunSmart

## Current State

**Shipped version:** v1.0 (2026-03-08)

RunSmart now ships a complete coach integration milestone across planning and insights:
- Editable/admin-gated coaching philosophy persistence and publish lifecycle
- Manual long-horizon replanning grounded in latest activities, logs, and check-ins
- Adaptation summary callouts in coach/replan surfaces
- Insights load-state interpretation + synthesis callout
- Hardened INSG-02 synthesis contract (sectioned plain text, sanitize/validate/fallback, 12w/84d context horizon)

## Core Value

The coaching guidance must produce practical, tailored training decisions that fit real life while preserving long-term progression and injury prevention.

## Next Milestone Goals

- Move AI-powered weekly plan generation from `Treningsplan` into the `Ukeplan` workflow
- Make weekly recommendations consume long-term block guidance and weekly mileage targets
- Add admin-controlled weekly planning principles and focus guidance to the recommendation context
- Support day-by-day weekly constraints such as long-run day, workout day, commute days, and double-threshold preferences

## Current Milestone: v1.2 Weekly Planning Intelligence

**Goal:** Turn `Ukeplan` into the primary AI weekly planning surface so recommendations reflect block-level intent, admin coaching principles, and the athlete's real week.

**Target features:**
- Ukeplan-first weekly AI generation and editing flow
- Recommendation engine grounded in `Treningsplan` weekly type and mileage inputs
- Admin-configurable weekly focus and training-principle guidance
- Per-day weekly constraints for schedule, workout placement, and preference handling

## Constraints

- Sensitive AI/Strava logic remains in Supabase Edge Functions
- Replanning remains manual-trigger only
- Single-user owner/admin model remains the baseline

<details>
<summary>v1.0 Planning Snapshot (Archived)</summary>

v1.0 roadmap and requirements are archived under:
- `.planning/milestones/v1.0-ROADMAP.md`
- `.planning/milestones/v1.0-REQUIREMENTS.md`
- `.planning/milestones/v1.0-MILESTONE-AUDIT.md`

</details>

---
*Last updated: 2026-03-13 for milestone v1.2 setup*
