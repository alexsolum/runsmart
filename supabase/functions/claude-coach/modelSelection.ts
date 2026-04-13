const DEFAULT_COACH_CHAT_MODEL = "claude-sonnet-4-6";
const DEFAULT_RACE_INFO_MODEL = "claude-sonnet-4-6";

function readEnv(name: string): string | undefined {
  if (typeof Deno !== "undefined" && Deno.env) {
    return Deno.env.get(name) ?? undefined;
  }

  if (typeof process !== "undefined" && process.env) {
    return process.env[name];
  }

  return undefined;
}

export function getAnthropicModelForMode(mode: string): string {
  if (mode === "race_info") {
    return readEnv("ANTHROPIC_RACE_INFO_MODEL") ?? DEFAULT_RACE_INFO_MODEL;
  }

  if (mode === "insights_synthesis") {
    return readEnv("ANTHROPIC_INSIGHTS_MODEL") ??
      readEnv("ANTHROPIC_COACH_CHAT_MODEL") ??
      DEFAULT_COACH_CHAT_MODEL;
  }

  return readEnv("ANTHROPIC_COACH_CHAT_MODEL") ?? DEFAULT_COACH_CHAT_MODEL;
}

export function getAnthropicModelCandidatesForMode(mode: string): string[] {
  const primary = getAnthropicModelForMode(mode);

  if (mode !== "race_info") {
    return [primary];
  }

  const fallback = readEnv("ANTHROPIC_COACH_CHAT_MODEL") ?? DEFAULT_COACH_CHAT_MODEL;
  return primary === fallback ? [primary] : [primary, fallback];
}
