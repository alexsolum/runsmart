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

- Close live-UAT debt for philosophy admin flows in production
- Normalize requirement traceability updates as part of phase closeout
- Address remaining synthesis prompt wording consistency debt
- Define and scope v1.1 requirements with a fresh milestone setup

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
*Last updated: 2026-03-08 after v1.0 milestone completion*
