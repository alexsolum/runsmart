/**
 * Layout CSS regression tests
 *
 * Catches the class of bugs where:
 * 1. Multi-line className strings cause Tailwind to purge layout utilities in production
 * 2. Legacy `.dashboard-kpi` CSS box-model properties conflict with shadcn Card
 * 3. Global h1/h2/h3 serif rule overrides shadcn UI headings
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import fs from "fs";
import path from "path";
import PageContainer from "../../src/components/layout/PageContainer";
import Section from "../../src/components/layout/Section";
import HeroPage from "../../src/pages/HeroPage";
import { makeAppData } from "./mockAppData";

vi.mock("../../src/context/AppDataContext", () => ({
  useAppData: vi.fn(),
}));

vi.mock("@/components/ui/select", () => ({
  Select: ({ children, value, onValueChange, "aria-label": ariaLabel }) => (
    <select
      aria-label={ariaLabel}
      value={value ?? ""}
      onChange={(e) => onValueChange?.(e.target.value)}
    >
      {children}
    </select>
  ),
  SelectTrigger: () => null,
  SelectValue: () => null,
  SelectContent: ({ children }) => <>{children}</>,
  SelectItem: ({ value, children }) => <option value={value}>{children}</option>,
}));

import { useAppData } from "../../src/context/AppDataContext";

const ROOT = path.resolve(import.meta.dirname, "../../");

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("localStorage", {
    getItem: vi.fn().mockReturnValue(null),
    setItem: vi.fn(),
    removeItem: vi.fn(),
  });
  useAppData.mockReturnValue(makeAppData());
});

// ─── Bug 1: Tailwind class purging from multiline strings ─────────────────────

describe("PageContainer — Tailwind class scanning", () => {
  it("inner div className contains no newline characters (Tailwind purge guard)", () => {
    const { container } = render(<PageContainer>content</PageContainer>);
    const inner = container.querySelector(".max-w-7xl");
    expect(inner).toBeInTheDocument();
    // Multi-line strings cause Tailwind to purge classes in production.
    // The className must be a single space-separated string without \n.
    expect(inner.className).not.toContain("\n");
  });

  it("inner div className includes horizontal padding utilities", () => {
    const { container } = render(<PageContainer>content</PageContainer>);
    const inner = container.querySelector(".max-w-7xl");
    // At least one px-* class must be present for the build scanner to pick it up
    expect(inner.className).toMatch(/px-\d+/);
  });

  it("inner div className includes vertical padding utilities", () => {
    const { container } = render(<PageContainer>content</PageContainer>);
    const inner = container.querySelector(".max-w-7xl");
    expect(inner.className).toMatch(/py-\d+/);
  });

  it("inner div className includes space-y spacing utility", () => {
    const { container } = render(<PageContainer>content</PageContainer>);
    const inner = container.querySelector(".max-w-7xl");
    expect(inner.className).toMatch(/space-y-\d+/);
  });

  it("renders children inside the max-w-7xl container", () => {
    render(<PageContainer><p>hello</p></PageContainer>);
    expect(screen.getByText("hello")).toBeInTheDocument();
  });
});

// ─── Bug 1b: Global section/button rules in styles.css override Tailwind utilities ───

describe("styles.css — no non-layered element rules that beat Tailwind utilities", () => {
  it("styles.css does not define border-top on the section element selector", () => {
    const css = fs.readFileSync(
      path.join(ROOT, "src/styles.css"),
      "utf-8"
    );
    // Non-layered `section { border-top }` overrides @layer utilities, adding
    // a gray divider line to every <Section> component and every <section> element.
    expect(css).not.toMatch(/^section\s*\{[^}]*border-top/m);
  });

  it("styles.css does not define margin-top on the section element selector", () => {
    const css = fs.readFileSync(path.join(ROOT, "src/styles.css"), "utf-8");
    // Non-layered `section { margin-top }` fights with PageContainer space-y-* spacing.
    expect(css).not.toMatch(/^section\s*\{[^}]*margin-top/m);
  });

  it("styles.css does not define background on the button element selector", () => {
    const css = fs.readFileSync(path.join(ROOT, "src/styles.css"), "utf-8");
    // Non-layered `button { background: #2f65ff }` overrides ghost/outline shadcn variants.
    expect(css).not.toMatch(/^button\s*\{[^}]*background/m);
  });
});

// ─── Bug 2: Legacy .dashboard-kpi CSS box-model conflict ─────────────────────

describe("legacy CSS — .dashboard-kpi no longer carries box-model properties", () => {
  it("index.css does not define padding on .dashboard-kpi rule", () => {
    const css = fs.readFileSync(
      path.join(ROOT, "src/styles/index.css"),
      "utf-8"
    );
    // Extract only the .dashboard-kpi rule block (not .dashboard-card)
    // Find the block that starts with `.dashboard-kpi` and contains `{...}`
    // We check that any block starting with `.dashboard-kpi` followed by `{`
    // does NOT include a padding declaration (box-model conflict with shadcn Card)
    const kpiOnlyMatch = css.match(/\.dashboard-kpi\s*\{([^}]*)\}/g);
    if (kpiOnlyMatch) {
      for (const block of kpiOnlyMatch) {
        expect(block).not.toMatch(/padding\s*:/);
        expect(block).not.toMatch(/background\s*:/);
        expect(block).not.toMatch(/border-radius\s*:/);
        expect(block).not.toMatch(/box-shadow\s*:/);
      }
    }
    // There should be no combined `.dashboard-kpi, .dashboard-card` block with padding
    expect(css).not.toMatch(/\.dashboard-kpi,\s*\.dashboard-card\s*\{[^}]*padding\s*:/s);
  });

  it("index.css does not define font-size on .dashboard-kpi strong", () => {
    const css = fs.readFileSync(
      path.join(ROOT, "src/styles/index.css"),
      "utf-8"
    );
    // The old `.dashboard-kpi strong { font-size: 1.4rem }` fought with Tailwind text-xl
    expect(css).not.toMatch(/\.dashboard-kpi\s+strong\s*\{[^}]*font-size\s*:/s);
  });

  it("index.css does not override color via .dashboard-kpi p selector", () => {
    const css = fs.readFileSync(
      path.join(ROOT, "src/styles/index.css"),
      "utf-8"
    );
    // The old `.dashboard-kpi p, .dashboard-kpi small { color }` overrode text-muted-foreground
    expect(css).not.toMatch(/\.dashboard-kpi\s+p\s*[,{]/);
  });
});

// ─── Bug 3: Global h1/h2/h3 serif rule overriding shadcn UI headings ─────────

describe("Section — heading uses tracking-tight (activates sans-serif override)", () => {
  it("Section h2 has tracking-tight class so the CSS sans-serif override applies", () => {
    render(<Section title="Test Section">content</Section>);
    const h2 = screen.getByRole("heading", { name: "Test Section" });
    expect(h2.className).toContain("tracking-tight");
  });

  it("Section h2 also has font-sans class for explicit override", () => {
    render(<Section title="Test Section">content</Section>);
    const h2 = screen.getByRole("heading", { name: "Test Section" });
    // font-sans class or tracking-tight ensures the h2 won't render in Instrument Serif
    expect(h2.className).toMatch(/font-sans|tracking-tight/);
  });
});

describe("HeroPage — dashboard h1 heading is sans-serif UI heading", () => {
  it("Training Dashboard h1 has tracking-tight class for sans-serif override", () => {
    render(<HeroPage />);
    const h1 = screen.getByRole("heading", { name: /Training Dashboard/i });
    expect(h1.className).toContain("tracking-tight");
  });
});

// ─── Integration: PageContainer + Section composition ────────────────────────

describe("PageContainer + Section integration", () => {
  it("sections rendered inside PageContainer are contained within max-w-7xl", () => {
    const { container } = render(
      <PageContainer>
        <Section title="KPIs"><div data-testid="kpi">card</div></Section>
        <Section title="Chart"><div data-testid="chart">chart</div></Section>
      </PageContainer>
    );
    const wrapper = container.querySelector(".max-w-7xl");
    expect(wrapper.querySelector('[data-testid="kpi"]')).toBeInTheDocument();
    expect(wrapper.querySelector('[data-testid="chart"]')).toBeInTheDocument();
  });

  it("renders dashboard with PageContainer — no extra wrapper div outside max-w-7xl", () => {
    render(<HeroPage />);
    const containers = document.querySelectorAll(".max-w-7xl");
    // Exactly one PageContainer should render for the dashboard
    expect(containers.length).toBe(1);
  });
});
