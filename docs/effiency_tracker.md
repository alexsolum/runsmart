# Specification: Endurance Efficiency & Fitness Tracker

## 1. Objective
To transform raw Strava activity data into a **Fitness Efficiency Trend** chart. The goal is to measure "Aerobic Economy"—specifically how much speed (output) is produced for every beat of the heart (input).

---

## 2. Data Requirements & Pre-processing
The system should ingest a **Strava Activity CSV export**.

### **Data Filtering (The "Reference Workout" Logic)**
To ensure the metric is valid, the tool must filter out "noisy" data. Only include activities that meet these criteria:
* **Activity Type:** Running or Cycling.
* **Duration:** Minimum of 30 minutes (to ensure HR reaches a steady state).
* **Flat Terrain:** Exclude activities with significant elevation gain (e.g., >50m per 5km) to avoid gravity-skewed HR data.
* **Aerobic Cap:** Exclude activities where Average HR is > 80% of Max HR (high-intensity intervals ruin the efficiency ratio).

---

## 3. Core Metrics & Calculations

### **A. Efficiency Factor (EF)**
The primary metric for tracking fitness over time.
$$EF = \frac{\text{Average Speed (m/min)}}{\text{Average Heart Rate (bpm)}}$$
* *Note: If power data is available, use Watts instead of Speed.*

### **B. Aerobic Decoupling (Pa:HR)**
Measures endurance "durability." 
1. Split the activity into two equal halves (by time).
2. Calculate the EF for Half 1 ($EF_1$) and Half 2 ($EF_2$).
3. **Decoupling %** $= (\frac{EF_1 - EF_2}{EF_1}) \times 100$.
* *Target:* A decoupling of $< 5\%$ indicates the athlete is aerobically stable for that duration.

---

## 4. Visualization & Outputs

### **Primary Chart: Efficiency Trend**
* **X-Axis:** Date (Chronological).
* **Y-Axis:** Efficiency Factor (EF).
* **Smoothing:** Apply a **30-day Rolling Average** trend line to account for environmental factors (heat, sleep, caffeine).

### **Secondary Chart: Decoupling vs. Duration**
* A scatter plot showing **Decoupling %** on the Y-axis and **Total Duration** on the X-axis to identify at what time-stamp the athlete's "engine" begins to fail.

---

## 5. Expected Insights
* **Positive Slope:** Increasing EF over time indicates improved stroke volume and mitochondrial density.
* **Stagnant/Negative Slope:** Indicates overtraining, plateau, or a need for more "Base" (Z2) volume.