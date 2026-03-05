# RunSmart

## What This Is

RunSmart is an AI-guided endurance training planner focused on helping a runner prepare for goal races through practical, adaptive planning. The app combines training plans, executed activity data, daily logs/check-ins, and coaching insight in one workflow. This milestone extends the coach from a page-level feature into a planning-and-insights layer across the app.

## Core Value

The coaching guidance must produce practical, tailored training decisions that fit real life while preserving long-term progression and injury prevention.

## Requirements

### Validated

- ✓ Authenticated runner workflow with Supabase-backed data and session handling — existing
- ✓ Goal-race-centered planning surfaces (long-term and weekly planning pages) — existing
- ✓ Strava integration for OAuth + activity ingestion via Edge Functions — existing
- ✓ Daily logs/check-ins and trend analytics views — existing
- ✓ AI coach conversations and coaching response pipeline via `gemini-coach` — existing

### Active

- [ ] Coach guidance influences long-term plan creation and manual replanning flows (not auto-replan)
- [ ] Weekly plan adaptations are coach-aware when the user triggers replanning
- [ ] Daily log and check-in loops feed clearer coach feedback and recommendations
- [ ] Training philosophy is externalized into an editable source of truth that evolves over time
- [ ] Admin-only in-app capability to update coaching philosophy content/rules
- [ ] Training Load Trend chart gets coach overlays/comments grounded in current data
- [ ] Insights page includes an overall coach evaluation comment synthesized from available data

### Out of Scope

- Automatic replanning without explicit user trigger — user requested manual control only
- Major UI redesign — objective is deeper integration, not a visual overhaul
- Multi-user admin/coaching roles — current phase remains single-user admin/owner focused

## Context

The codebase already has a solid foundation: React + Vite frontend, Supabase-backed data model, and Edge Functions for Strava and Gemini coaching. Existing architecture includes domain compute helpers, hooks per data domain, and a coach flow with dynamic playbook support (`coach_playbook_entries`). The next step is orchestration quality: coach outputs should be more consistently connected to planning, daily logs/check-ins, and insight surfaces while aligning with Jason Koop and Marius Bakken principles (long-run centric structure and specific intensity distribution).

## Constraints

- **Architecture**: Keep sensitive AI/Strava logic in Supabase Edge Functions — avoid exposing secrets in frontend
- **Control model**: Replanning must be manual-trigger only — no background auto-adjustment
- **Methodology**: Coaching must preserve long-run centric planning and specific intensity distribution
- **Product scope**: Single-user first with owner-admin behavior for philosophy editing
- **Compatibility**: Build on current Supabase schema + hook architecture without breaking existing flows

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Replanning is manual-trigger only | Prevent unwanted plan churn and keep runner control | — Pending |
| Encode coaching philosophy as editable persistent content | Method evolves over time and should not be hardcoded | — Pending |
| Add admin-only philosophy editor in app | User needs safe direct control of philosophy source | — Pending |
| Start coach-chart integration on Training Load Trend and Insights summary | Highest leverage with current analytics pages | — Pending |
| Keep auto-replan, major redesign, and multi-user roles out of scope | Maintain focused, shippable milestone | — Pending |

---
*Last updated: 2026-03-05 after initialization*
