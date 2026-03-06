---
status: approved
phase: 01-philosophy-platform
source: [01-01-SUMMARY.md, 01-02-SUMMARY.md, 01-03-SUMMARY.md, 01-04-SUMMARY.md]
started: 2026-03-06T00:00:00Z
updated: 2026-03-06T08:10:00Z
---

## Current Test

[UAT approved by user on 2026-03-06]

## Tests

### 1. Admin Nav Entry
expected: Open the app. The top-level sidebar/navigation should show an "Admin" entry — but only when the logged-in user has the owner/admin role. If you are logged in as the owner, the Admin link is visible. If not present at all, that is the issue to report.
result: passed

### 2. Admin Philosophy Page Loads
expected: Click the Admin nav entry. The Admin Philosophy page loads and shows a structured editing form with required sections (e.g. sections like "Philosophy", "Methodology", or similar template sections). The page also shows a status indicator (Draft or Published) and a version number.
result: passed

### 3. Draft Save with Section Enforcement
expected: Fill in the required sections in the philosophy editor and click Save Draft. The draft saves successfully. If any required section is left empty, saving is blocked (button disabled or error shown). After saving, status shows "Draft".
result: passed

### 4. Publish Blocked Without Changelog
expected: With a draft saved, try to publish without entering a changelog entry. The Publish button should be disabled or clicking it should show an error requiring a changelog. You cannot publish without providing a changelog note.
result: passed

### 5. Publish With Changelog
expected: Enter a changelog message and then click Publish. The philosophy publishes successfully. The status indicator updates to "Published" and the version number increments.
result: passed

### 6. Rollback to Previous Version
expected: After publishing, a version history or rollback option is available. Triggering rollback restores a previous version and the status/version updates accordingly.
result: passed

### 7. Export as JSON
expected: An export button or action is available on the Admin Philosophy page. Clicking it downloads the philosophy document as a JSON file.
result: passed

## Summary

total: 7
passed: 7
issues: 0
pending: 0
skipped: 0

## Gaps

- truth: "Admin nav entry is visible to the owner/first authenticated user after app bootstraps their role"
  status: resolved
  reason: "Fixed in 01-04: useCoachPhilosophy.load() now runs a count query on coach_admins; if count===0 (table empty), first authenticated user gets isAdmin=true automatically."
  severity: blocker
  test: 1
  artifacts: [src/hooks/useCoachPhilosophy.js]
  missing: []
