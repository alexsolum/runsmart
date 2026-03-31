---
phase: 17
slug: claude-edge-function-plan-foundation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-30
---

# Phase 17 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (unit + component projects) |
| **Config file** | `vitest.config.js` |
| **Quick run command** | `npm test -- --run` |
| **Full suite command** | `npm test -- --run` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test -- --run`
- **After every plan wave:** Run `npm test -- --run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 17-xx-01 | TBD | 0 | COACH-01 | Unit | `npm test -- --run --project unit` | ❌ Wave 0 | ⬜ pending |
| 17-xx-02 | TBD | 1 | COACH-01 | Integration | curl test against deployed function | ❌ Wave 0 | ⬜ pending |
| 17-xx-03 | TBD | 1 | DATA-01 | Integration | Supabase SQL / migration verify | ❌ Wave 0 | ⬜ pending |
| 17-xx-04 | TBD | 1 | DATA-01 | Integration | `curl` without auth header → 401 | ❌ Wave 0 | ⬜ pending |
| 17-xx-05 | TBD | 2 | CLEAN-02 | Component | `npm test -- --run --project components` | ✅ existing | ⬜ pending |
| 17-xx-06 | TBD | 2 | CLEAN-02 | Unit | `npm test -- --run --project unit` | ✅ existing | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/unit/claudeCoach.schema.test.js` — validates running-only plan JSON shape (no swim/bike fields, required fields present) — covers COACH-01 schema correctness
- [ ] Manual curl test script documented in VERIFICATION.md — covers COACH-01 end-to-end response and DATA-01 401 auth boundary

*Test infrastructure (Vitest) already installed — no framework install needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Edge Function returns full hierarchical plan JSON with stop_reason="end_turn" | COACH-01 | Requires deployed Supabase Edge Function + valid ANTHROPIC_API_KEY secret | POST to claude-coach with valid JWT, assert response contains plan.phases array with ≥1 week per phase and daily workouts |
| Unauthenticated POST returns 401 | DATA-01 | Requires deployed function | `curl -X POST <function-url>` with no Authorization header — assert HTTP 401 |
| Token-limit guard returns 4xx | COACH-01 | Requires crafted oversized prompt | Send request with prompt exceeding limit — assert 422 or 400, not truncated 200 |
| Admin philosophy editor UI gone | CLEAN-02 | Visual verification | Load app, assert no Philosophy/Admin nav entry or route renders |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
