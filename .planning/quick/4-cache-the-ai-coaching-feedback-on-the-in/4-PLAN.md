---
phase: quick-4
plan: 4
type: execute
wave: 1
depends_on: []
files_modified:
  - src/pages/InsightsPage.jsx
autonomous: true
requirements: []
must_haves:
  truths:
    - "Navigating away from Innsikt and back does not trigger a new Gemini call within the same session"
    - "After 1 hour the cache is stale and a fresh call is made on the next page visit"
    - "Switching language (no/en) fetches fresh feedback for that language"
    - "First page visit still fetches normally and displays the synthesis"
  artifacts:
    - path: "src/pages/InsightsPage.jsx"
      provides: "Module-level synthesis cache with TTL"
      contains: "SYNTHESIS_CACHE"
  key_links:
    - from: "synthesisFetchedRef / useEffect"
      to: "SYNTHESIS_CACHE"
      via: "cache hit check before invoking gemini-coach"
      pattern: "SYNTHESIS_CACHE"
---

<objective>
Cache the AI coaching synthesis (insights_synthesis mode) in InsightsPage so that navigating away and back within a session does not trigger a new Gemini Edge Function call.

Purpose: Gemini calls take 3-6 seconds and cost tokens. The synthesis content does not change meaningfully between page navigations — it only needs to refresh once per hour or when the language changes.

Output: Module-level in-memory cache in InsightsPage.jsx with a 1-hour TTL, keyed by language. First load fetches normally; subsequent visits within TTL show cached content instantly.
</objective>

<execution_context>
@C:/Users/HP/.claude/get-shit-done/workflows/execute-plan.md
@C:/Users/HP/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@src/pages/InsightsPage.jsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add module-level synthesis cache with TTL to InsightsPage</name>
  <files>src/pages/InsightsPage.jsx</files>
  <action>
Add a module-level (outside the component) cache object just before the component function definition:

```js
// ── Synthesis cache (module-level, survives navigation, resets on full page reload) ──
const SYNTHESIS_CACHE = {
  // keyed by lang: { text: string, cachedAt: number }
};
const SYNTHESIS_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
```

Then update the synthesis fetch logic (~line 734-778). Replace the current two `useEffect` blocks:

```js
// ── Synthesis callout state ───────────────────────────────────────────────

const [synthesis, setSynthesis] = useState(null);
const [synthesisLoading, setSynthesisLoading] = useState(false);
const synthesisFetchedRef = useRef(false);

useEffect(() => {
  synthesisFetchedRef.current = false;
  setSynthesis(null);
}, [lang]);

useEffect(() => {
  if (!hasData || synthesisFetchedRef.current) return;
  synthesisFetchedRef.current = true;
  ...
```

With this updated version:

```js
// ── Synthesis callout state ───────────────────────────────────────────────

const [synthesis, setSynthesis] = useState(() => {
  // Hydrate from module cache on mount if valid
  const cached = SYNTHESIS_CACHE[lang];
  if (cached && Date.now() - cached.cachedAt < SYNTHESIS_CACHE_TTL_MS) {
    return cached.text;
  }
  return null;
});
const [synthesisLoading, setSynthesisLoading] = useState(false);
const synthesisFetchedRef = useRef(false);

// When language changes: clear state and invalidate the ref so fetch runs again
useEffect(() => {
  const cached = SYNTHESIS_CACHE[lang];
  const isValid = cached && Date.now() - cached.cachedAt < SYNTHESIS_CACHE_TTL_MS;
  synthesisFetchedRef.current = isValid;
  setSynthesis(isValid ? cached.text : null);
}, [lang]);

useEffect(() => {
  if (!hasData || synthesisFetchedRef.current) return;
  synthesisFetchedRef.current = true;
  setSynthesisLoading(true);

  (async () => {
    try {
      const client = getSupabaseClient();
      const payload = await buildCoachPayload({
        activities,
        dailyLogs,
        checkins,
        activePlan: plans.plans[0] ?? null,
        trainingBlocks,
        runnerProfile,
        lang,
        mode: "insights_synthesis",
      });
      const { data, error } = await client.functions.invoke("gemini-coach", {
        body: { mode: "insights_synthesis", ...payload },
      });
      if (!error && data?.synthesis) {
        const { text, isTrusted } = sanitizeSynthesisText(data.synthesis);
        if (isTrusted || hasRequiredSynthesisHeadings(text, lang)) {
          // Store in module-level cache before setting state
          SYNTHESIS_CACHE[lang] = { text, cachedAt: Date.now() };
          setSynthesis(text);
        }
      }
    } catch {
      // silent fail — callout is omitted
    } finally {
      setSynthesisLoading(false);
    }
  })();
}, [activities, checkins, dailyLogs, hasData, lang, plans.plans, runnerProfile, trainingBlocks]);
```

Key behaviors:
- `useState` initializer checks the cache at mount — if valid, synthesis renders instantly with no loading skeleton.
- The lang-change `useEffect` sets `synthesisFetchedRef.current = true` when cache is valid, preventing a redundant fetch.
- After a successful fetch, the result is written to `SYNTHESIS_CACHE[lang]` before `setSynthesis`.
- TTL is 1 hour. Switching language fetches fresh for that language (different cache key).
- Module-level cache resets on full page reload (browser refresh), which is the correct behavior.
  </action>
  <verify>
    <automated>npm test -- --run 2>&1 | tail -20</automated>
  </verify>
  <done>
- Navigating away from Innsikt and back shows the cached synthesis instantly (no loading skeleton, no Gemini call in network tab).
- First visit fetches normally and displays synthesis.
- Changing language clears the cache entry for the previous language and fetches fresh for the new language.
- `npm test -- --run` passes with no new failures.
  </done>
</task>

</tasks>

<verification>
Manual smoke test after deploy:
1. Visit Innsikt page — synthesis loads after a few seconds (normal).
2. Navigate to another page (e.g. Dashboard) and back to Innsikt — synthesis appears instantly, no skeleton.
3. Switch language in sidebar — synthesis clears and reloads for the new language.
4. Run `npm test -- --run` — all tests pass.
</verification>

<success_criteria>
The `gemini-coach` edge function is called at most once per language per hour regardless of how many times the user visits InsightsPage. Synthesis renders instantly on cached visits.
</success_criteria>

<output>
After completion, create `.planning/quick/4-cache-the-ai-coaching-feedback-on-the-in/4-SUMMARY.md` with what was done, files modified, and any decisions made.
</output>
