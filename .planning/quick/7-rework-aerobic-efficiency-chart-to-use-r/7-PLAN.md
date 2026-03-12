---
phase: quick-7
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/domain/compute.js
  - src/pages/InsightsPage.jsx
  - tests/unit/compute.test.js
autonomous: true
requirements: [QUICK-7]
must_haves:
  truths:
    - "Chart shows HR (bpm) on Y-axis, not pace"
    - "Only runs near the modal distance (±15%) are plotted"
    - "Pace outliers (±20% of median pace) are excluded"
    - "Y-axis is inverted so a downward HR trend reads as an upward fitness trend"
    - "Chart title/description references the detected reference distance"
    - "Trend badge shows HR change in bpm and % with falling HR colored green"
    - "Chart shows empty state when fewer than 5 reference runs exist"
  artifacts:
    - path: "src/domain/compute.js"
      provides: "computeReferenceWorkouts() pure function"
      exports: ["computeReferenceWorkouts"]
    - path: "src/pages/InsightsPage.jsx"
      provides: "Updated aerobic efficiency chart using reference workouts"
    - path: "tests/unit/compute.test.js"
      provides: "Tests for computeReferenceWorkouts"
  key_links:
    - from: "src/pages/InsightsPage.jsx"
      to: "src/domain/compute.js"
      via: "import computeReferenceWorkouts"
      pattern: "computeReferenceWorkouts"
---

<objective>
Rework the aerobic efficiency chart from a pace-based scatter plot (which fails because easy run pace barely varies) to a reference-workout HR tracker. The new chart finds the most commonly run distance, isolates runs of similar length and effort, and plots average HR over time. Falling HR = better aerobic fitness.

Purpose: Give the user a meaningful fitness trend signal instead of a flat R²=0.01 scatter cloud.
Output: Updated chart with bpm Y-axis (inverted), reference distance label, bpm+% trend badge, and empty state guard.
</objective>

<execution_context>
@C:/Users/HP/.claude/get-shit-done/workflows/execute-plan.md
@C:/Users/HP/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/quick/7-rework-aerobic-efficiency-chart-to-use-r/7-CONTEXT.md
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Add computeReferenceWorkouts() to compute.js and update tests</name>
  <files>src/domain/compute.js, tests/unit/compute.test.js</files>
  <behavior>
    - computeReferenceWorkouts([]) returns { referenceKm: null, points: [] }
    - computeReferenceWorkouts with fewer than 5 qualifying runs returns { referenceKm: X, points: [] } (points empty to trigger empty state)
    - Buckets runs by floor(distance_m / 1000) km bin; finds bin with most runs (modal bin)
    - Includes runs where distance is within ±15% of modalBinCenter (modalBinCenter = modalBin + 0.5 km in meters)
    - Computes median pace of the candidate group; excludes runs with pace outside ±20% of median
    - Each returned point: { id, date, x (timestamp), y (average_heartrate), name, distance, hr, speed (km/h), intensityScore }
    - referenceKm = modalBinCenter rounded to 1 decimal
    - Existing computeAerobicEfficiency remains unchanged (still exported, still tested)
  </behavior>
  <action>
    Add computeReferenceWorkouts(activities) as a new pure function in src/domain/compute.js, immediately after the existing computeAerobicEfficiency function.

    Algorithm:
    1. Filter to runs only: type.toLowerCase() === "run", moving_time >= 1200, average_heartrate > 0, distance > 0.
    2. Bucket each run: bin = Math.floor(distance_m / 1000). Count occurrences per bin.
    3. Find modalBin = bin with highest count (ties: pick highest bin).
    4. modalCenter_m = (modalBin + 0.5) * 1000.
    5. Candidates = runs where Math.abs(distance - modalCenter_m) / modalCenter_m <= 0.15.
    6. For each candidate compute pace_s_per_m = moving_time / distance. Sort paces, compute median.
    7. Filter candidates: keep only those where Math.abs(pace - medianPace) / medianPace <= 0.20.
    8. Map each to { id, date: a.started_at, x: new Date(a.started_at).getTime(), y: Number(a.average_heartrate), name: a.name, distance: a.distance, hr: Number(a.average_heartrate), speed: (a.distance / a.moving_time) * 3.6, intensityScore: a.suffer_score || 0 }.
    9. Sort by x ascending.
    10. referenceKm = Math.round(modalCenter_m / 100) / 10 (one decimal).
    11. Return { referenceKm, points: filtered }.

    Add computeReferenceWorkouts to the export list at the bottom of the file.

    In tests/unit/compute.test.js, add a describe("computeReferenceWorkouts") block:
    - Test: empty input returns { referenceKm: null, points: [] }
    - Test: fewer than 5 qualifying runs — referenceKm is set but points is empty
    - Test: modal bin detection — given 6 runs at ~5 km and 2 at ~10 km, modal bin = 4 (floor(5000/1000)), referenceKm ≈ 4.5 km
    - Test: pace outlier exclusion — a run with pace 3x the median is excluded from points
    - Test: returned point shape has y = average_heartrate, not pace
  </action>
  <verify>
    <automated>npm test -- --run --reporter=verbose tests/unit/compute.test.js 2>&1 | tail -30</automated>
  </verify>
  <done>All compute.test.js tests pass including new computeReferenceWorkouts suite. computeReferenceWorkouts is exported from compute.js.</done>
</task>

<task type="auto">
  <name>Task 2: Rewire InsightsPage chart to use reference workouts with bpm Y-axis</name>
  <files>src/pages/InsightsPage.jsx</files>
  <action>
    Update InsightsPage.jsx in four areas:

    **1. Import**
    Add computeReferenceWorkouts to the existing import from "../domain/compute". Remove computeAerobicEfficiency from the import (it is no longer used in this page).

    **2. aerobicEfficiencyData useMemo (lines ~580-644)**
    Replace entirely with the reference-workout approach:

    ```js
    const aerobicEfficiencyData = useMemo(() => {
      const windowDays = 180;
      const cutoff = new Date();
      cutoff.setUTCDate(cutoff.getUTCDate() - windowDays);
      const recentActivities = activities.activities.filter(
        a => new Date(a.started_at) >= cutoff
      );

      const { referenceKm, points: rawPoints } = computeReferenceWorkouts(recentActivities);

      // Apply UI filter on top of reference group
      let displayPoints = rawPoints;
      if (filterMode === "workout") {
        const allHR = rawPoints.map(p => p.hr).filter(Boolean).sort((a,b) => a-b);
        const maxHR = allHR.length ? allHR[Math.floor(allHR.length * 0.95)] : 190;
        displayPoints = rawPoints.filter(p => p.hr >= maxHR * 0.85 || p.intensityScore > 75);
      } else if (filterMode === "long") {
        displayPoints = rawPoints.filter(p => {
          const speedMs = p.speed / 3.6;
          const dur = speedMs > 0 ? p.distance / speedMs : 0;
          return dur > 4500;
        });
      } else if (filterMode === "easy") {
        const allHR = rawPoints.map(p => p.hr).filter(Boolean).sort((a,b) => a-b);
        const maxHR = allHR.length ? allHR[Math.floor(allHR.length * 0.95)] : 190;
        displayPoints = rawPoints.filter(p => p.hr < maxHR * 0.75);
      }

      const MIN_RUNS = 5;
      if (displayPoints.length < MIN_RUNS) {
        return { points: displayPoints, regression: [], gain: 0, gainBpm: 0, r2: "0.00", count: displayPoints.length, rStrength: "weak", referenceKm };
      }

      const reg = linearRegression(displayPoints);
      const firstX = displayPoints[0].x;
      const lastX = displayPoints[displayPoints.length - 1].x;
      const regressionLine = [
        { x: firstX, regression: reg.intercept + reg.slope * firstX },
        { x: lastX, regression: reg.intercept + reg.slope * lastX },
      ];

      const startY = reg.intercept + reg.slope * firstX;
      const endY = reg.intercept + reg.slope * lastX;
      const gainPct = startY !== 0 ? ((endY - startY) / startY) * 100 : 0;
      const gainBpm = endY - startY; // negative = HR fell = improvement

      const rSquared = reg.rSquared;
      const count = displayPoints.length;
      const rStrength = rSquared >= 0.5 ? "strong" : rSquared >= 0.25 ? "moderate" : "weak";

      return {
        points: displayPoints,
        regression: regressionLine,
        gain: gainPct.toFixed(1),
        gainBpm: gainBpm.toFixed(1),
        r2: rSquared.toFixed(2),
        count,
        rStrength,
        referenceKm,
      };
    }, [activities.activities, filterMode]);
    ```

    **3. Copy strings**
    Update aerobicEfficiencyTitle and aerobicEfficiencyDesc in both Norwegian (no) and English (en) copy objects. The description must include a {referenceKm} placeholder that will be interpolated at render time:

    Norwegian:
    - aerobicEfficiencyTitle: "Aerob utvikling"
    - aerobicEfficiencyDesc: `Snittpuls på løp rundt {referenceKm} km de siste 180 dagene. Fallende linje = bedre form.`

    English:
    - aerobicEfficiencyTitle: "Aerobic Development"
    - aerobicEfficiencyDesc: `Average HR on runs around {referenceKm} km over the past 180 days. Falling line = better fitness.`

    Also add a new key to both copy objects:
    - Norwegian: noReferenceRuns: "Ikke nok sammenlignbare løp funnet (minst 5 trengs)."
    - English: noReferenceRuns: "Not enough comparable runs found (at least 5 needed)."

    **4. Chart JSX (Card id="aerobic-efficiency-section")**

    a) CardDescription: render the interpolated description:
    ```jsx
    <CardDescription>
      {aerobicEfficiencyData.referenceKm
        ? copy.aerobicEfficiencyDesc.replace("{referenceKm}", aerobicEfficiencyData.referenceKm)
        : copy.aerobicEfficiencyTitle}
    </CardDescription>
    ```

    b) Trend badge: show bpm delta alongside %. Replace the gain span content:
    ```jsx
    <span className={`text-lg font-mono font-bold ${Number(aerobicEfficiencyData.gain) <= 0 ? "text-emerald-600" : "text-red-500"}`}>
      {Number(aerobicEfficiencyData.gainBpm) > 0 ? "+" : ""}{aerobicEfficiencyData.gainBpm} bpm
    </span>
    <span className="block text-[10px] text-slate-400">
      {Number(aerobicEfficiencyData.gain) > 0 ? "+" : ""}{aerobicEfficiencyData.gain}%
    </span>
    ```

    c) YAxis: change from pace formatter to integer bpm labels, keep reversed={true}:
    ```jsx
    <YAxis
      type="number"
      domain={['auto', 'auto']}
      reversed={true}
      tickFormatter={(val) => `${Math.round(val)}`}
      tick={TICK}
      axisLine={false}
      tickLine={false}
    />
    ```

    d) Empty state: wrap the ResponsiveContainer in a conditional. When points < 5, show the noReferenceRuns message instead of the chart:
    ```jsx
    {aerobicEfficiencyData.points.length < 5 ? (
      <p className="text-sm text-slate-400 text-center py-12">{copy.noReferenceRuns}</p>
    ) : (
      <ResponsiveContainer ...> ... </ResponsiveContainer>
    )}
    ```

    e) EfficiencyTooltip: update the first row to show HR (bpm) as primary, and keep pace as secondary. Replace the pace row with:
    ```jsx
    <span className="text-slate-400">{copy.avgHr}</span>
    <span className="text-right font-mono font-bold text-blue-600">{Math.round(data.y)} bpm</span>
    <span className="text-slate-400">{copy.pace}</span>
    <span className="text-right font-mono font-bold text-slate-700">
      {data.speed > 0
        ? `${Math.floor(60/data.speed)}:${Math.round(((60/data.speed) - Math.floor(60/data.speed)) * 60).toString().padStart(2,"0")} min/km`
        : "—"}
    </span>
    ```
    Remove the separate avgHr row (it is now the primary row). Keep the speed row as-is.

    Dot color remains: intensityScore > 75 → red, > 40 → amber, else green.
  </action>
  <verify>
    <automated>npm test -- --run --reporter=verbose tests/unit/insights.test.jsx 2>&1 | tail -30</automated>
  </verify>
  <done>InsightsPage renders without errors. insights.test.jsx passes. Chart uses bpm Y-axis with reversed axis, referenceKm in description, bpm+% trend badge, and empty state for fewer than 5 runs.</done>
</task>

</tasks>

<verification>
npm test -- --run 2>&1 | tail -20
All test suites pass. No TypeScript/build errors.
</verification>

<success_criteria>
- computeReferenceWorkouts exported from compute.js, all its tests pass
- aerobicEfficiencyData useMemo uses reference workout logic (no more pace as y)
- YAxis shows integer bpm ticks, axis is inverted
- Chart description dynamically shows the detected referenceKm value
- Trend badge shows bpm change (negative = green) plus % change
- Chart shows noReferenceRuns message when fewer than 5 points
- Full test suite passes
</success_criteria>

<output>
After completion, create `.planning/quick/7-rework-aerobic-efficiency-chart-to-use-r/7-SUMMARY.md`
</output>
