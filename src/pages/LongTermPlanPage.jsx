import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useAppData } from "../context/AppDataContext";
import { PlanViewer } from "../components/planner/PlanViewer";
import { WorkoutDetailModal } from "../components/planner/WorkoutDetailModal";
import { PlanIntakeModal } from "../components/PlanIntakeModal";
import { RaceLine } from "../components/ui/signature/RaceLine";
import { Button } from "@/components/ui/button";
import { Flag, Target, Zap, Utensils, Mountain } from "lucide-react";

function normalizeNumberField(value) {
  if (value === "" || value === null || typeof value === "undefined") return null;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
}

function RaceStrategyCard({ strategy }) {
  if (!strategy) return null;

  return (
    <div
      className="overflow-hidden rounded-[var(--radius-xl)]"
      style={{ background: "var(--surface)", boxShadow: "var(--shadow-lift)" }}
    >
      <div
        className="py-4 px-6 flex items-center gap-2"
        style={{ borderBottom: "1px solid rgba(11,23,56,0.06)" }}
      >
        <Flag className="w-4 h-4" style={{ color: "var(--accent-race)" }} />
        <span style={{ font: "var(--type-caption)", textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--ink)" }}>
          Race Strategy
        </span>
      </div>
      <div className="p-6 space-y-6">
        {strategy.event && (
          <div
            className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-xl"
            style={{ background: "var(--paper-raised)" }}
          >
            <div>
              <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: "var(--accent-race)" }}>Event</p>
              <p className="text-sm font-semibold" style={{ color: "var(--ink)" }}>{strategy.event.name}</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: "var(--accent-race)" }}>Distance</p>
                <p className="text-sm font-semibold" style={{ color: "var(--ink)" }}>{strategy.event.distance}</p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: "var(--accent-race)" }}>Type</p>
                <p className="text-sm font-semibold" style={{ color: "var(--ink)" }}>{strategy.event.type}</p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            {strategy.keyTactics && strategy.keyTactics.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Target className="w-4 h-4" style={{ color: "var(--signal-warn)" }} />
                  <span className="text-sm font-bold uppercase tracking-tight" style={{ color: "var(--ink)" }}>Key Tactics</span>
                </div>
                <ul className="space-y-2">
                  {strategy.keyTactics.map((tactic, i) => (
                    <li key={i} className="flex gap-2 text-sm" style={{ color: "var(--ink-muted)" }}>
                      <span className="shrink-0 w-1.5 h-1.5 rounded-full mt-1.5" style={{ background: "var(--signal-warn)" }} />
                      {tactic}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {strategy.pacing && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="w-4 h-4" style={{ color: "var(--accent-race)" }} />
                  <span className="text-sm font-bold uppercase tracking-tight" style={{ color: "var(--ink)" }}>Pacing</span>
                </div>
                <p className="text-sm leading-relaxed" style={{ color: "var(--ink-muted)" }}>{strategy.pacing}</p>
              </div>
            )}
          </div>

          <div className="space-y-4">
            {strategy.fueling && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Utensils className="w-4 h-4" style={{ color: "var(--signal-good)" }} />
                  <span className="text-sm font-bold uppercase tracking-tight" style={{ color: "var(--ink)" }}>Fueling</span>
                </div>
                <p className="text-sm leading-relaxed" style={{ color: "var(--ink-muted)" }}>{strategy.fueling}</p>
              </div>
            )}

            {strategy.terrain && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Mountain className="w-4 h-4" style={{ color: "var(--ink-muted)" }} />
                  <span className="text-sm font-bold uppercase tracking-tight" style={{ color: "var(--ink)" }}>Terrain</span>
                </div>
                <p className="text-sm leading-relaxed" style={{ color: "var(--ink-muted)" }}>{strategy.terrain}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function resolveWorkoutSelection(planData, selection) {
  if (!planData || !selection?.weekNumber || !selection?.dayDate || !selection?.workout?.id) {
    return selection ?? null;
  }

  const week = planData.weeks?.find((item) => item.weekNumber === selection.weekNumber);
  const day = week?.days?.find((item) => item.date === selection.dayDate);
  const workout = day?.workouts?.find((item) => item.id === selection.workout.id);

  if (!workout) return selection;

  return {
    ...selection,
    workout,
  };
}

export default function LongTermPlanPage() {
  const { plans, trainingBlocks, hierarchicalPlan } = useAppData();

  const [selectedPlanId, setSelectedPlanId] = useState(null);
  const [formError, setFormError] = useState(null);
  const [intakeOpen, setIntakeOpen] = useState(false);
  const [selectedWorkout, setSelectedWorkout] = useState(null);
  const [workoutSaving, setWorkoutSaving] = useState(false);

  useEffect(() => {
    if (!selectedPlanId && plans.plans.length > 0) {
      setSelectedPlanId(plans.plans[0].id);
    }
  }, [plans.plans, selectedPlanId]);

  const planData = hierarchicalPlan?.plan?.plan_data ?? null;

  const raceLineWeeks = useMemo(() => {
    if (!planData) return [];
    const phases = planData.phases ?? [];
    return (planData.weeks ?? []).map((week) => {
      const mileage = (week.days ?? []).reduce(
        (sum, day) => sum + (day.workouts ?? []).reduce((s, w) => s + (w.distanceKm || 0), 0),
        0,
      );
      const phase = phases.find((p) => week.weekNumber >= p.startWeek && week.weekNumber <= p.endWeek);
      return { weekNumber: week.weekNumber, mileage, phase: phase?.name ?? "Base" };
    });
  }, [planData]);

  const handleViewerWorkoutSelect = useCallback((selection) => {
    setSelectedWorkout(selection ?? null);
  }, []);

  const handleWorkoutToggleCompleted = useCallback(async () => {
    if (!selectedWorkout?.workout?.id || !selectedWorkout?.weekNumber || !selectedWorkout?.dayDate) return;

    setWorkoutSaving(true);
    try {
      const updatedPlanData = await hierarchicalPlan.toggleWorkoutCompleted(
        selectedWorkout.workout.id,
        selectedWorkout.weekNumber,
        selectedWorkout.dayDate,
      );
      setSelectedWorkout((current) => resolveWorkoutSelection(updatedPlanData, current));
    } catch (err) {
      setFormError(err.message);
    } finally {
      setWorkoutSaving(false);
    }
  }, [hierarchicalPlan, selectedWorkout]);

  const handleWorkoutSave = useCallback(async (values) => {
    if (!selectedWorkout?.workout?.id || !selectedWorkout?.weekNumber || !selectedWorkout?.dayDate) return;

    setWorkoutSaving(true);
    setFormError(null);

    try {
      const patchPayload = [
        {
          week: selectedWorkout.weekNumber,
          dayDate: selectedWorkout.dayDate,
          workoutId: selectedWorkout.workout.id,
          fields: {
            sport: values.sport,
            type: values.type,
            name: values.name,
            description: values.description,
            durationMinutes: normalizeNumberField(values.durationMinutes),
            distanceKm: normalizeNumberField(values.distanceKm),
          },
        },
      ];

      const updatedPlanData = await hierarchicalPlan.applyPatch(patchPayload);
      setSelectedWorkout((current) => resolveWorkoutSelection(updatedPlanData, current));
      setSelectedWorkout(null);
    } catch (err) {
      setFormError(err.message);
      throw err;
    } finally {
      setWorkoutSaving(false);
    }
  }, [hierarchicalPlan, selectedWorkout]);

  function handleReplanAI() {
    window.dispatchEvent(new CustomEvent("rs:coach-ask", {
      detail: "Jeg vil gjennomgå treningsplanen min. Kan du se på progresjonen og belastningen og foreslå justeringer?"
    }));
  }

  return (
    <div className="canvas">
      {/* Page header */}
      <div className="full" style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16 }}>
        <div>
          <p className="cc-label" style={{ marginBottom: 4 }}>Treningsplan</p>
          <h1 className="display-md" style={{ margin: 0 }}>Treningsplan</h1>
          <p className="body-sm" style={{ marginTop: 6 }}>Faser og treningsblokker mot målløpet ditt.</p>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexShrink: 0 }}>
          {hierarchicalPlan?.plan && (
            <button
              type="button"
              onClick={handleReplanAI}
              style={{
                background: "var(--primary)",
                color: "#fff",
                border: 0,
                borderRadius: "var(--r-md)",
                padding: "9px 18px",
                fontFamily: "var(--ff-display)",
                fontWeight: 600,
                fontSize: 13,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 7,
              }}
            >
              <span>✦</span>
              Replanlegg med AI
            </button>
          )}
          <Button variant="outline" size="sm" onClick={() => setIntakeOpen(true)}>
            Generer ny plan
          </Button>
        </div>
      </div>

      {/* Plan Section */}
      <div className="panel full" style={{ gap: 20 }}>
        {hierarchicalPlan?.loading ? (
          <div className="text-center py-8">
            <p className="text-sm" style={{ color: "var(--ink-muted)" }}>Loading plan…</p>
          </div>
        ) : hierarchicalPlan?.error && !hierarchicalPlan?.plan ? (
          <div className="text-center py-8">
            <p className="text-sm mb-4" style={{ color: "var(--signal-risk)" }}>
              Could not load your plan. Refresh to try again.
            </p>
            <Button onClick={() => window.location.reload()}>Refresh Page</Button>
          </div>
        ) : hierarchicalPlan?.plan === null ? (
          <div className="text-center py-12">
            <p style={{ font: "var(--type-headline-italic)", color: "var(--ink)", marginBottom: 8 }}>
              No training plan yet.
            </p>
            <p className="text-sm mb-6" style={{ color: "var(--ink-muted)" }}>
              Generate your first plan to get started.
            </p>
            <Button onClick={() => setIntakeOpen(true)}>Generate Plan</Button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Plan meta header */}
            <div>
              <span
                className="block mb-1"
                style={{ font: "var(--type-caption)", textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--ink-muted)" }}
              >
                Goal race
              </span>
              <p style={{ font: "var(--type-headline-italic)", color: "var(--ink)", margin: 0 }}>
                {planData?.raceGoal?.eventName || planData?.meta?.event || "Training Plan"}
              </p>
              {(planData?.raceGoal?.eventDate || planData?.meta?.eventDate) && (
                <p
                  className="mt-1"
                  style={{ fontFamily: "var(--font-family-mono)", fontSize: 12, color: "var(--accent-race)" }}
                >
                  {new Date(planData.raceGoal?.eventDate || planData.meta?.eventDate).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
              )}
            </div>

            {raceLineWeeks.length > 1 && (
                <div className="mb-4 rounded-lg overflow-hidden" style={{ background: "var(--paper-raised)" }}>
                  <RaceLine weeks={raceLineWeeks} height={72} />
                </div>
              )}

              <PlanViewer
                planData={planData}
                onWorkoutSelect={handleViewerWorkoutSelect}
                ribbonLayout
              />

            {planData?.raceStrategy && (
              <div className="mt-8">
                <RaceStrategyCard strategy={planData.raceStrategy} />
              </div>
            )}
          </div>
        )}
      </div>

      <PlanIntakeModal open={intakeOpen} onOpenChange={setIntakeOpen} />
      <WorkoutDetailModal
        open={Boolean(selectedWorkout)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedWorkout(null);
            setWorkoutSaving(false);
          }
        }}
        selection={selectedWorkout}
        saving={workoutSaving}
        onToggleCompleted={handleWorkoutToggleCompleted}
        onSave={handleWorkoutSave}
      />

    </div>
  );
}
