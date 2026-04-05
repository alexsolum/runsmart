# Athlete Data Shape (Web App)

When called from the RunSmart web app, athlete data is injected into the system prompt as a structured JSON object called `athleteContext`. There is no database access from within the skill container.

## athleteContext Shape

```json
{
  "plan": {
    "id": "uuid",
    "plan_data": {
      "meta": { "event": "string", "eventDate": "YYYY-MM-DD", "totalWeeks": 12, ... },
      "assessment": { "foundation": { ... }, "currentForm": { "weeklyKm": 50, ... }, ... },
      "zones": { "run": { "hr": { "lthr": 172, "zones": [...] }, "pace": [...] } },
      "phases": [{ "name": "Base", "startWeek": 1, "endWeek": 4, "focus": "..." }],
      "weeks": [{ "weekNumber": 1, "startDate": "YYYY-MM-DD", "days": [...] }],
      "raceStrategy": { ... }
    }
  },
  "recentActivities": [
    { "name": "Easy Run", "distance": 10.2, "duration": 3120, "effort": null }
  ],
  "trainingBlocks": [
    { "phase": "Base", "start_date": "YYYY-MM-DD", "end_date": "YYYY-MM-DD", "target_km": 50 }
  ],
  "checkins": [
    { "week_of": "YYYY-MM-DD", "fatigue": 3, "sleep_quality": 4, "motivation": 4 }
  ]
}
```

## How to Use

- Use `plan.plan_data.weeks` to find the current and upcoming workouts
- Use `recentActivities` to assess recent training load and consistency
- Use `checkins` to assess fatigue, sleep, and motivation trends
- Use `plan.plan_data.assessment` to understand the athlete's baseline
- Use `plan.plan_data.zones` to prescribe zone-appropriate workouts
