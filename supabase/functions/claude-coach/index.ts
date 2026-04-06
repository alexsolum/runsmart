// Supabase Edge Function — Claude Coach (Agent Skills relay)
//
// Receives user messages + athlete context, loads conversation history from
// coach_conversations, calls the Anthropic API with the running-coach custom
// skill attached, handles pause_turn loops, routes response by type
// (conversation, full-plan, plan-patch, plan-phase-update), and persists
// both user and assistant messages.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ── Constants ────────────────────────────────────────────────────────────────

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_MODEL = "claude-sonnet-4-20250514";
const MAX_OUTPUT_TOKENS = 16384;

// ── Insights synthesis (retained from previous version) ──────────────────────

const INSIGHTS_SYNTHESIS_SYSTEM_PROMPT = `You are an expert endurance running coach writing a concise training synthesis.

Return plain text only. Do not use markdown code fences or JSON.

Write exactly four labeled lines in this order:
Mileage Trend:
Intensity Distribution:
Long-Run Progression:
Race Readiness:

Each line should be 1-2 sentences grounded in the supplied training data. If the data is incomplete, say so briefly and stay conservative.`;

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

// ── Helpers ──────────────────────────────────────────────────────────────────

function getBearerToken(req: Request): string | null {
  const authHeader = req.headers.get("Authorization") || req.headers.get("authorization") || "";
  const [scheme, token] = authHeader.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) return null;
  return token;
}

async function verifyAndGetUserId(token: string, supabase: any): Promise<string | null> {
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user?.id) return null;
  return data.user.id;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries = 1,
  initialDelay = 500
): Promise<Response> {
  let lastError: any;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    if (attempt > 0) {
      await sleep(initialDelay * Math.pow(2, attempt - 1));
    }
    try {
      const response = await fetch(url, options);
      if (
        (response.status === 429 || response.status === 499 ||
         response.status === 529 || response.status >= 500) &&
        attempt < maxRetries
      ) {
        continue;
      }
      return response;
    } catch (err) {
      lastError = err;
      if (attempt >= maxRetries) break;
    }
  }
  throw lastError || new Error("Max retries reached");
}

function jsonResponse(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ── Agent Skills API call ────────────────────────────────────────────────────

interface SkillsChatParams {
  messages: Array<{ role: string; content: any }>;
  system: string;
  anthropicKey: string;
  skillId: string;
}

async function callAgentSkills({ messages, system, anthropicKey, skillId }: SkillsChatParams) {
  const body: any = {
    model: ANTHROPIC_MODEL,
    max_tokens: MAX_OUTPUT_TOKENS,
    system,
    messages,
    skills: [
      {
        type: "custom",
        skill_id: skillId,
        version: "latest",
      },
    ],
  };

  let response = await fetchWithRetry(ANTHROPIC_URL, {
    method: "POST",
    headers: {
      "x-api-key": anthropicKey,
      "anthropic-version": "2023-06-01",
      "anthropic-beta": "skills-2025-10-02",
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Anthropic API error ${response.status}: ${errText}`);
  }

  let result = await response.json();

  // Handle pause_turn loop for long-running operations (e.g., full plan generation)
  while (result.stop_reason === "pause_turn") {
    // Append assistant's partial content and continue
    messages.push({ role: "assistant", content: result.content });
    messages.push({ role: "user", content: [{ type: "text", text: "Continue." }] });

    response = await fetchWithRetry(ANTHROPIC_URL, {
      method: "POST",
      headers: {
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
        "anthropic-beta": "skills-2025-10-02",
        "content-type": "application/json",
      },
      body: JSON.stringify({ ...body, messages }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Anthropic API error on continue ${response.status}: ${errText}`);
    }

    result = await response.json();
  }

  return result;
}

// ── Response parsing ─────────────────────────────────────────────────────────

function extractResponseEnvelope(apiResult: any): any {
  // The skill response may come as a text content block or tool_use block.
  // Try to find a JSON envelope in the content blocks.
  const contentBlocks = apiResult.content ?? [];

  for (const block of contentBlocks) {
    if (block.type === "text") {
      try {
        const parsed = JSON.parse(block.text);
        if (parsed.type) return parsed;
      } catch {
        // Not JSON — treat as plain conversation text
        return { type: "conversation", content: block.text };
      }
    }
    if (block.type === "tool_use" && block.input) {
      const input = block.input;
      if (input.type) return input;
      // Legacy format: tool_use with text/patch/patchSummary
      if (input.text !== undefined) {
        if (input.patch && Array.isArray(input.patch) && input.patch.length > 0) {
          return {
            type: "plan-patch",
            content: input.text,
            patches: input.patch,
            patchSummary: input.patchSummary ?? null,
          };
        }
        return { type: "conversation", content: input.text };
      }
    }
  }

  // Fallback: concatenate all text blocks
  const text = contentBlocks
    .filter((b: any) => b.type === "text")
    .map((b: any) => b.text)
    .join("\n");
  return { type: "conversation", content: text || "I could not process that request." };
}

// ── Output routing ───────────────────────────────────────────────────────────

async function routeResponse(
  envelope: any,
  userId: string,
  supabase: any
): Promise<{ planUpdated: boolean; error: string | null }> {
  switch (envelope.type) {
    case "full-plan": {
      if (!envelope.plan) return { planUpdated: false, error: null };

      // Upsert hierarchical plan
      const { error: planErr } = await supabase
        .from("hierarchical_plans")
        .upsert(
          { user_id: userId, status: "active", plan_data: envelope.plan },
          { onConflict: "user_id" }
        );
      if (planErr) return { planUpdated: false, error: planErr.message };

      // Derive and sync training_blocks from plan.phases
      if (envelope.plan.phases && envelope.plan.weeks?.length) {
        const planStartDate = new Date(envelope.plan.weeks[0].startDate);
        const blocks = envelope.plan.phases.map((phase: any) => ({
          user_id: userId,
          phase: phase.name,
          label: phase.name,
          start_date: addDays(planStartDate, (phase.startWeek - 1) * 7),
          end_date: addDays(planStartDate, phase.endWeek * 7 - 1),
          target_km: null,
          notes: phase.focus,
        }));

        // Delete existing blocks and re-insert
        await supabase.from("training_blocks").delete().eq("user_id", userId);
        const { error: blockErr } = await supabase.from("training_blocks").insert(blocks);
        if (blockErr) return { planUpdated: true, error: `Plan saved but blocks failed: ${blockErr.message}` };
      }

      return { planUpdated: true, error: null };
    }

    case "plan-patch": {
      if (!envelope.patches?.length) return { planUpdated: false, error: null };

      // Get current plan
      const { data: plan } = await supabase
        .from("hierarchical_plans")
        .select("id")
        .eq("user_id", userId)
        .single();

      if (!plan) return { planUpdated: false, error: "No active plan found" };

      const { error: patchErr } = await supabase.rpc("apply_plan_patch", {
        p_plan_id: plan.id,
        p_patches: envelope.patches,
      });

      if (patchErr) return { planUpdated: false, error: patchErr.message };
      return { planUpdated: true, error: null };
    }

    case "plan-phase-update": {
      if (!envelope.phases) return { planUpdated: false, error: null };

      // Update phases in plan_data
      const { data: currentPlan } = await supabase
        .from("hierarchical_plans")
        .select("id, plan_data")
        .eq("user_id", userId)
        .single();

      if (!currentPlan) return { planUpdated: false, error: "No active plan found" };

      const updatedPlanData = { ...currentPlan.plan_data, phases: envelope.phases };
      const { error: updateErr } = await supabase
        .from("hierarchical_plans")
        .update({ plan_data: updatedPlanData })
        .eq("id", currentPlan.id);

      if (updateErr) return { planUpdated: false, error: updateErr.message };

      // Sync training_blocks
      if (currentPlan.plan_data.weeks?.length) {
        const planStartDate = new Date(currentPlan.plan_data.weeks[0].startDate);
        const blocks = envelope.phases.map((phase: any) => ({
          user_id: userId,
          phase: phase.name,
          label: phase.name,
          start_date: addDays(planStartDate, (phase.startWeek - 1) * 7),
          end_date: addDays(planStartDate, phase.endWeek * 7 - 1),
          target_km: null,
          notes: phase.focus,
        }));
        await supabase.from("training_blocks").delete().eq("user_id", userId);
        await supabase.from("training_blocks").insert(blocks);
      }

      return { planUpdated: true, error: null };
    }

    default:
      return { planUpdated: false, error: null };
  }
}

function addDays(base: Date, days: number): string {
  const d = new Date(base);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().split("T")[0];
}

// ── Main handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    // 1. Auth — verify JWT with Supabase auth service (proper signature check)
    const accessToken = getBearerToken(req);
    if (!accessToken) return jsonResponse({ code: 401, message: "Missing bearer token" }, 401);

    const userId = await verifyAndGetUserId(accessToken, supabase);
    if (!userId) return jsonResponse({ code: 401, message: "Invalid JWT" }, 401);

    // 2. Parse
    const payload = await req.json();

    // ── Insights synthesis mode (unchanged) ──
    if (payload.mode === "insights_synthesis") {
      const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
      if (!anthropicKey) return jsonResponse({ error: "ANTHROPIC_API_KEY not configured" }, 500);

      const userPrompt = buildInsightsSynthesisPrompt(payload);
      const aiResponse = await fetchWithRetry(ANTHROPIC_URL, {
        method: "POST",
        headers: {
          "x-api-key": anthropicKey,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: ANTHROPIC_MODEL,
          max_tokens: 800,
          system: INSIGHTS_SYNTHESIS_SYSTEM_PROMPT,
          messages: [{ role: "user", content: userPrompt }],
        }),
      });

      if (!aiResponse.ok) {
        const errBody = await aiResponse.text();
        return jsonResponse({ error: `Claude API error: ${aiResponse.status}`, details: errBody }, 502);
      }

      const aiData = await aiResponse.json();
      const synthesis = aiData.content?.[0]?.text ?? "";
      return jsonResponse({ synthesis });
    }

    // ── Chat mode (Agent Skills) ──
    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
    const skillId = Deno.env.get("CLAUDE_COACH_SKILL_ID");
    if (!anthropicKey) return jsonResponse({ error: "ANTHROPIC_API_KEY not configured" }, 500);
    if (!skillId) return jsonResponse({ error: "CLAUDE_COACH_SKILL_ID not configured" }, 500);

    const sessionId = payload.sessionId;
    const newMessage = payload.newMessage;
    if (!sessionId || !newMessage) {
      return jsonResponse({ error: "sessionId and newMessage are required" }, 400);
    }

    // 3. Load conversation history from DB
    const { data: history, error: histErr } = await supabase
      .from("coach_conversations")
      .select("role, content")
      .eq("user_id", userId)
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true });

    if (histErr) return jsonResponse({ error: `History load failed: ${histErr.message}` }, 500);

    // 4. Build messages array
    const messages: Array<{ role: string; content: any }> = [];

    // Add conversation history
    for (const msg of (history ?? [])) {
      messages.push({ role: msg.role, content: msg.content });
    }

    // Add new user message
    const userContent = { type: "text", text: newMessage };
    messages.push({ role: "user", content: [userContent] });

    // 5. Build system prompt with athlete context
    let system = "You are an expert endurance running coach. Use the running-coach skill for all coaching guidance.\n\n";
    if (payload.athleteContext) {
      system += "## Current Athlete Context\n\n";
      system += JSON.stringify(payload.athleteContext, null, 2);
    }

    // 6. Call Agent Skills API
    const apiResult = await callAgentSkills({ messages, system, anthropicKey, skillId });

    // 7. Parse response envelope
    const envelope = extractResponseEnvelope(apiResult);

    // 8. Route plan mutations
    const routeResult = await routeResponse(envelope, userId, supabase);

    // 9. Persist messages
    // Save user message
    await supabase.from("coach_conversations").insert({
      user_id: userId,
      session_id: sessionId,
      role: "user",
      content: [userContent],
    });

    // Save assistant message (full API content blocks for faithful replay)
    await supabase.from("coach_conversations").insert({
      user_id: userId,
      session_id: sessionId,
      role: "assistant",
      content: apiResult.content,
    });

    // 10. Return response
    return jsonResponse({
      type: envelope.type,
      content: envelope.content,
      patches: envelope.patches ?? null,
      patchSummary: envelope.patchSummary ?? null,
      plan: envelope.type === "full-plan" ? envelope.plan : null,
      phases: envelope.type === "plan-phase-update" ? envelope.phases : null,
      planUpdated: routeResult.planUpdated,
      routeError: routeResult.error,
    });
  } catch (err) {
    console.error("claude-coach error:", err);
    return jsonResponse({ error: err.message ?? "Internal error" }, 500);
  }
});
