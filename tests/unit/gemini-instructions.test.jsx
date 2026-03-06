/**
 * Smoke tests for gemini-coach system instruction mandates.
 * These assert that required coaching mandate strings are present in the
 * instruction snippets module (src/lib/instructionSnippets.js).
 *
 * Wave 0: Tests fail with "module not found" until 03-01 creates the module.
 * Wave 1 (03-01): Tests turn GREEN after instruction snippets are exported.
 *
 * Covers: FDBK-01 (citation mandate), FDBK-02 (methodology requirement + philosophy blend)
 */
import { describe, it, expect } from "vitest";
import {
  CITATION_MANDATE_SNIPPET,
  METHODOLOGY_MANDATE_SNIPPET,
} from "../../src/lib/instructionSnippets.js";

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
