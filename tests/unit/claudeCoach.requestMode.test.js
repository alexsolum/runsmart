import { describe, expect, it } from "vitest";
import { getCoachRequestMode } from "../../supabase/functions/claude-coach/requestMode.ts";

describe("getCoachRequestMode", () => {
  it("returns race_info when payload explicitly sets race_info mode", () => {
    expect(
      getCoachRequestMode({
        mode: "race_info",
        raceName: "UTMB",
      }),
    ).toBe("race_info");
  });

  it("returns race_info for legacy race lookup payloads with only raceName", () => {
    expect(
      getCoachRequestMode({
        raceName: "Berlin Marathon",
      }),
    ).toBe("race_info");
  });

  it("returns chat when session payload is present", () => {
    expect(
      getCoachRequestMode({
        sessionId: "session-123",
        newMessage: "Help me plan this block.",
        raceName: "Berlin Marathon",
      }),
    ).toBe("chat");
  });

  it("preserves other explicit modes", () => {
    expect(
      getCoachRequestMode({
        mode: "insights_synthesis",
      }),
    ).toBe("insights_synthesis");
  });
});
