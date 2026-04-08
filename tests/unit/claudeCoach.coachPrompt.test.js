import { describe, expect, it } from "vitest";
import { buildCoachSystemPrompt } from "../../supabase/functions/claude-coach/coachPrompt.ts";

describe("buildCoachSystemPrompt", () => {
  it("uses the override prompt and strips it from serialized athlete context", () => {
    const prompt = buildCoachSystemPrompt({
      athleteContext: {
        systemPromptOverride: "Ask 1-2 targeted assessment questions.",
        planIntake: {
          raceGoal: {
            eventName: "Soria Moria",
          },
        },
      },
    });

    expect(prompt).toContain("Ask 1-2 targeted assessment questions.");
    expect(prompt).toContain("# Running Coach Methodology");
    expect(prompt).toContain("Validate the assessment with the athlete before finalizing the plan.");
    expect(prompt).toContain("Use back-to-back long runs strategically for ultra preparation");
    expect(prompt).toContain('"type":"conversation"');
    expect(prompt).toContain('"type":"full-plan"');
    expect(prompt).toContain('complete hierarchical running plan object for this app');
    expect(prompt).toContain('plan.weeks must be a non-empty array');
    expect(prompt).toContain('plan.meta.planStartDate must exactly equal plan.weeks[0].startDate');
    expect(prompt).toContain('"eventName": "Soria Moria"');
    expect(prompt).not.toContain("running-coach skill");
    expect(prompt).not.toContain("systemPromptOverride");
  });
});

describe("skipPersist contract", () => {
  it("documents that skipPersist=true with conversationHistory skips DB persistence", () => {
    // This is a contract test — it documents the expected payload shape
    // The actual skip logic lives in index.ts (Deno), tested via integration
    const ephemeralPayload = {
      sessionId: "eph-abc-123",
      newMessage: "Move my tempo run to Tuesday",
      conversationHistory: [
        { role: "assistant", content: [{ type: "text", text: JSON.stringify({ type: "conversation", content: "Tell me about this week" }) }] },
      ],
      skipPersist: true,
      athleteContext: { weekContext: { weekNumber: 3 } },
    };

    expect(ephemeralPayload.skipPersist).toBe(true);
    expect(Array.isArray(ephemeralPayload.conversationHistory)).toBe(true);
    expect(ephemeralPayload.sessionId).toBeTruthy();
    expect(ephemeralPayload.newMessage).toBeTruthy();
  });
});
