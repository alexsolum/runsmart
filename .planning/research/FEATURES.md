# Feature Research

## New Features

### 1. Robust Strava Integration
**Goal:** Reliable, real-time data ingestion without manual intervention or limits.

- **Webhooks (Real-time):**
  - **Create:** When a user uploads an activity to Strava, it appears in RunSmart within seconds.
  - **Update:** If a user renames an activity or changes privacy on Strava, RunSmart reflects this.
  - **Delete:** If a user deletes an activity on Strava, it is removed from RunSmart.
  - **Deauthorization:** Handle user disconnecting app.

- **Unlimited Sync (History):**
  - **Pagination:** The current 100-activity limit is likely due to fetching only the first page.
  - **Implementation:** Loop through Strava API pages (`per_page=200`) until no activities remain or a date limit is reached (e.g., 90 days or 1 year).
  - **Rate Limits:** Respect Strava's 100 requests/15 min and 1000/day limits. Pagination eats into this quickly. Strategy: Only deep sync on initial connect; rely on webhooks thereafter.

### 2. Advanced Progress Analytics (Efficiency Trends)
**Goal:** Visual proof of fitness improvement independent of race results.

- **Metric:** Aerobic Efficiency (EF) = Speed (m/min) / Heart Rate (bpm).
  - *Alternative:* Pace vs HR directly (scatter plot). "Lower HR at same Pace" or "Faster Pace at same HR".
- **Chart:**
  - **X-Axis:** Date (Time).
  - **Y-Axis:** Efficiency Metric (e.g., "Heart Beats per Km" or "Pace @ 140bpm").
  - **Data Points:** Individual "Easy Run" activities.
  - **Trend:** Linear regression line showing improvement (slope).
- **Filters:**
  - **Workout Type:** Vital. Only include "Easy/General" runs. Exclude Intervals/Tempos/Races where HR is decoupled by design (drift) or intensity is variable.
  - **Outliers:** Exclude runs < 20 min or with bad HR data (zeros).

### 3. Insight Synthesis Fixes
**Goal:** Reliable, clean coaching summary.

- **Reliability:** The synthesis must appear every time data is sufficient.
- **Presentation:** Pure text (Markdown). No code blocks, no JSON keys (`{"summary": "..."}`).
- **Failure Mode:** If AI fails to adhere to format, fallback to a "Simple Summary" (computed locally) or a generic "Training looks consistent" message rather than showing an error or raw JSON.

## Feature Interactions
- **Sync -> Analytics:** Webhook updates ensure the Analytics chart is always up-to-date with the latest run.
- **Analytics -> Insights:** The new efficiency trend should be fed into the AI Coach context for the "Progress" section of the synthesis.

## Table Stakes vs Differentiators
- **Table Stakes:** Syncing all runs (not just 100). Webhooks.
- **Differentiators:** The Efficiency Trend chart (Strava Premium feature usually, or TrainingPeaks). AI interpretation of that trend ("Your efficiency is improving, meaning base training is working").
