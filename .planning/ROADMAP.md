# Roadmap: RunSmart

**Created:** 2026-03-05
**Project:** Coach Integration + Philosophy Tailoring
**Total v1 Requirements:** 10
**Coverage:** 10/10 mapped

## Phase Overview

| # | Phase | Goal | Requirements | Success Criteria |
|---|-------|------|--------------|------------------|
| 1 | 4/4 | Complete   | 2026-03-06 | 4 | 1/2 | In Progress|  | Inject active philosophy and latest training context into manual replanning | RPLN-01, RPLN-02, PHIL-03 | 4 |
| 3 | 4/4 | Complete    | 2026-03-06 | 4 |
| 4 | Insights Coach Layer | Add coach overlays and global synthesis to analytics surfaces | INSG-01, INSG-02 | 4 |

## Phase 1: Philosophy Platform

**Status:** Completed on 2026-03-05

**Goal:** Add a structured and editable philosophy layer that only owner/admin can modify.

**Requirements:** PHIL-01, PHIL-02

**Success Criteria:**
1. Philosophy content persists in Supabase with structured sections and metadata.
2. Owner/admin can edit philosophy in-app from a dedicated admin surface.
3. Unauthorized users cannot update philosophy (policy and API checks enforced).
4. Philosophy history/version metadata supports iterative updates over time.

## Phase 2: Replan Coach Context

**Status:** Completed on 2026-03-05 (5/5 plans complete)

**Goal:** Make manual replanning use active philosophy + latest training context for long-term and weekly plan outputs.

**Requirements:** RPLN-01, RPLN-02, PHIL-03

**Success Criteria:**
1. Manual replanning trigger exists in long-term planning flow.
2. Replan request payload includes latest activities, daily logs, and check-ins.
3. `gemini-coach` uses active philosophy at runtime for plan/revision modes.
4. Replan output returns valid structured weekly plan data for downstream UI rendering.

## Phase 3: Feedback Loop Integration

**Goal:** Improve coach adaptation quality by strengthening check-in/log interpretation and explicit reasoning.

**Requirements:** RPLN-03, FDBK-01, FDBK-02

**Plans:** 4/4 plans complete

Plans:
- [ ] 03-00-PLAN.md — Test infrastructure: SAMPLE_CHECKINS fixtures + gemini-instructions stub tests
- [ ] 03-01-PLAN.md — Edge function: instruction mandates, adaptation_summary, philosophy-in-initial-mode
- [ ] 03-02-PLAN.md — Payload builder: recentCheckins array in buildCoachPayload
- [ ] 03-03-PLAN.md — Frontend rendering: adaptation_summary callout in CoachPage and LongTermPlanPage

**Success Criteria:**
1. Coach feedback references check-in and daily-log inputs where present.
2. Coach output includes explicit "what changed and why" adaptation summary.
3. Recommendations align with long-run centric strategy and specific intensity distribution.
4. Replan and coaching flows keep schema-safe responses with fallback behavior on parse errors.

## Phase 4: Insights Coach Layer

**Goal:** Integrate coach interpretation directly into analytics surfaces starting with Training Load Trend and Insights overview.

**Requirements:** INSG-01, INSG-02

**Plans:** 1/2 plans executed

Plans:
- [ ] 04-01-PLAN.md — computeTrainingLoadState + Training Load Trend overlay callout (INSG-01)
- [ ] 04-02-PLAN.md — insights_synthesis edge function mode + Insights synthesis callout (INSG-02)

**Success Criteria:**
1. Training Load Trend displays coach overlay states tied to computed load/form windows.
2. Insights page renders one overall coach synthesis comment derived from current data.
3. Overlay/comment text stays consistent with latest coach response context.
4. UI remains readable on desktop and mobile without chart clutter or blocking interactions.

---
*Last updated: 2026-03-06 after 04 planning*
