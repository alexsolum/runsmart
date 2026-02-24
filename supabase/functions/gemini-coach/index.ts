// Supabase Edge Function — Gemini AI coaching insights
// Receives a summary of training data from the frontend, sends it to
// Google Gemini for analysis, and returns structured coaching insights.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const GEMINI_MODEL = "gemini-2.5-flash";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const SYSTEM_INSTRUCTION =
  `You are an expert endurance running coach specializing in trail and ultramarathon training. ` +
  `Your coaching style should be evidence-informed and Jason Koop-inspired: long-run centric, structured progression, durability, specificity, and practical execution. ` +
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

interface RequestBody {
  weeklySummary: WeeklySummary[];
  recentActivities: RecentActivity[];
  latestCheckin: Checkin | null;
  planContext: PlanContext | null;
  dailyLogs: DailyLog[];
}

function buildPrompt(data: RequestBody): string {
  const lines: string[] = [];

  const athleteLevel = inferAthleteLevel(data.weeklySummary || []);
  lines.push(`Inferred athlete level: ${athleteLevel}`);
  lines.push("Provide recommendations that feel realistic for this athlete's recent training.");
  lines.push("");

  // Weekly summary
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

  // Plan context
  if (data.planContext) {
    const p = data.planContext;
    lines.push(
      `Current plan: ${p.race} on ${p.raceDate}, week ${p.weekNumber}, phase: ${p.phase}, target ${p.targetMileage}km this week`,
    );
    lines.push("");
  }

  // Latest check-in
  if (data.latestCheckin) {
    const c = data.latestCheckin;
    lines.push(
      `Latest check-in: fatigue ${c.fatigue}/5, sleep ${c.sleepQuality}/5, motivation ${c.motivation}/5` +
        (c.niggles ? `, niggles: ${c.niggles}` : ""),
    );
    lines.push("");
  }

  // Daily wellness logs (last 7 days)
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

  // Recent activities
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

  lines.push("Output focus:");
  lines.push("- Give week-planning guidance (e.g., 2 quality days + long run + recovery)." );
  lines.push("- Suggest sessions that connect logically to recent training and current phase.");
  lines.push("- Mention progression/regression alternatives if fatigue or niggles are high.");

  return lines.join("\n");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const geminiKey = Deno.env.get("GEMINI_API_KEY");
    if (!geminiKey) {
      return new Response(
        JSON.stringify({ error: "Gemini API key not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Authenticate the calling user
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const jwt = req.headers.get("Authorization")?.replace("Bearer ", "");
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser(jwt);

    if (userErr || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Parse the training data summary
    const body: RequestBody = await req.json();
    const userMessage = buildPrompt(body);

    if (!userMessage.trim()) {
      return new Response(
        JSON.stringify({ error: "No training data provided" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Call Gemini API
    const geminiRes = await fetch(`${GEMINI_URL}?key=${geminiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: SYSTEM_INSTRUCTION }],
        },
        contents: [
          {
            role: "user",
            parts: [{ text: userMessage }],
          },
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1024,
          responseMimeType: "application/json",
        },
      }),
    });

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      console.error("Gemini API error:", geminiRes.status, errText);
      return new Response(
        JSON.stringify({ error: "Gemini API request failed" }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const geminiData = await geminiRes.json();

    // Extract the text content from Gemini's response
    const candidates = geminiData.candidates;
    if (!candidates || !candidates.length) {
      return new Response(
        JSON.stringify({ error: "No response from Gemini" }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const rawText = candidates[0]?.content?.parts?.[0]?.text || "";

    // Parse the JSON array from Gemini's response
    let insights;
    try {
      // Strip markdown fences if Gemini adds them despite instructions
      const cleaned = rawText.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
      insights = JSON.parse(cleaned);

      if (!Array.isArray(insights)) {
        insights = [insights];
      }

      // Validate and sanitize each insight
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
        .slice(0, 5); // Max 5 insights
    } catch {
      return new Response(
        JSON.stringify({
          error: "Failed to parse Gemini response",
          raw: rawText.slice(0, 200),
        }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    return new Response(
      JSON.stringify({ insights }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
