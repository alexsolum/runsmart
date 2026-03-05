# Stack Research (Milestone: Coach Integration)

## Scope
- Existing app is already React + Vite + Supabase.
- Research focus is additive: integrate AI coach deeper across planning/check-ins/insights.

## Recommended Stack Choices
- Keep frontend stack unchanged (`react`, `vite`, existing hooks architecture).
- Keep data/auth backend on Supabase Postgres + RLS.
- Keep secure AI orchestration in Edge Functions (`supabase/functions/gemini-coach`).
- Keep chart rendering in existing chart system (`recharts`) and add semantic overlays.

## Additions for This Milestone
- New persistence for editable philosophy (DB table + RLS + admin write policy).
- Philosophy version metadata to support iterative coaching evolution.
- Runtime philosophy injection in `gemini-coach` prompt construction.
- Optional cached coach evaluation snapshot for quick Insights rendering.

## What Not To Introduce
- No new backend service beyond Supabase for this milestone.
- No auto-replanning scheduler/worker system.
- No multi-tenant role hierarchy.

## Confidence
- High: Continue current stack for fastest delivery with lowest migration risk.
