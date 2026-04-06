import React, { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, X } from "lucide-react";
import { useAppData } from "../context/AppDataContext";
import { getSupabaseClient } from "../lib/supabaseClient";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

// ── Constants ────────────────────────────────────────────────────────────────

const DAYS_OF_WEEK = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const ROTATING_MESSAGES = [
  "Analyzing your fitness...",
  "Structuring your phases...",
  "Building your weekly plan...",
  "Calibrating weekly volumes...",
  "Finalizing your schedule...",
];

const DAY_TYPES = ["Off", "Easy", "Hard", "Long"];

const DAY_TYPE_CLASSES = {
  Off: "bg-background border-input text-foreground hover:bg-accent",
  Easy: "bg-green-100 text-green-800 border-green-300 hover:bg-green-200",
  Hard: "bg-blue-100 text-blue-800 border-blue-300 hover:bg-blue-200",
  Long: "bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-200",
};

// ── Helper functions ─────────────────────────────────────────────────────────

function mapDistanceToEventType(distance) {
  switch (distance) {
    case "5K": return "5k";
    case "10K": return "10k";
    case "Half Marathon": return "half_marathon";
    case "Marathon": return "marathon";
    case "Ultra": return "ultra";
    default: return distance ? distance.toLowerCase().replace(/\s+/g, "_") : "other";
  }
}

function getDayOfWeekFromDate(dateStr) {
  const date = new Date(`${dateStr}T00:00:00Z`);
  const dayIndex = date.getUTCDay();
  // UTC Sunday=0 → Mon=0..Sun=6 index
  const mondayFirstIndex = dayIndex === 0 ? 6 : dayIndex - 1;
  const fullDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  return fullDays[mondayFirstIndex];
}

function computeWeeklyKmFromActivities(activities) {
  if (!activities || activities.length === 0) return null;

  const now = new Date();
  const fourWeeksAgo = new Date(now.getTime() - 4 * 7 * 24 * 60 * 60 * 1000);

  const recentRuns = activities.filter((activity) => {
    if (activity.type !== "Run") return false;
    const activityDate = new Date(activity.started_at);
    return activityDate >= fourWeeksAgo;
  });

  if (recentRuns.length === 0) return null;

  const totalKm = recentRuns.reduce((sum, activity) => {
    return sum + (activity.distance || 0) / 1000;
  }, 0);

  return Math.round(totalKm / 4);
}

function extractConstraintDaysFromWorkoutEntries(entries) {
  const hardDays = new Set();
  const restDays = new Set();

  if (!entries || entries.length === 0) {
    return { hardDays: [], restDays: [] };
  }

  entries.forEach((entry) => {
    const dayOfWeek = getDayOfWeekFromDate(entry.workout_date);
    // Convert full day name to 3-letter abbreviation
    const dayAbbrev = dayOfWeek.slice(0, 3);

    if (entry.workout_type === "Rest") {
      restDays.add(dayAbbrev);
    } else if (!["Easy", "Recovery"].includes(entry.workout_type)) {
      hardDays.add(dayAbbrev);
    }
  });

  return {
    hardDays: Array.from(hardDays),
    restDays: Array.from(restDays),
  };
}

function buildScheduleSummary(schedule) {
  const trainingDays = DAYS_OF_WEEK.filter((d) => schedule[d] !== "Off");
  const hardDays = DAYS_OF_WEEK.filter((d) => schedule[d] === "Hard");
  const longDay = DAYS_OF_WEEK.find((d) => schedule[d] === "Long");
  const restDays = DAYS_OF_WEEK.filter((d) => schedule[d] === "Off");

  const parts = [`${trainingDays.length} training days`];
  if (hardDays.length > 0) parts.push(`Hard: ${hardDays.join(", ")}`);
  if (longDay) parts.push(`Long run: ${longDay}`);
  if (restDays.length > 0) parts.push(`Rest: ${restDays.join(", ")}`);

  return parts.join(" · ");
}

// ── Main component ────────────────────────────────────────────────────────────

export function PlanIntakeModal({ open, onOpenChange }) {
  const { hierarchicalPlan, runnerProfile, activities, workoutEntries, auth } = useAppData();

  // Step
  const [step, setStep] = useState(1);

  // Step 1 state
  const [raceName, setRaceName] = useState("");
  const [raceDate, setRaceDate] = useState("");
  const [goalDistance, setGoalDistance] = useState("");
  const [ultraKm, setUltraKm] = useState("");
  const [goalType, setGoalType] = useState("finish");
  const [raceInfo, setRaceInfo] = useState(null);
  const [raceInfoLoading, setRaceInfoLoading] = useState(false);

  // Step 2 state
  const [weeklyKm, setWeeklyKm] = useState("");
  const [weeklyKmPrefilled, setWeeklyKmPrefilled] = useState(false);
  const [longestRun, setLongestRun] = useState("");
  const [schedule, setSchedule] = useState({
    Mon: "Off", Tue: "Off", Wed: "Off", Thu: "Off", Fri: "Off", Sat: "Off", Sun: "Off",
  });
  const [background, setBackground] = useState("");
  const [backgroundPrefilled, setBackgroundPrefilled] = useState(false);
  const [injuries, setInjuries] = useState("");

  // Step 3 state
  const [messages, setMessages] = useState([]);
  const [userInput, setUserInput] = useState("");
  const [sessionId, setSessionId] = useState(null);
  const [step3Loading, setStep3Loading] = useState(false);

  // General state
  const [errors, setErrors] = useState({});
  const [showConfirmReplace, setShowConfirmReplace] = useState(false);
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);

  const messagesEndRef = useRef(null);

  // ── Pre-fill on open ───────────────────────────────────────────────────────

  useEffect(() => {
    if (!open) return;

    // Reset step and general state
    setStep(1);
    setShowConfirmReplace(false);
    setErrors({});
    setCurrentMessageIndex(0);

    // Pre-fill background
    if (runnerProfile?.background && !background) {
      setBackground(runnerProfile.background);
      setBackgroundPrefilled(true);
    }

    // Pre-fill weekly km from Strava
    if (!weeklyKm && activities?.activities) {
      const computedKm = computeWeeklyKmFromActivities(activities.activities);
      if (computedKm !== null) {
        setWeeklyKm(computedKm.toString());
        setWeeklyKmPrefilled(true);
      }
    }

    // Pre-fill schedule from workout entries
    if (workoutEntries?.entries) {
      const { hardDays: extractedHardDays, restDays: extractedRestDays } =
        extractConstraintDaysFromWorkoutEntries(workoutEntries.entries);

      setSchedule((prev) => {
        const next = { ...prev };
        // Mark extracted hard days
        extractedHardDays.forEach((d) => {
          if (next[d] !== undefined) next[d] = "Hard";
        });
        // Rest days remain "Off" (already default)
        return next;
      });
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Rotating message effect ────────────────────────────────────────────────

  useEffect(() => {
    if (!hierarchicalPlan?.generating) return;

    const interval = setInterval(() => {
      setCurrentMessageIndex((prev) => (prev + 1) % ROTATING_MESSAGES.length);
    }, 4000);

    return () => clearInterval(interval);
  }, [hierarchicalPlan?.generating]);

  // ── Auto-scroll messages ───────────────────────────────────────────────────

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Race info lookup ───────────────────────────────────────────────────────

  const handleRaceLookup = useCallback(async () => {
    if (!raceName.trim()) return;

    setRaceInfoLoading(true);
    try {
      // Get supabase client — prefer auth.client from context, fallback to singleton
      const client = auth?.client || getSupabaseClient();
      if (!client) {
        setRaceInfoLoading(false);
        return;
      }

      const { data: sessionData } = await client.auth.getSession();
      const session = sessionData?.session;
      if (!session) {
        setRaceInfoLoading(false);
        return;
      }

      const { data } = await client.functions.invoke("claude-coach", {
        body: { mode: "race_info", raceName: raceName.trim() },
        headers: { Authorization: "Bearer " + session.access_token },
      });

      setRaceInfo(data?.raceInfo || null);
    } catch (err) {
      console.error("Race info lookup failed:", err);
      setRaceInfo(null);
    } finally {
      setRaceInfoLoading(false);
    }
  }, [raceName, auth]);

  // ── Schedule day cycling ───────────────────────────────────────────────────

  const handleDayClick = useCallback((day) => {
    setSchedule((prev) => {
      const current = prev[day];
      const currentIndex = DAY_TYPES.indexOf(current);
      const nextType = DAY_TYPES[(currentIndex + 1) % DAY_TYPES.length];

      const next = { ...prev };

      // Only one "Long" allowed — clear previous Long day
      if (nextType === "Long") {
        Object.keys(next).forEach((d) => {
          if (next[d] === "Long") next[d] = "Off";
        });
      }

      next[day] = nextType;
      return next;
    });
  }, []);

  // ── Step 1 validation + navigation ────────────────────────────────────────

  const handleStep1Next = useCallback(() => {
    const newErrors = {};
    if (!raceDate) newErrors.raceDate = "Race date is required.";
    if (!goalDistance) newErrors.goalDistance = "Please select a goal distance.";
    if (goalDistance === "Ultra" && !ultraKm) newErrors.ultraKm = "Enter the ultra distance in km.";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setStep(2);
  }, [raceDate, goalDistance, ultraKm]);

  // ── Step 2 validation + startPlanSession ──────────────────────────────────

  const handleStep2Next = useCallback(async () => {
    const newErrors = {};
    if (!weeklyKm) newErrors.weeklyKm = "Enter your approximate weekly km.";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});

    // If plan exists and haven't confirmed replacement, show confirm screen
    if (hierarchicalPlan?.plan && !showConfirmReplace) {
      setShowConfirmReplace(true);
      return;
    }

    await doStartPlanSession();
  }, [weeklyKm, hierarchicalPlan, showConfirmReplace]); // eslint-disable-line react-hooks/exhaustive-deps

  const doStartPlanSession = useCallback(async () => {
    setStep3Loading(true);
    setMessages([]);

    const hardDays = Object.entries(schedule).filter(([, v]) => v === "Hard").map(([k]) => k);
    const restDays = Object.entries(schedule).filter(([, v]) => v === "Off").map(([k]) => k);
    const longRunDay = Object.entries(schedule).find(([, v]) => v === "Long")?.[0] ?? null;
    const trainingDayCount = Object.values(schedule).filter((v) => v !== "Off").length;

    try {
      const result = await hierarchicalPlan.startPlanSession({
        planIntake: {
          raceGoal: {
            eventName: raceName || goalDistance,
            eventDate: raceDate,
            eventType: mapDistanceToEventType(goalDistance),
            ultraDistanceKm: goalDistance === "Ultra" ? Number(ultraKm) : null,
            goalType,
          },
          fitness: {
            weeklyKm: Number(weeklyKm),
            longestRecentRun: longestRun ? Number(longestRun) : null,
          },
          constraints: {
            hardDays,
            restDays,
            longRunDay,
            maxSessions: trainingDayCount,
          },
          background,
          injuries: injuries || null,
          raceInfo,
        },
        activePlan: null,
      });

      if (result?.planGenerated) {
        // Plan was generated immediately — modal will show generating state then close
        onOpenChange(false);
        return;
      }

      // Move to step 3 with the first coach question
      setSessionId(result?.sessionId || null);
      if (result?.question) {
        setMessages([{ role: "coach", text: result.question }]);
      }
      setStep(3);
    } catch (err) {
      console.error("startPlanSession failed:", err);
      setErrors({ submit: "Failed to start plan session. Please try again." });
    } finally {
      setStep3Loading(false);
    }
  }, [
    schedule, raceName, goalDistance, raceDate, ultraKm, goalType,
    weeklyKm, longestRun, background, injuries, raceInfo,
    hierarchicalPlan, onOpenChange,
  ]);

  // ── Step 3: send message ───────────────────────────────────────────────────

  const handleSendMessage = useCallback(async (messageText) => {
    const text = (messageText ?? userInput).trim();
    if (!text || !sessionId) return;

    setMessages((prev) => [...prev, { role: "user", text }]);
    setUserInput("");
    setStep3Loading(true);

    try {
      const result = await hierarchicalPlan.sendPlanMessage(sessionId, text);

      if (result?.planGenerated) {
        onOpenChange(false);
        return;
      }

      if (result?.question) {
        setMessages((prev) => [...prev, { role: "coach", text: result.question }]);
      }
    } catch (err) {
      console.error("sendPlanMessage failed:", err);
      setMessages((prev) => [
        ...prev,
        { role: "coach", text: "Something went wrong. Please try again." },
      ]);
    } finally {
      setStep3Loading(false);
    }
  }, [userInput, sessionId, hierarchicalPlan, onOpenChange]);

  const handleSkipQA = useCallback(() => {
    handleSendMessage("No further context — please generate the plan now.");
  }, [handleSendMessage]);

  const handleStep3Back = useCallback(() => {
    setSessionId(null);
    setMessages([]);
    setStep(2);
  }, []);

  // ── Confirmation handler ───────────────────────────────────────────────────

  const handleConfirmReplace = useCallback(async () => {
    setShowConfirmReplace(false);
    await doStartPlanSession();
  }, [doStartPlanSession]);

  const isGenerating = hierarchicalPlan?.generating || false;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-lg max-h-[90vh] flex flex-col overflow-hidden"
        onInteractOutside={(e) => {
          if (isGenerating) e.preventDefault();
        }}
        onEscapeKeyDown={(e) => {
          if (isGenerating) e.preventDefault();
        }}
      >
        {/* ── Generating spinner ── */}
        {isGenerating ? (
          <>
            <DialogHeader>
              <DialogTitle>Building Your Plan...</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col items-center justify-center py-12">
              <div className="flex h-20 w-20 items-center justify-center">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
              </div>
              <div className="mt-6 text-center text-sm text-muted-foreground" aria-live="polite">
                {ROTATING_MESSAGES[currentMessageIndex]}
              </div>
              <div className="mt-2 text-xs text-muted-foreground">
                This usually takes 30–60 seconds.
              </div>
            </div>
          </>
        ) : showConfirmReplace ? (
          /* ── Confirm replace ── */
          <>
            <DialogHeader>
              <DialogTitle>Replace Your Current Plan?</DialogTitle>
            </DialogHeader>
            <div className="py-6">
              <p className="text-sm text-muted-foreground mb-6">
                You already have an active plan. Generating a new one will permanently replace it.
              </p>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowConfirmReplace(false)}
                  className="flex-1"
                >
                  Go Back
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleConfirmReplace}
                  className="flex-1"
                >
                  Replace and Generate
                </Button>
              </div>
            </div>
          </>
        ) : step === 1 ? (
          /* ── Step 1: Your Race Goal ── */
          <>
            <DialogHeader>
              <DialogTitle>Step 1 of 3 — Your Race Goal</DialogTitle>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto space-y-5 py-4 pr-1">
              {/* Race name + lookup */}
              <div>
                <Label htmlFor="race-name" className="text-sm font-semibold">
                  Race Name
                </Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    id="race-name"
                    placeholder="e.g. Boston Marathon"
                    value={raceName}
                    onChange={(e) => setRaceName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleRaceLookup();
                    }}
                    className="flex-1"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRaceLookup}
                    disabled={!raceName.trim() || raceInfoLoading}
                  >
                    {raceInfoLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Look up →"
                    )}
                  </Button>
                </div>
              </div>

              {/* Race info card */}
              {raceInfo && (
                <div className="rounded-md border bg-muted/40 p-3 text-sm relative">
                  <button
                    onClick={() => setRaceInfo(null)}
                    className="absolute top-2 right-2 text-muted-foreground hover:text-foreground"
                    aria-label="Dismiss race info"
                  >
                    <X className="h-4 w-4" />
                  </button>
                  <p className="font-semibold">{raceInfo.displayName}</p>
                  <p className="text-muted-foreground mt-0.5">
                    {raceInfo.distanceKm && `${raceInfo.distanceKm}km`}
                    {raceInfo.terrain && ` · ${raceInfo.terrain}`}
                    {raceInfo.location && ` · ${raceInfo.location}`}
                  </p>
                  {raceInfo.keyFacts && (
                    <p className="mt-1 text-muted-foreground">{raceInfo.keyFacts}</p>
                  )}
                </div>
              )}

              {/* Race date */}
              <div>
                <Label htmlFor="race-date" className="text-sm font-semibold">
                  Race Date <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="race-date"
                  type="date"
                  value={raceDate}
                  onChange={(e) => {
                    setRaceDate(e.target.value);
                    if (errors.raceDate) setErrors((p) => { const n = { ...p }; delete n.raceDate; return n; });
                  }}
                  className="mt-1"
                />
                {errors.raceDate && (
                  <p className="mt-1 text-xs text-destructive">{errors.raceDate}</p>
                )}
              </div>

              {/* Goal distance */}
              <div>
                <Label htmlFor="goal-distance" className="text-sm font-semibold">
                  Goal Distance <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={goalDistance}
                  onValueChange={(v) => {
                    setGoalDistance(v);
                    if (errors.goalDistance) setErrors((p) => { const n = { ...p }; delete n.goalDistance; return n; });
                  }}
                >
                  <SelectTrigger id="goal-distance" className="mt-1">
                    <SelectValue placeholder="Select a distance" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5K">5K</SelectItem>
                    <SelectItem value="10K">10K</SelectItem>
                    <SelectItem value="Half Marathon">Half Marathon</SelectItem>
                    <SelectItem value="Marathon">Marathon</SelectItem>
                    <SelectItem value="Ultra">Ultra</SelectItem>
                  </SelectContent>
                </Select>
                {errors.goalDistance && (
                  <p className="mt-1 text-xs text-destructive">{errors.goalDistance}</p>
                )}
              </div>

              {/* Ultra km (conditional) */}
              {goalDistance === "Ultra" && (
                <div>
                  <Label htmlFor="ultra-km" className="text-sm font-semibold">
                    Ultra Distance (km) <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="ultra-km"
                    type="number"
                    placeholder="e.g. 100"
                    value={ultraKm}
                    onChange={(e) => {
                      setUltraKm(e.target.value);
                      if (errors.ultraKm) setErrors((p) => { const n = { ...p }; delete n.ultraKm; return n; });
                    }}
                    className="mt-1"
                  />
                  {errors.ultraKm && (
                    <p className="mt-1 text-xs text-destructive">{errors.ultraKm}</p>
                  )}
                </div>
              )}

              {/* Goal type toggle */}
              <div>
                <Label className="text-sm font-semibold block mb-2">Goal Type</Label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setGoalType("finish")}
                    className={`flex-1 py-2 px-3 text-sm rounded-md border transition-colors ${
                      goalType === "finish"
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background border-input hover:bg-accent"
                    }`}
                  >
                    Finish it
                  </button>
                  <button
                    onClick={() => setGoalType("time")}
                    className={`flex-1 py-2 px-3 text-sm rounded-md border transition-colors ${
                      goalType === "time"
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background border-input hover:bg-accent"
                    }`}
                  >
                    Target time
                  </button>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end pt-4 border-t">
              <Button onClick={handleStep1Next}>Next →</Button>
            </div>
          </>
        ) : step === 2 ? (
          /* ── Step 2: Fitness & Schedule ── */
          <>
            <DialogHeader>
              <DialogTitle>Step 2 of 3 — Your Fitness &amp; Schedule</DialogTitle>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto space-y-5 py-4 pr-1">
              {/* Weekly km */}
              <div>
                <Label htmlFor="weekly-km" className="text-sm font-semibold">
                  Current Weekly km <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="weekly-km"
                  type="number"
                  placeholder="40"
                  value={weeklyKm}
                  onChange={(e) => {
                    setWeeklyKm(e.target.value);
                    if (errors.weeklyKm) setErrors((p) => { const n = { ...p }; delete n.weeklyKm; return n; });
                  }}
                  className={`mt-1 ${weeklyKmPrefilled ? "italic bg-muted" : ""}`}
                />
                {weeklyKmPrefilled && (
                  <p className="mt-1 text-xs text-muted-foreground">From Strava</p>
                )}
                {errors.weeklyKm && (
                  <p className="mt-1 text-xs text-destructive">{errors.weeklyKm}</p>
                )}
              </div>

              {/* Longest run */}
              <div>
                <Label htmlFor="longest-run" className="text-sm font-semibold">
                  Longest Recent Run (km)
                  <span className="ml-1 text-xs text-muted-foreground font-normal">optional</span>
                </Label>
                <Input
                  id="longest-run"
                  type="number"
                  placeholder="e.g. 25"
                  value={longestRun}
                  onChange={(e) => setLongestRun(e.target.value)}
                  className="mt-1"
                />
              </div>

              {/* Weekly schedule grid */}
              <div>
                <Label className="text-sm font-semibold block mb-2">Weekly Schedule</Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Click each day to cycle: Off → Easy → Hard → Long
                </p>
                <div className="grid grid-cols-7 gap-1">
                  {DAYS_OF_WEEK.map((day) => (
                    <button
                      key={day}
                      onClick={() => handleDayClick(day)}
                      className={`py-2 text-xs font-medium rounded-md border transition-colors ${DAY_TYPE_CLASSES[schedule[day]]}`}
                    >
                      <div>{day}</div>
                      <div className="text-[10px] mt-0.5 opacity-75">{schedule[day]}</div>
                    </button>
                  ))}
                </div>
                {/* Live summary bar */}
                <p className="mt-2 text-xs text-muted-foreground">
                  {buildScheduleSummary(schedule)}
                </p>
              </div>

              {/* Background */}
              <div>
                <Label htmlFor="background" className="text-sm font-semibold">
                  Running Background
                  <span className="ml-1 text-xs text-muted-foreground font-normal">optional</span>
                </Label>
                <Textarea
                  id="background"
                  placeholder="E.g. Running 3 years, completed one half marathon..."
                  value={background}
                  onChange={(e) => setBackground(e.target.value)}
                  className={`mt-1 ${backgroundPrefilled ? "italic bg-muted" : ""}`}
                  rows={3}
                />
                {backgroundPrefilled && (
                  <p className="mt-1 text-xs text-muted-foreground">From your profile</p>
                )}
              </div>

              {/* Injuries */}
              <div>
                <Label htmlFor="injuries" className="text-sm font-semibold">
                  Current Injuries / Limitations
                  <span className="ml-1 text-xs text-muted-foreground font-normal">optional</span>
                </Label>
                <Textarea
                  id="injuries"
                  placeholder="E.g. Left knee niggle, avoid hills..."
                  value={injuries}
                  onChange={(e) => setInjuries(e.target.value)}
                  className="mt-1"
                  rows={2}
                />
              </div>

              {/* Error banner */}
              {errors.submit && (
                <div className="rounded-md border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
                  {errors.submit}
                </div>
              )}

              {/* Replace warning */}
              {hierarchicalPlan?.plan && (
                <div className="rounded-md border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
                  This will replace your current plan.
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-between pt-4 border-t">
              <Button variant="outline" onClick={() => setStep(1)}>
                ← Back
              </Button>
              <Button onClick={handleStep2Next} disabled={step3Loading}>
                {step3Loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Starting...
                  </>
                ) : (
                  "Next →"
                )}
              </Button>
            </div>
          </>
        ) : (
          /* ── Step 3: Q&A with coach ── */
          <>
            <DialogHeader>
              <DialogTitle>A few questions first</DialogTitle>
            </DialogHeader>

            {/* Message list */}
            <div className="flex-1 overflow-y-auto py-4 space-y-3 min-h-0">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-foreground"
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}
              {step3Loading && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-lg px-3 py-2">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input row */}
            <div className="border-t pt-3 space-y-2">
              <div className="flex gap-2">
                <Input
                  placeholder="Your answer..."
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  disabled={step3Loading}
                  className="flex-1"
                />
                <Button
                  onClick={() => handleSendMessage()}
                  disabled={step3Loading || !userInput.trim()}
                >
                  Send
                </Button>
              </div>

              <div className="flex items-center justify-between">
                <Button variant="ghost" size="sm" onClick={handleStep3Back} disabled={step3Loading}>
                  ← Back
                </Button>
                <button
                  onClick={handleSkipQA}
                  disabled={step3Loading}
                  className="text-xs text-muted-foreground underline hover:text-foreground disabled:opacity-50"
                >
                  Skip Q&amp;A — generate anyway
                </button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
