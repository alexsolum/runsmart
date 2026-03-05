# Feature Research (Milestone: Coach Integration)

## Table Stakes (Must-Have in Scope)
- Manual-trigger replanning that uses latest training data.
- Coach context built from weekly summary, recent activities, check-ins, daily logs.
- Transparent coaching rationale tied to planning adjustments.
- Insight-level synthesis comment explaining training state and next focus.

## Differentiators (In Scope for This Milestone)
- Editable coaching philosophy aligned to Jason Koop + Marius Bakken principles.
- Admin-only in-app philosophy editor with versioned updates.
- Training Load Trend chart overlays with coach interpretation markers.

## Deferred / Anti-Features (Out of Scope)
- Fully automatic background replanning.
- Major redesign of app shell/navigation.
- Multi-user admin/editor roles.

## Dependency Notes
- Philosophy editor depends on new DB schema + secure write path.
- Chart overlays depend on stable coach evaluation payload shape.
- Replan flow enhancements depend on stronger data normalization from logs/check-ins.
