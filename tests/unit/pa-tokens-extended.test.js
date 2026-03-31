import { readFileSync } from "fs";
import { describe, it, expect } from "vitest";

const css = readFileSync("src/styles/pa-tokens.css", "utf-8");

describe("pa-tokens.css extended", () => {
  it("defines all semantic workout type tokens", () => {
    const tokens = ["hard", "easy", "endurance", "race", "rest", "other"];

    tokens.forEach((token) => {
      expect(css).toContain(`--pa-type-${token}:`);
      expect(css).toContain(`--pa-type-${token}-container:`);
    });
  });
});
