---
phase: 22
slug: cleanup-deprecation
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-05
---

# Phase 22 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest + playwright + Supabase CLI |
| **Config file** | `vitest.config.js` |
| **Quick run command** | `npm test -- --run tests/unit/insights.test.jsx tests/unit/trainingplan.test.jsx tests/unit/coach.test.jsx` |
| **Full suite command** | `npm run build && npm test -- --run tests/unit/insights.test.jsx tests/unit/trainingplan.test.jsx tests/unit/coach.test.jsx tests/unit/coachPayload.test.js tests/unit/claudeCoach.schema.test.js && npm run test:integration && npm run test:ai` |
| **Estimated runtime** | ~25-30 seconds for task-level feedback; longer only at wave/phase gates |

---

## Sampling Rate

- **After every task commit:** Run that task's targeted `<automated>` command.
- **After every plan wave:** Run the wave gate listed below.
- **Before `$gsd-verify-work`:** Full suite plus the deployment audit must be green.
- **Max feedback latency:** 30 seconds for task-level checks.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 22-01-01 | 01 | 1 | CLEAN-01 | unit | `npm test -- --run tests/unit/insights.test.jsx tests/unit/coachPayload.test.js tests/unit/claudeCoach.schema.test.js` | ✅ | ⬜ pending |
| 22-01-02 | 01 | 1 | CLEAN-03 | unit | `npm test -- --run tests/unit/trainingplan.test.jsx` | ✅ | ⬜ pending |
| 22-01-03 | 01 | 1 | CLEAN-01, CLEAN-03 | unit | `npm test -- --run tests/unit/insights.test.jsx tests/unit/trainingplan.test.jsx tests/unit/coach.test.jsx` | ✅ | ⬜ pending |
| 22-02-01 | 02 | 2 | CLEAN-01 | filesystem | `pwsh -NoProfile -Command "if (Test-Path 'supabase/functions/gemini-coach') { Write-Error 'supabase/functions/gemini-coach still exists'; exit 1 }"` | ✅ | ⬜ pending |
| 22-02-02 | 02 | 2 | CLEAN-03 | unit | `npm test -- --run tests/unit/coach.test.jsx tests/unit/insights.test.jsx tests/unit/trainingplan.test.jsx` | ✅ | ⬜ pending |
| 22-02-03 | 02 | 2 | CLEAN-01, CLEAN-03 | audit + deployment | `pwsh -NoProfile -Command "$before = supabase functions list --project-ref <project-ref>; if ($before -match 'gemini-coach') { supabase functions delete gemini-coach --project-ref <project-ref> --yes | Out-Host }; $after = supabase functions list --project-ref <project-ref>; if ($after -match 'gemini-coach') { throw 'gemini-coach still deployed' }; rg -n 'gemini-coach|WeeklyPlanPage|WeeklyAiCard|useCoachPhilosophy|WEEKLY_PLAN_HANDOFF_KEY' src tests supabase docs README.md CLAUDE.md"` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave Gates

- **Wave 1 gate:** `npm test -- --run tests/unit/insights.test.jsx tests/unit/trainingplan.test.jsx tests/unit/coach.test.jsx tests/unit/coachPayload.test.js tests/unit/claudeCoach.schema.test.js`
- **Wave 2 gate:** `npm run build && npm run test:integration && npm run test:ai`
- **Phase close gate:** `pwsh -NoProfile -Command "$before = supabase functions list --project-ref <project-ref>; if ($before -match 'gemini-coach') { supabase functions delete gemini-coach --project-ref <project-ref> --yes | Out-Host }; $after = supabase functions list --project-ref <project-ref>; if ($after -match 'gemini-coach') { throw 'gemini-coach still deployed' }; rg -n 'gemini-coach|WeeklyPlanPage|WeeklyAiCard|useCoachPhilosophy|WEEKLY_PLAN_HANDOFF_KEY' src tests supabase docs README.md CLAUDE.md"`

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Weekly planner route/navigation is gone and the hierarchical plan remains the only plan UX | CLEAN-03 | Requires live app navigation confirmation after route removal | 1. Open the app shell. 2. Verify no weekly plan nav entry exists. 3. Navigate through the surviving plan viewer and confirm `LongTermPlanPage` still loads and functions. |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency <= 30s for task-level checks
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
