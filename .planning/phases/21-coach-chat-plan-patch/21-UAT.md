---
status: partial
phase: 21-coach-chat-plan-patch
source: [21-01-SUMMARY.md, 21-02-SUMMARY.md, 21-03-SUMMARY.md, 21-03-EXECUTION-SUMMARY.md]
started: 2026-04-05T15:39:28.5065220+02:00
updated: 2026-04-05T16:09:53.8441991+02:00
---

## Current Test

[testing complete]

## Tests

### 1. Cold Start Smoke Test
expected: Stop any running dev server for the app, then start it again from scratch. The app should boot cleanly on localhost without startup errors, and the primary coach flow should still be reachable after reload.
result: pass

### 2. Coach Page Chat Send/Receive
expected: Open `/coach`, send a short coaching message such as "How's my aerobic base?", and receive a Claude response in the thread. The request should succeed without a 401 or missing-bearer-token auth error.
result: pass
note: Coach responded successfully even with sparse recent-training data in the payload; missing history is a known data-seeding follow-up, not a phase 21 regression.

### 3. CoachFAB Visibility and Overlay
expected: Open `/train` with a plan loaded. A floating Coach button is visible in the bottom-right corner, and clicking it opens the coaching chat overlay.
result: blocked
blocked_by: prior-phase
reason: "There is no plan available and i am not able to create a plan, so this is not testable."

### 4. Patch Proposal and Apply
expected: Ask for a concrete schedule adjustment such as replacing a planned run with a rest day. The assistant should return coaching text plus a ChangeCard with apply/dismiss controls, and clicking Apply should update the visible plan without a full page reload.
result: blocked
blocked_by: prior-phase
reason: "I have no plan so not able to test"

### 5. Conversation Persistence Across Surfaces
expected: Start a conversation on the Coach page, then open CoachFAB on the training plan page. The same conversation history should remain available across both surfaces, and a follow-up from one surface should appear on the other.
result: issue
reported: "There is no CoachFAB on the training plan page"
severity: major

### 6. Signed-Out Chat Error Handling
expected: When there is no active session, attempting to send a coach message should fail gracefully with a clear sign-in/auth message instead of hanging or crashing the UI.
result: blocked
blocked_by: other
reason: "Not able to test as the coach message is not possible in an inactive session"

## Summary

total: 6
passed: 2
issues: 1
pending: 0
skipped: 0
blocked: 3

## Gaps

- truth: "The same conversation history should remain available across Coach page and CoachFAB on the training plan page"
  status: failed
  reason: "User reported: There is no CoachFAB on the training plan page"
  severity: major
  test: 5
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""
