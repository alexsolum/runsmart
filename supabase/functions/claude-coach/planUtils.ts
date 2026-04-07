export interface PlanValidationResult {
  valid: boolean;
  errors: string[];
}

const DAY_NAME_TO_SHORT: Record<string, string> = {
  monday: "Mon",
  tuesday: "Tue",
  wednesday: "Wed",
  thursday: "Thu",
  friday: "Fri",
  saturday: "Sat",
  sunday: "Sun",
};

function toIsoDate(value: unknown): string | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }
  return value;
}

export function getCurrentWeekStartIso(now = new Date()): string {
  const date = new Date(now);
  const day = date.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setUTCDate(date.getUTCDate() + diff);
  date.setUTCHours(0, 0, 0, 0);
  return date.toISOString().split("T")[0];
}

export function buildFullPlanSchemaGuidance(now = new Date()): string {
  const todayIso = now.toISOString().split("T")[0];
  const weekStartIso = getCurrentWeekStartIso(now);

  return `When you return "type":"full-plan", the "plan" value must be a complete hierarchical running plan object for this app.

Today is ${todayIso}. The current training week starts on ${weekStartIso}.

Hard constraints for the full plan:
- Return exactly these top-level keys in plan: meta, assessment, zones, phases, weeks, raceStrategy.
- plan.meta must include: id, event, eventDate, planStartDate, planEndDate, totalWeeks, generatedBy, createdAt, updatedAt.
- plan.weeks must be a non-empty array. Each week must include: weekNumber, startDate, endDate, phase, focus, days.
- Each day must include: date, dayOfWeek, workouts.
- Each workout must include: id, sport, type, name. Include description, durationMinutes, distanceKm, primaryZone, humanReadable, completed when possible.
- plan.meta.planStartDate must exactly equal plan.weeks[0].startDate.
- plan.meta.totalWeeks must exactly equal plan.weeks.length.
- plan.meta.eventDate must exactly match raceStrategy.event.date.
- plan.weeks[0].startDate must not be before ${weekStartIso}. Start the plan in the current week or a future week, never in the past.
- The final week must end on or before the event date, with taper logic leading into race week.
- Use real ISO dates everywhere in YYYY-MM-DD format.
- Do not return a summary-only object with just startDate/endDate/phases. Return the fully expanded week-by-week plan.`;
}

export function validateFullPlan(plan: any, now = new Date()): PlanValidationResult {
  const errors: string[] = [];

  if (!plan || typeof plan !== "object") {
    return { valid: false, errors: ["plan must be an object"] };
  }

  const requiredTopLevel = ["meta", "assessment", "zones", "phases", "weeks", "raceStrategy"];
  for (const key of requiredTopLevel) {
    if (!(key in plan)) errors.push(`missing top-level field: ${key}`);
  }

  if (!Array.isArray(plan.phases) || plan.phases.length === 0) {
    errors.push("phases must be a non-empty array");
  }

  if (!Array.isArray(plan.weeks) || plan.weeks.length === 0) {
    errors.push("weeks must be a non-empty array");
  }

  const meta = plan.meta ?? {};
  const metaRequired = [
    "id",
    "event",
    "eventDate",
    "planStartDate",
    "planEndDate",
    "totalWeeks",
    "generatedBy",
    "createdAt",
    "updatedAt",
  ];
  for (const key of metaRequired) {
    if (meta[key] === undefined || meta[key] === null || meta[key] === "") {
      errors.push(`missing meta field: ${key}`);
    }
  }

  const firstWeek = Array.isArray(plan.weeks) ? plan.weeks[0] : null;
  const lastWeek = Array.isArray(plan.weeks) ? plan.weeks[plan.weeks.length - 1] : null;
  const planStartDate = toIsoDate(meta.planStartDate);
  const eventDate = toIsoDate(meta.eventDate);
  const currentWeekStart = getCurrentWeekStartIso(now);

  if (firstWeek) {
    if (!firstWeek.weekNumber && firstWeek.weekNumber !== 0) {
      errors.push("first week missing weekNumber");
    }
    if (!toIsoDate(firstWeek.startDate)) {
      errors.push("first week missing valid startDate");
    }
    if (!toIsoDate(firstWeek.endDate)) {
      errors.push("first week missing valid endDate");
    }
    if (!Array.isArray(firstWeek.days)) {
      errors.push("first week missing days array");
    }
  }

  if (planStartDate && firstWeek?.startDate && planStartDate !== firstWeek.startDate) {
    errors.push("meta.planStartDate must equal weeks[0].startDate");
  }

  if (Array.isArray(plan.weeks) && Number(meta.totalWeeks) !== plan.weeks.length) {
    errors.push("meta.totalWeeks must equal weeks.length");
  }

  const raceStrategyDate = toIsoDate(plan?.raceStrategy?.event?.date);
  if (eventDate && raceStrategyDate && eventDate !== raceStrategyDate) {
    errors.push("meta.eventDate must equal raceStrategy.event.date");
  }

  if (firstWeek?.startDate && toIsoDate(firstWeek.startDate) && firstWeek.startDate < currentWeekStart) {
    errors.push(`weeks[0].startDate must not be before ${currentWeekStart}`);
  }

  if (eventDate && lastWeek?.endDate && toIsoDate(lastWeek.endDate) && lastWeek.endDate > eventDate) {
    errors.push("final week cannot end after meta.eventDate");
  }

  return { valid: errors.length === 0, errors };
}

function addDays(base: Date, days: number): string {
  const d = new Date(base);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().split("T")[0];
}

function abbreviateDay(day: unknown, dateIso: string): string {
  if (typeof day === "string") {
    const normalized = day.trim().toLowerCase();
    if (DAY_NAME_TO_SHORT[normalized]) return DAY_NAME_TO_SHORT[normalized];
    if (day.length >= 3) return day.slice(0, 3);
  }

  const date = new Date(`${dateIso}T00:00:00Z`);
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][date.getUTCDay()];
}

function normalizeSport(value: unknown): string {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text) return "Run";
  if (text.toLowerCase() === "running") return "Run";
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function normalizeWorkoutType(value: unknown): string {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text) return "Easy";
  return text
    .split(/[\s_-]+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function coerceNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(/[^\d.-]/g, ""));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function summarizeWeekDays(days: any[]) {
  let totalKm = 0;
  let totalHours = 0;
  let sessions = 0;

  for (const day of days) {
    for (const workout of day.workouts ?? []) {
      sessions += 1;
      totalKm += coerceNumber(workout.distanceKm) ?? 0;
      totalHours += (coerceNumber(workout.durationMinutes) ?? 0) / 60;
    }
  }

  return {
    totalKm: Math.round(totalKm * 10) / 10,
    totalHours: Math.round(totalHours * 10) / 10,
    sessions,
  };
}

function derivePhaseRanges(phases: any[], weeks: any[]) {
  const weekByPhase = new Map<string, number[]>();
  weeks.forEach((week) => {
    const phaseName = String(week?.phase ?? "");
    if (!phaseName) return;
    const bucket = weekByPhase.get(phaseName) ?? [];
    bucket.push(Number(week.weekNumber));
    weekByPhase.set(phaseName, bucket);
  });

  return phases.map((phase) => {
    const bucket = weekByPhase.get(String(phase?.name ?? "")) ?? [];
    const sorted = bucket.slice().sort((a, b) => a - b);
    const startWeek = sorted[0] ?? Number(phase?.startWeek) ?? 1;
    const endWeek = sorted[sorted.length - 1] ?? Number(phase?.endWeek) ?? startWeek;
    return {
      name: phase?.name ?? `Phase ${startWeek}`,
      startWeek,
      endWeek,
      focus: phase?.focus ?? "",
      weeklyHoursRange: phase?.weeklyHoursRange ?? null,
    };
  });
}

export function normalizeFullPlan(plan: any, now = new Date()) {
  if (!plan || typeof plan !== "object") return plan;

  const rawWeeks = Array.isArray(plan.weeks) ? plan.weeks : [];
  const normalizedWeeks = rawWeeks.map((week, weekIndex) => {
    const days = Array.isArray(week?.days) ? week.days : [];
    const normalizedDays = days.map((day, dayIndex) => {
      const dayDate = toIsoDate(day?.date) ?? addDays(new Date(`${week.startDate}T00:00:00Z`), dayIndex);
      const workouts = Array.isArray(day?.workouts) ? day.workouts : [];
      const normalizedWorkouts = workouts.map((workout, workoutIndex) => ({
        id: workout?.id ?? `w${week.weekNumber ?? weekIndex + 1}-${dayIndex + 1}-${workoutIndex + 1}`,
        sport: normalizeSport(workout?.sport),
        type: normalizeWorkoutType(workout?.type),
        name: workout?.name ?? "Workout",
        description: workout?.description ?? "",
        durationMinutes: coerceNumber(workout?.durationMinutes),
        distanceKm: coerceNumber(workout?.distanceKm),
        primaryZone: workout?.primaryZone ?? null,
        humanReadable: workout?.humanReadable ?? workout?.description ?? workout?.name ?? "Workout",
        completed: Boolean(workout?.completed),
      }));

      return {
        date: dayDate,
        dayOfWeek: abbreviateDay(day?.dayOfWeek, dayDate),
        workouts: normalizedWorkouts,
      };
    });

    return {
      weekNumber: Number(week?.weekNumber) || weekIndex + 1,
      startDate: toIsoDate(week?.startDate) ?? getCurrentWeekStartIso(now),
      endDate: toIsoDate(week?.endDate) ?? addDays(new Date(`${toIsoDate(week?.startDate) ?? getCurrentWeekStartIso(now)}T00:00:00Z`), 6),
      phase: week?.phase ?? "Base",
      focus: week?.focus ?? "",
      targetHours: coerceNumber(week?.targetHours),
      isRecoveryWeek: Boolean(week?.isRecoveryWeek),
      days: normalizedDays,
      summary: week?.summary ?? summarizeWeekDays(normalizedDays),
    };
  });

  const normalizedPhases = derivePhaseRanges(Array.isArray(plan.phases) ? plan.phases : [], normalizedWeeks);
  const normalizedMeta = {
    ...plan.meta,
    eventDate: toIsoDate(plan?.meta?.eventDate) ?? toIsoDate(plan?.raceStrategy?.event?.date),
    planStartDate: toIsoDate(plan?.meta?.planStartDate) ?? normalizedWeeks[0]?.startDate ?? getCurrentWeekStartIso(now),
    planEndDate: toIsoDate(plan?.meta?.planEndDate) ?? normalizedWeeks[normalizedWeeks.length - 1]?.endDate ?? null,
    totalWeeks: normalizedWeeks.length,
    createdAt: plan?.meta?.createdAt ?? now.toISOString(),
    updatedAt: plan?.meta?.updatedAt ?? now.toISOString(),
  };

  return {
    ...plan,
    meta: normalizedMeta,
    raceGoal: {
      eventName: normalizedMeta.event ?? plan?.raceStrategy?.event?.name ?? "Goal Race",
      eventDate: normalizedMeta.eventDate ?? null,
    },
    phases: normalizedPhases,
    weeks: normalizedWeeks,
  };
}

function deriveBlocksFromPlan(plan: any, userId: string) {
  if (!Array.isArray(plan?.phases) || !Array.isArray(plan?.weeks) || plan.weeks.length === 0) {
    return [];
  }

  const planStartDate = new Date(`${plan.weeks[0].startDate}T00:00:00Z`);

  return plan.phases.map((phase: any) => ({
    user_id: userId,
    phase: phase.name,
    label: phase.name,
    start_date: addDays(planStartDate, (phase.startWeek - 1) * 7),
    end_date: addDays(planStartDate, phase.endWeek * 7 - 1),
    target_km: null,
    notes: phase.focus,
  }));
}

export async function saveFullPlan(
  supabase: any,
  userId: string,
  plan: any,
  now = new Date(),
): Promise<{ planUpdated: boolean; error: string | null }> {
  const normalizedPlan = normalizeFullPlan(plan, now);
  const validation = validateFullPlan(normalizedPlan, now);
  if (!validation.valid) {
    return {
      planUpdated: false,
      error: `Generated plan failed validation: ${validation.errors.join("; ")}`,
    };
  }

  const eventName = normalizedPlan?.meta?.event ?? normalizedPlan?.raceStrategy?.event?.name ?? null;
  const eventDate = normalizedPlan?.meta?.eventDate ?? normalizedPlan?.raceStrategy?.event?.date ?? null;

  const { data: existingPlan, error: existingErr } = await supabase
    .from("hierarchical_plans")
    .select("id")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingErr) {
    return { planUpdated: false, error: existingErr.message };
  }

  const payload = {
    user_id: userId,
    status: "active",
    plan_data: normalizedPlan,
    event_name: eventName,
    event_date: eventDate,
  };

  const writeQuery = existingPlan?.id
    ? supabase.from("hierarchical_plans").update(payload).eq("id", existingPlan.id)
    : supabase.from("hierarchical_plans").insert(payload);

  const { error: planErr } = await writeQuery;
  if (planErr) return { planUpdated: false, error: planErr.message };

  const blocks = deriveBlocksFromPlan(normalizedPlan, userId);
  if (blocks.length > 0) {
    await supabase.from("training_blocks").delete().eq("user_id", userId);
    const { error: blockErr } = await supabase.from("training_blocks").insert(blocks);
    if (blockErr) {
      return { planUpdated: true, error: `Plan saved but blocks failed: ${blockErr.message}` };
    }
  }

  return { planUpdated: true, error: null };
}
