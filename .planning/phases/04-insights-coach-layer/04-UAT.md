---
status: complete
phase: 04-insights-coach-layer
source:
  - 04-01-SUMMARY.md
  - 04-02-SUMMARY.md
started: 2026-03-07T07:32:41+01:00
updated: 2026-03-07T07:40:54+01:00
---

## Current Test

[testing complete]

## Tests

### 1. Cold Start Smoke Test
expected: Stop any running local app process, then start the app from scratch. The app should boot without startup errors, load the dashboard shell, and allow opening Insights without crashing.
result: pass

### 2. Training Load Overlay Callout
expected: On Insights with activity data, a coach overlay callout appears below the Training Load Trend chart and shows state/trend text (not empty placeholders).
result: pass

### 3. Overlay Visibility Guard
expected: When Insights has no activity data, the Training Load overlay callout is not shown.
result: skipped
reason: User reported they could not test this because their account has data.

### 4. Insights Synthesis Callout Content
expected: On Insights with activity data, a synthesis callout appears above the KPI strip with a thorough coach paragraph (not raw JSON like {"synthesis": ...}).
result: issue
reported: "I still see the json formattin: { \"synthesis\": \"Your training has seen a significant increase in volume, jumping from 49.5km to 10 It is also a short text. I want it to be a bit longer (like 3-5 rows of text). I would like it to be structured into three sections: 1. Milage (km) development 2. Distribution of paces/intensity 3. Long run progression  4. Race readiness - It should base its feedback on the charts and based on data for the last 10-12 weeks"
severity: major

### 5. Synthesis Loading State
expected: On initial Insights load (before synthesis completes), a skeleton placeholder appears briefly and then is replaced by synthesis text.
result: pass

### 6. Coach Navigation Reachability
expected: From main navigation, opening Coach and returning to Insights works without broken navigation states.
result: pass

## Summary

total: 6
passed: 4
issues: 1
pending: 0
skipped: 1

## Gaps

- truth: "Insights synthesis callout renders a thorough plain-text paragraph and never raw JSON"
  status: failed
  reason: "User reported: I still see the json formattin: { \"synthesis\": \"Your training has seen a significant increase in volume, jumping from 49.5km to 10 ... and it is too short; requested longer structured feedback across mileage, intensity distribution, long run progression, race readiness, based on last 10-12 weeks."
  severity: major
  test: 4
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""
