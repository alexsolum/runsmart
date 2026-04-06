import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { PlanIntakeModal } from "../../src/components/PlanIntakeModal";
import { makeAppData } from "./mockAppData";

vi.mock("../../src/context/AppDataContext", () => ({
  useAppData: vi.fn(),
}));

vi.mock("../../src/lib/supabaseClient", () => ({
  getSupabaseClient: vi.fn(),
}));

import { useAppData } from "../../src/context/AppDataContext";

describe("PlanIntakeModal", () => {
  let appData;

  beforeEach(() => {
    vi.clearAllMocks();
    appData = makeAppData({
      hierarchicalPlan: {
        ...makeAppData().hierarchicalPlan,
        plan: null,
        startPlanSession: vi.fn().mockResolvedValue({
          sessionId: "session-123",
          question: "What is your target time goal for this race?",
          planGenerated: false,
        }),
      },
    });

    useAppData.mockImplementation(() => appData);
  });

  it("keeps step 3 visible when app data refreshes after the first coach question arrives", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();

    const { rerender } = render(<PlanIntakeModal open onOpenChange={onOpenChange} />);

    await user.type(screen.getByLabelText(/Race Date/i), "2026-09-12");
    await user.click(screen.getByRole("combobox", { name: /Goal Distance/i }));
    await user.click(screen.getByRole("option", { name: "Marathon" }));
    await user.click(screen.getByRole("button", { name: /Next →/i }));

    await user.clear(screen.getByLabelText(/Current Weekly km/i));
    await user.type(screen.getByLabelText(/Current Weekly km/i), "105");
    await user.type(screen.getByLabelText(/Running Background/i), "Experienced ultra runner");
    await user.click(screen.getByRole("button", { name: /Next →/i }));

    expect(await screen.findByRole("heading", { name: /A few questions first/i })).toBeInTheDocument();
    expect(screen.getByText("What is your target time goal for this race?")).toBeInTheDocument();

    appData = makeAppData({
      activities: {
        ...appData.activities,
        activities: [...appData.activities.activities],
      },
      runnerProfile: {
        ...appData.runnerProfile,
        background: "Updated profile background",
      },
      workoutEntries: {
        ...appData.workoutEntries,
        entries: [...appData.workoutEntries.entries],
      },
      hierarchicalPlan: appData.hierarchicalPlan,
    });

    rerender(<PlanIntakeModal open onOpenChange={onOpenChange} />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /A few questions first/i })).toBeInTheDocument();
    });
    expect(screen.getByText("What is your target time goal for this race?")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /Step 1 of 3/i })).not.toBeInTheDocument();
  });
});
