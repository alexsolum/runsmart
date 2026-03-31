import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const useDraggableMock = vi.fn(() => ({
  attributes: {},
  listeners: {},
  setNodeRef: vi.fn(),
  isDragging: false,
}));

vi.mock("@dnd-kit/core", () => ({
  useDraggable: (...args) => useDraggableMock(...args),
}));

import { PlanWorkoutCard } from "../../src/components/planner/PlanWorkoutCard";

describe("PlanWorkoutCard", () => {
  it("passes the source day into draggable metadata", () => {
    render(
      <PlanWorkoutCard
        workout={{ id: "w1", type: "easy", name: "Easy Run" }}
        dayDate="2026-05-04"
      />
    );

    expect(screen.getByRole("button", { name: /easy run/i })).toBeInTheDocument();
    expect(useDraggableMock).toHaveBeenCalledWith(expect.objectContaining({
      id: "w1",
      data: expect.objectContaining({
        dayDate: "2026-05-04",
      }),
    }));
  });
});
