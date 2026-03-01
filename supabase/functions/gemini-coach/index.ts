// Supabase Edge Function — Gemini AI coaching insights + weekly plan generation
// Receives a summary of training data from the frontend, sends it to
// Google Gemini for analysis, and returns structured coaching insights or a 7-day plan.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const GEMINI_MODEL = "gemini-2.5-flash";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

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
  `Your response MUST be a single valid JSON object with exactly two fields:\n` +
  `1. "coaching_feedback": a string (2-4 sentences) summarizing the last 4 weeks of training — key trends, progress, and any concerns.\n` +
  `2. "structured_plan": an array of exactly 7 objects, one per day starting from the next Monday, each with:\n` +
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
  `Your response MUST be a single valid JSON object with exactly two fields:\n` +
  `1. "coaching_feedback": a string (1-3 sentences) acknowledging the athlete's feedback and explaining the key changes you made.\n` +
  `2. "structured_plan": an array of exactly 7 objects, one per day, each with:\n` +
  `   - "date": ISO date string (YYYY-MM-DD)\n` +
  `   - "workout_type": one of "Easy", "Tempo", "Intervals", "Long Run", "Recovery", "Strength", "Cross-Train", "Rest"\n` +
  `   - "distance_km": number (0 for rest days)\n` +
  `   - "duration_min": integer (0 for rest days)\n` +
  `   - "description": string (1-2 sentences describing the workout)\n\n` +
  `Respond ONLY with a valid JSON object. No markdown fences, no explanation outside the JSON.`;

// ── Helpers ────────────────────────────────────────────────────────────────────

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
  mode?: "initial" | "followup" | "plan" | "plan_revision";
  conversationHistory?: ConversationTurn[];
  weeklySummary: WeeklySummary[];
  recentActivities: RecentActivity[];
  latestCheckin: Checkin | null;
  planContext: PlanContext | null;
  dailyLogs: DailyLog[];
  runnerProfile?: RunnerProfile | null;
}

// ── Prompt builder ─────────────────────────────────────────────────────────────

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
        `Volume trend: ${latestWeek.distance.toFixed(1)}km vs ${previousWeek.distance.toFixed(1)}km (${formatDelta(latestWeek.distance, previousWeek.distance)} week-over-week)`,
      );
      lines.push(
        `Longest run trend: ${latestWeek.longestRun.toFixed(1)}km vs ${previousWeek.longestRun.toFixed(1)}km (${formatDelta(latestWeek.longestRun, previousWeek.longestRun)} week-over-week)`,
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

    const jwt = req.headers.get("Authorization")?.replace("Bearer ", "");
    const { data: { user }, error: userErr } = await supabase.auth.getUser(jwt);
    if (userErr || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const body: RequestBody = await req.json();
    const mode = body.mode ?? "initial";

    // ── Plan generation mode ─────────────────────────────────────────────────
    if (mode === "plan" || mode === "plan_revision") {
      const isPlanRevision = mode === "plan_revision";
      const systemInstruction = isPlanRevision ? PLAN_REVISION_SYSTEM_INSTRUCTION : PLAN_SYSTEM_INSTRUCTION;

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

      let result: { coaching_feedback?: string; structured_plan?: Record<string, unknown>[] };
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

      return new Response(
        JSON.stringify({ coaching_feedback: coachingFeedback, structured_plan: structuredPlan }),
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
          system_instruction: { parts: [{ text: FOLLOWUP_SYSTEM_INSTRUCTION }] },
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
        system_instruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
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
        "warning", "alert", "battery", "fatigue", "balance", "trending",
        "decline", "spike", "longrun", "rest", "motivation", "injury",
        "race", "taper",
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
