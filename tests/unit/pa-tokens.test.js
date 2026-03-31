import { readFileSync } from "fs";
import { describe, it, expect } from "vitest";

const css = readFileSync("src/styles/pa-tokens.css", "utf-8");

describe("pa-tokens.css", () => {
  describe("Core palette", () => {
    it("defines --pa-primary with value #003371", () => {
      expect(css).toContain("--pa-primary:");
      expect(css).toContain("#003371");
    });

    it("defines --pa-primary-container with value #00499c", () => {
      expect(css).toContain("--pa-primary-container:");
      expect(css).toContain("#00499c");
    });

    it("defines --pa-on-primary with value #ffffff", () => {
      expect(css).toContain("--pa-on-primary:");
      expect(css).toContain("--pa-on-primary:         #ffffff");
    });
  });

  describe("Surface hierarchy", () => {
    it("defines --pa-surface:", () => {
      expect(css).toContain("--pa-surface:");
    });

    it("defines --pa-surface-container-low:", () => {
      expect(css).toContain("--pa-surface-container-low:");
    });

    it("defines --pa-surface-container-lowest:", () => {
      expect(css).toContain("--pa-surface-container-lowest:");
    });
  });

  describe("Typography", () => {
    it("defines --pa-font-display: with Manrope in value", () => {
      expect(css).toContain("--pa-font-display:");
      expect(css).toMatch(/--pa-font-display:.*Manrope/);
    });

    it("defines --pa-font-body: with Inter in value", () => {
      expect(css).toContain("--pa-font-body:");
      expect(css).toMatch(/--pa-font-body:.*Inter/);
    });
  });

  describe("Spacing (4px grid)", () => {
    it("defines --pa-space-1:", () => {
      expect(css).toContain("--pa-space-1:");
    });

    it("defines --pa-space-2:", () => {
      expect(css).toContain("--pa-space-2:");
    });

    it("defines --pa-space-4:", () => {
      expect(css).toContain("--pa-space-4:");
    });

    it("defines --pa-space-8:", () => {
      expect(css).toContain("--pa-space-8:");
    });
  });

  describe("Elevation", () => {
    it("defines --pa-shadow-ambient: with rgba(0, 51, 113", () => {
      expect(css).toContain("--pa-shadow-ambient:");
      expect(css).toContain("rgba(0, 51, 113");
    });

    it("defines --pa-shadow-card:", () => {
      expect(css).toContain("--pa-shadow-card:");
    });

    it("defines --pa-outline: with rgba(0, 51, 113, 0.20)", () => {
      expect(css).toContain("--pa-outline:");
      expect(css).toContain("rgba(0, 51, 113, 0.20)");
    });

    it("defines --pa-radius-card: with 0.75rem", () => {
      expect(css).toContain("--pa-radius-card:");
      expect(css).toContain("0.75rem");
    });
  });

  describe("Glassmorphism", () => {
    it("defines --pa-glass-bg:", () => {
      expect(css).toContain("--pa-glass-bg:");
    });

    it("defines --pa-glass-blur:", () => {
      expect(css).toContain("--pa-glass-blur:");
    });

    it("defines --pa-glass-shadow:", () => {
      expect(css).toContain("--pa-glass-shadow:");
    });

    it("defines .pa-glass class", () => {
      expect(css).toContain(".pa-glass");
    });

    it("contains @supports with backdrop-filter", () => {
      expect(css).toContain("@supports");
      expect(css).toContain("backdrop-filter");
    });

    it("contains -webkit-backdrop-filter for Safari support", () => {
      expect(css).toContain("-webkit-backdrop-filter");
    });
  });

  describe("Gradient", () => {
    it("defines --pa-gradient-cta: with linear-gradient(135deg", () => {
      expect(css).toContain("--pa-gradient-cta:");
      expect(css).toContain("linear-gradient(135deg");
    });
  });

  describe("No-Line Rule", () => {
    it("does NOT contain '1px solid' (tonal surfaces replace borders)", () => {
      expect(css).not.toContain("1px solid");
    });
  });
});
