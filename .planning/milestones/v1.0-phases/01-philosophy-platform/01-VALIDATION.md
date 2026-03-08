---
phase: 1
slug: philosophy-platform
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-05
---

# Phase 1 - Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest + playwright |
| **Config file** | `vitest.config.js`, `playwright.config.ts` |
| **Quick run command** | `npm run test -- tests/unit/coach.test.jsx` |
| **Full suite command** | `npm run test` |
| **Estimated runtime** | ~45 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run test -- tests/unit/coach.test.jsx`
- **After every plan wave:** Run `npm run test`
- **Before `$gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 1-01-01 | 01 | 1 | PHIL-01 | integration | `npm run test:integration -- tests/integration/supabase-crud.spec.ts` | ✅ | ⬜ pending |
| 1-01-02 | 01 | 1 | PHIL-02 | integration | `npm run test:integration -- tests/integration/edge-functions.spec.ts` | ✅ | ⬜ pending |
| 1-02-01 | 02 | 2 | PHIL-02 | component | `npm run test -- tests/unit/coach.test.jsx` | ✅ | ⬜ pending |
| 1-02-02 | 02 | 2 | PHIL-01 | component | `npm run test -- tests/unit/insights.test.jsx` | ✅ | ⬜ pending |
| 1-03-01 | 03 | 3 | PHIL-01 | integration | `npm run test:integration -- tests/integration/supabase-crud.spec.ts` | ✅ | ⬜ pending |
| 1-03-02 | 03 | 3 | PHIL-02 | integration | `npm run test:integration -- tests/integration/edge-functions.spec.ts` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- Existing infrastructure covers all phase requirements.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Admin nav visibility gate | PHIL-02 | Role-gated visual behavior | Log in as owner/admin and non-admin test user; verify `Admin` nav item visibility differs as expected. |
| Publish + rollback usability | PHIL-01 | UX flow validation | From Admin page, create draft, publish with note, rollback to previous version, confirm active snapshot changes correctly. |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 60s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending

