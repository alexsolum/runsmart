# Requirements: RunSmart v2.0

**Defined:** 2026-03-30
**Core Value:** The coaching guidance must produce practical, tailored training decisions that fit real life while preserving long-term progression and injury prevention.

## v2.0 Requirements

Requirements for the Claude Coach + Plan Overhaul milestone. Each maps to roadmap phases.

### AI Backend

- [x] **COACH-01**: User can generate a full training plan (all phases, weeks, and daily workouts) via Claude API in a single request using SKILL.md coaching methodology
- [ ] **COACH-02**: User can chat with Claude coach that has full plan context + recent Strava activity data, receiving personalized coaching advice
- [ ] **COACH-03**: Claude coach chat can suggest specific plan modifications that the user can review and apply to their stored plan

### Data Model

- [x] **DATA-01**: Training plan is stored as a hierarchical JSONB document (plan → phases → weeks → days → workouts) in Supabase
- [x] **DATA-02**: User's plan modifications from chat (plan-patch) are applied atomically to the stored JSONB document
- [x] **DATA-03**: Workout date swaps use an atomic Postgres RPC to prevent half-persisted state during drag-and-drop

### Plan Viewer

- [x] **VIEW-01**: User sees a color-coded phase timeline bar at the top of the plan matching the plan's phase structure
- [x] **VIEW-02**: User sees scrollable week rows with 7-day columns, week focus text, and weekly hours + km summary per row
- [x] **VIEW-03**: User can click a workout card to see a detail modal with zone info, duration, workout structure, and mark-complete button
- [x] **VIEW-04**: User can edit a workout from the detail modal (sport, type, name, description, duration, distance) and save changes
- [ ] **VIEW-05**: User can drag a workout card to a different day within the same week to reschedule it

### Cleanup

- [x] **CLEAN-01**: The gemini-coach Edge Function is removed after Claude replacement is validated
- [x] **CLEAN-02**: The admin philosophy editor, coach_philosophy_documents table, and playbook system are removed — coaching context lives in SKILL.md reference files
- [x] **CLEAN-03**: The old per-week AI generation flow (WeeklyAiCard, plan mode) is removed since full plan generation replaces it

## v2.1 Requirements

Deferred to future release. Tracked but not in current roadmap.

### AI Enhancements

- **COACH-04**: User can generate workouts for a specific day or date range only (partial plan generation)
- **COACH-05**: Multi-turn athlete assessment workflow validates foundation vs current form before plan generation (SKILL.md intake flow)

### Export

- **EXPORT-01**: User can export plan to calendar (ICS), Garmin, Zwift, or TrainerRoad formats

## Out of Scope

| Feature | Reason |
|---------|--------|
| Automatic background replanning | Breaks athlete trust — plans should change only on explicit request |
| Streaming JSON generation | Partial JSON is not renderable; full plan must be complete before display |
| Multi-sport support (swim/bike) | RunSmart is running-focused; triathlon features deferred |
| App shell redesign (sidebar/topbar) | Replaced by plan viewer approach; existing shell works |
| Admin philosophy editor | Superseded by SKILL.md reference files embedded in Edge Function |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| COACH-01 | Phase 17 | Complete |
| DATA-01 | Phase 17 | Complete |
| CLEAN-02 | Phase 17 | Complete |
| DATA-02 | Phase 18 | Complete |
| DATA-03 | Phase 18 | Complete |
| VIEW-01 | Phase 19 | Complete |
| VIEW-02 | Phase 19 | Complete |
| VIEW-03 | Phase 19 | Complete |
| VIEW-04 | Phase 19 | Complete |
| VIEW-05 | Phase 20 | Pending |
| COACH-02 | Phase 21 | Pending |
| COACH-03 | Phase 21 | Pending |
| CLEAN-01 | Phase 22 | Complete |
| CLEAN-03 | Phase 22 | Complete |

**Coverage:**
- v2.0 requirements: 14 total
- Mapped to phases: 14
- Unmapped: 0 ✓

---
*Requirements defined: 2026-03-30*
*Last updated: 2026-04-05 — Phase 22 cleanup requirements verified complete*
