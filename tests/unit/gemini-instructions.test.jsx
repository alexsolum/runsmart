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

describe("gemini-coach insights synthesis instruction", () => {
  it("INSG-02: enforces plain-text output and forbids JSON/markdown wrappers", () => {
    expect(GEMINI_COACH_SOURCE).toMatch(/Respond in plain text only/i);
    expect(GEMINI_COACH_SOURCE).toMatch(/Do not output JSON/i);
    expect(GEMINI_COACH_SOURCE).toMatch(/Do not output markdown/i);
  });

  it("INSG-02: requires the four locked synthesis section headings", () => {
    expect(GEMINI_COACH_SOURCE).toContain("Mileage Trend");
    expect(GEMINI_COACH_SOURCE).toContain("Intensity Distribution");
    expect(GEMINI_COACH_SOURCE).toContain("Long-Run Progression");
    expect(GEMINI_COACH_SOURCE).toContain("Race Readiness");
  });

  it("INSG-02: anchors synthesis interpretation to a 10-12 week horizon", () => {
    expect(GEMINI_COACH_SOURCE).toMatch(/10-12 week horizon/i);
  });
});
