# Feature Research

**Domain:** AI-powered endurance coaching + hierarchical training plan model (running/ultra-marathon app)
**Researched:** 2026-03-29
**Confidence:** HIGH for existing feature patterns; MEDIUM for Claude-specific coaching UX (still emerging)

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Full training plan generation in one interaction | Every major coaching platform (TrainingPeaks, TrainerRoad Plan Builder, Garmin Coach) produces a full periodized plan upfront. Users expect to see the whole arc — phases, weeks, and key workouts — not just the next week. | HIGH | Claude must output the complete plan JSON in a single call. The SKILL.md schema is already defined. Supabase Edge Function routes the call. Token budget is the main constraint (~8-12 week plans for marathon; ~20-24 weeks for ultra). |
| Phase-bar overview (Base → Build → Peak → Taper) | TrainerRoad, TrainingPeaks, and Garmin Coach all show the macrocycle phases across a timeline. Athletes orient themselves by phase. Without it, the plan is just a list of weeks. | MEDIUM | Phases are first-class in the JSON schema (`phases[]` array with `startWeek`/`endWeek`). Phase bar is a pure UI component that reads phase boundaries from the JSON. No new data needed. |
| Week row with 7-day column layout | Every endurance planning tool (TrainingPeaks calendar, Final Surge, Intervals.icu) shows weeks as horizontal rows of 7 day-cells. Athletes mentally model training in weeks. | MEDIUM | Existing 4-week grid (Phase 14) provides the visual primitive. Must extend to full plan length (8-24 weeks) with scroll. Week rows read from `weeks[]` in the plan JSON. |
| Workout cards with zone/type labels | Athletes need to know what each session is (Easy, Tempo, Long Run, Intervals) and at what zone to execute it. TrainingPeaks and Intervals.icu both show this on the card. | LOW | Workout type registry built in Phase 13. Color mapping exists. New: `primaryZone` field from SKILL.md JSON must render on the card. |
| Workout detail modal (full description + structure) | Tapping a workout card to see its full description, warm-up/cool-down structure, and zone guidance is standard on TrainingPeaks, Garmin Coach, and Intervals.icu. Athletes need this to actually execute the session. | MEDIUM | Extends the existing click-to-edit modal (Phase 15). New view-mode variant shows `humanReadable` structured workout text, `primaryZone`, `durationMinutes`, `distanceMeters`. Edit mode remains available. |
| Weekly hours + km summary per row | Every training platform shows the week's total load (hours and/or km) on each week row. TrainerRoad shows TSS; TrainingPeaks shows hours; Intervals.icu shows hours + distance. Users need to verify load at a glance. | LOW | SKILL.md schema has `summary.totalHours` and `summary.bySport` per week. Pure display — no new computation needed if data is in the plan JSON. |
| Mark workout as complete | Athletes expect to check off workouts. Garmin Coach, TrainingPeaks, and Final Surge all have this. It drives the fundamental feedback loop of coached training. | LOW | `completed` field exists in the workout JSON schema. Already exists as `toggleCompleted` in `useWorkoutEntries.js` for the weekly plan. Must be surfaced on the workout detail modal. |
| Conversational coaching chat | The primary differentiator of a Claude-powered coach is the conversation. Users expect to ask questions ("Why is this recovery week?", "Can we add an extra long run?") and get intelligent, context-aware answers. TrainingPeaks has a Coach Messaging product; Garmin Coach shows contextual rationale per workout. | HIGH | Replace the Gemini `gemini-coach` Edge Function with a Claude endpoint. Chat must have access to the full current plan JSON as context. Conversation history persists (`coach_messages` table already exists). |
| Manual plan trigger (not auto-replanning) | Users want to choose when AI regenerates their plan, not have it silently change. TrainerRoad's "Adaptive Training" offers this, and users complained when it changed plans unexpectedly. The PROJECT.md constraint says "replanning remains manual-trigger only." | LOW | Existing "generate → review → apply" flow pattern from v1.2. Applies to full plan generation too: Claude generates, user reviews, user confirms. No automatic background replanning. |
| Training zones displayed with workouts | Zone guidance (HR range, pace range) is table stakes for any coach-quality tool. TrainingPeaks structured workouts show target zones; Garmin Coach shows target heart rate ranges. Without zones, "Zone 2 run" is meaningless. | MEDIUM | Zones are in the plan JSON (`zones.run.hr.zones[]`). Must be accessible from the workout detail modal ("Zone 2: 139-153 bpm"). A zone reference panel (collapsible) in the plan viewer satisfies this. |

### Differentiators (Competitive Advantage)

Features that set the product apart. Not required for baseline function, but define the product.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Assessment-first plan generation (SKILL.md flow) | TrainingPeaks sells static pre-built plans by coach. Garmin Coach generates plans but doesn't validate with the athlete. The SKILL.md approach (assessment → validation → zones → periodization → plan) produces personalized plans that rivals what a professional coach would provide. Explainability builds trust. | HIGH | The Claude Edge Function must implement the multi-phase SKILL.md workflow. Phase 1 gathers Strava data. Phase 2 presents assessment for athlete validation. Phases 3-5 produce the plan. Each phase can be a separate API call or a single guided conversation. Single-call with full context is simpler for an Edge Function. |
| "Why" rationale on every phase and workout | Garmin Coach shows generic rationale. TrainingPeaks provides no in-plan explanation. Explaining "why this Base phase is 6 weeks based on your current 10hrs/week and LTHR 172" converts an AI-generated plan into a coaching relationship. Directly serves the core value: "Explainable AI coaching." | MEDIUM | SKILL.md `physiologicalGoals[]` per phase and `description` per workout carry this content. Render phase rationale in the phase-bar tooltip or sidebar. Render workout description in the detail modal. Content is in the JSON — it's a display decision. |
| Hierarchical JSON plan data model (plan → phases → weeks → days → workouts) | TrainingPeaks and Final Surge store plans as flat workout calendars — hard to query, hard to regenerate, hard to version. A nested JSON model is native to LLM output, trivially serializable to/from Supabase (JSONB column), and gives the UI direct access to all plan relationships without complex joins. | HIGH | New Supabase table: `training_plans_v2` with a `plan_json` JSONB column. Migration path: new plans use new model; old `weekly_plan_entries` table stays for v1.x compatibility. This is the single most impactful architectural decision in v2.0. |
| Coach chat grounded in full plan context | PacePartner (2026), GPTCoach research, and the Medium article on Claude coaching all point to the same finding: LLM coaching is only useful when it has structured access to the athlete's data. Claude with access to the full plan JSON, Strava activities, and check-ins can give specific, accurate advice. Garmin Coach and Strava AI give generic responses. | HIGH | Claude Edge Function for chat receives: current plan JSON, last 8 weeks of activities, recent check-ins, and the conversation history. System prompt implements SKILL.md coaching principles. This is the core technical challenge of v2.0. |
| Drag-and-drop workout rescheduling | TrainingPeaks supports drag-drop. Final Surge supports drag-drop. Intervals.icu supports drag-drop. RunSmart v1.3 explicitly listed this as an anti-feature (use date-picker instead), but in the context of a full-plan viewer with potentially 20 weeks of workouts, drag-drop between days in the same week is genuinely valuable for adapting to real-life disruptions. | HIGH | Drag-drop within the same week row is tractable (dnd-kit or HTML5 drag API). Cross-week drag-drop is significantly harder. Recommend: within-week only for v2.0. Implement as a differentiator once the plan viewer is stable. Protected-day checks must apply. |
| Race strategy section | The SKILL.md JSON schema includes a `raceStrategy` section with pacing, nutrition, and taper notes. TrainingPeaks plans rarely include this (it's coach-added content). For an endurance athlete, a plan without race-day strategy is incomplete. | MEDIUM | `raceStrategy` object is already in the SKILL.md JSON schema. Display as a dedicated section at the end of the plan viewer. Collapsible or on a separate tab. |
| Recovery week visual treatment | Recovery weeks (3:1 loading cycles) are critical for adaptation but athletes often train through them. Garmin Coach labels them as "Recovery Week." The SKILL.md JSON has `isRecoveryWeek` per week. A distinct visual treatment (lighter card styling, rest icon dominant) reinforces the coaching intent. | LOW | `isRecoveryWeek` boolean in the week JSON. Apply a distinct cell background and a "Recovery" badge on the week row. Requires no new data — purely visual. |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Automatic daily replanning based on workout execution | Athletes want the plan to "self-update" after missed sessions. Garmin Coach's adaptive training does this. Sounds ideal. | Silent plan changes break trust. Athletes lose track of what they committed to. Background replanning requires a training load model (ATL/CTL) tightly integrated with real execution data — months of infrastructure work. PROJECT.md explicitly marks this out-of-scope. | Manual chat-triggered replanning: athlete asks the coach "I missed Tuesday's tempo — what should I do this week?" Claude answers in context. No infrastructure needed, immediate value. |
| Multi-athlete plan management | "I want to plan for my training partner too." | Adds auth complexity (shared data), billing implications, and UI surface area. Project is single-user by design. | Coach export: allow the plan JSON to be exported or shared as a URL/HTML (the SKILL.md HTML renderer already does this). |
| Admin philosophy editor | v1.2 shipped an admin-only coach playbook editor. It was a workaround for the limitation that the Gemini prompt was static. With SKILL.md embedded in the Edge Function system prompt, the playbook editor is redundant complexity. PROJECT.md explicitly states: "Remove admin philosophy editor — coaching context in SKILL.md reference files." | Maintenance overhead for a feature only the admin uses. The SKILL.md reference files are the coaching methodology — editing them is a development workflow, not a user feature. | Remove. Reference files (`docs/running_coach/reference/*.md`) serve as the methodology source. Changes require a code deployment, which is appropriate for methodology changes. |
| Real-time streaming plan generation display | Streaming token-by-token generation looks impressive. | A full training plan is a large JSON document. Streaming partial JSON is not renderable — the viewer needs the complete JSON to build the grid. Streaming a "thinking" narrative before the JSON adds latency with no UX benefit. | Show a loading state while Claude generates the full plan. When the complete JSON arrives, render it instantly. Perceived performance is better than streaming partial content. |
| Workout "library" CRUD | "Let me save my favorite sessions and reuse them." | Adds a full CRUD surface, library management UI, and search. Significantly increases scope. | The plan JSON already contains fully-specified workouts. Claude can reuse patterns across weeks within the plan. A workout library is a v3+ feature for power users. |
| Calendar sync (Google Calendar, iCal) | Athletes want workouts in their phone calendar. | Calendar sync requires OAuth flows, event update handling, and timezone logic. This is a v3+ integration — not related to the core coaching model overhaul. | Export plan as HTML (SKILL.md already generates this). The HTML viewer is mobile-optimized and can be bookmarked. |

---

## Feature Dependencies

```
[Claude Edge Function (claude-coach)]
    └──required by──> [Full Plan Generation]
    └──required by──> [Conversational Chat]
    └──consumes──>    [SKILL.md reference files]
    └──consumes──>    [Strava activity data]

[Full Plan Generation]
    └──produces──>    [Plan JSON (hierarchical)]
    └──required by──> [Phase Bar]
    └──required by──> [Week Row Grid]
    └──required by──> [Workout Cards + Details]
    └──required by──> [Weekly Hours/km Summary]
    └──required by──> [Race Strategy Section]

[Hierarchical Plan JSON stored in JSONB]
    └──required by──> [Plan Viewer UI]
    └──required by──> [Coach Chat (context injection)]
    └──replaces──>    [weekly_plan_entries flat model]

[Plan Viewer UI (Phase Bar + Week Grid + Workout Cards)]
    └──required by──> [Drag-and-Drop Rescheduling]
    └──required by──> [Mark Complete]
    └──required by──> [Workout Detail Modal]
    └──enhances──>    [Conversational Chat] (athlete can point to a specific workout)

[Workout Detail Modal]
    └──extends──>     [Click-to-Edit Modal (Phase 15)] (reuse shell, new view-mode)
    └──requires──>    [Zone data from plan JSON]

[Conversational Chat (Claude)]
    └──requires──>    [Plan JSON in context]
    └──requires──>    [Coach messages persistence (coach_messages table — already exists)]
    └──enhances──>    [Plan Viewer UI] (chat can trigger plan review)

[Strava activity sync (already built)]
    └──required by──> [Assessment Phase of Plan Generation]
    └──enhances──>    [Conversational Chat] (recent activities as context)
```

### Dependency Notes

- **Claude Edge Function blocks everything new:** Until the `claude-coach` function replaces `gemini-coach`, neither full plan generation nor conversational chat can ship. This is the critical-path first step.
- **Plan JSON model must be settled before building the viewer:** The viewer reads from `plan_json`. If the schema changes mid-build, all viewer components break. Stabilize the schema (use SKILL.md v1.0 as the contract) before wiring the UI.
- **Drag-and-drop requires a stable plan viewer first:** It's a mutation on top of the display layer. Building it concurrently with the grid itself creates conflicts.
- **Coach chat context depends on stored plan JSON:** The chat function must be able to retrieve the current plan from the DB to inject as context. Plan storage must land before chat context injection works.
- **Assessment validation is a conversation, not a form:** The SKILL.md workflow requires presenting an assessment and getting athlete confirmation before finalizing the plan. This means the plan generation is inherently a multi-turn conversation, not a one-click action. Design the UX accordingly: a chat flow that concludes with "generate plan" — not a form submit that calls Claude.
- **Admin philosophy editor removal must happen before or alongside claude-coach Edge Function:** The `coach_playbook_entries` table feeds the Gemini prompt. Once Gemini is replaced, the playbook system is orphaned. Remove it in the same phase as the backend swap to avoid dead code accumulation.

---

## MVP Definition

This is v2.0 of an existing product. MVP means the minimum to deliver the Claude coaching backend + hierarchical plan model + plan viewer as a coherent, shippable release.

### Launch With (v2.0)

- [ ] Claude Edge Function (`claude-coach`) replacing `gemini-coach` — the backend foundation; nothing else works without it
- [ ] Full training plan generation via SKILL.md methodology — the headline feature
- [ ] Hierarchical plan JSON stored in Supabase JSONB — the data model everything depends on
- [ ] Plan viewer: phase bar + scrollable week grid + workout cards — the primary UI surface
- [ ] Workout detail modal (view mode: zone, description, humanReadable structure) — needed to make plans actionable
- [ ] Weekly hours + km summary per week row — minimum load information on the grid
- [ ] Mark workout as complete from detail modal — closes the execution feedback loop
- [ ] Conversational coaching chat grounded in plan + Strava context — the primary differentiator
- [ ] Remove admin philosophy editor — reduces maintenance surface, forces clean architecture

### Add After Validation (v2.0.x)

- [ ] Drag-and-drop workout rescheduling (within-week only) — add once plan viewer is stable and used in real training
- [ ] Recovery week visual treatment — lightweight polish; wait to validate the plan viewer first
- [ ] Race strategy section display — content is in the JSON; add the panel once core plan viewer ships
- [ ] Zone reference panel (collapsible, shows all athlete zones) — useful but secondary to the workout-level zone display

### Future Consideration (v3+)

- [ ] Automatic adaptive replanning — requires training load model integration and trust-building with users
- [ ] Calendar export (iCal/Google Calendar) — integration complexity disproportionate to current user base
- [ ] Workout library CRUD — power user feature for athletes who want to customize beyond AI suggestions
- [ ] Multi-athlete support — new auth model required

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Claude Edge Function (`claude-coach`) | HIGH | MEDIUM | P1 — critical path; nothing else works |
| Full plan generation (SKILL.md) | HIGH | HIGH | P1 — headline feature |
| Hierarchical plan JSON (JSONB storage) | HIGH | MEDIUM | P1 — data model foundation |
| Plan viewer: phase bar + week grid | HIGH | HIGH | P1 — primary UI surface |
| Workout detail modal (view mode) | HIGH | MEDIUM | P1 — makes plan actionable |
| Conversational chat (Claude, grounded) | HIGH | HIGH | P1 — primary differentiator |
| Weekly hours + km summary per row | MEDIUM | LOW | P1 — table stakes for load awareness |
| Mark complete | MEDIUM | LOW | P1 — execution feedback loop |
| Remove admin philosophy editor | MEDIUM | LOW | P1 — reduces debt, enables clean arch |
| Recovery week visual treatment | MEDIUM | LOW | P2 — coaching intent reinforcement |
| Race strategy section | MEDIUM | MEDIUM | P2 — plan completeness |
| Zone reference panel | MEDIUM | LOW | P2 — supports workout execution |
| Drag-and-drop (within-week) | MEDIUM | HIGH | P2 — add after plan viewer stabilizes |
| Drag-and-drop (cross-week) | LOW | HIGH | P3 — disproportionate complexity |
| Calendar export | LOW | HIGH | P3 — future integration milestone |
| Workout library | LOW | HIGH | P3 — power user, post-PMF |

**Priority key:**
- P1: Must have for v2.0 launch
- P2: Should have, add once core is working
- P3: Future milestone

---

## Competitor Feature Analysis

| Feature | TrainingPeaks | Garmin Coach | Intervals.icu | RunSmart v2.0 Approach |
|---------|--------------|--------------|----------------|------------------------|
| Plan generation | Human coaches publish static plans for purchase ($20-80 each) | Adaptive plan from goal event + training history; limited event types (5K/10K/HM only as of 2026) | Annual Training Plan Builder (beta, premium) — template-based, not AI-generated | Full-plan generation via Claude with SKILL.md methodology; personalized, periodized, grounded in Strava data and athlete assessment |
| Plan explainability | None — plan is a calendar of workouts | Generic rationale per workout ("builds aerobic base") | Phase descriptions only | Phase `physiologicalGoals` + workout `description` + conversational explanation on demand via chat |
| Workout detail | Structured workout builder format; TSS/IF/NP shown | HR target range + brief note | Zone breakdown, structured step display | `humanReadable` structured workout text + `primaryZone` + duration/distance + zone table link |
| Coach communication | Premium "Coach Messaging" feature (coach-athlete paid relationship) | Not available — no human coach | No coaching layer | Claude chat with full plan + Strava context; always available, no per-message cost to athlete |
| Drag-and-drop | Yes — full calendar drag-drop | No | Yes — within plan | Within-week drag-drop in v2.0; cross-week deferred |
| Data model | Flat calendar (workouts attached to dates) | Device-native, no user-accessible model | Flat calendar with block overlays | Hierarchical JSON: plan → phases → weeks → days → workouts; stored as JSONB, readable and generatable by LLM natively |
| Mark complete | Yes — planned vs. completed side-by-side | Auto-matched from device sync | Auto from connected devices | Manual mark-complete on workout detail modal; Strava auto-match as v2.1 enhancement |

**Confidence:** MEDIUM — competitor analysis draws from WebSearch results (March 2026) and product knowledge. Garmin Coach event support expansion confirmed from Garmin Rumors (2026). TrainingPeaks AI plan generation absence confirmed from AI Endurance blog analysis.

---

## SKILL.md Workflow vs Industry Patterns

### Where SKILL.md Aligns With Industry

The assessment → validation → zones → periodization → plan delivery sequence in SKILL.md maps closely to how professional coaches actually work:

1. **TrainerRoad Plan Builder** collects: goal event, training volume, schedule days — then generates Base/Build/Specialty phases. SKILL.md does the same but adds athlete validation and zone establishment as explicit steps.
2. **TrainingPeaks coach workflow** is: assess athlete → set zones → assign plan phases → apply workouts. The SKILL.md Phases 1-5 mirror this exactly.
3. **Garmin Coach** skips athlete validation entirely — it generates from event + FTP/VO2max proxy. SKILL.md's validation step is where RunSmart creates differentiated quality.

### Where SKILL.md Goes Further

- **Foundation vs current form distinction:** No competitor tool explicitly models "Ironman finisher who took 3 months off" differently from a true beginner. The SKILL.md `assessment.foundation` + `currentForm` split is a meaningful advantage.
- **Physiological goal articulation per phase:** The `physiologicalGoals[]` array in each phase gives athletes understanding of why each training block exists. No competitor shows this.
- **Race strategy section:** Full pacing, nutrition, and taper notes embedded in the plan JSON. TrainingPeaks requires a separate document or coach annotation.

### Where SKILL.md Creates UX Challenges

- **Multi-turn assessment is hard to design:** SKILL.md requires presenting an assessment and getting confirmation before generating the plan. In a web UI, this is a conversation flow, not a form. The UX must guide athletes through the phases without feeling like an interrogation.
- **Long context window required:** Full plan generation with 20+ weeks of workouts and assessment context will push toward Claude's practical context limits. The Edge Function must manage context budgeting. For longer plans, consider generating phases iteratively.
- **JSON output reliability:** SKILL.md produces a large, nested JSON object. Claude's structured output is reliable for smaller schemas but a 20-week plan with 140 workout objects is a large generation. Edge Function should validate JSON structure and fall back to a retry prompt if parsing fails.

---

## Existing Feature Dependencies (Must Not Break)

These v1.x features are in production and must survive the v2.0 migration:

| Existing Feature | Where It Lives | v2.0 Risk |
|-----------------|----------------|-----------|
| Weekly AI plan generation (single-week) | `WeeklyPlanPage.jsx` + `gemini-coach` Edge Function | Must remain functional during the transition period. Replace `gemini-coach` with `claude-coach` but preserve the weekly generation endpoint until the full plan viewer is live. |
| Protected day / overwrite review flow | `useWorkoutEntries.js` + `weekly_plan_day_states` table | If the new plan model bypasses `weekly_plan_entries`, protected day logic must be re-implemented for the new model. Do not orphan the protection concept. |
| Strava activity sync and activity display | `useActivities.js` + `strava-sync` Edge Function | Activities are the primary context for assessment. Must remain wired. |
| Coach conversation history | `useCoachConversations.js` + `coach_conversations` + `coach_messages` tables | New Claude chat endpoint uses the same persistence layer. Schema remains compatible. |
| 4-week planner grid (Phase 14) + click-to-edit (Phase 15) | `WeeklyPlanPage.jsx` + planner components | The new full-plan viewer may eventually replace the 4-week grid, but both can coexist as separate routes during v2.0. Do not remove the weekly planner until the full-plan viewer is validated. |

---

## Sources

- `docs/running_coach/SKILL.md` — Claude Coach skill definition; assessment workflow, JSON schema, coaching principles (HIGH confidence, first-party)
- `docs/running_coach/reference/periodization.md` — Phase structure, microcycle patterns, progressive overload (HIGH confidence, first-party)
- `docs/running_coach/reference/assessment.md` — Foundation vs form assessment, validation dialogue (HIGH confidence, first-party)
- `docs/running_coach/reference/workouts.md` — Workout type library (HIGH confidence, first-party)
- `docs/running_coach/output/krs-smve-plan.json` — Real generated plan; confirms JSON schema is production-ready (HIGH confidence, first-party)
- `.planning/PROJECT.md` — v2.0 milestone scope and constraints (HIGH confidence, first-party)
- [TrainingPeaks Virtual GPXplore feature — DC Rainmaker, 2026](https://www.dcrainmaker.com/2026/02/trainingpeaks-virtual-massively-gpxplore.html) — confirms TrainingPeaks feature direction (MEDIUM confidence)
- [Garmin Q1 2026 Update: AI Coaching debuts](https://www.garminnews.com/garmin-q1-2026-update-new-gear-tracking-circadian-sleep-alignment-and-ai-coaching-debuts/) — confirms Garmin Coach adaptive expansion (MEDIUM confidence)
- [Garmin Expands Garmin Coach with Adaptive Plans](https://garminrumors.com/garmin-expands-garmin-coach-with-adaptive-running-cycling-and-strength-training-plans/) — confirms Garmin Coach scope (MEDIUM confidence)
- [Best AI Coaching Tools for Intervals.icu 2026](https://pacepartner.app/blog/best-ai-coaching-tools-intervals-icu-2026) — PacePartner LLM coaching pattern (MEDIUM confidence)
- [TrainerRoad Plan Builder Overview](https://support.trainerroad.com/hc/en-us/articles/360037923191-Plan-Builder-Overview) — phase structure patterns (HIGH confidence, official docs)
- [Final Surge Coach Features](https://site.finalsurge.com/Coaches) — coach-athlete workflow patterns (HIGH confidence, official product)
- [GPTCoach research, CHI 2025](https://dl.acm.org/doi/10.1145/3706598.3713819) — LLM coaching architecture patterns (MEDIUM confidence, peer-reviewed)
- [Knowledge-grounded LLM for sports training plans, Scientific Reports 2026](https://www.nature.com/articles/s41598-026-37075-z) — domain-grounded plan generation pattern (MEDIUM confidence, peer-reviewed)

---

*Feature research for: RunSmart v2.0 — Claude AI Coaching + Hierarchical Plan Model*
*Researched: 2026-03-29*
