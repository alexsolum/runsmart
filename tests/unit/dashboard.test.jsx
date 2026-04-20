/**
 * PR#1 Dashboard — IntelligencePage rewrite
 *
 * Verifies that IntelligencePage renders the three PDF page-1 sections:
 *   (a) HeroToday   — dark navy hero with weather pill + target grid
 *   (b) ReadinessPanel — score + /100 + 6 vital rows
 *   (c) SeasonPlanCard — eyebrow, race title, phase ribbon, 4-KPI strip
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import IntelligencePage from "../../src/pages/IntelligencePage";
import { makeAppData } from "./mockAppData";

vi.mock("../../src/context/AppDataContext", () => ({
  useAppData: vi.fn(),
}));

import { useAppData } from "../../src/context/AppDataContext";

beforeEach(() => {
  vi.clearAllMocks();
  useAppData.mockReturnValue(makeAppData());
});

// ── HeroToday ────────────────────────────────────────────────────────────────
describe("IntelligencePage — HeroToday", () => {
  it("renders the I DAG eyebrow in uppercase", () => {
    const { container } = render(<IntelligencePage />);
    const today = container.querySelector(".today");
    expect(today).toBeInTheDocument();
    expect(within(today).getByText("I DAG")).toBeInTheDocument();
  });

  it("renders Generert av Trener attribution top-right", () => {
    render(<IntelligencePage />);
    expect(screen.getByText(/Generert av Trener/i)).toBeInTheDocument();
  });

  it("renders a weather pill in the hero meta row", () => {
    const { container } = render(<IntelligencePage />);
    expect(container.querySelector(".today .weather-pill")).toBeInTheDocument();
  });

  it("does NOT render the old CTA buttons", () => {
    render(<IntelligencePage />);
    expect(screen.queryByText(/Start økten/i)).toBeNull();
    expect(screen.queryByText(/Flytt til i morgen/i)).toBeNull();
  });

  it("renders uppercase target labels DISTANSE / VARIGHET", () => {
    const { container } = render(<IntelligencePage />);
    const grid = container.querySelector(".today .target-grid");
    expect(grid).toBeInTheDocument();
    expect(within(grid).getByText("DISTANSE")).toBeInTheDocument();
    expect(within(grid).getByText("VARIGHET")).toBeInTheDocument();
  });
});

// ── ReadinessPanel ───────────────────────────────────────────────────────────
describe("IntelligencePage — ReadinessPanel", () => {
  it("renders FORM I DAG eyebrow (uppercase)", () => {
    render(<IntelligencePage />);
    expect(screen.getByText("FORM I DAG")).toBeInTheDocument();
  });

  it("renders Beredskap title + / 100 sub", () => {
    render(<IntelligencePage />);
    expect(screen.getByText("Beredskap")).toBeInTheDocument();
    expect(screen.getByText("/ 100")).toBeInTheDocument();
  });

  it("renders 6 readiness rows in a 2-col grid (no Track bars)", () => {
    const { container } = render(<IntelligencePage />);
    const rows = container.querySelectorAll(".readiness-rows .readiness-row");
    expect(rows.length).toBe(6);
    expect(container.querySelector(".readiness .track")).toBeNull();
  });

  it("shows each expected vital name", () => {
    render(<IntelligencePage />);
    ["Form (CTL)", "Tretthet", "Søvn 7d", "HRV 7d", "RPE 7d", "Hvilepuls"].forEach((name) => {
      expect(screen.getByText(name)).toBeInTheDocument();
    });
  });

  it("renders a KLAR status pill when activities are present", () => {
    const { container } = render(<IntelligencePage />);
    const pill = container.querySelector(".readiness-score .status");
    expect(pill).toBeInTheDocument();
    expect(pill.textContent.toUpperCase()).toMatch(/KLAR|UTMERKET|MODERAT|SLITEN/);
  });
});

// ── SeasonPlanCard ───────────────────────────────────────────────────────────
describe("IntelligencePage — SeasonPlanCard", () => {
  it("renders SESONGPLAN eyebrow with week count", () => {
    render(<IntelligencePage />);
    expect(screen.getByText(/SESONGPLAN · \d+ UKER/)).toBeInTheDocument();
  });

  it("renders the race title in large serif display", () => {
    const { container } = render(<IntelligencePage />);
    const card = container.querySelector(".season-plan");
    expect(card).toBeInTheDocument();
    expect(within(card).getByText(/Stockholm Marathon/i)).toBeInTheDocument();
  });

  it("renders the Faser/Uker/Dager segmented switch with Faser selected", () => {
    const { container } = render(<IntelligencePage />);
    const card = container.querySelector(".season-plan");
    ["Faser", "Uker", "Dager"].forEach((opt) => {
      expect(within(card).getByText(opt)).toBeInTheDocument();
    });
    expect(within(card).getByText("Faser").className).toContain("on");
  });

  it("renders a .gantt with at least one phase bar", () => {
    const { container } = render(<IntelligencePage />);
    const gantt = container.querySelector(".season-plan .gantt");
    expect(gantt).toBeInTheDocument();
    expect(gantt.querySelectorAll(".bar").length).toBeGreaterThan(0);
  });

  it("renders the four bottom KPI labels", () => {
    const { container } = render(<IntelligencePage />);
    const strip = container.querySelector(".season-plan .season-kpis");
    expect(strip).toBeInTheDocument();
    ["DAGER IGJEN", "PLANLAGT KM", "PLANLAGT HØYDE", "KVALITETSØKTER"].forEach((lbl) => {
      expect(within(strip).getByText(lbl)).toBeInTheDocument();
    });
  });
});
