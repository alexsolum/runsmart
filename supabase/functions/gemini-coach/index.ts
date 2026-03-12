// Supabase Edge Function — Gemini AI coaching insights + weekly plan generation
// Receives a summary of training data from the frontend, sends it to
// Google Gemini for analysis, and returns structured coaching insights or a 7-day plan.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { COACHING_PLAYBOOK, buildStaticPlaybookFallback } from "./playbook.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const GEMINI_MODEL = "gemini-2.5-flash";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const COACH_GUARDRAILS =
  `Safety and progression guardrails (non-negotiable):\n` +
  `- Never prescribe sudden mileage/load spikes beyond the athlete's recent tolerance.\n` +
  `- If fatigue/injury risk signals are present, reduce intensity first and prioritize recovery.\n` +
  `- Long-term consistency and injury prevention outrank short-term performance gains.\n` +
  `- Use metric units only (km, min, min/km, bpm).`;

// ── System instructions ────────────────────────────────────────────────────────

const SYSTEM_INSTRUCTION =
  `You are Marius AI Bakken, an expert endurance running coach specializing in trail and ultramarathon training. ` +
  `Your coaching style is evidence-informed and Jason Koop-inspired: long-run centric, structured progression, durability, specificity, and practical execution. ` +
  `If the athlete has shared their background and goals, use that information to tailor your tone, recommended volumes, and session types to their experience level and aspirations. ` +
  `Analyze the athlete's training data and provide 3-5 actionable coaching insights.\n\n` +
  `Each insight MUST be a JSON object with these exact fields:\n` +
  `- "type": one of "danger", "warning", "positive", "info"\n` +
  `- "icon": one of "warning", "alert", "battery", "fatigue", "balance", "trending", "decline", "spike", "longrun", "rest", "motivation", "injury", "race", "taper"\n` +
  `- "title": short heading (5-8 words)\n` +
  `- "body": 2-4 sentences with specific reasoning tied to their data, plus concrete training recommendations\n\n` +
  `Coaching requirements:\n` +
  `1) Adapt to athlete level inferred from training consistency, weekly volume, and long-run history.\n` +
  `2) Include at least two specific workout suggestions across the full response, each with purpose + execution (duration or distance + intensity).\n` +
  `3) Prioritize safe progression: avoid sudden load spikes, protect recovery, and flag injury-risk signals.\n` +
  `4) Include one weekly planning recommendation (how to structure the coming week).\n` +
  `5) Use metric units (km/min).\n\n` +
  `Respond ONLY with a valid JSON array of insight objects. No markdown fences, no explanation outside the array.`;

const PLAN_SYSTEM_INSTRUCTION =
  `You are Marius AI Bakken, an elite endurance running coach. ` +
  `Analyze the athlete's 4-week training history and generate a complete 7-day training plan for the upcoming week. ` +
  `Your response MUST be a single valid JSON object with exactly three fields:\n` +
  `1. "coaching_feedback": a string (2-4 sentences) summarizing the last 4 weeks of training — key trends, progress, and any concerns.\n` +
  `2. "adaptation_summary": a string (2-3 sentences) explaining what wellness/load signal drove the adaptation and how long-run structure or intensity distribution was adjusted. REQUIRED.\n` +
  `3. "structured_plan": an array of exactly 7 objects, one per day starting from the next Monday, each with:\n` +
  `   - "date": ISO date string (YYYY-MM-DD)\n` +
  `   - "workout_type": one of "Easy", "Tempo", "Intervals", "Long Run", "Recovery", "Strength", "Cross-Train", "Rest"\n` +
  `   - "distance_km": number (0 for rest days)\n` +
  `   - "duration_min": integer (0 for rest days)\n` +
  `   - "description": string (1-2 sentences describing the workout purpose and execution)\n\n` +
  `Coaching requirements:\n` +
  `- Respect the athlete's current phase and target weekly volume from their training plan.\n` +
  `- Apply 80/20 polarization: most sessions easy, 1-2 quality sessions per week.\n` +
  `- Include exactly one long run (Sunday preferred, or Saturday if constraints apply).\n` +
  `- Ensure total weekly distance matches target volume within 10%.\n` +
  `- Use metric units (km/min).\n\n` +
  `Respond ONLY with a valid JSON object. No markdown fences, no explanation outside the JSON.`;

const FOLLOWUP_SYSTEM_INSTRUCTION =
  `You are Marius AI Bakken, a personal AI running coach with deep expertise in endurance and ultramarathon training. ` +
  `Your style is conversational, direct, and practical — like a trusted coach who knows the athlete well. ` +
  `The athlete is asking a follow-up question based on your previous coaching insights. ` +
  `Answer concisely in 2-5 sentences. Be specific and reference their actual training data where relevant. ` +
  `Use metric units (km/min). Respond in plain text only — no JSON, no bullet lists, no markdown.`;

const PLAN_REVISION_SYSTEM_INSTRUCTION =
  `You are Marius AI Bakken, an elite endurance running coach in an ongoing conversation with your athlete. ` +
  `The athlete has provided feedback or constraints about their upcoming week. ` +
  `Revise the 7-day training plan accordingly while maintaining athletic integrity. ` +
  `Your response MUST be a single valid JSON object with exactly three fields:\n` +
  `1. "coaching_feedback": a string (1-3 sentences) acknowledging the athlete's feedback and explaining the key changes you made.\n` +
  `2. "adaptation_summary": a string (2-3 sentences) explaining what wellness/load signal drove the adaptation and how long-run structure or intensity distribution was adjusted. REQUIRED.\n` +
  `3. "structured_plan": an array of exactly 7 objects, one per day, each with:\n` +
  `   - "date": ISO date string (YYYY-MM-DD)\n` +
  `   - "workout_type": one of "Easy", "Tempo", "Intervals", "Long Run", "Recovery", "Strength", "Cross-Train", "Rest"\n` +
  `   - "distance_km": number (0 for rest days)\n` +
  `   - "duration_min": integer (0 for rest days)\n` +
  `   - "description": string (1-2 sentences describing the workout)\n\n` +
  `Respond ONLY with a valid JSON object. No markdown fences, no explanation outside the JSON.`;

const LONG_TERM_REPLAN_SYSTEM_INSTRUCTION =
  `You are Marius AI Bakken, an elite endurance running coach. ` +
  `Generate a long-term weekly structure from the current planning week through the goal race week. ` +
  `Your response MUST be a single valid JSON object with exactly three fields:\n` +
  `1. "coaching_feedback": a string (2-5 sentences) summarizing the replan strategy and key progression logic.\n` +
  `2. "adaptation_summary": a string (2-3 sentences) explaining what wellness/load signal drove the adaptation and how long-run structure or intensity distribution was adjusted. REQUIRED.\n` +
  `3. "weekly_structure": an array of week objects with one entry per target week, each including:\n` +
  `   - "week_start": ISO date string (YYYY-MM-DD, Monday)\n` +
  `   - "week_end": ISO date string (YYYY-MM-DD, Sunday)\n` +
  `   - "phase_focus": short string (5-15 words) describing weekly focus\n` +
  `   - "target_km": number (non-negative)\n` +
  `   - "key_workouts": array of 2-4 short strings describing key sessions\n` +
  `   - "notes": short string with risk management or recovery emphasis\n\n` +
  `Coaching requirements:\n` +
  `- Respect progression and recovery balance week-to-week.\n` +
  `- Prioritize long-run centric development with realistic quality distribution.\n` +
  `- Do not prescribe abrupt load spikes.\n` +
  `- Keep recommendations practical and metric.\n\n` +
  `Respond ONLY with a valid JSON object. No markdown fences, no explanation outside the JSON.`;

const SYNTHESIS_HEADING_SETS = {
  en: [
    "Mileage Trend",
    "Intensity Distribution",
    "Long-Run Progression",
    "Race Readiness",
  ],
  no: [
    "Kilometerutvikling",
    "Intensitetsfordeling",
    "Langturprogresjon",
    "Løpsberedskap",
  ],
} as const;

function getRequiredHeadings(lang: string | undefined): readonly string[] {
  return lang === "no" ? SYNTHESIS_HEADING_SETS.no : SYNTHESIS_HEADING_SETS.en;
}

function buildInsightsSynthesisInstruction(lang: string | undefined): string {
  const headings = getRequiredHeadings(lang);
  return (
    `You are Marius AI Bakken, an expert endurance running coach. ` +
    `Provide a high-level summary of the athlete's training state. ` +
    `Respond with four distinct sections, each using the exact heading followed by a colon:\n` +
    `1. ${headings[0]}:\n` +
    `2. ${headings[1]}:\n` +
    `3. ${headings[2]}:\n` +
    `4. ${headings[3]}:\n\n` +
    `Inside each section, provide 2-3 sentences of analysis tied to their data and one actionable recommendation. ` +
    `Respond in plain Markdown. Use ### for section headers. Do not use JSON wrappers.`
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────────

async function logAiFailure(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  mode: string,
  raw: string,
  error: string,
) {
  try {
    const { error: insertErr } = await supabase.from("ai_audit_logs").insert({
      user_id: userId,
      mode,
      raw_response: raw,
      error_type: error,
      metadata: { timestamp: new Date().toISOString() },
    });
    if (insertErr) console.error("Error logging AI failure:", insertErr);
  } catch (err) {
    console.error("Critical error in logAiFailure:", err);
  }
}

/**
 * Extracts sections using a sliding window regex.
 */
function pluckSynthesisSections(
  rawText: string,
  lang: string | undefined,
): Record<string, string> {
  const sections: Record<string, string> = {};
  const cleaned = rawText.replace(/```json|```/g, "").trim();
  const headings = getRequiredHeadings(lang);

  headings.forEach((heading) => {
    // Pattern: (Start or Newline) -> (Optional markdown artifacts) -> Heading -> Colon -> Content
    const regex = new RegExp(
      `(?:^|\\n)\\s*(?:[#\\-\\s]*)${heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*:\\s*([\\s\\S]*?)(?=\\n\\s*(?:[#\\-\\s]*)(?:${headings.map((item) => item.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})\\s*:|$)`,
      "i",
    );
    const match = cleaned.match(regex);
    if (match && match[1]) {
      sections[heading] = match[1].trim();
    }
  });

  return sections;
}

/**
 * Rebuilds the response as clean H3-based Markdown.
 */
function rebuildSanitizedMarkdown(
  sections: Record<string, string>,
  lang: string | undefined,
): string {
  return getRequiredHeadings(lang)
    .filter((h) => sections[h])
    .map((h) => `### ${h}:\n${sections[h]}`)
    .join("\n\n");
}

function trimSynthesisSections(
  sections: Record<string, string>,
  lang: string | undefined,
  maxSectionLength = 320,
): Record<string, string> {
  const trimmed: Record<string, string> = {};
  for (const heading of getRequiredHeadings(lang)) {
    const content = sections[heading];
    if (!content) continue;
    trimmed[heading] = content.length > maxSectionLength
      ? `${content.slice(0, maxSectionLength).trimEnd()}…`
      : content;
  }
  return trimmed;
}

function buildFallbackSynthesis(body: RequestBody): string {
  const latestWeek = body.weeklySummary?.[body.weeklySummary.length - 1];
  const previousWeek = body.weeklySummary?.[body.weeklySummary.length - 2];
  const headings = getRequiredHeadings(body.lang);
  const latestDistance = latestWeek
    ? `${latestWeek.distance.toFixed(1)}km`
    : body.lang === "no"
    ? "nylig volum"
    : "recent volume";
  const distanceTrend = latestWeek && previousWeek
    ? body.lang === "no"
      ? `${formatDelta(latestWeek.distance, previousWeek.distance)} fra uke til uke`
      : `${formatDelta(latestWeek.distance, previousWeek.distance)} week-over-week`
    : body.lang === "no"
    ? "stabil progresjon"
    : "stable progression";
  const latestLongRun = latestWeek
    ? `${latestWeek.longestRun.toFixed(1)}km`
    : body.lang === "no"
    ? "nylig langtur"
    : "your recent long run";
  const effortSamples = (body.recentActivities || []).filter((a) => Number.isFinite(a.effort)).length;
  const raceWindow = body.planContext?.daysToRace != null
    ? body.lang === "no"
      ? `${body.planContext.daysToRace} dager til løp`
      : `${body.planContext.daysToRace} days to race`
    : body.lang === "no"
    ? "gjeldende målhorisont"
    : "your current goal timeline";

  if (body.lang === "no") {
    return [
      `### ${headings[0]}:\nDet ukentlige volumet ligger nylig rundt ${latestDistance} med ${distanceTrend}; hold uke-til-uke-endringer kontrollert og prioriter én restitusjonsorientert dag for å ta opp belastningen.`,
      `### ${headings[1]}:\nDen siste belastningen inneholder ${effortSamples} økter med registrert innsats; hold deg til 1-2 tydelige kvalitetsøkter mens du beskytter det rolige aerobe volumet.`,
      `### ${headings[2]}:\nLangturene ligger nå rundt ${latestLongRun}; øk varigheten gradvis og legg bare inn korte kvalitetsinnslag på slutten når kroppen fortsatt kjennes frisk.`,
      `### ${headings[3]}:\nMed ${raceWindow} bygges beredskapen best gjennom konsistens fremfor topper; hold en bærekraftig rytme denne uken og vurder tretthetssignalene før du legger på mer intensitet.`,
    ].join("\n\n");
  }

  return [
    `### ${headings[0]}:\nRecent weekly volume is around ${latestDistance} with ${distanceTrend}; keep weekly load changes controlled and prioritize one recovery-focused day to absorb work.`,
    `### ${headings[1]}:\nCurrent activity load includes ${effortSamples} effort-tagged sessions in the recent window; keep quality to 1-2 purposeful sessions while protecting easy aerobic volume.`,
    `### ${headings[2]}:\nLong-run execution is currently around ${latestLongRun}; progress duration gradually and add only small finish-quality segments when freshness remains high.`,
    `### ${headings[3]}:\nWith ${raceWindow}, readiness improves most through consistency rather than spikes; hold a sustainable rhythm this week and reassess fatigue markers before adding intensity.`,
  ].join("\n\n");
}

function formatDelta(current: number, previous: number): string {
  if (!Number.isFinite(current) || !Number.isFinite(previous) || previous <= 0) return "n/a";
  const pct = ((current - previous) / previous) * 100;
  return `${pct >= 0 ? "+" : ""}${pct.toFixed(0)}%`;
}

function inferAthleteLevel(weeklySummary: WeeklySummary[]): string {
  if (!weeklySummary.length) return "unknown";
  const avgDistance =
    weeklySummary.reduce((sum, week) => sum + week.distance, 0) / weeklySummary.length;
  const avgRuns =
    weeklySummary.reduce((sum, week) => sum + week.runs, 0) / weeklySummary.length;
  if (avgDistance >= 90 || avgRuns >= 6) return "advanced";
  if (avgDistance >= 55 || avgRuns >= 4) return "intermediate";
  return "developing";
}

function getNextMonday(): string {
  const d = new Date();
  const day = d.getUTCDay();
  const daysUntilMonday = day === 0 ? 1 : 8 - day;
  d.setUTCDate(d.getUTCDate() + daysUntilMonday);
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString().split("T")[0];
}

function toIsoDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

function parseIsoDate(value: string | undefined): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [yearStr, monthStr, dayStr] = value.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    return null;
  }
  return parsed;
}

function addDaysUtc(base: Date, days: number): Date {
  const next = new Date(base.getTime());
  next.setUTCDate(next.getUTCDate() + days);
  next.setUTCHours(0, 0, 0, 0);
  return next;
}

function addWeeksUtc(base: Date, weeks: number): Date {
  return addDaysUtc(base, weeks * 7);
}

function getMondayOfWeekUtc(date: Date): Date {
  const normalized = new Date(date.getTime());
  normalized.setUTCHours(0, 0, 0, 0);
  const day = normalized.getUTCDay();
  const offset = day === 0 ? -6 : 1 - day;
  return addDaysUtc(normalized, offset);
}

function getCurrentPlanningMondayUtc(): Date {
  return getMondayOfWeekUtc(new Date());
}

// ── Types ──────────────────────────────────────────────────────────────────────

interface WeeklySummary {
  weekOf: string;
  distance: number;
  runs: number;
  longestRun: number;
}

interface RecentActivity {
  name: string;
  distance: number;
  duration: number;
  effort: number | null;
}

interface PlanContext {
  race: string;
  raceDate: string;
  phase: string;
  weekNumber: number;
  targetMileage: number;
  daysToRace: number;
}

interface Checkin {
  fatigue: number;
  sleepQuality: number;
  motivation: number;
  niggles: string | null;
}

interface DailyLog {
  date: string;
  sleep_hours: number | null;
  sleep_quality: number | null;
  fatigue: number | null;
  mood: number | null;
  stress: number | null;
  training_quality: number | null;
  resting_hr: number | null;
  notes: string | null;
}

interface RunnerProfile {
  background: string;
  goal: string;
}

interface ConversationTurn {
  role: "user" | "model";
  text: string;
}

interface RequestBody {
  mode?: CoachMode;
  conversationHistory?: ConversationTurn[];
  weeklySummary: WeeklySummary[];
  recentActivities: RecentActivity[];
  latestCheckin: Checkin | null;
  recentCheckins?: Checkin[];
  planContext: PlanContext | null;
  dailyLogs: DailyLog[];
  runnerProfile?: RunnerProfile | null;
  lang?: string;
}

type CoachMode =
  | "initial"
  | "followup"
  | "plan"
  | "plan_revision"
  | "long_term_replan"
  | "insights_synthesis";

interface LongTermWeek {
  week_start: string;
  week_end: string;
  phase_focus: string;
  target_km: number;
  key_workouts: string[];
  notes: string;
}

interface LongTermHorizon {
  startMonday: Date;
  endSunday: Date;
  goalRaceDate: string | null;
  weekCount: number;
  usedFallback: boolean;
  reason: string;
}

interface PlaybookEntry {
  source: string;
  mode: string[] | null;
  lang: string[] | null;
  phase: string[] | null;
  athlete_level: string[] | null;
  priority: number | null;
  title: string;
  principle: string;
  application: string | null;
  anti_patterns: string | null;
  example_workout: string | null;
  tags: string[] | null;
}

interface PhilosophyDocument {
  principles: string;
  dos: string;
  donts: string;
  workout_examples: string;
  phase_notes: string;
  koop_weight: number;
  bakken_weight: number;
}

function normalizePhase(phase: string | undefined): "base" | "build" | "peak" | "taper" | "any" {
  if (!phase) return "any";
  const p = phase.toLowerCase();
  if (p.includes("base")) return "base";
  if (p.includes("build")) return "build";
  if (p.includes("peak")) return "peak";
  if (p.includes("taper")) return "taper";
  return "any";
}

function includesOrAny(values: string[] | null, target: string): boolean {
  if (!values || values.length === 0) return true;
  const normalized = values.map((v) => String(v).toLowerCase());
  return normalized.includes("any") || normalized.includes(target.toLowerCase());
}

function scorePlaybookEntry(
  entry: PlaybookEntry,
  mode: CoachMode,
  lang: string | undefined,
  phase: string,
  athleteLevel: string,
): number {
  let score = Number(entry.priority || 0);
  if (includesOrAny(entry.mode, mode)) score += 3;
  if (includesOrAny(entry.lang, lang === "no" ? "no" : "en")) score += 2;
  if (includesOrAny(entry.phase, phase)) score += 3;
  if (includesOrAny(entry.athlete_level, athleteLevel)) score += 2;
  return score;
}

async function fetchDynamicPlaybookAddendum(
  supabase: ReturnType<typeof createClient>,
  body: RequestBody,
  mode: CoachMode,
): Promise<string> {
  const { data, error } = await supabase
    .from("coach_playbook_entries")
    .select(
      "source, mode, lang, phase, athlete_level, priority, title, principle, application, anti_patterns, example_workout, tags",
    )
    .eq("enabled", true)
    .limit(200);

  if (error || !Array.isArray(data) || data.length === 0) return "";

  const phase = normalizePhase(body.planContext?.phase);
  const athleteLevel = inferAthleteLevel(body.weeklySummary || []);
  const targetLang = body.lang === "no" ? "no" : "en";

  const filtered = (data as PlaybookEntry[]).filter((entry) =>
    includesOrAny(entry.mode, mode) &&
    includesOrAny(entry.lang, targetLang) &&
    includesOrAny(entry.phase, phase) &&
    includesOrAny(entry.athlete_level, athleteLevel)
  );

  const ranked = filtered
    .sort((a, b) =>
      scorePlaybookEntry(b, mode, targetLang, phase, athleteLevel) -
      scorePlaybookEntry(a, mode, targetLang, phase, athleteLevel)
    )
    .slice(0, 8);

  const lines: string[] = [];
  let budget = 1800;
  for (const entry of ranked) {
    const chunk = [
      `- [${entry.source}] ${entry.title}`,
      `  Principle: ${entry.principle}`,
      entry.application ? `  Apply: ${entry.application}` : "",
      entry.anti_patterns ? `  Avoid: ${entry.anti_patterns}` : "",
      entry.example_workout ? `  Workout template: ${entry.example_workout}` : "",
    ].filter(Boolean).join("\n");

    if (chunk.length > budget) break;
    lines.push(chunk);
    budget -= chunk.length;
  }

  return lines.join("\n");
}

async function fetchActivePhilosophyDocument(
  supabase: ReturnType<typeof createClient>,
): Promise<PhilosophyDocument | null> {
  const { data, error } = await supabase
    .from("coach_philosophy_documents")
    .select("principles, dos, donts, workout_examples, phase_notes, koop_weight, bakken_weight")
    .eq("scope", "global")
    .eq("status", "published")
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return data as PhilosophyDocument;
}

function buildActivePhilosophyAddendum(document: PhilosophyDocument | null): string {
  if (!document) {
    return "No active published philosophy document found; use fallback playbook guidance.";
  }

  const chunks = [
    `Koop/Bakken blend weighting: ${Math.round(Number(document.koop_weight) || 0)}/${Math.round(Number(document.bakken_weight) || 0)}`,
    document.principles ? `Principles: ${document.principles}` : "",
    document.dos ? `Do: ${document.dos}` : "",
    document.donts ? `Do not: ${document.donts}` : "",
    document.workout_examples ? `Workout examples: ${document.workout_examples}` : "",
    document.phase_notes ? `Phase notes: ${document.phase_notes}` : "",
  ].filter(Boolean);

  return chunks.join("\n").slice(0, 2200);
}

function buildDefaultSystemInstruction(
  baseInstruction: string,
  lang: string | undefined,
  dynamicAddendum: string,
  philosophyAddendum?: string,
): string {
  const languageLine = lang === "no"
    ? "Primary response language: Norwegian (bokmal)."
    : "Primary response language: English.";

  const citationMandate =
    "Data citation requirement: At least one insight body (initial mode) or " +
    "coaching_feedback sentence (plan/replan modes) MUST cite an actual check-in " +
    "or daily-log value using the format \"Your [metric] of [value]/5 [interpretation]...\". " +
    "If no check-in or wellness log data is available, explicitly state: " +
    "\"No check-in or wellness data available this week — recommendations based on training load only.\"";

  const methodologyMandate =
    "Methodology alignment requirement: At least one insight body or coaching note " +
    "MUST explicitly mention long-run positioning in the week OR intensity distribution " +
    "(e.g., 80/20 easy/quality ratio). " +
    "Let the koop_weight/bakken_weight blend in the philosophy document guide emphasis: " +
    "higher koop_weight → emphasize long-run anchoring; higher bakken_weight → emphasize " +
    "specific intensity blocks.";

  return [
    baseInstruction.trim(),
    "",
    "Instruction precedence policy:",
    "- Follow output format contract first.",
    "- Enforce safety/progression guardrails before methodology choices.",
    "- Use runtime playbook entries and fallback playbook context for coaching style only.",
    "",
    COACH_GUARDRAILS,
    "",
    citationMandate,
    "",
    methodologyMandate,
    "",
    philosophyAddendum ? `Active published philosophy (runtime):\n${philosophyAddendum}` : "",
    "",
    dynamicAddendum ? `Runtime playbook snippets:\n${dynamicAddendum}` : "",
    "",
    "Coaching playbook (authoritative context):",
    COACHING_PLAYBOOK.trim(),
    "",
    languageLine,
  ]
    .filter(Boolean)
    .join("\n");
}

function buildReplanSystemInstruction(
  baseInstruction: string,
  lang: string | undefined,
  philosophyAddendum: string,
  dynamicAddendum: string,
): string {
  const languageLine = lang === "no"
    ? "Primary response language: Norwegian (bokmal)."
    : "Primary response language: English.";

  const citationMandate =
    "Data citation requirement: At least one insight body (initial mode) or " +
    "coaching_feedback sentence (plan/replan modes) MUST cite an actual check-in " +
    "or daily-log value using the format \"Your [metric] of [value]/5 [interpretation]...\". " +
    "If no check-in or wellness log data is available, explicitly state: " +
    "\"No check-in or wellness data available this week — recommendations based on training load only.\"";

  const methodologyMandate =
    "Methodology alignment requirement: At least one insight body or coaching note " +
    "MUST explicitly mention long-run positioning in the week OR intensity distribution " +
    "(e.g., 80/20 easy/quality ratio). " +
    "Let the koop_weight/bakken_weight blend in the philosophy document guide emphasis: " +
    "higher koop_weight → emphasize long-run anchoring; higher bakken_weight → emphasize " +
    "specific intensity blocks.";

  const adaptationSummaryMandate =
    "adaptation_summary MUST cite the wellness signal(s) that drove the change " +
    "(check-in scores, log trends, or training load) and MUST mention long-run structure " +
    "or intensity distribution.";

  return [
    baseInstruction.trim(),
    "",
    "Instruction precedence policy (highest to lowest):",
    "1) Output format and schema contract in this instruction.",
    "2) Safety and progression guardrails.",
    "3) Active published coaching philosophy (runtime document).",
    "4) Runtime playbook snippets.",
    "5) Static playbook fallback context.",
    "",
    COACH_GUARDRAILS,
    "",
    citationMandate,
    "",
    methodologyMandate,
    "",
    adaptationSummaryMandate,
    "",
    "Active published philosophy (runtime):",
    philosophyAddendum,
    "",
    dynamicAddendum ? `Runtime playbook snippets:\n${dynamicAddendum}` : "",
    "",
    "Static playbook fallback context:",
    buildStaticPlaybookFallback(),
    "",
    languageLine,
  ]
    .filter(Boolean)
    .join("\n");
}

const DEFAULT_LONG_TERM_WEEKS = 12;
const MAX_LONG_TERM_WEEKS = 78;
const MIN_LONG_TERM_WEEKS = 1;

function computeLongTermHorizon(planContext: PlanContext | null): LongTermHorizon {
  const startMonday = getCurrentPlanningMondayUtc();
  const fallbackEnd = addDaysUtc(addWeeksUtc(startMonday, DEFAULT_LONG_TERM_WEEKS - 1), 6);
  const raceDate = parseIsoDate(planContext?.raceDate);

  if (!raceDate) {
    return {
      startMonday,
      endSunday: fallbackEnd,
      goalRaceDate: null,
      weekCount: DEFAULT_LONG_TERM_WEEKS,
      usedFallback: true,
      reason: "missing_or_invalid_race_date",
    };
  }

  const raceWeekMonday = getMondayOfWeekUtc(raceDate);
  const diffDays = Math.floor((raceWeekMonday.getTime() - startMonday.getTime()) / (1000 * 60 * 60 * 24));
  let weekCount = Math.floor(diffDays / 7) + 1;
  let usedFallback = false;
  let reason = "goal_race_horizon";

  if (!Number.isFinite(weekCount) || weekCount < MIN_LONG_TERM_WEEKS) {
    weekCount = MIN_LONG_TERM_WEEKS;
    usedFallback = true;
    reason = "goal_race_in_past_or_same_week";
  } else if (weekCount > MAX_LONG_TERM_WEEKS) {
    weekCount = MAX_LONG_TERM_WEEKS;
    usedFallback = true;
    reason = "goal_race_horizon_capped";
  }

  const endSunday = addDaysUtc(addWeeksUtc(startMonday, weekCount - 1), 6);
  return {
    startMonday,
    endSunday,
    goalRaceDate: toIsoDate(raceDate),
    weekCount,
    usedFallback,
    reason,
  };
}

// ── Prompt builder ─────────────────────────────────────────────────────────────

function getLanguageInstruction(lang: string | undefined): string {
  return (lang === "no") ? "Respond entirely in Norwegian (bokmål)." : "Respond in English.";
}

function buildPrompt(data: RequestBody): string {
  const lines: string[] = [];

  if (data.runnerProfile) {
    if (data.runnerProfile.background) {
      lines.push(`Athlete background: ${data.runnerProfile.background}`);
    }
    if (data.runnerProfile.goal) {
      lines.push(`Athlete goal: ${data.runnerProfile.goal}`);
    }
    lines.push("");
  }

  const athleteLevel = inferAthleteLevel(data.weeklySummary || []);
  lines.push(`Inferred athlete level: ${athleteLevel}`);
  lines.push("Provide recommendations that feel realistic for this athlete's recent training.");
  lines.push("");

  if (data.weeklySummary && data.weeklySummary.length > 0) {
    lines.push("Training summary (last 4 weeks):");
    data.weeklySummary.forEach((w) => {
      lines.push(
        `- Week of ${w.weekOf}: ${w.distance.toFixed(1)}km, ${w.runs} runs, longest ${w.longestRun.toFixed(1)}km`,
      );
    });
    const latestWeek = data.weeklySummary[data.weeklySummary.length - 1];
    const previousWeek = data.weeklySummary[data.weeklySummary.length - 2];
    if (latestWeek && previousWeek) {
      lines.push(
        `Volume trend: ${latestWeek.distance.toFixed(1)}km vs ${previousWeek.distance.toFixed(1)}km (${
          formatDelta(latestWeek.distance, previousWeek.distance)
        } week-over-week)`,
      );
      lines.push(
        `Longest run trend: ${latestWeek.longestRun.toFixed(1)}km vs ${previousWeek.longestRun.toFixed(1)}km (${
          formatDelta(latestWeek.longestRun, previousWeek.longestRun)
        } week-over-week)`,
      );
    }
    lines.push("");
  }

  if (data.planContext) {
    const p = data.planContext;
    lines.push(
      `Current plan: ${p.race} on ${p.raceDate}, week ${p.weekNumber}, phase: ${p.phase}, target ${p.targetMileage}km this week`,
    );
    if (p.daysToRace != null) {
      lines.push(`Days to race: ${p.daysToRace}`);
    }
    lines.push("");
  }

  if (data.latestCheckin) {
    const c = data.latestCheckin;
    lines.push(
      `Latest check-in: fatigue ${c.fatigue}/5, sleep ${c.sleepQuality}/5, motivation ${c.motivation}/5` +
        (c.niggles ? `, niggles: ${c.niggles}` : ""),
    );
    lines.push("");
  }

  const checkinList = data.recentCheckins ?? (data.latestCheckin ? [data.latestCheckin] : []);
  if (checkinList.length > 1) {
    lines.push("Check-in trend (most recent first):");
    checkinList.forEach((c) => {
      const weekLabel = (c as Checkin & { weekOf?: string; week_of?: string }).weekOf ??
        (c as Checkin & { weekOf?: string; week_of?: string }).week_of ??
        "recent week";
      lines.push(
        `- Week of ${weekLabel}: fatigue ${c.fatigue}/5, sleep ${c.sleepQuality}/5, motivation ${c.motivation}/5` +
          (c.niggles ? `, niggles: ${c.niggles}` : ""),
      );
    });
    lines.push("");
  } else if (checkinList.length === 0 && !data.dailyLogs?.length) {
    lines.push("No wellness data available this week — coaching based on training load only.");
    lines.push("");
  }

  if (data.dailyLogs && data.dailyLogs.length > 0) {
    lines.push("Daily wellness logs (last 7 days):");
    data.dailyLogs.forEach((l) => {
      const parts: string[] = [`- ${l.date}:`];
      if (l.training_quality != null) parts.push(`training quality ${l.training_quality}/5`);
      if (l.sleep_hours != null) parts.push(`sleep ${l.sleep_hours}h`);
      if (l.sleep_quality != null) parts.push(`sleep quality ${l.sleep_quality}/5`);
      if (l.fatigue != null) parts.push(`fatigue ${l.fatigue}/5`);
      if (l.mood != null) parts.push(`mood ${l.mood}/5`);
      if (l.stress != null) parts.push(`stress ${l.stress}/5`);
      if (l.resting_hr != null) parts.push(`RHR ${l.resting_hr}bpm`);
      if (l.notes) parts.push(`notes: "${l.notes}"`);
      lines.push(parts.join(", "));
    });
    lines.push("");
  }

  if (data.recentActivities && data.recentActivities.length > 0) {
    lines.push("Recent activities (last 7 days):");
    data.recentActivities.forEach((a) => {
      const mins = Math.round(a.duration / 60);
      lines.push(
        `- ${a.name}: ${a.distance.toFixed(1)}km, ${mins}min` +
          (a.effort ? `, effort ${a.effort}/10` : ""),
      );
    });
    lines.push("");
  }

  lines.push(getLanguageInstruction(data.lang));

  return lines.join("\n");
}

function buildPlanPrompt(data: RequestBody): string {
  const contextLines = buildPrompt(data);
  const nextMonday = getNextMonday();
  return [
    contextLines,
    `Generate the 7-day plan starting from Monday ${nextMonday}.`,
    `The plan MUST cover exactly 7 consecutive days (Monday through Sunday).`,
    `Output focus:`,
    `- Total weekly km should target ${data.planContext?.targetMileage ?? "appropriate volume"} km.`,
    `- Apply progressive overload appropriate for this athlete's recent training.`,
    `- Include at least one quality session (Tempo or Intervals) and one Long Run.`,
  ].join("\n");
}

function buildLongTermReplanPrompt(data: RequestBody, horizon: LongTermHorizon): string {
  const contextLines = buildPrompt(data);
  return [
    contextLines,
    `Generate a long-term weekly structure from week starting ${toIsoDate(horizon.startMonday)} to week ending ${
      toIsoDate(horizon.endSunday)
    }.`,
    `You MUST return exactly ${horizon.weekCount} week objects in "weekly_structure".`,
    `Each week_start must be Monday and week_end must be Sunday.`,
    horizon.goalRaceDate
      ? `Goal race date is ${horizon.goalRaceDate}; include the race week in the returned horizon.`
      : "Goal race date is unavailable; use a conservative fallback progression horizon.",
    "Output focus:",
    `- Base target volume around ${data.planContext?.targetMileage ?? "appropriate weekly volume"} km and progress conservatively.`,
    "- Keep load progression smooth and include recovery weeks where needed.",
    "- Keep weekly key sessions practical and specific.",
  ].join("\n");
}

// ── JSON parsing helpers ───────────────────────────────────────────────────────

function stripMarkdownFences(text: string): string {
  return text.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
}

const VALID_WORKOUT_TYPES = ["Easy", "Tempo", "Intervals", "Long Run", "Recovery", "Strength", "Cross-Train", "Rest"];

function validateAndSanitizePlan(plan: Record<string, unknown>[]): Record<string, unknown>[] {
  return plan
    .filter((day) => day.date && day.workout_type)
    .map((day) => ({
      date: String(day.date),
      workout_type: VALID_WORKOUT_TYPES.includes(String(day.workout_type)) ? day.workout_type : "Easy",
      distance_km: Number(day.distance_km) || 0,
      duration_min: Math.round(Number(day.duration_min)) || 0,
      description: String(day.description || "").slice(0, 300),
    }))
    .slice(0, 7);
}

function getNumericWithinBounds(
  value: unknown,
  fallback: number,
  minValue: number,
  maxValue: number,
): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  if (parsed < minValue) return minValue;
  if (parsed > maxValue) return maxValue;
  return parsed;
}

function sanitizeKeyWorkouts(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => String(item ?? "").trim())
    .filter(Boolean)
    .slice(0, 4)
    .map((item) => item.slice(0, 160));
}

function buildFallbackLongTermWeek(
  index: number,
  startMonday: Date,
  targetMileage: number | undefined,
): LongTermWeek {
  const weekStart = addWeeksUtc(startMonday, index);
  const weekEnd = addDaysUtc(weekStart, 6);
  const fallbackKm = getNumericWithinBounds(targetMileage, 45, 0, 250);
  return {
    week_start: toIsoDate(weekStart),
    week_end: toIsoDate(weekEnd),
    phase_focus: "Progressive aerobic development with controlled load",
    target_km: fallbackKm,
    key_workouts: [
      "Easy aerobic volume with strides",
      "One quality session at controlled threshold effort",
      "Long run with conservative finish progression",
    ],
    notes: "Prioritize recovery signals and avoid abrupt intensity or volume jumps.",
  };
}

function validateAndSanitizeLongTermWeeks(
  plan: Record<string, unknown>[],
  horizon: LongTermHorizon,
  targetMileage: number | undefined,
): LongTermWeek[] {
  const sanitized: LongTermWeek[] = [];
  for (let i = 0; i < horizon.weekCount; i += 1) {
    const raw = plan[i] ?? {};
    const fallback = buildFallbackLongTermWeek(i, horizon.startMonday, targetMileage);
    const weekStart = addWeeksUtc(horizon.startMonday, i);
    const weekEnd = addDaysUtc(weekStart, 6);

    const phaseFocus = String(raw.phase_focus ?? raw.focus ?? fallback.phase_focus)
      .trim()
      .slice(0, 180) || fallback.phase_focus;

    const targetKm = getNumericWithinBounds(
      raw.target_km ?? raw.weekly_km,
      fallback.target_km,
      0,
      250,
    );

    const keyWorkouts = sanitizeKeyWorkouts(raw.key_workouts ?? raw.key_sessions);
    const notes = String(raw.notes ?? raw.risk_notes ?? fallback.notes).trim().slice(0, 280) || fallback.notes;

    sanitized.push({
      week_start: toIsoDate(weekStart),
      week_end: toIsoDate(weekEnd),
      phase_focus: phaseFocus,
      target_km: targetKm,
      key_workouts: keyWorkouts.length ? keyWorkouts : fallback.key_workouts,
      notes,
    });
  }
  return sanitized;
}

// ── Main handler ───────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const geminiKey = Deno.env.get("GEMINI_API_KEY");
    if (!geminiKey) {
      return new Response(
        JSON.stringify({ error: "Gemini API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const authHeader = req.headers.get("Authorization") || req.headers.get("authorization") || "";
    const [scheme, token] = authHeader.split(" ");
    if (scheme?.toLowerCase() !== "bearer" || !token) {
      return new Response(
        JSON.stringify({ error: "Missing bearer token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const jwt = token.trim();
    const { data: { user }, error: userErr } = await supabase.auth.getUser(jwt);
    if (userErr || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const body: RequestBody = await req.json();
    const mode: CoachMode = body.mode ?? "initial";
    const [dynamicPlaybookAddendum, activePhilosophy] = await Promise.all([
      fetchDynamicPlaybookAddendum(supabase, body, mode),
      fetchActivePhilosophyDocument(supabase),
    ]);
    const philosophyAddendum = buildActivePhilosophyAddendum(activePhilosophy);

    if (mode === "long_term_replan") {
      const systemInstruction = buildReplanSystemInstruction(
        LONG_TERM_REPLAN_SYSTEM_INSTRUCTION,
        body.lang,
        philosophyAddendum,
        dynamicPlaybookAddendum,
      );
      const horizon = computeLongTermHorizon(body.planContext);
      const userMessage = buildLongTermReplanPrompt(body, horizon);

      const geminiRes = await fetch(`${GEMINI_URL}?key=${geminiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemInstruction }] },
          contents: [{ role: "user", parts: [{ text: userMessage }] }],
          generationConfig: { temperature: 0.5, maxOutputTokens: 4096 },
        }),
      });

      let parsedResult: { coaching_feedback?: string; weekly_structure?: Record<string, unknown>[] } = {};
      if (geminiRes.ok) {
        const geminiData = await geminiRes.json();
        const candidates = geminiData.candidates;
        if (candidates?.length) {
          const parts: Array<{ text?: string; thought?: boolean }> = candidates[0]?.content?.parts || [];
          const outputPart = parts.find((p) => !p.thought && p.text) ?? parts[parts.length - 1];
          const rawText = (outputPart?.text || "").trim();
          try {
            parsedResult = JSON.parse(stripMarkdownFences(rawText));
          } catch {
            parsedResult = {};
          }
        }
      }

      const weeklyStructure = validateAndSanitizeLongTermWeeks(
        Array.isArray(parsedResult.weekly_structure) ? parsedResult.weekly_structure : [],
        horizon,
        body.planContext?.targetMileage,
      );
      const defaultFeedback = horizon.usedFallback
        ? "Long-term replan generated with fallback horizon due to unavailable or out-of-range race date context. Keep progression conservative and update race context when available."
        : "Long-term replan generated through goal-race week with progressive load and recovery balance.";
      const coachingFeedback = String(parsedResult.coaching_feedback || defaultFeedback).slice(0, 1000);
      const adaptationSummary = String(
        (parsedResult as Record<string, unknown>).adaptation_summary || "Adaptation based on available training context.",
      ).slice(0, 600);

      return new Response(
        JSON.stringify({
          coaching_feedback: coachingFeedback,
          adaptation_summary: adaptationSummary,
          weekly_structure: weeklyStructure,
          horizon_start: toIsoDate(horizon.startMonday),
          horizon_end: toIsoDate(horizon.endSunday),
          goal_race_date: horizon.goalRaceDate,
          used_fallback_horizon: horizon.usedFallback,
          horizon_reason: horizon.reason,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ── Plan generation mode ─────────────────────────────────────────────────
    if (mode === "plan" || mode === "plan_revision") {
      const isPlanRevision = mode === "plan_revision";
      const baseInstruction = isPlanRevision ? PLAN_REVISION_SYSTEM_INSTRUCTION : PLAN_SYSTEM_INSTRUCTION;
      const systemInstruction = buildReplanSystemInstruction(
        baseInstruction,
        body.lang,
        philosophyAddendum,
        dynamicPlaybookAddendum,
      );

      let contents: Array<{ role: string; parts: Array<{ text: string }> }>;

      if (isPlanRevision && body.conversationHistory && body.conversationHistory.length > 0) {
        const contextPrefix = buildPlanPrompt(body);
        contents = body.conversationHistory.map((turn, idx) => {
          let text = turn.text;
          if (idx === 0 && turn.role === "user" && contextPrefix.trim()) {
            text = `Context about this athlete's training:\n${contextPrefix}\n\n---\n\n${text}`;
          }
          return { role: turn.role, parts: [{ text }] };
        });
      } else {
        const userMessage = buildPlanPrompt(body);
        contents = [{ role: "user", parts: [{ text: userMessage }] }];
      }

      const geminiRes = await fetch(`${GEMINI_URL}?key=${geminiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemInstruction }] },
          contents,
          generationConfig: { temperature: 0.6, maxOutputTokens: 4096 },
        }),
      });

      if (!geminiRes.ok) {
        const errText = await geminiRes.text();
        console.error("Gemini API error (plan):", geminiRes.status, errText);
        return new Response(
          JSON.stringify({ error: "Gemini API request failed" }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const geminiData = await geminiRes.json();
      const candidates = geminiData.candidates;
      if (!candidates?.length) {
        return new Response(
          JSON.stringify({ error: "No response from Gemini" }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const parts: Array<{ text?: string; thought?: boolean }> = candidates[0]?.content?.parts || [];
      const outputPart = parts.find((p) => !p.thought && p.text) ?? parts[parts.length - 1];
      const rawText = (outputPart?.text || "").trim();

      let result: {
        coaching_feedback?: string;
        adaptation_summary?: string;
        structured_plan?: Record<string, unknown>[];
      };
      try {
        result = JSON.parse(stripMarkdownFences(rawText));
      } catch {
        return new Response(
          JSON.stringify({ error: "Failed to parse plan from Gemini", raw: rawText.slice(0, 300) }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const structuredPlan = validateAndSanitizePlan(
        Array.isArray(result.structured_plan) ? result.structured_plan : [],
      );
      const coachingFeedback = String(result.coaching_feedback || "").slice(0, 1000);
      const adaptationSummary = String(
        result.adaptation_summary || "Adaptation based on available training context.",
      ).slice(0, 600);

      return new Response(
        JSON.stringify({
          coaching_feedback: coachingFeedback,
          adaptation_summary: adaptationSummary,
          structured_plan: structuredPlan,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ── Follow-up conversational mode ────────────────────────────────────────
    if (mode === "followup") {
      const history = body.conversationHistory ?? [];
      if (history.length === 0) {
        return new Response(
          JSON.stringify({ error: "No conversation history provided for follow-up" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const contextPrefix = buildPrompt(body);
      const contents = history.map((turn, idx) => {
        let text = turn.text;
        if (idx === 0 && turn.role === "user" && contextPrefix.trim()) {
          text = `Context about this athlete's training:\n${contextPrefix}\n\n---\n\n${text}`;
        }
        return { role: turn.role, parts: [{ text }] };
      });

      const geminiRes = await fetch(`${GEMINI_URL}?key=${geminiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: {
            parts: [{
              text: buildDefaultSystemInstruction(
                FOLLOWUP_SYSTEM_INSTRUCTION,
                body.lang,
                dynamicPlaybookAddendum,
                philosophyAddendum,
              ),
            }],
          },
          contents,
          generationConfig: { temperature: 0.8, maxOutputTokens: 1024 },
        }),
      });

      if (!geminiRes.ok) {
        const errText = await geminiRes.text();
        console.error("Gemini API error (followup):", geminiRes.status, errText);
        return new Response(
          JSON.stringify({ error: "Gemini API request failed" }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const geminiData = await geminiRes.json();
      const candidates = geminiData.candidates;
      if (!candidates?.length) {
        return new Response(
          JSON.stringify({ error: "No response from Gemini" }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const parts: Array<{ text?: string; thought?: boolean }> = candidates[0]?.content?.parts || [];
      const outputPart = parts.find((p) => !p.thought && p.text) ?? parts[parts.length - 1];
      const text = (outputPart?.text || "").trim();

      return new Response(
        JSON.stringify({ text }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ── Insights synthesis mode ───────────────────────────────────────────────
    if (mode === "insights_synthesis") {
      const systemInstruction = buildDefaultSystemInstruction(
        buildInsightsSynthesisInstruction(body.lang),
        body.lang,
        dynamicPlaybookAddendum,
        philosophyAddendum,
      );
      const userMessage = buildPrompt(body);

      const geminiRes = await fetch(`${GEMINI_URL}?key=${geminiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemInstruction }] },
          contents: [{ role: "user", parts: [{ text: userMessage }] }],
          generationConfig: { temperature: 0.6, maxOutputTokens: 1024 },
        }),
      });

      if (!geminiRes.ok) {
        const errText = await geminiRes.text();
        console.error("Gemini API error (synthesis):", geminiRes.status, errText);
        return new Response(
          JSON.stringify({ error: "Gemini API request failed" }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const geminiData = await geminiRes.json();
      const rawText = geminiData.candidates?.[0]?.content?.parts?.find(
        (p: { thought?: boolean; text?: string }) => !p.thought && p.text,
      )?.text ?? "";

      const sections = pluckSynthesisSections(rawText, body.lang);
      const sanitized = rebuildSanitizedMarkdown(trimSynthesisSections(sections, body.lang), body.lang);
      const requiredHeadings = getRequiredHeadings(body.lang);
      const hasAllSections = requiredHeadings.every((h) => sanitized.includes(h));

      if (!hasAllSections) {
        // Fire and forget logging
        logAiFailure(supabase, user.id, "insights_synthesis", rawText, "missing_sections")
          .catch(console.error);
      }

      const synthesis = hasAllSections && sanitized.trim()
        ? sanitized
        : buildFallbackSynthesis(body);

      return new Response(JSON.stringify({ synthesis }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Initial coaching mode (default) ──────────────────────────────────────
    const userMessage = buildPrompt(body);
    if (!userMessage.trim()) {
      return new Response(
        JSON.stringify({ error: "No training data provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const geminiRes = await fetch(`${GEMINI_URL}?key=${geminiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: {
          parts: [{
            text: buildDefaultSystemInstruction(
              SYSTEM_INSTRUCTION,
              body.lang,
              dynamicPlaybookAddendum,
              philosophyAddendum,
            ),
          }],
        },
        contents: [{ role: "user", parts: [{ text: userMessage }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 4096 },
      }),
    });

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      console.error("Gemini API error:", geminiRes.status, errText);
      return new Response(
        JSON.stringify({ error: "Gemini API request failed" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const geminiData = await geminiRes.json();
    const candidates = geminiData.candidates;
    if (!candidates || !candidates.length) {
      return new Response(
        JSON.stringify({ error: "No response from Gemini" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const parts: Array<{ text?: string; thought?: boolean }> = candidates[0]?.content?.parts || [];
    const outputPart = parts.find((p) => !p.thought && p.text) ?? parts[parts.length - 1];
    const rawText = outputPart?.text || "";

    let insights;
    try {
      const cleaned = stripMarkdownFences(rawText);
      insights = JSON.parse(cleaned);
      if (!Array.isArray(insights)) insights = [insights];

      const validTypes = ["danger", "warning", "positive", "info"];
      const validIcons = [
        "warning",
        "alert",
        "battery",
        "fatigue",
        "balance",
        "trending",
        "decline",
        "spike",
        "longrun",
        "rest",
        "motivation",
        "injury",
        "race",
        "taper",
      ];

      insights = insights
        .filter((i: Record<string, unknown>) => i.title && i.body)
        .map((i: Record<string, unknown>) => ({
          type: validTypes.includes(i.type as string) ? i.type : "info",
          icon: validIcons.includes(i.icon as string) ? i.icon : "balance",
          title: String(i.title).slice(0, 100),
          body: String(i.body).slice(0, 500),
        }))
        .slice(0, 5);
    } catch {
      return new Response(
        JSON.stringify({ error: "Failed to parse Gemini response", raw: rawText.slice(0, 200) }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ insights }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
