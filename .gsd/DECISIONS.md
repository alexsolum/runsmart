# Decisions

<!-- Append-only register of architectural and pattern decisions -->

| ID | Decision | Rationale | Date |
|----|----------|-----------|------|
| D001 | isAdmin bootstrap: tableEmpty (count=0) \|\| existing row | OR logic resolves deadlock without changing App.jsx or edge function | 2026-03-08 |
| D002 | Server-side ensureAdminAccess() handles row insertion | Actual row insertion on first saveDraft mutation for efficiency | 2026-03-08 |
| D003 | Adaptation_summary stored as separate useState in CoachPage | Consistent with each page's existing state shape | 2026-03-11 |
| D004 | computeTrainingLoadState: locked TSB thresholds | >10=good_form, >=-5=neutral, >=-15=accumulating_fatigue, else overreaching_risk | 2026-03-11 |
| D005 | INSG-02 Synthesis callout silently omitted on error | No error UI displayed to user to avoid distraction | 2026-03-11 |
| D006 | Synthesis Cache: module-level object (not localStorage) | Survives SPA navigation, resets on browser reload, lang-keyed | 2026-03-12 |
| D007 | Aerobic efficiency regression thresholds (R²) | >=0.5=strong, >=0.25=moderate, else weak | 2026-03-12 |
| D008 | Aerobic efficiency outliers ±20% excluded | Focus on reliable data points for regression | 2026-03-12 |
