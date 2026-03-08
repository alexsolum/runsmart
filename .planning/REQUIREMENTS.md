# Requirements: RunSmart

**Defined:** 2026-03-05
**Core Value:** The coaching guidance must produce practical, tailored training decisions that fit real life while preserving long-term progression and injury prevention.

## v1 Requirements

### Replanning

- [ ] **RPLN-01**: User can trigger manual long-term replanning from the app and receive updated weekly structure up to goal race.
- [ ] **RPLN-02**: Replanning uses latest activities, daily logs, and check-ins as input context.
- [x] **RPLN-03**: Replanning response includes a clear summary of what changed and why.

### Coaching Philosophy

- [x] **PHIL-01**: User can maintain coaching philosophy content in a persistent structured store.
- [x] **PHIL-02**: Only authenticated owner/admin can edit coaching philosophy in-app.
- [ ] **PHIL-03**: `gemini-coach` applies active philosophy content at runtime when generating coaching output.

### Feedback Loop

- [x] **FDBK-01**: Check-in and daily log data are incorporated into coach feedback responses for next-step recommendations.
- [x] **FDBK-02**: Coach feedback explicitly reflects long-run centric planning and specific intensity distribution.

### Insights Integration

- [x] **INSG-01**: Training Load Trend chart shows coach overlay signals tied to current load/fatigue interpretation.
- [x] **INSG-02**: Insights page shows one overall coach synthesis comment based on available training data.

## v2 Requirements

### Replanning Automation

- **AUTO-01**: System automatically replans without user trigger when new data is ingested.

### Multi-User Roles

- **ROLE-01**: Multiple users can hold editor/admin coaching philosophy roles.

### UX Expansion

- **UX-01**: Broad app shell redesign optimized around coach-first navigation.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Automatic background replanning | Explicitly excluded for this milestone; user wants manual control |
| Major UI redesign | Focus is integration depth and coaching quality, not redesign |
| Multi-user admin/coaching role model | Single-user owner/admin scope for now |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| RPLN-01 | Phase 2 | Pending |
| RPLN-02 | Phase 2 | Pending |
| RPLN-03 | Phase 3 | Complete |
| PHIL-01 | Phase 1 | Complete |
| PHIL-02 | Phase 1 | Complete |
| PHIL-03 | Phase 2 | Pending |
| FDBK-01 | Phase 3 | Complete |
| FDBK-02 | Phase 3 | Complete |
| INSG-01 | Phase 4 | Complete |
| INSG-02 | Phase 5 | Complete |

**Coverage:**
- v1 requirements: 10 total
- Mapped to phases: 10
- Unmapped: 0 ✓

---
*Requirements defined: 2026-03-05*
*Last updated: 2026-03-08 after Phase 5 verification pass*
