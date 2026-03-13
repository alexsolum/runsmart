/**
 * Smoke tests for gemini-coach system instruction mandates.
 * These assert that required coaching mandate strings are present in the
 * instruction snippets module (src/lib/instructionSnippets.js).
 *
 * Wave 0: Tests fail with "module not found" until 03-01 creates the module.
 * Wave 1 (03-01): Tests turn GREEN after instruction snippets are exported.
 *
 * Covers: FDBK-01 (citation mandate), FDBK-02 (methodology requirement + philosophy blend)
 * Covers: INSG-02 (synthesis instruction snippet)
 */
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  CITATION_MANDATE_SNIPPET,
  METHODOLOGY_MANDATE_SNIPPET,
} from "../../src/lib/instructionSnippets.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const GEMINI_COACH_SOURCE = fs.readFileSync(
  path.resolve(__dirname, "../../supabase/functions/gemini-coach/index.ts"),
  "utf8",
);

describe("gemini-coach instruction mandates", () => {
  it("FDBK-01: citation mandate snippet contains check-in citation requirement", () => {
    expect(CITATION_MANDATE_SNIPPET).toMatch(/cite.*check-in|check-in.*value/i);
  });

  it("FDBK-01: citation mandate snippet handles absent wellness data", () => {
    expect(CITATION_MANDATE_SNIPPET).toMatch(/no.*check-in|no.*wellness|absent/i);
  });

  it("FDBK-02: methodology mandate snippet requires long-run or intensity distribution mention", () => {
    expect(METHODOLOGY_MANDATE_SNIPPET).toMatch(/long.?run|80.?20|intensity distribution/i);
  });

  it("FDBK-02: methodology mandate snippet references koop_weight or bakken_weight blend", () => {
    expect(METHODOLOGY_MANDATE_SNIPPET).toMatch(/koop_weight|bakken_weight|philosophy.*blend|blend.*philosophy/i);
  });
});

describe("gemini-coach weekly recommendation context precedence", () => {
  it("WREC-03: plan mode prioritizes selected-week context above philosophy and playbook layers", () => {
    expect(GEMINI_COACH_SOURCE).toMatch(/Selected-week recommendation context from the app request/i);
    expect(GEMINI_COACH_SOURCE).toMatch(/Active published coaching philosophy \(runtime document\)/i);
    expect(GEMINI_COACH_SOURCE).toMatch(/Runtime playbook snippets/i);
  });

  it("WREC-04: plan mode treats philosophy red lines as explicit override-only guardrails", () => {
    expect(GEMINI_COACH_SOURCE).toMatch(/Philosophy conflict rule: selected-week direction wins unless a published philosophy red-line or explicit safety guardrail would be violated/i);
    expect(GEMINI_COACH_SOURCE).toMatch(/If a red-line override is necessary, keep the week recognizable and explain the override plainly/i);
  });

  it("WREC-03: plan generation is anchored to the requested target week instead of next Monday fallback copy", () => {
    expect(GEMINI_COACH_SOURCE).toMatch(/Generate the 7-day plan for the selected week from/i);
    expect(GEMINI_COACH_SOURCE).toMatch(/Mileage is a hard constraint/i);
  });

  it("WREC-04: hard selected-week contract requires explicit override rationale for mileage drift", () => {
    expect(GEMINI_COACH_SOURCE).toMatch(/Hard constraint flags: training type/i);
    expect(GEMINI_COACH_SOURCE).toMatch(/overrideRequiresExplanation/i);
    expect(GEMINI_COACH_SOURCE).toMatch(/This is a taper-sensitive week/i);
  });

  it("WCON-02: plan mode consumes structured weeklyConstraints alongside the selected-week directive", () => {
    expect(GEMINI_COACH_SOURCE).toMatch(/Treat structured weeklyConstraints as day-level scheduling preferences/i);
    expect(GEMINI_COACH_SOURCE).toMatch(/Preferred long-run day:/i);
    expect(GEMINI_COACH_SOURCE).toMatch(/Preferred hard-workout day:/i);
    expect(GEMINI_COACH_SOURCE).toMatch(/Commute days:/i);
    expect(GEMINI_COACH_SOURCE).toMatch(/Double threshold allowed:/i);
  });

  it("WCON-02: plan mode requires explanation when a weekly constraint is relaxed or a session moves", () => {
    expect(GEMINI_COACH_SOURCE).toMatch(/If a requested weekly constraint cannot be satisfied, explain which session moved or which preference was relaxed inside adaptation_summary/i);
    expect(GEMINI_COACH_SOURCE).toMatch(/If you move a requested session or relax a weekly constraint, explain it plainly in adaptation_summary/i);
    expect(GEMINI_COACH_SOURCE).toMatch(/Long run moved from/i);
    expect(GEMINI_COACH_SOURCE).toMatch(/Primary quality session moved from/i);
  });

  it("WCON-03: malformed plan JSON falls back to a safe structured week instead of returning a hard parse failure", () => {
    expect(GEMINI_COACH_SOURCE).toMatch(/responseMimeType:\s*"application\/json"/i);
    expect(GEMINI_COACH_SOURCE).toMatch(/buildPlanParseFailureFallback/i);
    expect(GEMINI_COACH_SOURCE).toMatch(/used_ai_fallback:\s*true/i);
    expect(GEMINI_COACH_SOURCE).toMatch(/failed_to_parse_plan_response/i);
  });
});

describe("gemini-coach insights synthesis instruction", () => {
  it("INSG-02: enforces sectioned markdown output and forbids JSON wrappers", () => {
    expect(GEMINI_COACH_SOURCE).toMatch(/Respond in plain Markdown/i);
    expect(GEMINI_COACH_SOURCE).toMatch(/Do not use JSON wrappers/i);
  });

  it("INSG-02: requires the four locked synthesis section headings", () => {
    expect(GEMINI_COACH_SOURCE).toContain("Mileage Trend");
    expect(GEMINI_COACH_SOURCE).toContain("Intensity Distribution");
    expect(GEMINI_COACH_SOURCE).toContain("Long-Run Progression");
    expect(GEMINI_COACH_SOURCE).toContain("Race Readiness");
  });

  it("INSG-02: asks for compact section analysis tied to the training data", () => {
    expect(GEMINI_COACH_SOURCE).toMatch(/provide 2-3 sentences of analysis tied to their data/i);
    expect(GEMINI_COACH_SOURCE).toMatch(/one actionable recommendation/i);
  });

  it("INSG-02: uses explicit section headings followed by a colon", () => {
    expect(GEMINI_COACH_SOURCE).toMatch(/exact heading followed by a colon/i);
  });
});
