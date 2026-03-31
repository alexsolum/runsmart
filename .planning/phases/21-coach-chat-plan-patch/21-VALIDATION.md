---
phase: 21
slug: coach-chat-plan-patch
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-31
---

# Phase 21 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | vitest.config.js |
| **Quick run command** | `npm test -- --run` |
| **Full suite command** | `npm test -- --run` |
| **Estimated runtime** | ~15 seconds |

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
| 21-01-01 | 01 | 1 | COACH-02 | unit | `npm test -- --run tests/unit/coachPayload.test.js` | ✅ | ⬜ pending |
| 21-01-02 | 01 | 1 | COACH-02 | unit | `npm test -- --run tests/unit/claudeCoach.schema.test.js` | ✅ | ⬜ pending |
| 21-02-01 | 02 | 2 | COACH-02 | component | `npm run build` | ✅ | ⬜ pending |
| 21-02-02 | 02 | 2 | COACH-03 | component | `npm test -- --run tests/unit/coach.test.jsx` | ✅ | ⬜ pending |
| 21-03-01 | 03 | 3 | COACH-03 | component | `npm run build` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/coachPayload.test.js` — unit tests for buildHierarchicalPlanWindow()
- [ ] `tests/coach.test.jsx` — component tests for ChangeCard and updated CoachPage

*Existing vitest infrastructure covers framework setup.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Applying a patch updates plan viewer in real-time without page reload | COACH-03 | Requires live Supabase RPC round-trip and React re-render observable | 1. Open LongTermPlanPage. 2. Open coach chat. 3. Ask for a plan change. 4. Accept the Change Card. 5. Verify plan grid updates immediately. |
| Claude response is grounded in the user's actual plan data | COACH-02 | Requires inspection of AI response content | 1. Ask coach "What is my long run this weekend?" 2. Verify response matches actual scheduled workout. |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
