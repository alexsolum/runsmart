# Requirements: v1.2 Weekly Planning Intelligence

**Goal:** Turn `Ukeplan` into the primary AI weekly planning surface so recommendations reflect block-level intent, admin coaching principles, and the athlete's real week.

## 1. Ukeplan Ownership (UKE)
`Ukeplan` becomes the single tactical weekly-planning workflow.

- [x] **UKE-01**: User can generate an AI weekly plan directly from `Ukeplan`.
- [x] **UKE-02**: User sees `Treningsplan` provide weekly intent and targets, while `Ukeplan` owns weekly day-by-day generation and editing.

## 2. Recommendation Context (WREC)
Weekly recommendations must be grounded in the long-term plan and coaching rules.

- [ ] **WREC-01**: Weekly AI recommendations use the selected week's training type from `Treningsplan`.
- [ ] **WREC-02**: Weekly AI recommendations use the selected week's target mileage from `Treningsplan`.
- [ ] **WREC-03**: Weekly AI recommendations incorporate the active admin coaching philosophy from the existing admin flow backed by the `coach_philosophy_documents` Supabase table.
- [ ] **WREC-04**: Admin coaching philosophy can shape weekly planning recommendations with guidance such as focus, training principles, and red-line rules.

## 3. Weekly Constraints & Safety (WCON)
The generated week must fit real life and remain editable.

- [ ] **WCON-01**: User can provide day-specific weekly constraints and preferences such as long-run day, hard-workout day, commute days, and double-threshold allowed or forbidden.
- [ ] **WCON-02**: User receives an explanation of how constraints and planning guidance affected the generated week, including any conflicts or relaxed preferences.
- [ ] **WCON-03**: User does not lose existing manual weekly edits without an explicit review or replacement action.

## Future Requirements

- **WCON-04**: User can compare multiple generated weekly variants before choosing one.
- **WREC-05**: Weekly AI recommendations adapt automatically from executed workouts mid-week.
- **UKE-03**: User can reorder sessions with drag-and-drop weekly calendar interactions.

## Out of Scope

- Full automatic daily replanning from live workout execution.
- Multi-athlete weekly planning collaboration.
- New external calendar sync features.
- Replacing the long-term `Treningsplan` block builder with a day-by-day planner.

## Traceability
| Req ID | Phase | Plan | Status |
|--------|-------|------|--------|
| UKE-01 | 9 | 09-01 | Complete |
| UKE-02 | 9 | 09-02 | Complete |
| WREC-01 | 10 | - | Pending |
| WREC-02 | 10 | - | Pending |
| WREC-03 | 10 | - | Pending |
| WREC-04 | 10 | - | Pending |
| WCON-01 | 11 | - | Pending |
| WCON-02 | 11 | - | Pending |
| WCON-03 | 11 | - | Pending |
