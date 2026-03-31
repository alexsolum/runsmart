# Deferred Items

## 2026-03-24

- `npm test -- --run` has unrelated pre-existing failures outside plan 14-01 scope:
  - `tests/unit/dashboard.layout.test.jsx`
  - `tests/unit/i18n.test.jsx`
  - `tests/unit/weeklyplan.test.jsx`
- These were not modified during plan 14-01 and were intentionally left unchanged.
- During plan 14-02 execution, full-suite run still shows out-of-scope failures in:
  - `tests/unit/dashboard.layout.test.jsx`
  - `tests/unit/i18n.test.jsx`
- `tests/unit/weeklyplan.test.jsx` now has a remaining date-context assertion (`Build` intent text) that is not required by 14-02 acceptance criteria and was left for follow-up test hardening.
