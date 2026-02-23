/**
 * Daily Log page tests
 *
 * Verifies:
 * - The form schema (date, form/feeling, workout, reflection fields)
 * - The save action creates an entry and shows it in the history table
 * - Previous log entries are listed
 *
 * NOTE: The current implementation persists logs to localStorage.
 * The intended behaviour is to save to the Supabase `daily_logs` table.
 * Once that integration is added, these tests should be updated to mock
 * the Supabase client and assert that `insert()` is called with the correct
 * payload.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DailyLogPage from "../src/pages/DailyLogPage";

// DailyLogPage uses window.localStorage directly (no context needed)
let localStorageStore = {};

beforeEach(() => {
  localStorageStore = {};
  vi.stubGlobal("localStorage", {
    getItem: (key) => localStorageStore[key] ?? null,
    setItem: (key, value) => { localStorageStore[key] = value; },
    removeItem: (key) => { delete localStorageStore[key]; },
    clear: () => { localStorageStore = {}; },
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Daily Log — form schema", () => {
  beforeEach(() => {
    render(<DailyLogPage />);
  });

  it("renders the page heading", () => {
    expect(screen.getByRole("heading", { name: /Daily log/i })).toBeInTheDocument();
  });

  it("has a date input field", () => {
    expect(document.querySelector('input[name="date"][type="date"]')).toBeInTheDocument();
  });

  it("has a 'Current form' select with Great/Good/Okay/Flat/Fatigued options", () => {
    const formSelect = document.querySelector('select[name="form"]');
    expect(formSelect).toBeInTheDocument();
    const options = Array.from(formSelect.options).map((o) => o.value);
    expect(options).toContain("great");
    expect(options).toContain("good");
    expect(options).toContain("okay");
    expect(options).toContain("flat");
    expect(options).toContain("fatigued");
  });

  it("has a 'Workout completed' text input", () => {
    const workoutInput = document.querySelector('input[name="workout"]');
    expect(workoutInput).toBeInTheDocument();
  });

  it("has a 'How did it go?' textarea", () => {
    const reflectionArea = document.querySelector('textarea[name="reflection"]');
    expect(reflectionArea).toBeInTheDocument();
  });

  it("has a Save button", () => {
    expect(screen.getByRole("button", { name: /Save daily log/i })).toBeInTheDocument();
  });
});

describe("Daily Log — form validation", () => {
  it("Save button is disabled when workout and reflection are empty", () => {
    render(<DailyLogPage />);
    expect(screen.getByRole("button", { name: /Save daily log/i })).toBeDisabled();
  });

  it("Save button is disabled when only workout is filled", async () => {
    const user = userEvent.setup();
    render(<DailyLogPage />);

    await user.type(document.querySelector('input[name="workout"]'), "10km easy");
    expect(screen.getByRole("button", { name: /Save daily log/i })).toBeDisabled();
  });

  it("Save button becomes enabled when both workout and reflection are filled", async () => {
    const user = userEvent.setup();
    render(<DailyLogPage />);

    await user.type(document.querySelector('input[name="workout"]'), "10km easy");
    await user.type(document.querySelector('textarea[name="reflection"]'), "Felt good");
    expect(screen.getByRole("button", { name: /Save daily log/i })).toBeEnabled();
  });
});

describe("Daily Log — saving an entry", () => {
  it("adds entry to the history list after form submission", async () => {
    const user = userEvent.setup();
    render(<DailyLogPage />);

    await user.type(document.querySelector('input[name="workout"]'), "Easy 10km");
    await user.type(document.querySelector('textarea[name="reflection"]'), "Legs felt fresh");
    await user.click(screen.getByRole("button", { name: /Save daily log/i }));

    const history = screen.getByRole("region", { name: /Recent daily logs/i });
    expect(within(history).getByText("Easy 10km")).toBeInTheDocument();
    expect(within(history).getByText("Legs felt fresh")).toBeInTheDocument();
  });

  it("shows 'Daily log saved.' confirmation message after save", async () => {
    const user = userEvent.setup();
    render(<DailyLogPage />);

    await user.type(document.querySelector('input[name="workout"]'), "Tempo run");
    await user.type(document.querySelector('textarea[name="reflection"]'), "Hard but controlled");
    await user.click(screen.getByRole("button", { name: /Save daily log/i }));

    expect(screen.getByRole("status")).toHaveTextContent("Daily log saved.");
  });

  it("clears workout and reflection fields after save", async () => {
    const user = userEvent.setup();
    render(<DailyLogPage />);

    const workoutInput = document.querySelector('input[name="workout"]');
    const reflectionArea = document.querySelector('textarea[name="reflection"]');

    await user.type(workoutInput, "Long run 22km");
    await user.type(reflectionArea, "Solid effort");
    await user.click(screen.getByRole("button", { name: /Save daily log/i }));

    expect(workoutInput.value).toBe("");
    expect(reflectionArea.value).toBe("");
  });

  it("persists entry to localStorage", async () => {
    const user = userEvent.setup();
    render(<DailyLogPage />);

    await user.type(document.querySelector('input[name="workout"]'), "Recovery jog");
    await user.type(document.querySelector('textarea[name="reflection"]'), "Easy pace, just moving");
    await user.click(screen.getByRole("button", { name: /Save daily log/i }));

    const stored = JSON.parse(localStorageStore["runsmart.dailyLogs"] ?? "[]");
    expect(stored.length).toBe(1);
    expect(stored[0].workout).toBe("Recovery jog");
    expect(stored[0].reflection).toBe("Easy pace, just moving");
  });

  it("shows the form label (e.g. 'good') on the saved entry card", async () => {
    const user = userEvent.setup();
    render(<DailyLogPage />);

    // Default form value is "good"
    await user.type(document.querySelector('input[name="workout"]'), "Track session");
    await user.type(document.querySelector('textarea[name="reflection"]'), "Nailed the intervals");
    await user.click(screen.getByRole("button", { name: /Save daily log/i }));

    const history = screen.getByRole("region", { name: /Recent daily logs/i });
    expect(within(history).getByText("good")).toBeInTheDocument();
  });
});

describe("Daily Log — history table", () => {
  it("shows 'No entries yet' placeholder when there are no logs", () => {
    render(<DailyLogPage />);
    expect(screen.getByText(/No entries yet/i)).toBeInTheDocument();
  });

  it("loads and displays previously saved entries from localStorage on mount", () => {
    const existingLogs = [
      {
        id: "log-old-1",
        date: "2026-02-20",
        form: "flat",
        workout: "Hilly 8km",
        reflection: "Quads were sore",
        createdAt: new Date().toISOString(),
      },
    ];
    localStorageStore["runsmart.dailyLogs"] = JSON.stringify(existingLogs);

    render(<DailyLogPage />);
    expect(screen.getByText("Hilly 8km")).toBeInTheDocument();
    expect(screen.getByText("Quads were sore")).toBeInTheDocument();
    expect(screen.getByText("flat")).toBeInTheDocument();
  });

  it("keeps only the 14 most recent entries", async () => {
    // Pre-fill 14 entries
    const oldLogs = Array.from({ length: 14 }, (_, i) => ({
      id: `log-${i}`,
      date: "2026-01-01",
      form: "good",
      workout: `Workout ${i}`,
      reflection: `Reflection ${i}`,
      createdAt: new Date().toISOString(),
    }));
    localStorageStore["runsmart.dailyLogs"] = JSON.stringify(oldLogs);

    const user = userEvent.setup();
    render(<DailyLogPage />);

    // Add one more entry — should push the oldest out
    await user.type(document.querySelector('input[name="workout"]'), "New entry");
    await user.type(document.querySelector('textarea[name="reflection"]'), "Fresh legs");
    await user.click(screen.getByRole("button", { name: /Save daily log/i }));

    const stored = JSON.parse(localStorageStore["runsmart.dailyLogs"] ?? "[]");
    expect(stored.length).toBe(14);
    expect(stored[0].workout).toBe("New entry");
  });
});
