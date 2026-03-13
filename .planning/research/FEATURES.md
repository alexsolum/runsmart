# Feature Research — Weekly Planning Intelligence

## Table Stakes

- Weekly plan generation starts where the athlete executes the week: `Ukeplan`.
- Recommendations ingest the parent training block intent for that week.
- Recommendations respect weekly mileage targets and weekly workout type.
- Athlete can express day-specific preferences and restrictions.
- System explains why sessions were placed on specific days.

## Differentiators

- Admin-defined weekly planning principles that shape every recommendation.
- Constraint-aware recommendation logic for:
  - long-run day
  - hard-workout day
  - commute / low-availability days
  - rest-day preferences
  - double-threshold allowed / forbidden
- Conflict resolution that preserves the highest-priority rules and tells the athlete what was relaxed.

## Anti-Features

- Silent overwriting of a manually adjusted week.
- Hidden rule application with no coaching rationale.
- Defaulting to dense intensity placement just because mileage is high.
- Treating `Treningsplan` and `Ukeplan` as separate recommendation sources after the move.

## Complexity Notes

- Moving the AI entry point is straightforward.
- Unifying all planning context into one reliable recommendation payload is medium complexity.
- Constraint priority, manual edits, and conflict explanation are the main design risks.

## Source Notes

- TrainingPeaks highlights that weekly plans often need to shift around life schedule while keeping hard/easy spacing intact: https://www.trainingpeaks.com/blog/customize-your-training-plan/
- Strava sample schedules show the value of fixed weekly anchors and consistent routine placement: https://stories.strava.com/pt/articles/couch-to-5k-training-plan
