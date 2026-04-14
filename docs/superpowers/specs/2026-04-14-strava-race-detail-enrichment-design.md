# Strava Race Detail Enrichment — Design Spec

**Date:** 2026-04-14  
**Status:** Approved

## Overview

Enrich the race participation detail panel with richer Strava data: a route map, a visual pace/HR chart, suffer score display, and pacing analysis. All required data is already returned by the `strava-activity-detail` edge function — no backend changes needed.

## What Changes

### Current state
`StravaDetailPanel` renders a single vertical scroll: stat chips → description → photos → splits table.

### New state
`StravaDetailPanel` becomes a 4-tab panel using shadcn `Tabs`. Each tab surfaces a distinct data type. The Strava link and photo album link move into the Stats tab.

---

## Tab Layout

| Tab | Shown when | Contents |
|-----|-----------|----------|
| **Stats** | Always (default) | Description, performance chips (HR avg/max, avg pace, calories, suffer score, splits badge), pacing highlights |
| **Route** | Always | Interactive Leaflet map with decoded polyline, start/end markers |
| **Splits** | `splits.length > 0` | Recharts `ComposedChart` (pace bars + HR line) above existing splits table |
| **Photos** | `photos.length > 0` | Responsive photo grid |

---

## Components

### 1. `StravaDetailPanel.jsx` — redesign

Replaces the current vertical layout with a shadcn `Tabs` / `TabsList` / `TabsTrigger` / `TabsContent` structure.

**Stats tab content:**
- Activity description (if present) — italicised in a `bg-slate-50` block
- Chips row: Avg HR, Max HR, Avg Pace, Calories, Suffer Score (all from `data.stats`), pacing classification badge
- Pacing highlights section: fastest km, slowest km, last-5-km average
- "View on Strava" and "Photo album" links at the bottom

**Route tab content:**
- Renders `<StravaRouteMap polyline={data.map_polyline} />` if `map_polyline` is non-null; otherwise a short "No route data" message

**Splits tab content:**
- Renders `<SplitsPaceChart splits={data.splits} />` if splits exist
- Followed by the existing splits `<table>` (KM / Pace / HR / Elev columns), with fast/slow km rows color-coded

**Photos tab content:**
- `grid grid-cols-2 gap-2` responsive grid
- Each photo: `<img>` with `object-cover` and caption below if present

### 2. `SplitsPaceChart.jsx` — new component

Located at `src/components/races/SplitsPaceChart.jsx`.

Uses `ComposedChart` from recharts (same pattern as `InsightsPage.jsx`), wrapped in `ResponsiveContainer width="100%" height={200}`.

**Chart data shape** — derived from `splits` prop:
```js
splits.map(s => ({
  km: s.split,
  speed: s.average_speed,          // m/s — higher = faster (used for bar height)
  hr: s.average_heartrate ?? null,
  paceLabel: formatPace(s.average_speed), // for tooltip display
}))
```

Using `average_speed` (m/s, higher = faster) as the bar dataKey means taller bars naturally represent faster km — no axis reversal needed. The tooltip formatter converts back to min/km for display.

**Bar color:** Each bar's `Cell` fill is determined by comparing `speed` to the mean:
- `>= mean * 1.03` → `#34d399` (fast)
- `<= mean * 0.97` → `#f87171` (slow)
- otherwise → `#60a5fa` (normal)

**HR line:** Secondary `<Line>` with `yAxisId="hr"`, right-side `<YAxis>`, `stroke="#f97316"`, `dot={false}`. Only rendered if any split has `average_heartrate`.

**Shared style constants** (declared locally, matching InsightsPage pattern):
```js
const TICK = { fontSize: 11, fill: "#94a3b8" };
const TOOLTIP_STYLE = { backgroundColor: "white", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 12 };
```

### 3. `StravaRouteMap.jsx` — new component

Located at `src/components/races/StravaRouteMap.jsx`.

Accepts `polyline` (encoded string). Decodes with an inline `decodePolyline(str)` pure function (15 lines, implements the Google Encoded Polyline algorithm — no new npm dependency).

Renders a Leaflet `MapContainer` (height 200px, `scrollWheelZoom={false}`) with:
- `TileLayer` (OpenStreetMap, same attribution as `RaceMap.jsx`)
- `Polyline` with `color="#3b82f6"` and `weight={3}`
- Green `CircleMarker` at first point (start), red at last point (finish)
- A `FitBounds` helper component (same pattern as `RaceMap.jsx`) that fits the map to the polyline bounds on mount

---

## Pacing Analysis Logic

Three pure functions in `StravaDetailPanel.jsx` (not extracted — only used there):

```js
// "negative" if second-half avg speed > first-half; "positive" if reverse; "even" within 2%
function classifySplits(splits) { ... }

// split object with highest average_speed
function findFastestSplit(splits) { ... }

// split object with lowest average_speed
function findSlowestSplit(splits) { ... }

// avg pace string for last N splits
function lastNAvgPace(splits, n) { ... }
```

---

## Data Flow

No changes to the edge function or data fetching. `StravaDetailPanel` already receives all fields via `data` from the `strava-activity-detail` call:

```
data.description      → Stats tab
data.stats.*          → Stats tab chips
data.map_polyline     → Route tab (StravaRouteMap)
data.splits           → Splits tab (SplitsPaceChart + table)
data.photos           → Photos tab (grid)
```

---

## Error & Empty States

- `map_polyline` is null → Route tab shows: *"No route data available for this activity."*
- `splits` is empty → Splits tab is hidden entirely
- `photos` is empty → Photos tab is hidden entirely
- `description` is null → description block not rendered (not a placeholder)
- Loading state: existing skeleton stays unchanged (renders before tabs)
- Error state: existing error message stays unchanged

---

## Constraints

- Use shadcn `Tabs` / `TabsList` / `TabsTrigger` / `TabsContent` — already used throughout the app
- Use `ComposedChart` + `ResponsiveContainer` from `recharts` — already installed, same pattern as `InsightsPage.jsx`
- No new npm dependencies — polyline decoding is implemented inline
- Leaflet is already installed (used by `RaceMap.jsx`)
- Follow existing CSS token conventions from `tokens.css`; no new tokens needed
