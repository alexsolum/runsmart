# Phase 13: Domain Logic + Workout Type Registry - Context

**Gathered:** 2026-03-24
**Status:** Ready for planning

<domain>
## Phase Boundary

All pure business logic powering the new planner — workout type constants, load stats aggregation, volume trend aggregation, and the activity distance unit helper — is written, unit-tested, and ready to be consumed by UI components without duplication. No UI components are built in this phase.

</domain>

<decisions>
## Implementation Decisions

### Workout type taxonomy
- Merged superset of 10 canonical types: EASY, LONG_RUN, TEMPO, INTERVALS, STEADY_STATE, RECOVERY, STRENGTH, CROSS_TRAIN, REST, RACE_EVENT
- SCREAMING_SNAKE casing for type keys (e.g., `WORKOUT_TYPES.LONG_RUN`)
- Sources merged: useWorkoutEntries types + compute.js Koop workout types + Race/Event for Phase 14 grid
- Fartlek explicitly excluded — not needed
- Zones (z1-z4) stay as a separate concern in compute.js for Koop plan generation; the registry maps workout TYPES to display properties only
- The registry centralizes `inferWorkoutTypeFromText()` — single source of truth for what types exist and how to detect them from free text
- A `normalizeWorkoutType(rawString)` helper maps legacy type strings (e.g., "intensity" -> INTERVALS, "easy" -> EASY) to canonical registry keys
- Registry lives in `src/domain/workoutTypes.js` (separate from compute.js, as specified in success criteria)

### Color token strategy
- Colors defined in BOTH CSS tokens (pa-tokens.css) and JS registry (workoutTypes.js references token name strings)
- Types grouped into effort-level color categories:
  - Hard effort (navy): Tempo, Intervals, Steady State
  - Easy effort (blue): Easy, Recovery
  - Endurance (amber): Long Run
  - Special: Race/Event (gold), Rest (neutral/gray), Strength/Cross-Train (a distinct 4th color — Claude's discretion, e.g., teal)
- Each color group gets an accent + container pair: `--pa-type-X` (accent) and `--pa-type-X-container` (light background fill) — matches Precision Athlete tonal surface pattern
- Registry includes an icon/emoji field per type for compact grid card rendering in Phase 14

### Load stats calculation
- `computeWeeklyLoadStats(entries, targetKm)` — takes a single week's entries array + the week's target km
- "Zone distribution" = percentage of time per workout type effort group (hard/easy/endurance), NOT HR zones
- Returns `{ zoneDistribution: { hard: %, easy: %, endurance: %, other: % }, totalHours, totalKm, status }`
- Entries with missing `duration_min` but valid `distance_km`: estimate duration from distance using default paces (e.g., 6 min/km for easy, 5 min/km for tempo)
- Load status is over-only: green (on-target) if totalKm <= targetKm (or within ~5% over); red only when significantly over target. Under-target is NOT flagged — athletes reduce volume intentionally
- Function lives in compute.js alongside existing weekly computation functions

### Volume trend logic
- `computeVolumeTrend(activities, weeklyEntries, numWeeks)` — parameterized week count (caller passes 4 for the header, reusable for other ranges)
- Returns array of week objects: `[{ weekStart, plannedKm, historicalKm }]`
- Unit conversion: Strava activities store `distance` in metres -> divide by 1000 for km; weekly plan entries store `distance_km` natively
- Weeks with no planned entries: plannedKm = 0 (zero-height bar in chart, not null)
- Function lives in compute.js

### Claude's Discretion
- Exact hex values for workout type color tokens (within the navy/blue/amber/gold/teal grouping)
- Default pace estimates for duration inference (e.g., 6 min/km easy, 5 min/km tempo)
- Exact threshold for "significantly over target" in load status (e.g., 5% or 10%)
- Icon/emoji choices per workout type
- Internal helper function decomposition within compute.js
- Test structure and fixture data in compute.test.js

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Design system
- `DESIGN.md` — Full Precision Athlete design system: color palette, typography, surface hierarchy, tonal layering rules
- `src/styles/pa-tokens.css` — Existing Precision Athlete CSS tokens (Phase 12 output) — workout type color tokens extend this file
- `docs/stitch_weekly_planner/screen.png` — Visual reference for the target planner design

### Domain logic
- `src/domain/compute.js` — Existing pure functions (computeWeeklySummary, computeWeeklyHRZones, computeWeeklyProgress, computeTrainingLoad, Koop plan generation). New functions extend this file.
- `src/hooks/useWorkoutEntries.js` — Contains current `inferWorkoutTypeFromText()` at line 83 — this logic moves to the registry module

### Requirements
- `.planning/REQUIREMENTS.md` — ANLY-01 (zone distribution bar), ANLY-02 (total hours), ANLY-03 (load status indicator) define the success criteria for this phase

### Prior phase context
- `.planning/phases/12-design-token-foundation/12-CONTEXT.md` — Token namespace strategy (--pa-*), deferred workout-type colors to this phase

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `compute.js:computeWeeklySummary()`: Aggregates activities by week (distance, elevation, time, count) — volume trend can reuse this pattern
- `compute.js:getWeekStart()`: UTC-safe week start calculation — reuse for week bucketing in volume trend
- `useWorkoutEntries.js:inferWorkoutTypeFromText()`: 8-type text inference logic — to be moved and extended in workoutTypes.js
- `pa-tokens.css`: Precision Athlete token file with --pa-* namespace — workout type color tokens extend this

### Established Patterns
- All domain functions in compute.js use UTC date methods (getUTCDay, setUTCDate, setUTCHours) — new functions must follow
- compute.js uses `"use strict"` and CommonJS-style `export { ... }` at bottom of file
- Tests in `tests/compute.test.js` use Vitest — new functions get tests here

### Integration Points
- `src/styles/pa-tokens.css`: New workout type color tokens added here (--pa-type-* accent + container pairs)
- `src/styles/index.css`: Already imports pa-tokens.css — no change needed
- `src/domain/workoutTypes.js`: New file — consumed by Phase 14 grid components and compute.js load functions
- `tests/compute.test.js`: New unit tests for computeWeeklyLoadStats and computeVolumeTrend

</code_context>

<specifics>
## Specific Ideas

- The effort-level grouping (hard/easy/endurance) should align with the Precision Athlete color language: navy for intensity work, lighter blue for easy/recovery, warm amber for endurance — creating visual coherence between the load column bars and the workout cards in the grid
- Race/Event type uses gold to match the "gold trophy card" spec from Phase 14's success criteria
- The normalizer function is critical for bridging the gap between compute.js's legacy "intensity"/"recovery"/"easy" strings and the new canonical registry — prevents a migration Big Bang

</specifics>

<deferred>
## Deferred Ideas

- Drag-and-drop workout reordering — explicitly out of scope per REQUIREMENTS.md
- HR-zone-based load calculation (using actual Strava HR data instead of type-based estimation) — future enhancement when real-time execution data is available
- Dark mode color variants for workout types — excluded per REQUIREMENTS.md (light-only brand decision)

</deferred>

---

*Phase: 13-domain-logic-workout-type-registry*
*Context gathered: 2026-03-24*
