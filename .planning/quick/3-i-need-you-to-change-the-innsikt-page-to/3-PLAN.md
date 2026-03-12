# Quick Task 3: I need you to change the Innsikt page to norwegian as well (as i have selected norwegian in the sidebar navigation). All text on the page should be norwegian, as well as the response from the AI Coach (gemini)

**Date:** 2026-03-12
**Status:** Completed

## Plan

1. Update `src/pages/InsightsPage.jsx` so the page reads the selected app language, renders Norwegian copy on the Insights page, and sends the active language into `buildCoachPayload()` for `insights_synthesis`.
2. Update `supabase/functions/gemini-coach/index.ts` so the insights synthesis contract supports Norwegian headings and fallback content without breaking the four-section render gate.
3. Validate with a production build, redeploy `gemini-coach`, and attempt frontend deployment plus browser verification.
