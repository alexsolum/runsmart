---
phase: quick-5
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/pages/InsightsPage.jsx
autonomous: true
requirements: [QUICK-5]
must_haves:
  truths:
    - "Chart shows runs from the past 180 days (up from 150)"
    - "Regression quality badge shows R², strength label (Sterk/Moderat/Svak or Strong/Moderate/Weak), and run count"
    - "Hover tooltip shows date, run name, efficiency value, average HR, and pace in min/km"
    - "Labels are in Norwegian when lang=no, English when lang=en"
  artifacts:
    - path: "src/pages/InsightsPage.jsx"
      provides: "Updated aerobic efficiency chart with 180-day window, quality badge, and enriched tooltip"
  key_links:
    - from: "aerobicEfficiencyData useMemo"
      to: "windowDays constant"
      via: "change 150 → 180"
    - from: "aerobicEfficiencyData return value"
      to: "regressionStrength + count fields"
      via: "derive from reg.rSquared and displayPoints.length"
    - from: "EfficiencyTooltip"
      to: "pace field"
      via: "compute min/km from data.speed (km/h): pace = 60 / speed"
---

<objective>
Improve the aerobic efficiency trend chart on InsightsPage with three targeted changes:
1. Extend time window from 150 to 180 days
2. Add regression quality badge (R², strength label, run count)
3. Enrich hover tooltip with pace alongside existing speed/HR/efficiency fields

Purpose: Give the user better visibility into the data driving the trend and enough context on each run to judge the chart's meaning.
Output: Updated InsightsPage.jsx — no new files, no new dependencies.
</objective>

<execution_context>
@C:/Users/HP/.claude/get-shit-done/workflows/execute-plan.md
@C:/Users/HP/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@src/pages/InsightsPage.jsx
@src/domain/compute.js
@src/i18n/translations.js
</context>

<interfaces>
<!-- Key data shapes the executor needs. Extracted from codebase. No exploration needed. -->

From src/domain/compute.js — computeAerobicEfficiency output per point:
```js
{
  id, date, x,          // x = Date.getTime() (ms epoch)
  y,                     // efficiency = GAP(m/s) / HR
  name,                  // activity name string
  speed,                 // km/h (already multiplied ×3.6)
  gap,                   // GAP km/h
  hr,                    // average_heartrate bpm
  distance,              // metres
  intensityScore,        // suffer_score || 0
  heart_rate_zones
}
```

From src/domain/compute.js — linearRegression return:
```js
{ slope, intercept, rSquared }  // rSquared is a number 0–1
```

Current aerobicEfficiencyData useMemo return (line ~608):
```js
{ points: displayPoints, regression: regressionLine, gain: string, r2: string }
```

Current EfficiencyTooltip shows: name, date, speed (km/h), hr (bpm), efficiency (y).

Current regression quality badge (line ~1027):
```jsx
<span className="block text-[9px] text-slate-400">R² {aerobicEfficiencyData.r2}</span>
```

copy object fields for aerobic efficiency section (both locales):
- aerobicEfficiencyDesc: "...de siste 150 dagene." / "...over the past 150 days."
- trendGain, trendLine, easyAerobic, moderate, intensity, speed, avgHr, efficiency
</interfaces>

<tasks>

<task type="auto">
  <name>Task 1: Extend time window and compute regression quality in useMemo</name>
  <files>src/pages/InsightsPage.jsx</files>
  <action>
Make three changes inside the `aerobicEfficiencyData` useMemo (lines ~572–614):

1. Change `const windowDays = 150` to `const windowDays = 180`.

2. After computing `reg = linearRegression(displayPoints)`, derive a strength label and count:
```js
const rSquared = reg.rSquared;
const count = displayPoints.length;
// strength thresholds: ≥0.5 = strong, ≥0.25 = moderate, else weak
const rStrength = rSquared >= 0.5 ? "strong" : rSquared >= 0.25 ? "moderate" : "weak";
```

3. Add `count` and `rStrength` to the return object:
```js
return {
  points: displayPoints,
  regression: regressionLine,
  gain: gain.toFixed(1),
  r2: reg.rSquared.toFixed(2),
  count,          // number of runs in regression
  rStrength,      // "strong" | "moderate" | "weak"
};
```

Also update the `aerobicEfficiencyDesc` string in the `copy` useMemo — both locales:
- Norwegian: `"Forholdet fart/puls (GAP-normalisert) de siste 180 dagene."`
- English: `"Speed/HR ratio (GAP normalized) over the past 180 days."`

Add new copy keys to the `copy` useMemo (both locales):
- Norwegian: `rStrengthLabels: { strong: "Sterk", moderate: "Moderat", weak: "Svak" }`, `runs: "løp"`, `pace: "Tempo"`
- English: `rStrengthLabels: { strong: "Strong", moderate: "Moderate", weak: "Weak" }`, `runs: "runs"`, `pace: "Pace"`
  </action>
  <verify>
    <automated>npm test -- --run 2>&1 | tail -20</automated>
  </verify>
  <done>windowDays is 180, aerobicEfficiencyData returns count and rStrength, copy has rStrengthLabels/runs/pace in both locales, tests pass.</done>
</task>

<task type="auto">
  <name>Task 2: Update regression quality badge and enrich EfficiencyTooltip</name>
  <files>src/pages/InsightsPage.jsx</files>
  <action>
**Part A — Regression quality badge** (CardHeader area, lines ~1021–1028):

Replace the current R² span:
```jsx
<span className="block text-[9px] text-slate-400">R² {aerobicEfficiencyData.r2}</span>
```
With a single line showing R², strength label, and count:
```jsx
<span className="block text-[9px] text-slate-400">
  R² {aerobicEfficiencyData.r2} · {copy.rStrengthLabels[aerobicEfficiencyData.rStrength]} · {aerobicEfficiencyData.count} {copy.runs}
</span>
```
No layout changes needed — the badge already has `text-right` and the span is small.

**Part B — EfficiencyTooltip** (lines ~328–347):

Add a pace row. Pace in min/km = 60 / speed (where speed is in km/h). Handle division-by-zero. Format as "M:SS" for clean display.

Update `EfficiencyTooltip` to:
1. Accept `copy` (already passed via `<Tooltip content={<EfficiencyTooltip locale={locale} copy={copy} />} />`)
2. Compute pace inside the component: `const paceMinPerKm = data.speed > 0 ? 60 / data.speed : null`
3. Format pace as "M:SS min/km": `const mins = Math.floor(paceMinPerKm); const secs = Math.round((paceMinPerKm - mins) * 60).toString().padStart(2, "0"); const paceStr = paceMinPerKm ? \`${mins}:${secs} min/km\` : "—"`
4. Add a pace row after avgHr row:
```jsx
<span className="text-slate-400">{copy.pace}</span>
<span className="text-right font-mono font-bold text-slate-700">{paceStr}</span>
```

The tooltip grid is already `grid-cols-2 gap-x-4 gap-y-1` — just add two more cells.
  </action>
  <verify>
    <automated>npm test -- --run 2>&1 | tail -20</automated>
  </verify>
  <done>
    - Quality badge shows e.g. "R² 0.42 · Moderat · 38 løp" (Norwegian) or "R² 0.42 · Moderate · 38 runs" (English)
    - Tooltip shows 4 rows: speed, avg HR, pace (M:SS min/km), efficiency
    - No test regressions
  </done>
</task>

</tasks>

<verification>
After both tasks:
- `npm test -- --run` passes (no regressions in insights.test.jsx or compute.test.js)
- Chart description text says "180 dagene" / "180 days"
- Badge renders all three fields inline
- Tooltip pace row appears with correct min/km format
</verification>

<success_criteria>
- windowDays = 180 (was 150)
- Regression badge: "R² {n} · {Sterk|Moderat|Svak} · {N} løp" in Norwegian, English equivalent
- Tooltip: date, run name, speed (km/h), avg HR (bpm), pace (M:SS min/km), efficiency value
- All existing tests still pass
</success_criteria>

<output>
After completion, create `.planning/quick/5-improve-the-aerobic-efficiency-trend-cha/5-SUMMARY.md` with what was done, files changed, and any decisions made.
</output>
