export interface PlanValidationResult {
  valid: boolean;
  errors: string[];
}

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
  const validation = validateFullPlan(plan, now);
  if (!validation.valid) {
    return {
      planUpdated: false,
      error: `Generated plan failed validation: ${validation.errors.join("; ")}`,
    };
  }

  const eventName = plan?.meta?.event ?? plan?.raceStrategy?.event?.name ?? null;
  const eventDate = plan?.meta?.eventDate ?? plan?.raceStrategy?.event?.date ?? null;

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
    plan_data: plan,
    event_name: eventName,
    event_date: eventDate,
  };

  const writeQuery = existingPlan?.id
    ? supabase.from("hierarchical_plans").update(payload).eq("id", existingPlan.id)
    : supabase.from("hierarchical_plans").insert(payload);

  const { error: planErr } = await writeQuery;
  if (planErr) return { planUpdated: false, error: planErr.message };

  const blocks = deriveBlocksFromPlan(plan, userId);
  if (blocks.length > 0) {
    await supabase.from("training_blocks").delete().eq("user_id", userId);
    const { error: blockErr } = await supabase.from("training_blocks").insert(blocks);
    if (blockErr) {
      return { planUpdated: true, error: `Plan saved but blocks failed: ${blockErr.message}` };
    }
  }

  return { planUpdated: true, error: null };
}
