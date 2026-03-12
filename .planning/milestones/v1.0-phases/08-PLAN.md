# Plan: Phase 8 - Insight Reliability

**Phase Number:** 8
**Goal:** Ensure coaching synthesis is always presented as clean, formatted Markdown without artifacts.

## Tasks

### 1. Database Infrastructure
- [ ] Create `ai_audit_logs` table to track malformed or failed AI responses.
- [ ] Apply migration for the new table.

### 2. Edge Function Enhancements (`gemini-coach`)
- [ ] Implement `pluckSynthesisSections` regex extraction logic.
- [ ] Implement `rebuildSanitizedMarkdown` to format sections as H3 Markdown.
- [ ] Integrate `logAiFailure` for fire-and-forget logging of missing sections.
- [ ] Update response payload to ensure `synthesis` field contains the sanitized Markdown.

### 3. Frontend Implementation (`InsightsPage.jsx`)
- [ ] Add `react-markdown` to `package.json`.
- [ ] Install dependencies.
- [ ] Update `InsightsPage.jsx` to use `react-markdown` with Tailwind prose styling.
- [ ] Customize Markdown components (h3, p, strong, ul, li) to match app branding.

### 4. Verification & Testing
- [ ] Verify that raw JSON/Markdown fences are stripped from the UI.
- [ ] Verify that audit logs are populated when the AI returns non-compliant text.
- [ ] Ensure `react-markdown` handles edge cases like empty sections gracefully.

## Affected Files
- `supabase/migrations/20260312_ai_audit_logs.sql` (New)
- `supabase/functions/gemini-coach/index.ts`
- `src/pages/InsightsPage.jsx`
- `package.json`

## Implementation Steps

1. **Migration:** Create the `ai_audit_logs` table with `id`, `created_at`, `user_id`, `mode`, `raw_response`, `error_type`, and `metadata`.
2. **Edge Function:** 
   - Define `REQUIRED_HEADINGS`.
   - Add `pluckSynthesisSections` and `rebuildSanitizedMarkdown`.
   - Wrap the Gemini response processing in the new sanitization logic.
   - Add the `logAiFailure` helper using the service role key or user's client if applicable (prefer service role for logging).
3. **Frontend:**
   - `npm install react-markdown`.
   - Update `InsightsPage.jsx` to replace any raw text display of synthesis with `<ReactMarkdown>`.
   - Apply the Tailwind `prose` classes and custom component overrides.

## Acceptance Criteria
1. Coaching synthesis in `InsightsPage` shows zero "chatter" or code blocks (```).
2. Headers are rendered as styled H3 elements.
3. Lists and bold text are correctly formatted.
4. Database contains logs for any responses that failed the regex extraction.
