/**
 * Dashboard layout smoke tests (control-center redesign)
 *
 * Verifies the new Norwegian dashboard canvas renders all expected panels
 * and shows appropriate empty-state hints when data is absent.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
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

describe("Dashboard layout — hero panels", () => {
  it("renders the readiness panel heading", () => {
    render(<IntelligencePage />);
    expect(screen.getByText("Beredskap")).toBeInTheDocument();
  });

  it("renders the today's-workout panel with 'I DAG' label", () => {
    render(<IntelligencePage />);
    expect(screen.getAllByText("I DAG").length).toBeGreaterThan(0);
  });
});

describe("Dashboard layout — phase ribbon", () => {
  it("renders the Sesongplan panel heading", () => {
    render(<IntelligencePage />);
    expect(screen.getByText(/SESONGPLAN/i)).toBeInTheDocument();
  });
});

describe("Dashboard layout — season plan card", () => {
  it("renders the race title", () => {
    render(<IntelligencePage />);
    expect(screen.getByText(/Stockholm Marathon/i)).toBeInTheDocument();
  });
});

describe("Dashboard layout — readiness rows", () => {
  it("renders the six readiness vitals", () => {
    render(<IntelligencePage />);
    expect(screen.getByText("Form (CTL)")).toBeInTheDocument();
    expect(screen.getByText("Tretthet")).toBeInTheDocument();
    expect(screen.getByText("Søvn 7d")).toBeInTheDocument();
  });
});

describe("Dashboard layout — segmented switch", () => {
  it("renders Faser/Uker/Dager controls", () => {
    render(<IntelligencePage />);
    expect(screen.getByText("Faser")).toBeInTheDocument();
    expect(screen.getByText("Uker")).toBeInTheDocument();
    expect(screen.getByText("Dager")).toBeInTheDocument();
  });
});

describe("Dashboard layout — empty states", () => {
  it("shows empty-state hint in readiness when no activities", () => {
    useAppData.mockReturnValue(makeAppData({
      activities: { activities: [], loading: false, error: null, loadActivities: vi.fn() },
    }));
    render(<IntelligencePage />);
    expect(screen.getAllByText(/Koble Strava i Data/i).length).toBeGreaterThan(0);
  });
});
