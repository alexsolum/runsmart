import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DataPage from "../src/pages/DataPage";
import { makeAppData } from "./mockAppData";

vi.mock("../src/context/AppDataContext", () => ({
  useAppData: vi.fn(),
}));

import { useAppData } from "../src/context/AppDataContext";

function makeStravaData(overrides = {}) {
  return {
    connected: false,
    loading: false,
    lastSyncAt: null,
    statusMessage: null,
    error: false,
    startConnect: vi.fn(),
    sync: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("DataPage — card sections", () => {
  beforeEach(() => {
    useAppData.mockReturnValue(
      makeAppData({ strava: makeStravaData() })
    );
  });

  it("renders the page heading", () => {
    render(<DataPage />);
    expect(screen.getByText("Reliable data ingestion")).toBeInTheDocument();
  });

  it("renders Connected sources card", () => {
    render(<DataPage />);
    expect(screen.getByText("Connected sources")).toBeInTheDocument();
    expect(screen.getByText("Strava activity sync")).toBeInTheDocument();
  });

  it("renders Privacy-first storage card with Review data policy button", () => {
    render(<DataPage />);
    expect(screen.getByText("Privacy-first storage")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Review data policy" })).toBeInTheDocument();
  });

  it("renders Strava card", () => {
    render(<DataPage />);
    expect(screen.getByText("Strava")).toBeInTheDocument();
  });
});

describe("DataPage — Strava disconnected state", () => {
  beforeEach(() => {
    useAppData.mockReturnValue(
      makeAppData({
        auth: { user: { id: "u1" }, loading: false, signIn: vi.fn(), signOut: vi.fn() },
        strava: makeStravaData({ connected: false }),
      })
    );
  });

  it("shows Connect Strava button when not connected", () => {
    render(<DataPage />);
    expect(screen.getByRole("button", { name: "Connect Strava" })).toBeInTheDocument();
  });

  it("calls startConnect when Connect Strava is clicked", async () => {
    const user = userEvent.setup();
    const startConnect = vi.fn();
    useAppData.mockReturnValue(
      makeAppData({
        auth: { user: { id: "u1" }, loading: false, signIn: vi.fn(), signOut: vi.fn() },
        strava: makeStravaData({ connected: false, startConnect }),
      })
    );
    render(<DataPage />);
    await user.click(screen.getByRole("button", { name: "Connect Strava" }));
    expect(startConnect).toHaveBeenCalledOnce();
  });

  it("disables Connect Strava when no auth user", () => {
    useAppData.mockReturnValue(
      makeAppData({
        auth: { user: null, loading: false, signIn: vi.fn(), signOut: vi.fn() },
        strava: makeStravaData({ connected: false }),
      })
    );
    render(<DataPage />);
    expect(screen.getByRole("button", { name: "Connect Strava" })).toBeDisabled();
  });
});

describe("DataPage — Strava connected state", () => {
  let syncFn;
  let disconnectFn;

  beforeEach(() => {
    syncFn = vi.fn().mockResolvedValue(undefined);
    disconnectFn = vi.fn().mockResolvedValue(undefined);
    useAppData.mockReturnValue(
      makeAppData({
        auth: { user: { id: "u1" }, loading: false, signIn: vi.fn(), signOut: vi.fn() },
        strava: makeStravaData({
          connected: true,
          lastSyncAt: "2024-06-01T08:00:00Z",
          sync: syncFn,
          disconnect: disconnectFn,
        }),
      })
    );
  });

  it("shows Sync now and Disconnect buttons when connected", () => {
    render(<DataPage />);
    expect(screen.getByRole("button", { name: "Sync now" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Disconnect" })).toBeInTheDocument();
  });

  it("shows last sync time", () => {
    render(<DataPage />);
    expect(screen.getByText(/2024/)).toBeInTheDocument();
  });

  it("shows 'Connected' status", () => {
    render(<DataPage />);
    expect(screen.getByText("Connected")).toBeInTheDocument();
  });

  it("calls sync when Sync now is clicked", async () => {
    const user = userEvent.setup();
    render(<DataPage />);
    await user.click(screen.getByRole("button", { name: "Sync now" }));
    expect(syncFn).toHaveBeenCalledOnce();
  });
});

describe("DataPage — status message", () => {
  it("shows status message when present", () => {
    useAppData.mockReturnValue(
      makeAppData({
        strava: makeStravaData({
          connected: true,
          statusMessage: "Sync complete: 12 activities imported",
          error: false,
        }),
      })
    );
    render(<DataPage />);
    expect(screen.getByRole("status")).toHaveTextContent("Sync complete");
  });
});
