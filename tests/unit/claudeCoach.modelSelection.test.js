import { beforeEach, describe, expect, it, vi } from "vitest";
import { getAnthropicModelForMode } from "../../supabase/functions/claude-coach/modelSelection.ts";

describe("getAnthropicModelForMode", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  it("uses a cheaper model for race_info by default", () => {
    expect(getAnthropicModelForMode("race_info")).toBe("claude-3-5-haiku-latest");
  });

  it("uses the chat model for default coach requests", () => {
    expect(getAnthropicModelForMode("chat")).toBe("claude-sonnet-4-20250514");
  });

  it("allows overriding the race_info model with an env var", () => {
    vi.stubEnv("ANTHROPIC_RACE_INFO_MODEL", "custom-race-model");
    expect(getAnthropicModelForMode("race_info")).toBe("custom-race-model");
  });

  it("lets insights_synthesis inherit the configured coach model", () => {
    vi.stubEnv("ANTHROPIC_COACH_CHAT_MODEL", "custom-chat-model");
    expect(getAnthropicModelForMode("insights_synthesis")).toBe("custom-chat-model");
  });
});
