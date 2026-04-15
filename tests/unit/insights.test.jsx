/**
 * Insights page tests
 *
 * Verifies that InsightsPage presents analytics derived from Strava activity
 * data stored in the Supabase `activities` table.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import InsightsPage, { __resetInsightsSynthesisCacheForTests } from "../../src/pages/InsightsPage";
import { makeAppData, SAMPLE_ACTIVITIES } from "./mockAppData";

vi.mock("../../src/context/AppDataContext", () => ({
  useAppData: vi.fn(),
}));

vi.mock("../../src/lib/coachPayload.js", () => ({
  buildCoachPayload: vi.fn().mockResolvedValue({}),
}));

import { useAppData } from "../../src/context/AppDataContext";
import { buildCoachPayload } from "../../src/lib/coachPayload.js";

function createLocalStorageMock(seed = {}) {
  const store = { ...seed };
  return {
    getItem: vi.fn((key) => (key in store ? store[key] : null)),
    setItem: vi.fn((key, value) => {
      store[key] = String(value);
    }),
    removeItem: vi.fn((key) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      Object.keys(store).forEach((key) => delete store[key]);
    }),
    key: vi.fn((index) => Object.keys(store)[index] ?? null),
    get length() {
      return Object.keys(store).length;
    },
    __store: store,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  __resetInsightsSynthesisCacheForTests();
  vi.stubGlobal("localStorage", createLocalStorageMock({ "runsmart-lang": "en" }));
});

describe("Insights — page structure", () => {
  it("renders the page heading", () => {
    useAppData.mockReturnValue(makeAppData());
    render(<InsightsPage />);
    expect(screen.getByRole("heading", { name: /Training analysis/i })).toBeInTheDocument();
  });
});

describe("Insights — empty state (no Strava data)", () => {
  beforeEach(() => {
    useAppData.mockReturnValue(makeAppData({
      activities: { activities: [], loading: false, error: null, loadActivities: vi.fn() },
    }));
  });

  it("shows 'No training data yet' empty-state message", () => {
    render(<InsightsPage />);
    expect(screen.getByText(/No training data yet/i)).toBeInTheDocument();
  });

  it("shows Connect Strava button when there is no data", () => {
    render(<InsightsPage />);
    expect(screen.getByRole("button", { name: /Connect Strava/i })).toBeInTheDocument();
  });
});

describe("Insights — loading state", () => {
  it("renders skeleton blocks while loading", () => {
    useAppData.mockReturnValue(makeAppData({
      activities: { activities: [], loading: true, error: null, loadActivities: vi.fn() },
    }));

    const { container } = render(<InsightsPage />);
    // Skeleton blocks are rendered as divs with the skeleton-block class
    const skeletons = container.querySelectorAll(".skeleton-block");
    expect(skeletons.length).toBeGreaterThan(0);
  });
});

describe("Insights — with Strava data", () => {
  beforeEach(() => {
    useAppData.mockReturnValue(makeAppData());
  });

  it("renders the KPI strip with four cards", () => {
    render(<InsightsPage />);
    const kpiCards = document.querySelectorAll(".kpi-card");
    expect(kpiCards.length).toBe(4);
  });

  it("shows 'This week' KPI with a km value", () => {
    render(<InsightsPage />);
    expect(screen.getByText("This week")).toBeInTheDocument();
    // Should show a distance in km
    const kpiStrip = document.querySelector(".kpi-strip");
    expect(kpiStrip).toHaveTextContent(/km/i);
  });

  it("shows 'Training load' KPI (CTL)", () => {
    render(<InsightsPage />);
    expect(screen.getByText("Training load")).toBeInTheDocument();
    // "Chronic load (CTL)" appears in both the KPI note and the fitness-level section;
    // use getAllByText so the assertion is not sensitive to how many matches exist.
    expect(screen.getAllByText(/Chronic load \(CTL\)/i).length).toBeGreaterThan(0);
  });

  it("shows 'Consistency' KPI with weeks/runs indicator", () => {
    render(<InsightsPage />);
    expect(screen.getByText("Consistency")).toBeInTheDocument();
    expect(screen.getByText(/Weeks with runs/i)).toBeInTheDocument();
  });

  it("shows 'Readiness' KPI with a Fresh/Neutral/Fatigued label", () => {
    render(<InsightsPage />);
    // "Readiness" appears in both the KPI label and the insight-summary stats section
    const readinessLabels = screen.getAllByText("Readiness");
    expect(readinessLabels.length).toBeGreaterThan(0);
    const readinessValues = screen.queryAllByText(/Fresh|Neutral|Fatigued/i);
    expect(readinessValues.length).toBeGreaterThan(0);
  });

  it("renders the fitness level meter section", () => {
    render(<InsightsPage />);
    expect(screen.getByText(/Fitness level/i)).toBeInTheDocument();
    const meter = document.querySelector(".fitness-meter");
    expect(meter).toBeInTheDocument();
  });

  it("shows the insight summary section", () => {
    render(<InsightsPage />);
    expect(screen.getByText(/Form trend/i)).toBeInTheDocument();
    expect(screen.getByText(/Risk score/i)).toBeInTheDocument();
  });
});

describe("Insights — with enough data for charts", () => {
  it("renders the fitness meter fill width reflecting CTL score", () => {
    // Build 14 days of consistent runs so CTL is non-zero
    const richActivities = Array.from({ length: 14 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return {
        id: `a-${i}`,
        user_id: "user-1",
        name: `Run ${i}`,
        type: "Run",
        started_at: d.toISOString(),
        distance: 10000,
        moving_time: 3600,
        average_speed: 2.78,
        elevation_gain: 50,
      };
    });

    useAppData.mockReturnValue(makeAppData({
      activities: { activities: richActivities, loading: false, error: null, loadActivities: vi.fn() },
    }));

    render(<InsightsPage />);
    const fill = document.querySelector(".fitness-meter__fill");
    expect(fill).toBeInTheDocument();
    // width style should be set (non-zero CTL → non-zero fitness score)
    expect(fill.style.width).not.toBe("0%");
  });

  it("renders endurance-efficiency chart titles when qualifying activities exist", () => {
    const richActivities = Array.from({ length: 6 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i * 7);
      return {
        id: `ef-${i}`,
        user_id: "user-1",
        name: `Aerobic ${i}`,
        type: "Run",
        started_at: d.toISOString(),
        distance: 10000,
        moving_time: 3600,
        average_speed: 2.78 + i * 0.02,
        average_heartrate: 128 + i,
        elevation_gain: 35,
        splits_metric: [
          { moving_time: 1800, distance: 5000, average_heartrate: 128 + i },
          { moving_time: 1800, distance: 4900, average_heartrate: 132 + i },
        ],
      };
    });

    useAppData.mockReturnValue(makeAppData({
      activities: { activities: richActivities, loading: false, error: null, loadActivities: vi.fn() },
    }));

    render(<InsightsPage />);
    expect(screen.getByText(/Endurance Efficiency/i)).toBeInTheDocument();
    expect(screen.getByText(/Decoupling vs. Duration/i)).toBeInTheDocument();
    expect(screen.queryByText(/No qualifying aerobic reference sessions yet/i)).not.toBeInTheDocument();
  });

  it("shows the new efficiency empty state when no activities qualify", () => {
    const noisyActivities = [
      {
        id: "bad-1",
        user_id: "user-1",
        name: "Hill Repeats",
        type: "Run",
        started_at: new Date().toISOString(),
        distance: 7000,
        moving_time: 2100,
        average_speed: 3.33,
        average_heartrate: 175,
        elevation_gain: 200,
      },
    ];

    useAppData.mockReturnValue(makeAppData({
      activities: { activities: noisyActivities, loading: false, error: null, loadActivities: vi.fn() },
    }));

    render(<InsightsPage />);
    expect(screen.getByText(/No qualifying aerobic reference sessions yet/i)).toBeInTheDocument();
  });
});

describe("Training Load Trend overlay (INSG-01)", () => {
  // Build 15+ activities spread over 15 consecutive days so computeTrainingLoad returns >= 15 entries
  function makeRichActivities(count = 15) {
    return Array.from({ length: count }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (count - 1 - i)); // oldest first, newest = today
      return {
        id: `rl-${i}`,
        user_id: "user-1",
        name: `Run ${i}`,
        type: "Run",
        started_at: d.toISOString(),
        distance: 10000,
        moving_time: 3600,
        average_speed: 2.78,
        elevation_gain: 50,
      };
    });
  }

  it("renders load-state-callout when series has >= 2 entries", async () => {
    useAppData.mockReturnValue(makeAppData({
      activities: { activities: makeRichActivities(15), loading: false, error: null, loadActivities: vi.fn() },
    }));
    render(<InsightsPage />);
    const callout = await screen.findByTestId("load-state-callout");
    expect(callout).toBeInTheDocument();
  });

  it("callout text contains a state label", async () => {
    useAppData.mockReturnValue(makeAppData({
      activities: { activities: makeRichActivities(15), loading: false, error: null, loadActivities: vi.fn() },
    }));
    render(<InsightsPage />);
    const callout = await screen.findByTestId("load-state-callout");
    const stateLabels = ["Good Form", "Neutral", "Accumulating Fatigue", "Overreaching Risk"];
    const hasStateLabel = stateLabels.some((label) => callout.textContent.includes(label));
    expect(hasStateLabel).toBe(true);
  });

  it("callout text contains a trend label", async () => {
    useAppData.mockReturnValue(makeAppData({
      activities: { activities: makeRichActivities(15), loading: false, error: null, loadActivities: vi.fn() },
    }));
    render(<InsightsPage />);
    const callout = await screen.findByTestId("load-state-callout");
    const trendLabels = ["Improving", "Declining", "Stable"];
    const hasTrendLabel = trendLabels.some((label) => callout.textContent.includes(label));
    expect(hasTrendLabel).toBe(true);
  });

  it("callout is absent when activities are empty", () => {
    useAppData.mockReturnValue(makeAppData({
      activities: { activities: [], loading: false, error: null, loadActivities: vi.fn() },
    }));
    render(<InsightsPage />);
    expect(screen.queryByTestId("load-state-callout")).not.toBeInTheDocument();
  });

  it("callout is absent when activities.loading is true", () => {
    useAppData.mockReturnValue(makeAppData({
      activities: { activities: makeRichActivities(15), loading: true, error: null, loadActivities: vi.fn() },
    }));
    render(<InsightsPage />);
    expect(screen.queryByTestId("load-state-callout")).not.toBeInTheDocument();
  });
});

describe("Insights — synthesis callout (INSG-02)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("requests synthesis through AppDataContext and renders the returned text", async () => {
    const wrappedSynthesis = [
      "```json",
      JSON.stringify({
        synthesis: [
          "Mileage Trend: volume is steady with a slight build.",
          "Intensity Distribution: most work is in Z1-Z2 with controlled quality.",
          "Long-Run Progression: long run duration is extending safely week over week.",
          "Race Readiness: current consistency supports a positive readiness trend.",
        ].join("\n"),
      }),
      "```",
    ].join("\n");
    const invokeInsightsSynthesis = vi.fn().mockResolvedValue({
      synthesis: wrappedSynthesis,
    });
    useAppData.mockReturnValue(makeAppData({ invokeInsightsSynthesis }));

    render(<InsightsPage />);
    const callout = await screen.findByTestId("synthesis-callout");
    expect(invokeInsightsSynthesis).toHaveBeenCalledTimes(1);
    expect(buildCoachPayload).toHaveBeenCalledWith(
      expect.objectContaining({ mode: "insights_synthesis" }),
    );
    expect(callout).toBeInTheDocument();
    expect(callout).toHaveTextContent("Mileage Trend:");
    expect(callout).toHaveTextContent("Race Readiness:");
    expect(callout).not.toHaveTextContent('{"synthesis"');
    expect(callout).not.toHaveTextContent("```");
  });

  it("renders all four required synthesis headings when synthesis is valid", async () => {
    const validSynthesis = [
      "Mileage Trend: volume is stable and gradually rising.",
      "Intensity Distribution: intensity remains mostly aerobic with one quality focus.",
      "Long-Run Progression: long runs are progressing with manageable fatigue cost.",
      "Race Readiness: consistency and recovery suggest readiness is improving.",
    ].join("\n");
    useAppData.mockReturnValue(makeAppData({
      invokeInsightsSynthesis: vi.fn().mockResolvedValue({
        synthesis: validSynthesis,
      }),
    }));

    render(<InsightsPage />);
    const callout = await screen.findByTestId("synthesis-callout");
    expect(callout).toHaveTextContent("Mileage Trend:");
    expect(callout).toHaveTextContent("Intensity Distribution:");
    expect(callout).toHaveTextContent("Long-Run Progression:");
    expect(callout).toHaveTextContent("Race Readiness:");
  });

  it("omits synthesis callout when synthesis is invalid after sanitization", async () => {
    const invokeInsightsSynthesis = vi.fn().mockResolvedValue({
      synthesis: "This is generic text with no required headings.",
    });
    useAppData.mockReturnValue(makeAppData({ invokeInsightsSynthesis }));

    render(<InsightsPage />);
    await waitFor(() => expect(invokeInsightsSynthesis).toHaveBeenCalled());
    expect(screen.queryByTestId("synthesis-callout")).toBeNull();
  });

  it("parses wrapped JSON-string synthesis payloads", async () => {
    useAppData.mockReturnValue(makeAppData({
      invokeInsightsSynthesis: vi.fn().mockResolvedValue({
        synthesis: "\"{ \\\"synthesis\\\": \\\"You've made a significant leap in volume this past week.\\\"}\"",
      }),
    }));

    render(<InsightsPage />);
    const callout = await screen.findByTestId("synthesis-callout");
    expect(callout).toBeInTheDocument();
    expect(callout).toHaveTextContent("You've made a significant leap in volume this past week.");
    expect(callout).not.toHaveTextContent("{ \"synthesis\":");
  });

  it("omits synthesis callout when edge function returns an error", async () => {
    const invokeInsightsSynthesis = vi.fn().mockRejectedValue(new Error("fail"));
    useAppData.mockReturnValue(makeAppData({ invokeInsightsSynthesis }));

    render(<InsightsPage />);
    await waitFor(() => expect(invokeInsightsSynthesis).toHaveBeenCalled());
    expect(screen.queryByTestId("synthesis-callout")).toBeNull();
  });

  it("shows skeleton while synthesis is loading", async () => {
    const invokeInsightsSynthesis = vi.fn().mockReturnValue(new Promise(() => {}));
    useAppData.mockReturnValue(makeAppData({ invokeInsightsSynthesis }));

    render(<InsightsPage />);
    const skeleton = await screen.findByTestId("synthesis-skeleton");
    expect(skeleton).toBeInTheDocument();
  });

  it("omits synthesis callout when activities list is empty (hasData false)", () => {
    const invokeInsightsSynthesis = vi.fn();
    useAppData.mockReturnValue(makeAppData({
      invokeInsightsSynthesis,
      activities: { activities: [], loading: false, error: null, loadActivities: vi.fn() },
    }));

    render(<InsightsPage />);
    expect(screen.queryByTestId("synthesis-callout")).toBeNull();
    expect(screen.queryByTestId("synthesis-skeleton")).toBeNull();
    expect(invokeInsightsSynthesis).not.toHaveBeenCalled();
  });

  it("uses cached synthesis from localStorage without calling the edge function", () => {
    const fetchedAt = new Date().toISOString();
    vi.stubGlobal(
      "localStorage",
      createLocalStorageMock({
        "runsmart-lang": "en",
        "runsmart-insights-synthesis-user-1-en": JSON.stringify({
          text: "Mileage Trend: cached insight.\nIntensity Distribution: cached.\nLong-Run Progression: cached.\nRace Readiness: cached.",
          fetchedAt,
          lang: "en",
          userId: "user-1",
        }),
      }),
    );
    const invokeInsightsSynthesis = vi.fn();
    useAppData.mockReturnValue(makeAppData({ invokeInsightsSynthesis }));

    render(<InsightsPage />);

    expect(screen.getByTestId("synthesis-callout")).toHaveTextContent("Mileage Trend: cached insight.");
    expect(screen.getByText(new RegExp(`Last updated.*${new Date(fetchedAt).toLocaleString()}`, "i"))).toBeInTheDocument();
    expect(screen.getByText(/Using cached insight/i)).toBeInTheDocument();
    expect(invokeInsightsSynthesis).not.toHaveBeenCalled();
  });

  it("fetches again when the cached synthesis is older than the selected interval", async () => {
    const staleAt = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
    vi.stubGlobal(
      "localStorage",
      createLocalStorageMock({
        "runsmart-lang": "en",
        "runsmart-insights-synthesis-user-1-en": JSON.stringify({
          text: "Mileage Trend: stale.\nIntensity Distribution: stale.\nLong-Run Progression: stale.\nRace Readiness: stale.",
          fetchedAt: staleAt,
          lang: "en",
          userId: "user-1",
        }),
      }),
    );
    const invokeInsightsSynthesis = vi.fn().mockResolvedValue({
      synthesis: [
        "Mileage Trend: refreshed.",
        "Intensity Distribution: refreshed.",
        "Long-Run Progression: refreshed.",
        "Race Readiness: refreshed.",
      ].join("\n"),
    });
    useAppData.mockReturnValue(makeAppData({
      invokeInsightsSynthesis,
      runnerProfile: {
        background: "",
        loading: false,
        error: null,
        insightRefreshIntervalHours: 24,
        loadProfile: vi.fn().mockResolvedValue(undefined),
        saveProfile: vi.fn().mockResolvedValue(undefined),
      },
    }));

    render(<InsightsPage />);

    await waitFor(() => expect(invokeInsightsSynthesis).toHaveBeenCalledTimes(1));
    expect(await screen.findByTestId("synthesis-callout")).toHaveTextContent("Mileage Trend: refreshed.");
  });

  it("allows changing the refresh interval and persists it through runner profile", async () => {
    const saveProfile = vi.fn().mockResolvedValue(undefined);
    useAppData.mockReturnValue(makeAppData({
      runnerProfile: {
        background: "",
        loading: false,
        error: null,
        insightRefreshIntervalHours: 24,
        loadProfile: vi.fn().mockResolvedValue(undefined),
        saveProfile,
      },
    }));

    render(<InsightsPage />);

    fireEvent.change(screen.getByLabelText(/Insight refresh frequency/i), {
      target: { value: "72" },
    });

    await waitFor(() => expect(saveProfile).toHaveBeenCalled());
    expect(saveProfile).toHaveBeenCalledWith("", 72);
  });

  it("allows manually refreshing the synthesis even when cache is still fresh", async () => {
    const fetchedAt = new Date().toISOString();
    vi.stubGlobal(
      "localStorage",
      createLocalStorageMock({
        "runsmart-lang": "en",
        "runsmart-insights-synthesis-user-1-en": JSON.stringify({
          text: "Mileage Trend: cached insight.\nIntensity Distribution: cached.\nLong-Run Progression: cached.\nRace Readiness: cached.",
          fetchedAt,
          lang: "en",
          userId: "user-1",
        }),
      }),
    );
    const invokeInsightsSynthesis = vi.fn().mockResolvedValue({
      synthesis: [
        "Mileage Trend: manual refresh.",
        "Intensity Distribution: manual refresh.",
        "Long-Run Progression: manual refresh.",
        "Race Readiness: manual refresh.",
      ].join("\n"),
    });
    useAppData.mockReturnValue(makeAppData({ invokeInsightsSynthesis }));

    render(<InsightsPage />);
    fireEvent.click(screen.getByRole("button", { name: /Refresh now/i }));

    await waitFor(() => expect(invokeInsightsSynthesis).toHaveBeenCalledTimes(1));
    expect(await screen.findByTestId("synthesis-callout")).toHaveTextContent("Mileage Trend: manual refresh.");
  });
});
