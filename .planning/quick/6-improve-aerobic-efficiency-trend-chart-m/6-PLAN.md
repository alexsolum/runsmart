---
phase: quick-6
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/pages/InsightsPage.jsx
autonomous: true
requirements: [QUICK-6]
must_haves:
  truths:
    - "Chart Y-axis shows pace in M:SS min/km format (not GAP/HR ratio)"
    - "Y-axis is inverted so faster pace (lower value) plots higher — improvement trends upward"
    - "Easy runs are filtered by HR < 75% of 95th-percentile max HR, not name keywords"
    - "Workout runs are classified by HR >= 85% max HR or intensityScore > 75"
    - "Long runs are classified by duration > 4500s AND HR < 85% max HR"
    - "Dots are visibly larger than before"
    - "Chart title and description updated in both Norwegian and English to reflect pace concept"
  artifacts:
    - path: "src/pages/InsightsPage.jsx"
      provides: "Updated aerobic efficiency chart section"
      contains: "reversed: true"
  key_links:
    - from: "aerobicEfficiencyData useMemo"
      to: "Scatter + Line in JSX"
      via: "points[].y now holds pace (min/km)"
      pattern: "paceMinPerKm"
---

<objective>
Rework the aerobic efficiency chart to display easy-run pace (min/km) on the Y-axis instead of the GAP/HR ratio, apply HR-based workout classification, increase dot size, and invert the Y-axis so visual improvement (faster pace) trends upward.

Purpose: The chart now answers a clearer question — "Is my easy running pace improving?" — which is more intuitive than aerobic efficiency ratio.
Output: Updated InsightsPage.jsx with revised useMemo, YAxis, Scatter props, copy strings, and trend-gain badge color logic.
</objective>

<execution_context>
@C:/Users/HP/.claude/get-shit-done/workflows/execute-plan.md
@C:/Users/HP/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@src/pages/InsightsPage.jsx
@src/domain/compute.js
</context>

<interfaces>
<!-- Key data shape flowing from computeAerobicEfficiency() into aerobicEfficiencyData useMemo -->

Each point returned by computeAerobicEfficiency() has:
```js
{
  id, date, x,          // x = timestamp (ms)
  y,                    // currently GAP/HR ratio — will be REPLACED by pace in min/km
  name, speed,          // speed in km/h
  gap,                  // GAP speed in km/h
  hr,                   // average_heartrate (bpm)
  distance,             // meters
  intensityScore,       // a.suffer_score || 0
  heart_rate_zones
}
```

The aerobicEfficiencyData useMemo (lines 584–633):
- Filters activities to 180-day window
- Calls computeAerobicEfficiency()
- Applies filterMode ("all" | "easy" | "workout" | "long") — currently uses name keywords + intensityScore thresholds
- Runs linearRegression(displayPoints) using points[].y as the Y value
- calculateTrendGain() also uses points[].y

The Scatter chart uses `y` as the implicit Y coordinate for ScatterChart.
The YAxis is `type="number" domain={['auto','auto']}`.
The EfficiencyTooltip (lines 328–353) already formats pace from data.speed.

linearRegression signature: linearRegression(points) — expects array of {x, y}
calculateTrendGain signature: calculateTrendGain(points) — expects array of {x, y}
</interfaces>

<tasks>

<task type="auto">
  <name>Task 1: Replace Y-axis metric with pace, add HR-based classification, increase dot size</name>
  <files>src/pages/InsightsPage.jsx</files>
  <action>
Make the following changes to InsightsPage.jsx:

**1. Compute 95th-percentile max HR (inside aerobicEfficiencyData useMemo, before filtering):**
```js
const allHRValues = activities.activities
  .map(a => Number(a.average_heartrate) || 0)
  .filter(hr => hr > 0)
  .sort((a, b) => a - b);
const maxHR = allHRValues.length > 0
  ? allHRValues[Math.floor(allHRValues.length * 0.95)]
  : 190; // fallback if no HR data
```

**2. Replace `y` field computation in the useMemo — after calling computeAerobicEfficiency(), remap points to use pace:**
```js
const rawPoints = computeAerobicEfficiency(filtered);
// Replace y with pace in min/km (speed is already in km/h from compute.js)
const points = rawPoints.map(p => ({
  ...p,
  y: p.speed > 0 ? 60 / p.speed : null,  // min/km
})).filter(p => p.y !== null);
```

**3. Replace filterMode classification logic** — currently uses name keywords + intensityScore. Replace with:
```js
if (filterMode === "workout") {
  displayPoints = points.filter(p => p.hr >= maxHR * 0.85 || p.intensityScore > 75);
} else if (filterMode === "long") {
  displayPoints = points.filter(p => {
    const durationSec = p.distance > 0 && p.speed > 0
      ? (p.distance / 1000) / p.speed * 3600
      : 0;
    // Use moving_time if available — but computeAerobicEfficiency doesn't expose it.
    // Approximate: distance(m)/speed(m/s). speed is km/h so convert: speed_ms = speed/3.6
    const speedMs = p.speed / 3.6;
    const estimatedDuration = speedMs > 0 ? p.distance / speedMs : 0;
    return estimatedDuration > 4500 && p.hr < maxHR * 0.85;
  });
} else if (filterMode === "easy") {
  displayPoints = points.filter(p => p.hr < maxHR * 0.75);
}
```

**4. Invert trend-gain badge color logic** — for pace, a negative gain (pace going down = faster) is improvement:
Find the badge span with `Number(aerobicEfficiencyData.gain) >= 0 ? "text-emerald-600" : "text-red-500"` and invert it:
```jsx
{Number(aerobicEfficiencyData.gain) <= 0 ? "text-emerald-600" : "text-red-500"}
```
(Negative or zero gain in pace = same or faster = good.)

**5. Update YAxis to invert it** — add `reversed={true}` and a tickFormatter for M:SS format:
```jsx
<YAxis
  type="number"
  domain={['auto', 'auto']}
  reversed={true}
  tickFormatter={(val) => {
    const mins = Math.floor(val);
    const secs = Math.round((val - mins) * 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }}
  tick={TICK}
  axisLine={false}
  tickLine={false}
/>
```

**6. Increase dot size** — on the Scatter component, add `shape` prop or use the `r` prop via Cell. The simplest way: add a `shape` prop to Scatter that renders a larger circle:
```jsx
<Scatter
  name={copy.efficiency}
  data={aerobicEfficiencyData.points}
  className="max-[600px]:hidden"
  shape={(props) => {
    const { cx, cy, fill } = props;
    return <circle cx={cx} cy={cy} r={6} fill={fill} fillOpacity={0.75} />;
  }}
>
```
Remove the `fillOpacity={0.6}` from Cell (it's now handled in the shape). Keep the Cell color logic unchanged.

**7. Update copy strings in BOTH locales:**

Norwegian (`aerobicEfficiencyTitle` / `aerobicEfficiencyDesc`):
```js
aerobicEfficiencyTitle: "Tempo på rolige løp over tid",
aerobicEfficiencyDesc: "Tempo (min/km) på aerobe løp de siste 180 dagene. Linje som går ned = du løper fortere.",
```

English:
```js
aerobicEfficiencyTitle: "Easy run pace trend",
aerobicEfficiencyDesc: "Pace (min/km) on aerobic runs over the past 180 days. Line trending down = getting faster.",
```

**8. Update EfficiencyTooltip** — the tooltip already shows pace (`paceStr`) as a row. Make pace the primary/first metric shown (move it before speed/avgHR), and remove or de-emphasize the "efficiency" row since Y is now pace:
In the tooltip grid, reorder rows: pace first, then speed, then avgHR. Change the "efficiency" row to show pace value (which is `data.y`) formatted as M:SS instead of `data.y.toFixed(3)`.
Actually simpler: just change the efficiency row label to `copy.pace` and format as M:SS using `data.y`:
```jsx
<span className="text-slate-400">{copy.pace}</span>
<span className="text-right font-mono font-bold text-blue-600">
  {`${Math.floor(data.y)}:${Math.round((data.y - Math.floor(data.y)) * 60).toString().padStart(2, "0")} min/km`}
</span>
```
Keep the speed and avgHR rows as-is.
  </action>
  <verify>
    <automated>npm test -- --run --reporter=verbose 2>&1 | tail -30</automated>
  </verify>
  <done>
- Chart Y-axis shows M:SS min/km ticks and is inverted (lower pace value = higher on chart)
- Easy filter uses HR &lt; 75% maxHR threshold
- Workout filter uses HR &gt;= 85% maxHR or intensityScore &gt; 75
- Long filter uses estimated duration &gt; 4500s and HR &lt; 85% maxHR
- Dots render at r=6 (visibly larger)
- Title and description updated in both Norwegian and English
- Trend gain badge: negative % = green (pace improved), positive % = red (pace slower)
- All existing tests pass
  </done>
</task>

</tasks>

<verification>
Run `npm test -- --run` — all tests must pass. No new test failures introduced.

Manual check (if available): Visit the Insights/Innsikt page, switch to the aerobic efficiency chart section with the "Aerob" filter active. Confirm:
1. Y-axis shows M:SS format ticks (e.g. "5:30")
2. Axis is inverted (faster pace at the top)
3. Dots are noticeably larger
4. Card title reads "Tempo på rolige løp over tid" (no) / "Easy run pace trend" (en)
</verification>

<success_criteria>
- Y-axis metric is pace in min/km with M:SS ticks
- Y-axis is inverted (visual improvement = upward line)
- HR-based classification replaces name-keyword heuristics for all three filter modes
- Dot radius = 6 (up from default ~3)
- Both locale copy strings updated
- All existing Vitest tests pass
</success_criteria>

<output>
After completion, create `.planning/quick/6-improve-aerobic-efficiency-trend-chart-m/6-SUMMARY.md`
</output>
