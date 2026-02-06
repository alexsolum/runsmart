# agents.md — AI Agents for Running Training Planning App

## Purpose of the Application

This application supports structured endurance running training toward goal races by combining:

- AI-assisted training planning
- Real-life schedule awareness (travel, events, work, etc.)
- Training analytics and performance insights
- Continuous adjustment recommendations

Primary use is personal training optimization, with potential future sharing among a small group of runners.

Core capabilities:

- Training block planning toward races
- Weekly training planning with progression guidance
- AI-generated workout suggestions
- Strava training data ingestion
- Training analytics dashboards
- Adaptive coaching feedback based on executed training


---

## Hosting & Architecture Context

### Frontend

- Static web app hosted on GitHub Pages
- Mobile-friendly viewing required
- Client interacts directly with Supabase backend

Recommended framework:

- React + Vite (preferred)
- Alternative frameworks acceptable if static export compatible


### Backend

Supabase platform providing:

- PostgreSQL database
- Authentication
- Edge Functions for secure server logic
- Storage (optional future use)

Edge Functions must be used for:

- API key protection
- AI agent execution
- Strava secure integrations
- Background processing


---

## Core Design Principles

1. Athlete-first usability
   Training must fit real life, not dominate it.

2. Evidence-informed coaching
   Default methodology inspired by Jason Koop structured endurance training.

3. Explainable AI
   Agents must provide reasoning alongside recommendations.

4. Progressive adaptation
   Plans evolve based on executed training and feedback.

5. Data ownership
   Athlete controls their training data.

6. Single-user first
   Architecture should support future multi-user expansion without premature complexity.


---

## Agent Overview

### 1. Training Plan Generator Agent

**Purpose**

Generate structured training plans aligned with goal races, lifestyle constraints, and recent training data.

**Responsibilities**

- Generate macro training blocks:
  - Base
  - Build
  - Peak
  - Taper
- Generate weekly training plans.
- Recommend key workouts:
  - Long runs
  - Intensity sessions
  - Recovery runs
- Adapt plans based on:
  - Training load trends
  - Schedule constraints
  - Athlete feedback
  - Goal race characteristics.

**Inputs**

- Goal race details
- Training history (Strava/manual)
- Athlete context
- Life calendar constraints
- Analytics outputs
- Weekly reflections.

**Outputs**

- Training block timelines
- Weekly mileage targets
- Suggested workouts
- Coaching rationale.


---

### 2. Training Analysis Agent

**Purpose**

Analyze executed training and provide actionable coaching insights.

**Responsibilities**

Compute and monitor:

- Acute training load (ATL)
- Chronic training load (CTL)
- Fatigue/form modelling
- VO₂max estimation trends
- Race readiness indicators
- Long-run preparedness.

Detect:

- Overtraining risk
- Undertraining patterns
- Training consistency trends.

Provide:

- Adjustment recommendations
- Race predictions
- Performance insights.

**Inputs**

- Activity data (Strava/manual)
- Weekly athlete feedback
- Planned vs executed training.

**Outputs**

- Performance trend summaries
- Recommendations
- Risk indicators.


---

### 3. Data Ingestion Agent

**Purpose**

Ensure reliable ingestion, normalization, and storage of training data.

**Responsibilities**

- Integrate with Strava API via Edge Functions.
- Support manual workout entry.
- Normalize activity data for analytics.
- Maintain consistent data quality.

**Key Data Types**

- Distance
- Duration
- Elevation
- Pace
- Heart rate (if available)
- Workout classification
- Subjective effort.

Design must tolerate incomplete or inconsistent data.


---

## Training Methodology Assumptions

Default methodology:

- Structured periodization
- Long-run centric endurance focus
- Progressive overload with recovery balance
- Real-life schedule integration
- Emphasis on injury prevention.

Agents should avoid:

- Sudden mileage spikes
- Overly rigid training structures
- Ignoring athlete fatigue signals.


---

## Data Model Guidance (Supabase/Postgres)

Primary tables expected:

- users
- goal_races
- training_blocks
- weekly_plans
- activities
- analytics_snapshots
- athlete_feedback

SQL schema should prioritize:

- Time-series querying efficiency
- Analytics flexibility
- Clear relational links.


---

## Visualization Strategy

Preferred:

- Plotly for training dashboards.

Possible future:

- D3 for advanced visual analytics.


---

## AI Agent Behavior Guidelines

Agents should:

- Provide actionable recommendations.
- Explain reasoning concisely.
- Adapt recommendations continuously.
- Account for incomplete compliance.

Agents should not:

- Overfit to short-term performance swings.
- Assume perfect execution.
- Ignore life constraints.


---

## Planning Granularity

Two distinct planning layers:

### 1. Training Block Planning

- Months-level planning
- Race-oriented
- Periodization structure.

### 2. Weekly Planning

- Tactical execution
- Adaptive to recent training.


---

## Security & Integration Requirements

All sensitive operations must run through Supabase Edge Functions:

- Strava API authentication
- AI API interactions
- Secure data processing.

Frontend must never expose secrets.


---

## Future Expansion Possibilities

- Multi-athlete support
- Social sharing of plans
- Injury prediction modelling
- Nutrition integration
- Sleep/recovery integration
- Advanced race simulation.


---

## Non-Goals (Current Phase)

- Full coaching replacement
- Large-scale SaaS deployment
- Real-time wearable analytics
- Complex social features.


---

## Definition of Success

The system should help:

- Maintain consistent training progression
- Balance training with life commitments
- Improve race readiness
- Reduce injury risk
- Provide motivating and useful coaching insights.

