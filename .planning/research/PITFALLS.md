# Pitfalls Research — Weekly Planning Intelligence

## Main Risks

### 1. Split-Brain Planning

If `Treningsplan` still appears to generate the week while `Ukeplan` also generates the week, users will not know which surface is authoritative.

Prevention:
- Make `Ukeplan` the only weekly-generation entry point.
- Keep `Treningsplan` focused on macro structure and weekly intent.

### 2. Constraint Collisions

Real schedules conflict quickly: long run on Sunday, hard session Wednesday, commute Monday/Tuesday, no double-threshold, mileage target unchanged.

Prevention:
- Introduce explicit priority ordering.
- Return conflict explanations instead of silently violating rules.

### 3. Manual Edit Loss

If regeneration overwrites athlete-edited days, trust in the planner will drop fast.

Prevention:
- Preserve manual edits or require explicit confirmation before replacing them.
- Distinguish user-authored vs AI-authored entries.

### 4. Vague Admin Guidance

Broad admin text can become prompt noise and produce unstable recommendations.

Prevention:
- Store admin guidance in structured buckets: focus, principles, red lines, preferred workout spacing.

### 5. Over-Optimized Weeks

An AI planner can satisfy mileage and workout count while producing a week that is technically valid but practically miserable.

Prevention:
- Keep athlete-first guardrails visible: hard/easy spacing, commute-aware days, recovery protection, no intensity bunching.

## Source Notes

- TrainingPeaks warns against bunching hard work and breaking hard/easy balance when adapting a week: https://www.trainingpeaks.com/blog/customize-your-training-plan/
- Strava’s ultra planning example shows how schedule-aware weekly anchoring matters when balancing work and recovery: https://stories.strava.com/ru/articles/so-you-entered-your-first-ultramarathon
