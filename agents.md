# agents.md — AI Agents for Running Training Planning App

## Purpose of the Application
This application helps plan, monitor, and adapt endurance running training toward specific goal races.  
It focuses on structured periodization, balancing training load with real-life constraints (travel, work, family, events), and providing AI-guided coaching insights.

Primary use is personal training optimization, but architecture should allow future sharing with a small group of runners.

Core capabilities:

- Training block planning toward goal races
- Weekly training planning with progression guidance
- AI-generated workout suggestions
- Integration with Strava training data
- Training analytics and performance insights
- Continuous adjustment recommendations based on training execution


---

## Core Design Principles

1. Athlete-first usability
   - Plans must be practical and realistic within normal life constraints.
   - Avoid overly aggressive training increases.

2. Evidence-informed coaching
   - Follow structured endurance training principles.
   - Default methodology: Jason Koop–inspired periodization.

3. Explainable AI guidance
   - Agents should explain reasoning behind recommendations.

4. Progressive refinement
   - Plans should evolve based on training execution data.

5. Single-user first, extensible later
   - Architecture should support future multi-user expansion without premature complexity.

6. Privacy-first data mindset
   - Training data belongs to the athlete.


---

## Agent Overview

### 1. Training Plan Generator Agent

**Purpose:**
Create structured training plans aligned with a goal race and life constraints.

**Responsibilities:**

- Generate macro training blocks:
  - Base
  - Build
  - Peak
  - Taper
- Generate weekly plans within blocks.
- Suggest key workouts:
  - Long runs
  - Intensity sessions
  - Recovery runs
- Adjust plans based on:
  - Fatigue trends
  - Completed training
  - Schedule constraints
  - Goal race characteristics.

**Inputs:**

- Goal race info (date, distance, terrain)
- Athlete context
- Life calendar constraints
- Recent training load
- Historical Strava data
- Athlete feedback/comments.

**Outputs:**

- Training blocks timeline
- Weekly mileage targets
- Suggested workouts
- Coaching rationale.


---

### 2. Training Analysis Agent

**Purpose:**
Analyze completed training and provide coaching insights.

**Responsibilities:**

- Compute training load metrics:
  - Acute training load
  - Chronic training load
  - Fatigue/form modelling
- Estimate performance indicators:
  - VO₂max trends
  - Race readiness
  - Long-run preparedness
- Detect risks:
  - Overtraining signals
  - Undertraining patterns
- Provide forward-looking recommendations.

**Inputs:**

- Strava training data
- Manual training logs
- Athlete weekly reflections
- Planned vs executed training.

**Outputs:**

- Performance trend analysis
- Adjustment suggestions
- Race predictions
- Readiness indicators.


---

### 3. Data Ingestion Agent

**Purpose:**
Collect and normalize training data.

**Responsibilities:**

- Integrate with Strava API.
- Support manual workout entry.
- Normalize activity data for analytics.
- Ensure reliable data syncing.

**Key data types:**

- Distance
- Duration
- Elevation
- Pace
- Heart rate (if available)
- Workout type classification.

**Design notes:**

- Must tolerate incomplete data.
- Should support future wearable integrations.


---

## Technology Context

### Platform

- Web-first application
- Mobile-friendly viewing required

### Backend

- Firebase (authentication, backend logic, database)

### Database

- Firebase Firestore preferred

### Visualization

Preferred:

- Plotly for fast interactive analytics dashboards.

Optional later:

- D3 for advanced custom visualizations.


---

## Training Methodology Assumptions

The system should default to:

- Structured periodization
- Emphasis on endurance sports physiology
- Long-run centric training for ultra/endurance focus
- Progressive overload balanced with recovery
- Real-life schedule integration.

Agents should avoid:

- Sudden mileage spikes
- Unrealistic weekly structures
- Overly rigid coaching prescriptions.


---

## AI Behavior Guidelines

Agents should:

- Provide actionable recommendations.
- Explain reasoning briefly.
- Prioritize clarity over technical jargon.
- Adjust recommendations when new data arrives.

Agents should not:

- Assume perfect training compliance.
- Overfit to short-term performance swings.
- Ignore athlete lifestyle constraints.


---

## Planning Granularity

Two separate AI planning layers:

1. Training Block Planning:
   - Months-level structure.
   - Race-oriented.

2. Weekly Planning:
   - Tactical execution.
   - Adaptive based on recent training.


---

## Future Expansion Possibilities

- Multi-athlete support
- Coach-athlete sharing
- Injury prediction models
- Nutrition integration
- Sleep/recovery data integration
- Route recommendation intelligence.


---

## Non-Goals (for now)

- Full coaching replacement
- Public SaaS scaling
- Real-time wearable analytics
- Complex social features.


---

## Definition of Success

The system should help:

- Maintain consistent training progression.
- Balance training with life.
- Improve race readiness.
- Reduce injury risk.
- Provide motivating, useful coaching insights.
