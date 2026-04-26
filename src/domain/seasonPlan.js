/**
 * Season plan domain logic.
 *
 * Pure functions only — no React, no Supabase. All date arithmetic uses
 * UTC methods to keep behavior consistent across timezones, matching the
 * convention from src/domain/compute.js.
 */

// Recovery windows after racing, by distance. Values in days.
// Bounds derived from common endurance coaching guidance (Koop, Daniels,
// Pfitzinger): minimum is "earliest you can race again without elevated
// injury / underperformance risk", recommended is "typical taper-to-peak
// gap before another A-effort".
export const RECOVERY_RULES = [
  { maxKm: 10,  label: "5K / 10K",          minDays: 3,  recommendedDays: 10  },
  { maxKm: 22,  label: "Halvmaraton",        minDays: 10, recommendedDays: 18  },
  { maxKm: 45,  label: "Maraton",            minDays: 21, recommendedDays: 35  },
  { maxKm: 55,  label: "50K",                minDays: 28, recommendedDays: 49  },
  { maxKm: 90,  label: "50 mi / 80K",        minDays: 35, recommendedDays: 60  },
  { maxKm: 110, label: "100K",               minDays: 42, recommendedDays: 70  },
  { maxKm: Infinity, label: "100 mi / Ultra+", minDays: 56, recommendedDays: 84 },
];

export function recoveryRuleFor(distanceKm) {
  const km = Number(distanceKm);
  if (!Number.isFinite(km) || km <= 0) return RECOVERY_RULES[2]; // assume marathon if unknown
  return RECOVERY_RULES.find((r) => km <= r.maxKm) ?? RECOVERY_RULES[RECOVERY_RULES.length - 1];
}

/**
 * Given an ordered array of season-plan races (sorted by target_date), returns
 * one verdict per gap between consecutive races.
 *
 * Each item in `seasonRaces` is the season_plan_races row with the joined
 * race object: { id, priority, target_date, race: { name, distance_km } }.
 *
 * Returns array of: { fromId, toId, daysBetween, status, message, rule }.
 *  - status "ok"           — gap >= recommendedDays for the prior race's distance
 *  - status "tight"        — gap >= minDays but < recommendedDays
 *  - status "insufficient" — gap < minDays for that distance
 *  - status "missing-date" — either race lacks a target_date
 */
export function validateSeasonGaps(seasonRaces) {
  const rows = (seasonRaces ?? []).filter((r) => r?.race);
  // Sort by target_date ascending; rows with no date drop to the end.
  const sorted = [...rows].sort((a, b) => {
    const da = a.target_date ? new Date(a.target_date).getTime() : Infinity;
    const db = b.target_date ? new Date(b.target_date).getTime() : Infinity;
    return da - db;
  });
  const verdicts = [];
  for (let i = 0; i < sorted.length - 1; i++) {
    const prev = sorted[i];
    const next = sorted[i + 1];
    if (!prev.target_date || !next.target_date) {
      verdicts.push({
        fromId: prev.id,
        toId: next.id,
        daysBetween: null,
        status: "missing-date",
        message: "Mangler dato",
        rule: null,
      });
      continue;
    }
    const days = Math.round(
      (new Date(next.target_date).getTime() - new Date(prev.target_date).getTime()) / 86400000
    );
    const rule = recoveryRuleFor(prev.race?.distance_km);
    let status, message;
    if (days >= rule.recommendedDays) {
      status = "ok";
      message = `Tilstrekkelig restitusjon etter ${rule.label}`;
    } else if (days >= rule.minDays) {
      status = "tight";
      message = `Knapt nok — anbefalt minst ${rule.recommendedDays} dager etter ${rule.label}`;
    } else {
      status = "insufficient";
      message = `For tett — minimum ${rule.minDays} dager etter ${rule.label}`;
    }
    verdicts.push({ fromId: prev.id, toId: next.id, daysBetween: days, status, message, rule });
  }
  return verdicts;
}

/**
 * Returns the highest-priority race in a season plan (A > B > C).
 * Among A-races, the earliest by target_date wins.
 */
export function deriveSeasonGoalRace(seasonPlan) {
  const races = seasonPlan?.season_plan_races ?? [];
  if (!races.length) return null;
  const byPriority = { A: 0, B: 1, C: 2 };
  const sorted = [...races].sort((a, b) => {
    const pa = byPriority[a.priority] ?? 99;
    const pb = byPriority[b.priority] ?? 99;
    if (pa !== pb) return pa - pb;
    const da = a.target_date ? new Date(a.target_date).getTime() : Infinity;
    const db = b.target_date ? new Date(b.target_date).getTime() : Infinity;
    return da - db;
  });
  return sorted[0] ?? null;
}

const MONTH_NAMES_NB = [
  "januar", "februar", "mars", "april", "mai", "juni",
  "juli", "august", "september", "oktober", "november", "desember",
];

const WEEK_LABELS_NB = {
  1: "første helg",
  2: "andre helg",
  3: "tredje helg",
  4: "fjerde helg",
  5: "siste helg",
};

/**
 * Render the typical schedule of a race as Norwegian text.
 * "Vanligvis siste helg i august" / "Vanligvis i mars" / "Ukjent dato".
 */
export function formatTypicalSchedule(typical_month, typical_week_in_month) {
  if (!typical_month) return "Ukjent dato";
  const month = MONTH_NAMES_NB[typical_month - 1];
  if (!typical_week_in_month) return `Vanligvis i ${month}`;
  const week = WEEK_LABELS_NB[typical_week_in_month] ?? "";
  if (!week) return `Vanligvis i ${month}`;
  return `Vanligvis ${week} i ${month}`;
}

/**
 * Returns active season plan from a list of plans, or the most recent one
 * by season_year if none are explicitly active.
 */
export function pickActivePlan(plans) {
  const list = plans ?? [];
  const active = list.find((p) => p.is_active);
  if (active) return active;
  return [...list].sort((a, b) => (b.season_year ?? 0) - (a.season_year ?? 0))[0] ?? null;
}

/**
 * Sort season_plan_races by target_date ascending, falling back to position.
 * Rows with no target_date and no position drop to the end.
 */
export function sortSeasonRaces(seasonRaces) {
  return [...(seasonRaces ?? [])].sort((a, b) => {
    const da = a.target_date ? new Date(a.target_date).getTime() : Infinity;
    const db = b.target_date ? new Date(b.target_date).getTime() : Infinity;
    if (da !== db) return da - db;
    return (a.position ?? Infinity) - (b.position ?? Infinity);
  });
}
