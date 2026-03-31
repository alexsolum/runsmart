import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { useAppData } from "../context/AppDataContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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

const DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const ROTATING_MESSAGES = [
  "Analyzing your fitness...",
  "Structuring your phases...",
  "Building your weekly plan...",
];

// Helper function to map distance to event type
function mapDistanceToEventType(distance) {
  switch (distance) {
    case "5K":
    case "10K":
      return "road";
    case "Half Marathon":
      return "half_marathon";
    case "Marathon":
      return "marathon";
    default:
      return "road";
  }
}

// Helper to get day of week from date string
function getDayOfWeekFromDate(dateStr) {
  const date = new Date(`${dateStr}T00:00:00Z`);
  const dayIndex = date.getUTCDay();
  // Convert Sunday (0) to index 6, others shift by 1
  const dayOfWeekIndex = dayIndex === 0 ? 6 : dayIndex - 1;
  return DAYS_OF_WEEK[dayOfWeekIndex];
}

// Helper to compute weekly km from activities
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
    // Distance is in metres
    return sum + (activity.distance || 0) / 1000;
  }, 0);

  return Math.round(totalKm / 4);
}

// Helper to extract constraint days from workout entries
function extractConstraintDaysFromWorkoutEntries(entries) {
  const hardDays = new Set();
  const restDays = new Set();

  if (!entries || entries.length === 0) {
    return { hardDays: [], restDays: [] };
  }

  entries.forEach((entry) => {
    const dayOfWeek = getDayOfWeekFromDate(entry.workout_date);

    if (entry.workout_type === "Rest") {
      restDays.add(dayOfWeek);
    } else if (!["Easy", "Recovery"].includes(entry.workout_type)) {
      hardDays.add(dayOfWeek);
    }
  });

  return {
    hardDays: Array.from(hardDays),
    restDays: Array.from(restDays),
  };
}

export function PlanIntakeModal({ open, onOpenChange }) {
  const { hierarchicalPlan, runnerProfile, activities, workoutEntries } = useAppData();

  // Form state
  const [raceName, setRaceName] = useState("");
  const [raceDate, setRaceDate] = useState("");
  const [goalDistance, setGoalDistance] = useState("");
  const [weeklyKm, setWeeklyKm] = useState("");
  const [daysPerWeek, setDaysPerWeek] = useState("");
  const [hardDays, setHardDays] = useState([]);
  const [restDay, setRestDay] = useState("");
  const [background, setBackground] = useState("");

  // Modal state
  const [showConfirmReplace, setShowConfirmReplace] = useState(false);
  const [errors, setErrors] = useState({});
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [weeklyKmPrefilled, setWeeklyKmPrefilled] = useState(false);
  const [backgroundPrefilled, setBackgroundPrefilled] = useState(false);

  // Pre-fill form on mount or when modal opens
  useEffect(() => {
    if (!open) return;

    // Reset state when modal opens
    setShowConfirmReplace(false);
    setErrors({});
    setCurrentMessageIndex(0);

    // Pre-fill background from runner profile
    if (runnerProfile?.background && !background) {
      setBackground(runnerProfile.background);
      setBackgroundPrefilled(true);
    }

    // Pre-fill weeklyKm from Strava activities
    if (!weeklyKm && activities?.activities) {
      const computedKm = computeWeeklyKmFromActivities(activities.activities);
      if (computedKm !== null) {
        setWeeklyKm(computedKm.toString());
        setWeeklyKmPrefilled(true);
      }
    }

    // Pre-fill constraint days from workout entries
    if (workoutEntries?.entries && hardDays.length === 0 && restDay === "") {
      const { hardDays: extractedHardDays, restDays: extractedRestDays } =
        extractConstraintDaysFromWorkoutEntries(workoutEntries.entries);
      if (extractedHardDays.length > 0) {
        setHardDays(extractedHardDays);
      }
      if (extractedRestDays.length > 0) {
        setRestDay(extractedRestDays[0]);
      }
    }
  }, [open]);

  // Rotating message effect during generation
  useEffect(() => {
    if (!hierarchicalPlan?.generating) return;

    const interval = setInterval(() => {
      setCurrentMessageIndex((prev) => (prev + 1) % ROTATING_MESSAGES.length);
    }, 4000);

    return () => clearInterval(interval);
  }, [hierarchicalPlan?.generating]);

  // Validation helper
  const validateForm = useCallback(() => {
    const newErrors = {};

    if (!raceDate) newErrors.raceDate = "Race date is required.";
    if (!goalDistance) newErrors.goalDistance = "Please select a goal distance.";
    if (!weeklyKm) newErrors.weeklyKm = "Enter your approximate weekly km.";
    if (!daysPerWeek) newErrors.daysPerWeek = "Select how many days you can train per week.";

    return newErrors;
  }, [raceDate, goalDistance, weeklyKm, daysPerWeek]);

  // Validation helper
  const hasErrors = Object.keys(errors).length > 0;

  // Submit handler
  const handleSubmit = useCallback(async () => {
    const newErrors = validateForm();

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // If plan exists and we haven't confirmed replacement, show confirmation
    if (hierarchicalPlan?.plan && !showConfirmReplace) {
      setShowConfirmReplace(true);
      return;
    }

    // Construct the AthletePayload
    const payload = {
      raceGoal: {
        eventName: raceName || goalDistance,
        eventDate: raceDate,
        eventType: mapDistanceToEventType(goalDistance),
      },
      fitness: {
        weeklyKm: Number(weeklyKm),
        longestRun: 0,
        lthr: 0,
        yearsRunning: 0,
      },
      constraints: {
        longRunDay: "Sunday",
        hardDays: hardDays,
        restDays: restDay ? [restDay] : [],
        maxSessions: Number(daysPerWeek),
      },
      background: background,
    };

    try {
      await hierarchicalPlan.generatePlan(payload);
      onOpenChange(false);
    } catch (err) {
      // Error is already captured in hierarchicalPlan.error
      console.error("Plan generation failed:", err);
    }
  }, [validateForm, hierarchicalPlan, showConfirmReplace, raceName, goalDistance, raceDate, weeklyKm, daysPerWeek, hardDays, restDay, background, onOpenChange]);

  // Confirmation handler
  const handleConfirmReplace = useCallback(async () => {
    const payload = {
      raceGoal: {
        eventName: raceName || goalDistance,
        eventDate: raceDate,
        eventType: mapDistanceToEventType(goalDistance),
      },
      fitness: {
        weeklyKm: Number(weeklyKm),
        longestRun: 0,
        lthr: 0,
        yearsRunning: 0,
      },
      constraints: {
        longRunDay: "Sunday",
        hardDays: hardDays,
        restDays: restDay ? [restDay] : [],
        maxSessions: Number(daysPerWeek),
      },
      background: background,
    };

    try {
      await hierarchicalPlan.generatePlan(payload);
      onOpenChange(false);
    } catch (err) {
      console.error("Plan generation failed:", err);
    }
  }, [raceName, goalDistance, raceDate, weeklyKm, daysPerWeek, hardDays, restDay, background, hierarchicalPlan, onOpenChange]);

  // Field change handlers that clear errors
  const handleRaceNameChange = useCallback((e) => {
    setRaceName(e.target.value);
    if (errors.raceName) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors.raceName;
        return newErrors;
      });
    }
  }, [errors]);

  const handleRaceDateChange = useCallback((e) => {
    setRaceDate(e.target.value);
    if (errors.raceDate) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors.raceDate;
        return newErrors;
      });
    }
  }, [errors]);

  const handleGoalDistanceChange = useCallback((value) => {
    setGoalDistance(value);
    if (errors.goalDistance) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors.goalDistance;
        return newErrors;
      });
    }
  }, [errors]);

  const handleWeeklyKmChange = useCallback((e) => {
    setWeeklyKm(e.target.value);
    if (errors.weeklyKm) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors.weeklyKm;
        return newErrors;
      });
    }
  }, [errors]);

  const handleDaysPerWeekChange = useCallback((value) => {
    setDaysPerWeek(value);
    if (errors.daysPerWeek) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors.daysPerWeek;
        return newErrors;
      });
    }
  }, [errors]);

  const handleBackgroundChange = useCallback((e) => {
    setBackground(e.target.value);
    if (errors.background) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors.background;
        return newErrors;
      });
    }
  }, [errors]);

  const isGenerating = hierarchicalPlan?.generating || false;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-lg"
        onInteractOutside={(e) => {
          if (isGenerating) e.preventDefault();
        }}
        onEscapeKeyDown={(e) => {
          if (isGenerating) e.preventDefault();
        }}
      >
        {isGenerating ? (
          <>
            <DialogHeader>
              <DialogTitle>Building Your Plan...</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col items-center justify-center py-12">
              <div className="flex h-20 w-20 items-center justify-center">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
              </div>
              <div
                className="mt-6 text-center text-sm text-muted-foreground"
                aria-live="polite"
              >
                {ROTATING_MESSAGES[currentMessageIndex]}
              </div>
              <div className="mt-2 text-xs text-muted-foreground">
                This usually takes 30–60 seconds.
              </div>
            </div>
          </>
        ) : showConfirmReplace ? (
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
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Build Your Training Plan</DialogTitle>
              <DialogDescription>
                Tell us about your goal and schedule. Claude will design a personalized plan.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-6">
              {/* Field Group 1: Race Goal */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="race-name" className="text-sm font-semibold">
                    Target Race
                  </Label>
                  <Input
                    id="race-name"
                    placeholder="e.g. Boston Marathon"
                    value={raceName}
                    onChange={handleRaceNameChange}
                    disabled={isGenerating}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="race-date" className="text-sm font-semibold">
                    Race Date
                  </Label>
                  <Input
                    id="race-date"
                    type="date"
                    value={raceDate}
                    onChange={handleRaceDateChange}
                    disabled={isGenerating}
                    className="mt-1"
                  />
                  {errors.raceDate && (
                    <p className="mt-1 text-xs text-destructive">{errors.raceDate}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="goal-distance" className="text-sm font-semibold">
                    Goal Distance
                  </Label>
                  <Select value={goalDistance} onValueChange={handleGoalDistanceChange} disabled={isGenerating}>
                    <SelectTrigger id="goal-distance" className="mt-1">
                      <SelectValue placeholder="Select a distance" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5K">5K</SelectItem>
                      <SelectItem value="10K">10K</SelectItem>
                      <SelectItem value="Half Marathon">Half Marathon</SelectItem>
                      <SelectItem value="Marathon">Marathon</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.goalDistance && (
                    <p className="mt-1 text-xs text-destructive">{errors.goalDistance}</p>
                  )}
                </div>
              </div>

              {/* Field Group 2: Fitness Baseline */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="weekly-km" className="text-sm font-semibold">
                    Current Weekly Volume (km)
                  </Label>
                  <Input
                    id="weekly-km"
                    type="number"
                    placeholder="40"
                    value={weeklyKm}
                    onChange={handleWeeklyKmChange}
                    disabled={isGenerating}
                    className={weeklyKmPrefilled ? "mt-1 italic bg-muted" : "mt-1"}
                  />
                  {weeklyKmPrefilled && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Estimated from your recent Strava activities.
                    </p>
                  )}
                  {errors.weeklyKm && (
                    <p className="mt-1 text-xs text-destructive">{errors.weeklyKm}</p>
                  )}
                </div>
              </div>

              {/* Field Group 3: Weekly Constraints */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="days-per-week" className="text-sm font-semibold">
                    Training Days Per Week
                  </Label>
                  <Select value={daysPerWeek} onValueChange={handleDaysPerWeekChange} disabled={isGenerating}>
                    <SelectTrigger id="days-per-week" className="mt-1">
                      <SelectValue placeholder="Select number of days" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="3">3</SelectItem>
                      <SelectItem value="4">4</SelectItem>
                      <SelectItem value="5">5</SelectItem>
                      <SelectItem value="6">6</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.daysPerWeek && (
                    <p className="mt-1 text-xs text-destructive">{errors.daysPerWeek}</p>
                  )}
                </div>

                <div>
                  <Label className="text-sm font-semibold mb-2 block">
                    Preferred Hard Days
                  </Label>
                  <div className="grid grid-cols-2 gap-2">
                    {DAYS_OF_WEEK.map((day) => (
                      <button
                        key={day}
                        onClick={() => {
                          setHardDays((prev) =>
                            prev.includes(day)
                              ? prev.filter((d) => d !== day)
                              : [...prev, day]
                          );
                        }}
                        disabled={isGenerating}
                        className={`px-3 py-2 text-sm rounded-md border transition-colors ${
                          hardDays.includes(day)
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-background border-input hover:bg-accent"
                        } ${isGenerating ? "opacity-50 cursor-not-allowed" : ""}`}
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <Label htmlFor="rest-day" className="text-sm font-semibold">
                    Rest Day
                  </Label>
                  <Select value={restDay} onValueChange={setRestDay} disabled={isGenerating}>
                    <SelectTrigger id="rest-day" className="mt-1">
                      <SelectValue placeholder="Select a day" />
                    </SelectTrigger>
                    <SelectContent>
                      {DAYS_OF_WEEK.map((day) => (
                        <SelectItem key={day} value={day}>
                          {day}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Field Group 4: Background */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="background" className="text-sm font-semibold">
                    About Your Running Background
                  </Label>
                  <Textarea
                    id="background"
                    placeholder="E.g. Running 3 years, completed one half marathon, struggle with long easy paces..."
                    value={background}
                    onChange={handleBackgroundChange}
                    disabled={isGenerating}
                    className={`mt-1 ${backgroundPrefilled ? "italic bg-muted" : ""}`}
                    rows={4}
                  />
                  {backgroundPrefilled && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Loaded from your runner profile.
                    </p>
                  )}
                </div>
              </div>

              {/* Replace warning (only when plan exists) */}
              {hierarchicalPlan?.plan && !showConfirmReplace && (
                <div className="rounded-md border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
                  This will replace your current plan.
                </div>
              )}

              {/* Error state */}
              {hierarchicalPlan?.error && !isGenerating && (
                <div className="rounded-md border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
                  Plan generation failed. Check your connection and try again.
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isGenerating}
              >
                Back to Plan
              </Button>
              <Button
                variant="default"
                onClick={handleSubmit}
                disabled={isGenerating}
              >
                Generate Plan
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
