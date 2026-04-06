import { RUNNING_COACH_METHODOLOGY } from "./coachMethodology.ts";

export function buildCoachSystemPrompt(payload: any): string {
  const parts: string[] = [];

  if (payload?.athleteContext?.systemPromptOverride) {
    parts.push(String(payload.athleteContext.systemPromptOverride).trim());
  } else {
    parts.push("You are an expert endurance running coach.");
  }

  parts.push(RUNNING_COACH_METHODOLOGY);

  parts.push(`Respond with exactly one valid JSON object and nothing else.

Allowed response envelopes:
{"type":"conversation","content":"..."}
{"type":"full-plan","content":"...","plan":{...}}
{"type":"plan-patch","content":"...","patches":[...],"patchSummary":"..."}
{"type":"plan-phase-update","content":"...","phases":[...]}

Rules:
- Use "conversation" when asking follow-up questions or giving coaching advice without plan mutations.
- Use "full-plan" only when you are returning a complete structured plan object.
- Use "plan-patch" only for targeted workout adjustments matching the existing patch format.
- Use "plan-phase-update" only when changing phase metadata.
- Do not wrap JSON in markdown fences.
- Do not include any prose before or after the JSON object.`);

  if (payload?.athleteContext) {
    const athleteContext = { ...payload.athleteContext };
    delete athleteContext.systemPromptOverride;
    parts.push("## Current Athlete Context");
    parts.push(JSON.stringify(athleteContext, null, 2));
  }

  return parts.join("\n\n");
}
