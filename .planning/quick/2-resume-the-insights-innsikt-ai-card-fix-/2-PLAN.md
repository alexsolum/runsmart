# Quick Task 2: Resume the Insights / Innsikt AI card fix and finish deployment

**Created:** 2026-03-12
**Status:** In Progress

## Task 1
- Files: `supabase/functions/gemini-coach/index.ts`, `supabase/functions/gemini-coach/playbook.ts`, `supabase/functions/gemini-coach/config.toml`
- Action: Verify the local `gemini-coach` synthesis fix is present exactly as intended and confirm the function package is ready for redeploy without touching unrelated worktree changes.
- Verify: The function keeps `gemini-2.5-flash`, trims each synthesis section individually before rebuilding markdown, and no longer slices the final synthesis payload to 2000 characters.
- Done: Local deploy candidate is confirmed.

## Task 2
- Files: deployed `gemini-coach` edge function on Supabase project `rhbnzzxzltjtposwpfin`
- Action: Redeploy the updated `gemini-coach` edge function using MCP with the verified local source files.
- Verify: Deployment succeeds and the live function reflects the updated source.
- Done: The live edge function is updated with the synthesis fix.

## Task 3
- Files: live app `https://runsmart-ten.vercel.app`, runtime `gemini-coach` response path
- Action: Re-test the live Insights/Innsikt page and confirm the synthesis card renders from the deployed response rather than only returning HTTP 200.
- Verify: The DOM contains `data-testid="synthesis-callout"` or all four required section headings.
- Done: Live rendering status is confirmed and documented.
