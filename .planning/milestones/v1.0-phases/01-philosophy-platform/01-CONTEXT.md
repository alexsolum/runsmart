# Phase 1: Philosophy Platform - Context

**Gathered:** 2026-03-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Add a structured and editable philosophy layer that only owner/admin can modify. This phase delivers philosophy persistence, controlled editing workflow, and secure access boundaries. It does not add auto-replanning, multi-user role expansion, or broad UI redesign.

</domain>

<decisions>
## Implementation Decisions

### Philosophy structure
- Use a mostly freeform philosophy document model.
- Enforce a required section template in the editor (template-enforced freeform).
- Required sections must include principles, dos, donts, workout examples, and phase notes.
- Add explicit weighted sections for Jason Koop and Marius Bakken principles.
- Save is hard-blocked if required template sections are incomplete.

### Admin editing surface
- Use a dedicated Admin page for philosophy management.
- Add a top-level `Admin` navigation item visible only for owner/admin.
- v1 editor UX is a single-page form with section blocks (not markdown split view).
- Support philosophy export in v1, but no import in v1.

### Versioning and publish flow
- Use explicit publish flow (draft changes do not affect runtime until publish).
- Maintain version log and one-click rollback in v1.
- Create new version entries on publish only (not every draft save).
- Publish requires a changelog note explaining what changed and why.

### Access and guardrails
- Philosophy content is readable only by authenticated user (single-user scope).
- Philosophy updates are owner/admin only.
- Write path uses Edge Function + RLS defense in depth (not direct client writes).
- Unauthorized edit attempts fail closed, show clear user message, and create audit record.

### Claude's Discretion
- Exact section field naming and UI microcopy for the philosophy template.
- Internal representation for weighted Koop/Bakken priorities (as long as behavior matches decisions).
- Specific audit log schema fields and retention defaults.

</decisions>

<specifics>
## Specific Ideas

- Coaching philosophy should keep evolving over time and remain editable by the user inside the app.
- Philosophy must stay aligned with Jason Koop (long-run centric) and Marius Bakken (specific intensity distribution) methodology direction.
- Current scope remains tightly focused on philosophy platform behavior and controls.

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `coach_playbook_entries` migration already exists (`supabase/migrations/20260305_coach_playbook_entries.sql`) and provides structured coaching fields that can inform export/publish model.
- Existing coach runtime already fetches dynamic playbook entries in `supabase/functions/gemini-coach/index.ts`.
- Existing profile editing interaction pattern in `src/hooks/useRunnerProfile.js` can inform sectioned form save flow.
- Existing coach page patterns in `src/pages/CoachPage.jsx` provide data-loading and optimistic UI references.

### Established Patterns
- Supabase-backed hook pattern (`useX` hooks + provider composition) is the current frontend data architecture.
- Security-sensitive mutations are handled in Edge Functions for defense-in-depth.
- App uses page-level navigation in `src/App.jsx`; role-gated nav visibility can be implemented consistently there.

### Integration Points
- Admin route/page wiring: `src/App.jsx` navigation + new page component under `src/pages/`.
- Philosophy read/update data layer: new hook in `src/hooks/` plus context registration in `src/context/AppDataContext.jsx`.
- Secure write path: new or extended Edge Function (or function route in existing coach function family).
- Runtime usage: `supabase/functions/gemini-coach/index.ts` publish-only active philosophy retrieval.

</code_context>

<deferred>
## Deferred Ideas

- Automatic replanning without user trigger.
- Multi-user admin/editor role model.
- Major coach-first UI redesign.

</deferred>

---

*Phase: 01-philosophy-platform*
*Context gathered: 2026-03-05*
