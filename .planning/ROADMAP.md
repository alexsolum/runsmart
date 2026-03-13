# Roadmap: v1.2 Weekly Planning Intelligence

**Created:** 2026-03-13
**Project:** RunSmart
**Total Requirements:** 8
**Starting Phase:** 9

## Phase Overview

| # | Phase | Goal | Requirements | Success Criteria |
|---|-------|------|--------------|------------------|
| 9 | Ukeplan Ownership | Make `Ukeplan` the single tactical weekly-planning surface while `Treningsplan` remains the source of weekly intent. | UKE-01, UKE-02 | 1. User can start AI weekly generation from `Ukeplan` without going through `Treningsplan`.<br>2. `Treningsplan` still exposes the selected week's type and mileage target as upstream context, not as a competing weekly generator.<br>3. The app presents one clear weekly-planning ownership model to the user. |
| 10 | 4/4 | Complete    | 2026-03-13 | 1. Generated week uses the selected week's training type from `Treningsplan`.<br>2. Generated week uses the selected week's target mileage from `Treningsplan`.<br>3. Active admin coaching philosophy is included in the weekly recommendation context.<br>4. Weekly output reflects philosophy-driven principles or red lines in a visible way. |
| 11 | Constraint-Aware Weekly Plans | Make generated weeks respect athlete day-by-day constraints, explain tradeoffs, and protect manual edits. | WCON-01, WCON-02, WCON-03 | 1. User can define day-specific constraints before generating a week.<br>2. Generated week explains how constraints and coaching context affected session placement, including conflicts.<br>3. Manual edits are not silently overwritten by regeneration. |

## Phase Details

### Phase 9: Ukeplan Ownership
**Goal:** Make `Ukeplan` the single tactical weekly-planning surface while `Treningsplan` remains the source of weekly intent.
**Status:** Complete (2026-03-13)
**Requirements:**
- [x] **UKE-01**: User can generate an AI weekly plan directly from `Ukeplan`.
- [x] **UKE-02**: User sees `Treningsplan` provide weekly intent and targets, while `Ukeplan` owns weekly day-by-day generation and editing.

**Success Criteria:**
1. User can start AI weekly generation from `Ukeplan` without going through `Treningsplan`.
2. `Treningsplan` still exposes the selected week's type and mileage target as upstream context, not as a competing weekly generator.
3. The app presents one clear weekly-planning ownership model to the user.

### Phase 10: Recommendation Context
**Goal:** Feed weekly recommendations with block-level targets plus the existing admin coaching philosophy from `coach_philosophy_documents`.
**Requirements:**
- [ ] **WREC-01**: Weekly AI recommendations use the selected week's training type from `Treningsplan`.
- [ ] **WREC-02**: Weekly AI recommendations use the selected week's target mileage from `Treningsplan`.
- [ ] **WREC-03**: Weekly AI recommendations incorporate the active admin coaching philosophy from the existing admin flow backed by the `coach_philosophy_documents` Supabase table.
- [ ] **WREC-04**: Admin coaching philosophy can shape weekly planning recommendations with guidance such as focus, training principles, and red-line rules.

**Success Criteria:**
1. Generated week uses the selected week's training type from `Treningsplan`.
2. Generated week uses the selected week's target mileage from `Treningsplan`.
3. Active admin coaching philosophy is included in the weekly recommendation context.
4. Weekly output reflects philosophy-driven principles or red lines in a visible way.

### Phase 11: Constraint-Aware Weekly Plans
**Goal:** Make generated weeks respect athlete day-by-day constraints, explain tradeoffs, and protect manual edits.
**Requirements:**
- [ ] **WCON-01**: User can provide day-specific weekly constraints and preferences such as long-run day, hard-workout day, commute days, and double-threshold allowed or forbidden.
- [ ] **WCON-02**: User receives an explanation of how constraints and planning guidance affected the generated week, including any conflicts or relaxed preferences.
- [ ] **WCON-03**: User does not lose existing manual weekly edits without an explicit review or replacement action.

**Success Criteria:**
1. User can define day-specific constraints before generating a week.
2. Generated week explains how constraints and coaching context affected session placement, including conflicts.
3. Manual edits are not silently overwritten by regeneration.
