# Quick Task 9 Plan

**Description:** Make improvement to chart in innsikt page. I have described the change in `docs/chart_improvement.md`
**Date:** 2026-03-13
**Status:** Ready

## Task 1
- **Files:** `src/domain/compute.js`, `tests/unit/compute.test.js`
- **Action:** Replace the current reference-workout helper with an endurance efficiency helper that filters valid aerobic activities and computes efficiency factor, decoupling, and a 30-day rolling average data set.
- **Verify:** Unit tests cover filtering, efficiency calculation, decoupling behavior, and rolling-average output shape.
- **Done:** Analytics helpers match the chart specification and return stable chart-ready data.

## Task 2
- **Files:** `src/pages/InsightsPage.jsx`, `tests/unit/insights.test.jsx`
- **Action:** Rework the Innsikt page chart area to show the efficiency trend and decoupling-vs-duration scatter, update copy/tooltips/empty states, and remove the old reference-run filter logic.
- **Verify:** Insights page tests assert the new chart section labels and empty-state behavior.
- **Done:** The page presents the new charts and explanatory copy based on the new compute helpers.

## Task 3
- **Files:** `src/pages/InsightsPage.jsx`, `tests/unit/compute.test.js`, `tests/unit/insights.test.jsx`
- **Action:** Run targeted tests and adjust any integration details needed to keep the quick task self-contained.
- **Verify:** `npm test -- --run tests/unit/compute.test.js tests/unit/insights.test.jsx`
- **Done:** The changed analytics and page behavior pass their relevant tests.
