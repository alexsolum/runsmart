/**
 * Control Center — enterprise / Blue Yonder-inspired planning UI.
 *
 * Phase 2 refactor: wires the remaining dummy sections to real data
 * sources. See CONTROL_CENTER_BACKLOG.md for what's still missing.
 *
 * Data sources:
 *   - Training plan, weekly schedule, phases, race strategy →
 *     hierarchical_plans.plan_data, consumed via buildPlanPageModel().
 *   - CTL / ATL / TSB, weekly volume, HR zones → src/domain/compute.js.
 *   - Races + participations → races + race_participations (via useRaces).
 *   - Wellness → checkins.
 *   - AI chat → claude-coach edge function with sessionId persistence
 *     through useCoachConversations.
 */
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import L from "leaflet";
import { MapContainer, Marker, Popup, TileLayer, Tooltip, Polyline, CircleMarker, useMap } from "react-leaflet";
import { useAppData } from "../context/AppDataContext";
import {
  computeTrainingLoad,
  computeWeeklySummary,
  computeWeeklyHRZones,
  computeTrainingLoadState,
  computeLongRuns,
  computeEnduranceEfficiency,
  generateCoachingInsights,
} from "../domain/compute";
import {
  buildPlanPageModel,
  localTodayIso,
} from "../components/planner/planPageModel";
import { WORKOUT_TYPES, normalizeWorkoutType } from "../domain/workoutTypes";
import { getSupabaseClient } from "../lib/supabaseClient";
import { invokeEdgeFunctionWithSessionRetry } from "../lib/edgeFunctionAuth";
import RaceFormDialog from "../components/races/RaceFormDialog";
import ParticipationFormDialog from "../components/races/ParticipationFormDialog";
import AddRaceToSeasonDialog from "../components/races/AddRaceToSeasonDialog";
import {
  validateSeasonGaps,
  deriveSeasonGoalRace,
  formatTypicalSchedule,
  pickActivePlan,
  sortSeasonRaces,
} from "../domain/seasonPlan";
import "../styles/controlCenter.css";

/* ────────────────────────────────────────────────────────────────────────── */
/* Module registry                                                            */
/* ────────────────────────────────────────────────────────────────────────── */
const MODULES = [
  { id: "home",      label: "Oversikt",      icon: "▦" },
  { id: "plan",      label: "Treningsplan",  icon: "⊞" },
  { id: "analytics", label: "Coaching",      icon: "↗" },
  { id: "races",     label: "Løpssenter",    icon: "◈" },
  { id: "dailylog",  label: "Dagslogg",      icon: "◻" },
  { id: "coach",     label: "AI-trener",     icon: "✦" },
];
const PAGE_LABELS = {
  home: "Oversikt",
  plan: "Treningsplan",
  analytics: "Coaching og analyse",
  races: "Løpssenter",
  dailylog: "Dagslogg",
  coach: "AI-trener",
};

/* Phase visual mapping */
const PHASE_STYLE = {
  Base:   { c: "#465a6e", bg: "#e8ecf2", tag: "pt-base"  },
  Build:  { c: "#1850a0", bg: "#d8e8f8", tag: "pt-build" },
  Peak:   { c: "#5028a0", bg: "#ede0f8", tag: "pt-peak"  },
  Taper:  { c: "#b85000", bg: "#fde8d0", tag: "pt-taper" },
  Race:   { c: "#a01820", bg: "#fad8da", tag: "pt-race"  },
};
function phaseStyleFor(name) {
  if (!name) return PHASE_STYLE.Base;
  const key = Object.keys(PHASE_STYLE).find((k) => name.startsWith(k));
  return PHASE_STYLE[key] || PHASE_STYLE.Base;
}
function phaseClassFor(name) { return phaseStyleFor(name).tag; }

/* Workout type visual mapping — covers canonical types from planSchema */
const TYPE_COLORS = {
  Easy:           { c: "#1850a0", bg: "#d8e8f8" },
  Intervals:      { c: "#a01820", bg: "#fad8da" },
  Threshold:      { c: "#b85000", bg: "#fde8d0" },
  Tempo:          { c: "#b85000", bg: "#fde8d0" },
  "Steady State": { c: "#1a5fb4", bg: "#dbe7f5" },
  Long:           { c: "#5028a0", bg: "#ede0f8" },
  "Long Run":     { c: "#5028a0", bg: "#ede0f8" },
  Hike:           { c: "#1b6b3a", bg: "#e6f4ec" },
  Recovery:       { c: "#7a9eb0", bg: "#e4eaf0" },
  Strength:       { c: "#5c3a1a", bg: "#eee2d3" },
  "Cross-Train":  { c: "#5c3a1a", bg: "#eee2d3" },
  Race:           { c: "#a01820", bg: "#fad8da" },
  "Race/Event":   { c: "#a01820", bg: "#fad8da" },
  Rest:           { c: "#8a9eb0", bg: "#e8ecf2" },
};
const WORKOUT_TYPE_VALUE_BY_KEY = {
  EASY: "Easy",
  LONG_RUN: "Long Run",
  TEMPO: "Tempo",
  INTERVALS: "Intervals",
  STEADY_STATE: "Steady State",
  RECOVERY: "Recovery",
  STRENGTH: "Strength",
  CROSS_TRAIN: "Cross-Train",
  REST: "Rest",
  RACE_EVENT: "Race/Event",
};
const WORKOUT_TYPE_OPTIONS = Object.entries(WORKOUT_TYPES).map(([key, meta]) => ({
  key,
  value: WORKOUT_TYPE_VALUE_BY_KEY[key] ?? meta.label,
  label: meta.label,
  group: meta.group,
}));
const WORKOUT_TYPE_VALUES = new Set(WORKOUT_TYPE_OPTIONS.map((option) => option.value));

function normalizePlanWorkoutType(type, workout = {}) {
  if (WORKOUT_TYPE_VALUES.has(type)) return type;
  const inferredKey = normalizeWorkoutType(`${type ?? ""} ${workout.name ?? ""} ${workout.description ?? ""}`);
  return WORKOUT_TYPE_VALUE_BY_KEY[inferredKey] ?? WORKOUT_TYPE_VALUE_BY_KEY.EASY;
}
function typeStyleFor(type) {
  return TYPE_COLORS[normalizePlanWorkoutType(type)] || TYPE_COLORS.Easy;
}
function isRestType(type) {
  return !type || normalizePlanWorkoutType(type) === "Rest";
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Small helpers duplicated from src/components/races (not exported there)   */
/* ────────────────────────────────────────────────────────────────────────── */
function formatFinishTime(t) {
  if (!t) return "—";
  return String(t).replace(/^0+(?=\d{2}:)/, "");
}
function dreamStatus(race) {
  const raw = race?.status ?? race?.registration_status;
  if (!raw) return "Ønske";
  const n = String(raw).toLowerCase();
  if (n.includes("lotto")) return "Lotteri";
  if (n.includes("registered") || n.includes("signed")) return "Påmeldt";
  return String(raw);
}
function dreamStatusTagClass(label) {
  if (label === "Påmeldt") return "st-ok";
  if (label === "Lotteri") return "st-warn";
  return "st-neutral";
}
function shortDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("nb-NO", { month: "short", day: "numeric", timeZone: "UTC" });
}
function daysUntil(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return Math.round((d.getTime() - Date.now()) / 86400000);
}
function hm(minutes) {
  if (!minutes) return "—";
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}
function formatPaceFromSpeed(avgSpeed) {
  if (!avgSpeed || avgSpeed <= 0) return "—";
  const paceSeconds = 1000 / avgSpeed;
  const mins = Math.floor(paceSeconds / 60);
  const secs = Math.round(paceSeconds % 60);
  return `${mins}:${String(secs).padStart(2, "0")} /km`;
}
function hasRaceCoordinates(race) {
  const latitude = Number(race?.latitude);
  const longitude = Number(race?.longitude);
  return Number.isFinite(latitude) && Number.isFinite(longitude);
}
function raceMapState(race) {
  return (race?.race_participations?.length ?? 0) > 0 ? "done" : "bucket-list";
}
function latestParticipation(race) {
  return [...(race?.race_participations ?? [])]
    .sort((a, b) => new Date(b.race_date ?? 0) - new Date(a.race_date ?? 0))[0] ?? null;
}
function raceYear(iso) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "Ukjent år" : String(d.getUTCFullYear());
}

function useMediaQuery(query) {
  const getMatches = () => (
    typeof window !== "undefined"
      && typeof window.matchMedia === "function"
      && window.matchMedia(query).matches
  );
  const [matches, setMatches] = useState(getMatches);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return undefined;
    }

    const media = window.matchMedia(query);
    const update = () => setMatches(media.matches);

    update();
    if (typeof media.addEventListener === "function") {
      media.addEventListener("change", update);
      return () => media.removeEventListener("change", update);
    }
    media.addListener?.(update);
    return () => media.removeListener?.(update);
  }, [query]);

  return matches;
}

function fmtLogDate(iso) {
  if (!iso) return "—";
  const d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("nb-NO", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

/* ────────────────────────────────────────────────────────────────────────── */
/* SVG primitives                                                              */
/* ────────────────────────────────────────────────────────────────────────── */
function SvgLine({ series, w = 600, h = 90, colors = ["#1a5fb4"], fills = ["rgba(26,95,180,0.08)"], gridLines = true }) {
  if (!series?.length || !series[0]?.length) return null;
  const allV = series.flat().filter((v) => v != null);
  const min = Math.min(...allV), max = Math.max(...allV), range = max - min || 1;
  const padT = 10, padB = 4;
  const tx = (i, n) => (i / (n - 1 || 1)) * w;
  const ty = (v) => padT + (1 - (v - min) / range) * (h - padT - padB);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", height: h, display: "block" }}>
      {gridLines && [0, 0.25, 0.5, 0.75, 1].map((t) => (
        <line key={t} x1={0} y1={padT + (1 - t) * (h - padT - padB)} x2={w} y2={padT + (1 - t) * (h - padT - padB)} stroke="#e8ecf2" strokeWidth="1" />
      ))}
      {fills.map((fill, si) => {
        const d = series[si]; if (!d) return null;
        const pts = d.map((v, i) => [tx(i, d.length), ty(v)]);
        const lp = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
        return <path key={si} d={lp + ` L${w},${h} L0,${h} Z`} fill={fill} />;
      })}
      {colors.map((color, si) => {
        const d = series[si]; if (!d) return null;
        const pts = d.map((v, i) => [tx(i, d.length), ty(v)]);
        const lp = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
        return <path key={si} d={lp} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />;
      })}
    </svg>
  );
}

function SvgBars({ data, w = 600, h = 70, color = "#1a5fb4" }) {
  if (!data?.length) return null;
  const max = Math.max(...data, 1), gap = 3;
  const bw = (w - gap * (data.length - 1)) / data.length;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", height: h, display: "block" }}>
      {data.map((v, i) => {
        const bh = (v / max) * (h - 2), x = i * (bw + gap);
        return <rect key={i} x={x} y={h - bh} width={bw} height={bh} fill={i === data.length - 1 ? color : color + "88"} />;
      })}
    </svg>
  );
}

const ZONE_COLORS = ["#7a9eb0", "#2e7d32", "#1a5fb4", "#b85000", "#a01820"];
const ZONE_LABELS = ["Z1 Restitusjon", "Z2 Aerob", "Z3 Tempo", "Z4 Terskel", "Z5 VO₂max"];
function SvgStackedBars({ weeks }) {
  if (!weeks?.length) return null;
  const w = 560, h = 100, keys = ["z1", "z2", "z3", "z4", "z5"];
  const totals = weeks.map((wk) => keys.reduce((s, k) => s + (wk[k] || 0), 0));
  const max = Math.max(...totals, 1);
  const gap = 4, bw = (w - gap * (weeks.length - 1)) / weeks.length;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", height: h, display: "block" }}>
      {weeks.map((wk, i) => {
        const x = i * (bw + gap);
        let y = h;
        return keys.map((k, ki) => {
          const val = wk[k] || 0;
          const bh = (val / max) * h;
          y -= bh;
          return <rect key={ki} x={x} y={y} width={bw} height={bh} fill={ZONE_COLORS[ki]} />;
        });
      })}
    </svg>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Data derivation                                                            */
/* ────────────────────────────────────────────────────────────────────────── */

function deriveBlocksFromPhases(phases) {
  if (!Array.isArray(phases) || phases.length === 0) return [];
  return phases.map((p) => ({
    name:   p.name,
    start:  p.startWeek,
    weeks:  (p.endWeek - p.startWeek + 1) || 1,
    focus:  p.focus ?? "",
    color:  phaseStyleFor(p.name).c,
  }));
}

function deriveSeasonState({ planData, currentWeek }) {
  const phases = planData?.phases ?? [];
  const weeks  = planData?.weeks ?? [];
  const blocks = deriveBlocksFromPhases(phases);
  const totalWeeks = weeks.length || blocks.reduce((s, b) => s + b.weeks, 0);
  const currentWeekNum = currentWeek?.weekNumber ?? 0;
  const currentBlock = blocks.find((b) => currentWeekNum >= b.start && currentWeekNum < b.start + b.weeks)
    ?? blocks[0]
    ?? { name: "Ingen plan", start: 0, weeks: 0, color: "#8a9eb0" };
  return {
    blocks, totalWeeks,
    currentWeek: currentWeekNum,
    currentBlock,
    hasPlan: weeks.length > 0,
  };
}

function deriveGoalRace(planData, races, seasonPlans) {
  const today = new Date();
  // Highest precedence: A-priority race in the active season plan.
  const activePlan = pickActivePlan(seasonPlans ?? []);
  const seasonGoal = deriveSeasonGoalRace(activePlan);
  if (seasonGoal?.race && seasonGoal.target_date) {
    const target = new Date(seasonGoal.target_date);
    const days = Math.max(0, Math.round((target - today) / 86400000));
    return {
      name: seasonGoal.race.name,
      date: seasonGoal.target_date,
      distance: seasonGoal.race.distance_km,
      elevation: seasonGoal.race.elevation_gain_m,
      daysToRace: days,
      priority: seasonGoal.priority,
      sourcedFrom: "season_plan",
    };
  }
  // Fallback 1: training plan meta.event.
  const meta = planData?.meta;
  const raceStrat = planData?.raceStrategy?.event;
  if (meta?.event && meta?.eventDate) {
    const target = new Date(meta.eventDate);
    const days = Math.max(0, Math.round((target - today) / 86400000));
    return {
      name: meta.event,
      date: meta.eventDate,
      distance: raceStrat?.distance ?? null,
      daysToRace: days,
      sourcedFrom: "training_plan",
    };
  }
  // Fallback 2: nearest future race in the catalog.
  const future = (races ?? []).filter((r) => r.next_race_date && new Date(r.next_race_date) >= today);
  future.sort((a, b) => new Date(a.next_race_date) - new Date(b.next_race_date));
  const goal = future[0];
  if (!goal) return null;
  const target = new Date(goal.next_race_date);
  const days = Math.max(0, Math.round((target - today) / 86400000));
  return {
    name: goal.name,
    date: goal.next_race_date,
    distance: goal.distance_km,
    elevation: goal.elevation_gain_m,
    daysToRace: days,
    sourcedFrom: "races_catalog",
  };
}

function deriveTrainingLoad(activities) {
  const series = computeTrainingLoad(activities ?? []);
  if (!series.length) return { series: [], ctl: 0, atl: 0, tsb: 0, state: null };
  const latest = series[series.length - 1];
  return {
    series,
    ctl: Math.round(latest.ctl),
    atl: Math.round(latest.atl),
    tsb: Math.round(latest.tsb),
    state: computeTrainingLoadState(series),
  };
}

function deriveWeeklyKmSeries(activities, n = 12) {
  const summary = computeWeeklySummary(activities ?? []);
  const entries = Object.entries(summary)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([, w]) => Math.round((Number(w.distance) || 0) / 1000));
  const tail = entries.slice(-n);
  return tail.length ? tail : Array(n).fill(0);
}

function deriveHrZones(activities, n = 8) {
  const raw = computeWeeklyHRZones(activities ?? []);
  return raw.slice(-n).map((w) => ({
    w: w.weekStart,
    z1: Math.round((w.z1 || 0) / 60),
    z2: Math.round((w.z2 || 0) / 60),
    z3: Math.round((w.z3 || 0) / 60),
    z4: Math.round((w.z4 || 0) / 60),
    z5: Math.round((w.z5 || 0) / 60),
  }));
}

// A week "counts" toward consistency if the athlete has ≥1 check-in OR
// ≥1 completed workout in the plan that week OR ≥1 recorded activity.
function deriveConsistency({ planData, checkins, activities, n = 8 }) {
  const weekStarts = []; // last n week-starts (Monday), ISO date
  const today = new Date();
  // Snap today back to Monday in UTC
  const monday = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  const dow = (monday.getUTCDay() + 6) % 7;
  monday.setUTCDate(monday.getUTCDate() - dow);
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(monday);
    d.setUTCDate(monday.getUTCDate() - i * 7);
    weekStarts.push(d.toISOString().slice(0, 10));
  }
  const weekEnd = (start) => {
    const d = new Date(start);
    d.setUTCDate(d.getUTCDate() + 6);
    return d.toISOString().slice(0, 10);
  };

  // Map each week-start to a "hit" boolean
  const hits = weekStarts.map((ws) => {
    const we = weekEnd(ws);
    const hasCheckin = (checkins ?? []).some((c) => {
      const iso = (c.week_start ?? c.weekStart ?? c.createdAt ?? "").toString().slice(0, 10);
      return iso >= ws && iso <= we;
    });
    const hasActivity = (activities ?? []).some((a) => {
      const iso = (a.started_at ?? "").toString().slice(0, 10);
      return iso >= ws && iso <= we;
    });
    const planWeek = (planData?.weeks ?? []).find((w) => w.startDate === ws);
    const hasCompletedPlan = planWeek?.days?.some((d) => d.workouts?.some((w) => w.completed)) ?? false;
    return hasCheckin || hasActivity || hasCompletedPlan;
  });
  const count = hits.filter(Boolean).length;
  return { count, total: n, pct: Math.round((count / n) * 100) };
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Shared shell                                                                */
/* ────────────────────────────────────────────────────────────────────────── */
function AppBar({ athlete, load, goalRace, page }) {
  return (
    <div className="app-bar">
      <div className="app-bar-logo">
        <div className="app-logo-mark">RS</div>
        <div className="app-logo-text">Run<span>Smart</span></div>
      </div>
      <div className="app-bar-breadcrumb">
        <span>Treningsplanlegging og analyse</span>
        <span className="sep">›</span>
        <span className="current">{PAGE_LABELS[page]}</span>
      </div>
      <div className="app-bar-right">
        <div className="app-bar-chip">
          <span>Løpsdag:</span>
          <span className="chip-val">{goalRace ? `${goalRace.daysToRace}d` : "—"}</span>
        </div>
        <div className="app-bar-chip">
          <span>CTL/ATL:</span>
          <span className="chip-val">{load.ctl}/{load.atl}</span>
        </div>
        <div className="app-bar-user">
          <div className="user-avatar">{athlete.initials}</div>
          <div className="user-name">{athlete.name}</div>
        </div>
      </div>
    </div>
  );
}

function ModuleTabs({ page, setPage }) {
  return (
    <div className="module-tabs">
      {MODULES.map((m) => (
        <button
          key={m.id}
          type="button"
          className={`module-tab${page === m.id ? " active" : ""}`}
          onClick={() => setPage(m.id)}
        >
          <span style={{ fontSize: 12, opacity: 0.8 }}>{m.icon}</span>
          {m.label}
        </button>
      ))}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Status mapping                                                              */
/* ────────────────────────────────────────────────────────────────────────── */
function statusTag(dayStatus, isToday, isRest) {
  if (isRest) return { cls: "st-neutral", label: "Hvile" };
  if (dayStatus === "completed") return { cls: "st-ok",      label: "✓ Utført" };
  if (isToday)                   return { cls: "st-info",    label: "→ I dag" };
  if (dayStatus === "partial")   return { cls: "st-warn",    label: "Delvis" };
  if (dayStatus === "missed")    return { cls: "st-alert",   label: "Misset" };
  return { cls: "st-neutral", label: "Planlagt" };
}

function pickPrimary(workouts) {
  if (!workouts || workouts.length === 0) return null;
  // Prefer not-completed first (= the "up next" workout), else first.
  return workouts.find((w) => !w.completed) ?? workouts[0];
}

function activityDate(activity) {
  const raw = activity?.started_at ?? activity?.start_date_local ?? activity?.start_date ?? activity?.date ?? null;
  return raw ? String(raw).slice(0, 10) : null;
}

function activityDistanceKm(activity) {
  const meters = Number(activity?.distance) || 0;
  return meters > 0 ? meters / 1000 : 0;
}

function formatKm(value) {
  const km = Number(value) || 0;
  if (km <= 0) return "—";
  return `${Number.isInteger(km) ? km : km.toFixed(1)} km`;
}

function formatActivityDuration(activity) {
  const seconds = Number(activity?.moving_time) || Number(activity?.elapsed_time) || 0;
  return seconds > 0 ? hm(seconds / 60) : "—";
}

function formatPlanSummary(workout) {
  if (!workout) return "Hvile";
  const bits = [workout.name ?? workout.type ?? "Planlagt økt"];
  if (workout.distanceKm) bits.push(formatKm(workout.distanceKm));
  if (workout.primaryZone) bits.push(workout.primaryZone);
  return bits.join(" · ");
}

function formatActivitySummary(activity) {
  if (!activity) return "—";
  const bits = [activity.name ?? activity.type ?? "Utført økt"];
  const km = activityDistanceKm(activity);
  if (km) bits.push(formatKm(km));
  const duration = formatActivityDuration(activity);
  if (duration !== "—") bits.push(duration);
  return bits.join(" · ");
}

function formatLastSync(iso) {
  if (!iso) return "Aldri synket";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return String(iso);
  return date.toLocaleString("nb-NO", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function buildActivityMap(activities) {
  const map = new Map();
  (activities ?? []).forEach((activity) => {
    const iso = activityDate(activity);
    if (!iso) return;
    const existing = map.get(iso) ?? [];
    existing.push(activity);
    map.set(iso, existing);
  });
  return map;
}

function rollingFourWeeks(weeks, currentWeekNumber) {
  const allWeeks = Array.isArray(weeks) ? weeks : [];
  if (allWeeks.length <= 4) return allWeeks;
  const currentIndex = Math.max(0, allWeeks.findIndex((week) => week.weekNumber === currentWeekNumber));
  const forward = allWeeks.slice(currentIndex, currentIndex + 4);
  if (forward.length === 4) return forward;
  return allWeeks.slice(Math.max(0, allWeeks.length - 4));
}

function buildScheduleWeeks({ planData, currentWeek, activities, todayIso, view }) {
  const activityMap = buildActivityMap(activities);
  const allWeeks = planData?.weeks ?? [];
  const sourceWeeks = view === "month"
    ? rollingFourWeeks(allWeeks, currentWeek?.weekNumber)
    : currentWeek
      ? [currentWeek]
      : [];

  return sourceWeeks.map((week) => ({
    ...week,
    days: (week.days ?? [])
      .filter((day) => view !== "today" || day.date === todayIso)
      .map((day) => {
        const workouts = day.workouts ?? [];
        const planned = pickPrimary(workouts);
        const executed = activityMap.get(day.date) ?? [];
        const actual = executed[0] ?? null;
        const hasPlan = Boolean(planned && !isRestType(planned.type));
        const isPast = day.date < todayIso;
        const executedSummary = executed.length > 1 ? `${executed.length} utførte økter` : "";
        const primaryName = isPast && actual
          ? (actual.name ?? "Utført økt")
          : planned?.name ?? (actual?.name ?? "Hviledag");
        const secondary = actual && hasPlan
          ? isPast
            ? `Plan: ${formatPlanSummary(planned)}`
            : `Utført: ${formatActivitySummary(actual)}`
          : hasPlan
            ? `Plan: ${formatPlanSummary(planned)}`
            : actual
              ? `Utført: ${formatActivitySummary(actual)}`
              : "";
        const status = actual && hasPlan
          ? "completed"
          : actual
            ? "extra"
            : hasPlan && isPast
              ? "missed"
              : hasPlan
                ? "planned"
                : "rest";

        return {
          ...day,
          workouts,
          planned,
          executed,
          actual,
          executedSummary,
          primaryName,
          secondary,
          status,
          isToday: day.date === todayIso,
        };
      }),
  })).filter((week) => week.days.length > 0);
}

function scheduleStatusTag(row) {
  if (row.status === "completed") return { cls: "st-ok", label: "Utført" };
  if (row.status === "extra") return { cls: "st-info", label: "Ekstra økt" };
  if (row.status === "missed") return { cls: "st-alert", label: "Misset" };
  if (row.status === "planned") return { cls: "st-neutral", label: row.isToday ? "→ I dag" : "Planlagt" };
  return { cls: "st-neutral", label: "Hvile" };
}

/* ────────────────────────────────────────────────────────────────────────── */
/* DASHBOARD                                                                   */
/* ────────────────────────────────────────────────────────────────────────── */
function DashboardPage({ athlete, load, goalRace, season, weeklyKm, planPageModel, consistency, planData, activities, strava, races, seasonPlans, onNavigate }) {
  const activeSeasonPlan = useMemo(() => pickActivePlan(seasonPlans), [seasonPlans]);
  const seasonRows = useMemo(() => sortSeasonRaces(activeSeasonPlan?.season_plan_races), [activeSeasonPlan]);
  const seasonGaps = useMemo(() => validateSeasonGaps(seasonRows), [seasonRows]);

  // Fallback list of upcoming races (used when no season plan is active).
  const upcomingRaces = useMemo(() => {
    const today = Date.now();
    return (races ?? [])
      .filter((r) => r.next_race_date && new Date(r.next_race_date).getTime() >= today)
      .sort((a, b) => new Date(a.next_race_date) - new Date(b.next_race_date))
      .slice(0, 5);
  }, [races]);
  const days = planPageModel?.currentWeekDays ?? [];
  const [dashboardView, setDashboardView] = useState("week");
  const [selectedDate, setSelectedDate] = useState(days.find((d) => d.isToday)?.date ?? days[0]?.date ?? null);
  const selDay = days.find((d) => d.date === selectedDate) ?? days[0] ?? null;
  const ctlSeries = load.series.slice(-90).map((p) => p.ctl);
  const atlSeries = load.series.slice(-90).map((p) => p.atl);

  const weekTotal = days.reduce((s, d) => s + (pickPrimary(d.workouts)?.distanceKm ?? 0), 0);
  const weekRange = days.length
    ? `${shortDate(days[0].date)} – ${shortDate(days[days.length - 1].date)}`
    : "Ingen plan";

  // Today's workout preview card
  const today = days.find((d) => d.isToday) ?? null;
  const todayPrimary = today ? pickPrimary(today.workouts) : null;
  const todayStyle = todayPrimary ? typeStyleFor(todayPrimary.type) : typeStyleFor("Easy");
  const scheduleWeeks = useMemo(() => buildScheduleWeeks({
    planData,
    currentWeek: planPageModel?.currentWeek,
    activities,
    todayIso: planPageModel?.todayIso ?? localTodayIso(),
    view: dashboardView,
  }), [planData, planPageModel?.currentWeek, planPageModel?.todayIso, activities, dashboardView]);
  const scheduleRows = scheduleWeeks.flatMap((week) => week.days);
  const scheduleTotal = scheduleRows.reduce((sum, row) => {
    const actualKm = activityDistanceKm(row.actual);
    return sum + (actualKm || row.planned?.distanceKm || 0);
  }, 0);
  const scheduleTitle = dashboardView === "today" ? "Dagsplan" : dashboardView === "month" ? "Rullerende 4 uker" : "Ukesplan";
  const syncBusy = Boolean(strava?.loading || strava?.isSyncingHistory);
  const syncStatus = strava?.error?.message ?? strava?.statusMessage ?? "";

  const handleStrava = async () => {
    if (syncBusy) return;
    if (strava?.connected) await strava.sync?.();
    else strava?.startConnect?.();
  };

  // DUMMY: real AI-generated bullets pending `dashboard_insights` edge-fn mode.
  // We now seed them from the real state so they read less fake.
  const insights = [
    { level: "info", text: `<strong>CTL:</strong> ${load.ctl} · <strong>ATL:</strong> ${load.atl} · <strong>TSB:</strong> ${load.tsb} — ${load.state?.stateLabel ?? "ukjent status"}.` },
    { level: consistency.pct >= 75 ? "ok" : "warn", text: `<strong>Kontinuitet:</strong> ${consistency.count}/${consistency.total} uker (${consistency.pct}%).` },
    { level: season.hasPlan ? "info" : "warn", text: season.hasPlan
        ? `<strong>${season.currentBlock.name}</strong> · uke ${season.currentWeek} av ${season.totalWeeks}.`
        : "Ingen aktiv treningsplan. Generer en plan for uke-for-uke oppfølging." },
  ];

  return (
    <div className="workspace">
      {/* Left panel */}
      <div className="left-panel">
        <div className="panel-section">
          <div className="panel-section-header">Planstatus</div>
          <div style={{ padding: "4px 0" }}>
            {[
              { l: "Fase",          v: season.currentBlock.name },
              { l: "Uke",           v: season.hasPlan ? `${season.currentWeek} / ${season.totalWeeks}` : "—" },
              { l: "Dager til løp", v: goalRace ? `${goalRace.daysToRace}d` : "—" },
              { l: "Form (CTL)",    v: load.ctl },
              { l: "Tretthet (ATL)", v: load.atl },
              { l: "Balanse (TSB)", v: load.tsb },
              { l: "Ukentlig km",   v: `${weeklyKm[weeklyKm.length - 1] ?? 0} km` },
              { l: "Kontinuitet",   v: `${consistency.count}/${consistency.total}` },
            ].map(({ l, v }) => (
              <div className="panel-stat-row" key={l}><span>{l}</span><span className="panel-stat-val">{v}</span></div>
            ))}
          </div>
        </div>

        <div className="panel-section">
          <div className="panel-section-header">Nåværende blokk</div>
          <div style={{ padding: "8px 10px", display: "flex", flexDirection: "column", gap: 4 }}>
            {season.blocks.length === 0 && <div style={{ fontSize: 11, color: "var(--e-text-faint)" }}>Ingen planblokker.</div>}
            {season.blocks.map((b) => {
              const inBlock = season.currentWeek >= b.start && season.currentWeek < b.start + b.weeks;
              return (
                <div key={b.name} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ width: 8, height: 8, background: b.color, flexShrink: 0 }} />
                  <span style={{ flex: 1, fontSize: 11, fontWeight: inBlock ? 700 : 400, color: inBlock ? "var(--e-primary)" : "var(--e-text)" }}>
                    {b.name}
                  </span>
                  <span style={{ fontSize: 10, fontFamily: "var(--ff-mono)", color: "var(--e-text-faint)" }}>{b.weeks}w</span>
                  {inBlock && <span style={{ fontSize: 9, background: "var(--e-primary)", color: "#fff", padding: "1px 4px", fontWeight: 700 }}>NÅ</span>}
                </div>
              );
            })}
          </div>
        </div>

        <div className="panel-section" style={{ flex: 1 }}>
          <div className="panel-section-header">Hurtighandlinger</div>
          <div style={{ padding: 8 }}>
            {["Logg dagens økt", "Ukentlig innsjekk", "Se over langtur-rute", "Synk Strava"].map((a) => (
              <div key={a} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 2px", borderBottom: "1px solid var(--e-bg)", fontSize: 11, cursor: "pointer" }}>
                <span style={{ color: "var(--e-text-faint)" }}>›</span> {a}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main */}
      <div className="main-content">
        <div className="toolbar">
          <div className="toolbar-group">
            <span className="toolbar-label">Vis</span>
            {[
              ["today", "I dag"],
              ["week", "Uke"],
              ["month", "Måned"],
            ].map(([id, label]) => (
              <button
                key={id}
                type="button"
                className={`tbtn${dashboardView === id ? " active" : ""}`}
                onClick={() => setDashboardView(id)}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="toolbar-sep" />
          <div className="toolbar-group">
            <button className="tbtn primary">✦ AI-innsikter</button>
            <button className="tbtn">⊞ Logg økt</button>
            <button className="tbtn" type="button" disabled={syncBusy} onClick={handleStrava}>
              {syncBusy ? "↻ Synker..." : strava?.connected ? "↻ Synk Strava" : "↻ Koble til Strava"}
            </button>
          </div>
          <div className="toolbar-spacer" />
          <div className="toolbar-group rs-sync-status" role="status" aria-live="polite">
            <span className="toolbar-label">Sist synket:</span>
            <span className={strava?.error ? "sync-state error" : "sync-state"}>
              {formatLastSync(strava?.lastSyncAt)}
            </span>
            {syncStatus && <span className="sync-message">{syncStatus}</span>}
          </div>
          <div className="toolbar-group">
            <span className="toolbar-label">Målløp:</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: "var(--e-primary)", padding: "0 6px" }}>
              {goalRace ? `${goalRace.name} · ${goalRace.daysToRace} dager` : "Ikke satt"}
            </span>
          </div>
        </div>

        <div className="content-scroll">
          {/* Sesongkalender — fra aktiv sesongplan, med fallback til neste-løp-liste */}
          <div className="e-panel" style={{ flexShrink: 0 }}>
            <div className="e-panel-header">
              <div>
                <span className="e-panel-title">Sesongkalender</span>
                <span className="e-panel-subtitle" style={{ marginLeft: 10 }}>
                  {activeSeasonPlan
                    ? `${activeSeasonPlan.name} · ${seasonRows.length} løp`
                    : upcomingRaces.length > 0
                      ? `Ingen aktiv sesongplan · ${upcomingRaces.length} planlagt${upcomingRaces.length === 1 ? "" : "e"} løp i biblioteket`
                      : "Ingen planlagte løp"}
                </span>
              </div>
              <div className="e-panel-actions">
                <button className="e-panel-btn" onClick={() => onNavigate?.("races")}>
                  {activeSeasonPlan ? "Rediger sesongplan →" : "Lag sesongplan →"}
                </button>
              </div>
            </div>

            {activeSeasonPlan ? (
              seasonRows.length === 0 ? (
                <div style={{ padding: "14px 14px", fontSize: 11, color: "var(--e-text-faint)" }}>
                  Sesongplanen er tom. Åpne Løpssenter for å legge til løp.
                </div>
              ) : (
                <div style={{ padding: "8px 12px", display: "flex", flexDirection: "column" }}>
                  {seasonRows.map((spr, idx) => {
                    const tone = PRIORITY_TONE[spr.priority] ?? PRIORITY_TONE.B;
                    const dTo = daysUntil(spr.target_date);
                    const isGoal = goalRace?.name && spr.race?.name === goalRace.name;
                    return (
                      <React.Fragment key={spr.id}>
                        <div style={{
                          display: "grid",
                          gridTemplateColumns: "auto 1fr 110px 90px",
                          gap: 8,
                          alignItems: "center",
                          padding: "6px 0",
                          borderBottom: idx === seasonRows.length - 1 ? "none" : "1px dashed var(--e-bg)",
                        }}>
                          <span style={{
                            background: tone.bg, color: tone.fg,
                            width: 20, height: 20, display: "inline-flex", alignItems: "center", justifyContent: "center",
                            fontSize: 11, fontWeight: 800,
                          }}>{spr.priority}</span>
                          <div>
                            <div style={{ fontSize: 12, fontWeight: 700 }}>
                              {spr.race?.name ?? "Ukjent løp"}
                              {isGoal && <span className="status-tag st-ok" style={{ fontSize: 9, marginLeft: 6 }}>MÅLLØP</span>}
                            </div>
                            <div style={{ fontSize: 10, color: "var(--e-text-faint)" }}>
                              {[spr.race?.location, spr.race?.distance_km ? `${spr.race.distance_km} km` : null]
                                .filter(Boolean).join(" · ")}
                            </div>
                          </div>
                          <span style={{ fontSize: 11, fontFamily: "var(--ff-mono)", color: "var(--e-text-muted)" }}>
                            {shortDate(spr.target_date)}
                          </span>
                          <span style={{ fontSize: 11, fontFamily: "var(--ff-mono)", textAlign: "right", fontWeight: isGoal ? 700 : 400, color: isGoal ? "var(--e-primary)" : "var(--e-text)" }}>
                            {dTo == null ? "—" : dTo < 0 ? "passert" : `${dTo}d`}
                          </span>
                        </div>
                        {idx < seasonRows.length - 1 && <GapChip verdict={seasonGaps[idx]} />}
                      </React.Fragment>
                    );
                  })}
                </div>
              )
            ) : upcomingRaces.length === 0 ? (
              <div style={{ padding: "14px 14px", fontSize: 11, color: "var(--e-text-faint)" }}>
                Ingen aktiv sesongplan og ingen planlagte løp. Lag en sesongplan for å organisere året.
              </div>
            ) : (
              <table className="e-grid" style={{ fontSize: 11 }}>
                <thead>
                  <tr>
                    <th>Løp</th>
                    <th>Sted</th>
                    <th style={{ textAlign: "right" }}>Distanse</th>
                    <th>Dato</th>
                    <th style={{ textAlign: "right" }}>Dager til</th>
                  </tr>
                </thead>
                <tbody>
                  {upcomingRaces.map((race) => {
                    const isGoal = goalRace?.name && race.name === goalRace.name;
                    const dTo = daysUntil(race.next_race_date);
                    return (
                      <tr key={race.id}>
                        <td style={{ fontWeight: 700 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <div style={{ width: 3, height: 18, background: isGoal ? "var(--e-primary)" : "#1a5fb4", flexShrink: 0 }} />
                            <span>{race.name}</span>
                            {isGoal && <span className="status-tag st-ok" style={{ fontSize: 9 }}>MÅLLØP</span>}
                          </div>
                        </td>
                        <td style={{ color: "var(--e-text-muted)" }}>{race.location ?? "—"}</td>
                        <td style={{ textAlign: "right", fontFamily: "var(--ff-mono)", fontWeight: 700 }}>{race.distance_km ?? "—"} km</td>
                        <td style={{ fontFamily: "var(--ff-mono)", color: "var(--e-text-muted)" }}>{shortDate(race.next_race_date)}</td>
                        <td style={{ textAlign: "right", fontFamily: "var(--ff-mono)", fontWeight: isGoal ? 700 : 400, color: isGoal ? "var(--e-primary)" : "var(--e-text)" }}>
                          {dTo == null ? "—" : `${dTo}d`}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* KPI strip */}
          <div className="kpi-strip">
            {[
              { l: "Denne uka",      v: `${weeklyKm[weeklyKm.length - 1] ?? 0} km`, delta: "mot forrige uke",             dir: "ok",      note: "Løpsvolum" },
              { l: "Form (CTL)",     v: load.ctl,                                   delta: load.state?.trendLabel ?? "", dir: "ok",      note: "Langsiktig treningsbelastning" },
              { l: "Tretthet (ATL)", v: load.atl,                                   delta: "Akutt belastning",           dir: "warn",    note: "Akutt treningsbelastning" },
              { l: "Balanse (TSB)",  v: load.tsb,                                   delta: load.state?.stateLabel ?? "—",dir: "neutral", note: "Stressbalanse" },
              { l: "Kontinuitet",    v: `${consistency.pct}%`,                      delta: `${consistency.count}/${consistency.total} uker`, dir: consistency.pct >= 75 ? "ok" : "warn", note: "Siste 8 uker" },
            ].map(({ l, v, delta, dir, note }) => (
              <div className="kpi-cell" key={l}>
                <div className="kpi-accent-bar" style={{ background: dir === "ok" ? "var(--e-ok)" : dir === "warn" ? "var(--e-warn)" : "var(--e-border-strong)" }} />
                <div className="kpi-cell-label">{l}</div>
                <div className="kpi-cell-value">{v}</div>
                <div className="kpi-cell-delta" style={{ color: dir === "ok" ? "var(--e-ok)" : dir === "warn" ? "var(--e-warn)" : "var(--e-text-muted)" }}>{delta}</div>
                <div className="kpi-cell-note">{note}</div>
              </div>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: 8, alignItems: "start" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {/* Week schedule */}
              <div className="e-panel">
                <div className="e-panel-header">
                  <div>
                    <span className="e-panel-title">{scheduleTitle}</span>
                    <span className="e-panel-subtitle" style={{ marginLeft: 10 }}>
                      {dashboardView === "week" ? `${weekRange} · ${season.currentBlock.name}` : "Planlagt vs. utført"}
                    </span>
                  </div>
                  <div className="e-panel-actions">
                    <span className="e-panel-btn">Rediger uke</span>
                    <span className="e-panel-btn">↻ Planlegg på nytt</span>
                  </div>
                </div>
                <table className="e-grid" style={{ tableLayout: "fixed" }}>
                  <colgroup>
                    <col style={{ width: 40 }} /><col style={{ width: 60 }} /><col /><col style={{ width: 70 }} />
                    <col style={{ width: 56 }} /><col style={{ width: 60 }} /><col style={{ width: 72 }} />
                  </colgroup>
                  <thead>
                    <tr>
                      <th>Dag</th><th>Dato</th><th>Trening</th><th>Type</th>
                      <th style={{ textAlign: "right" }}>Distanse</th><th>Sone</th><th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scheduleRows.length === 0 && (
                      <tr><td colSpan={7} style={{ textAlign: "center", color: "var(--e-text-faint)", padding: 20 }}>Ingen plan — generer en fra Treningsplan-siden.</td></tr>
                    )}
                    {scheduleWeeks.map((week) => (
                      <React.Fragment key={week.weekNumber ?? week.startDate}>
                        {dashboardView === "month" && (
                          <tr className="schedule-week-row">
                            <td colSpan={7}>
                              Uke {week.weekNumber} · {week.focus ?? week.phase ?? "Planlagt trening"}
                            </td>
                          </tr>
                        )}
                        {week.days.map((d) => {
                          const primary = d.planned;
                          const actualKm = d.executed.reduce((sum, activity) => sum + activityDistanceKm(activity), 0);
                          const distance = actualKm || primary?.distanceKm || 0;
                          const isRest = d.status === "rest";
                          const tc = primary ? typeStyleFor(primary.type) : typeStyleFor("Rest");
                          const isSel = d.date === selectedDate;
                          const tag = scheduleStatusTag(d);
                          return (
                            <tr key={d.date} className={isSel ? "selected" : ""} onClick={() => setSelectedDate(d.date)} style={{ cursor: "pointer", background: d.isToday ? "#edf4fd" : undefined }}>
                              <td style={{ fontWeight: 700, color: d.isToday ? "var(--e-primary)" : "var(--e-text)" }}>
                                {d.dayOfWeek}
                                {d.isToday && <span style={{ marginLeft: 4, fontSize: 9, background: "var(--e-primary)", color: "#fff", padding: "1px 4px" }}>NÅ</span>}
                              </td>
                              <td style={{ color: "var(--e-text-faint)", fontFamily: "var(--ff-mono)", fontSize: 10 }}>{shortDate(d.date)}</td>
                              <td className="schedule-workout-cell">
                                {d.executed.length > 1 ? (
                                  <div className="schedule-executed-stack">
                                    <div className="schedule-executed-count">{d.executedSummary}</div>
                                    {d.executed.map((activity) => (
                                      <div key={activity.id ?? `${d.date}-${activity.name}`} className="schedule-executed-item">
                                        {formatActivitySummary(activity)}
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div className={d.status === "missed" ? "schedule-primary muted" : "schedule-primary"}>{d.primaryName}</div>
                                )}
                                {d.secondary && <div className="schedule-secondary">{d.secondary}</div>}
                                {d.workouts?.length > 1 && (
                                  <div className="schedule-secondary">+{d.workouts.length - 1} ekstra planlagt</div>
                                )}
                              </td>
                              <td>
                                {!isRest && (
                                  <span style={{ fontSize: 9, fontWeight: 700, color: tc.c, background: tc.bg, padding: "2px 5px" }}>
                                    {(primary?.type || d.actual?.type || "RUN").toUpperCase()}
                                  </span>
                                )}
                              </td>
                              <td style={{ textAlign: "right", fontFamily: "var(--ff-mono)", fontWeight: 700, color: distance ? "var(--e-text)" : "var(--e-text-faint)" }}>
                                {formatKm(distance)}
                              </td>
                              <td style={{ color: "var(--e-text-muted)", fontSize: 10 }}>{primary?.primaryZone ?? "—"}</td>
                              <td><span className={`status-tag ${tag.cls}`}>{tag.label}</span></td>
                            </tr>
                          );
                        })}
                      </React.Fragment>
                    ))}
                  </tbody>
                  {scheduleRows.length > 0 && (
                    <tfoot>
                      <tr>
                        <td colSpan={4} style={{ color: "var(--e-text-muted)" }}>Uketotal</td>
                        <td style={{ textAlign: "right", fontFamily: "var(--ff-mono)" }}>{formatKm(Math.round(scheduleTotal))}</td>
                        <td colSpan={2}><span className="status-tag st-ok">{dashboardView === "month" ? "4 uker" : "Aktiv visning"}</span></td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>

              {/* Phase timeline */}
              <div className="e-panel">
                <div className="e-panel-header">
                  <span className="e-panel-title">Sesongplan</span>
                  <span className="e-panel-subtitle">{season.totalWeeks}-ukers program · Uke {season.currentWeek}</span>
                </div>
                <div style={{ padding: "8px 12px" }}>
                  {season.blocks.length > 0 ? (
                    <>
                      <div className="phase-gantt" style={{ marginBottom: 6 }}>
                        {season.blocks.map((b) => {
                          const isCur = season.currentBlock.name === b.name;
                          return (
                            <div key={b.name} className="phase-gantt-seg" style={{
                              flex: b.weeks, background: b.color,
                              opacity: isCur ? 1 : 0.55,
                              outline: isCur ? "2px solid #4a9eff" : "none", outlineOffset: -2,
                            }}>
                              {b.name}
                            </div>
                          );
                        })}
                      </div>
                      <div style={{ height: 6, background: "var(--e-bg)", marginBottom: 6, position: "relative" }}>
                        <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, background: "var(--e-primary)", width: `${Math.min(100, (season.currentWeek / Math.max(season.totalWeeks, 1)) * 100)}%` }} />
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--e-text-faint)" }}>
                        <span>Start</span>
                        <span style={{ fontWeight: 700, color: "var(--e-primary)" }}>Uke {season.currentWeek} / {season.totalWeeks} · {Math.round(season.currentWeek / Math.max(season.totalWeeks, 1) * 100)}%</span>
                        <span>Løpsdag</span>
                      </div>
                    </>
                  ) : (
                    <div style={{ fontSize: 11, color: "var(--e-text-faint)", padding: "8px 0" }}>Ingen plan generert ennå.</div>
                  )}
                </div>
              </div>

              {/* Mini charts */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <div className="e-panel">
                  <div className="e-panel-header">
                    <span className="e-panel-title">Treningsbelastning (90 d)</span>
                    <span className="e-panel-subtitle">CTL · ATL</span>
                  </div>
                  <div style={{ padding: "8px 12px 4px" }}>
                    <SvgLine
                      series={[ctlSeries, atlSeries]}
                      h={72} colors={["#1a5fb4", "#b01c1c"]}
                      fills={["rgba(26,95,180,0.1)", "rgba(176,28,28,0.06)"]}
                    />
                    <div style={{ display: "flex", gap: 12, padding: "4px 0", borderTop: "1px solid var(--e-bg)" }}>
                      {[{ l: "CTL", v: load.ctl, c: "#1a5fb4" }, { l: "ATL", v: load.atl, c: "#b01c1c" }, { l: "TSB", v: load.tsb, c: "#4a6078" }].map(({ l, v, c }) => (
                        <div key={l} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          <div style={{ width: 8, height: 2, background: c }} />
                          <span style={{ fontSize: 10, color: "var(--e-text-faint)" }}>{l}</span>
                          <span style={{ fontFamily: "var(--ff-mono)", fontSize: 10, fontWeight: 700, color: c }}>{v > 0 ? "+" : ""}{v}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="e-panel">
                  <div className="e-panel-header">
                    <span className="e-panel-title">Ukentlig volum</span>
                    <span className="e-panel-subtitle">km · siste {weeklyKm.length} uker</span>
                  </div>
                  <div style={{ padding: "8px 12px 4px" }}>
                    <SvgBars data={weeklyKm} h={72} color="#1a5fb4" />
                  </div>
                </div>
              </div>
            </div>

            {/* Right rail */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div className="e-panel">
                <div className="e-panel-header">
                  <span className="e-panel-title">Dagens økt</span>
                </div>
                <div style={{ padding: "10px 12px", display: "flex", flexDirection: "column", gap: 8 }}>
                  {todayPrimary ? (
                    <>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ width: 3, alignSelf: "stretch", background: todayStyle.c }} />
                        <div>
                          <div style={{ fontSize: 9, fontWeight: 700, color: todayStyle.c, textTransform: "uppercase", letterSpacing: "0.08em" }}>{todayPrimary.type}</div>
                          <div style={{ fontSize: 13, fontWeight: 700 }}>{todayPrimary.name}</div>
                        </div>
                      </div>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                        <tbody>
                          {[
                            ["Distanse", todayPrimary.distanceKm ? `${todayPrimary.distanceKm} km` : "—"],
                            ["Varighet", hm(todayPrimary.durationMinutes)],
                            ["Sone",     todayPrimary.primaryZone ?? "—"],
                            ["Sport",    todayPrimary.sport ?? "Løp"],
                          ].map(([k, v]) => (
                            <tr key={k} style={{ borderBottom: "1px solid var(--e-bg)" }}>
                              <td style={{ padding: "3px 0", color: "var(--e-text-faint)" }}>{k}</td>
                              <td style={{ padding: "3px 0", fontWeight: 700, fontFamily: "var(--ff-mono)", textAlign: "right" }}>{v}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {(todayPrimary.humanReadable || todayPrimary.description) && (
                        <div style={{ fontSize: 11, color: "var(--e-text-muted)", background: "var(--e-surface-alt)", padding: "7px 9px", borderLeft: "3px solid var(--e-primary)", lineHeight: 1.55 }}>
                          {todayPrimary.humanReadable || todayPrimary.description}
                        </div>
                      )}
                    </>
                  ) : (
                    <div style={{ fontSize: 11, color: "var(--e-text-faint)", padding: "6px 0" }}>
                      Ingen økt planlagt i dag.
                    </div>
                  )}
                </div>
              </div>

              <div className="ai-dock">
                <div className="ai-dock-header">
                  <div className="ai-dock-title"><span className="ai-badge">AI</span>Nøkkelinnsikter</div>
                  <span style={{ fontSize: 10, color: "var(--e-primary)" }}>auto</span>
                </div>
                <div className="ai-body">
                  {insights.map((ins, i) => {
                    const c = ins.level === "ok" ? "var(--e-ok)" : ins.level === "warn" ? "var(--e-warn)" : "var(--e-primary)";
                    return (
                      <div key={i} className="ai-row">
                        <div className="ai-row-dot" style={{ background: c }} />
                        <div className="ai-row-text" dangerouslySetInnerHTML={{ __html: ins.text }} />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/* TRAINING PLAN                                                               */
/* ────────────────────────────────────────────────────────────────────────── */
function RaceStrategyPanel({ raceStrategy }) {
  const [expanded, setExpanded] = useState(false);
  if (!raceStrategy) {
    return (
      <div className="e-panel race-strategy-panel">
        <div className="e-panel-header">
        <span className="e-panel-title">Løpsplan · Strategi</span>
        </div>
        <div style={{ padding: "12px 14px", fontSize: 11, color: "var(--e-text-faint)" }}>
          Ingen løpsstrategi definert. Generer en plan for å fylle denne seksjonen.
        </div>
      </div>
    );
  }
  const ev = raceStrategy.event ?? {};
  const tactics = Array.isArray(raceStrategy.keyTactics) ? raceStrategy.keyTactics : [];
  return (
    <div className={`e-panel race-strategy-panel${expanded ? " expanded" : ""}`}>
      <div className="e-panel-header">
        <span className="e-panel-title">Løpsplan · {ev.name ?? "Målløp"}</span>
        <div className="e-panel-actions">
          <button type="button" className="e-panel-btn" onClick={() => setExpanded((current) => !current)}>
            {expanded ? "Lukk utvidet løpsplan" : "Utvid løpsplan"}
          </button>
          <span className="e-panel-btn accent">✦ AI strategigjennomgang</span>
        </div>
      </div>
      <div className={`race-strategy-body${expanded ? " expanded" : ""}`}>
        <div className="race-strategy-meta">
          {[
            ["Løp",      ev.name ?? "—"],
            ["Distanse", ev.distance ?? "—"],
            ["Type",     ev.type ?? "—"],
            ["Dato",     ev.date ?? "—"],
          ].map(([k, v]) => (
            <div key={k}>
              <div className="race-strategy-label">{k}</div>
              <div className="race-strategy-value">{String(v)}</div>
            </div>
          ))}
        </div>
        {tactics.length > 0 && (
          <div className="race-strategy-section">
            <div className="race-strategy-section-title">Nøkkeltaktikk</div>
            <ul className="race-strategy-tactics">
              {tactics.map((t, i) => <li key={i}>{typeof t === "string" ? t : (t.text ?? JSON.stringify(t))}</li>)}
            </ul>
          </div>
        )}
        <div className="race-strategy-detail-grid">
          {[
            ["Tempo", raceStrategy.pacing],
            ["Ernæring", raceStrategy.fueling],
            ["Terreng", raceStrategy.terrain],
          ].filter(([, v]) => v).map(([k, v]) => (
            <div key={k} className="race-strategy-detail">
              <div className="race-strategy-detail-title">{k}</div>
              <div className="race-strategy-detail-text">{typeof v === "string" ? v : JSON.stringify(v)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const EMPTY_WORKOUT_FORM = {
  sport: "Run",
  type: "Easy",
  name: "",
  description: "",
  durationMinutes: "",
  distanceKm: "",
  primaryZone: "Z2",
  humanReadable: "",
};

function workoutFormFrom(workout = {}) {
  return {
    sport: workout.sport ?? "Run",
    type: normalizePlanWorkoutType(workout.type, workout),
    name: workout.name ?? workout.type ?? "",
    description: workout.description ?? "",
    durationMinutes: workout.durationMinutes ?? "",
    distanceKm: workout.distanceKm ?? "",
    primaryZone: workout.primaryZone ?? "Z2",
    humanReadable: workout.humanReadable ?? "",
  };
}

function cleanWorkoutForm(form) {
  const distanceKm = form.distanceKm === "" ? null : Number(form.distanceKm);
  const durationMinutes = form.durationMinutes === "" ? null : Number(form.durationMinutes);
  const type = normalizePlanWorkoutType(form.type);
  return {
    sport: form.sport.trim(),
    type,
    name: form.name.trim(),
    description: form.description.trim(),
    durationMinutes: Number.isFinite(durationMinutes) ? durationMinutes : null,
    distanceKm: Number.isFinite(distanceKm) ? distanceKm : null,
    primaryZone: form.primaryZone.trim(),
    humanReadable: form.humanReadable.trim(),
  };
}

function dayAddLabel(day, dow) {
  const dayName = {
    Mon: "mandag",
    Tue: "tirsdag",
    Wed: "onsdag",
    Thu: "torsdag",
    Fri: "fredag",
    Sat: "lørdag",
    Sun: "søndag",
  }[day?.dayOfWeek ?? dow] ?? "dag";
  return `Opprett økt ${dayName} ${shortDate(day?.date)}`;
}

function WorkoutEditorModal({ modal, onClose, onSave, onDelete }) {
  const [form, setForm] = useState(() => workoutFormFrom(modal?.workout ?? EMPTY_WORKOUT_FORM));
  const isEdit = modal?.mode === "edit";

  useEffect(() => {
    setForm(workoutFormFrom(modal?.workout ?? EMPTY_WORKOUT_FORM));
  }, [modal]);

  if (!modal) return null;

  const setField = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
  };

  const handleSave = () => {
    onSave(cleanWorkoutForm(form));
  };

  return (
    <div className="rs-modal-backdrop" onMouseDown={onClose}>
      <div className="rs-modal" role="dialog" aria-modal="true" aria-labelledby="workout-editor-title" onMouseDown={(event) => event.stopPropagation()}>
        <div className="rs-modal-header">
          <div>
            <h2 id="workout-editor-title">{isEdit ? "Rediger økt" : "Legg til økt"}</h2>
            <p>Uke {modal.week.weekNumber} · {shortDate(modal.day.date)}</p>
          </div>
          <button type="button" className="rs-modal-close" onClick={onClose} aria-label="Lukk">×</button>
        </div>

        <div className="rs-modal-grid">
          <label className="rs-modal-field rs-modal-field-wide">
            <span>Navn</span>
            <input value={form.name} onChange={setField("name")} autoFocus />
          </label>
          <label className="rs-modal-field">
            <span>Type</span>
            <select value={form.type} onChange={setField("type")}>
              {WORKOUT_TYPE_OPTIONS.map((option) => (
                <option key={option.key} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
          <label className="rs-modal-field">
            <span>Sport</span>
            <input value={form.sport} onChange={setField("sport")} />
          </label>
          <label className="rs-modal-field">
            <span>Distanse</span>
            <input type="number" min="0" step="0.1" value={form.distanceKm} onChange={setField("distanceKm")} />
          </label>
          <label className="rs-modal-field">
            <span>Varighet</span>
            <input type="number" min="0" step="1" value={form.durationMinutes} onChange={setField("durationMinutes")} />
          </label>
          <label className="rs-modal-field">
            <span>Sone</span>
            <input value={form.primaryZone} onChange={setField("primaryZone")} />
          </label>
          <label className="rs-modal-field rs-modal-field-wide">
            <span>Kort visning</span>
            <input value={form.humanReadable} onChange={setField("humanReadable")} />
          </label>
          <label className="rs-modal-field rs-modal-field-wide">
            <span>Beskrivelse</span>
            <textarea rows={4} value={form.description} onChange={setField("description")} />
          </label>
        </div>

        <div className="rs-modal-actions">
          {isEdit && <button type="button" className="rs-modal-danger" onClick={onDelete}>Slett økt</button>}
          <span className="rs-modal-spacer" />
          <button type="button" className="tbtn" onClick={onClose}>Avbryt</button>
          <button type="button" className="tbtn primary" onClick={handleSave}>{isEdit ? "Lagre endringer" : "Legg til økt"}</button>
        </div>
      </div>
    </div>
  );
}

function PlanPage({ season, goalRace, planData, planPageModel, hierarchicalPlan }) {
  const [viewMode, setViewMode] = useState("Hele planen");
  const [filterPhase, setFilterPhase] = useState("Alle");
  const [selectedRow, setSelectedRow] = useState(null);
  const [workoutModal, setWorkoutModal] = useState(null);
  const [expandedWeekPlan, setExpandedWeekPlan] = useState(false);
  const currentRef = useRef(null);
  const DAYS = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
  const DAY_LABELS = { Mon: "Man", Tue: "Tir", Wed: "Ons", Thu: "Tor", Fri: "Fre", Sat: "Lør", Sun: "Søn" };
  const curWk = planPageModel?.currentWeek?.weekNumber ?? 0;

  const activePlanData = hierarchicalPlan?.plan?.plan_data ?? planData;
  const allWeeks = activePlanData?.weeks ?? [];

  const weeks = filterPhase === "Alle"
    ? allWeeks
    : allWeeks.filter((w) => (w.phase ?? "").startsWith(filterPhase));

  const visible = viewMode === "Hele planen" ? weeks
    : viewMode === "Nåværende blokk" ? weeks.filter((w) => (w.phase ?? "") === (planPageModel?.currentWeek?.phase ?? season.currentBlock.name))
    : curWk ? weeks.filter((w) => w.weekNumber >= curWk && w.weekNumber <= curWk + 7) : weeks.slice(0, 8);

  useEffect(() => { currentRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }); }, [viewMode, allWeeks.length]);

  // Map a week's days into a fixed Mon..Sun grid (plans may not have all days).
  const daysByDow = (week) => {
    const out = { Mon: null, Tue: null, Wed: null, Thu: null, Fri: null, Sat: null, Sun: null };
    (week.days ?? []).forEach((d) => { if (out[d.dayOfWeek] === null) out[d.dayOfWeek] = d; });
    return out;
  };

  const weekTotalKm = (week) => {
    if (week.summary?.totalKm != null) return Math.round(week.summary.totalKm);
    return Math.round((week.days ?? []).reduce((s, d) => s + (d.workouts ?? []).reduce((ss, w) => ss + (w.distanceKm || 0), 0), 0));
  };

  const openAddWorkout = (week, day, event) => {
    event?.stopPropagation();
    if (!day?.date) return;
    setWorkoutModal({ mode: "add", week, day, workout: EMPTY_WORKOUT_FORM });
  };

  const openEditWorkout = (week, day, workout, event) => {
    event?.stopPropagation();
    setWorkoutModal({ mode: "edit", week, day, workout });
  };

  const saveWorkout = async (fields) => {
    if (!workoutModal) return;
    if (workoutModal.mode === "edit") {
      await hierarchicalPlan?.applyPatch?.([{
        week: workoutModal.week.weekNumber,
        dayDate: workoutModal.day.date,
        workoutId: workoutModal.workout.id,
        fields,
      }]);
    } else {
      await hierarchicalPlan?.addWorkout?.({
        weekNumber: workoutModal.week.weekNumber,
        dayDate: workoutModal.day.date,
        workout: fields,
      });
    }
    setWorkoutModal(null);
  };

  const deleteWorkout = async () => {
    if (!workoutModal || workoutModal.mode !== "edit") return;
    await hierarchicalPlan?.deleteWorkout?.(workoutModal.workout.id, workoutModal.week.weekNumber, workoutModal.day.date);
    setWorkoutModal(null);
  };

  return (
    <div className={`workspace plan-workspace${expandedWeekPlan ? " week-plan-expanded" : ""}`}>
      <div className="left-panel">
        <div className="panel-section">
          <div className="panel-section-header">Planoversikt</div>
          <div style={{ padding: "4px 0" }}>
            {[
              { l: "Løp",        v: goalRace?.name ?? "—" },
              { l: "Løpsdato",   v: goalRace?.date ?? "—" },
              { l: "Distanse",   v: goalRace?.distance ? `${goalRace.distance} km` : "—" },
              { l: "Totalt uker", v: season.totalWeeks || "—" },
              { l: "Nåværende uke", v: curWk ? `Uke ${curWk}` : "—" },
              { l: "Fase",       v: planPageModel?.currentWeek?.phase ?? season.currentBlock.name },
            ].map(({ l, v }) => (
              <div className="panel-stat-row" key={l}><span>{l}</span><span className="panel-stat-val">{v}</span></div>
            ))}
          </div>
        </div>
        <div className="panel-section">
          <div className="panel-section-header">Filtrer fase</div>
          <div style={{ padding: "4px 0" }}>
            {["Alle", ...season.blocks.map((b) => b.name)].map((p) => (
              <div key={p} className={`panel-tree-item${filterPhase === p ? " selected" : ""}`} onClick={() => setFilterPhase(p)}>
                {p !== "Alle" && <div className="panel-tree-dot" style={{ background: season.blocks.find((b) => b.name === p)?.color ?? "#999" }} />}
                {p}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="main-content">
        <div className="toolbar">
          <div className="toolbar-group">
            <span className="toolbar-label">Vis</span>
            {["Hele planen","Nåværende blokk","Neste 8 uker"].map((v) => (
              <button key={v} type="button" className={`tbtn${viewMode === v ? " active" : ""}`} onClick={() => setViewMode(v)}>{v}</button>
            ))}
          </div>
          <div className="toolbar-sep" />
          <div className="toolbar-group">
            <button className="tbtn primary">⊕ Generer plan</button>
            <button className="tbtn">↻ Planlegg på nytt med AI</button>
            <button className="tbtn">⬇ Eksporter</button>
          </div>
          <div className="toolbar-spacer" />
          <div className="toolbar-group">
            <span className="toolbar-label">Viser:</span>
            <span style={{ fontSize: 11, fontWeight: 600, color: "var(--e-primary)", padding: "0 6px" }}>{visible.length} uker</span>
          </div>
        </div>

        <div className={`content-scroll${expandedWeekPlan ? " plan-expanded-scroll" : ""}`}>
          {/* Phase gantt from real phases */}
          {!expandedWeekPlan && (
            <div className="e-panel">
              <div className="e-panel-header">
                <span className="e-panel-title">Fasestruktur · Sesongplan</span>
                <span className="e-panel-subtitle">{goalRace ? `${goalRace.daysToRace} dager til ${goalRace.name}` : "Ingen målløp satt"}</span>
              </div>
              <div style={{ padding: "8px 12px" }}>
                {season.blocks.length > 0 ? (
                  <div style={{ display: "flex", height: 28, border: "1px solid var(--e-border)", overflow: "hidden", marginBottom: 6 }}>
                    {season.blocks.map((b) => {
                      const isCur = b.name === (planPageModel?.currentWeek?.phase ?? season.currentBlock.name);
                      return (
                        <div key={b.name} title={`${b.name}: Wk ${b.start}–${b.start + b.weeks - 1} · ${b.focus}`} style={{
                          flex: b.weeks, background: b.color, color: "#fff",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 9, fontWeight: 800, letterSpacing: "0.07em", textTransform: "uppercase",
                          borderRight: "1px solid rgba(255,255,255,0.2)",
                          opacity: isCur ? 1 : 0.55,
                          outline: isCur ? "2px solid #4a9eff" : "none", outlineOffset: -2,
                        }}>
                          {b.name}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ fontSize: 11, color: "var(--e-text-faint)" }}>Ingen faser definert.</div>
                )}
              </div>
            </div>
          )}

          {/* Plan grid */}
          <div className={`e-panel plan-grid-panel${expandedWeekPlan ? " expanded" : ""}`}>
            <div className="e-panel-header">
              <div>
                <span className="e-panel-title">Ukeplan</span>
                <span className="e-panel-subtitle" style={{ marginLeft: 10 }}>
                  {viewMode} · {filterPhase !== "Alle" ? filterPhase : "Alle faser"}
                </span>
              </div>
              <div className="e-panel-actions">
                <button
                  type="button"
                  className="e-panel-btn"
                  onClick={() => setExpandedWeekPlan((current) => !current)}
                >
                  {expandedWeekPlan ? "Lukk utvidet visning" : "Utvid ukeplan"}
                </button>
              </div>
            </div>
            <div className={`plan-grid-scroll${viewMode === "Hele planen" ? " full-plan" : ""}${expandedWeekPlan ? " expanded" : ""}`}>
              <table className="e-grid" style={{ minWidth: 880, tableLayout: "fixed" }}>
                <colgroup>
                  <col style={{ width: 58 }} /><col style={{ width: 72 }} />
                  {DAYS.map((d) => <col key={d} />)}
                  <col style={{ width: 60 }} />
                </colgroup>
                <thead>
                  <tr>
                    <th>Uke</th><th>Fase</th>
                    {DAYS.map((d) => <th key={d} style={{ textAlign: "center" }}>{DAY_LABELS[d]}</th>)}
                    <th style={{ textAlign: "right" }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.length === 0 && (
                    <tr><td colSpan={10} style={{ textAlign: "center", color: "var(--e-text-faint)", padding: 24 }}>Ingen plan — generer en med verktøylinja over.</td></tr>
                  )}
                  {visible.map((week) => {
                    const isCur = week.weekNumber === curWk;
                    const byDow = daysByDow(week);
                    return (
                      <tr
                        key={week.weekNumber}
                        ref={isCur ? currentRef : null}
                        className={`${isCur ? "selected" : ""}${selectedRow === week.weekNumber ? " selected" : ""}`}
                        style={{ cursor: "pointer" }}
                        onClick={() => setSelectedRow(week.weekNumber === selectedRow ? null : week.weekNumber)}
                      >
                        <td style={{ verticalAlign: "middle" }}>
                          <span style={{ fontFamily: "var(--ff-mono)", fontWeight: 700, fontSize: 12, color: isCur ? "var(--e-primary)" : "var(--e-text)" }}>
                            W{week.weekNumber}
                          </span>
                          {isCur && <div style={{ fontSize: 8, color: "var(--e-primary)", fontWeight: 800, textTransform: "uppercase" }}>NÅ</div>}
                          <div style={{ fontSize: 9, color: "var(--e-text-faint)", lineHeight: 1.3, marginTop: 1 }}>
                            {shortDate(week.startDate)}<br />{shortDate(week.endDate)}
                          </div>
                        </td>
                        <td style={{ verticalAlign: "middle" }}>
                          <span className={`phase-tag ${phaseClassFor(week.phase)}`} style={{ fontSize: 9, padding: "2px 5px" }}>
                            {(week.phase ?? "").replace("Build ", "B").slice(0, 10)}
                          </span>
                        </td>
                        {DAYS.map((dow) => {
                          const day = byDow[dow];
                          const workouts = (day?.workouts ?? []).filter((workout) => !isRestType(workout?.type));
                          if (!day || workouts.length === 0) {
                            return (
                              <td key={dow} className="plan-day-cell-wrap" style={{ textAlign: "center", verticalAlign: "middle", color: "var(--e-text-faint)", fontSize: 10, background: "var(--e-surface-alt)" }}>
                                {day && <div className="plan-day-date">{shortDate(day.date)}</div>}
                                <span>—</span>
                                {day && (
                                  <button type="button" className="day-add-btn" aria-label={dayAddLabel(day, dow)} title="Legg til økt" onClick={(event) => openAddWorkout(week, day, event)}>＋</button>
                                )}
                              </td>
                            );
                          }
                          return (
                            <td key={dow} className="plan-day-cell-wrap" style={{ verticalAlign: "top", padding: "3px 4px" }}>
                              <div className="plan-day-date">{shortDate(day.date)}</div>
                              <div className="plan-workout-list">
                                {workouts.map((workout) => {
                                  const ts = typeStyleFor(workout.type);
                                  const workoutName = workout.name || workout.humanReadable || workout.type || "Økt";
                                  return (
                                    <button
                                      key={workout.id ?? `${day.date}-${workoutName}`}
                                      type="button"
                                      className="plan-workout-chip"
                                      style={{ borderLeftColor: ts.c, background: ts.bg, opacity: workout.completed ? 0.55 : 1 }}
                                      onClick={(event) => openEditWorkout(week, day, workout, event)}
                                    >
                                      <span className="plan-workout-type" style={{ color: ts.c }}>{workout.type || "Økt"}</span>
                                      <span className="plan-workout-name">{workoutName}</span>
                                      <span className="plan-workout-meta">
                                        {workout.distanceKm ? `${workout.distanceKm}km` : ""}
                                        {workout.durationMinutes ? `${workout.distanceKm ? " · " : ""}${workout.durationMinutes}min` : ""}
                                        {workout.completed ? " · ferdig" : ""}
                                      </span>
                                    </button>
                                  );
                                })}
                              </div>
                              <button type="button" className="day-add-btn" aria-label={dayAddLabel(day, dow)} title="Legg til økt" onClick={(event) => openAddWorkout(week, day, event)}>＋</button>
                            </td>
                          );
                        })}
                        <td style={{ textAlign: "right", verticalAlign: "middle" }}>
                          <span style={{ fontFamily: "var(--ff-mono)", fontWeight: 700, fontSize: 11, color: isCur ? "var(--e-primary)" : "var(--e-text)" }}>
                            {weekTotalKm(week)}
                          </span>
                          <div style={{ fontSize: 9, color: "var(--e-text-faint)" }}>km</div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                {allWeeks.length > 0 && (
                  <tfoot>
                    <tr>
                      <td colSpan={2} style={{ color: "var(--e-text-muted)" }}>Sesongtotal</td>
                      {DAYS.map((d) => <td key={d} />)}
                      <td style={{ textAlign: "right", fontFamily: "var(--ff-mono)" }}>
                        {allWeeks.reduce((s, w) => s + weekTotalKm(w), 0)} km
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>

          {/* Race strategy panel from plan_data.raceStrategy */}
          {!expandedWeekPlan && <RaceStrategyPanel raceStrategy={activePlanData?.raceStrategy} />}
        </div>
      </div>
      <WorkoutEditorModal modal={workoutModal} onClose={() => setWorkoutModal(null)} onSave={saveWorkout} onDelete={deleteWorkout} />
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/* COACHING — rich analytics + AI report (replaces the old Analytics page)    */
/* ────────────────────────────────────────────────────────────────────────── */

const COACHING_SECTIONS = ["Ytelse", "Volum", "Soner", "Effektivitet", "Progresjon", "Varmekart", "Trenerrapport"];
const TYPE_C = {
  Run: "#1850a0", Hike: "#1b6b3a", Ride: "#5028a0", Walk: "#7a9eb0",
  Workout: "#5c3a1a", Strength: "#5c3a1a", Swim: "#1a5fb4", Rest: "#ccc",
};
const PEAK_LONG_RUN_TARGET_KM = 40;

function fmtNbDate(iso) {
  return new Date(iso + "T00:00:00Z").toLocaleDateString("nb-NO", { month: "short", day: "numeric", timeZone: "UTC" });
}

function buildPhaseLookup(planData) {
  const weeks = planData?.weeks ?? [];
  return (iso) => {
    const w = weeks.find((wk) => wk.startDate <= iso && iso <= wk.endDate);
    const ph = w?.phase || "Base";
    const s = phaseStyleFor(ph);
    return { name: ph, color: s.c, bg: s.bg };
  };
}

function buildCoachingData({ activities, loadSeries, planData }) {
  const phaseFor = buildPhaseLookup(planData);

  // Per-day load by ISO date — used to type-tag each day in the 26-week view.
  const dailyByDate = {};
  (activities ?? []).forEach((a) => {
    if (!a.started_at) return;
    const day = a.started_at.slice(0, 10);
    if (!dailyByDate[day]) dailyByDate[day] = { load: 0, dist: 0, type: "Rest" };
    dailyByDate[day].load += (Number(a.moving_time) || 0) / 60;
    const km = Number(a.distance_km) || (Number(a.distance) || 0) / 1000;
    dailyByDate[day].dist += km;
    const t = a.type || a.activity_type || "Run";
    if (km > dailyByDate[day].dist - km || dailyByDate[day].type === "Rest") dailyByDate[day].type = t;
  });

  const days = (loadSeries ?? []).slice(-182).map((d) => {
    const ph = phaseFor(d.date);
    const meta = dailyByDate[d.date] || { load: 0, dist: 0, type: "Rest" };
    return {
      date: d.date,
      dateObj: new Date(d.date + "T00:00:00Z"),
      ctl: +d.ctl.toFixed(1),
      atl: +d.atl.toFixed(1),
      tsb: +d.tsb.toFixed(1),
      load: Math.round(meta.load),
      dist: +meta.dist.toFixed(1),
      type: meta.type,
      phase: ph.name,
      phaseColor: ph.color,
      phaseBg: ph.bg,
    };
  });

  // Weekly summaries — rolled from activities, joined with phase from plan.
  const summary = computeWeeklySummary(activities ?? []);
  const weeks = Object.entries(summary)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-26)
    .map(([weekStart, w], idx) => {
      const ph = phaseFor(weekStart);
      return {
        wk: idx,
        date: weekStart,
        km: +(w.distance / 1000).toFixed(1),
        load: Math.round(w.time / 60),
        sessions: w.count,
        phase: ph.name,
        phaseColor: ph.color,
        label: fmtNbDate(weekStart),
      };
    });

  // Long runs — adapter on existing helper, keep only ≥ 10 km.
  const longRuns = computeLongRuns(activities ?? [])
    .map(([weekStart, lr], i) => ({
      date: weekStart,
      dist: +(lr.distance / 1000).toFixed(1),
      wk: i,
      label: fmtNbDate(weekStart),
    }))
    .filter((r) => r.dist >= 10);

  return { days, weeks, longRuns };
}

/* ── Fitness state gauges ────────────────────────────────────────────────── */
function FitnessGauges({ ctl, atl, tsb }) {
  const formState =
    tsb > 10 ? { l: "Frisk",          c: "var(--e-ok)" } :
    tsb > 0  ? { l: "Optimal",        c: "#2e7d32" } :
    tsb > -10 ? { l: "Produktiv",     c: "var(--e-primary)" } :
    tsb > -20 ? { l: "Sliten",        c: "var(--e-warn)" } :
                 { l: "Overbelastet", c: "var(--e-alert)" };
  const ratio = ctl > 0 ? atl / ctl : 0;
  const risk = ratio > 1.5 ? "Høy" : ratio > 1.2 ? "Moderat" : "Lav";
  const riskC = ratio > 1.5 ? "var(--e-alert)" : ratio > 1.2 ? "var(--e-warn)" : "var(--e-ok)";
  const fitnessLvl = ctl < 40 ? "Bygger" : ctl < 60 ? "Utvikler" : ctl < 75 ? "Sterk" : ctl < 90 ? "Avansert" : "Topp";

  const cells = [
    { l: "Form (CTL)",     v: ctl,                                sub: "Kronisk belastning", c: "#1a5fb4",         note: `${fitnessLvl} formnivå` },
    { l: "Tretthet (ATL)", v: atl,                                sub: "Akutt belastning",   c: "#b01c1c",         note: `ATL/CTL: ${ratio.toFixed(2)}` },
    { l: "Balanse (TSB)",  v: `${tsb > 0 ? "+" : ""}${tsb}`,      sub: "Stressbalanse",      c: formState.c,       note: formState.l },
    { l: "Skaderisiko",    v: risk,                               sub: "ATL/CTL-forhold",    c: riskC,             note: `${ratio.toFixed(2)} forhold` },
    { l: "Formnivå",       v: fitnessLvl,                         sub: "Basert på CTL",      c: "var(--e-primary)", note: `CTL: ${ctl}` },
  ];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", borderBottom: "1px solid var(--e-border)" }}>
      {cells.map(({ l, v, c, note }) => (
        <div key={l} style={{ padding: "10px 14px", borderRight: "1px solid var(--e-border)" }}>
          <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--e-text-faint)", marginBottom: 5 }}>{l}</div>
          <div style={{ fontFamily: "var(--ff-mono)", fontSize: 20, fontWeight: 800, color: c, lineHeight: 1, marginBottom: 3 }}>{v}</div>
          <div style={{ fontSize: 10, color: "var(--e-text-faint)" }}>{note}</div>
        </div>
      ))}
    </div>
  );
}

/* ── Performance Management Chart ────────────────────────────────────────── */
function PMCChart({ days }) {
  const svgRef = useRef(null);
  const [hoverI, setHoverI] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const W = 1000, H = 180, padL = 36, padR = 8, padT = 12, padB = 20;
  const cw = W - padL - padR, ch = H - padT - padB;

  const allVals = days.flatMap((d) => [d.ctl, d.atl, d.tsb + 20]);
  const minV = Math.min(...allVals, 0) - 5;
  const maxV = Math.max(...allVals, 10) + 5;
  const range = maxV - minV || 1;

  const tx = (i) => padL + (i / Math.max(1, days.length - 1)) * cw;
  const ty = (v) => padT + (1 - (v - minV) / range) * ch;
  const tsbZeroY = ty(0);

  const makePath = (key) => days.map((d, i) => `${i === 0 ? "M" : "L"}${tx(i).toFixed(1)},${ty(d[key]).toFixed(1)}`).join(" ");
  const ctlPath = makePath("ctl");
  const atlPath = makePath("atl");
  const tsbPath = days.map((d, i) => `${i === 0 ? "M" : "L"}${tx(i).toFixed(1)},${ty(d.tsb).toFixed(1)}`).join(" ");
  const ctlArea = ctlPath + ` L${tx(days.length - 1)},${padT + ch} L${padL},${padT + ch} Z`;

  // Phase bands.
  const phaseBands = [];
  let curPhase = null, curStart = 0;
  days.forEach((d, i) => {
    if (d.phase !== curPhase) {
      if (curPhase !== null) phaseBands.push({ phase: curPhase, color: days[i - 1].phaseBg, x1: tx(curStart), x2: tx(i) });
      curPhase = d.phase; curStart = i;
    }
  });
  if (days.length > 0) phaseBands.push({ phase: curPhase, color: days[days.length - 1].phaseBg, x1: tx(curStart), x2: tx(days.length - 1) });

  const ticks = [];
  days.forEach((d, i) => {
    if (d.dateObj.getUTCDate() === 1) ticks.push({ i, label: d.dateObj.toLocaleDateString("nb-NO", { month: "short", timeZone: "UTC" }) });
  });

  const handleMouseMove = useCallback((e) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const xRel = ((e.clientX - rect.left) / rect.width) * W;
    const dataX = (xRel - padL) / cw;
    const idx = Math.min(days.length - 1, Math.max(0, Math.round(dataX * (days.length - 1))));
    setHoverI(idx);
    setTooltipPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  }, [days.length, cw]);

  const hd = hoverI !== null ? days[hoverI] : null;
  const formState = hd ? (hd.tsb > 10 ? "Frisk" : hd.tsb > 0 ? "Optimal" : hd.tsb > -15 ? "Produktiv" : hd.tsb > -30 ? "Sliten" : "Overbelastet") : "";

  return (
    <div style={{ position: "relative" }} onMouseLeave={() => setHoverI(null)}>
      <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: H, display: "block", cursor: "crosshair" }} onMouseMove={handleMouseMove}>
        {[-20, 0, 20, 40, 60, 80, 100].map((v) => (
          <line key={v} x1={padL} y1={ty(v)} x2={W - padR} y2={ty(v)} stroke={v === 0 ? "rgba(0,0,0,0.2)" : "var(--e-border)"} strokeWidth={v === 0 ? 1.5 : 1} strokeDasharray={v === 0 ? "none" : "3 3"} />
        ))}
        {phaseBands.map((b, i) => (
          <rect key={i} x={b.x1} y={padT} width={b.x2 - b.x1} height={ch} fill={b.color} opacity="0.35" />
        ))}
        <clipPath id="pmcTsbAbove"><rect x={padL} y={padT} width={cw} height={tsbZeroY - padT} /></clipPath>
        <clipPath id="pmcTsbBelow"><rect x={padL} y={tsbZeroY} width={cw} height={padT + ch - tsbZeroY} /></clipPath>
        <path d={tsbPath + ` L${tx(days.length - 1)},${tsbZeroY} L${padL},${tsbZeroY} Z`} fill="rgba(80,40,160,0.12)" clipPath="url(#pmcTsbAbove)" />
        <path d={tsbPath + ` L${tx(days.length - 1)},${tsbZeroY} L${padL},${tsbZeroY} Z`} fill="rgba(176,28,28,0.08)" clipPath="url(#pmcTsbBelow)" />
        <path d={ctlArea} fill="rgba(26,95,180,0.07)" />
        <path d={ctlPath} fill="none" stroke="#1a5fb4" strokeWidth="2" strokeLinejoin="round" />
        <path d={atlPath} fill="none" stroke="#b01c1c" strokeWidth="1.5" strokeLinejoin="round" strokeDasharray="4 2" />
        <path d={tsbPath} fill="none" stroke="#5028a0" strokeWidth="1.5" strokeLinejoin="round" />
        <line x1={padL} y1={tsbZeroY} x2={W - padR} y2={tsbZeroY} stroke="rgba(0,0,0,0.25)" strokeWidth="1" />
        {ticks.map((t) => (
          <g key={t.i}>
            <line x1={tx(t.i)} y1={padT + ch} x2={tx(t.i)} y2={padT + ch + 4} stroke="var(--e-border)" strokeWidth="1" />
            <text x={tx(t.i)} y={padT + ch + 14} fontSize="9" fill="var(--e-text-faint)" textAnchor="middle">{t.label}</text>
          </g>
        ))}
        {[0, 20, 40, 60, 80].map((v) => (
          <text key={v} x={padL - 4} y={ty(v) + 3} fontSize="9" fill="var(--e-text-faint)" textAnchor="end">{v}</text>
        ))}
        {hoverI !== null && (
          <>
            <line x1={tx(hoverI)} y1={padT} x2={tx(hoverI)} y2={padT + ch} stroke="rgba(0,0,0,0.3)" strokeWidth="1" strokeDasharray="3 2" />
            <circle cx={tx(hoverI)} cy={ty(days[hoverI].ctl)} r="4" fill="#1a5fb4" stroke="#fff" strokeWidth="1.5" />
            <circle cx={tx(hoverI)} cy={ty(days[hoverI].atl)} r="3.5" fill="#b01c1c" stroke="#fff" strokeWidth="1.5" />
            <circle cx={tx(hoverI)} cy={ty(days[hoverI].tsb)} r="3.5" fill="#5028a0" stroke="#fff" strokeWidth="1.5" />
          </>
        )}
      </svg>
      {hd && (
        <div style={{
          position: "absolute", left: tooltipPos.x + 14, top: tooltipPos.y - 60,
          background: "var(--e-text)", color: "#fff", padding: "8px 11px",
          fontSize: 11, lineHeight: 1.7, pointerEvents: "none", zIndex: 50,
          whiteSpace: "nowrap", boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
        }}>
          <div style={{ fontWeight: 700, marginBottom: 3, borderBottom: "1px solid rgba(255,255,255,0.15)", paddingBottom: 3 }}>
            {fmtNbDate(hd.date)} · {hd.type !== "Rest" ? hd.type : "Hviledag"}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "auto auto", gap: "0 12px" }}>
            <span style={{ color: "#8ab4e8" }}>Form (CTL)</span><span style={{ fontFamily: "var(--ff-mono)", fontWeight: 700 }}>{hd.ctl}</span>
            <span style={{ color: "#e88a8a" }}>Tretthet (ATL)</span><span style={{ fontFamily: "var(--ff-mono)", fontWeight: 700 }}>{hd.atl}</span>
            <span style={{ color: "#b89ae8" }}>Balanse (TSB)</span><span style={{ fontFamily: "var(--ff-mono)", fontWeight: 700, color: hd.tsb > 0 ? "#7ee8a2" : "#e89a7e" }}>{hd.tsb > 0 ? "+" : ""}{hd.tsb}</span>
            <span style={{ color: "rgba(255,255,255,0.5)" }}>Tilstand</span><span style={{ fontWeight: 700, color: hd.tsb > 0 ? "#7ee8a2" : hd.tsb > -15 ? "#8ab4e8" : "#e89a7e" }}>{formState}</span>
            {hd.type !== "Rest" && <><span style={{ color: "rgba(255,255,255,0.5)" }}>Belastning</span><span style={{ fontFamily: "var(--ff-mono)" }}>{hd.load} TSS</span></>}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Weekly volume bars ──────────────────────────────────────────────────── */
function VolumeChart({ weeks }) {
  const [hoverI, setHoverI] = useState(null);
  const W = 1000, H = 110, padL = 36, padR = 8, padT = 8, padB = 18;
  const cw = W - padL - padR, ch = H - padT - padB;
  const maxKm = Math.max(...weeks.map((w) => w.km), 1);
  const gap = 2;
  const bw = (cw - gap * (weeks.length - 1)) / Math.max(1, weeks.length);

  return (
    <div style={{ position: "relative" }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: H, display: "block" }} onMouseLeave={() => setHoverI(null)}>
        {[0, 0.25, 0.5, 0.75, 1].map((t) => (
          <line key={t} x1={padL} y1={padT + ch * (1 - t)} x2={W - padR} y2={padT + ch * (1 - t)} stroke="var(--e-border)" strokeWidth="1" strokeDasharray="3 3" />
        ))}
        {weeks.map((w, i) => {
          const x = padL + i * (bw + gap);
          const h = (w.km / maxKm) * ch;
          const isHover = hoverI === i;
          return (
            <g key={i} onMouseEnter={() => setHoverI(i)}>
              <rect x={x} y={padT + ch - h} width={bw} height={h}
                fill={isHover ? w.phaseColor : w.phaseColor + "bb"}
                stroke={isHover ? w.phaseColor : "none"} strokeWidth="1" />
              {i % 4 === 0 && <text x={x + bw / 2} y={padT + ch + 13} fontSize="8" fill="var(--e-text-faint)" textAnchor="middle">{w.label}</text>}
            </g>
          );
        })}
        {weeks.length > 0 && (() => {
          const i = weeks.length - 1, x = padL + i * (bw + gap);
          return <line x1={x + bw / 2} y1={padT} x2={x + bw / 2} y2={padT + ch} stroke="var(--e-primary)" strokeWidth="1.5" strokeDasharray="3 2" />;
        })()}
        <text x={padL - 4} y={padT + ch + 3} fontSize="9" fill="var(--e-text-faint)" textAnchor="end">0</text>
        <text x={padL - 4} y={padT + 3} fontSize="9" fill="var(--e-text-faint)" textAnchor="end">{Math.round(maxKm)}</text>
      </svg>
      {hoverI !== null && (() => {
        const w = weeks[hoverI];
        const x = padL + hoverI * (bw + gap) + bw / 2;
        const xPct = (x / W) * 100;
        return (
          <div style={{ position: "absolute", left: `calc(${xPct}% + 6px)`, top: 4, background: "var(--e-text)", color: "#fff", padding: "6px 10px", fontSize: 11, lineHeight: 1.6, pointerEvents: "none", zIndex: 50, whiteSpace: "nowrap" }}>
            <strong>{w.label}</strong> · <span style={{ color: w.phaseColor, fontWeight: 700 }}>{w.phase}</span>
            <div style={{ fontFamily: "var(--ff-mono)", fontWeight: 700 }}>{w.km} km · {w.sessions} økter · {w.load} TSS</div>
          </div>
        );
      })()}
    </div>
  );
}

/* ── Zone distribution (stacked bars + season totals) ────────────────────── */
function ZoneDistribution({ zoneWeeks }) {
  const [hoverI, setHoverI] = useState(null);
  const W = 700, H = 90, padL = 30, padR = 6, padT = 6, padB = 16;
  const cw = W - padL - padR, ch = H - padT - padB;
  const totals = [0, 0, 0, 0, 0];
  zoneWeeks.forEach((w) => w.z.forEach((v, zi) => { totals[zi] += v; }));
  const grandTotal = totals.reduce((s, v) => s + v, 0) || 1;
  const maxZ = Math.max(...zoneWeeks.map((w) => w.z.reduce((s, v) => s + v, 0)), 1);
  const gap = 2, bw = (cw - gap * (zoneWeeks.length - 1)) / Math.max(1, zoneWeeks.length);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 180px", gap: 12, alignItems: "center" }}>
      <div style={{ position: "relative" }}>
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: H, display: "block" }} onMouseLeave={() => setHoverI(null)}>
          {zoneWeeks.map((w, i) => {
            const x = padL + i * (bw + gap);
            let y = padT + ch;
            return (
              <g key={i} onMouseEnter={() => setHoverI(i)}>
                {w.z.map((v, zi) => {
                  const h = (v / maxZ) * ch;
                  y -= h;
                  return <rect key={zi} x={x} y={y} width={bw} height={h} fill={ZONE_COLORS[zi]} />;
                })}
              </g>
            );
          })}
          {zoneWeeks.filter((_, i) => i % 4 === 0).map((w) => {
            const realI = zoneWeeks.indexOf(w);
            return <text key={realI} x={padL + realI * (bw + gap) + bw / 2} y={padT + ch + 12} fontSize="8" fill="var(--e-text-faint)" textAnchor="middle">{w.label}</text>;
          })}
        </svg>
        {hoverI !== null && (() => {
          const w = zoneWeeks[hoverI];
          const total = w.z.reduce((s, v) => s + v, 0) || 1;
          return (
            <div style={{ position: "absolute", left: 12, top: 0, background: "var(--e-text)", color: "#fff", padding: "7px 10px", fontSize: 11, lineHeight: 1.65, pointerEvents: "none", zIndex: 50, whiteSpace: "nowrap" }}>
              <strong>{w.label}</strong>
              {w.z.map((v, zi) => (
                <div key={zi} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ width: 8, height: 8, background: ZONE_COLORS[zi] }} />
                  <span style={{ color: "rgba(255,255,255,0.7)" }}>{ZONE_LABELS[zi]}:</span>
                  <span style={{ fontFamily: "var(--ff-mono)", fontWeight: 700 }}>{Math.round((v / total) * 100)}%</span>
                </div>
              ))}
            </div>
          );
        })()}
      </div>

      <div>
        <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--e-text-faint)", marginBottom: 6 }}>Sesongtotal</div>
        {totals.map((v, zi) => (
          <div key={zi} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
            <div style={{ width: 8, height: 8, background: ZONE_COLORS[zi], flexShrink: 0 }} />
            <div style={{ flex: 1, height: 5, background: "var(--e-bg)" }}>
              <div style={{ height: "100%", width: `${(v / grandTotal) * 100}%`, background: ZONE_COLORS[zi] }} />
            </div>
            <span style={{ fontFamily: "var(--ff-mono)", fontSize: 10, fontWeight: 700, color: "var(--e-text)", minWidth: 30, textAlign: "right" }}>{Math.round((v / grandTotal) * 100)}%</span>
          </div>
        ))}
        <div style={{ marginTop: 6, paddingTop: 5, borderTop: "1px solid var(--e-border)", fontSize: 10, color: "var(--e-text-faint)" }}>
          Aerob (Z1+Z2): <strong style={{ color: "var(--e-text)", fontFamily: "var(--ff-mono)" }}>{Math.round(((totals[0] + totals[1]) / grandTotal) * 100)}%</strong>
        </div>
      </div>
    </div>
  );
}

/* ── Long run progression ────────────────────────────────────────────────── */
function LongRunChart({ runs, target }) {
  const [hovI, setHovI] = useState(null);
  if (!runs.length) return <div style={{ color: "var(--e-text-faint)", padding: 20, textAlign: "center" }}>Ingen langturer enda.</div>;
  const W = 600, H = 100, padL = 34, padR = 8, padT = 10, padB = 18;
  const cw = W - padL - padR, ch = H - padT - padB;
  const maxD = Math.max(...runs.map((r) => r.dist), target) * 1.1;
  const tx = (i) => padL + (i / Math.max(1, runs.length - 1)) * cw;
  const ty = (v) => padT + (1 - v / maxD) * ch;
  const pts = runs.map((r, i) => [tx(i), ty(r.dist)]);
  const line = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  const area = line + ` L${tx(runs.length - 1)},${padT + ch} L${padL},${padT + ch} Z`;
  const targetY = ty(target);

  return (
    <div style={{ position: "relative" }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: H, display: "block" }} onMouseLeave={() => setHovI(null)}>
        {[0, 0.25, 0.5, 0.75, 1].map((t) => (
          <line key={t} x1={padL} y1={padT + ch * (1 - t)} x2={W - padR} y2={padT + ch * (1 - t)} stroke="var(--e-border)" strokeWidth="1" strokeDasharray="3 3" />
        ))}
        <line x1={padL} y1={targetY} x2={W - padR} y2={targetY} stroke="#b85000" strokeWidth="1" strokeDasharray="5 3" />
        <text x={W - padR - 2} y={targetY - 3} fontSize="9" fill="#b85000" textAnchor="end">Toppmål {target} km</text>
        <path d={area} fill="rgba(80,40,160,0.09)" />
        <path d={line} fill="none" stroke="#5028a0" strokeWidth="2" strokeLinejoin="round" />
        {pts.map((p, i) => (
          <circle key={i} cx={p[0]} cy={p[1]} r={hovI === i ? 5 : 3.5}
            fill={hovI === i ? "#5028a0" : "#fff"} stroke="#5028a0" strokeWidth="2"
            style={{ cursor: "pointer" }}
            onMouseEnter={() => setHovI(i)} onMouseLeave={() => setHovI(null)} />
        ))}
        {runs.filter((_, i) => i % 3 === 0 || i === runs.length - 1).map((r) => {
          const realI = runs.indexOf(r);
          return <text key={realI} x={tx(realI)} y={padT + ch + 13} fontSize="9" fill="var(--e-text-faint)" textAnchor="middle">{r.label}</text>;
        })}
        <text x={padL - 4} y={ty(0) + 3} fontSize="9" fill="var(--e-text-faint)" textAnchor="end">0</text>
        <text x={padL - 4} y={ty(target) + 3} fontSize="9" fill="var(--e-text-faint)" textAnchor="end">{target}</text>
      </svg>
      {hovI !== null && (() => {
        const r = runs[hovI];
        return (
          <div style={{ position: "absolute", left: (tx(hovI) / W) * 100 + "%", top: 0, background: "var(--e-text)", color: "#fff", padding: "6px 10px", fontSize: 11, lineHeight: 1.6, pointerEvents: "none", zIndex: 50, whiteSpace: "nowrap", transform: "translateX(-50%)" }}>
            <strong>{r.label}</strong><br />
            <span style={{ fontFamily: "var(--ff-mono)", fontWeight: 700 }}>{r.dist} km</span>
            {r.dist >= target && <span style={{ color: "#7ee8a2", marginLeft: 6 }}>✓ Mål nådd</span>}
          </div>
        );
      })()}
    </div>
  );
}

/* ── Aerobic efficiency trend ────────────────────────────────────────────── */
function EfficiencyChart({ points }) {
  const [hovI, setHovI] = useState(null);
  if (!points.length) return <div style={{ color: "var(--e-text-faint)", padding: 20, textAlign: "center" }}>Ikke nok data — kvalifiserende økter (≥30 min, lav-aerob, jevnt terreng) trengs.</div>;
  const W = 700, H = 100, padL = 38, padR = 8, padT = 10, padB = 18;
  const cw = W - padL - padR, ch = H - padT - padB;
  const efs = points.map((p) => p.ef).filter((v) => v > 0);
  const minEF = Math.min(...efs) - 0.03;
  const maxEF = Math.max(...efs) + 0.03;
  const rangeEF = maxEF - minEF || 0.1;
  const tx = (i) => padL + (i / Math.max(1, points.length - 1)) * cw;
  const ty = (v) => padT + (1 - (v - minEF) / rangeEF) * ch;

  const rolling = points.map((p) => p.rolling || p.ef);
  const rollPath = rolling.map((v, i) => `${i === 0 ? "M" : "L"}${tx(i).toFixed(1)},${ty(v).toFixed(1)}`).join(" ");

  return (
    <div style={{ position: "relative" }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: H, display: "block" }} onMouseLeave={() => setHovI(null)}>
        {[0, 0.25, 0.5, 0.75, 1].map((t) => (
          <line key={t} x1={padL} y1={padT + ch * (1 - t)} x2={W - padR} y2={padT + ch * (1 - t)} stroke="var(--e-border)" strokeWidth="1" strokeDasharray="3 3" />
        ))}
        {points.map((p, i) => (
          <circle key={i} cx={tx(i)} cy={ty(p.ef)} r={hovI === i ? 5 : 3}
            fill={TYPE_C[p.type] || "#888"} opacity={0.75}
            style={{ cursor: "pointer" }}
            onMouseEnter={() => setHovI(i)} onMouseLeave={() => setHovI(null)} />
        ))}
        <path d={rollPath} fill="none" stroke="var(--e-text)" strokeWidth="2" strokeLinejoin="round" />
        {[minEF, (minEF + maxEF) / 2, maxEF].map((v, i) => (
          <text key={i} x={padL - 4} y={ty(v) + 3} fontSize="9" fill="var(--e-text-faint)" textAnchor="end">{v.toFixed(2)}</text>
        ))}
        {rolling.length > 0 && (
          <>
            <line x1={padL} y1={ty(rolling[0])} x2={tx(Math.min(5, points.length - 1))} y2={ty(rolling[0])} stroke="#888" strokeWidth="1" strokeDasharray="3 2" />
            <text x={padL + 4} y={ty(rolling[0]) - 3} fontSize="8" fill="#888">Baseline</text>
          </>
        )}
      </svg>
      {hovI !== null && (() => {
        const p = points[hovI];
        return (
          <div style={{ position: "absolute", left: (tx(hovI) / W) * 100 + "%", top: 0, background: "var(--e-text)", color: "#fff", padding: "6px 10px", fontSize: 11, lineHeight: 1.6, pointerEvents: "none", zIndex: 50, whiteSpace: "nowrap", transform: "translateX(-50%)" }}>
            <strong>{p.label}</strong> · {p.type}<br />
            EF: <span style={{ fontFamily: "var(--ff-mono)", fontWeight: 700 }}>{p.ef.toFixed(3)}</span> · HR: <span style={{ fontFamily: "var(--ff-mono)" }}>{Math.round(p.hr)} bpm</span>
          </div>
        );
      })()}
    </div>
  );
}

/* ── Training week heatmap (last 8 weeks) ───────────────────────────────── */
function WeekHeatmap({ days }) {
  const recent = days.slice(-56);
  const weeks = [];
  for (let i = 0; i < recent.length; i += 7) weeks.push(recent.slice(i, i + 7));
  const maxLoad = Math.max(...recent.map((d) => d.load), 1);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 2, marginBottom: 2 }}>
        {["M", "T", "O", "T", "F", "L", "S"].map((d, i) => (
          <div key={i} style={{ textAlign: "center", fontSize: 9, fontWeight: 700, color: "var(--e-text-faint)" }}>{d}</div>
        ))}
      </div>
      {weeks.map((week, wi) => (
        <div key={wi} style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 2 }}>
          {week.map((d, di) => {
            const intensity = d.load / maxLoad;
            const baseC = TYPE_C[d.type] || "#1a5fb4";
            const bg = d.load === 0 ? "var(--e-bg)" :
              intensity > 0.8 ? baseC :
              intensity > 0.5 ? baseC + "aa" :
              baseC + "55";
            return (
              <div key={di} title={`${d.date}: ${d.type}${d.dist > 0 ? ` ${d.dist}km` : ""}`}
                style={{ height: 18, background: bg, border: "1px solid var(--e-border)", position: "relative" }} />
            );
          })}
        </div>
      ))}
      <div style={{ display: "flex", gap: 8, marginTop: 4, flexWrap: "wrap" }}>
        {Object.entries(TYPE_C).filter(([k]) => k !== "Rest").map(([type, c]) => (
          <div key={type} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: "var(--e-text-faint)" }}>
            <div style={{ width: 10, height: 10, background: c }} />{type}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── AI Coaching report (data-derived narrative + chat dock) ─────────────── */
function buildCoachReportSections({ days, longRuns, zoneWeeks, efficiency, insights }) {
  const out = [];

  if (days.length >= 14) {
    const first = days[0].ctl, latest = days[days.length - 1].ctl;
    const pct = first > 0 ? ((latest - first) / first) * 100 : 0;
    const wks = Math.round(days.length / 7);
    const tier = latest < 40 ? "byggende" : latest < 60 ? "utviklende" : latest < 75 ? "sterk" : latest < 90 ? "avansert" : "topp";
    out.push({
      color: "var(--e-primary)", icon: "📈", title: "Formutvikling",
      text: `CTL har gått fra ${first.toFixed(0)} → ${latest.toFixed(0)} over ${wks} uker (${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%). Nåværende form er på ${tier} nivå. Fortsett progresjonen i kontrollerte rampetrinn (5–8% per måned er bærekraftig).`,
    });
  }

  if (efficiency.points.length >= 4) {
    const first = efficiency.points[0]?.ef;
    const last = efficiency.points[efficiency.points.length - 1]?.ef;
    if (typeof first === "number" && typeof last === "number" && first > 0) {
      const pct = ((last - first) / first) * 100;
      out.push({
        color: "var(--e-ok)", icon: "💓", title: "Aerob effektivitet",
        text: `Effektivitetsfaktoren har endret seg fra ${first.toFixed(2)} til ${last.toFixed(2)} (${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%). ${pct > 3 ? "Tydelig aerob tilpasning — du løper raskere ved samme puls." : pct < -3 ? "Svekkelse over perioden — vurder mer Z2 og bedre restitusjon." : "Stabil — hold økten av kvalifiserende lav-aerobe økter for å bygge baseline."}`,
      });
    }
  }

  if (days.length >= 7) {
    const last = days[days.length - 1];
    const ratio = last.ctl > 0 ? last.atl / last.ctl : 0;
    const recent21 = days.slice(-21);
    const zeroDays = recent21.filter((d) => d.load === 0).length;
    const longGap = zeroDays >= 5 ? "Det har vært flere hvile-/manglende dager siste tre uker — pass på at neste belastning ikke spiser inn på restitusjon." : "";
    out.push({
      color: "var(--e-warn)", icon: "⚠️", title: "Belastning og restitusjon",
      text: `TSB ${last.tsb >= 0 ? "+" : ""}${last.tsb} indikerer ${last.tsb > 5 ? "frisk form" : last.tsb > -10 ? "produktiv tretthet" : "akkumulert tretthet"}. ATL/CTL = ${ratio.toFixed(2)} (${ratio > 1.5 ? "høy risiko" : ratio > 1.2 ? "moderat" : "trygg sone"}). ${longGap}`,
    });
  }

  if (longRuns.length >= 1) {
    const longest = Math.max(...longRuns.map((r) => r.dist));
    const latest = longRuns[longRuns.length - 1];
    const remaining = Math.max(0, PEAK_LONG_RUN_TARGET_KM - latest.dist);
    out.push({
      color: "var(--e-ok)", icon: "🏔", title: "Langturprogresjon",
      text: `${longRuns.length} kvalifiserende langturer (≥10 km). Lengst: ${longest.toFixed(1)} km. Siste: ${latest.dist.toFixed(1)} km (${latest.label}). ${remaining > 0 ? `Mangler ${remaining.toFixed(1)} km til toppmålet ${PEAK_LONG_RUN_TARGET_KM} km — bygg ~5–8% per måned.` : "Toppmål nådd — fokuser på spesifikk simulering og nedtrapping."}`,
    });
  }

  if (zoneWeeks.length > 0) {
    const totals = [0, 0, 0, 0, 0];
    zoneWeeks.forEach((w) => w.z.forEach((v, zi) => { totals[zi] += v; }));
    const sum = totals.reduce((s, v) => s + v, 0) || 1;
    const aerobic = ((totals[0] + totals[1]) / sum) * 100;
    const intensity = ((totals[2] + totals[3] + totals[4]) / sum) * 100;
    out.push({
      color: "var(--e-primary)", icon: "🎯", title: "Sonefordeling",
      text: `${aerobic.toFixed(0)}% aerob (Z1–Z2), ${intensity.toFixed(0)}% intensitet (Z3–Z5) over ${zoneWeeks.length} uker. ${aerobic > 75 ? "Sunn aerob pyramide for utholdenhetsbygg." : aerobic > 65 ? "Litt høyt intensitetsvolum — vurder å øke Z2-andelen." : "For mye intensitet — restruktur mot 80/20 for bedre adaptasjon."}`,
    });
  }

  const risks = (insights ?? []).filter((i) => i.type === "warning" || i.type === "danger").slice(0, 3);
  if (risks.length > 0) {
    out.push({
      color: "var(--e-alert)", icon: "🔴", title: "Risikofaktorer",
      text: risks.map((r) => `• ${r.titleKey?.replace(/^coach\./, "") || "Varsel"}${r.meta ? ` (${r.meta})` : ""}`).join(" "),
    });
  } else if (out.length > 0) {
    out.push({
      color: "var(--e-ok)", icon: "🟢", title: "Risikofaktorer",
      text: "Ingen aktive risikoflagg fra siste data. Hold rytmen og logg innsjekk ukentlig for å fange tidlige signaler.",
    });
  }

  return out;
}

function AICoachingReport({ sections }) {
  const { coachConversations, hierarchicalPlan, activities, trainingBlocks, checkins, showToast } = useAppData();
  const { activeSessionId, sessions, startNewSession, reload } = coachConversations ?? {};
  const [ask, setAsk] = useState("");
  const [chat, setChat] = useState([]);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!coachConversations) return;
    if (!activeSessionId && sessions?.length === 0) startNewSession?.();
  }, [coachConversations, activeSessionId, sessions, startNewSession]);

  const buildAthleteContext = useCallback(() => ({
    plan: hierarchicalPlan?.plan?.plan_data ?? null,
    activities: (activities?.activities ?? []).slice(0, 30).map((a) => ({
      id: a.id, name: a.name, started_at: a.started_at,
      distance_km: a.distance_km, duration: a.moving_time,
      effort: a.perceived_effort ?? null, type: a.type ?? a.activity_type,
    })),
    trainingBlocks: trainingBlocks?.blocks ?? [],
    checkins: (checkins?.checkins ?? []).slice(0, 3),
  }), [hierarchicalPlan?.plan, activities?.activities, trainingBlocks?.blocks, checkins?.checkins]);

  const send = useCallback(async () => {
    const msg = ask.trim();
    if (!msg || sending) return;
    setAsk("");
    setSending(true);
    setChat((c) => [...c, { r: "user", t: msg }]);
    try {
      const client = getSupabaseClient();
      const { data: sessionData } = await client.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) throw new Error("Ikke innlogget");
      const sid = activeSessionId;
      const { data, error } = await client.functions.invoke("claude-coach", {
        body: { sessionId: sid, newMessage: msg, athleteContext: buildAthleteContext() },
        headers: { Authorization: `Bearer ${token}` },
      });
      if (error) throw error;
      const replyText = (() => {
        const block = data?.message?.content?.find?.((b) => b.type === "text");
        if (!block) return "Trener-svar mottatt — sjekk AI-trener-fanen for full kontekst.";
        try { const parsed = JSON.parse(block.text); return parsed.content ?? block.text; }
        catch { return block.text; }
      })();
      setChat((c) => [...c, { r: "ai", t: replyText }]);
      if (data?.planUpdated) await hierarchicalPlan?.loadPlan?.();
      await reload?.();
    } catch (err) {
      showToast?.({ type: "error", message: `Trener: ${err.message}` });
      setChat((c) => [...c, { r: "ai", t: `Feil: ${err.message}` }]);
    } finally {
      setSending(false);
    }
  }, [ask, sending, activeSessionId, buildAthleteContext, hierarchicalPlan, reload, showToast]);

  return (
    <div className="ai-dock" style={{ borderTopWidth: 3 }}>
      <div className="ai-dock-header">
        <div className="ai-dock-title">
          <span className="ai-badge">AI</span>
          Trenerrapport
        </div>
        <span style={{ fontSize: 10, color: "var(--e-primary)" }}>Sesonganalyse · oppdatert i dag</span>
      </div>
      <div style={{ padding: "12px 14px", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 4 }}>
        {sections.length === 0 && (
          <div style={{ gridColumn: "1 / -1", padding: 20, textAlign: "center", color: "var(--e-text-faint)", fontSize: 11 }}>
            Ikke nok data ennå — synk Strava-aktiviteter for å se trenerrapporten.
          </div>
        )}
        {sections.map(({ color, icon, title, text }) => (
          <div key={title} style={{ borderTop: `3px solid ${color}`, paddingTop: 9 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
              <span style={{ fontSize: 16 }}>{icon}</span>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color }}>{title}</div>
            </div>
            <div style={{ fontSize: 11, color: "var(--e-text-muted)", lineHeight: 1.6 }}>{text}</div>
          </div>
        ))}
      </div>
      {chat.length > 0 && (
        <div style={{ padding: "0 14px 8px", display: "flex", flexDirection: "column", gap: 8 }}>
          {chat.map((m, i) => (
            <div key={i} style={{ display: "flex", gap: 6, justifyContent: m.r === "user" ? "flex-end" : "flex-start" }}>
              {m.r === "ai" && <div style={{ width: 18, height: 18, background: "var(--e-primary)", color: "#fff", fontSize: 9, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2 }}>✦</div>}
              <div style={{ maxWidth: "85%", padding: "7px 10px", fontSize: 11, lineHeight: 1.55, background: m.r === "ai" ? "var(--e-primary-light)" : "var(--e-primary)", color: m.r === "ai" ? "var(--e-text)" : "#fff", border: `1px solid ${m.r === "ai" ? "var(--e-primary-border)" : "var(--e-primary-hover)"}`, whiteSpace: "pre-wrap" }}>
                {m.t}
              </div>
            </div>
          ))}
          {sending && <div style={{ fontSize: 11, color: "var(--e-text-faint)", paddingLeft: 24 }}>Tenker…</div>}
        </div>
      )}
      <div className="ai-input-row" style={{ padding: "8px 14px" }}>
        <input className="ai-input" placeholder="Spør treneren — form, belastning, løpsforberedelse, restitusjon…"
          value={ask} onChange={(e) => setAsk(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()} disabled={sending} />
        <button className="ai-send" onClick={send} disabled={sending || !ask.trim()}>↑</button>
      </div>
    </div>
  );
}

/* ── Empty state ─────────────────────────────────────────────────────────── */
function CoachingEmptyState() {
  return (
    <div className="workspace">
      <div className="main-content">
        <div className="content-scroll">
          <div className="e-panel" style={{ padding: 32, textAlign: "center" }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>Ingen treningsdata ennå</div>
            <div style={{ fontSize: 11, color: "var(--e-text-faint)", maxWidth: 420, margin: "0 auto" }}>
              Coaching-fanen krever syncede aktiviteter for å beregne form, tretthet, sonefordeling og effektivitet. Koble til Strava og synk siste 90 dager fra Oversikt-fanen.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Main page ───────────────────────────────────────────────────────────── */
function CoachingPage({ activities, load, checkins, planData, plans }) {
  const [activeSection, setActiveSection] = useState("Ytelse");

  const coachingData = useMemo(
    () => buildCoachingData({ activities, loadSeries: load.series, planData }),
    [activities, load.series, planData]
  );

  const efficiency = useMemo(() => {
    const raw = computeEnduranceEfficiency(activities ?? [], { windowDays: 365 });
    const points = raw.points.map((p) => ({
      ef: p.efficiencyFactor,
      rolling: p.rollingAverage,
      hr: p.averageHeartRate,
      type: p.type === "Run" ? "Run" : p.type || "Run",
      label: fmtNbDate(p.date.slice(0, 10)),
    }));
    return { points };
  }, [activities]);

  const zoneWeeks = useMemo(() => {
    const z = computeWeeklyHRZones(activities ?? [], 26);
    return z.map((w) => ({
      label: fmtNbDate(w.weekStart),
      z: [w.z1, w.z2, w.z3, w.z4, w.z5],
      total: w.total,
    }));
  }, [activities]);

  const insights = useMemo(
    () => generateCoachingInsights({ activities: activities ?? [], checkins: checkins ?? [], plans: plans ?? [] }),
    [activities, checkins, plans]
  );

  const reportSections = useMemo(
    () => buildCoachReportSections({ days: coachingData.days, longRuns: coachingData.longRuns, zoneWeeks, efficiency, insights }),
    [coachingData.days, coachingData.longRuns, zoneWeeks, efficiency, insights]
  );

  if (!load.series.length) return <CoachingEmptyState />;

  const { days, weeks, longRuns } = coachingData;
  const current = days[days.length - 1];
  const latestEf = efficiency.points[efficiency.points.length - 1]?.ef ?? null;
  const baselineEf = efficiency.points[0]?.ef ?? null;
  const efImprovementPct = latestEf && baselineEf ? ((latestEf / baselineEf - 1) * 100).toFixed(1) : null;
  const totalKm = weeks.reduce((s, w) => s + w.km, 0);
  const sessionsAll = days.filter((d) => d.load > 0).length;

  const showAll        = activeSection === "Ytelse";
  const showVolume     = showAll || activeSection === "Volum";
  const showZones      = showAll || activeSection === "Soner";
  const showEfficiency = showAll || activeSection === "Effektivitet";
  const showProgress   = showAll || activeSection === "Progresjon";
  const showHeatmap    = activeSection === "Varmekart";
  const showReport     = showAll || activeSection === "Trenerrapport";
  const showPMC        = showAll;

  return (
    <div className="workspace" style={{ display: "flex", flex: 1, minHeight: 0, overflow: "hidden" }}>
      <div className="left-panel">
        <div className="panel-section">
          <div className="panel-section-header">Analyseseksjoner</div>
          <div style={{ padding: "4px 0" }}>
            {COACHING_SECTIONS.map((s) => (
              <div key={s} className={`panel-tree-item${activeSection === s ? " selected" : ""}`} onClick={() => setActiveSection(s)}>{s}</div>
            ))}
          </div>
        </div>
        <div className="panel-section">
          <div className="panel-section-header">Nåværende nøkkeltall</div>
          <div style={{ padding: "4px 0" }}>
            {[
              { l: "Form (CTL)", v: current?.ctl ?? 0, status: "ok" },
              { l: "Tretthet (ATL)", v: current?.atl ?? 0, status: "warn" },
              { l: "Balanse (TSB)", v: current ? `${current.tsb > 0 ? "+" : ""}${current.tsb}` : 0, status: "neutral" },
              { l: "EF-trend", v: efImprovementPct !== null ? `${efImprovementPct >= 0 ? "+" : ""}${efImprovementPct}%` : "—", status: efImprovementPct !== null && +efImprovementPct >= 0 ? "ok" : "neutral" },
              { l: "Lengste langtur", v: longRuns.length ? `${Math.max(...longRuns.map((r) => r.dist)).toFixed(1)} km` : "—", status: "ok" },
              { l: "Sesong km", v: `${Math.round(totalKm)} km`, status: "neutral" },
              { l: "Økter", v: sessionsAll, status: "neutral" },
            ].map(({ l, v, status }) => (
              <div className="panel-stat-row" key={l}>
                <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <span className={`status-dot status-${status}`} />{l}
                </span>
                <span className="panel-stat-val">{v}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="panel-section">
          <div className="panel-section-header">Datointervall</div>
          <div className="panel-filter">
            <label className="panel-filter-label">Periode</label>
            <select defaultValue="6mo">
              <option value="6mo">Siste 6 måneder</option>
              <option value="90d">Siste 90 dager</option>
              <option value="season">Sesong hittil</option>
              <option value="all">All tid</option>
            </select>
          </div>
          <div className="panel-filter">
            <label className="panel-filter-label">Aktivitetstype</label>
            <select defaultValue="all">
              <option value="all">Alle</option>
              <option value="run">Kun løp</option>
              <option value="run-hike">Løp + tur</option>
            </select>
          </div>
        </div>
      </div>

      <div className="main-content">
        <div className="toolbar">
          <div className="toolbar-group">
            {COACHING_SECTIONS.map((s) => (
              <button key={s} className={`tbtn${activeSection === s ? " active" : ""}`} onClick={() => setActiveSection(s)}>{s}</button>
            ))}
          </div>
          <div className="toolbar-spacer" />
          <div className="toolbar-group">
            <button className="tbtn">⬇ Eksporter PDF</button>
            <button className="tbtn primary" onClick={() => setActiveSection("Trenerrapport")}>✦ AI-trener</button>
          </div>
        </div>

        <div className="content-scroll">
          <div className="e-panel"><FitnessGauges ctl={Math.round(current?.ctl ?? 0)} atl={Math.round(current?.atl ?? 0)} tsb={Math.round(current?.tsb ?? 0)} /></div>

          {showPMC && (
            <div className="e-panel">
              <div className="e-panel-header">
                <div>
                  <span className="e-panel-title">Form / Tretthet / Balanse</span>
                  <span className="e-panel-subtitle" style={{ marginLeft: 10 }}>CTL · ATL · TSB — siste 26 uker · hover for detaljer</span>
                </div>
                <div className="e-panel-actions">
                  <span style={{ fontSize: 10, display: "flex", alignItems: "center", gap: 10 }}>
                    {[["#1a5fb4", "CTL Form"], ["#b01c1c", "ATL Tretthet"], ["#5028a0", "TSB Balanse"]].map(([c, l]) => (
                      <span key={l} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <span style={{ width: 14, height: 2, background: c, display: "inline-block" }} />
                        <span style={{ color: "var(--e-text-faint)" }}>{l}</span>
                      </span>
                    ))}
                  </span>
                </div>
              </div>
              <div style={{ padding: "10px 12px 8px" }}>
                <PMCChart days={days} />
              </div>
            </div>
          )}

          {showVolume && (
            <div className="e-panel">
              <div className="e-panel-header">
                <div>
                  <span className="e-panel-title">Ukentlig treningsvolum</span>
                  <span className="e-panel-subtitle" style={{ marginLeft: 10 }}>km/uke · farget etter treningsfase · {weeks.length} uker</span>
                </div>
                <div className="e-panel-actions">
                  <span style={{ fontSize: 10, display: "flex", alignItems: "center", gap: 8 }}>
                    {[["#465a6e", "Base"], ["#1850a0", "Build"], ["#5028a0", "Peak"], ["#b85000", "Taper"]].map(([c, l]) => (
                      <span key={l} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <span style={{ width: 10, height: 10, background: c, display: "inline-block" }} />
                        <span style={{ color: "var(--e-text-faint)" }}>{l}</span>
                      </span>
                    ))}
                  </span>
                </div>
              </div>
              <div style={{ padding: "10px 12px 8px" }}>
                {weeks.length > 0 ? <VolumeChart weeks={weeks} /> : <div style={{ padding: 20, textAlign: "center", color: "var(--e-text-faint)" }}>Ingen ukentlig data.</div>}
                <div style={{ display: "flex", gap: 20, marginTop: 8, borderTop: "1px solid var(--e-bg)", paddingTop: 8, fontSize: 11 }}>
                  {[
                    { l: "Topp uke", v: weeks.length ? `${Math.max(...weeks.map((w) => w.km))} km` : "—" },
                    { l: "Denne uka", v: weeks.length ? `${weeks[weeks.length - 1].km} km` : "—" },
                    { l: "Sesong-snitt", v: weeks.length ? `${(totalKm / weeks.length).toFixed(0)} km/uke` : "—" },
                    { l: "Sesong total", v: `${Math.round(totalKm)} km` },
                  ].map(({ l, v }) => (
                    <span key={l} style={{ color: "var(--e-text-faint)" }}>{l}: <strong style={{ color: "var(--e-text)", fontFamily: "var(--ff-mono)" }}>{v}</strong></span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {(showZones || showProgress) && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {showZones && (
                <div className="e-panel">
                  <div className="e-panel-header">
                    <span className="e-panel-title">HR-sonefordeling</span>
                    <span className="e-panel-subtitle">{zoneWeeks.length ? `siste ${zoneWeeks.length} uker` : "ingen HR-data"}</span>
                  </div>
                  <div style={{ padding: "10px 12px 8px" }}>
                    {zoneWeeks.length > 0
                      ? <ZoneDistribution zoneWeeks={zoneWeeks} />
                      : <div style={{ padding: 24, textAlign: "center", color: "var(--e-text-faint)", fontSize: 11 }}>Ingen HR-sonedata. Synk Strava-aktiviteter med puls.</div>}
                  </div>
                </div>
              )}
              {showProgress && (
                <div className="e-panel">
                  <div className="e-panel-header">
                    <span className="e-panel-title">Langturprogresjon</span>
                    <span className="e-panel-subtitle">Toppmål: {PEAK_LONG_RUN_TARGET_KM} km</span>
                  </div>
                  <div style={{ padding: "10px 12px 8px" }}>
                    <LongRunChart runs={longRuns} target={PEAK_LONG_RUN_TARGET_KM} />
                    <div style={{ display: "flex", gap: 16, marginTop: 8, borderTop: "1px solid var(--e-bg)", paddingTop: 8, fontSize: 11 }}>
                      <span style={{ color: "var(--e-text-faint)" }}>Siste: <strong style={{ color: "#5028a0", fontFamily: "var(--ff-mono)" }}>{longRuns[longRuns.length - 1]?.dist ?? 0} km</strong></span>
                      <span style={{ color: "var(--e-text-faint)" }}>Mål: <strong style={{ color: "#b85000", fontFamily: "var(--ff-mono)" }}>{PEAK_LONG_RUN_TARGET_KM} km</strong></span>
                      <span style={{ color: "var(--e-text-faint)" }}>Antall: <strong style={{ color: "var(--e-text)" }}>{longRuns.length}</strong></span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {showEfficiency && (
            <div className="e-panel">
              <div className="e-panel-header">
                <div>
                  <span className="e-panel-title">Aerob effektivitetstrend</span>
                  <span className="e-panel-subtitle" style={{ marginLeft: 10 }}>Effektivitetsfaktor (fart/HR) · prikker = økter · linje = 30-dagers rullende snitt</span>
                </div>
                <span className="e-panel-subtitle">Høyere = bedre form</span>
              </div>
              <div style={{ padding: "10px 12px 8px" }}>
                <EfficiencyChart points={efficiency.points} />
                {efficiency.points.length > 0 && (
                  <div style={{ display: "flex", gap: 20, marginTop: 8, borderTop: "1px solid var(--e-bg)", paddingTop: 8, fontSize: 11 }}>
                    {[
                      { l: "Nåværende EF", v: latestEf ? latestEf.toFixed(3) : "—", c: "var(--e-primary)" },
                      { l: "Baseline EF", v: baselineEf ? baselineEf.toFixed(3) : "—", c: "var(--e-text-faint)" },
                      { l: "Endring", v: efImprovementPct !== null ? `${efImprovementPct >= 0 ? "+" : ""}${efImprovementPct}%` : "—", c: "var(--e-ok)" },
                      { l: "Antall økter", v: efficiency.points.length, c: "var(--e-text)" },
                    ].map(({ l, v, c }) => (
                      <span key={l} style={{ color: "var(--e-text-faint)" }}>{l}: <strong style={{ color: c, fontFamily: "var(--ff-mono)" }}>{v}</strong></span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {showHeatmap && (
            <div className="e-panel">
              <div className="e-panel-header">
                <span className="e-panel-title">Treningsvarmekart</span>
                <span className="e-panel-subtitle">Siste 8 uker · farge = aktivitetstype · intensitet = belastning</span>
              </div>
              <div style={{ padding: "12px 14px" }}>
                <WeekHeatmap days={days} />
              </div>
            </div>
          )}

          {showVolume && weeks.length > 0 && (
            <div className="e-panel">
              <div className="e-panel-header">
                <span className="e-panel-title">Ukentlig sammendrag</span>
                <span className="e-panel-subtitle">Siste 8 uker</span>
              </div>
              <table className="e-grid">
                <thead>
                  <tr><th>Uke</th><th>Fase</th><th style={{ textAlign: "right" }}>km</th><th style={{ textAlign: "right" }}>Økter</th><th style={{ textAlign: "right" }}>TSS</th><th>Trend</th><th>CTL slutt</th><th>ATL slutt</th><th>TSB slutt</th></tr>
                </thead>
                <tbody>
                  {weeks.slice(-8).map((w, i, arr) => {
                    const prevKm = arr[i - 1]?.km || w.km;
                    const trend = w.km > prevKm ? "↑" : w.km < prevKm ? "↓" : "→";
                    const trendC = w.km > prevKm ? "var(--e-ok)" : w.km < prevKm ? "var(--e-alert)" : "var(--e-text-faint)";
                    const wkDays = days.filter((d) => d.date >= w.date && d.date < (arr[i + 1]?.date ?? "9999"));
                    const last = wkDays[wkDays.length - 1];
                    return (
                      <tr key={w.date}>
                        <td style={{ fontFamily: "var(--ff-mono)", fontWeight: 700 }}>{w.label}</td>
                        <td><span className={`phase-tag ${phaseClassFor(w.phase)}`} style={{ fontSize: 9 }}>{w.phase}</span></td>
                        <td style={{ textAlign: "right", fontFamily: "var(--ff-mono)", fontWeight: 700 }}>{w.km}</td>
                        <td style={{ textAlign: "right", fontFamily: "var(--ff-mono)" }}>{w.sessions}</td>
                        <td style={{ textAlign: "right", fontFamily: "var(--ff-mono)" }}>{w.load}</td>
                        <td style={{ fontWeight: 700, color: trendC }}>{trend}</td>
                        <td style={{ fontFamily: "var(--ff-mono)", color: "#1a5fb4", fontWeight: 700 }}>{last?.ctl ?? "—"}</td>
                        <td style={{ fontFamily: "var(--ff-mono)", color: "#b01c1c" }}>{last?.atl ?? "—"}</td>
                        <td style={{ fontFamily: "var(--ff-mono)", color: last && last.tsb > 0 ? "var(--e-ok)" : "var(--e-warn)", fontWeight: 700 }}>
                          {last ? `${last.tsb > 0 ? "+" : ""}${last.tsb}` : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {showReport && <AICoachingReport sections={reportSections} />}
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/* RACE CENTER — uses RacePage classification logic                           */
/* ────────────────────────────────────────────────────────────────────────── */
function buildRaceMapIcon(kind) {
  return L.divIcon({
    className: "race-map__icon-shell",
    html: `<span class="race-map__marker race-map__marker--${kind}"></span>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -10],
  });
}

function FitRaceMapBounds({ races }) {
  const map = useMap();

  useEffect(() => {
    if (races.length === 0) return;
    const bounds = L.latLngBounds(races.map((race) => [Number(race.latitude), Number(race.longitude)]));
    map.fitBounds(bounds, { padding: [28, 28] });
  }, [map, races]);

  return null;
}

function RaceMapPanel({ races, title, subtitle, onSelectRace }) {
  const coordinateRaces = useMemo(() => (races ?? []).filter(hasRaceCoordinates), [races]);
  const center = coordinateRaces[0]
    ? [Number(coordinateRaces[0].latitude), Number(coordinateRaces[0].longitude)]
    : [59.9139, 10.7522];

  return (
    <section className="race-map" aria-label="Løpskart">
      <div className="race-map__header">
        <div>
          <div className="e-panel-title">{title ?? "Løpskart"}</div>
          <div className="race-map__subtitle">{subtitle ?? "Viser løp med registrerte koordinater for valgt visning."}</div>
        </div>
      </div>

      {(races?.length ?? 0) === 0 ? (
        <div className="race-map__empty">Ingen løp matcher denne visningen.</div>
      ) : coordinateRaces.length === 0 ? (
        <div className="race-map__empty">Ingen løp med koordinater ennå.</div>
      ) : (
        <div className="race-map__frame">
          <MapContainer center={center} zoom={4} scrollWheelZoom={false} className="race-map__container">
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <FitRaceMapBounds races={coordinateRaces} />
            {coordinateRaces.map((race) => {
              const kind = raceMapState(race);
              return (
                <Marker
                  key={race.id}
                  position={[Number(race.latitude), Number(race.longitude)]}
                  icon={buildRaceMapIcon(kind)}
                  eventHandlers={{ click: () => onSelectRace(race) }}
                >
                  <Tooltip direction="top" offset={[0, -10]}>{race.name}</Tooltip>
                  <Popup>
                    <div className="race-map__popup">
                      <strong>{race.name}</strong>
                      {race.location && <span>{race.location}</span>}
                      <span>{kind === "done" ? "Gjennomført" : "Bucket list"}</span>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        </div>
      )}
    </section>
  );
}

function decodePolyline(encoded) {
  const points = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (encoded && index < encoded.length) {
    let b;
    let shift = 0;
    let result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    lng += result & 1 ? ~(result >> 1) : result >> 1;

    points.push([lat / 1e5, lng / 1e5]);
  }

  return points;
}

function FitRouteBounds({ positions }) {
  const map = useMap();

  useEffect(() => {
    if (positions.length === 0) return;
    map.fitBounds(L.latLngBounds(positions), { padding: [16, 16] });
  }, [map, positions]);

  return null;
}

function StravaMiniRoute({ polyline }) {
  const positions = useMemo(() => {
    try {
      return polyline ? decodePolyline(polyline) : [];
    } catch {
      return [];
    }
  }, [polyline]);

  if (positions.length === 0) {
    return <div className="race-strava-empty">Ingen rutedata tilgjengelig fra Strava.</div>;
  }

  return (
    <div className="race-strava-route">
      <MapContainer center={positions[0]} zoom={12} scrollWheelZoom={false} className="race-strava-route__map">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitRouteBounds positions={positions} />
        <Polyline positions={positions} color="#1850a0" weight={3} />
        <CircleMarker center={positions[0]} radius={5} pathOptions={{ color: "#1b6b3a", fillColor: "#1b6b3a", fillOpacity: 1 }} />
        <CircleMarker center={positions[positions.length - 1]} radius={5} pathOptions={{ color: "#a01820", fillColor: "#a01820", fillOpacity: 1 }} />
      </MapContainer>
    </div>
  );
}

function StravaRaceDetail({ participation, client }) {
  const activityId = participation?.strava_activity_id;
  const [state, setState] = useState({ loading: Boolean(activityId && client), data: null, error: null });

  useEffect(() => {
    if (!activityId) {
      setState({ loading: false, data: null, error: null });
      return undefined;
    }
    if (!client) {
      setState({ loading: false, data: null, error: "Supabase-klient mangler." });
      return undefined;
    }

    let cancelled = false;
    setState({ loading: true, data: null, error: null });
    invokeEdgeFunctionWithSessionRetry(client, "strava-activity-detail", {
      body: { activity_id: activityId },
    })
      .then((result) => {
        if (cancelled) return;
        if (result?.error) {
          setState({ loading: false, data: null, error: result.error.message || "Kunne ikke hente Strava-aktiviteten." });
          return;
        }
        setState({ loading: false, data: result?.data ?? null, error: null });
      })
      .catch((err) => {
        if (!cancelled) setState({ loading: false, data: null, error: err.message || "Kunne ikke hente Strava-aktiviteten." });
      });

    return () => {
      cancelled = true;
    };
  }, [activityId, client]);

  if (!activityId) {
    return (
      <div className="race-strava-box">
        <div className="race-strava-title">Strava</div>
        <div className="race-strava-empty">Ingen Strava-aktivitet koblet til denne deltakelsen.</div>
      </div>
    );
  }

  return (
    <div className="race-strava-box">
      <div className="race-strava-head">
        <div>
          <div className="race-strava-title">Strava</div>
          <div className="race-strava-meta">Aktivitet #{activityId}</div>
        </div>
        <a className="race-strava-link" href={`https://www.strava.com/activities/${activityId}`} target="_blank" rel="noreferrer">
          Åpne i Strava ↗
        </a>
      </div>

      {state.loading && <div className="race-strava-empty">Henter Strava-detaljer…</div>}
      {!state.loading && state.error && <div className="race-strava-empty">Strava-detaljer er ikke tilgjengelige akkurat nå.</div>}
      {!state.loading && !state.error && state.data && (
        <div className="race-strava-content">
          {state.data.description && <div className="race-strava-description">{state.data.description}</div>}
          <div className="race-strava-stats">
            {state.data.stats?.average_speed && (
              <div><span>Snittfart</span><strong>{formatPaceFromSpeed(state.data.stats.average_speed)}</strong></div>
            )}
            {state.data.stats?.average_heartrate && (
              <div><span>Snittpuls</span><strong>{Math.round(state.data.stats.average_heartrate)} bpm</strong></div>
            )}
            {state.data.stats?.max_heartrate && (
              <div><span>Makspuls</span><strong>{Math.round(state.data.stats.max_heartrate)} bpm</strong></div>
            )}
            {state.data.stats?.calories && (
              <div><span>Kalorier</span><strong>{state.data.stats.calories}</strong></div>
            )}
          </div>
          <StravaMiniRoute polyline={state.data.map_polyline} />
          {(state.data.splits?.length ?? 0) > 0 && (
            <div className="race-strava-splits">
              <div className="race-strava-subtitle">Splits</div>
              <table className="e-grid" style={{ fontSize: 10 }}>
                <thead><tr><th>KM</th><th>Fart</th><th>Puls</th><th>Høyde</th></tr></thead>
                <tbody>
                  {state.data.splits.slice(0, 8).map((split) => (
                    <tr key={split.split}>
                      <td>{split.split}</td>
                      <td>{formatPaceFromSpeed(split.average_speed)}</td>
                      <td>{split.average_heartrate ? Math.round(split.average_heartrate) : "—"}</td>
                      <td>{split.elevation_difference != null ? `${Math.round(split.elevation_difference)} m` : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/* SEASON PLAN EDITOR                                                         */
/* ────────────────────────────────────────────────────────────────────────── */

const PRIORITY_TONE = {
  A: { bg: "var(--e-primary)", fg: "#fff" },
  B: { bg: "#5e7d9b", fg: "#fff" },
  C: { bg: "#9aa9ba", fg: "#fff" },
};

function GapChip({ verdict }) {
  if (!verdict) return null;
  const tone = verdict.status === "ok" ? "st-ok"
    : verdict.status === "tight" ? "st-warn"
    : verdict.status === "insufficient" ? "st-alert"
    : "st-neutral";
  const days = verdict.daysBetween;
  const weeks = days != null ? Math.floor(days / 7) : null;
  const dayRest = days != null ? days % 7 : null;
  const text = days == null
    ? "Mangler dato"
    : weeks > 0
      ? `${weeks}u ${dayRest}d`
      : `${days}d`;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 0", color: "var(--e-text-muted)", fontSize: 10 }}>
      <span style={{ flex: 1, height: 1, background: "var(--e-border)" }} />
      <span className={`status-tag ${tone}`}>{text}</span>
      <span style={{ fontStyle: "italic" }}>{verdict.message}</span>
      <span style={{ flex: 1, height: 1, background: "var(--e-border)" }} />
    </div>
  );
}

function SeasonPlanEditor({ seasonPlansApi, racesApi, onCreateRace }) {
  const plans = seasonPlansApi?.plans ?? [];
  const races = racesApi?.races ?? [];

  // Pick which plan to view: the active one by default, or the most recent.
  const [selectedPlanId, setSelectedPlanId] = useState(null);
  const [addRaceOpen, setAddRaceOpen] = useState(false);

  // Resolve the working plan: either explicit selection or active.
  const workingPlan = useMemo(() => {
    if (selectedPlanId) return plans.find((p) => p.id === selectedPlanId) ?? null;
    return pickActivePlan(plans);
  }, [plans, selectedPlanId]);

  const sortedRaces = useMemo(() => sortSeasonRaces(workingPlan?.season_plan_races), [workingPlan]);
  const gaps = useMemo(() => validateSeasonGaps(sortedRaces), [sortedRaces]);

  const racesAlreadyInPlan = new Set(sortedRaces.map((r) => r.race_id));
  const availableRaces = races.filter((r) => !racesAlreadyInPlan.has(r.id));

  async function handleCreatePlan() {
    const year = Number(window.prompt("Sesongår (f.eks. 2026):", String(new Date().getUTCFullYear() + 1)));
    if (!Number.isFinite(year)) return;
    const name = window.prompt("Navn på sesongen:", `${year} sesong`);
    if (!name) return;
    const created = await seasonPlansApi.createPlan({
      name,
      season_year: year,
      is_active: plans.length === 0, // first plan auto-activates
    });
    setSelectedPlanId(created.id);
  }

  async function handleSetActive() {
    if (!workingPlan) return;
    await seasonPlansApi.setActive(workingPlan.id);
  }

  async function handleDeletePlan() {
    if (!workingPlan) return;
    if (!window.confirm(`Slette "${workingPlan.name}"? Tilknyttede løp i biblioteket beholdes.`)) return;
    await seasonPlansApi.deletePlan(workingPlan.id);
    setSelectedPlanId(null);
  }

  async function handleSummaryBlur(e) {
    if (!workingPlan) return;
    const next = e.target.value;
    if (next === (workingPlan.goal_summary ?? "")) return;
    await seasonPlansApi.updatePlan(workingPlan.id, { goal_summary: next || null });
  }

  async function handleNameBlur(e) {
    if (!workingPlan) return;
    const next = e.target.value.trim();
    if (!next || next === workingPlan.name) return;
    await seasonPlansApi.updatePlan(workingPlan.id, { name: next });
  }

  async function handleYearBlur(e) {
    if (!workingPlan) return;
    const next = Number(e.target.value);
    if (!Number.isFinite(next) || next === workingPlan.season_year) return;
    await seasonPlansApi.updatePlan(workingPlan.id, { season_year: next });
  }

  async function handlePriorityChange(spr, value) {
    if (!workingPlan) return;
    await seasonPlansApi.updateRaceInPlan(spr.id, workingPlan.id, { priority: value });
  }

  async function handleTargetDateChange(spr, value) {
    if (!workingPlan) return;
    await seasonPlansApi.updateRaceInPlan(spr.id, workingPlan.id, { target_date: value || null });
  }

  async function handleNotesBlur(spr, value) {
    if (!workingPlan) return;
    if ((value ?? "") === (spr.notes ?? "")) return;
    await seasonPlansApi.updateRaceInPlan(spr.id, workingPlan.id, { notes: value || null });
  }

  async function handleRemoveRace(spr) {
    if (!workingPlan) return;
    if (!window.confirm(`Fjerne ${spr.race?.name} fra sesongen?`)) return;
    await seasonPlansApi.removeRaceFromPlan(spr.id, workingPlan.id);
  }

  async function handleAddRace(payload) {
    if (!workingPlan) return;
    await seasonPlansApi.addRaceToPlan(workingPlan.id, payload);
    setAddRaceOpen(false);
  }

  if (plans.length === 0) {
    return (
      <div className="e-panel" style={{ flexShrink: 0 }}>
        <div className="e-panel-header">
          <span className="e-panel-title">Ingen sesongplan ennå</span>
        </div>
        <div style={{ padding: 24, fontSize: 13, lineHeight: 1.6 }}>
          <p style={{ margin: 0, color: "var(--e-text-muted)" }}>
            En sesongplan organiserer årets løp etter prioritet (A/B/C) og sjekker at det er nok
            restitusjon mellom dem. Du kan lage planer for flere år samtidig — f.eks. CCC i 2027 ved
            siden av en aktiv 2026-plan.
          </p>
          <button className="tbtn primary" style={{ marginTop: 14 }} onClick={handleCreatePlan}>
            + Opprett sesongplan
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="e-panel" style={{ flexShrink: 0 }}>
        <div className="e-panel-header">
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span className="e-panel-title">Sesongplan</span>
            <select
              value={workingPlan?.id ?? ""}
              onChange={(e) => setSelectedPlanId(e.target.value)}
              style={{ height: 22, fontSize: 11, padding: "0 6px", border: "1px solid rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.08)", color: "var(--e-on-dark)" }}
            >
              {plans.map((p) => (
                <option key={p.id} value={p.id} style={{ color: "var(--e-text)" }}>
                  {p.name} ({p.season_year}){p.is_active ? " · aktiv" : ""}
                </option>
              ))}
            </select>
          </div>
          <div className="e-panel-actions">
            {!workingPlan?.is_active && workingPlan && (
              <button className="e-panel-btn accent" onClick={handleSetActive}>Aktiver</button>
            )}
            <button className="e-panel-btn" onClick={handleCreatePlan}>+ Ny sesong</button>
            {workingPlan && (
              <button className="e-panel-btn" onClick={handleDeletePlan}>Slett</button>
            )}
          </div>
        </div>

        {workingPlan && (
          <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12 }}>
              <div>
                <label style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--e-text-faint)" }}>Navn</label>
                <input
                  defaultValue={workingPlan.name}
                  onBlur={handleNameBlur}
                  className="toolbar-input"
                  style={{ width: "100%", marginTop: 3 }}
                />
              </div>
              <div>
                <label style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--e-text-faint)" }}>År</label>
                <input
                  type="number"
                  defaultValue={workingPlan.season_year}
                  onBlur={handleYearBlur}
                  className="toolbar-input"
                  style={{ width: "100%", marginTop: 3 }}
                />
              </div>
            </div>
            <div>
              <label style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--e-text-faint)" }}>Mål for sesongen</label>
              <textarea
                defaultValue={workingPlan.goal_summary ?? ""}
                onBlur={handleSummaryBlur}
                rows={2}
                style={{ width: "100%", marginTop: 3, fontSize: 12, padding: 6, border: "1px solid var(--e-border)", borderRadius: 2, fontFamily: "var(--ff)", resize: "vertical" }}
                placeholder="Hva vil du oppnå denne sesongen?"
              />
            </div>
          </div>
        )}
      </div>

      {workingPlan && (
        <div className="e-panel" style={{ flexShrink: 0 }}>
          <div className="e-panel-header">
            <span className="e-panel-title">Løp ({sortedRaces.length})</span>
            <div className="e-panel-actions">
              <button className="e-panel-btn accent" onClick={() => setAddRaceOpen(true)}>+ Legg til løp i sesongen</button>
            </div>
          </div>

          <div style={{ padding: 10 }}>
            {sortedRaces.length === 0 ? (
              <div style={{ padding: 20, fontSize: 12, color: "var(--e-text-faint)", textAlign: "center" }}>
                Ingen løp i sesongen ennå. Klikk «+ Legg til løp i sesongen».
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column" }}>
                {sortedRaces.map((spr, idx) => {
                  const tone = PRIORITY_TONE[spr.priority] ?? PRIORITY_TONE.B;
                  const dTo = daysUntil(spr.target_date);
                  const typical = formatTypicalSchedule(spr.race?.typical_month, spr.race?.typical_week_in_month);
                  return (
                    <React.Fragment key={spr.id}>
                      <div style={{
                        display: "grid",
                        gridTemplateColumns: "auto 1fr 130px 130px 90px 30px",
                        gap: 8,
                        alignItems: "center",
                        padding: "8px 4px",
                        borderBottom: "1px solid var(--e-bg)",
                      }}>
                        <span
                          title={`Prioritet ${spr.priority}`}
                          style={{
                            background: tone.bg, color: tone.fg,
                            width: 22, height: 22, display: "inline-flex", alignItems: "center", justifyContent: "center",
                            fontSize: 11, fontWeight: 800,
                          }}
                        >{spr.priority}</span>
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 700 }}>{spr.race?.name ?? "Ukjent løp"}</div>
                          <div style={{ fontSize: 10, color: "var(--e-text-faint)" }}>
                            {[spr.race?.location, spr.race?.distance_km ? `${spr.race.distance_km} km` : null, typical]
                              .filter(Boolean).join(" · ")}
                          </div>
                          {spr.notes && (
                            <div style={{ fontSize: 10, color: "var(--e-text-muted)", marginTop: 2, fontStyle: "italic" }}>{spr.notes}</div>
                          )}
                        </div>
                        <select
                          value={spr.priority}
                          onChange={(e) => handlePriorityChange(spr, e.target.value)}
                          style={{ height: 24, fontSize: 11, padding: "0 6px", border: "1px solid var(--e-border)" }}
                        >
                          <option value="A">A — Målløp</option>
                          <option value="B">B — Oppvarming</option>
                          <option value="C">C — Trening</option>
                        </select>
                        <input
                          type="date"
                          defaultValue={spr.target_date ?? ""}
                          onBlur={(e) => handleTargetDateChange(spr, e.target.value)}
                          style={{ height: 24, fontSize: 11, padding: "0 6px", border: "1px solid var(--e-border)" }}
                        />
                        <span style={{ fontSize: 11, color: "var(--e-text-muted)", textAlign: "right", fontFamily: "var(--ff-mono)" }}>
                          {dTo == null ? "—" : dTo < 0 ? "passert" : `${dTo}d`}
                        </span>
                        <button
                          className="tbtn"
                          style={{ padding: "0 6px", fontSize: 14, color: "var(--e-alert)" }}
                          onClick={() => handleRemoveRace(spr)}
                          title="Fjern fra sesongen"
                        >×</button>
                      </div>
                      {idx < sortedRaces.length - 1 && <GapChip verdict={gaps[idx]} />}
                    </React.Fragment>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      <AddRaceToSeasonDialog
        open={addRaceOpen}
        onClose={() => setAddRaceOpen(false)}
        onSubmit={handleAddRace}
        onCreateRaceRequest={() => { setAddRaceOpen(false); onCreateRace?.(); }}
        availableRaces={availableRaces}
        defaultYear={workingPlan?.season_year}
      />
    </>
  );
}

function RaceCenterPage({ racesApi, seasonPlansApi, goalRace }) {
  const { auth } = useAppData();
  const races = racesApi?.races ?? [];
  const [tab, setTab] = useState("done");
  const [selected, setSelected] = useState(null);
  const [raceDialog, setRaceDialog] = useState(null);
  const [partDialog, setPartDialog] = useState(null);

  // Keep `selected` in sync with the latest race data after mutations.
  useEffect(() => {
    if (!selected) return;
    const fresh = races.find((r) => r.id === selected.race.id);
    if (!fresh) {
      setSelected(null);
      return;
    }
    if (selected.kind === "done") {
      const part = (fresh.race_participations ?? []).find((p) => p.id === selected.participation.id);
      if (!part) {
        // last/this participation was deleted — drop selection or fall back to another participation.
        const next = (fresh.race_participations ?? [])[0];
        if (next) setSelected({ kind: "done", race: fresh, participation: next });
        else setSelected({ kind: "dream", race: fresh });
        return;
      }
      if (part !== selected.participation || fresh !== selected.race) {
        setSelected({ kind: "done", race: fresh, participation: part });
      }
    } else if (fresh !== selected.race) {
      setSelected({ kind: "dream", race: fresh });
    }
  }, [races, selected]);

  const handleCreateRace = useCallback(async (data, raceInfo) => {
    await racesApi.createRace(data, raceInfo);
    setRaceDialog(null);
  }, [racesApi]);

  const handleEditRace = useCallback(async (data) => {
    if (!raceDialog?.race) return;
    await racesApi.updateRace(raceDialog.race.id, data);
    setRaceDialog(null);
  }, [racesApi, raceDialog]);

  const handleDeleteRace = useCallback(async (race) => {
    if (!race) return;
    if (!window.confirm(`Slette "${race.name}"? Dette kan ikke angres.`)) return;
    await racesApi.deleteRace(race.id);
    setSelected(null);
  }, [racesApi]);

  const handleSubmitParticipation = useCallback(async (data) => {
    if (!partDialog?.race) return;
    if (partDialog.mode === "edit" && partDialog.participation) {
      await racesApi.updateParticipation(partDialog.participation.id, partDialog.race.id, data);
    } else {
      await racesApi.addParticipation(partDialog.race.id, data);
    }
    setPartDialog(null);
  }, [racesApi, partDialog]);

  const handleDeleteParticipation = useCallback(async (raceId, participation) => {
    if (!window.confirm(`Slette deltakelse fra ${participation.race_date ?? "ukjent dato"}?`)) return;
    await racesApi.deleteParticipation(participation.id, raceId);
  }, [racesApi]);

  const doneRaces = useMemo(() => (races ?? []).filter((race) => race.race_participations?.length > 0), [races]);

  // Expand to 1-row-per-participation for the "done" list (matches RacePage).
  const doneRows = useMemo(() => {
    const rows = [];
    (races ?? []).forEach((race) => {
      (race.race_participations ?? []).forEach((participation) => {
        rows.push({ race, participation });
      });
    });
    rows.sort((a, b) => new Date(b.participation.race_date ?? 0) - new Date(a.participation.race_date ?? 0));
    return rows;
  }, [races]);

  // PB detection: within a race, find the fastest finish_time.
  const pbMap = useMemo(() => {
    const m = new Map();
    (races ?? []).forEach((race) => {
      const finishes = (race.race_participations ?? []).filter((p) => p.finish_time);
      if (finishes.length === 0) return;
      finishes.sort((a, b) => String(a.finish_time).localeCompare(String(b.finish_time)));
      m.set(race.id, finishes[0].id);
    });
    return m;
  }, [races]);

  const doneRowsByYear = useMemo(() => {
    const groups = new Map();
    doneRows.forEach((row) => {
      const year = raceYear(row.participation.race_date);
      if (!groups.has(year)) groups.set(year, []);
      groups.get(year).push(row);
    });
    return [...groups.entries()].sort(([a], [b]) => {
      if (a === "Ukjent år") return 1;
      if (b === "Ukjent år") return -1;
      return Number(b) - Number(a);
    });
  }, [doneRows]);

  const dreamRows = useMemo(() => {
    const rows = (races ?? []).filter((r) => !(r.race_participations?.length));
    rows.sort((a, b) => {
      const da = a.next_race_date ? new Date(a.next_race_date).getTime() : Infinity;
      const db = b.next_race_date ? new Date(b.next_race_date).getTime() : Infinity;
      return da - db;
    });
    return rows;
  }, [races]);
  const mapRaces = tab === "done" ? doneRaces : tab === "dream" ? dreamRows : [];

  const summary = useMemo(() => {
    const finished = doneRows;
    const totalKm = finished.reduce((s, r) => s + (Number(r.race.distance_km) || 0), 0);
    const totalElev = finished.reduce((s, r) => s + (Number(r.race.elevation_gain_m) || 0), 0);
    const podiums = finished.filter((r) => Number(r.participation.overall_place) > 0 && Number(r.participation.overall_place) <= 3).length;
    const pbCount = finished.filter((r) => r.participation.is_pb || pbMap.get(r.race.id) === r.participation.id).length;
    return { finishes: finished.length, dreams: dreamRows.length, totalKm, totalElev, podiums, pbCount };
  }, [doneRows, dreamRows, pbMap]);

  const handleSelectMapRace = useCallback((race) => {
    const participation = latestParticipation(race);
    if (participation) {
      setTab("done");
      setSelected({ kind: "done", race, participation });
      return;
    }
    setTab("dream");
    setSelected({ kind: "dream", race });
  }, []);

  return (
    <div className="workspace">
      <div className="left-panel">
        <div className="panel-section">
          <div className="panel-section-header">Karrieresammendrag</div>
          <div style={{ padding: "4px 0" }}>
            {[
              { l: "Målganger",     v: summary.finishes },
              { l: "PBs",           v: summary.pbCount },
              { l: "Podier",        v: summary.podiums },
              { l: "Totale løps-km", v: `${summary.totalKm.toFixed(0)} km` },
              { l: "Total D+",      v: `${(summary.totalElev / 1000).toFixed(1)}k m` },
              { l: "Drømmeløp",     v: summary.dreams },
            ].map(({ l, v }) => (
              <div className="panel-stat-row" key={l}><span>{l}</span><span className="panel-stat-val">{v}</span></div>
            ))}
          </div>
        </div>
        <div className="panel-section">
          <div className="panel-section-header">Neste løp</div>
          <div style={{ padding: "4px 0" }}>
            {dreamRows.filter((r) => r.next_race_date).slice(0, 5).map((r) => (
              <div key={r.id} style={{ padding: "5px 10px", borderBottom: "1px solid var(--e-bg)" }}>
                <div style={{ fontSize: 11, fontWeight: 700 }}>{r.name}</div>
                <div style={{ fontSize: 10, color: "var(--e-text-faint)" }}>{shortDate(r.next_race_date)} · {r.distance_km ?? "?"}km</div>
              </div>
            ))}
            {dreamRows.length === 0 && <div style={{ padding: 10, fontSize: 11, color: "var(--e-text-faint)" }}>Ingen kommende løp.</div>}
          </div>
        </div>
      </div>

      <div className="main-content">
        <div className="toolbar">
          <div className="toolbar-group">
            <button className={`tbtn${tab === "done" ? " active" : ""}`} onClick={() => { setTab("done"); setSelected(null); }}>
              ◈ Æresvegg ({doneRows.length})
            </button>
            <button className={`tbtn${tab === "dream" ? " active" : ""}`} onClick={() => { setTab("dream"); setSelected(null); }}>
              ⭐ Drømmeløp ({dreamRows.length})
            </button>
            <button className={`tbtn${tab === "season" ? " active" : ""}`} onClick={() => { setTab("season"); setSelected(null); }}>
              ◆ Sesongplan ({seasonPlansApi?.plans?.length ?? 0})
            </button>
          </div>
          <div className="toolbar-sep" />
          <div className="toolbar-group">
            <button className="tbtn primary" onClick={() => setRaceDialog({ mode: "create" })}>+ Legg til løp</button>
          </div>
          <div className="toolbar-spacer" />
          {tab !== "season" && <input className="toolbar-input" placeholder="Søk i løp…" />}
        </div>

        {tab === "season" ? (
          <div className="content-scroll" style={{ padding: 10 }}>
            <SeasonPlanEditor seasonPlansApi={seasonPlansApi} racesApi={racesApi} onCreateRace={() => setRaceDialog({ mode: "create" })} />
          </div>
        ) : (
        <div className="race-center-body">
          <div className="content-scroll race-center-scroll">
            <RaceMapPanel
              races={mapRaces}
              title={tab === "done" ? "Kart · Æresvegg" : "Kart · Drømmeløp"}
              subtitle={tab === "done"
                ? "Viser gjennomførte løp med koordinater. Klikk på markør for å åpne siste registrerte deltakelse."
                : "Viser løp uten registrert deltakelse. Klikk på markør for å åpne drømmeløpet."
              }
              onSelectRace={handleSelectMapRace}
            />
            <div className="e-panel">
              <div className="e-panel-header">
                <span className="e-panel-title">{tab === "done" ? "Løpsresultater — alle målganger" : "Mål- og drømmeløp"}</span>
              </div>
              <table className="e-grid">
                {tab === "done" ? (
                  <>
                    <thead>
                      <tr>
                        <th>Dato</th><th>Løp</th><th>Sted</th>
                        <th style={{ textAlign: "right" }}>Distanse</th>
                        <th style={{ textAlign: "right" }}>D+</th>
                        <th style={{ textAlign: "right" }}>Målgang</th>
                        <th>Plassering</th>
                        <th>Resultat</th>
                      </tr>
                    </thead>
                    <tbody>
                      {doneRows.length === 0 && (
                        <tr><td colSpan={8} style={{ textAlign: "center", color: "var(--e-text-faint)", padding: 24 }}>Ingen målganger loggført ennå.</td></tr>
                      )}
                      {doneRowsByYear.map(([year, rows]) => (
                        <React.Fragment key={year}>
                          <tr className="race-year-row">
                            <td colSpan={8}>
                              <span>{year}</span>
                              <small>{rows.length} {rows.length === 1 ? "målgang" : "målganger"}</small>
                            </td>
                          </tr>
                          {rows.map(({ race, participation }) => {
                            const isPb = participation.is_pb || pbMap.get(race.id) === participation.id;
                            const place = participation.overall_place;
                            const tot = participation.total_finishers;
                            const isPodium = Number(place) > 0 && Number(place) <= 3;
                            const isSel = selected?.kind === "done" && selected.participation.id === participation.id;
                            return (
                              <tr key={participation.id}
                                  className={isSel ? "selected" : ""}
                                  style={{ cursor: "pointer" }}
                                  onClick={() => setSelected(isSel ? null : { kind: "done", race, participation })}>
                                <td style={{ fontFamily: "var(--ff-mono)", fontWeight: 700 }}>{shortDate(participation.race_date)}</td>
                                <td style={{ fontWeight: 700 }}>
                                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                    <div style={{ width: 3, height: 20, background: isPb ? "#1b6b3a" : "#5028a0", flexShrink: 0 }} />
                                    {race.name}
                                  </div>
                                </td>
                                <td style={{ color: "var(--e-text-muted)" }}>{race.location ?? "—"}</td>
                                <td style={{ textAlign: "right", fontFamily: "var(--ff-mono)", fontWeight: 700 }}>{race.distance_km ?? "—"} km</td>
                                <td style={{ textAlign: "right", fontFamily: "var(--ff-mono)", color: "var(--e-text-muted)" }}>
                                  {race.elevation_gain_m ? `${(race.elevation_gain_m / 1000).toFixed(1)}k m` : "—"}
                                </td>
                                <td style={{ textAlign: "right", fontFamily: "var(--ff-mono)", fontWeight: 700 }}>{formatFinishTime(participation.finish_time)}</td>
                                <td style={{ fontFamily: "var(--ff-mono)", color: isPodium ? "var(--e-ok)" : "var(--e-text)", fontWeight: isPodium ? 700 : 400 }}>
                                  {place ? `${place}${tot ? ` / ${tot}` : ""}` : "—"}
                                </td>
                                <td>
                                  {isPb ? <span className="status-tag st-ok">PB</span>
                                    : isPodium ? <span className="status-tag st-ok">Podium</span>
                                    : <span className="status-tag st-neutral">Målgang</span>}
                                </td>
                              </tr>
                            );
                          })}
                        </React.Fragment>
                      ))}
                    </tbody>
                    {doneRows.length > 0 && (
                      <tfoot>
                        <tr>
                          <td colSpan={3} style={{ color: "var(--e-text-muted)" }}>Totaler</td>
                          <td style={{ textAlign: "right", fontFamily: "var(--ff-mono)", fontWeight: 700 }}>{summary.totalKm.toFixed(0)} km</td>
                          <td style={{ textAlign: "right", fontFamily: "var(--ff-mono)" }}>{(summary.totalElev / 1000).toFixed(1)}k m</td>
                          <td colSpan={3} />
                        </tr>
                      </tfoot>
                    )}
                  </>
                ) : (
                  <>
                    <thead>
                      <tr>
                        <th>Løp</th><th>Sted</th>
                        <th style={{ textAlign: "right" }}>Distanse</th>
                        <th style={{ textAlign: "right" }}>D+</th>
                        <th>Dato</th>
                        <th style={{ textAlign: "right" }}>Dager til</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dreamRows.length === 0 && (
                        <tr><td colSpan={7} style={{ textAlign: "center", color: "var(--e-text-faint)", padding: 24 }}>Ingen drømmeløp ennå.</td></tr>
                      )}
                      {dreamRows.map((race) => {
                        const label = dreamStatus(race);
                        const isSel = selected?.kind === "dream" && selected.race.id === race.id;
                        const daysTo = daysUntil(race.next_race_date);
                        const isGoal = goalRace?.name && race.name === goalRace.name;
                        return (
                          <tr key={race.id}
                              className={isSel ? "selected" : ""}
                              style={{ cursor: "pointer" }}
                              onClick={() => setSelected(isSel ? null : { kind: "dream", race })}>
                            <td style={{ fontWeight: 700 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                <div style={{ width: 3, height: 20, background: isGoal ? "var(--e-primary)" : "#1a5fb4", flexShrink: 0 }} />
                                <span>{race.name}</span>
                                {isGoal && <span className="status-tag st-ok" style={{ fontSize: 9 }}>MÅLLØP</span>}
                              </div>
                            </td>
                            <td style={{ color: "var(--e-text-muted)" }}>{race.location ?? "—"}</td>
                            <td style={{ textAlign: "right", fontFamily: "var(--ff-mono)", fontWeight: 700 }}>{race.distance_km ?? "—"} km</td>
                            <td style={{ textAlign: "right", fontFamily: "var(--ff-mono)", color: "var(--e-text-muted)" }}>
                              {race.elevation_gain_m ? `${(race.elevation_gain_m / 1000).toFixed(1)}k m` : "—"}
                            </td>
                            <td style={{ fontFamily: "var(--ff-mono)", color: "var(--e-text-muted)", fontSize: 10 }}>
                              {shortDate(race.next_race_date)}
                            </td>
                            <td style={{ textAlign: "right", fontFamily: "var(--ff-mono)", fontWeight: isGoal ? 700 : 400 }}>
                              {daysTo == null ? "—" : daysTo < 0 ? "passert" : `${daysTo}d`}
                            </td>
                            <td><span className={`status-tag ${dreamStatusTagClass(label)}`}>{label}</span></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </>
                )}
              </table>
            </div>

            <div className="ai-dock">
              <div className="ai-dock-header">
                <div className="ai-dock-title"><span className="ai-badge">AI</span>Karriereanalyse</div>
                <span style={{ fontSize: 10, color: "var(--e-primary)" }}>venter på AI-modus</span>
              </div>
              <div style={{ padding: "10px 12px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                {[
                  { title: "Styrker",         c: "var(--e-primary)", text: "AI-modus `career_analysis` beregner styrker fra plassering, jevnt tempo og terrengspesialisering." },
                  { title: "Risikofaktorer",  c: "var(--e-alert)",   text: "DNF- og delvis fullført-mønstre vises her med anbefalte mottiltak." },
                  { title: "Utviklingskurve", c: "var(--e-ok)",      text: "År-for-år progresjon og projeksjon mot neste målløp." },
                ].map(({ title, c, text }) => (
                  <div key={title} style={{ borderTop: `3px solid ${c}`, paddingTop: 8 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: c, marginBottom: 5 }}>{title}</div>
                    <div style={{ fontSize: 11, color: "var(--e-text-muted)", lineHeight: 1.55 }}>{text}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {selected && (
            <div className="race-detail-panel">
              <div className="race-detail-header">
                <span className="e-panel-title" style={{ color: "var(--e-on-dark)" }}>{selected.race.name}</span>
                <button className="race-detail-close" onClick={() => setSelected(null)}>×</button>
              </div>
              <div style={{ flex: 1, overflow: "auto", padding: 0, display: "flex", flexDirection: "column" }}>
                {selected.race.cover_image_url && (
                  <div style={{ height: 110, backgroundImage: `url(${selected.race.cover_image_url})`, backgroundSize: "cover", backgroundPosition: "center", flexShrink: 0 }} />
                )}
                <div style={{ padding: "8px 12px", display: "flex", gap: 6, flexWrap: "wrap", borderBottom: "1px solid var(--e-bg)" }}>
                  <button className="tbtn primary" onClick={() => setPartDialog({ mode: "create", race: selected.race })}>+ Deltakelse</button>
                  <button className="tbtn" onClick={() => setRaceDialog({ mode: "edit", race: selected.race })}>Rediger løp</button>
                  <button className="tbtn" onClick={() => handleDeleteRace(selected.race)} style={{ color: "var(--e-alert)" }}>Slett løp</button>
                </div>
                <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 10 }}>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 800 }}>{selected.race.name}</div>
                    <div style={{ fontSize: 11, color: "var(--e-text-muted)" }}>{selected.race.location ?? "—"}</div>
                  </div>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                    <tbody>
                      {[
                        ["Distanse",   selected.race.distance_km ? `${selected.race.distance_km} km` : "—"],
                        ["Høydemeter", selected.race.elevation_gain_m ? `${(selected.race.elevation_gain_m / 1000).toFixed(1)}k m D+` : "—"],
                        selected.kind === "done"
                          ? ["Dato", shortDate(selected.participation.race_date)]
                          : ["Neste dato", shortDate(selected.race.next_race_date)],
                        selected.kind === "done"
                          ? ["Målgang", formatFinishTime(selected.participation.finish_time)]
                          : ["Status", dreamStatus(selected.race)],
                        selected.kind === "done" && ["Plassering", selected.participation.overall_place
                          ? `${selected.participation.overall_place}${selected.participation.total_finishers ? ` / ${selected.participation.total_finishers}` : ""}`
                          : "—"],
                        selected.kind === "done" && ["PB", selected.participation.is_pb || pbMap.get(selected.race.id) === selected.participation.id ? "Ja" : "Nei"],
                      ].filter(Boolean).map(([k, v]) => (
                        <tr key={k} style={{ borderBottom: "1px solid var(--e-bg)" }}>
                          <td style={{ padding: "4px 0", color: "var(--e-text-faint)", width: "40%" }}>{k}</td>
                          <td style={{ padding: "4px 0", fontWeight: 700, textAlign: "right", overflowWrap: "anywhere" }}>{v}</td>
                        </tr>
                      ))}
                      {selected.race.race_url && (
                        <tr><td style={{ padding: "4px 0", color: "var(--e-text-faint)" }}>URL</td>
                          <td style={{ padding: "4px 0", textAlign: "right" }}>
                            <a href={selected.race.race_url} target="_blank" rel="noreferrer" style={{ color: "var(--e-primary)" }}>Åpne ↗</a>
                          </td></tr>
                      )}
                    </tbody>
                  </table>

                  {selected.kind === "done" && selected.participation.notes && (
                    <div style={{ background: "var(--e-surface-alt)", border: "1px solid var(--e-border)", padding: "9px 11px" }}>
                      <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--e-text-faint)", marginBottom: 5 }}>Notater</div>
                      <div style={{ fontSize: 11, color: "var(--e-text-muted)", lineHeight: 1.6 }}>{selected.participation.notes}</div>
                    </div>
                  )}

                  {selected.kind === "done" && (
                    <StravaRaceDetail participation={selected.participation} client={auth.client} />
                  )}

                  {/* All participations for this race */}
                  {(selected.race.race_participations?.length ?? 0) > 0 && (
                    <div>
                      <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--e-text-faint)", marginBottom: 5 }}>Alle forsøk</div>
                      <table className="e-grid" style={{ fontSize: 10 }}>
                        <thead><tr><th>Dato</th><th>Målgang</th><th>Plass</th><th>PB</th><th /></tr></thead>
                        <tbody>
                          {selected.race.race_participations.map((p) => (
                            <tr key={p.id}
                                style={{ cursor: "pointer" }}
                                onClick={() => setPartDialog({ mode: "edit", race: selected.race, participation: p })}>
                              <td style={{ fontFamily: "var(--ff-mono)" }}>{shortDate(p.race_date)}</td>
                              <td style={{ fontFamily: "var(--ff-mono)" }}>{formatFinishTime(p.finish_time)}</td>
                              <td style={{ fontFamily: "var(--ff-mono)" }}>{p.overall_place ?? "—"}</td>
                              <td>{(p.is_pb || pbMap.get(selected.race.id) === p.id) ? <span className="status-tag st-ok">PB</span> : ""}</td>
                              <td style={{ textAlign: "right" }}>
                                <button
                                  className="tbtn"
                                  style={{ padding: "1px 5px", fontSize: 10, color: "var(--e-alert)" }}
                                  onClick={(e) => { e.stopPropagation(); handleDeleteParticipation(selected.race.id, p); }}
                                >Slett</button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Resources */}
                  {(selected.race.race_resources?.length ?? 0) > 0 && (
                    <div>
                      <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--e-text-faint)", marginBottom: 5 }}>Ressurser</div>
                      <ul style={{ margin: 0, paddingLeft: 16, fontSize: 11 }}>
                        {selected.race.race_resources.map((r) => (
                          <li key={r.id}><a href={r.url} target="_blank" rel="noreferrer" style={{ color: "var(--e-primary)" }}>{r.title ?? r.type ?? r.url}</a></li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {selected.race.description && (
                    <div style={{ fontSize: 11, color: "var(--e-text-muted)", lineHeight: 1.6 }}>{selected.race.description}</div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
        )}
      </div>

      <RaceFormDialog
        open={!!raceDialog}
        onClose={() => setRaceDialog(null)}
        initialData={raceDialog?.mode === "edit" ? raceDialog.race : null}
        onSubmit={(data, raceInfo) => raceDialog?.mode === "edit" ? handleEditRace(data) : handleCreateRace(data, raceInfo)}
      />
      <ParticipationFormDialog
        open={!!partDialog}
        onClose={() => setPartDialog(null)}
        initialData={partDialog?.mode === "edit" ? partDialog.participation : null}
        onSubmit={handleSubmitParticipation}
      />
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/* DAILY LOG                                                                  */
/* ────────────────────────────────────────────────────────────────────────── */
function avgValue(logs, key, digits = 1) {
  const values = logs.map((log) => Number(log[key])).filter((value) => Number.isFinite(value));
  if (!values.length) return "—";
  return (values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(digits);
}

function ScoreButtons({ label, value, onChange, max = 5, disabled = false }) {
  return (
    <div>
      <input
        aria-label={label}
        value={value ?? ""}
        readOnly
        disabled={disabled}
        style={{ position: "absolute", opacity: 0, pointerEvents: "none", width: 1, height: 1 }}
      />
      <div className="dl-score-row" aria-hidden={disabled ? "true" : undefined}>
        {Array.from({ length: max }, (_, i) => i + 1).map((score) => (
          <button
            key={score}
            type="button"
            className={`dl-score-btn${value === score ? " on" : ""}`}
            disabled={disabled}
            onClick={() => onChange(value === score ? null : score)}
          >
            {score}
          </button>
        ))}
      </div>
    </div>
  );
}

function Chip({ icon, label, value, max, highlight = false }) {
  if (value == null || value === "") return null;
  return (
    <span className={`dl-chip${highlight ? " highlight" : ""}`}>
      <span>{icon}</span>
      <span>{label}</span>
      <strong>{value}{max ? `/${max}` : ""}</strong>
    </span>
  );
}

function EntryCard({ entry }) {
  const isTraining = entry.training_quality != null;
  return (
    <div className="dl-entry-card">
      <div className="dl-entry-head">
        <div>
          <div className="dl-entry-date">{fmtLogDate(entry.log_date)}</div>
          <div className="dl-entry-sub">{entry.log_date}</div>
        </div>
        <span className={`status-tag ${isTraining ? "st-info" : "st-neutral"}`}>
          {isTraining ? "Treningsdag" : "Hviledag"}
        </span>
      </div>
      <div className="dl-chip-row">
        <Chip icon="◆" label="Trening" value={entry.training_quality} max={5} highlight={isTraining} />
        <Chip icon="☾" label="Søvn" value={entry.sleep_hours} />
        <Chip icon="◇" label="Søvnkvalitet" value={entry.sleep_quality} max={5} />
        <Chip icon="HR" label="Hvilepuls" value={entry.resting_hr} />
        <Chip icon="!" label="Tretthet" value={entry.fatigue} max={5} />
        <Chip icon="+" label="Humør" value={entry.mood} max={5} />
        <Chip icon="△" label="Stress" value={entry.stress} max={5} />
        <Chip icon="Alc" label="Enheter" value={entry.alcohol_units} />
      </div>
      {entry.workout_notes && <p className="dl-entry-text">{entry.workout_notes}</p>}
      {entry.notes && <p className="dl-entry-note">{entry.notes}</p>}
    </div>
  );
}

function DailyLogPage() {
  const { dailyLogs } = useAppData();
  const { logs = [], loadLogs, saveLog, loading, error } = dailyLogs ?? {};
  const requestedRef = useRef(false);
  const [date, setDate] = useState(localTodayIso());
  const [isTraining, setIsTraining] = useState(true);
  const [trainingQ, setTrainingQ] = useState(3);
  const [workoutNotes, setWorkoutNotes] = useState("");
  const [sleepHours, setSleepHours] = useState("");
  const [sleepQ, setSleepQ] = useState(null);
  const [restingHr, setRestingHr] = useState("");
  const [fatigue, setFatigue] = useState(null);
  const [alcohol, setAlcohol] = useState(0);
  const [mood, setMood] = useState(null);
  const [stress, setStress] = useState(null);
  const [notes, setNotes] = useState("");
  const [filter, setFilter] = useState("all");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!requestedRef.current && logs.length === 0 && !loading) {
      requestedRef.current = true;
      loadLogs?.();
    }
  }, [logs.length, loading, loadLogs]);

  useEffect(() => {
    if (!saved) return undefined;
    const id = window.setTimeout(() => setSaved(false), 2500);
    return () => window.clearTimeout(id);
  }, [saved]);

  const sortedLogs = useMemo(
    () => [...logs].sort((a, b) => String(b.log_date).localeCompare(String(a.log_date))),
    [logs],
  );

  const visibleLogs = useMemo(() => sortedLogs.filter((log) => {
    if (filter === "training") return log.training_quality != null;
    if (filter === "rest") return log.training_quality == null;
    return true;
  }), [sortedLogs, filter]);

  const kpis = useMemo(() => [
    { label: "Snitt søvn", value: avgValue(logs, "sleep_hours"), note: "timer" },
    { label: "Snitt søvnkvalitet", value: avgValue(logs, "sleep_quality"), note: "/5" },
    { label: "Snitt tretthet", value: avgValue(logs, "fatigue"), note: "/5" },
    { label: "Snitt humør", value: avgValue(logs, "mood"), note: "/5" },
    { label: "Treningsdager", value: logs.filter((log) => log.training_quality != null).length, note: `${logs.length} totalt` },
  ], [logs]);

  const resetFields = () => {
    setIsTraining(true);
    setTrainingQ(3);
    setWorkoutNotes("");
    setSleepHours("");
    setSleepQ(null);
    setRestingHr("");
    setFatigue(null);
    setAlcohol(0);
    setMood(null);
    setStress(null);
    setNotes("");
  };

  const onSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await saveLog?.({
        log_date: date,
        training_quality: isTraining ? trainingQ : null,
        workout_notes: isTraining ? workoutNotes : "",
        sleep_hours: parseFloat(sleepHours) || null,
        sleep_quality: sleepQ,
        resting_hr: parseInt(restingHr, 10) || null,
        fatigue,
        alcohol_units: alcohol,
        mood,
        stress,
        notes,
      });
      setSaved(true);
      resetFields();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="workspace">
      <div className="left-panel" style={{ width: 300 }}>
        <div className="panel-section-header">Dagslogg</div>
        <div className="dl-form">
          <label className="dl-field">
            <span>Dato</span>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </label>

          <div className="dl-toggle">
            <button type="button" className={isTraining ? "active" : ""} onClick={() => setIsTraining(true)}>Treningsdag</button>
            <button type="button" className={!isTraining ? "active" : ""} onClick={() => setIsTraining(false)}>Hviledag</button>
          </div>

          <div className="dl-form-section-label">Trening</div>
          <label className="dl-field">
            <span>Treningskvalitet</span>
            <ScoreButtons label="Treningskvalitet" value={trainingQ} onChange={setTrainingQ} disabled={!isTraining} />
          </label>
          <label className="dl-field">
            <span>Øktnotater</span>
            <input
              aria-label="Øktnotater"
              value={workoutNotes}
              disabled={!isTraining}
              onChange={(e) => setWorkoutNotes(e.target.value)}
              placeholder="Nøkkeldetaljer fra økta"
            />
          </label>

          <div className="dl-form-section-label">Restitusjon</div>
          <label className="dl-field">
            <span>Søvntimer</span>
            <input aria-label="Søvntimer" type="number" step="0.5" value={sleepHours} onChange={(e) => setSleepHours(e.target.value)} />
          </label>
          <label className="dl-field">
            <span>Søvnkvalitet</span>
            <ScoreButtons label="Søvnkvalitet" value={sleepQ} onChange={setSleepQ} />
          </label>
          <label className="dl-field">
            <span>Hvilepuls</span>
            <input aria-label="Hvilepuls" type="number" value={restingHr} onChange={(e) => setRestingHr(e.target.value)} placeholder="valgfritt" />
          </label>
          <label className="dl-field">
            <span>Muskeltretthet</span>
            <ScoreButtons label="Muskeltretthet" value={fatigue} onChange={setFatigue} />
          </label>

          <div className="dl-form-section-label">Livsstil</div>
          <div className="dl-stepper">
            <span>Alkoholenheter</span>
            <div>
              <button type="button" onClick={() => setAlcohol((v) => Math.max(0, v - 1))}>−</button>
              <strong>{alcohol}</strong>
              <button type="button" onClick={() => setAlcohol((v) => v + 1)}>+</button>
            </div>
          </div>
          <label className="dl-field">
            <span>Humør / energi</span>
            <ScoreButtons label="Humør" value={mood} onChange={setMood} />
          </label>
          <label className="dl-field">
            <span>Stressnivå</span>
            <ScoreButtons label="Stress" value={stress} onChange={setStress} />
          </label>
          <label className="dl-field">
            <span>Notater</span>
            <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </label>
          <button type="button" className={`dl-save${saved ? " saved" : ""}`} disabled={saving} onClick={onSave}>
            {saved ? "✓ Lagret!" : saving ? "Lagrer..." : "Lagre logg"}
          </button>
        </div>
      </div>

      <div className="main-content">
        <div className="toolbar">
          <div className="toolbar-group">
            <span className="toolbar-label">Vis</span>
            {[
              ["all", "Alle oppføringer"],
              ["training", "Kun trening"],
              ["rest", "Hviledager"],
            ].map(([id, label]) => (
              <button key={id} className={`tbtn${filter === id ? " active" : ""}`} onClick={() => setFilter(id)}>{label}</button>
            ))}
          </div>
          <div className="toolbar-spacer" />
          <button className="tbtn">Eksporter CSV</button>
          <button className="tbtn primary">AI trendanalyse</button>
          <span style={{ padding: "0 8px", color: "var(--e-text-muted)", fontSize: 11 }}>{visibleLogs.length} oppføringer loggført</span>
        </div>

        <div className="content-scroll">
          {error && <div className="status-tag st-alert">Dagslogg-feil: {error.message ?? String(error)}</div>}
          <div className="kpi-strip">
            {kpis.map((kpi, index) => (
              <div key={kpi.label} className="kpi-cell">
                <div className="kpi-accent-bar" style={{ background: ["#1a5fb4", "#0c5a8a", "#b85000", "#1b6b3a", "#5028a0"][index] }} />
                <div className="kpi-cell-label">{kpi.label}</div>
                <div className="kpi-cell-value">{kpi.value}</div>
                <div className="kpi-cell-note">{kpi.note}</div>
              </div>
            ))}
          </div>

          <div className="ai-dock">
            <div className="ai-dock-header">
              <div className="ai-dock-title"><span className="ai-badge">AI</span>Mønsteranalyse</div>
              <span style={{ fontSize: 10, color: "var(--e-primary)" }}>venter på AI-modus</span>
            </div>
            <div className="dl-ai-grid">
              {[
                ["Søvnsignal", "AI-modus `daily_log_patterns` sammenligner søvnlengde og søvnkvalitet med øktkvalitet dagen etter."],
                ["Tretthetstrend", "Tretthet og hvilepuls kan varsle tidlig overbelastning før prestasjonen faller."],
                ["Livsstilsbelastning", "Stress, humør og alkohol gir kontekst til planjusteringer uten å overtolke enkeltøkter."],
              ].map(([title, text]) => (
                <div key={title} className="dl-ai-card">
                  <strong>{title}</strong>
                  <span>{text}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="e-panel">
            <div className="e-panel-header">
              <div className="e-panel-title">Siste oppføringer</div>
              <div className="e-panel-subtitle">{loading ? "Laster..." : `${visibleLogs.length} oppføringer`}</div>
            </div>
            <div className="dl-entry-list">
              {visibleLogs.length === 0 ? (
                <div style={{ padding: 18, color: "var(--e-text-faint)", textAlign: "center" }}>Ingen dagslogger ennå.</div>
              ) : (
                visibleLogs.map((entry) => <EntryCard key={entry.id ?? entry.log_date} entry={entry} />)
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/* AI COACH — persists via useCoachConversations                              */
/* ────────────────────────────────────────────────────────────────────────── */
function CoachPage() {
  const { coachConversations, hierarchicalPlan, activities, trainingBlocks, checkins, showToast } = useAppData();
  const { sessions, messages, activeSessionId, setActiveSessionId, startNewSession, reload } = coachConversations ?? {};
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [optimistic, setOptimistic] = useState([]);
  const bottomRef = useRef(null);

  // Ensure a session exists.
  useEffect(() => {
    if (!coachConversations) return;
    if (!activeSessionId && sessions?.length === 0) startNewSession?.();
    else if (!activeSessionId && sessions?.length > 0) setActiveSessionId?.(sessions[0].session_id);
  }, [activeSessionId, sessions, startNewSession, setActiveSessionId, coachConversations]);

  const buildAthleteContext = useCallback(() => ({
    plan: hierarchicalPlan?.plan?.plan_data ?? null,
    activities: (activities?.activities ?? []).slice(0, 30).map((a) => ({
      id: a.id, name: a.name, started_at: a.started_at,
      distance_km: a.distance_km, duration: a.moving_time,
      effort: a.perceived_effort ?? null, type: a.type ?? a.activity_type,
    })),
    trainingBlocks: trainingBlocks?.blocks ?? [],
    checkins: (checkins?.checkins ?? []).slice(0, 3),
  }), [hierarchicalPlan?.plan, activities?.activities, trainingBlocks?.blocks, checkins?.checkins]);

  const send = useCallback(async () => {
    const msg = input.trim();
    if (!msg || !activeSessionId || sending) return;
    setInput("");
    setSending(true);
    setOptimistic([{ id: `opt-${Date.now()}`, role: "user", content: [{ type: "text", text: msg }] }]);
    try {
      const client = getSupabaseClient();
      const { data: sessionData } = await client.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) throw new Error("Ikke innlogget");
      const { data, error } = await client.functions.invoke("claude-coach", {
        body: { sessionId: activeSessionId, newMessage: msg, athleteContext: buildAthleteContext() },
        headers: { Authorization: `Bearer ${token}` },
      });
      if (error) throw error;
      if (data?.planUpdated) await hierarchicalPlan.loadPlan?.();
      await reload?.();
    } catch (err) {
      showToast?.({ type: "error", message: `Trener: ${err.message}` });
      setOptimistic((prev) => [...prev, { id: `opt-err-${Date.now()}`, role: "assistant", content: [{ type: "text", text: `Feil: ${err.message}` }] }]);
    } finally {
      setSending(false);
      setOptimistic([]);
    }
  }, [input, activeSessionId, sending, buildAthleteContext, hierarchicalPlan, reload, showToast]);

  const allMessages = useMemo(() => [...(messages ?? []), ...optimistic], [messages, optimistic]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [allMessages]);

  const renderText = (m) => {
    if (Array.isArray(m.content)) {
      const block = m.content.find((b) => b.type === "text");
      if (!block) return "";
      try { const parsed = JSON.parse(block.text); return parsed.content ?? block.text; }
      catch { return block.text; }
    }
    return typeof m.content === "string" ? m.content : "";
  };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ flex: 1, overflow: "auto", padding: 10, display: "flex", flexDirection: "column", gap: 8 }}>
        {allMessages.length === 0 && !sending && (
          <div style={{ textAlign: "center", color: "var(--e-text-faint)", padding: 24 }}>
            Hei — jeg er treningstreneren din. Spør meg om planen, restitusjon, tempo eller løpsstrategi.
          </div>
        )}
        {allMessages.map((m) => {
          const isMe = m.role === "user";
          return (
            <div key={m.id} style={{ display: "flex", gap: 8, justifyContent: isMe ? "flex-end" : "flex-start" }}>
              {!isMe && <div style={{ width: 20, height: 20, background: "var(--e-primary)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "#fff", flexShrink: 0, marginTop: 2, fontWeight: 800 }}>✦</div>}
              <div style={{ maxWidth: "78%", padding: "8px 12px", background: isMe ? "var(--e-primary)" : "var(--e-primary-light)", color: isMe ? "#fff" : "var(--e-text)", fontSize: 11, lineHeight: 1.6, border: `1px solid ${isMe ? "var(--e-primary-hover)" : "var(--e-primary-border)"}`, whiteSpace: "pre-wrap" }}>
                {renderText(m)}
              </div>
            </div>
          );
        })}
        {sending && <div style={{ fontSize: 11, color: "var(--e-text-faint)", paddingLeft: 30 }}>Tenker…</div>}
        <div ref={bottomRef} />
      </div>
      <div style={{ padding: "8px 10px", borderTop: "1px solid var(--e-border)", display: "flex", gap: 4, background: "var(--e-surface-alt)" }}>
        <input className="ai-input" style={{ flex: 1 }} placeholder="Spør om trening, tempo, løpsstrategi eller restitusjon…"
               value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} />
        <button className="ai-send" onClick={send} disabled={sending || !activeSessionId}>↑</button>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Root                                                                        */
/* ────────────────────────────────────────────────────────────────────────── */
function ControlCenterDesktop() {
  const { auth, activities, races, seasonPlans, checkins, hierarchicalPlan, plans, strava } = useAppData();
  const [page, setPage] = useState("home");

  const email = auth.user?.email ?? "";
  const initials = email.slice(0, 2).toUpperCase() || "RS";
  const displayName = email.split("@")[0] || "Løper";
  const athlete = { name: displayName, initials };

  const activityList = activities?.activities ?? [];
  const racesList    = races?.races ?? [];
  const checkinList  = checkins?.checkins ?? [];
  const planList     = plans?.plans ?? [];
  const planData     = hierarchicalPlan?.plan?.plan_data ?? null;

  const planPageModel = useMemo(() => buildPlanPageModel({
    planData,
    activities: activityList,
    checkins: checkinList,
    plans: planList,
    todayIso: localTodayIso(),
  }), [planData, activityList, checkinList, planList]);

  const season    = useMemo(() => deriveSeasonState({ planData, currentWeek: planPageModel.currentWeek }), [planData, planPageModel.currentWeek]);
  const seasonPlanList = seasonPlans?.plans ?? [];
  const goalRace  = useMemo(() => deriveGoalRace(planData, racesList, seasonPlanList), [planData, racesList, seasonPlanList]);
  const load      = useMemo(() => deriveTrainingLoad(activityList), [activityList]);
  const weeklyKm  = useMemo(() => deriveWeeklyKmSeries(activityList, 12), [activityList]);
  const hrZones   = useMemo(() => deriveHrZones(activityList, 8), [activityList]);
  const consistency = useMemo(() => deriveConsistency({ planData, checkins: checkinList, activities: activityList, n: 8 }), [planData, checkinList, activityList]);

  let body;
  if (page === "home")           body = <DashboardPage athlete={athlete} load={load} goalRace={goalRace} season={season} weeklyKm={weeklyKm} planPageModel={planPageModel} consistency={consistency} planData={planData} activities={activityList} strava={strava} races={racesList} seasonPlans={seasonPlanList} onNavigate={setPage} />;
  else if (page === "plan")      body = <PlanPage season={season} goalRace={goalRace} planData={planData} planPageModel={planPageModel} hierarchicalPlan={hierarchicalPlan} />;
  else if (page === "analytics") body = <CoachingPage activities={activityList} load={load} checkins={checkinList} planData={planData} plans={planList} />;
  else if (page === "races")     body = <RaceCenterPage racesApi={races} seasonPlansApi={seasonPlans} goalRace={goalRace} />;
  else if (page === "dailylog")  body = <DailyLogPage />;
  else                           body = <CoachPage />;

  return (
    <div className="rs-cc">
      <AppBar athlete={athlete} load={load} goalRace={goalRace} page={page} />
      <ModuleTabs page={page} setPage={setPage} />
      {body}
    </div>
  );
}

export default function ControlCenterPage() {
  const isNarrow = useMediaQuery("(max-width: 899px)");

  if (isNarrow) {
    return (
      <div className="rs-cc rs-cc-mobile-notice">
        <div className="app-logo-mark">RS</div>
        <h1>RunSmart Control Center</h1>
        <p>Denne visningen er optimalisert for skjermer bredere enn 900 px.</p>
        <p>Åpne appen på en desktop for å fortsette.</p>
      </div>
    );
  }

  return <ControlCenterDesktop />;
}
