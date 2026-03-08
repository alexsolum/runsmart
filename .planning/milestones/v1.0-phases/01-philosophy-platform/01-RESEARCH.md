# Phase 1: Philosophy Platform - Research

**Phase:** 1  
**Goal:** Add a structured and editable philosophy layer that only owner/admin can modify.  
**Requirements:** PHIL-01, PHIL-02  
**Date:** 2026-03-05

## Current System Findings

- Runtime coaching already supports dynamic playbook addendum fetch from `coach_playbook_entries` in `supabase/functions/gemini-coach/index.ts`.
- Existing table `coach_playbook_entries` already has structured policy fields and strict service-only RLS (`supabase/migrations/20260305_coach_playbook_entries.sql`).
- Current UI has no dedicated admin page; app shell nav is controlled from `src/App.jsx`.
- Existing data hooks pattern (`src/hooks/*`) and context composition (`src/context/AppDataContext.jsx`) are consistent extension points.

## Research Conclusions

### 1) Philosophy persistence model for this phase
- Decision context asks for mostly freeform content with required template sections.
- Best fit is adding a dedicated philosophy-document table (single active draft/published document plus versions), instead of overloading row-based playbook entries.
- Keep existing `coach_playbook_entries` intact for backward-compatible policy snippets during migration period.

### 2) Secure write boundary
- Write operations should be routed through Edge Function (defense in depth) with explicit owner/admin checks.
- Keep RLS as an additional barrier (read authenticated owner scope, write blocked except controlled path or role condition).
- Unauthorized attempts should be auditable (event row or structured server log).

### 3) Admin UX delivery
- Dedicated admin page is low-risk and aligns with existing shell navigation.
- Single-page sectioned editor is simplest way to enforce required template sections.
- Export-only in v1 can be done client-side from fetched document payload.

### 4) Publish/version behavior
- Draft and published records should be distinct states to avoid accidental runtime changes.
- Publish creates immutable version entry with required changelog.
- Rollback should set prior version as active published document without mutating history.

## Suggested Data Additions

- `coach_philosophy_documents`
  - current draft/published document payload
  - required template sections fields
  - changelog metadata
  - published flag, version reference
- `coach_philosophy_versions`
  - append-only history of published snapshots
  - rollback target catalog
- `coach_admin_audit` (or equivalent)
  - unauthorized attempt and admin write/publish events

## Integration Touchpoints

- App shell/nav: `src/App.jsx`
- Admin page UI: new `src/pages/AdminPhilosophyPage.jsx`
- Data hook: new `src/hooks/useCoachPhilosophy.js`
- Context provider: `src/context/AppDataContext.jsx`
- Edge Function write path: new `supabase/functions/coach-philosophy-admin/index.ts`
- Optional coach runtime read switch (future step in Phase 2): `supabase/functions/gemini-coach/index.ts`

## Validation Architecture

Phase needs explicit validation strategy because this introduces security-sensitive admin mutation paths and schema changes:
- Unit tests for editor section validation behavior.
- Integration tests for unauthorized update rejection.
- Integration tests for publish + rollback invariants.
- Regression checks ensuring non-admin path cannot mutate philosophy.

## Risks and Mitigations

- Risk: freeform text prompt drift.  
Mitigation: strict section template + hard validation + publish gating.

- Risk: bypassing admin guardrails from client.  
Mitigation: Edge function write path with server-side authorization + RLS enforcement.

- Risk: rollback complexity corrupting active state.  
Mitigation: append-only versions and pointer-based activation.

