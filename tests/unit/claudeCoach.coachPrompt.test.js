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
