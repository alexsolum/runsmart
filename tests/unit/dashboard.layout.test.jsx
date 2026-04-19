/**
 * Dashboard layout smoke tests (control-center redesign)
 *
 * Verifies the new Norwegian dashboard canvas renders all expected panels
 * and shows appropriate empty-state hints when data is absent.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import HeroPage from "../../src/pages/HeroPage";
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
    render(<HeroPage />);
    expect(screen.getByText("Beredskap")).toBeInTheDocument();
  });

  it("renders the today's-workout panel with 'I dag' label", () => {
    render(<HeroPage />);
    expect(screen.getAllByText("I dag").length).toBeGreaterThan(0);
  });
});

describe("Dashboard layout — phase ribbon", () => {
  it("renders the Sesongplan panel heading", () => {
    render(<HeroPage />);
    expect(screen.getByText(/Sesongplan/i)).toBeInTheDocument();
  });
});

describe("Dashboard layout — weekly progression", () => {
  it("renders the Ukens progresjon panel", () => {
    render(<HeroPage />);
    expect(screen.getByText("Ukens progresjon")).toBeInTheDocument();
  });
});

describe("Dashboard layout — race countdown", () => {
  it("renders an A-løp label", () => {
    render(<HeroPage />);
    expect(screen.getAllByText(/A-løp/i).length).toBeGreaterThan(0);
  });
});

describe("Dashboard layout — fitness & efficiency panels", () => {
  it("renders the Formkurve panel", () => {
    render(<HeroPage />);
    expect(screen.getByText(/Formkurve/i)).toBeInTheDocument();
  });

  it("renders the Aerob effektivitet panel", () => {
    render(<HeroPage />);
    expect(screen.getByText("Aerob effektivitet")).toBeInTheDocument();
  });
});

describe("Dashboard layout — activity & upcoming panels", () => {
  it("renders the Aktivitet (recent activities) panel", () => {
    render(<HeroPage />);
    expect(screen.getByText("Aktivitet")).toBeInTheDocument();
  });

  it("renders the Kommende økter (up-next) panel", () => {
    render(<HeroPage />);
    expect(screen.getByText("Kommende økter")).toBeInTheDocument();
  });
});

describe("Dashboard layout — empty states", () => {
  it("shows empty-state hint in readiness when no activities", () => {
    useAppData.mockReturnValue(makeAppData({
      activities: { activities: [], loading: false, error: null, loadActivities: vi.fn() },
    }));
    render(<HeroPage />);
    expect(screen.getAllByText(/Koble Strava i Data/i).length).toBeGreaterThan(0);
  });
});
