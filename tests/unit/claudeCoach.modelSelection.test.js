import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getAnthropicModelCandidatesForMode,
  getAnthropicModelForMode,
} from "../../supabase/functions/claude-coach/modelSelection.ts";

describe("getAnthropicModelForMode", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  it("uses a cheaper model for race_info by default", () => {
    expect(getAnthropicModelForMode("race_info")).toBe("claude-haiku-4-5");
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

  it("uses a stronger fallback after the cheap race_info model", () => {
    expect(getAnthropicModelCandidatesForMode("race_info")).toEqual([
      "claude-haiku-4-5",
      "claude-sonnet-4-20250514",
    ]);
  });

  it("does not add a fallback list for normal chat mode", () => {
    expect(getAnthropicModelCandidatesForMode("chat")).toEqual([
      "claude-sonnet-4-20250514",
    ]);
  });
});
