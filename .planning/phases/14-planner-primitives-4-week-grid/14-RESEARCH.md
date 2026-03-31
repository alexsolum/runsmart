# Phase 14: Planner Primitives + 4-Week Grid - Research

**Researched:** 2026-03-24
**Domain:** React calendar grid UI with Precision Athlete design system
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Grid density and day card detail**
- Desktop day cells use balanced cards: enough information to be useful without becoming dense or editorially heavy.
- If a day has multiple workouts, stack all workout cards in the same day cell rather than collapsing them behind a count.
- Workout type is the primary emphasis inside a card; metrics support the training intent rather than leading it.
- Each workout card shows one short description line, clipped after that line.
- Empty day cells include a subtle in-cell add affordance.
- Day columns should use moderate tonal separation, not hard boxed borders.
- Today gets a subtle highlight.
- Weekends do not receive special styling distinct from weekdays.

**Load column presentation**
- Medium width relative to a day column.
- Presents both kilometers and hours/minutes.
- Kilometers are the primary planning metric and must lead visually.
- Hours/minutes are secondary supporting context.
- Stacked load bar remains present, but smaller and subordinate to the kilometer readout.
- Status is color-only with no text label.
- No explicit target/reference numbers shown.
- Stacked bar should be compact.
- Load column should feel slightly distinct from the day cells, but still read as attached to the grid.
- Stacked bar reuses exact workout-type color families from Phase 13.
- Empty weeks show an explicit zero state.

**Constraint and special-day rendering**
- Constraint days remain mostly normal day cells, with a clear constraint marker inside the cell rather than turning the whole cell into a constraint state.
- If a day has both a workout and a constraint, the workout remains visually primary and the constraint is supporting context.
- Race/event days receive a more prominent hero treatment than normal workout cards.
- Rest days use a quiet labeled card.

**Mobile behavior**
- Mobile does not keep the full 4-week board visible; it shows one week at a time.
- Mobile week switching should feel like a swipe/pager interaction.
- Mobile keeps a reduced weekly load summary instead of the full desktop load column.
- Mobile uses a day-first drill-in pattern: the week strip selects a day, and the selected day's full workout list is shown below.

### Claude's Discretion
- Exact component decomposition and naming for grid primitives, day cells, and load column widgets.
- Exact visual treatment of the subtle today highlight and moderate column separation.
- Exact iconography for constraint markers and race/rest states.
- Exact micro-layout of kilometers, hours/minutes, and compact stacked bar within the load column.
- Exact animation and implementation mechanics of the mobile swipe/pager feel.

### Deferred Ideas (OUT OF SCOPE)
- Full tap-to-edit modal workflow, create/edit/delete behavior, and completion actions (Phase 15).
- Volume trend header UI (Phase 16).
- App shell redesign — sidebar, topbar, mobile nav shell (Phase 16).
- Drag-and-drop, dark mode, and navigation beyond the 4-week planner window.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| GRID-01 | User sees a 4-week calendar grid with 7 day columns and a load column — 28 day cells plus 4 load cells visible in one viewport | CSS Grid `grid-cols-12` layout (col-span-11 for days + col-span-1 for load); four `WeekRow` components stacked vertically; `loadEntriesForRange` spans 28 days in one query |
| GRID-02 | User sees date labels (e.g., "12. OKT") on each day cell matching the actual calendar date | `isoDateOffset` + `Date.toLocaleDateString` with `{ day:"numeric", month:"short" }` pattern already established in WeeklyPlanPage; locale-agnostic short-month via `toLocaleDateString` |
| GRID-03 | User sees color-coded workout type cards (intensity=navy, recovery=blue, long run=amber) | `workoutTypes.js` provides `colorToken` + `colorContainerToken` per type; `pa-tokens.css` has `--pa-type-hard` (#003371), `--pa-type-easy` (#3b82f6), `--pa-type-endurance` (#f59e0b) |
| GRID-04 | User sees constraint days as dashed-border cells with reason icon (travel, social, etc.) | `weekly_plan_day_states` table exists; CSS `border-dashed` + Material Symbols icon inside cell; `is_protected` flag used as constraint signal |
| GRID-05 | User sees event/race day as a distinct gold trophy card | `WORKOUT_TYPES.RACE_EVENT` with `--pa-type-race` (#d4af37) + full-width hero treatment based on Stitch reference code |
| GRID-06 | User sees rest days displayed as labeled recovery cards | `WORKOUT_TYPES.REST` with `--pa-type-rest` (#94a3b8) + `--pa-type-rest-container` (#f1f5f9); quiet labeled card distinct from empty cells |
</phase_requirements>

---

## Summary

Phase 14 builds the 4-week planner grid as the headline visible feature of v1.3. The domain foundation is fully complete from Phases 12 and 13: Precision Athlete CSS tokens live in `src/styles/pa-tokens.css`, workout type metadata and color tokens live in `src/domain/workoutTypes.js`, and weekly load computation lives in `src/domain/compute.js`. Phase 14 is entirely a UI construction task with no new domain logic or backend work.

The canonical visual reference is `docs/stitch_weekly_planner/screen.png` (verified) and `docs/stitch_weekly_planner/code.html` (Tailwind HTML prototype). The Stitch prototype uses a 12-column CSS grid — 11 columns split into 7 equal day columns, 1 column for the load bar — with each week row rendered as a standalone grid. This translates directly to React component hierarchy without architectural risk.

The primary integration surface is `src/pages/WeeklyPlanPage.jsx`, which already contains the date-helpers, 4-week range loading, and current week display. Phase 14 refactors this page into new planner primitive components. The mobile integration surface is `src/pages/MobilePage.jsx`, which already has a day-drill-in structure aligned with the mobile decisions.

**Primary recommendation:** Decompose the existing `WeeklyPlanPage.jsx` monolith into focused primitives (`FourWeekGrid`, `WeekRow`, `DayCell`, `WorkoutCard`, `ConstraintMarker`, `RaceCard`, `RestCard`, `LoadColumn`), wire them to `useWorkoutEntries.loadEntriesForRange`, consume `computeWeeklyLoadStats` for the load column, and apply `--pa-*` tokens throughout. Build mobile pager behavior on `MobilePage.jsx` without duplicating the data layer.

---

## Standard Stack

### Core (all already installed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React 18 | 18.x | Component tree, hooks | Project standard |
| Tailwind CSS | 3.x | Utility classes for layout and spacing | Project standard (Stitch prototype uses it) |
| shadcn/ui | current | `Card`, `Button`, `Dialog` primitives | Project standard; already imported in WeeklyPlanPage |

### Project-Internal (already built, Phase 14 consumes)

| Module | Location | Purpose |
|--------|----------|---------|
| `WORKOUT_TYPES` registry | `src/domain/workoutTypes.js` | Color tokens, labels, icons, groups per type |
| `normalizeWorkoutType()` | `src/domain/workoutTypes.js` | Maps legacy strings to canonical keys |
| `computeWeeklyLoadStats()` | `src/domain/compute.js` | Returns `{ totalKm, totalHours, zoneDistribution, status }` per week |
| `--pa-*` design tokens | `src/styles/pa-tokens.css` | All colors, type scales, spacing, shadows, radii |
| `useWorkoutEntries` | `src/hooks/useWorkoutEntries.js` | `loadEntriesForRange(planId, startIso, endIso)` |

### No New Dependencies Required

This phase requires zero new npm packages. All primitives, tokens, and helpers are in place. Adding a dependency for a calendar grid (e.g., `react-big-calendar`, `@fullcalendar/react`) would introduce unnecessary complexity — the layout is a simple CSS grid, not a calendar library concern.

---

## Architecture Patterns

### Recommended Component Structure

```
src/components/planner/
├── FourWeekGrid.jsx       # Root: loads 28-day range, maps 4 WeekRows
├── WeekRow.jsx            # One week: grid-cols-12, 7 DayCells + LoadColumn
├── DayCell.jsx            # One day: date label + stacked WorkoutCards + add affordance
├── WorkoutCard.jsx        # Colored workout card (type-driven styling)
├── RaceCard.jsx           # Hero treatment for RACE_EVENT type
├── RestCard.jsx           # Quiet labeled card for REST type
├── ConstraintMarker.jsx   # Inline constraint icon + label within a DayCell
├── LoadColumn.jsx         # km readout + compact stacked bar + status dot
└── MobilePlannerPager.jsx # Mobile: week pager + day-drill-in panel
```

Pages remain thin orchestrators — `WeeklyPlanPage.jsx` imports `FourWeekGrid`; `MobilePage.jsx` imports `MobilePlannerPager`.

### Pattern 1: CSS Grid Layout (12-column)

**What:** Each week row is `grid grid-cols-12 gap-4`. The 7 day columns occupy `col-span-11` (via an inner `grid grid-cols-7 gap-4`). The load column occupies `col-span-1`.

**When to use:** All desktop week rows.

**Source:** Verified in `docs/stitch_weekly_planner/code.html` lines 205-270.

```jsx
// WeekRow.jsx
function WeekRow({ weekStart, entries, targetKm }) {
  const days = Array.from({ length: 7 }, (_, i) => isoDateOffset(weekStart, i));
  const stats = computeWeeklyLoadStats(entries, targetKm);

  return (
    <div className="grid grid-cols-12 gap-4">
      <div className="col-span-11 grid grid-cols-7 gap-4">
        {days.map((iso) => (
          <DayCell
            key={iso}
            isoDate={iso}
            entries={entries.filter((e) => e.workout_date === iso)}
          />
        ))}
      </div>
      <LoadColumn stats={stats} />
    </div>
  );
}
```

### Pattern 2: WorkoutCard Token-Driven Styling

**What:** Card background and text color come from `--pa-type-X-container` (background) and `--pa-type-X` (accent/text), resolved via `WORKOUT_TYPES[typeKey].colorContainerToken`.

**When to use:** All workout cards except REST and RACE_EVENT (those have their own components).

```jsx
// WorkoutCard.jsx
function WorkoutCard({ entry }) {
  const typeKey = normalizeWorkoutType(entry.workout_type);
  const meta = WORKOUT_TYPES[typeKey] ?? WORKOUT_TYPES.EASY;

  return (
    <div
      style={{
        background: `var(${meta.colorContainerToken})`,
        borderLeft: `3px solid var(${meta.colorToken})`,
      }}
      className="rounded-lg px-2 py-1.5 text-xs font-bold leading-tight"
    >
      <div className="truncate">{meta.label}</div>
      {entry.description && (
        <div
          className="mt-0.5 text-[10px] opacity-70 truncate"
          style={{ color: `var(${meta.colorToken})` }}
        >
          {entry.description}
        </div>
      )}
    </div>
  );
}
```

Note: The Stitch prototype uses `bg-primary text-on-primary` for hard workouts (full navy fill). The token-driven approach is equivalent — `--pa-type-hard` is `#003371` (navy) and `--pa-type-hard-container` is `#e0e9f5`. The CONTEXT.md decision "workout type is primary emphasis" aligns with using the container bg + accent border; full-fill is also acceptable for hard workouts to match the Stitch reference. Claude's discretion applies here.

### Pattern 3: Constraint Day Rendering

**What:** A constraint day is a normal `DayCell` with a `ConstraintMarker` component displayed inside it. If a workout also exists, the workout card renders first and the constraint marker appears below it as supporting context.

**Source:** CONTEXT.md decision: "constraint marker inside the cell rather than turning the whole cell into a constraint state." Stitch prototype shows dashed border + icon as a standalone cell (no workout). When both coexist, workout leads.

```jsx
// DayCell.jsx — constraint + workout coexistence
function DayCell({ isoDate, entries, constraint }) {
  const isToday = isoDate === todayIso();
  return (
    <div
      className={[
        "rounded-xl p-3 min-h-[140px] relative",
        isToday ? "ring-2 ring-pa-primary/20 bg-white" : "bg-white",
      ].join(" ")}
      style={{ boxShadow: "var(--pa-shadow-card)" }}
    >
      <div className="text-[10px] font-bold text-outline mb-2">
        {formatDayLabel(isoDate)}
      </div>
      {entries.map((entry) => <WorkoutCard key={entry.id} entry={entry} />)}
      {constraint && <ConstraintMarker reason={constraint.reason} />}
      {entries.length === 0 && !constraint && <AddAffordance isoDate={isoDate} />}
    </div>
  );
}
```

### Pattern 4: LoadColumn with computeWeeklyLoadStats

**What:** Calls `computeWeeklyLoadStats(weekEntries, targetKm)` which returns `{ totalKm, totalHours, zoneDistribution: { hard, easy, endurance, other }, status }`. The stacked bar proportions are driven by `zoneDistribution` percentages. Status dot is green (on-target) or amber/red (over-target).

**Source:** Verified in `src/domain/compute.js` lines 34-74.

```jsx
// LoadColumn.jsx
function LoadColumn({ stats }) {
  const { totalKm, totalHours, zoneDistribution, status } = stats;
  const isEmpty = totalKm === 0 && totalHours === 0;

  const hours = Math.floor(totalHours);
  const mins = Math.round((totalHours - hours) * 60);
  const timeLabel = hours > 0
    ? `${hours}h${mins > 0 ? ` ${mins}m` : ""}`
    : `${mins}m`;

  return (
    <div
      className="col-span-1 rounded-xl p-3 flex flex-col items-center justify-between"
      style={{
        background: "var(--pa-surface-container-low)",
        boxShadow: "var(--pa-shadow-card)",
      }}
    >
      {isEmpty ? (
        <div className="flex-1 flex items-center justify-center text-[10px] text-outline">—</div>
      ) : (
        <StackedBar distribution={zoneDistribution} />
      )}
      <div className="mt-2 flex flex-col items-center gap-0.5">
        <span className="text-sm font-bold" style={{ color: "var(--pa-on-surface)" }}>
          {totalKm.toFixed(0)} km
        </span>
        <span className="text-[10px]" style={{ color: "var(--pa-on-surface-variant)" }}>
          {timeLabel}
        </span>
        <StatusDot status={status} />
      </div>
    </div>
  );
}
```

### Pattern 5: Date Label Format

**What:** "12. OKT" format from Stitch reference. Use `Date.toLocaleDateString` with `{ day:"numeric", month:"short" }` and uppercase the month.

**Source:** Verified in `docs/stitch_weekly_planner/code.html` lines 209, 217, etc.

```js
function formatDayLabel(isoDate) {
  const date = new Date(`${isoDate}T00:00:00Z`);
  const raw = date.toLocaleDateString("nb-NO", { day: "numeric", month: "short" });
  // Returns "12. okt." → normalize to "12. OKT"
  return raw.replace(/\.$/, "").toUpperCase().replace(".", ".").trim();
}
```

Note: The app's user base appears Norwegian (CONTEXT, Stitch labels in Norwegian). Using locale `"nb-NO"` for day labels is appropriate. A locale-agnostic alternative uses `{ month: "short" }` in the browser's locale — both approaches are acceptable since this is a display-only label.

### Pattern 6: FourWeekGrid Data Loading

**What:** Load all 28 days in one `loadEntriesForRange` call. Split into per-week buckets client-side.

**When to use:** FourWeekGrid mount and on planId change.

```jsx
// FourWeekGrid.jsx
function FourWeekGrid({ planId, startMonday }) {
  const { loadEntriesForRange, entries } = useWorkoutEntries(userId);

  useEffect(() => {
    const endIso = isoDateOffset(startMonday, 27); // 4 weeks = 28 days
    loadEntriesForRange(planId, startMonday, endIso);
  }, [planId, startMonday]);

  const weeks = Array.from({ length: 4 }, (_, i) => {
    const ws = isoDateOffset(startMonday, i * 7);
    const we = isoDateOffset(ws, 6);
    return {
      weekStart: ws,
      entries: entries.filter(
        (e) => e.workout_date >= ws && e.workout_date <= we
      ),
    };
  });

  return (
    <div className="space-y-4">
      {weeks.map(({ weekStart, entries: weekEntries }) => (
        <WeekRow key={weekStart} weekStart={weekStart} entries={weekEntries} />
      ))}
    </div>
  );
}
```

### Pattern 7: Mobile Pager

**What:** Single-week view with swipe-feel navigation. Week navigation updates a `currentWeekStart` state. Touch events (`onTouchStart`/`onTouchEnd`) or a CSS scroll-snap approach handle the swipe feel. Selected day opens a drill-in panel below the week strip.

**Source:** CONTEXT.md mobile decisions. Existing `MobilePage.jsx` already has day-drill-in card structure.

```jsx
// MobilePlannerPager.jsx
function MobilePlannerPager({ planId, userId }) {
  const [weekStart, setWeekStart] = useState(currentMondayIso());
  const [selectedDay, setSelectedDay] = useState(todayIso());

  const goNext = () => setWeekStart((w) => isoDateOffset(w, 7));
  const goPrev = () => setWeekStart((w) => isoDateOffset(w, -7));

  // Touch swipe detection
  const touchStartX = useRef(null);
  const onTouchStart = (e) => { touchStartX.current = e.touches[0].clientX; };
  const onTouchEnd = (e) => {
    if (touchStartX.current === null) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(delta) > 50) delta < 0 ? goNext() : goPrev();
    touchStartX.current = null;
  };

  return (
    <div onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <MobileWeekStrip
        weekStart={weekStart}
        selectedDay={selectedDay}
        onSelectDay={setSelectedDay}
        onPrev={goPrev}
        onNext={goNext}
      />
      <MobileDayPanel isoDate={selectedDay} planId={planId} userId={userId} />
    </div>
  );
}
```

### Anti-Patterns to Avoid

- **Inline color values in JSX:** Never write `style={{ background: "#003371" }}` for workout colors. Always use CSS custom properties via `var(--pa-type-*)`.
- **Duplicating date helpers:** `currentMondayIso()` and `isoDateOffset()` exist in both `WeeklyPlanPage.jsx` and `MobilePage.jsx`. Phase 14 should move them to a shared `src/lib/dateUtils.js` module rather than copy them into new planner components.
- **Per-week data fetches:** Do not call `loadEntriesForWeek` four times. Use `loadEntriesForRange` once for the full 28-day window.
- **Re-running computeWeeklyLoadStats in render:** Memoize with `useMemo` keyed on the week's entries array.
- **Using 1px solid borders:** The No-Line Rule from DESIGN.md prohibits `border: 1px solid`. Use tonal surface backgrounds and `box-shadow` only.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Workout type → color mapping | Custom inline color map in planner | `WORKOUT_TYPES[typeKey].colorContainerToken` from `workoutTypes.js` | Single source of truth; already tested |
| Weekly load computation | Summing km/hours in component | `computeWeeklyLoadStats(entries, targetKm)` from `compute.js` | Pure function; handles pace inference; already unit tested |
| Date arithmetic | Custom date math | `isoDateOffset(isoDate, days)` helper (move to shared lib) | UTC-safe; established pattern |
| Week bucketing | Custom filter logic | Filter entries by `workout_date >= ws && workout_date <= we` | Simple, no library needed |
| Calendar grid layout | CSS Grid library / calendar library | Tailwind `grid-cols-12` | The grid is 7×4 cells — no calendar library is justified |

**Key insight:** Phase 13 was explicitly designed to supply Phase 14 with ready-made computation and metadata. Using anything other than those outputs would defeat the purpose of Phase 13's architecture.

---

## Common Pitfalls

### Pitfall 1: Off-by-One in 4-Week Range

**What goes wrong:** The range end is calculated as `isoDateOffset(startMonday, 28)` (exclusive) instead of `isoDateOffset(startMonday, 27)` (inclusive Sunday of week 4). Supabase `.lte()` is inclusive, so the query must use the last day of week 4 (day offset 27).

**Why it happens:** Easy to confuse "28 days from Monday" (= next Monday) with "last day of week 4" (= Sunday, offset 27).

**How to avoid:** Always compute `endIso = isoDateOffset(startMonday, 27)` for the 4-week range. Write a unit test verifying that the range includes exactly 28 days.

**Warning signs:** Week 4 load column shows zero despite entries existing in that week.

### Pitfall 2: Token Variable Name Typos

**What goes wrong:** Referencing `var(--pa-type-endurance-color)` instead of `var(--pa-type-endurance)`. CSS silently falls back to no color.

**Why it happens:** Token names are verbose; typos are invisible at runtime until visual inspection.

**How to avoid:** Always derive the CSS variable name from `WORKOUT_TYPES[key].colorToken` rather than typing it manually. Test by rendering one card of each type and inspecting color.

**Warning signs:** Card background is transparent or white despite correct type key.

### Pitfall 3: `useWorkoutEntries` Re-dispatch Bug

**What goes wrong:** Calling `loadEntriesForRange` inside a `useEffect` without a stable dependency array causes infinite re-renders because `loadEntriesForRange` returns a new reference each render.

**Why it happens:** `useCallback` in `useWorkoutEntries` depends on `[client]` which is stable, but if the parent component provides a new `planId` or `startMonday` reference each render the effect fires repeatedly.

**How to avoid:** Ensure `FourWeekGrid` receives stable `planId` and `startMonday` string values. Strings are compared by value in React's dependency array, so stable ISO strings (e.g., `"2026-03-23"`) will not cause re-fires.

**Warning signs:** Network tab shows repeated identical Supabase queries after initial load.

### Pitfall 4: Mobile Swipe Conflicting with Page Scroll

**What goes wrong:** The `onTouchEnd` swipe handler fires on vertical scroll gestures, unexpectedly advancing the week.

**Why it happens:** Touch delta is calculated on the X axis but the threshold check doesn't exclude gestures that are primarily vertical.

**How to avoid:** Calculate both `deltaX` and `deltaY`. Only trigger week navigation if `Math.abs(deltaX) > Math.abs(deltaY)` AND `Math.abs(deltaX) > 50`. This respects vertical scroll intent.

**Warning signs:** Week jumps unexpectedly when user scrolls down the page on mobile.

### Pitfall 5: Constraint Data Source

**What goes wrong:** Assuming constraint days come from a separate "constraints" table. In the current schema, `weekly_plan_day_states` is the only available signal — `is_protected: true` marks days with manual edits, but doesn't have a `reason` field (CNST-01 is a Future Requirement, not in scope).

**Why it happens:** The CONTEXT.md references "reason icon (travel, social, etc.)" but REQUIREMENTS.md notes `CNST-01` (custom reason text) requires a DB schema addition and is deferred.

**How to avoid:** For Phase 14, constraint day display should be driven by the `workout_type === "CONSTRAINT"` value in `weekly_plan_entries`, or by a UI convention that marks a day cell with a constraint icon when a specific entry type exists. Alternatively, show constraint cells only when the day has no workout entry AND a `weekly_plan_day_states` row exists. Confirm the exact data source during planning — no schema changes are allowed per REQUIREMENTS.md Out of Scope.

**Warning signs:** Implementing constraint rendering that requires a DB column that doesn't exist.

---

## Code Examples

### Date Label Formatting (matches Stitch reference)

```js
// Source: docs/stitch_weekly_planner/code.html lines 209, 217 ("12. OKT", "13. OKT")
function formatDayLabel(isoDate) {
  const date = new Date(`${isoDate}T00:00:00Z`);
  const day = date.getUTCDate();
  const month = date.toLocaleDateString("nb-NO", { month: "short" })
    .replace(".", "")
    .toUpperCase();
  return `${day}. ${month}`;
}
// Returns "12. OKT", "01. NOV"
```

### computeWeeklyLoadStats call signature

```js
// Source: src/domain/compute.js line 34
// computeWeeklyLoadStats(entries, targetKm)
// entries: array of workout_entry objects { workout_type, distance_km, duration_min }
// targetKm: number | null (null = no target, status defaults to "on-target")
// Returns: { zoneDistribution: { hard: %, easy: %, endurance: %, other: % }, totalHours: number, totalKm: number, status: "on-target" | "over-target" }

const stats = computeWeeklyLoadStats(weekEntries, weekTargetKm);
```

### WORKOUT_TYPES token access

```js
// Source: src/domain/workoutTypes.js lines 1-72
import { WORKOUT_TYPES, normalizeWorkoutType } from "../domain/workoutTypes";

const typeKey = normalizeWorkoutType(entry.workout_type); // "LONG_RUN"
const meta = WORKOUT_TYPES[typeKey];                      // { label, colorToken, colorContainerToken, icon, group }
// meta.colorToken           → "--pa-type-endurance"
// meta.colorContainerToken  → "--pa-type-endurance-container"
// CSS: style={{ background: `var(${meta.colorContainerToken})` }}
```

### Stacked Bar proportions (load column)

```jsx
// Proportional height bars from zoneDistribution percentages
// Source: docs/stitch_weekly_planner/code.html lines 259-269
function StackedBar({ distribution }) {
  // distribution = { hard: 60, easy: 30, endurance: 10, other: 0 }
  return (
    <div className="flex flex-col gap-0.5 items-center w-3 flex-1">
      {distribution.hard > 0 && (
        <div style={{ height: `${distribution.hard}%`, background: "var(--pa-type-hard)" }} className="w-full rounded-t-full" />
      )}
      {distribution.easy > 0 && (
        <div style={{ height: `${distribution.easy}%`, background: "var(--pa-type-easy)" }} className="w-full" />
      )}
      {distribution.endurance > 0 && (
        <div style={{ height: `${distribution.endurance}%`, background: "var(--pa-type-endurance)" }} className="w-full" />
      )}
      {distribution.other > 0 && (
        <div style={{ height: `${distribution.other}%`, background: "var(--pa-type-other)" }} className="w-full rounded-b-full" />
      )}
    </div>
  );
}
```

### Race card hero treatment (GRID-05)

```jsx
// Source: docs/stitch_weekly_planner/screen.png — "EVENT DAY" cell is full-height amber with trophy icon
// CONTEXT.md: "Race/event days should receive a more prominent hero treatment"
function RaceCard({ entry }) {
  return (
    <div
      className="rounded-lg px-2 py-3 text-xs font-bold text-center flex flex-col items-center gap-1"
      style={{ background: "var(--pa-type-race)", color: "#fff" }}
    >
      <span role="img" aria-label="Race">🏆</span>
      <div className="truncate">{entry.description || "Race / Event"}</div>
    </div>
  );
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Per-week single fetch in WeeklyPlanPage | Single `loadEntriesForRange` over 28 days | Phase 14 | 4 network calls → 1 |
| Inline color strings in CSS classes | `--pa-type-*` CSS custom properties from pa-tokens.css | Phase 12-13 | Type-safe, token-driven rendering |
| Local `inferWorkoutTypeFromText` in useWorkoutEntries | Centralized in `workoutTypes.js` with `normalizeWorkoutType` | Phase 13 | Single source of truth |
| 1-week grid view | 4-week grid (this phase) | Phase 14 | Entire v1.3 headline feature |

**Deprecated/outdated:**
- Local `WORKOUT_TYPES` array in `WeeklyPlanPage.jsx` (line 13): `["Easy", "Tempo", "Intervals", ...]` — this is superseded by `WORKOUT_TYPES` from `workoutTypes.js`. Phase 14 must stop using the local array for rendering decisions.
- Local `WORKOUT_TYPES` array in `MobilePage.jsx` (line 11): same issue — Phase 14 mobile work must also migrate to the canonical registry.

---

## Open Questions

1. **Constraint day data source**
   - What we know: `weekly_plan_day_states` tracks `is_protected` but has no `reason` or constraint-type field. CNST-01 (custom reason text) is a Future Requirement. GRID-04 requires "reason icon (travel, social, etc.)".
   - What's unclear: How constraint days (travel, social) are currently stored. Is there a `workout_type = "CONSTRAINT"` value in `workout_entries` or is it only in `weekly_plan_day_states`?
   - Recommendation: During planning, decide whether GRID-04 constraint cells are driven by (a) a specific `workout_type` value in entries (e.g., add `CONSTRAINT` to the registry), or (b) a separate UI-level convention. Option (a) requires no schema change and is consistent with existing data model. Implement with a generic icon if reason granularity is not available.

2. **`startMonday` source in FourWeekGrid**
   - What we know: `WeeklyPlanPage` already computes `currentMondayIso()` and manages visible weeks. The 4-week grid must start from the current week's Monday.
   - What's unclear: Whether the planner grid should always start from today's week or allow navigation (which is deferred to future NAV-01/02).
   - Recommendation: For Phase 14, hardcode grid start to `currentMondayIso()`. Navigation is explicitly out of scope.

3. **`targetKm` per week for load status**
   - What we know: `computeWeeklyLoadStats` accepts `targetKm` for the status calculation. Training blocks have `target_km`.
   - What's unclear: Whether `WeeklyPlanPage` currently loads training blocks (it calls `getWeekIntent(blocks, planId, weekStartIso)` which reads from `trainingBlocks`).
   - Recommendation: `FourWeekGrid` should receive training blocks (already in `AppDataContext` via `useTrainingBlocks`) and resolve `targetKm` per week via the existing `getWeekIntent` pattern. Pass `null` if no block matches — load status defaults to "on-target".

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest + React Testing Library |
| Config file | `vitest.config.js` |
| Quick run command | `npx vitest run --project unit` |
| Full suite command | `npx vitest run` |

Unit tests (`.test.js`) run in Node environment. Component tests (`.test.jsx`) run in jsdom. Both live under `tests/unit/`.

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| GRID-01 | 4-week grid renders 4 WeekRow components, 28 day cells total | component | `npx vitest run --project components -t "FourWeekGrid"` | ❌ Wave 0 |
| GRID-02 | Day cells display correct date labels in "D. MON" format | component | `npx vitest run --project components -t "DayCell date label"` | ❌ Wave 0 |
| GRID-03 | WorkoutCard applies correct color token class per workout type | component | `npx vitest run --project components -t "WorkoutCard color"` | ❌ Wave 0 |
| GRID-04 | Constraint day cells render dashed border and icon | component | `npx vitest run --project components -t "ConstraintMarker"` | ❌ Wave 0 |
| GRID-05 | RACE_EVENT renders RaceCard with trophy icon | component | `npx vitest run --project components -t "RaceCard"` | ❌ Wave 0 |
| GRID-06 | REST type renders RestCard with label | component | `npx vitest run --project components -t "RestCard"` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `npx vitest run --project unit`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `tests/unit/planner.test.jsx` — covers GRID-01 through GRID-06; mock `useAppData` via `vi.mock`
- [ ] Update `tests/unit/mockAppData.js` — add planner-relevant workout entries with `workout_type` values for each type (REST, RACE_EVENT, LONG_RUN, INTERVALS, EASY)

---

## Sources

### Primary (HIGH confidence)

- `src/domain/workoutTypes.js` — verified full WORKOUT_TYPES registry, colorToken names, normalizeWorkoutType behavior
- `src/styles/pa-tokens.css` — verified all `--pa-type-*` token values, surface hierarchy tokens, shadow tokens
- `src/domain/compute.js` — verified `computeWeeklyLoadStats` signature and return shape
- `src/hooks/useWorkoutEntries.js` — verified `loadEntriesForRange` API
- `docs/stitch_weekly_planner/screen.png` — visual reference (image read directly)
- `docs/stitch_weekly_planner/code.html` — Stitch HTML/Tailwind prototype; verified grid-cols-12 layout, day cell structure, load column structure, constraint day dashed border, race card styling
- `src/pages/WeeklyPlanPage.jsx` — verified existing date helpers, 4-week loading pattern, AI card structure
- `src/pages/MobilePage.jsx` — verified existing day-drill-in structure and MobileWorkoutCard pattern

### Secondary (MEDIUM confidence)

- `DESIGN.md` — No-Line Rule, surface hierarchy, tonal layering, typography guidance
- `.planning/phases/13-domain-logic-workout-type-registry/13-CONTEXT.md` — confirmed Phase 13 output scope and what's available
- `vitest.config.js` — confirmed test project split (unit=node, components=jsdom)

### Tertiary (LOW confidence)

- None. All findings verified against project source files.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all dependencies are project-internal, verified in source
- Architecture: HIGH — Stitch prototype provides exact HTML structure; direct translation to JSX
- Pitfalls: HIGH — derived from reading actual source code and schema constraints
- Constraint day data source: LOW — open question; actual DB state not verified

**Research date:** 2026-03-24
**Valid until:** 2026-04-24 (stable domain — no external dependencies changing)
