// Supabase Edge Function — Claude AI coaching plan generation
// Receives a structured athlete payload, constructs a system prompt from embedded
// SKILL.md coaching methodology, calls the Anthropic Messages API via raw fetch,
// parses the JSON plan response with stop_reason truncation guarding, and saves
// it to the hierarchical_plans JSONB table with per-user RLS.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ── TypeScript interfaces ────────────────────────────────────────────────────

interface AthletePayload {
  raceGoal: {
    eventName: string;
    eventDate: string;
    eventType: string; // "marathon" | "ultra" | "trail"
  };
  fitness: {
    weeklyKm: number;
    longestRun: number;
    lthr: number;
    yearsRunning: number;
  };
  constraints: {
    longRunDay: string;
    hardDays: string[];
    restDays: string[];
    maxSessions: number;
  };
  background: string;
}

// ── Constants ────────────────────────────────────────────────────────────────

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_MODEL = "claude-3-7-sonnet-latest";
const MAX_OUTPUT_TOKENS = 20000;
const MAX_INPUT_CHARS = 400000; // ~100k tokens * 4 chars/token — conservative limit for pre-check

// ── Embedded coaching context ─────────────────────────────────────────────────

const ASSESSMENT_CONTEXT = `# Athlete Assessment Guide

## Foundation vs Current Form

These are two different things:

| Dimension               | Timeframe           | What It Tells You                                                 |
| ----------------------- | ------------------- | ----------------------------------------------------------------- |
| **Athletic Foundation** | Lifetime / 2+ years | What the athlete is capable of; training history; race experience |
| **Current Form**        | Last 8-12 weeks     | Where they are RIGHT NOW; starting point for the plan             |

**Why this matters**: An athlete who completed an Ironman last year but has barely trained in 10 weeks is NOT the same as a beginner. They have:

- Muscle memory and movement efficiency
- Mental toughness and race experience
- Knowledge of pacing, nutrition, transitions
- A body that has adapted to high training loads before

Their plan should focus on **rebuilding** (faster progression possible) rather than **building from scratch** (conservative progression required).

## Interpreting Foundation vs Form

| Scenario                       | Foundation  | Current Form | Plan Approach                                      |
| ------------------------------ | ----------- | ------------ | -------------------------------------------------- |
| Ironman finisher, 10 weeks off | Very strong | Low          | Rebuild: faster progression OK, body remembers     |
| First-time triathlete          | None        | Moderate     | Build: conservative progression, everything is new |
| Marathoner doing first tri     | Strong run  | Moderate     | Build swim/bike carefully, leverage run strength   |
| Consistent trainer, no races   | Moderate    | Strong       | Peak: maintain and sharpen, add race specificity   |

## Interpreting Strength Signals

| Signal                              | Interpretation                       |
| ----------------------------------- | ------------------------------------ |
| Long sessions at low HR             | Excellent aerobic base in that sport |
| Historical peaks >> recent activity | Dormant fitness, will return quickly |
| No historical data for a sport      | True beginner, needs careful build   |
| Consistent high volume              | Sport they enjoy and prioritize      |

## Event Requirements Reference

| Event               | Run  |
| ------------------- | ---- |
| Marathon            | 42km |
| Ultra (50k)         | 50km |
| Ultra (100k)        | 100km |

**Gap analysis**: Compare their longest recent/historical sessions against these requirements.

## Validating With The Athlete

**IMPORTANT**: Before creating the training plan, always share your assessment and validate it with the athlete.

### What to Ask

1. **Race history / athletic foundation**: Confirm their background matches the stated history.
2. **Reason for time off**: Injury vs life circumstances affects progression rate.
3. **Strengths assessment**: Confirm perceived strengths match training data.
4. **Limiter identification**: Identify the biggest area for improvement.
5. **Constraints**: Any injuries, schedule constraints, upcoming travel, or equipment limitations.
6. **Goals**: Time goal vs finishing as the main focus.
7. **Preferences**: Workouts they love or hate.

### Why Validation Matters

- Data can mislead: Low recent volume does not equal lack of ability
- Athletes know their bodies: Prior injuries, what causes burnout, what they enjoy
- Buy-in matters: Athletes follow plans they helped shape
- Context changes everything: A "weak" run might be due to recovering from injury, not lack of fitness`;

const LOAD_MANAGEMENT_CONTEXT = `# Training Load Management

Professional coaches quantify training stress to manage fatigue, prevent overtraining, and peak for races.

## Training Stress Score (TSS)

TSS measures the physiological cost of a workout.

### Running TSS (rTSS)

Estimated from pace and HR. Use Strava's suffer_score as a proxy:
- suffer_score approximately equals rTSS for most athletes
- Compare suffer_score per hour across sessions to gauge relative intensity

## Chronic Training Load (CTL) - "Fitness"

CTL is the rolling 42-day weighted average of daily TSS. It represents accumulated fitness.

### CTL Ramp Rate Guidelines

| Athlete Level | Max CTL Increase/Week | Notes                            |
| ------------- | --------------------- | -------------------------------- |
| Beginner      | 3-5 TSS/day           | Conservative to prevent injury   |
| Intermediate  | 5-7 TSS/day           | Standard progression             |
| Advanced      | 7-10 TSS/day          | Aggressive; requires monitoring  |

## Acute Training Load (ATL) - "Fatigue"

ATL is the rolling 7-day weighted average of daily TSS. It represents recent fatigue.

## Training Stress Balance (TSB) - "Form"

TSB = CTL - ATL

| TSB Range  | State        | Implication                                |
| ---------- | ------------ | ------------------------------------------ |
| +15 to +25 | Fresh/peaked | Race ready, may lose fitness if maintained |
| +5 to +15  | Rested       | Good for quality sessions, minor events    |
| -10 to +5  | Neutral      | Normal training state                      |
| -10 to -30 | Fatigued     | Building load, need recovery soon          |
| < -30      | Overreaching | High injury/burnout risk, reduce load      |

### Race Day TSB Targets

| Event       | Target TSB | Taper Length |
| ----------- | ---------- | ------------ |
| Marathon    | +10 to +20 | 14-21 days   |
| Ultra (50K) | +10 to +20 | 14-21 days   |
| Ultra (100K)| +15 to +25 | 21-28 days   |

## Weekly TSS Targets by Phase

| Phase         | % of Peak TSS | Focus                                  |
| ------------- | ------------- | -------------------------------------- |
| Base (early)  | 60-70%        | Building volume                        |
| Base (late)   | 75-85%        | Volume + introducing intensity         |
| Build         | 90-100%       | Peak volume, race-specific work        |
| Peak          | 85-95%        | Maintaining fitness, sharpening        |
| Taper         | 40-60%        | Reducing volume, maintaining intensity |
| Recovery week | 50-60%        | Every 3-4 weeks                        |

## Recovery Monitoring

### Subjective Indicators (1-5 scale)

| Metric          | Questions                        |
| --------------- | -------------------------------- |
| Sleep quality   | How restful? Wake during night?  |
| Energy          | How do you feel getting up?      |
| Muscle soreness | General or localized?            |
| Mood            | Motivated or dreading training?  |

**Warning patterns:**
- 2+ low scores for 3+ days = back off
- Sleep + mood both low = high burnout risk

### Recovery Week Structure

Every 3-4 weeks:
- Volume reduction: 40-50% of normal week
- Intensity reduction: No Zone 4+ work`;

const PERIODIZATION_CONTEXT = `# Periodization & Progressive Overload

## Macrocycle Structure

Unlike traditional road marathon plans, ultramarathon periodization reverses the conventional approach by placing the least specific training furthest from the race and the most specific training closest to the event.

Divide the training period into phases:

### 1. Base Phase (40-50% of available time)

- Focus: Build the cardiovascular engine and maximize VO2 max
- Intensity/Volume: High intensity, lower volume
- Key Workouts: Short intervals (1-6 minutes at 94-98% max HR), hill sprints, and strides to improve running economy and speed
- Strength: General strength and conditioning to prepare the musculoskeletal system

### 2. Build Phase (30-40% of available time)

- Focus: Build high-end aerobic capacity and introduce fatigue resistance
- Intensity/Volume: Moderate intensity (threshold and sub-threshold work), steadily increasing volume
- Key Workouts: Tempo runs, double thresholds (morning and evening sub-threshold intervals), and the introduction of Back-to-Back (B2B) long runs

### 3. Peak/Race-Specific Phase (10-15% of available time)

- Focus: Event specificity and race rehearsal
- Intensity/Volume: Low intensity, maximum volume
- Key Workouts: Peak B2B long runs, environmental specificity (heat/altitude), night running practice, and executing the race-day nutrition strategy
- Strength: Specific Muscular Endurance (ME) workouts, such as weighted uphill hiking and eccentric downhill loading

### 4. Taper (1-3 weeks depending on event)

- Focus: Shed fatigue, repair tissue, and achieve supercompensation while maintaining sharpness
- Week 1 of Taper: Reduce total volume by 20-30%, cutting the peak long run distance in half
- Week 2 of Taper: Reduce total volume by 40-60% of the peak week
- Race Week: Volume drops to roughly 25% of the peak week, with no true long run
- Rule of Thumb: Maintain frequency and a few short, high-intensity efforts to keep the legs feeling snappy, but dramatically cut the duration

## Microcycle Structure (Weekly)

### Principles

1. **Mandate Back-to-Back (B2B) Long Runs** - Schedule moderate-intensity long runs on consecutive days to teach the body to run efficiently on pre-fatigued, glycogen-depleted legs
2. **Strict Intensity Discipline** - Easy days must remain strictly easy (below 75% of max HR) to prioritize durability and mitigate systemic inflammation
3. **Prioritize "Time on Feet"** - Measure training by duration rather than mileage, as technical terrain and massive vertical gain render standard pacing irrelevant
4. **Progression over time** - Emphasize progression in pace and/or mileage both on a weekly volume and key workouts over time

## Progressive Overload

**The 10% Rule**: Increase weekly volume by no more than 10% per week — for athletes building new fitness.

### Adjust Progression Based on Athletic Foundation

| Foundation Level             | Progression Rate        | Rationale                            |
| ---------------------------- | ----------------------- | ------------------------------------ |
| True beginner                | 5-10% per week          | Everything is new; high injury risk  |
| Some experience (1-2 years)  | 10% per week            | Standard progression                 |
| Strong foundation, returning | 10-15% per week         | Body remembers; rebuilding is faster |
| Recent high fitness          | Maintain or small build | Already fit; focus on specificity    |

### 3:1 or 4:1 Loading

- 3 weeks building load, 1 week recovery (reduce volume 30-40%)
- Or 2 weeks building, 1 week recovery for older/injury-prone athletes

### Long Session Progression

For a target marathon (42km), build the long run over 12-16 weeks:

Starting from current fitness base, build the long run week by week:
- Early base: current longest run + 2-3km
- Mid build: up to 28-32km for marathon (peak)
- Ultra: up to 4-6 hour runs for 50km+

Never increase the long session by more than 2-3km (running) per week.

## Event-Specific Training Requirements

### Marathon

**Minimum training time**: 6-10 hours/week at peak
**Minimum build time**: 16-20 weeks

**Weekly structure at peak**:
- 5-6 running days
- 60-90km per week for experienced runners
- One long run (28-35km)
- One quality session (tempo or intervals)
- One medium-long run (18-22km)
- Remaining runs easy

### 50K ultra (31 Miles)
**Peak B2B Weekend Total**: 30-35 miles across two days
- Taper Duration: 1 to 2 weeks
- Key Focus: Sustaining aerobic threshold pace; practicing fueling strategies under moderate intensity

### 50-Mile ultra (80KM)
**Peak B2B Weekend Total**: 40-45 miles across two days
- Taper Duration: 2 to 3 weeks
- Key Focus: Managing mid-race gastrointestinal (GI) distress; combining runnable sections with efficient power hiking

### 100-Mile ultra (160KM)
**Minimum Build Time**: 24 to 32 weeks
**Peak Weekly Volume**: Generally 40-60 miles per week, prioritizing consistency over massive weeks
**Peak B2B Weekend Total**: 50-55 miles across two days
- Taper Duration: 3 weeks
- Key Focus: Night running practice, sleep deprivation strategy, GI training for 60-90g+ of carbs per hour, and supreme eccentric quad durability`;

const RACE_DAY_CONTEXT = `# Race Execution & Nutrition Strategy

## Pacing Principles by Event Duration

| Event Duration | Optimal Strategy                                      | Common Mistake            |
| -------------- | ----------------------------------------------------- | ------------------------- |
| < 60 min       | Negative split (second half faster)                   | Starting too fast         |
| 60-90 min      | Even pacing, slight negative                          | Chasing early pace        |
| 2-4 hours      | Even pacing with controlled start                     | Not respecting first hour |
| 4+ hours       | Conservative start, feel-based middle, push final 20% | ANY early intensity debt  |

## Marathon Pacing

| Strategy        | Best For                           | Execution                                        |
| --------------- | ---------------------------------- | ------------------------------------------------ |
| Even splits     | First-timers, conservative goals   | Run every mile at goal pace                      |
| Slight negative | Experienced, controlled starters   | First half at goal+5-10s/km, second half at goal |
| Progressive     | Very experienced, aggressive goals | First 15km easy, 15-30km at goal, 30-42km push   |

**Red flags during marathon:**
- HR 10+ bpm above expected at same pace = slow down NOW
- Quad burn before halfway = too fast early
- GI distress = slow down, focus on hydration

## Heart Rate Ceiling for Long Events

| Event        | Max Sustainable HR |
| ------------ | ------------------ |
| Marathon     | 85-88% LTHR        |
| Ultra (50K+) | 75-80% LTHR        |

## Race Nutrition Strategy

### Carbohydrate Intake Guidelines

| Event Duration | Carbs/Hour       | Example                         |
| -------------- | ---------------- | ------------------------------- |
| 2.5-4 hours    | 60-90g           | 2-3 gels + sports drink         |
| 4+ hours       | 80-120g          | Gels + bars + drink + real food |

**Gut training is essential.** Practice race nutrition in training — start with 30g/hr and build up over 4-6 weeks.

### Hydration Guidelines

| Conditions         | Fluid/Hour | Sodium/Hour |
| ------------------ | ---------- | ----------- |
| Cool (<18°C)       | 400-600ml  | 300-500mg   |
| Moderate (18-25°C) | 600-800ml  | 500-700mg   |
| Hot (>25°C)        | 800-1000ml | 700-1000mg  |

## Marathon Nutrition Plan

Pre-race: 3 hours before: 100-150g carbs
          30min before: Sip sports drink

Race:
- Take gel every 45-60min (start at 45min mark)
- Water at every other aid station
- Total: 90-150g carbs depending on time

## Handling Athlete Constraints

When the athlete mentions constraints in their goal notes, adapt accordingly:

- **Travel week**: Reduce volume, provide bodyweight/hotel gym alternatives
- **Injury history**: Avoid aggravating movements, include prehab work
- **Time-crunched**: Prioritize key sessions, use high-intensity low-duration alternatives
- **Family commitments**: Stack long workouts on one weekend day if needed`;

const WORKOUTS_CONTEXT = `# Sport-Specific Workout Library

## Running

### Workout Types

| Session Type     | Structure               | Pace/Zone                           | When to Use               |
| ---------------- | ----------------------- | ----------------------------------- | ------------------------- |
| Recovery         | 30-45min very easy      | Zone 1, E+30s/km                    | After hard days           |
| Aerobic          | 45-75min steady         | Zone 2, E pace                      | 60-70% of run volume      |
| Long Run         | 90min-3hr               | Zone 2, start easy, finish moderate | Weekly, primary endurance |
| Tempo            | 20-40min continuous     | Zone 4, T pace                      | Build phase, 1x/week      |
| Cruise Intervals | 4-6 x 1mi, 60-90s jog   | T pace                              | Threshold development     |
| VO2max Intervals | 5-6 x 1000m, 400m jog   | I pace                              | Peak phase, 1x/week       |
| Repetitions      | 8-12 x 400m, 400m jog   | R pace                              | Speed, late build/peak    |
| Progression      | Last 25% at faster pace | E → M → T                           | Race simulation           |
| Fartlek          | Unstructured speed play | Varies                              | Mental break, adaptable   |

### Sample Sessions

**Threshold Cruise Intervals:**
Warm-up: 15min easy, 4x100m strides
Main: 5 x 1600m @ T pace (LTHR 100%), 90s jog recovery
Cool-down: 10min easy
Total: 75min, moderate-high stress

**VO2max Development:**
Warm-up: 15min easy, 6x100m strides
Main: 5 x 1000m @ I pace (LTHR 103-106%), 400m jog recovery
Cool-down: 15min easy
Total: 60min, high stress

**Marathon-Specific Long Run:**
Warm-up: 2km very easy
Main: 24km total
      - First 16km @ E pace (Zone 2)
      - Final 8km @ M pace (Zone 3)
Cool-down: 1km walk/easy jog
Nutrition: Practice race-day fueling every 30-45min

**Progression Run (Advanced):**
16km total:
- 0-6km: Easy (Zone 2)
- 6-10km: Steady (Zone 2-3)
- 10-14km: Tempo (Zone 4)
- 14-16km: Threshold (Zone 5a)

### Long Run Targets by Event

| Event         | Peak Long Run    | Frequency       | Notes                            |
| ------------- | ---------------- | --------------- | -------------------------------- |
| Half Marathon | 18-22km          | Weekly          | 1-2 runs at goal pace            |
| Marathon      | 32-35km          | Every 2-3 weeks | Don't exceed 3.5hr               |
| Ultra (50K)   | 35-45km or 4-5hr | Every 2-3 weeks | Time-based, practice nutrition   |
| Ultra (100K+) | 50-60km or 5-6hr | Monthly         | Back-to-back long runs work well |

## Session Intensity Distribution (Polarized Model)

For endurance events, 80% of volume should be easy (Zone 1-2), 20% hard (Zone 4+). Avoid excessive Zone 3 "gray zone" training.

| Zone         | % of Weekly Volume | Purpose                       |
| ------------ | ------------------ | ----------------------------- |
| 1-2 (Easy)   | 75-80%             | Aerobic development, recovery |
| 3 (Moderate) | 5-10%              | Race-specific only            |
| 4-5 (Hard)   | 15-20%             | Stimulus for adaptation       |`;

const ZONES_CONTEXT = `# Training Zones & Field Testing

Professional coaching requires accurate training zones derived from field tests, not arbitrary percentages of max HR.

## Lactate Threshold Heart Rate (LTHR) Zones

LTHR is the heart rate at lactate threshold — the intensity you could sustain for approximately 60 minutes in a race. It is more accurate than max HR for prescribing training.

### Running LTHR Zones (Friel 7-Zone System)

| Zone | Name          | % of LTHR | Purpose                                | Feel                               |
| ---- | ------------- | --------- | -------------------------------------- | ---------------------------------- |
| 1    | Recovery      | < 81%     | Active recovery, warm-up/cool-down     | Very easy, could talk indefinitely |
| 2    | Aerobic       | 81-89%    | Aerobic base building, fat oxidation   | Easy, full conversations           |
| 3    | Tempo         | 90-93%    | Muscular endurance, aerobic capacity   | Moderate, sentences only           |
| 4    | Sub-threshold | 94-99%    | Lactate tolerance, threshold extension | Hard, few words at a time          |
| 5a   | Threshold     | 100-102%  | Lactate threshold improvement          | Very hard, race effort for 60min   |
| 5b   | VO2max        | 103-106%  | VO2max development                     | Extremely hard, 3-8min max         |
| 5c   | Anaerobic     | > 106%    | Neuromuscular power, speed             | Max effort, < 3min                 |

## Field Testing Protocols

### Run: 30-Minute Threshold Test

1. Warm up 15 minutes easy (Zone 1-2)
2. Run 30 minutes at the hardest sustainable pace (simulate race effort)
3. Record average HR for the entire 30 minutes = LTHR
4. Cool down 10 minutes easy
5. Average pace = approximate lactate threshold pace

Note: Some coaches use final 20 minutes of a 30-min test to exclude early pacing errors.

### When to Retest

- Every 6-8 weeks during base/build phases
- After recovery weeks (when fresh)
- If perceived effort no longer matches prescribed zones

## Running Pace Zones (VDOT / Jack Daniels)

For athletes with known race times:

| Zone | Name       | Description                  | How to Determine                                  |
| ---- | ---------- | ---------------------------- | ------------------------------------------------- |
| E    | Easy       | Daily running, long runs     | 59-74% VO2max; 1:00-1:30/km slower than threshold |
| M    | Marathon   | Marathon race pace           | 75-84% VO2max; sustainable for 2-4 hours          |
| T    | Threshold  | Tempo runs, cruise intervals | 83-88% VO2max; ~60min race pace                   |
| I    | Interval   | VO2max development           | 95-100% VO2max; 3-5min repeats                    |
| R    | Repetition | Speed, neuromuscular         | > 100% VO2max; short reps with full recovery      |

**Pace Estimation from Threshold:**
- Easy pace: Threshold + 50-70 sec/km
- Marathon pace: Threshold + 15-25 sec/km
- Interval pace: Threshold - 15-20 sec/km
- Repetition pace: Threshold - 25-35 sec/km`;

const KEY_COACHING_PRINCIPLES = `1. **Consistency over heroics**: Regular moderate training and cumulative weekly volume beat occasional big efforts. Single runs exceeding three to four hours can yield diminishing returns and require excessive recovery time.
2. **Easy days easy, hard days hard**: Do not let quality sessions become junk miles. Low-intensity, aerobic work should comprise about 90% of the annual training load to prioritize durability and mitigate systemic inflammation
3. **Respect recovery**: Fitness is built during rest, not during workouts. Proper recovery requires adequate sleep, nutritional replenishment, and lowering muscle tension during easy days
4. **Progress the limiter**: Allocate more time to weaknesses while maintaining strengths. Address specific athlete limitations early in the training cycle to raise their overall performance ceiling
5. **Specificity increases over time**: Early training is general, but late training must mimic the exact race demands. This includes specific terrain, environmental conditions, and the modes of locomotion required on course
6. **Taper adequately**: Most athletes under-taper, but you must trust the fitness you have built. A proper taper allows the body to repair tissue, build up glycogen reserves, and achieve supercompensation so the athlete arrives at the start line fresh
7. **Systematically train the gut**: The gastrointestinal tract must be progressively trained over 6 to 12 weeks to tolerate high carbohydrate intake during exercise. Prescribe up to 90 to 120 grams of carbohydrates per hour using a 1:0.8 ratio of glucose to fructose to maximize absorption and reduce GI distress
8. **Target Muscular Endurance (ME) and eccentric loading**: Strength training should target the specific demands of the race. For mountain ultras, prescribe eccentric loading to harden the quadriceps for downhills, and weighted uphill hiking to build fatigue resistance in the propelling muscles
9. **Use running doubles for cumulative volume and thresholds**: Splitting a single session into two runs allows athletes to safely accumulate massive weekly volume or increase total time at threshold intensity. This approach minimizes muscular damage, lowers the overall physiological cost per session, and speeds up recovery
10. **Utilize Back-to-Back (B2B) long runs**: Back-to-back long runs (typically Saturday and Sunday) are a foundational element designed to build cumulative fatigue and teach the athlete to run efficiently on glycogen-depleted legs
11. **Power hiking is a mandatory skill**: Walking is a strategic necessity in ultramarathons. Explicitly schedule power-hiking practice into training to develop the specific muscle recruitment patterns required for steep ascents when training for hilly ultras at 100km or longer`;

const CRITICAL_REMINDERS = `* **Never skip athlete validation** - Present your assessment and get confirmation before writing the plan
* **Distinguish foundation from form** - An Ironman finisher who took 3 months off is NOT the same as a beginner
* **Zones must be established** before prescribing specific workouts
* **Explain the "why"** - Athletes trust and follow plans they understand
* **Be conservative with manual data** - When working without Strava, err on the side of caution with volume and intensity
* **Account for life stress and logistics** - Assess the athlete's life bandwidth before building the plan. Ensure that peak training blocks, back-to-back weekends, or course reconnaissance camps do not conflict with high-stress life events
* **Recommend field tests** - For manual data athletes, include zone validation workouts in the first 1-2 weeks`;

const FEW_SHOT_EXAMPLE = `{
  "meta": {
    "id": "krs-ultra-smve-2026",
    "athlete": "Alexander Solum",
    "event": "KRS Ultra 60km",
    "eventDate": "2026-04-11",
    "planStartDate": "2026-03-30",
    "planEndDate": "2026-04-11",
    "createdAt": "2026-03-29T12:00:00Z",
    "updatedAt": "2026-03-29T12:00:00Z",
    "totalWeeks": 2,
    "generatedBy": "Claude Coach"
  },
  "assessment": {
    "foundation": {
      "raceHistory": ["CCC 101km (17:48)", "SMVE 50mi winner (9:00)"],
      "peakTrainingLoad": 22,
      "foundationLevel": "advanced",
      "yearsInSport": 5
    },
    "currentForm": {
      "weeklyKm": 70,
      "longestRun": 35,
      "consistency": 12
    },
    "strengths": [{"area": "aerobic base", "evidence": "Strong aerobic base — long runs at HR 127-138, well below Z2 ceiling"}],
    "limiters": [{"area": "race specificity", "evidence": "Longest single run in current block is 35 km — needs progression toward 90 km specificity"}],
    "constraints": ["Run commute doubles are easy only — no threshold doubles", "Family with two young boys"]
  },
  "zones": {
    "run": {
      "hr": {
        "lthr": 172,
        "zones": [
          {"zone": 1, "name": "Recovery", "percentLow": 0, "percentHigh": 81, "hrLow": 0, "hrHigh": 139},
          {"zone": 2, "name": "Aerobic", "percentLow": 81, "percentHigh": 89, "hrLow": 139, "hrHigh": 153},
          {"zone": 3, "name": "Tempo", "percentLow": 90, "percentHigh": 93, "hrLow": 155, "hrHigh": 160},
          {"zone": 4, "name": "Sub-threshold", "percentLow": 94, "percentHigh": 99, "hrLow": 162, "hrHigh": 170},
          {"zone": 5, "name": "Threshold", "percentLow": 100, "percentHigh": 102, "hrLow": 172, "hrHigh": 175}
        ]
      },
      "pace": [
        {"zone": "E", "name": "Easy", "paceRange": "5:30-6:00/km"},
        {"zone": "M", "name": "Marathon", "paceRange": "4:50-5:10/km"},
        {"zone": "T", "name": "Threshold", "paceRange": "4:20-4:35/km"}
      ]
    }
  },
  "phases": [
    {
      "name": "KRS Taper",
      "startWeek": 1,
      "endWeek": 2,
      "focus": "Shed fatigue, maintain sharpness for KRS Ultra 60km on April 11",
      "weeklyHoursRange": {"low": 6, "high": 8},
      "keyWorkouts": ["Short sharpener intervals", "Easy B2B weekend"],
      "physiologicalGoals": ["Supercompensation", "Glycogen loading", "Tissue repair"]
    }
  ],
  "weeks": [
    {
      "weekNumber": 1,
      "startDate": "2026-03-30",
      "endDate": "2026-04-05",
      "phase": "KRS Taper",
      "focus": "Volume reduction week 1. Maintain frequency, cut long run. One sharpener.",
      "targetHours": 7,
      "isRecoveryWeek": false,
      "days": [
        {
          "date": "2026-03-30",
          "dayOfWeek": "Monday",
          "workouts": [
            {
              "id": "w1-mon-commute",
              "sport": "run",
              "type": "aerobic",
              "name": "Easy Run",
              "durationMinutes": 60,
              "distanceKm": 13,
              "primaryZone": "Zone 1",
              "humanReadable": "60 min easy run at conversational pace.",
              "completed": false
            }
          ]
        },
        {
          "date": "2026-04-01",
          "dayOfWeek": "Wednesday",
          "workouts": [
            {
              "id": "w1-wed-sharpener",
              "sport": "run",
              "type": "intervals",
              "name": "Taper Sharpener",
              "description": "Short efforts for neuromuscular activation.",
              "durationMinutes": 50,
              "distanceKm": 10,
              "primaryZone": "Zone 1-4",
              "humanReadable": "WU: 15m. Main: 6x1m @ Z4, 2m recovery. CD: 15m.",
              "completed": false
            }
          ]
        },
        {
          "date": "2026-04-05",
          "dayOfWeek": "Sunday",
          "workouts": [
            {
              "id": "w1-sun-long",
              "sport": "run",
              "type": "long",
              "name": "Moderate Long Run",
              "durationMinutes": 90,
              "distanceKm": 18,
              "primaryZone": "Zone 2",
              "humanReadable": "90 min easy Zone 2. No pushing.",
              "completed": false
            }
          ]
        }
      ],
      "summary": {"totalHours": 7, "totalKm": 60, "sessions": 5}
    }
  ],
  "raceStrategy": {
    "event": {
      "name": "KRS Ultra 60km",
      "date": "2026-04-11",
      "type": "ultra",
      "distance": 60
    },
    "pacing": {
      "run": {
        "target": "Conservative start — 6:40-7:30/km terrain adjusted",
        "notes": "Start conservatively. Feel-based middle. Push final 20%."
      }
    },
    "nutrition": {
      "preRace": "3 hours before: 100-150g carbs, low fiber",
      "during": {
        "carbsPerHour": 80,
        "fluidPerHour": "750ml",
        "products": ["Gels", "Real food at aid stations"]
      },
      "notes": "Practice nutrition in all long runs."
    },
    "taper": {
      "startDate": "2026-03-30",
      "volumeReduction": 40,
      "notes": "Maintain intensity, reduce total volume 40%."
    }
  }
}`;

// ── System prompt ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are an expert endurance running coach specializing in marathon and ultramarathon events.
Your coaching methodology is based on progressive periodization, zone-based training, and practical execution.

## Key Coaching Principles
${KEY_COACHING_PRINCIPLES}

## Critical Reminders
${CRITICAL_REMINDERS}

## Assessment Methodology
${ASSESSMENT_CONTEXT}

## Zone Definitions
${ZONES_CONTEXT}

## Load Management
${LOAD_MANAGEMENT_CONTEXT}

## Periodization
${PERIODIZATION_CONTEXT}

## Workout Library
${WORKOUTS_CONTEXT}

## Race Strategy
${RACE_DAY_CONTEXT}

## Output Format
You MUST respond with a single valid JSON object and nothing else. No markdown fences, no explanation, no text before or after the JSON. 
If any data points seem missing or misaligned (e.g., longest run is 0), make reasonable conservative assumptions based on the rest of the profile and proceed with plan generation. DO NOT ask clarifying questions or output anything other than the JSON object.

## Plan Generation Constraints
Keep workout descriptions and "humanReadable" fields extremely concise (max 2 sentences). The description field is optional and should only be used for complex workouts. 
IMPORTANT: To prevent timeouts, keep the JSON structure as lean as possible while still being complete.

The plan JSON must follow this running-only schema (no swim or bike fields):
- meta: { id, athlete, event, eventDate, planStartDate, planEndDate, createdAt, updatedAt, totalWeeks, generatedBy }
- assessment: { foundation: { raceHistory, peakTrainingLoad, foundationLevel, yearsInSport }, currentForm: { weeklyKm, longestRun, consistency }, strengths, limiters, constraints }
- zones: { run: { hr: { lthr, zones: [{ zone, name, percentLow, percentHigh, hrLow, hrHigh }] }, pace: [{ zone, name, paceRange }] } }
- phases: [{ name, startWeek, endWeek, focus, weeklyHoursRange: { low, high }, keyWorkouts, physiologicalGoals }]
- weeks: [{ weekNumber, startDate, endDate, phase, focus, targetHours, isRecoveryWeek, days: [{ date, dayOfWeek, workouts: [{ id, sport, type, name, description (optional), durationMinutes, distanceKm, primaryZone, humanReadable, completed }] }], summary: { totalHours, totalKm, sessions } }]
- raceStrategy: { event: { name, date, type, distance }, pacing: { run: { target, notes } }, nutrition: { preRace, during: { carbsPerHour, fluidPerHour, products }, notes }, taper: { startDate, volumeReduction, notes } }

Here is a concrete example of the expected output structure (condensed to 1 week):
${FEW_SHOT_EXAMPLE}`;

const CHAT_MAX_OUTPUT_TOKENS = 4096;

const CHAT_SYSTEM_PROMPT = `You are Marius AI Bakken, an expert endurance running coach. You are having a conversation with your athlete about their training plan.

## Key Coaching Principles
${KEY_COACHING_PRINCIPLES}

## Your Authority
- You can suggest modifications to workouts in the CURRENT WEEK and any FUTURE weeks up to the goal race.
- Past weeks are READ-ONLY context — never suggest changes to completed or past workouts.
- Focus on targeted tweaks: adjusting duration, distance, type, or moving workouts. For a complete plan overhaul, recommend the athlete use the "Regenerate Plan" feature.

## Response Format
You MUST respond with a single valid JSON object. No markdown fences, no text before or after.

The JSON must have this exact shape:
{
  "text": "Your coaching advice in plain text. Be conversational, explain your reasoning.",
  "patch": null or [
    {
      "week": <weekNumber integer>,
      "dayDate": "<YYYY-MM-DD>",
      "workoutId": "<existing workout id string>",
      "fields": {
        // Only include fields that change. Valid fields:
        // "sport": string, "type": string, "name": string,
        // "description": string, "durationMinutes": number,
        // "distanceKm": number, "primaryZone": string,
        // "humanReadable": string
      }
    }
  ],
  "patchSummary": null or "Human-readable one-line summary of changes"
}

Rules for the patch array:
- "patch" is null when you are giving advice without proposing a modification.
- "patch" is an array when you propose specific workout changes.
- "week" MUST be the weekNumber integer from the plan data.
- "dayDate" MUST be the exact ISO date string from the plan data.
- "workoutId" MUST be an existing workout id from the plan data.
- "fields" contains ONLY the fields that change — do not include unchanged fields.
- Keep patches minimal — tweak, do not overhaul.
- "patchSummary" is null when patch is null, otherwise a brief human-readable description.

Example response with a patch:
{
  "text": "Given your fatigue signals this week, I'd recommend reducing Monday's easy run to 45 minutes instead of 60. This gives you more recovery while keeping the aerobic stimulus.",
  "patch": [
    {
      "week": 3,
      "dayDate": "2026-04-14",
      "workoutId": "w3-mon-easy",
      "fields": {
        "durationMinutes": 45,
        "description": "Reduced to 45 min for recovery — fatigue signals elevated"
      }
    }
  ],
  "patchSummary": "Mon Apr 14: Easy Run reduced from 60 min to 45 min for recovery"
}

Example response without a patch:
{
  "text": "Your training load looks well balanced this week. The long run on Sunday is appropriately placed after two easy days...",
  "patch": null,
  "patchSummary": null
}`;

const INSIGHTS_SYNTHESIS_SYSTEM_PROMPT = `You are an expert endurance running coach writing a concise training synthesis.

Return plain text only. Do not use markdown code fences or JSON.

Write exactly four labeled lines in this order:
Mileage Trend:
Intensity Distribution:
Long-Run Progression:
Race Readiness:

Each line should be 1-2 sentences grounded in the supplied training data. If the data is incomplete, say so briefly and stay conservative.`;

// ── Helper functions ─────────────────────────────────────────────────────────

function getBearerToken(req: Request): string | null {
  const authHeader =
    req.headers.get("Authorization") ||
    req.headers.get("authorization") ||
    "";
  const [scheme, token] = authHeader.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) return null;
  return token;
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

function buildUserPrompt(payload: AthletePayload): string {
  return `Generate a complete training plan for this athlete:

## Race Goal
Event: ${payload.raceGoal.eventName}
Date: ${payload.raceGoal.eventDate}
Type: ${payload.raceGoal.eventType}

## Current Fitness
Weekly km: ${payload.fitness.weeklyKm}
Longest recent run: ${payload.fitness.longestRun} km
LTHR: ${payload.fitness.lthr} bpm
Years running: ${payload.fitness.yearsRunning}

## Weekly Constraints
Preferred long run day: ${payload.constraints.longRunDay}
Preferred hard workout days: ${payload.constraints.hardDays.join(", ")}
Rest days: ${payload.constraints.restDays.join(", ")}
Max sessions per week: ${payload.constraints.maxSessions}

## Background
${payload.background}`;
}

function buildChatMessages(payload: any): Array<{role: string; content: string}> {
  const messages: Array<{role: string; content: string}> = [];

  // Build the context preamble as the first user message
  let contextBlock = "## Your Athlete's Training Plan Context\n\n";

  if (payload.hierarchicalPlanWindow) {
    const w = payload.hierarchicalPlanWindow;
    if (w.currentWeek) {
      contextBlock += `### Current Week (Week ${w.currentWeek.weekNumber} — ${w.currentWeek.phase})\n`;
      contextBlock += `Focus: ${w.currentWeek.focus}\n`;
      contextBlock += JSON.stringify(w.currentWeek.days, null, 2) + "\n\n";
    }
    if (w.pastWeeks?.length) {
      contextBlock += `### Recent Completed Weeks (last ${w.pastWeeks.length} weeks)\n`;
      contextBlock += JSON.stringify(w.pastWeeks, null, 2) + "\n\n";
    }
    if (w.futureWeeks?.length) {
      contextBlock += `### Upcoming Scheduled Weeks (next ${w.futureWeeks.length} weeks)\n`;
      contextBlock += JSON.stringify(w.futureWeeks, null, 2) + "\n\n";
    }
  }

  if (payload.recentActivities?.length) {
    contextBlock += "### Recent Strava Activities (last 24 days)\n";
    contextBlock += JSON.stringify(payload.recentActivities, null, 2) + "\n\n";
  }

  if (payload.dailyLogs?.length) {
    contextBlock += "### Recent Daily Wellness Logs\n";
    contextBlock += JSON.stringify(payload.dailyLogs, null, 2) + "\n\n";
  }

  if (payload.latestCheckin) {
    contextBlock += "### Latest Weekly Check-in\n";
    contextBlock += JSON.stringify(payload.latestCheckin, null, 2) + "\n\n";
  }

  if (payload.runnerProfile) {
    contextBlock += "### Runner Profile\n";
    contextBlock += JSON.stringify(payload.runnerProfile, null, 2) + "\n\n";
  }

  // Add context as first user message
  messages.push({ role: "user", content: contextBlock + "\n(This is context about my training — please acknowledge it briefly and wait for my question.)" });
  messages.push({ role: "assistant", content: JSON.stringify({ text: "I've reviewed your training plan and recent activity data. What would you like to discuss?", patch: null, patchSummary: null }) });

  // Add conversation history
  if (payload.conversationHistory?.length) {
    for (const msg of payload.conversationHistory) {
      messages.push({
        role: msg.role === "user" ? "user" : "assistant",
        content: typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content),
      });
    }
  }

  // Add current user message
  if (payload.userMessage) {
    messages.push({ role: "user", content: payload.userMessage });
  }

  return messages;
}

function buildInsightsSynthesisPrompt(payload: any): string {
  const sections: string[] = [
    "Summarize this athlete's recent training using the required four headings.",
  ];

  if (payload.weeklySummary?.length) {
    sections.push("## Weekly Summary");
    sections.push(JSON.stringify(payload.weeklySummary, null, 2));
  }

  if (payload.recentActivities?.length) {
    sections.push("## Recent Activities");
    sections.push(JSON.stringify(payload.recentActivities, null, 2));
  }

  if (payload.recentCheckins?.length) {
    sections.push("## Recent Check-ins");
    sections.push(JSON.stringify(payload.recentCheckins, null, 2));
  } else if (payload.latestCheckin) {
    sections.push("## Latest Check-in");
    sections.push(JSON.stringify(payload.latestCheckin, null, 2));
  }

  if (payload.dailyLogs?.length) {
    sections.push("## Daily Logs");
    sections.push(JSON.stringify(payload.dailyLogs, null, 2));
  }

  if (payload.planContext) {
    sections.push("## Plan Context");
    sections.push(JSON.stringify(payload.planContext, null, 2));
  }

  if (payload.runnerProfile) {
    sections.push("## Runner Profile");
    sections.push(JSON.stringify(payload.runnerProfile, null, 2));
  }

  if (payload.lang) {
    sections.push(`## Language\n${payload.lang}`);
  }

  return sections.join("\n\n");
}

function validatePatchArray(patch: any): boolean {
  if (patch === null || patch === undefined) return true;
  if (!Array.isArray(patch)) return false;
  return patch.every((p: any) =>
    typeof p.week === "number" &&
    typeof p.dayDate === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(p.dayDate) &&
    typeof p.workoutId === "string" &&
    p.workoutId.length > 0 &&
    typeof p.fields === "object" &&
    p.fields !== null
  );
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries = 1,
  initialDelay = 500
): Promise<Response> {
  let lastError: any;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        const delay = initialDelay * Math.pow(2, attempt - 1);
        console.log(`Retry attempt ${attempt} after ${delay}ms delay...`);
        await sleep(delay);
      }

      const response = await fetch(url, options);

      // Retry on 499 (Client disconnected), 529 (Overloaded), 429 (Rate Limit), or 5xx (Server Error)
      if (
        response.status === 499 ||
        response.status === 529 ||
        response.status === 429 ||
        (response.status >= 500 && response.status <= 599)
      ) {
        if (attempt < maxRetries) {
          console.warn(`Claude API returned ${response.status}. Retrying...`);
          continue;
        }
      }

      return response;
    } catch (err) {
      lastError = err;
      if (attempt < maxRetries) {
        console.warn(`Fetch error: ${err}. Retrying...`);
        continue;
      }
    }
  }
  throw lastError || new Error("Max retries reached");
}

// ── API Payload Building ─────────────────────────────────────────────────────

function buildGeneratePayload(userPrompt: string) {
  return {
    model: ANTHROPIC_MODEL,
    max_tokens: MAX_OUTPUT_TOKENS,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userPrompt }],
    tools: [
      {
        name: "generate_training_plan",
        description: "Generates a complete, structured endurance training plan for an athlete based on their profile and goals.",
        input_schema: {
          type: "object",
          properties: {
            meta: {
              type: "object",
              properties: {
                id: { type: "string" },
                athlete: { type: "string" },
                event: { type: "string" },
                eventDate: { type: "string", format: "date" },
                planStartDate: { type: "string", format: "date" },
                planEndDate: { type: "string", format: "date" },
                createdAt: { type: "string", format: "date-time" },
                updatedAt: { type: "string", format: "date-time" },
                totalWeeks: { type: "integer" },
                generatedBy: { type: "string" }
              },
              required: ["id", "athlete", "event", "eventDate", "planStartDate", "planEndDate", "totalWeeks", "generatedBy"]
            },
            assessment: {
              type: "object",
              properties: {
                foundation: {
                  type: "object",
                  properties: {
                    raceHistory: { type: "array", items: { type: "string" } },
                    peakTrainingLoad: { type: "number" },
                    foundationLevel: { type: "string" },
                    yearsInSport: { type: "number" }
                  }
                },
                currentForm: {
                  type: "object",
                  properties: {
                    weeklyKm: { type: "number" },
                    longestRun: { type: "number" },
                    consistency: { type: "number" }
                  }
                },
                strengths: { type: "array", items: { type: "object", properties: { area: { type: "string" }, evidence: { type: "string" } } } },
                limiters: { type: "array", items: { type: "object", properties: { area: { type: "string" }, evidence: { type: "string" } } } },
                constraints: { type: "array", items: { type: "string" } }
              }
            },
            zones: {
              type: "object",
              properties: {
                run: {
                  type: "object",
                  properties: {
                    hr: {
                      type: "object",
                      properties: {
                        lthr: { type: "number" },
                        zones: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              zone: { type: "integer" },
                              name: { type: "string" },
                              percentLow: { type: "number" },
                              percentHigh: { type: "number" },
                              hrLow: { type: "number" },
                              hrHigh: { type: "number" }
                            }
                          }
                        }
                      }
                    },
                    pace: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          zone: { type: "string" },
                          name: { type: "string" },
                          paceRange: { type: "string" }
                        }
                      }
                    }
                  }
                }
              }
            },
            phases: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  startWeek: { type: "integer" },
                  endWeek: { type: "integer" },
                  focus: { type: "string" },
                  weeklyHoursRange: { type: "object", properties: { low: { type: "number" }, high: { type: "number" } } },
                  keyWorkouts: { type: "array", items: { type: "string" } },
                  physiologicalGoals: { type: "array", items: { type: "string" } }
                }
              }
            },
            weeks: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  weekNumber: { type: "integer" },
                  startDate: { type: "string", format: "date" },
                  endDate: { type: "string", format: "date" },
                  phase: { type: "string" },
                  focus: { type: "string" },
                  targetHours: { type: "number" },
                  isRecoveryWeek: { type: "boolean" },
                  days: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        date: { type: "string", format: "date" },
                        dayOfWeek: { type: "string" },
                        workouts: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              id: { type: "string" },
                              sport: { type: "string" },
                              type: { type: "string" },
                              name: { type: "string" },
                              description: { type: "string" },
                              durationMinutes: { type: "number" },
                              distanceKm: { type: "number" },
                              primaryZone: { type: "string" },
                              humanReadable: { type: "string" },
                              completed: { type: "boolean" }
                            },
                            required: ["id", "sport", "type", "name", "durationMinutes", "primaryZone", "humanReadable", "completed"]
                          }
                        }
                      }
                    }
                  },
                  summary: { type: "object", properties: { totalHours: { type: "number" }, totalKm: { type: "number" }, sessions: { type: "integer" } } }
                }
              }
            },
            raceStrategy: {
              type: "object",
              properties: {
                event: { type: "object", properties: { name: { type: "string" }, date: { type: "string", format: "date" }, type: { type: "string" }, distance: { type: "number" } } },
                pacing: { type: "object", properties: { run: { type: "object", properties: { target: { type: "string" }, notes: { type: "string" } } } } },
                nutrition: { type: "object", properties: { preRace: { type: "string" }, during: { type: "object", properties: { carbsPerHour: { type: "number" }, fluidPerHour: { type: "string" }, products: { type: "array", items: { type: "string" } } } }, notes: { type: "string" } } },
                taper: { type: "object", properties: { startDate: { type: "string", format: "date" }, volumeReduction: { type: "number" }, notes: { type: "string" } } }
              }
            }
          },
          required: ["meta", "assessment", "zones", "phases", "weeks", "raceStrategy"]
        }
      }
    ],
    tool_choice: { type: "tool", name: "generate_training_plan" }
  };
}

function buildChatPayload(chatMessages: Array<{role: string; content: string}>) {
  return {
    model: ANTHROPIC_MODEL,
    max_tokens: CHAT_MAX_OUTPUT_TOKENS,
    system: CHAT_SYSTEM_PROMPT,
    messages: chatMessages,
    tools: [
      {
        name: "respond_to_athlete",
        description: "Provides a conversational response to the athlete with optional training plan modifications.",
        input_schema: {
          type: "object",
          properties: {
            text: { type: "string", description: "The conversational coaching advice." },
            patch: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  week: { type: "integer" },
                  dayDate: { type: "string", format: "date" },
                  workoutId: { type: "string" },
                  fields: {
                    type: "object",
                    properties: {
                      sport: { type: "string" },
                      type: { type: "string" },
                      name: { type: "string" },
                      description: { type: "string" },
                      durationMinutes: { type: "number" },
                      distanceKm: { type: "number" },
                      primaryZone: { type: "string" },
                      humanReadable: { type: "string" }
                    }
                  }
                },
                required: ["week", "dayDate", "workoutId", "fields"]
              },
              nullable: true
            },
            patchSummary: { type: "string", nullable: true }
          },
          required: ["text", "patch", "patchSummary"]
        }
      }
    ],
    tool_choice: { type: "tool", name: "respond_to_athlete" }
  };
}

function buildInsightsSynthesisPayload(userPrompt: string) {
  return {
    model: ANTHROPIC_MODEL,
    max_tokens: 800,
    system: INSIGHTS_SYNTHESIS_SYSTEM_PROMPT,
    messages: [{ role: "user", content: userPrompt }],
  };
}

// ── Main handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Initialize Supabase client
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    // 1. Auth check
    const accessToken = getBearerToken(req);
    if (!accessToken) {
      return new Response(
        JSON.stringify({ error: "Missing bearer token" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Extract user ID from JWT payload
    let userId: string | null = null;
    try {
      const parts = accessToken.split(".");
      if (parts.length === 3) {
        const base64Url = parts[1];
        const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
        const jsonStr = atob(base64);
        const payload = JSON.parse(jsonStr);
        userId = payload.sub;
      }
    } catch (e) {
      console.error("JWT decode error:", e);
    }

    if (!userId) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: Invalid or missing user in token" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 2. Parse request body
    const payload = await req.json();

    // ── MODE DISPATCH ──
    if (payload.mode === "insights_synthesis") {
      const userPrompt = buildInsightsSynthesisPrompt(payload);
      const totalInputChars = INSIGHTS_SYNTHESIS_SYSTEM_PROMPT.length + userPrompt.length;
      if (totalInputChars > MAX_INPUT_CHARS) {
        return new Response(
          JSON.stringify({
            error: "Insights payload too large.",
            estimatedTokens: estimateTokens(String(totalInputChars)),
          }),
          { status: 413, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
      if (!anthropicKey) {
        return new Response(
          JSON.stringify({ error: "ANTHROPIC_API_KEY not configured" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const aiResponse = await fetchWithRetry(ANTHROPIC_URL, {
        method: "POST",
        headers: {
          "x-api-key": anthropicKey,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify(buildInsightsSynthesisPayload(userPrompt)),
      });

      if (!aiResponse.ok) {
        const errBody = await aiResponse.text();
        return new Response(
          JSON.stringify({ error: "Claude API error", status: aiResponse.status, detail: errBody }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const aiResult = await aiResponse.json();
      const synthesis = aiResult.content
        ?.filter((block: any) => block?.type === "text")
        .map((block: any) => block.text)
        .join("\n")
        .trim();

      if (!synthesis) {
        return new Response(
          JSON.stringify({ error: "Empty response from Claude" }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({
          synthesis,
          usage: aiResult.usage,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (payload.mode === "chat") {
      const chatMessages = buildChatMessages(payload);

      const totalInputChars = CHAT_SYSTEM_PROMPT.length +
        chatMessages.reduce((sum, m) => sum + m.content.length, 0);
      if (totalInputChars > MAX_INPUT_CHARS) {
        return new Response(
          JSON.stringify({
            error: "Chat payload too large.",
            estimatedTokens: estimateTokens(String(totalInputChars)),
          }),
          { status: 413, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
      if (!anthropicKey) {
        return new Response(
          JSON.stringify({ error: "ANTHROPIC_API_KEY not configured" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const aiResponse = await fetchWithRetry(ANTHROPIC_URL, {
        method: "POST",
        headers: {
          "x-api-key": anthropicKey,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify(buildChatPayload(chatMessages)),
      });

      if (!aiResponse.ok) {
        const errBody = await aiResponse.text();
        return new Response(
          JSON.stringify({ error: "Claude API error", status: aiResponse.status, detail: errBody }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const aiResult = await aiResponse.json();

      // Extract JSON from tool use
      const toolCall = aiResult.content.find((c: any) => c.type === "tool_use");
      if (!toolCall) {
        return new Response(
          JSON.stringify({ error: "No tool use in Claude response" }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const chatData = toolCall.input;

      return new Response(
        JSON.stringify({
          text: chatData.text,
          patch: chatData.patch ?? null,
          patchSummary: chatData.patchSummary ?? null,
          usage: aiResult.usage,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── GENERATE MODE ──
    const athletePayload = payload as AthletePayload;
    const userPrompt = buildUserPrompt(athletePayload);

    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!anthropicKey) {
      return new Response(
        JSON.stringify({ error: "ANTHROPIC_API_KEY not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const aiResponse = await fetchWithRetry(ANTHROPIC_URL, {
      method: "POST",
      headers: {
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify(buildGeneratePayload(userPrompt)),
    });

    if (!aiResponse.ok) {
      const errBody = await aiResponse.text();
      return new Response(
        JSON.stringify({
          error: "Claude API error",
          status: aiResponse.status,
          detail: errBody,
        }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const aiResult = await aiResponse.json();

    // Extract JSON from tool use
    const toolCall = aiResult.content.find((c: any) => c.type === "tool_use");
    if (!toolCall) {
      return new Response(
        JSON.stringify({ error: "No tool use in Claude response" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const planData = toolCall.input;

    // 9. Save to hierarchical_plans
    const { data: savedPlan, error: saveErr } = await supabase
      .from("hierarchical_plans")
      .insert({
        user_id: userId,
        plan_data: planData,
        event_name: planData.meta?.event || athletePayload.raceGoal.eventName,
        event_date: planData.meta?.eventDate || athletePayload.raceGoal.eventDate,
        status: "active",
      })
      .select()
      .single();

    if (saveErr) {
      return new Response(
        JSON.stringify({
          error: "Failed to save plan",
          detail: saveErr.message,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        id: savedPlan.id,
        plan: planData,
        usage: aiResult.usage,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Internal error", detail: String(err) }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

