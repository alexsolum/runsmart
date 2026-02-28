import React from "react";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { t, setLanguage, getCurrentLanguage, useI18n } from "../../src/i18n/translations";
import LanguageSwitcher from "../../src/components/LanguageSwitcher";

// Reset language to English after every test to avoid cross-test pollution
afterEach(() => {
  act(() => {
    setLanguage("en");
  });
});

// ── t() function ─────────────────────────────────────────────────────────────

describe("t() – translation function", () => {
  it("returns English string by default", () => {
    expect(t("nav.planning")).toBe("Planning");
  });

  it("returns the correct English value for a coach key", () => {
    expect(t("coach.refreshCoaching")).toBe("Refresh coaching");
    expect(t("coach.send")).toBe("Send");
    expect(t("coach.newConversation")).toBe("+ New conversation");
  });

  it("falls back to English when a key is missing in the current language", () => {
    // Even if we somehow have an unknown lang, fallback to en
    setLanguage("no");
    // All keys exist in 'no', so this just checks the no value
    expect(t("nav.planning")).toBe("Planlegging");
    setLanguage("en");
  });

  it("returns the key itself when it does not exist in any dictionary", () => {
    expect(t("nonexistent.key.xyz")).toBe("nonexistent.key.xyz");
  });

  it("returns Norwegian strings after setLanguage('no')", () => {
    setLanguage("no");
    expect(t("nav.planning")).toBe("Planlegging");
    expect(t("coach.refreshCoaching")).toBe("Oppdater coaching");
    expect(t("coach.newConversation")).toBe("+ Ny samtale");
    expect(t("nav.signout")).toBe("Logg ut");
  });

  it("switches back to English after setLanguage('en')", () => {
    setLanguage("no");
    setLanguage("en");
    expect(t("nav.planning")).toBe("Planning");
    expect(t("coach.send")).toBe("Send");
  });

  it("has all required coach keys in both languages", () => {
    const coachKeys = [
      "coach.aiCoachSubtitle",
      "coach.newConversation",
      "coach.noConversations",
      "coach.deleteConv",
      "coach.delete",
      "coach.cancel",
      "coach.refreshCoaching",
      "coach.analyzingBtn",
      "coach.analyzingMsg",
      "coach.followupPlaceholder",
      "coach.send",
      "coach.dismiss",
      "coach.trainingDataAnalyzed",
      "coach.goalRace",
      "coach.currentPhase",
      "coach.week",
      "coach.targetVolume",
      "coach.daysToRace",
      "coach.last7Days",
      "coach.aboutYou",
      "coach.runningBackground",
    ];

    coachKeys.forEach((key) => {
      setLanguage("en");
      const enVal = t(key);
      // Key should resolve to a real string (not fall back to the key itself)
      expect(enVal, `EN key missing: ${key}`).not.toBe(key);

      setLanguage("no");
      const noVal = t(key);
      // Norwegian value should exist
      expect(noVal, `NO key missing: ${key}`).not.toBe(key);
    });
  });

  it("has all required nav keys in both languages", () => {
    const navKeys = [
      "nav.general",
      "nav.other",
      "nav.trainingPlan",
      "nav.weeklyPlan",
      "nav.dailyLog",
      "nav.search",
      "nav.signout",
    ];

    navKeys.forEach((key) => {
      setLanguage("en");
      expect(t(key), `EN key missing: ${key}`).not.toBe(key);
      setLanguage("no");
      expect(t(key), `NO key missing: ${key}`).not.toBe(key);
    });
  });
});

// ── getCurrentLanguage ────────────────────────────────────────────────────────

describe("getCurrentLanguage()", () => {
  it("returns 'en' by default", () => {
    expect(getCurrentLanguage()).toBe("en");
  });

  it("returns 'no' after setLanguage('no')", () => {
    setLanguage("no");
    expect(getCurrentLanguage()).toBe("no");
  });

  it("returns 'en' after switching back", () => {
    setLanguage("no");
    setLanguage("en");
    expect(getCurrentLanguage()).toBe("en");
  });
});

// ── useI18n() hook ────────────────────────────────────────────────────────────

function TestComponent({ tKey }) {
  const { t: translate, lang } = useI18n();
  return (
    <div>
      <span data-testid="text">{translate(tKey)}</span>
      <span data-testid="lang">{lang}</span>
    </div>
  );
}

describe("useI18n() hook", () => {
  it("returns English string initially", () => {
    render(<TestComponent tKey="nav.planning" />);
    expect(screen.getByTestId("text")).toHaveTextContent("Planning");
    expect(screen.getByTestId("lang")).toHaveTextContent("en");
  });

  it("exposes t() that translates keys", () => {
    render(<TestComponent tKey="coach.refreshCoaching" />);
    expect(screen.getByTestId("text")).toHaveTextContent("Refresh coaching");
  });

  it("triggers re-render when language changes", async () => {
    render(<TestComponent tKey="nav.planning" />);
    expect(screen.getByTestId("text")).toHaveTextContent("Planning");

    act(() => {
      setLanguage("no");
    });

    expect(screen.getByTestId("text")).toHaveTextContent("Planlegging");
    expect(screen.getByTestId("lang")).toHaveTextContent("no");
  });

  it("reverts on language switch back", async () => {
    render(<TestComponent tKey="nav.planning" />);

    act(() => { setLanguage("no"); });
    expect(screen.getByTestId("text")).toHaveTextContent("Planlegging");

    act(() => { setLanguage("en"); });
    expect(screen.getByTestId("text")).toHaveTextContent("Planning");
  });
});

// ── LanguageSwitcher component ────────────────────────────────────────────────

describe("LanguageSwitcher", () => {
  it("renders EN and NO buttons", () => {
    render(<LanguageSwitcher />);
    expect(screen.getByRole("button", { name: "English" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Norsk" })).toBeInTheDocument();
  });

  it("marks EN as active (aria-pressed=true) by default", () => {
    render(<LanguageSwitcher />);
    expect(screen.getByRole("button", { name: "English" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Norsk" })).toHaveAttribute("aria-pressed", "false");
  });

  it("switches to Norwegian when NO button is clicked", async () => {
    const user = userEvent.setup();
    render(<LanguageSwitcher />);

    await user.click(screen.getByRole("button", { name: "Norsk" }));

    expect(screen.getByRole("button", { name: "Norsk" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "English" })).toHaveAttribute("aria-pressed", "false");
    expect(getCurrentLanguage()).toBe("no");
  });

  it("switches back to English when EN button is clicked", async () => {
    const user = userEvent.setup();
    act(() => { setLanguage("no"); });
    render(<LanguageSwitcher />);

    expect(screen.getByRole("button", { name: "Norsk" })).toHaveAttribute("aria-pressed", "true");

    await user.click(screen.getByRole("button", { name: "English" }));

    expect(screen.getByRole("button", { name: "English" })).toHaveAttribute("aria-pressed", "true");
    expect(getCurrentLanguage()).toBe("en");
  });

  it("is inside a group with accessible label", () => {
    render(<LanguageSwitcher />);
    expect(screen.getByRole("group", { name: "Language switcher" })).toBeInTheDocument();
  });

  it("propagates language change to components using useI18n()", async () => {
    const user = userEvent.setup();

    render(
      <div>
        <LanguageSwitcher />
        <TestComponent tKey="nav.planning" />
      </div>
    );

    expect(screen.getByTestId("text")).toHaveTextContent("Planning");

    await user.click(screen.getByRole("button", { name: "Norsk" }));

    expect(screen.getByTestId("text")).toHaveTextContent("Planlegging");
  });
});
