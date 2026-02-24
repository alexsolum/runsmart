/**
 * Daily Log page tests
 *
 * Verifies:
 * - Page structure and form schema
 * - Form fields: log_date, workout_notes, notes, rating inputs
 * - Save calls dailyLogs.saveLog with the correct payload
 * - Confirmation message shown after save
 * - History list renders existing logs
 * - Empty-state placeholder when no logs exist
 *
 * DailyLogPage uses useAppData (Supabase-backed via useDailyLogs).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DailyLogPage from "../src/pages/DailyLogPage";
import { makeAppData } from "./mockAppData";

vi.mock("../src/context/AppDataContext", () => ({
  useAppData: vi.fn(),
}));

import { useAppData } from "../src/context/AppDataContext";

beforeEach(() => {
  vi.clearAllMocks();
  useAppData.mockReturnValue(makeAppData());
});

describe("Daily Log — page structure", () => {
  it("renders the Daily log heading", () => {
    render(<DailyLogPage />);
    expect(screen.getByRole("heading", { name: /Daily log/i })).toBeInTheDocument();
  });

  it("renders the Recent entries heading", () => {
    render(<DailyLogPage />);
    expect(screen.getByRole("heading", { name: /Recent entries/i })).toBeInTheDocument();
  });
});

describe("Daily Log — form schema", () => {
  it("has a date input field named log_date", () => {
    render(<DailyLogPage />);
    expect(document.querySelector('input[name="log_date"][type="date"]')).toBeInTheDocument();
  });

  it("has a workout_notes text input", () => {
    render(<DailyLogPage />);
    expect(document.querySelector('input[name="workout_notes"]')).toBeInTheDocument();
  });

  it("has a notes textarea", () => {
    render(<DailyLogPage />);
    expect(document.querySelector('textarea[name="notes"]')).toBeInTheDocument();
  });

  it("has a sleep_hours number input", () => {
    render(<DailyLogPage />);
    expect(document.querySelector('input[name="sleep_hours"]')).toBeInTheDocument();
  });

  it("has a resting_hr number input", () => {
    render(<DailyLogPage />);
    expect(document.querySelector('input[name="resting_hr"]')).toBeInTheDocument();
  });

  it("has rating groups for training quality, sleep quality, fatigue, mood, and stress", () => {
    render(<DailyLogPage />);
    const ratingGroups = document.querySelectorAll(".rating-group");
    expect(ratingGroups.length).toBeGreaterThanOrEqual(5);
  });

  it("has a Save log button", () => {
    render(<DailyLogPage />);
    expect(screen.getByRole("button", { name: /Save log/i })).toBeInTheDocument();
  });
});

describe("Daily Log — saving an entry", () => {
  it("calls saveLog when the form is submitted", async () => {
    const saveLog = vi.fn().mockResolvedValue({ id: "log-1", log_date: "2026-02-24" });
    useAppData.mockReturnValue(makeAppData({
      dailyLogs: {
        logs: [],
        loading: false,
        error: null,
        loadLogs: vi.fn().mockResolvedValue([]),
        saveLog,
      },
    }));

    const user = userEvent.setup();
    render(<DailyLogPage />);

    await user.type(document.querySelector('input[name="workout_notes"]'), "10km easy");
    await user.click(screen.getByRole("button", { name: /Save log/i }));

    expect(saveLog).toHaveBeenCalledWith(
      expect.objectContaining({ workout_notes: "10km easy" }),
    );
  });

  it("shows 'Log saved.' confirmation after successful save", async () => {
    const saveLog = vi.fn().mockResolvedValue({ id: "log-1", log_date: "2026-02-24" });
    useAppData.mockReturnValue(makeAppData({
      dailyLogs: {
        logs: [],
        loading: false,
        error: null,
        loadLogs: vi.fn().mockResolvedValue([]),
        saveLog,
      },
    }));

    const user = userEvent.setup();
    render(<DailyLogPage />);

    await user.click(screen.getByRole("button", { name: /Save log/i }));

    expect(screen.getByRole("status")).toHaveTextContent("Log saved.");
  });

  it("shows error message when saveLog throws", async () => {
    const saveLog = vi.fn().mockRejectedValue(new Error("DB error"));
    useAppData.mockReturnValue(makeAppData({
      dailyLogs: {
        logs: [],
        loading: false,
        error: null,
        loadLogs: vi.fn().mockResolvedValue([]),
        saveLog,
      },
    }));

    const user = userEvent.setup();
    render(<DailyLogPage />);

    await user.click(screen.getByRole("button", { name: /Save log/i }));

    expect(screen.getByRole("status")).toHaveTextContent(/Error/i);
  });

  it("includes log_date in the save payload", async () => {
    const saveLog = vi.fn().mockResolvedValue({});
    useAppData.mockReturnValue(makeAppData({
      dailyLogs: { logs: [], loading: false, error: null, loadLogs: vi.fn().mockResolvedValue([]), saveLog },
    }));

    const user = userEvent.setup();
    render(<DailyLogPage />);

    await user.click(screen.getByRole("button", { name: /Save log/i }));

    expect(saveLog).toHaveBeenCalledWith(
      expect.objectContaining({ log_date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/) }),
    );
  });
});

describe("Daily Log — history list", () => {
  it("shows 'No entries yet' when there are no logs", () => {
    render(<DailyLogPage />);
    expect(screen.getByText(/No entries yet/i)).toBeInTheDocument();
  });

  it("displays existing log entries", () => {
    const logs = [
      {
        id: "log-1",
        log_date: "2026-02-20",
        training_quality: 4,
        workout_notes: "Hilly 8km",
        sleep_hours: 7.5,
        sleep_quality: 4,
        fatigue: 2,
        mood: 4,
        stress: 2,
        alcohol_units: 0,
        notes: "Felt strong",
      },
    ];
    useAppData.mockReturnValue(makeAppData({
      dailyLogs: { logs, loading: false, error: null, loadLogs: vi.fn().mockResolvedValue([]), saveLog: vi.fn().mockResolvedValue({}) },
    }));

    render(<DailyLogPage />);
    expect(screen.getByText("Hilly 8km")).toBeInTheDocument();
  });

  it("shows the 'Recent daily logs' region", () => {
    render(<DailyLogPage />);
    expect(screen.getByRole("region", { name: /Recent daily logs/i })).toBeInTheDocument();
  });

  it("shows loading state while logs are fetching", () => {
    useAppData.mockReturnValue(makeAppData({
      dailyLogs: { logs: [], loading: true, error: null, loadLogs: vi.fn().mockResolvedValue([]), saveLog: vi.fn().mockResolvedValue({}) },
    }));
    render(<DailyLogPage />);
    expect(screen.getByText(/Loading/i)).toBeInTheDocument();
  });
});

describe("Daily Log — edit mode", () => {
  it("shows 'Edit entry' heading when a log already exists for the selected date", () => {
    const today = new Date().toISOString().split("T")[0];
    const logs = [
      { id: "log-1", log_date: today, workout_notes: "Easy jog", training_quality: 3 },
    ];
    useAppData.mockReturnValue(makeAppData({
      dailyLogs: { logs, loading: false, error: null, loadLogs: vi.fn().mockResolvedValue([]), saveLog: vi.fn().mockResolvedValue({}) },
    }));

    render(<DailyLogPage />);
    expect(screen.getByRole("heading", { name: /Edit entry/i })).toBeInTheDocument();
  });

  it("shows 'Update log' button when editing an existing entry", () => {
    const today = new Date().toISOString().split("T")[0];
    const logs = [
      { id: "log-1", log_date: today, workout_notes: "Easy jog" },
    ];
    useAppData.mockReturnValue(makeAppData({
      dailyLogs: { logs, loading: false, error: null, loadLogs: vi.fn().mockResolvedValue([]), saveLog: vi.fn().mockResolvedValue({}) },
    }));

    render(<DailyLogPage />);
    expect(screen.getByRole("button", { name: /Update log/i })).toBeInTheDocument();
  });
});
