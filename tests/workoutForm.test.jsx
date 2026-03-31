/* @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { WorkoutForm } from "../src/components/planner/WorkoutForm";

vi.mock("../src/context/AppDataContext", () => ({
  useAppData: vi.fn(),
}));

import { useAppData } from "../src/context/AppDataContext";

function todayIso() {
  return new Date().toISOString().split("T")[0];
}

describe("WorkoutForm", () => {
  beforeEach(() => {
    useAppData.mockReturnValue({});
  });

  it("renders all required form fields", () => {
    render(<WorkoutForm mode="create" onSubmit={vi.fn()} onCancel={vi.fn()} />);

    expect(screen.getByLabelText(/Type/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Date/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Distance/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Duration/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Description/i)).toBeInTheDocument();
  });

  it("uses create defaults", () => {
    render(<WorkoutForm mode="create" onSubmit={vi.fn()} onCancel={vi.fn()} />);

    expect(screen.getByLabelText(/Type/i)).toHaveValue("EASY");
    expect(screen.getByLabelText(/Date/i)).toHaveValue(todayIso());
  });

  it("pre-fills edit mode from entry", () => {
    render(
      <WorkoutForm
        mode="edit"
        entry={{
          id: "e1",
          workout_type: "TEMPO",
          workout_date: "2026-04-02",
          distance_km: 12,
          duration_min: 55,
          description: "Tempo set",
        }}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    expect(screen.getByLabelText(/Type/i)).toHaveValue("TEMPO");
    expect(screen.getByLabelText(/Date/i)).toHaveValue("2026-04-02");
    expect(screen.getByLabelText(/Distance/i)).toHaveValue(12);
    expect(screen.getByLabelText(/Duration/i)).toHaveValue(55);
    expect(screen.getByLabelText(/Description/i)).toHaveValue("Tempo set");
  });

  it("shows emoji labels in type options", () => {
    render(<WorkoutForm mode="create" onSubmit={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByRole("option", { name: "🏃 Easy Run" })).toBeInTheDocument();
  });

  it("submits normalized payload shape", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(<WorkoutForm mode="create" onSubmit={onSubmit} onCancel={vi.fn()} />);

    await user.selectOptions(screen.getByLabelText(/Type/i), "INTERVALS");
    await user.clear(screen.getByLabelText(/Date/i));
    await user.type(screen.getByLabelText(/Date/i), "2026-04-01");
    await user.type(screen.getByLabelText(/Distance/i), "14.5");
    await user.type(screen.getByLabelText(/Duration/i), "64");
    await user.type(screen.getByLabelText(/Description/i), "Session notes");
    await user.click(screen.getByRole("button", { name: /Lagre/i }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        workout_type: "INTERVALS",
        workout_date: "2026-04-01",
        distance_km: 14.5,
        duration_min: 64,
        description: "Session notes",
      })
    );
  });

  it("calls onDelete in edit mode after confirmation", async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();

    render(
      <WorkoutForm
        mode="edit"
        entry={{ id: "entry-9", workout_type: "EASY", workout_date: "2026-04-01" }}
        onSubmit={vi.fn()}
        onDelete={onDelete}
        onCancel={vi.fn()}
      />
    );

    await user.click(screen.getByRole("button", { name: /Delete workout/i }));
    await user.click(screen.getByRole("button", { name: /Bekreft/i }));

    expect(onDelete).toHaveBeenCalledWith("entry-9");
  });

  it("prefills date from entry.workout_date in create mode", () => {
    render(
      <WorkoutForm
        mode="create"
        entry={{ workout_date: "2026-05-15" }}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    expect(screen.getByLabelText(/Date/i)).toHaveValue("2026-05-15");
  });

  it("renders completed checkbox in edit mode", () => {
    render(
      <WorkoutForm
        mode="edit"
        entry={{
          id: "e2",
          workout_type: "EASY",
          workout_date: "2026-04-10",
          completed: true,
        }}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    expect(screen.getByText("Fullfort")).toBeInTheDocument();
    const checkbox = screen.getByRole("checkbox");
    expect(checkbox).toBeChecked();
  });

  it("includes completed in submit payload from edit mode", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(
      <WorkoutForm
        mode="edit"
        entry={{
          id: "e3",
          workout_type: "EASY",
          workout_date: "2026-04-10",
          completed: false,
        }}
        onSubmit={onSubmit}
        onCancel={vi.fn()}
      />
    );

    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: /Lagre/i }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        completed: true,
      })
    );
  });
});
