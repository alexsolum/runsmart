/**
 * planSchema.js — Pure validation utilities for hierarchical plan JSON
 *
 * Validates the running-only training plan schema produced by the claude-coach
 * Edge Function. No React, no DOM, no imports — fully testable in Node.
 *
 * Exports:
 *   validatePlanSchema(plan) — { valid: boolean, errors: string[] }
 *   hasNonRunningFields(plan) — boolean
 */

/**
 * Validate the top-level and nested structure of a hierarchical plan JSON.
 *
 * Checks:
 * 1. Top-level required: meta, assessment, zones, phases (array), weeks (array), raceStrategy
 * 2. meta required: id, event, eventDate, planStartDate, totalWeeks, generatedBy
 * 3. assessment required: foundation, currentForm
 * 4. zones.run required with hr sub-object
 * 5. Each phase required: name, startWeek, endWeek, focus
 * 6. Each week required: weekNumber, startDate, endDate, phase, days (array)
 * 7. Each day required: date, dayOfWeek, workouts (array)
 * 8. Each workout required: id, sport, type, name
 *
 * @param {object} plan - The plan JSON object to validate
 * @returns {{ valid: boolean, errors: string[] }}
 */
function validatePlanSchema(plan) {
  const errors = [];

  if (!plan || typeof plan !== "object") {
    return { valid: false, errors: ["Plan must be a non-null object"] };
  }

  // 1. Top-level required fields
  if (!plan.meta) {
    errors.push("Missing required field: meta");
  }
  if (!plan.assessment) {
    errors.push("Missing required field: assessment");
  }
  if (!plan.zones) {
    errors.push("Missing required field: zones");
  }
  if (!plan.phases || !Array.isArray(plan.phases)) {
    errors.push("Missing or invalid field: phases (must be an array)");
  }
  if (!plan.weeks || !Array.isArray(plan.weeks)) {
    errors.push("Missing or invalid field: weeks (must be an array)");
  }
  if (!plan.raceStrategy) {
    errors.push("Missing required field: raceStrategy");
  }

  // 2. meta required fields
  if (plan.meta && typeof plan.meta === "object") {
    const metaRequired = [
      "id",
      "event",
      "eventDate",
      "planStartDate",
      "totalWeeks",
      "generatedBy",
    ];
    for (const field of metaRequired) {
      if (plan.meta[field] === undefined || plan.meta[field] === null) {
        errors.push(`Missing required meta field: ${field}`);
      }
    }
  }

  // 3. assessment required fields
  if (plan.assessment && typeof plan.assessment === "object") {
    if (!plan.assessment.foundation) {
      errors.push("Missing required assessment field: foundation");
    }
    if (!plan.assessment.currentForm) {
      errors.push("Missing required assessment field: currentForm");
    }
  }

  // 4. zones.run required with hr sub-object
  if (plan.zones && typeof plan.zones === "object") {
    if (!plan.zones.run) {
      errors.push("Missing required zones field: run");
    } else if (!plan.zones.run.hr) {
      errors.push("Missing required zones.run field: hr");
    }
  }

  // 5. Each phase required fields
  if (Array.isArray(plan.phases)) {
    plan.phases.forEach((phase, i) => {
      const phaseRequired = ["name", "startWeek", "endWeek", "focus"];
      for (const field of phaseRequired) {
        if (phase[field] === undefined || phase[field] === null) {
          errors.push(`Phase[${i}] missing required field: ${field}`);
        }
      }
    });
  }

  // 6. Each week required fields
  if (Array.isArray(plan.weeks)) {
    plan.weeks.forEach((week, wi) => {
      const weekRequired = [
        "weekNumber",
        "startDate",
        "endDate",
        "phase",
      ];
      for (const field of weekRequired) {
        if (week[field] === undefined || week[field] === null) {
          errors.push(`Week[${wi}] missing required field: ${field}`);
        }
      }

      if (!week.days || !Array.isArray(week.days)) {
        errors.push(`Week[${wi}] missing or invalid field: days (must be an array)`);
      } else {
        // 7. Each day required fields
        week.days.forEach((day, di) => {
          if (!day.date) {
            errors.push(`Week[${wi}].Day[${di}] missing required field: date`);
          }
          if (!day.dayOfWeek) {
            errors.push(`Week[${wi}].Day[${di}] missing required field: dayOfWeek`);
          }
          if (!day.workouts || !Array.isArray(day.workouts)) {
            errors.push(
              `Week[${wi}].Day[${di}] missing or invalid field: workouts (must be an array)`
            );
          } else {
            // 8. Each workout required fields
            day.workouts.forEach((workout, woi) => {
              const workoutRequired = ["id", "sport", "type", "name"];
              for (const field of workoutRequired) {
                if (!workout[field]) {
                  errors.push(
                    `Week[${wi}].Day[${di}].Workout[${woi}] missing required field: ${field}`
                  );
                }
              }
            });
          }
        });
      }
    });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Check if a plan contains non-running fields (swim or bike sections).
 * Returns true if any triathlon-specific fields are present.
 *
 * @param {object} plan - The plan JSON object to check
 * @returns {boolean}
 */
function hasNonRunningFields(plan) {
  if (!plan || typeof plan !== "object") return false;

  // Check zones
  if (plan.zones) {
    if (plan.zones.swim !== undefined) return true;
    if (plan.zones.bike !== undefined) return true;
  }

  // Check preferences
  if (plan.preferences) {
    if (plan.preferences.swim !== undefined) return true;
    if (plan.preferences.bike !== undefined) return true;
  }

  return false;
}

export { validatePlanSchema, hasNonRunningFields };
