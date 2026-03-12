---
phase: quick-8
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/pages/HeroPage.jsx
  - src/components/dashboard/ActivitiesTable.jsx
autonomous: true
requirements: []
must_haves:
  truths:
    - "Avg. Pace KPI shows a real pace value (e.g. 5:12 /km) for weeks/months with run activities"
    - "Alle løp tab appears in the dashboard tab strip and is clickable"
    - "Alle løp tab shows a paginated table of all activities (not just current period), 10 rows per page"
    - "Each table row shows: name + date, distance, duration, pace, heart rate, and a zone bar"
    - "Zone bar renders colored segments (Z1=slate, Z2=blue, Z3=green, Z4=amber, Z5=red) proportional to HR zone seconds"
    - "When no HR zone data exists, zone bar falls back to a single-color bar keyed on suffer_score"
    - "Pagination prev/next buttons and page indicator work correctly"
---

<objective>
Fix the avg pace KPI that always shows "—" on the dashboard, and add a new "Alle løp" tab with a full paginated activity table including effort visualization.

Purpose: The avg pace KPI is broken because the dashboard reads `average_speed` but the strava-sync edge function never stores that field — it stores `average_pace` (seconds/km) and `moving_time`/`distance`. The "Alle løp" tab gives users a complete, scrollable list of all activities with zone-based effort visualization.

Output:
- Fixed avg pace KPI in HeroPage.jsx
- New "Alle løp" tab with paginated activities in HeroPage.jsx
- Updated ActivitiesTable.jsx with HR zone bar + pace + heart rate columns and pagination
</objective>

<execution_context>
@C:/Users/HP/.claude/get-shit-done/workflows/execute-plan.md
@C:/Users/HP/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@src/pages/HeroPage.jsx
@src/components/dashboard/ActivitiesTable.jsx
@src/domain/compute.js

<interfaces>
<!-- Key facts about the data shape the executor needs. -->

From strava-sync/index.ts — fields stored in `activities` table (confirmed):
  - distance (meters)
  - moving_time (seconds)
  - average_pace (seconds per km — computed as moving_time / (distance / 1000))
  - average_heartrate (bpm, nullable)
  - hr_zone_1_seconds through hr_zone_5_seconds (nullable ints)
  - name, type, started_at, elevation_gain, suffer_score (not stored, will be null)

IMPORTANT: `average_speed` is NOT stored — the field does not exist in the DB.
The correct pace source is either `average_pace` (s/km) or computed as `(moving_time / distance) * 1000`.

From HeroPage.jsx — current broken avg pace code (lines 251-256):
```js
const avgSpeed = (arr) => {
  const r = arr.filter((a) => Number(a.average_speed) > 0);  // ALWAYS EMPTY
  return r.length ? sum(r, "average_speed") / r.length : 0;
};
const curSpeed = avgSpeed(filtered);
```
Then used as: `fmtPaceDisplay(curSpeed)` where fmtPaceDisplay expects m/s input.

From HeroPage.jsx — existing Tabs structure (lines 415-421):
```jsx
<Tabs defaultValue="overview" className="space-y-4">
  <TabsList>
    <TabsTrigger value="overview">Overview</TabsTrigger>
    <TabsTrigger value="analytics" disabled>Analytics</TabsTrigger>
    <TabsTrigger value="reports" disabled>Reports</TabsTrigger>
    <TabsTrigger value="notifications" disabled>Notifications</TabsTrigger>
  </TabsList>
  <TabsContent value="overview" className="space-y-4">
    ... all dashboard content ...
  </TabsContent>
</Tabs>
```

From ActivitiesTable.jsx — existing columns:
  Activity | Type | Distance | Duration | Effort (badge) | Date

HR zone data on activities: hr_zone_1_seconds, hr_zone_2_seconds, hr_zone_3_seconds, hr_zone_4_seconds, hr_zone_5_seconds
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Fix avg pace KPI — replace average_speed with average_pace</name>
  <files>src/pages/HeroPage.jsx</files>
  <action>
The bug: `avgSpeed` filters on `a.average_speed` which is never stored. Fix the KPI to use `average_pace` (s/km stored by strava-sync) or fall back to computing it inline from `moving_time / distance * 1000`.

In the `kpiMetrics` useMemo block, replace the broken `avgSpeed` helper:

```js
// REMOVE this broken helper:
const avgSpeed = (arr) => {
  const r = arr.filter((a) => Number(a.average_speed) > 0);
  return r.length ? sum(r, "average_speed") / r.length : 0;
};

// REPLACE with pace-based helper (returns avg seconds-per-km, 0 if no data):
const avgPaceSpm = (arr) => {
  const r = arr.filter((a) => {
    // Prefer stored average_pace; fall back to computing from moving_time + distance
    const pace = Number(a.average_pace) || (a.moving_time && a.distance ? (Number(a.moving_time) / Number(a.distance)) * 1000 : 0);
    return pace > 0 && (a.type === "Run" || a.type === "Walk");  // pace only meaningful for foot sports
  });
  if (!r.length) return 0;
  const paces = r.map((a) => Number(a.average_pace) || (Number(a.moving_time) / Number(a.distance)) * 1000);
  return paces.reduce((s, p) => s + p, 0) / paces.length;
};
const curPace = avgPaceSpm(filtered);
const prevPace = avgPaceSpm(prevFiltered);
```

Update `fmtPaceDisplay` to accept seconds-per-km (not m/s):
```js
function fmtPaceDisplay(secPerKm) {
  if (!Number(secPerKm) || secPerKm <= 0) return "—";
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm % 60);
  return `${m}:${String(s).padStart(2, "0")} /km`;
}
```

Update the KPI entry for "Avg. Pace":
```js
{
  label: "Avg. Pace",
  value: fmtPaceDisplay(curPace),
  // For delta: faster pace = lower seconds = positive (invert=true compares raw pace, lower=better)
  delta: computeDelta(curPace ? 1 / curPace : 0, prevPace ? 1 / prevPace : 0, true),
  suffix,
  Icon: TrendingUp,
},
```

Note: `computeDelta` with invert=true marks improvement (pace getting faster = numerically lower s/km = ratio going up when inverted) as positive.
  </action>
  <verify>
    <automated>npm test -- --run 2>&1 | tail -20</automated>
  </verify>
  <done>Avg. Pace KPI shows a formatted pace like "5:12 /km" for periods that have Run activities, instead of "—". If user has no Run/Walk activities in the filtered period, "—" is acceptable.</done>
</task>

<task type="auto">
  <name>Task 2: Add "Alle løp" tab with paginated activities table and HR zone bar</name>
  <files>src/pages/HeroPage.jsx, src/components/dashboard/ActivitiesTable.jsx</files>
  <action>
## Part A — Update ActivitiesTable.jsx

Redesign the component to support pagination and the new columns. Accept props: `activities` (all to paginate), `pageSize=10`.

Add a `fmtPace` helper (seconds per km → "M:SS /km"):
```js
function fmtPace(secPerKm) {
  if (!secPerKm || secPerKm <= 0) return "—";
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm % 60);
  return `${m}:${String(s).padStart(2, "0")} /km`;
}
```

Add `HRZoneBar` component — a small horizontal bar 80px wide, 8px tall:
- If activity has hr_zone_1_seconds through hr_zone_5_seconds and total > 0: render 5 colored segments proportional to each zone's seconds.
  - Z1: `bg-slate-400`, Z2: `bg-blue-500`, Z3: `bg-green-500`, Z4: `bg-amber-500`, Z5: `bg-red-500`
- If no zone data but activity has `suffer_score > 0`: render a single-color bar:
  - suffer_score >= 100: `bg-red-400`, >= 50: `bg-amber-400`, else `bg-blue-300`
- If neither: render a `bg-slate-100` placeholder bar.
- Wrap in a `<div title="HR Zone distribution: Z1 / Z2 / Z3 / Z4 / Z5">` tooltip showing zone seconds.

New columns (replace "Type" and "Effort" badge):
- Activity (name + date below in muted text)
- Distance (right-align, mono)
- Duration (right-align, mono, hidden on mobile)
- Pace (right-align, mono — compute from moving_time/distance if average_pace missing)
- HR (right-align — show `average_heartrate` as e.g. "152 bpm", or "—")
- Effort (the HRZoneBar, min-w-[80px])

Pagination: add `useState` for `page` (starts at 1). Slice `activities` as `activities.slice((page-1)*pageSize, page*pageSize)`. Below the table add:
```jsx
<div className="flex items-center justify-between py-3 px-1 text-sm text-muted-foreground">
  <span>Showing {start}–{end} of {total}</span>
  <div className="flex gap-2">
    <button disabled={page===1} onClick={() => setPage(p=>p-1)} className="px-3 py-1 rounded border text-xs disabled:opacity-40">Forrige</button>
    <span className="px-2 py-1 text-xs">{page} / {totalPages}</span>
    <button disabled={page===totalPages} onClick={() => setPage(p=>p+1)} className="px-3 py-1 rounded border text-xs disabled:opacity-40">Neste</button>
  </div>
</div>
```
Reset page to 1 when `activities` prop changes (use `useEffect`).

## Part B — Update HeroPage.jsx

Add a new "Alle løp" tab to the existing Tabs component. The tab shows ALL activities (not filtered by the current date range — use `activities.activities` directly), sorted newest first.

In TabsList, add after the Overview trigger:
```jsx
<TabsTrigger value="alle-lop">Alle løp</TabsTrigger>
```
Remove or keep the disabled tabs as-is (do not remove them).

Add a new TabsContent block after the closing `</TabsContent>` of overview:
```jsx
<TabsContent value="alle-lop" className="space-y-4">
  <Card>
    <CardHeader>
      <CardTitle>Alle løp</CardTitle>
      <CardDescription>
        Komplett aktivitetslogg — {activities.activities.length} aktiviteter totalt
      </CardDescription>
    </CardHeader>
    <CardContent className="px-5 py-0 pb-4">
      <ActivitiesTable
        activities={[...activities.activities].sort(
          (a, b) => new Date(b.started_at) - new Date(a.started_at)
        )}
        pageSize={10}
      />
    </CardContent>
  </Card>
</TabsContent>
```

The existing "Activity History" card in the Overview tab continues to use `<ActivitiesTable activities={recentActivities} />` — it will now also show paginated with the redesigned table. That is fine.
  </action>
  <verify>
    <automated>npm test -- --run 2>&1 | tail -20</automated>
  </verify>
  <done>
- Dashboard tab strip shows "Alle løp" tab that is clickable (not disabled).
- Clicking "Alle løp" reveals the paginated table with all activities.
- Each row has: name, date, distance, duration, pace, HR, and a small colored zone bar.
- Pagination controls show "Forrige / N / Neste" and navigate correctly.
- Activities with HR zone data show multi-color zone bars; activities without show fallback.
- Existing Overview tab and all existing KPI cards are unaffected.
  </done>
</task>

</tasks>

<verification>
After both tasks are complete:
1. `npm test -- --run` passes with no new failures
2. `npm run build` completes without TypeScript/JSX errors
3. Manual check in browser: dashboard Avg. Pace KPI shows a real value for weeks with runs
4. Clicking "Alle løp" tab shows paginated activity list with zone bars
</verification>

<success_criteria>
- Avg. Pace KPI shows formatted pace (not "—") when runs exist in the selected period
- "Alle løp" tab is functional, not disabled
- Paginated table shows 10 rows per page with prev/next navigation
- HR zone bar renders colored segments when zone data exists
- All existing tests pass
</success_criteria>

<output>
After completion, create `.planning/quick/8-fix-avg-pace-kpi-on-dashboard-and-add-pa/8-SUMMARY.md` with what was implemented, files changed, and any deviations from this plan.
</output>
