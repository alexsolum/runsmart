# PR: feat: P1 Typography & Identity — Fjell & Fart design system

**Branch:** `claude/runsmart-design-plan-HeTaI` → `main`

---

## Summary

- **Replace Inter with a distinctive three-font system** that transforms RunSmart from a generic template into a crafted product:
  - **Instrument Serif** for headings (h1–h3) and brand marks — elegant, confident, unexpected for a sports app
  - **DM Sans** for body/UI text — clean geometric sans with more character than Inter
  - **JetBrains Mono** for numeric data (KPI values, distances, paces, durations, stats) — technical authority
- **Added design task backlog** (IMP-001 through IMP-010) to `docs/agent_tasks.md` covering the full "Fjell & Fart" frontend design overhaul plan

### Files changed (13 files)

| Area | Changes |
|------|---------|
| `index.html` | Single Google Fonts link loading all 3 families |
| `src/styles/tokens.css` | Added `--font-family-serif` and `--font-family-mono` CSS custom properties |
| `src/styles/index.css` | Tailwind `@theme` override for `font-sans/serif/mono` utilities; global `h1–h3` serif rule; `.dashboard-kpi strong` mono rule; brand selectors |
| `src/styles.css` | Body font-family updated to DM Sans |
| `src/App.jsx` | `font-serif` on sidebar brand text |
| `src/pages/AuthPage.jsx` | `font-serif` on login brand text |
| `src/pages/HeroPage.jsx` | `font-mono` on KPI values, activity feed distances/durations |
| `src/pages/InsightsPage.jsx` | `font-mono` on KPI cards, fitness score, long run progress, form/readiness/risk stats |
| `src/pages/CoachPage.jsx` | `font-mono` on wellness summary stats (fatigue, sleep, mood) |
| `src/pages/WeeklyPlanPage.jsx` | `font-mono` on workout distances/durations, summary bar stats |
| `src/pages/DailyLogPage.jsx` | `font-mono` on metric chip values |
| `docs/agent_tasks.md` | Added IMP-001 (done) through IMP-010 design improvement tasks |

## Test plan

- [x] All 244 tests pass (`npm test -- --run`)
- [x] Production build succeeds (`npm run build`)
- [ ] Visual check: headings render in Instrument Serif
- [ ] Visual check: body text renders in DM Sans
- [ ] Visual check: KPI values, distances, paces render in JetBrains Mono
- [ ] Visual check: "RunSmart" brand text uses serif in sidebar and auth page
