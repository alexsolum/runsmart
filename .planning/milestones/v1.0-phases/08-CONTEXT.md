# Context: Phase 8 - Insight Reliability

**Phase Number:** 8
**Goal:** Ensure coaching synthesis is always presented as clean, formatted Markdown without artifacts.

## Decisions

### Sanitization Ownership
- **Server-Side Truth:** The `gemini-coach` Edge Function is 100% responsible for sanitizing the output. It must return a "ready-to-render" Markdown string.
- **Strict Plucking:** The sanitizer will use regex to find the required sections (`Mileage Trend`, `Intensity Distribution`, `Long-Run Progression`, `Race Readiness`) and extract only the content between them, discarding code blocks (```json), markdown fences, and AI "chatter."
- **JSON Envelope:** Retain the `{ "synthesis": "..." }` response shape for consistency with other modes.
- **Logging:** Malformed or heavily sanitized responses must be logged for admin review to improve future prompt engineering.

### Markdown Schema & Rendering
- **Flavor:** Rich Markdown support including `###` Headers, `**Bold**`, and `-` Bullet points.
- **Section Headers:** Use standard H3 Markdown headers: `### Section Name`.
- **UI Rendering:** Use the `react-markdown` library in `InsightsPage.jsx` to render the `synthesis` string.
- **Tone:** Free-flow text blocks within sections, allowing the coach to use lists or bold text as needed for clarity.

## Code Context

### Relevant Files
- `supabase/functions/gemini-coach/index.ts`: The primary logic for prompting and sanitization.
- `src/pages/InsightsPage.jsx`: Where the synthesis is fetched and rendered.
- `package.json`: Need to add `react-markdown` dependency.

### Reusable Patterns
- **Regex Sanitization:** Look at existing `stripMarkdownFences` in `gemini-coach` and enhance it.
- **Edge Function WaitUntil:** Use background logging for malformed responses if needed.

## Deferred / Out of Scope
- local fallback Repair logic (if plucking fails, use the existing hard-coded fallback).
- Interactive editing of the AI summary by the user.
- Custom styling for individual Markdown elements (use project defaults).
