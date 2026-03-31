---
phase: 12
slug: design-token-foundation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-24
---

# Phase 12 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3.0 + React Testing Library |
| **Config file** | `vitest.config.js` |
| **Quick run command** | `npm test -- --run --reporter=verbose` |
| **Full suite command** | `npm test -- --run` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test -- --run --reporter=verbose`
- **After every plan wave:** Run `npm test -- --run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 12-01-01 | 01 | 1 | DSGN-01 | unit (CSS parse) | `npm test -- --run --project=unit` | No — Wave 0 | pending |
| 12-01-02 | 01 | 1 | DSGN-02 | unit (CSS parse) | `npm test -- --run --project=unit` | No — Wave 0 | pending |
| 12-01-03 | 01 | 1 | DSGN-02 | manual-only | Visual check in browser | N/A | pending |
| 12-01-04 | 01 | 1 | DSGN-03 | lint/grep | `grep -n "1px solid" src/styles/pa-tokens.css` | N/A | pending |
| 12-01-05 | 01 | 1 | DSGN-04 | unit (CSS parse) | `npm test -- --run --project=unit` | No — Wave 0 | pending |
| 12-01-06 | 01 | 1 | DSGN-04 | lint/grep | `grep -n "webkit-backdrop-filter" src/styles/pa-tokens.css` | N/A | pending |

*Status: pending / green / red / flaky*

---

## Wave 0 Requirements

- [ ] `tests/unit/pa-tokens.test.js` — asserts `--pa-primary`, surface hierarchy values, glassmorphism tokens, and font stack vars are defined correctly in `pa-tokens.css`

Test approach: read `pa-tokens.css` as text file in Node.js and assert expected variable names and values using string matching (jsdom has no CSS engine).

*Existing infrastructure covers test framework — only the test file is needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Manrope + Inter render visually in browser | DSGN-02 | jsdom has no font rendering engine | Open localhost:5173, inspect headline text — DevTools Computed tab shows "Manrope" |
| Existing pages visually unchanged | Phase SC #5 | Visual regression requires screenshot comparison | Compare HeroPage, CoachPage, InsightsPage before/after in browser |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
