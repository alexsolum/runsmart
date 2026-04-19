import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import LongTermPlanPage from "../../src/pages/LongTermPlanPage";
import { makeAppData } from "./mockAppData";
import { generateCoachingInsights } from "../../src/domain/compute";

vi.mock("../../src/context/AppDataContext", () => ({
  useAppData: vi.fn(),
}));

vi.mock("../../src/domain/compute", () => ({
  generateCoachingInsights: vi.fn(),
}));

import { useAppData } from "../../src/context/AppDataContext";

function makeEmptyAppData() {
  const base = makeAppData();
  return makeAppData({
    activities: {
      ...base.activities,
      activities: [],
    },
    checkins: {
      ...base.checkins,
      checkins: [],
    },
    plans: {
      ...base.plans,
      plans: [],
    },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  useAppData.mockReturnValue(makeAppData());
  generateCoachingInsights.mockReturnValue([]);
});

describe("LongTermPlanPage", () => {
  it("renders the current day with an I DAG badge in the default week grid", () => {
    render(<LongTermPlanPage />);

    const currentWeek = screen.getByTestId("plan-current-week");
    expect(within(currentWeek).getByText("I DAG")).toBeInTheDocument();
  });

  it("renders exactly four upcoming week rows in the default right rail", () => {
    render(<LongTermPlanPage />);

    const nextFourWeeks = screen.getByTestId("plan-next-four-weeks");
    expect(within(nextFourWeeks).getAllByTestId("plan-next-week-row")).toHaveLength(4);
  });

  it("renders AI coach notes when non-generic insights are available", () => {
    generateCoachingInsights.mockReturnValue([
      {
        type: "warning",
        titleKey: "coach.deepFatigue",
        descKey: "coach.deepFatigueDesc",
        priority: 2,
      },
    ]);

    render(<LongTermPlanPage />);

    expect(screen.getByTestId("plan-ai-notes")).toBeInTheDocument();
    expect(screen.getByText("Deep fatigue accumulation")).toBeInTheDocument();
  });

  it("hides AI coach notes when there is no meaningful training context", () => {
    generateCoachingInsights.mockReturnValue([]);
    useAppData.mockReturnValue(makeEmptyAppData());

    render(<LongTermPlanPage />);

    expect(screen.getByTestId("plan-current-week")).toBeInTheDocument();
    expect(screen.queryByTestId("plan-ai-notes")).toBeNull();
    expect(screen.queryByText("Deep fatigue accumulation")).toBeNull();
  });

  it("switches to Sesong and mounts the existing season plan viewer", () => {
    render(<LongTermPlanPage />);

    fireEvent.click(screen.getByRole("button", { name: "Sesong" }));

    expect(screen.getByTestId("plan-season-view")).toBeInTheDocument();
    expect(screen.getByTestId("week-card-1")).toBeInTheDocument();
  });
});
