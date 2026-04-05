---
name: running-coach
description: Expert endurance running coach for ultramarathon and marathon training plans, coaching conversations, and plan modifications.
---

# Running Coach Skill

A specialized Claude skill for generating and adapting endurance training plans using evidence-based coaching principles.

## Overview

This skill provides:
- **Full training plan generation** from athlete assessment and race goal
- **Plan patches** for specific workout modifications
- **Insights synthesis** from performance data and feedback
- **Conversational coaching** for real-time guidance and plan discussion

## Reference Materials

Reference materials guide all plan decisions and coaching responses:

- `reference/principles.md` — Core coaching principles that guide all plan decisions
- `reference/queries.md` — Athlete assessment data structures
- `reference/phases.md` — Training phase definitions and block structure
- `reference/workouts.md` — Workout types and intensity prescriptions
- `reference/raceStrategy.md` — Race-day execution guidance

## Response Envelope (Web App Integration)

When called from the RunSmart web app, always respond with a single valid JSON object matching one of these envelopes:

### Conversation reply (no plan changes)
```json
{ "type": "conversation", "content": "Your coaching advice text." }
```

### Full plan generation
```json
{ "type": "full-plan", "content": "Summary of what was generated.", "plan": { /* full TrainingPlan object */ } }
```

### Specific workout changes
```json
{
  "type": "plan-patch",
  "content": "Explanation of changes.",
  "patches": [
    {
      "week": 3,
      "dayDate": "2026-04-14",
      "workoutId": "w3-mon-easy",
      "fields": { "durationMinutes": 45 }
    }
  ]
}
```

### Phase timeline restructure
```json
{
  "type": "plan-phase-update",
  "content": "Explanation of phase changes.",
  "phases": [ /* updated phases array */ ]
}
```

Rules:
- "patches" uses the same format as the existing `apply_plan_patch` RPC
- "plan" must follow the full training plan schema (meta, assessment, zones, phases, weeks, raceStrategy)
- For conversation-only replies, use type "conversation"
- Keep patch arrays minimal — tweak, do not overhaul
