import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

vi.mock("../../src/context/AppDataContext", () => ({
  useAppData: vi.fn(),
}));

import { useAppData } from "../../src/context/AppDataContext";
import { PLANNER_ENTRIES, PLANNER_CONSTRAINT_ENTRY, makeAppData } from "./mockAppData";
import { WorkoutCard } from "../../src/components/planner/WorkoutCard";
import { RaceCard } from "../../src/components/planner/RaceCard";
import { RestCard } from "../../src/components/planner/RestCard";
import { ConstraintMarker } from "../../src/components/planner/ConstraintMarker";
import { DayCell } from "../../src/components/planner/DayCell";
import { StackedBar } from "../../src/components/planner/StackedBar";
import { StatusDot } from "../../src/components/planner/StatusDot";
import { LoadColumn } from "../../src/components/planner/LoadColumn";
import { WeekRow } from "../../src/components/planner/WeekRow";
import { FourWeekGrid } from "../../src/components/planner/FourWeekGrid";
import { MobileDayPanel } from "../../src/components/planner/MobileDayPanel";
import { MobileLoadSummary } from "../../src/components/planner/MobileLoadSummary";
import { MobileWeekStrip } from "../../src/components/planner/MobileWeekStrip";
import { currentMondayIso, formatDayLabel, isoDateOffset, todayIso } from "../../src/lib/dateUtils";

describe("FourWeekGrid", () => {
  beforeEach(() => {
    useAppData.mockReturnValue(makeAppData());
  });

  it("uses planner fixture coverage for future component wiring", () => {
    render(<div data-testid="planner-grid-fixture-ready" />);

    expect(screen.getByTestId("planner-grid-fixture-ready")).toBeInTheDocument();
    expect(Array.isArray(PLANNER_ENTRIES)).toBe(true);
    expect(PLANNER_ENTRIES).toHaveLength(8);
    expect(PLANNER_CONSTRAINT_ENTRY.workout_type).toBe("Constraint");
  });

  it("GRID-01: renders 4 WeekRow components", () => {
    const loadEntriesForRange = vi.fn().mockResolvedValue([]);
    const { container } = render(
      <FourWeekGrid
        entries={PLANNER_ENTRIES}
        loading={false}
        loadEntriesForRange={loadEntriesForRange}
        planId="plan-1"
        blocks={[]}
      />,
    );

    expect(container.querySelectorAll(".grid-cols-12")).toHaveLength(4);
  });

  it("loads the full 28-day range once on mount", () => {
    const loadEntriesForRange = vi.fn().mockResolvedValue([]);
    const startMonday = currentMondayIso();
    const endIso = isoDateOffset(startMonday, 27);

    render(
      <FourWeekGrid
        entries={PLANNER_ENTRIES}
        loading={false}
        loadEntriesForRange={loadEntriesForRange}
        planId="plan-1"
        blocks={[]}
      />,
    );

    expect(loadEntriesForRange).toHaveBeenCalledTimes(1);
    expect(loadEntriesForRange).toHaveBeenCalledWith("plan-1", startMonday, endIso);
  });
});

describe("DayCell", () => {
  it("GRID-02: displays date label in D. MON format", () => {
    const isoDate = "2026-03-23";
    render(<DayCell isoDate={isoDate} entries={[]} />);
    expect(screen.getByText(formatDayLabel(isoDate))).toBeInTheDocument();
  });

  it("highlights today's cell with ring-2", () => {
    const { container } = render(<DayCell isoDate={todayIso()} entries={[]} />);
    expect(container.querySelector(".ring-2")).toBeInTheDocument();
  });

  it("routes REST and RACE_EVENT entries to their dedicated cards", () => {
    render(
      <DayCell
        isoDate="2026-03-25"
        entries={[
          {
            id: "day-rest",
            workout_type: "Rest",
            description: null,
          },
          {
            id: "day-race",
            workout_type: "Race / Event",
            description: "Oslo Marathon",
          },
        ]}
      />,
    );

    expect(screen.getByText("Hviledag")).toBeInTheDocument();
    expect(screen.getByLabelText("Race")).toBeInTheDocument();
  });

  it("GRID-04: shows dashed border and marker when a constraint entry exists", () => {
    const { container } = render(<DayCell isoDate="2026-03-24" entries={[PLANNER_CONSTRAINT_ENTRY]} />);
    const cell = container.querySelector("article");

    expect(screen.getByLabelText("Constraint")).toBeInTheDocument();
    const style = cell?.getAttribute("style") ?? "";
    expect(style).toContain("border-style: dashed");
    expect(style).toContain("border-width: 1px");
    expect(style).toContain("border-color: var(--pa-outline)");
  });

  it("GRID-04: renders workout and constraint marker together", () => {
    render(
      <DayCell
        isoDate="2026-03-24"
        entries={[
          {
            id: "day-tempo",
            workout_type: "Tempo",
            description: "3 x 10 min threshold",
          },
          PLANNER_CONSTRAINT_ENTRY,
        ]}
      />,
    );

    expect(screen.getByText("3 x 10 min threshold")).toBeInTheDocument();
    expect(screen.getByLabelText("Constraint")).toBeInTheDocument();
  });

  it("does not show dashed border when unconstrained", () => {
    const { container } = render(
      <DayCell
        isoDate="2026-03-24"
        entries={[
          {
            id: "day-tempo",
            workout_type: "Tempo",
            description: "Tempo Run",
          },
        ]}
      />,
    );
    const cell = container.querySelector("article");
    const style = cell?.getAttribute("style") ?? "";
    expect(style).not.toContain("border-style: dashed");
  });

  it("shows add affordance when day cell is empty and unconstrained", () => {
    render(<DayCell isoDate="2026-03-26" entries={[]} />);
    expect(screen.getByLabelText("Legg til okt")).toBeInTheDocument();
  });
});

describe("StackedBar", () => {
  it("renders proportional segments with workout-type tokens", () => {
    const { container } = render(
      <StackedBar distribution={{ hard: 40, easy: 30, endurance: 20, other: 10 }} />,
    );
    const styles = container.innerHTML;
    expect(styles).toContain("var(--pa-type-hard)");
    expect(styles).toContain("var(--pa-type-easy)");
    expect(styles).toContain("var(--pa-type-endurance)");
    expect(styles).toContain("var(--pa-type-other)");
  });
});

describe("StatusDot", () => {
  it("uses endurance color for on-target", () => {
    render(<StatusDot status="on-target" />);
    const dot = screen.getByLabelText("Load status");
    expect(dot.getAttribute("style") ?? "").toContain("var(--pa-type-endurance)");
  });

  it("uses hard color for over-target", () => {
    render(<StatusDot status="over-target" />);
    const dot = screen.getByLabelText("Load status");
    expect(dot.getAttribute("style") ?? "").toContain("var(--pa-type-hard)");
  });
});

describe("LoadColumn", () => {
  it("shows dash when weekly stats are empty", () => {
    render(
      <LoadColumn
        stats={{
          totalKm: 0,
          totalHours: 0,
          zoneDistribution: { hard: 0, easy: 0, endurance: 0, other: 0 },
          status: "on-target",
        }}
      />,
    );
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("shows km, time and status dot when populated", () => {
    render(
      <LoadColumn
        stats={{
          totalKm: 32.4,
          totalHours: 2.5,
          zoneDistribution: { hard: 40, easy: 30, endurance: 20, other: 10 },
          status: "over-target",
        }}
      />,
    );
    expect(screen.getByText("32.4 km")).toBeInTheDocument();
    expect(screen.getByText("2h 30m")).toBeInTheDocument();
    expect(screen.getByLabelText("Load status")).toBeInTheDocument();
  });
});

describe("WeekRow", () => {
  it("renders grid-cols-12 layout with day cells and load column", () => {
    const { container } = render(
      <WeekRow
        weekStartIso="2026-03-23"
        entries={PLANNER_ENTRIES}
        targetKm={60}
      />,
    );
    expect(container.querySelector(".grid-cols-12")).toBeInTheDocument();
  });
});

describe("WorkoutCard", () => {
  it("GRID-03: shows workout type label and token-driven styles for intensity", () => {
    render(<WorkoutCard entry={PLANNER_ENTRIES[1]} />);

    expect(screen.getByText("Intervals")).toBeInTheDocument();
    const style = screen.getByText("Intervals").parentElement?.getAttribute("style") ?? "";
    expect(style).toContain("var(--pa-type-hard-container)");
    expect(style).toContain("3px solid var(--pa-type-hard)");
  });

  it("GRID-03: renders only type label when description is missing", () => {
    render(
      <WorkoutCard
        entry={{
          id: "test-no-description",
          workout_type: "Recovery",
          description: "",
        }}
      />,
    );

    expect(screen.getByText("Recovery Run")).toBeInTheDocument();
    expect(screen.queryByText("Slow recovery jog")).not.toBeInTheDocument();
  });
});

describe("RaceCard", () => {
  it("GRID-05: renders trophy icon and entry description", () => {
    render(<RaceCard entry={PLANNER_ENTRIES[7]} />);
    expect(screen.getByLabelText("Race")).toBeInTheDocument();
    expect(screen.getByText("Oslo Marathon")).toBeInTheDocument();
  });
});

describe("RestCard", () => {
  it("GRID-06: renders Hviledag label", () => {
    render(<RestCard />);
    expect(screen.getByText("Hviledag")).toBeInTheDocument();
  });
});

describe("MobileWeekStrip", () => {
  it("renders week label and seven day tabs", () => {
    const weekStart = "2026-03-23";
    const { container } = render(
      <MobileWeekStrip
        weekStart={weekStart}
        selectedDay={weekStart}
        onSelectDay={vi.fn()}
        onPrev={vi.fn()}
        onNext={vi.fn()}
      />,
    );

    expect(screen.getByText(/^Uke \d+$/)).toBeInTheDocument();
    const dayButtons = container.querySelectorAll("button[style*='min-height: 44px']");
    expect(dayButtons).toHaveLength(7);
  });

  it("calls onSelectDay when a day tab is pressed", () => {
    const onSelectDay = vi.fn();
    render(
      <MobileWeekStrip
        weekStart="2026-03-23"
        selectedDay="2026-03-23"
        onSelectDay={onSelectDay}
        onPrev={vi.fn()}
        onNext={vi.fn()}
      />,
    );

    const dayButton = screen.getAllByRole("button")[2];
    fireEvent.click(dayButton);
    expect(onSelectDay).toHaveBeenCalled();
  });
});

describe("MobileDayPanel", () => {
  it("renders workout entries with shared card primitives", () => {
    render(
      <MobileDayPanel
        isoDate="2026-03-24"
        entries={[
          {
            id: "mobile-tempo",
            workout_type: "Tempo",
            description: "3 x 10 min threshold",
          },
        ]}
      />,
    );

    expect(screen.getByText("Tempo Run")).toBeInTheDocument();
  });

  it("renders empty state copy when selected day has no entries", () => {
    render(<MobileDayPanel isoDate="2026-03-24" entries={[]} />);
    expect(screen.getByText("Ingen okter planlagt")).toBeInTheDocument();
  });
});

describe("MobileLoadSummary", () => {
  it("renders dash when week is empty", () => {
    render(<MobileLoadSummary entries={[]} targetKm={50} />);
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("renders compact km and time label when week has workouts", () => {
    render(
      <MobileLoadSummary
        entries={[
          {
            id: "mobile-load-easy",
            workout_type: "Easy",
            distance_km: 10,
            duration_min: 60,
          },
        ]}
        targetKm={40}
      />,
    );

    expect(screen.getByText(/km ·/)).toBeInTheDocument();
  });
});
