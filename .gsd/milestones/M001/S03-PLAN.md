# S03: Insight Reliability

**Vision:** Ensure coaching synthesis is always presented as clean, formatted Markdown without artifacts.

## Success Criteria

1. Synthesis callout never renders raw JSON or code block syntax.
2. Sanitize pipeline strips artifacts before render.
3. AI response adheres to strict Markdown contract.

## Implementation Tasks

### 1. Database Infrastructure
- [ ] **T01: DB Update:** Create `ai_audit_logs` table to track malformed or failed AI responses.
- [ ] **T02: Migration:** Apply migration for the new table.

### 2. Edge Function Enhancements (`gemini-coach`)
- [ ] **T03: Pluck Synthesis Sections:** Implement regex extraction logic for headings.
- [ ] **T04: Sanitized Markdown:** Implement `rebuildSanitizedMarkdown` to format sections as H3 Markdown.
- [ ] **T05: Failure Logging:** Integrate `logAiFailure` for fire-and-forget logging of missing sections.
- [ ] **T06: Payload Update:** Ensure `synthesis` field in response contains the sanitized Markdown.

### 3. Frontend Implementation (`InsightsPage.jsx`)
- [ ] **T07: Markdown Package:** Add `react-markdown` to `package.json`.
- [ ] **T08: Component Integration:** Update `InsightsPage.jsx` to use `react-markdown` with Tailwind prose styling.
- [ ] **T09: Custom Styling:** Customize Markdown components (h3, p, strong, ul, li) to match app branding.

### 4. Verification & Testing
- [ ] **T10: Strip Fences:** Verify that raw JSON/Markdown fences are stripped from the UI.
- [ ] **T11: Audit Logs:** Verify that audit logs are populated when the AI returns non-compliant text.
- [ ] **T12: Graceful Fallback:** Ensure `react-markdown` handles edge cases like empty sections gracefully.

## Summary

This slice is planned for v1.1 to address formatting issues in AI-generated coaching summaries that were observed during early testing in v1.0.
The goal is to move from raw text display to a structured Markdown contract with sanitization and auditing.
