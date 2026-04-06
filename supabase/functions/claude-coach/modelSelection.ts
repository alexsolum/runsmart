const DEFAULT_COACH_CHAT_MODEL = "claude-sonnet-4-20250514";
const DEFAULT_RACE_INFO_MODEL = "claude-3-5-haiku-latest";

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
