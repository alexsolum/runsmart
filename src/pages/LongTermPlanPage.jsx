import React, { useCallback, useEffect, useState } from "react";
import { useAppData } from "../context/AppDataContext";
import { useI18n } from "../i18n/translations";
import PageContainer from "../components/layout/PageContainer";
import { PlanViewer } from "../components/planner/PlanViewer";
import { WorkoutDetailModal } from "../components/planner/WorkoutDetailModal";
import { PlanIntakeModal } from "../components/PlanIntakeModal";
import { CoachFAB } from "../components/CoachFAB";
import { Button } from "@/components/ui/button";

function normalizeNumberField(value) {
  if (value === "" || value === null || typeof value === "undefined") return null;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
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
  const { auth, plans, trainingBlocks, hierarchicalPlan, coachConversations, activities, dailyLogs, checkins, runnerProfile } = useAppData();
  const { lang } = useI18n();

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

  return (
    <PageContainer>
      <div className="mb-5">
        <h2 className="m-0 mb-1 text-2xl font-bold font-sans text-slate-900">Training Plan</h2>
        <p className="m-0 text-sm text-slate-500">Build your macro plan — phases and training blocks towards your goal race.</p>
      </div>

      {/* Hierarchical Plan Section */}
      <div className="mb-8 bg-white border border-slate-200 rounded-2xl p-6">
        {hierarchicalPlan?.loading ? (
          <div className="text-center py-8">
            <p className="text-sm text-slate-500">Loading plan...</p>
          </div>
        ) : hierarchicalPlan?.error && !hierarchicalPlan?.plan ? (
          <div className="text-center py-8">
            <p className="text-sm text-destructive mb-4">Could not load your plan. Refresh to try again.</p>
            <Button onClick={() => window.location.reload()}>Refresh Page</Button>
          </div>
        ) : hierarchicalPlan?.plan === null ? (
          <div className="text-center py-12">
            <h3 className="text-lg font-semibold mb-2">No training plan yet.</h3>
            <p className="text-muted-foreground mb-6">Generate your first plan to get started.</p>
            <Button onClick={() => setIntakeOpen(true)}>Generate Plan</Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">Generated plan</p>
                <h3 className="text-xl font-semibold text-slate-950">
                  {planData?.raceGoal?.eventName || planData?.meta?.event || "Training Plan"}
                </h3>
                <p className="mt-2 text-sm text-slate-500">
                  {(planData?.raceGoal?.eventDate || planData?.meta?.eventDate)
                    ? new Date(planData.raceGoal?.eventDate || planData.meta?.eventDate).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })
                    : "Race date not set"}
                </p>
              </div>
              <Button variant="outline" onClick={() => setIntakeOpen(true)}>
                Regenerate Plan
              </Button>
            </div>

            <PlanViewer
              planData={planData}
              onWorkoutSelect={handleViewerWorkoutSelect}
            />
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

      {/* Coach FAB — keep coach entry reachable even before a plan exists */}
      {auth?.user && (
        <CoachFAB
          coachConversations={coachConversations}
          hierarchicalPlan={hierarchicalPlan}
          activities={activities}
          dailyLogs={dailyLogs}
          checkins={checkins}
          runnerProfile={runnerProfile}
          trainingBlocks={trainingBlocks}
          activePlan={plans.plans[0] ?? null}
          lang={lang}
          canPatchPlan={Boolean(hierarchicalPlan.plan)}
        />
      )}
    </PageContainer>
  );
}
